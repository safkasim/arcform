import AVFoundation
import ExpoModulesCore
import ImageIO
import Vision

public final class ArcformVisionModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ArcformVision")

    AsyncFunction("analyzeVideo") { (uri: String, options: [String: Any]?) async throws -> [String: Any] in
      let sampleRate = min(max(options?["sampleRate"] as? Double ?? 6, 2), 12)
      return try await Self.analyzeVideo(uri: uri, sampleRate: sampleRate)
    }
  }

  private static let jointNames: [(String, VNHumanBodyPoseObservation.JointName)] = [
    ("leftShoulder", .leftShoulder),
    ("rightShoulder", .rightShoulder),
    ("leftHip", .leftHip),
    ("rightHip", .rightHip),
    ("leftKnee", .leftKnee),
    ("rightKnee", .rightKnee),
    ("leftAnkle", .leftAnkle),
    ("rightAnkle", .rightAnkle)
  ]

  private struct PoseCandidate {
    let frame: [String: Any]
    let center: CGPoint
    let scale: Double
    let confidence: Double
  }

  private struct PoseTrack {
    var candidates: [(sampleIndex: Int, candidate: PoseCandidate)]

    var last: PoseCandidate { candidates[candidates.count - 1].candidate }

    var predictedCenter: CGPoint {
      guard candidates.count >= 2 else { return last.center }
      let previous = candidates[candidates.count - 2].candidate.center
      return CGPoint(
        x: last.center.x + (last.center.x - previous.x),
        y: last.center.y + (last.center.y - previous.y)
      )
    }
  }

  private static func analyzeVideo(uri: String, sampleRate: Double) async throws -> [String: Any] {
    guard let url = videoURL(from: uri) else {
      throw InvalidVideoURIException()
    }

    let asset = AVURLAsset(url: url)
    let duration = CMTimeGetSeconds(asset.duration)
    guard duration.isFinite, duration > 0 else {
      throw UnreadableVideoException()
    }

    let generator = AVAssetImageGenerator(asset: asset)
    generator.appliesPreferredTrackTransform = true
    generator.requestedTimeToleranceBefore = .zero
    generator.requestedTimeToleranceAfter = .zero

    let frameCount = max(1, Int(floor(duration * sampleRate)) + 1)
    var tracks: [PoseTrack] = []

    for index in 0..<frameCount {
      try Task.checkCancellation()
      let seconds = min(Double(index) / sampleRate, duration)
      let time = CMTime(seconds: seconds, preferredTimescale: 600)

      do {
        let image = try generator.copyCGImage(at: time, actualTime: nil)
        let candidates = try poseCandidates(from: image, timestamp: seconds)
        associate(candidates, at: index, with: &tracks)
      } catch is CancellationError {
        throw AnalysisInterruptedException()
      } catch {
        // A damaged frame should not invalidate an otherwise readable clip.
        continue
      }
    }

    guard !tracks.isEmpty else {
      throw NoPoseFramesException()
    }

    let rankedTracks = tracks
      .filter { $0.candidates.count >= 2 }
      .sorted { trackScore($0, frameCount: frameCount) > trackScore($1, frameCount: frameCount) }
    guard let primary = rankedTracks.first else {
      throw NoPoseFramesException()
    }

    let primaryScore = trackScore(primary, frameCount: frameCount)
    let ambiguous = rankedTracks.dropFirst().contains { challenger in
      let overlap = temporalOverlap(primary, challenger)
      return challenger.candidates.count >= max(3, Int(Double(primary.candidates.count) * 0.55))
        && overlap >= 0.45
        && trackScore(challenger, frameCount: frameCount) >= primaryScore * 0.82
    }
    let frames = primary.candidates.map { $0.candidate.frame }

    return [
      "mode": "2d",
      "duration": duration,
      "frames": frames,
      "subjectTracking": [
        "ambiguous": ambiguous,
        "trackedFrames": primary.candidates.count,
        "candidateTracks": rankedTracks.count
      ]
    ]
  }

  private static func poseCandidates(from image: CGImage, timestamp: Double) throws -> [PoseCandidate] {
    let request = VNDetectHumanBodyPoseRequest()
    let handler = VNImageRequestHandler(cgImage: image, orientation: .up)
    try handler.perform([request])

    return try (request.results ?? []).compactMap { observation in
      let recognized = try observation.recognizedPoints(.all)
      var joints: [String: Any] = [:]
      var confidenceTotal: Float = 0
      var confidenceCount: Float = 0
      var locations: [CGPoint] = []

      for (outputName, visionName) in jointNames {
        guard let point = recognized[visionName], point.confidence >= 0.1 else {
          continue
        }
        let location = CGPoint(x: point.location.x, y: 1 - point.location.y)
        joints[outputName] = [
          "x": Double(location.x),
          "y": Double(location.y),
          "confidence": Double(point.confidence)
        ]
        confidenceTotal += point.confidence
        confidenceCount += 1
        locations.append(location)
      }

      guard confidenceCount >= 4,
            let minX = locations.map(\.x).min(),
            let maxX = locations.map(\.x).max(),
            let minY = locations.map(\.y).min(),
            let maxY = locations.map(\.y).max() else {
        return nil
      }
      let confidence = Double(confidenceTotal / confidenceCount)
      let center = CGPoint(x: (minX + maxX) / 2, y: (minY + maxY) / 2)
      let scale = max(max(Double(maxX - minX), Double(maxY - minY)), 0.05)
      return PoseCandidate(
        frame: ["timestamp": timestamp, "confidence": confidence, "joints": joints],
        center: center,
        scale: scale,
        confidence: confidence
      )
    }
  }

  private static func associate(_ candidates: [PoseCandidate], at sampleIndex: Int, with tracks: inout [PoseTrack]) {
    var unmatched = Set(candidates.indices)
    let eligibleTracks = tracks.indices.filter {
      sampleIndex - tracks[$0].candidates.last!.sampleIndex <= 2
    }
    var matches: [(distance: Double, track: Int, candidate: Int)] = []

    for trackIndex in eligibleTracks {
      let track = tracks[trackIndex]
      for candidateIndex in candidates.indices {
        let candidate = candidates[candidateIndex]
        let dx = Double(track.predictedCenter.x - candidate.center.x)
        let dy = Double(track.predictedCenter.y - candidate.center.y)
        let positionDistance = hypot(dx, dy) / max(max(track.last.scale, candidate.scale), 0.08)
        let scaleChange = abs(log(candidate.scale / track.last.scale))
        let distance = positionDistance + scaleChange * 0.35
        if distance <= 1.15 {
          matches.append((distance, trackIndex, candidateIndex))
        }
      }
    }

    var matchedTracks = Set<Int>()
    for match in matches.sorted(by: { $0.distance < $1.distance }) {
      guard !matchedTracks.contains(match.track), unmatched.contains(match.candidate) else { continue }
      tracks[match.track].candidates.append((sampleIndex, candidates[match.candidate]))
      matchedTracks.insert(match.track)
      unmatched.remove(match.candidate)
    }
    for candidateIndex in unmatched {
      tracks.append(PoseTrack(candidates: [(sampleIndex, candidates[candidateIndex])]))
    }
  }

  private static func trackScore(_ track: PoseTrack, frameCount: Int) -> Double {
    let persistence = Double(track.candidates.count) / Double(frameCount)
    let confidence = track.candidates.map { $0.candidate.confidence }.reduce(0, +) / Double(track.candidates.count)
    let averageScale = track.candidates.map { $0.candidate.scale }.reduce(0, +) / Double(track.candidates.count)
    let averageCenterDistance = track.candidates.map {
      hypot(Double($0.candidate.center.x - 0.5), Double($0.candidate.center.y - 0.5))
    }.reduce(0, +) / Double(track.candidates.count)
    let framing = max(0, 1 - averageCenterDistance / 0.71)
    return persistence * 0.55 + confidence * 0.15 + min(averageScale, 1) * 0.20 + framing * 0.10
  }

  private static func temporalOverlap(_ first: PoseTrack, _ second: PoseTrack) -> Double {
    let firstSamples = Set(first.candidates.map(\.sampleIndex))
    let secondSamples = Set(second.candidates.map(\.sampleIndex))
    return Double(firstSamples.intersection(secondSamples).count)
      / Double(max(1, min(firstSamples.count, secondSamples.count)))
  }

  private static func videoURL(from uri: String) -> URL? {
    if let url = URL(string: uri), url.isFileURL {
      return url
    }
    if uri.hasPrefix("/") {
      return URL(fileURLWithPath: uri)
    }
    return nil
  }
}

private final class InvalidVideoURIException: Exception {
  override var reason: String {
    "The video URI must point to a local file."
  }
}

private final class UnreadableVideoException: Exception {
  override var reason: String {
    "The video has no readable duration."
  }
}

private final class NoPoseFramesException: Exception {
  override var reason: String {
    "Apple Vision could not find a body pose in the sampled frames."
  }
}

private final class AnalysisInterruptedException: Exception {
  override var reason: String {
    "Video analysis was interrupted."
  }
}