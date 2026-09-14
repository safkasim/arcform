import { NativeModule, requireOptionalNativeModule } from 'expo';

export type PoseJoint = {
  x: number;
  y: number;
  z?: number;
  confidence: number;
};

export type PoseFrame = {
  timestamp: number;
  confidence: number;
  joints: Record<string, PoseJoint>;
};

export type PoseSequence = {
  mode: '2d' | '3d';
  duration: number;
  frames: PoseFrame[];
  subjectTracking?: {
    ambiguous: boolean;
    trackedFrames: number;
    candidateTracks: number;
  };
};

type AnalysisOptions = {
  sampleRate?: number;
};

declare class ArcformVisionNativeModule extends NativeModule {
  analyzeVideo(uri: string, options?: AnalysisOptions): Promise<PoseSequence>;
}

const nativeModule = requireOptionalNativeModule<ArcformVisionNativeModule>('ArcformVision');

export const isArcformVisionAvailable = nativeModule !== null;

export async function analyzeVideo(
  uri: string,
  options: AnalysisOptions = {},
): Promise<PoseSequence> {
  if (!nativeModule) {
    throw new Error('VISION_MODULE_UNAVAILABLE');
  }
  return nativeModule.analyzeVideo(uri, options);
}