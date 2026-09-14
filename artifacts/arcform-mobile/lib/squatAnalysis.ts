import type { PoseFrame, PoseJoint, PoseSequence } from '../modules/arcform-vision/src';

export type SquatAnalysis = {
  mode: '2d' | '3d';
  confidence: number;
  reps: number;
  kneeAngle: number;
  hipAngle: number;
  depth: 'Below parallel' | 'At parallel' | 'Above parallel';
  cues: string[];
  overlayFrame: PoseFrame;
};

const REQUIRED = ['leftShoulder', 'rightShoulder', 'leftHip', 'rightHip', 'leftKnee', 'rightKnee', 'leftAnkle', 'rightAnkle'];

function angle(a: PoseJoint, b: PoseJoint, c: PoseJoint) {
  const ab = { x: a.x - b.x, y: a.y - b.y, z: (a.z ?? 0) - (b.z ?? 0) };
  const cb = { x: c.x - b.x, y: c.y - b.y, z: (c.z ?? 0) - (b.z ?? 0) };
  const dot = ab.x * cb.x + ab.y * cb.y + ab.z * cb.z;
  const abLength = Math.hypot(ab.x, ab.y, ab.z);
  const cbLength = Math.hypot(cb.x, cb.y, cb.z);
  if (!abLength || !cbLength) return 180;
  return Math.round((Math.acos(Math.max(-1, Math.min(1, dot / (abLength * cbLength)))) * 180) / Math.PI);
}

function averageJoint(frame: PoseFrame, left: string, right: string): PoseJoint {
  const a = frame.joints[left];
  const b = frame.joints[right];
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    z: ((a.z ?? 0) + (b.z ?? 0)) / 2,
    confidence: Math.min(a.confidence, b.confidence),
  };
}

function frameMetrics(frame: PoseFrame) {
  const shoulder = averageJoint(frame, 'leftShoulder', 'rightShoulder');
  const hip = averageJoint(frame, 'leftHip', 'rightHip');
  const knee = averageJoint(frame, 'leftKnee', 'rightKnee');
  const leftKnee = angle(frame.joints.leftHip, frame.joints.leftKnee, frame.joints.leftAnkle);
  const rightKnee = angle(frame.joints.rightHip, frame.joints.rightKnee, frame.joints.rightAnkle);
  const leftHip = angle(frame.joints.leftShoulder, frame.joints.leftHip, frame.joints.leftKnee);
  const rightHip = angle(frame.joints.rightShoulder, frame.joints.rightHip, frame.joints.rightKnee);
  return {
    knee: Math.round((leftKnee + rightKnee) / 2),
    hip: Math.round((leftHip + rightHip) / 2),
    kneeDisagreement: Math.abs(leftKnee - rightKnee),
    hipDisagreement: Math.abs(leftHip - rightHip),
    hipY: hip.y,
    kneeY: knee.y,
    shoulderY: shoulder.y,
  };
}

export function analyzeSquat(sequence: PoseSequence): SquatAnalysis {
  if (sequence.subjectTracking?.ambiguous) {
    throw new Error('AMBIGUOUS_SUBJECT');
  }

  const reliable = sequence.frames.filter(
    (frame) =>
      frame.confidence >= 0.45 &&
      REQUIRED.every((name) => (frame.joints[name]?.confidence ?? 0) >= 0.35),
  );
  const requiredFrames = Math.max(8, Math.ceil(sequence.duration * 2));
  if (reliable.length < requiredFrames || reliable.length < sequence.frames.length * 0.35) {
    throw new Error('LOW_CONFIDENCE');
  }

  const metrics = reliable
    .map((frame) => ({ frame, ...frameMetrics(frame) }))
    .filter((item) => item.kneeDisagreement <= 25 && item.hipDisagreement <= 30);
  if (metrics.length < requiredFrames) throw new Error('LOW_CONFIDENCE');

  const repBottoms: typeof metrics = [];
  let segmentStart = 0;
  for (let boundary = 1; boundary <= metrics.length; boundary += 1) {
    const gap = boundary < metrics.length
      ? metrics[boundary].frame.timestamp - metrics[boundary - 1].frame.timestamp
      : Number.POSITIVE_INFINITY;
    if (gap <= 0.45) continue;
    const segment = metrics.slice(segmentStart, boundary);
    let phase: 'waiting' | 'armed' | 'descending' = 'waiting';
    let bottom: (typeof metrics)[number] | null = null;
    for (const item of segment) {
      if (phase === 'waiting' && item.knee > 155) phase = 'armed';
      if (phase === 'armed' && item.knee < 135) {
        phase = 'descending';
        bottom = item;
      }
      if (phase === 'descending' && bottom && item.knee < bottom.knee) bottom = item;
      if (phase === 'descending' && item.knee > 155) {
        if (bottom && bottom.knee < 110) repBottoms.push(bottom);
        phase = 'armed';
        bottom = null;
      }
    }
    segmentStart = boundary;
  }
  if (repBottoms.length === 0) throw new Error('NO_COMPLETE_REP');

  const bottom = repBottoms.reduce((lowest, current) => current.knee < lowest.knee ? current : lowest);
  const reps = repBottoms.length;

  const depth = bottom.hipY > bottom.kneeY + 0.035
    ? 'Below parallel'
    : bottom.hipY >= bottom.kneeY - 0.035
      ? 'At parallel'
      : 'Above parallel';
  const cues: string[] = [];
  if (depth === 'Above parallel') cues.push('Try a little more depth while keeping the movement controlled.');
  else cues.push(`${depth} depth was visible in the clearest rep.`);
  if (bottom.knee < 65) cues.push('Avoid collapsing into the bottom; keep tension through the turn.');
  cues.push(`${reps} complete ${reps === 1 ? 'rep was' : 'reps were'} detected.`);

  return {
    mode: sequence.mode,
    confidence: reliable.reduce((sum, frame) => sum + frame.confidence, 0) / reliable.length,
    reps,
    kneeAngle: bottom.knee,
    hipAngle: bottom.hip,
    depth,
    cues: cues.slice(0, 3),
    overlayFrame: bottom.frame,
  };
}