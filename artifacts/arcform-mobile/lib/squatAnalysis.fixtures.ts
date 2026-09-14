import type { PoseFrame, PoseSequence } from '../modules/arcform-vision/src';

const radians = (degrees: number) => (degrees * Math.PI) / 180;

function frame(timestamp: number, kneeAngle: number, confidence = 0.95): PoseFrame {
  const knee = { x: 0.5, y: 0.62 };
  const hip = { x: 0.5, y: kneeAngle < 120 ? 0.66 : 0.42 };
  const ankle = {
    x: knee.x + Math.sin(radians(kneeAngle)) * 0.25,
    y: knee.y - Math.cos(radians(kneeAngle)) * 0.25,
  };
  const joints = {
    leftShoulder: { x: 0.46, y: 0.2, confidence },
    rightShoulder: { x: 0.54, y: 0.2, confidence },
    leftHip: { x: hip.x - 0.02, y: hip.y, confidence },
    rightHip: { x: hip.x + 0.02, y: hip.y, confidence },
    leftKnee: { x: knee.x - 0.02, y: knee.y, confidence },
    rightKnee: { x: knee.x + 0.02, y: knee.y, confidence },
    leftAnkle: { x: ankle.x - 0.02, y: ankle.y, confidence },
    rightAnkle: { x: ankle.x + 0.02, y: ankle.y, confidence },
  };
  return { timestamp, confidence, joints };
}

function sequence(angles: number[], confidence = 0.95, gapAfter?: number): PoseSequence {
  const frames = angles.map((value, index) => {
    const timestamp = index / 6 + (gapAfter !== undefined && index > gapAfter ? 1 : 0);
    return frame(timestamp, value, confidence);
  });
  return { mode: '2d', duration: angles.length / 6, frames };
}

const fullRep = [170, 165, 150, 130, 110, 90, 105, 130, 150, 160, 170];

export const squatFixtures = {
  sideTwoFullReps: sequence([...fullRep, ...fullRep]),
  threeQuarterFullRep: sequence(fullRep.map((angle) => angle + (angle < 150 ? 4 : 0))),
  partialRep: sequence([170, 165, 150, 140, 130, 125, 130, 145, 160, 170, 170]),
  obstructed: sequence(fullRep, 0.2),
  lowLight: sequence(fullRep, 0.3),
  interrupted: sequence([170, 160, 130, 95, 90, 115, 145, 160, 170, 170, 170], 0.95, 4),
  ambiguousSubjects: {
    ...sequence(fullRep),
    subjectTracking: { ambiguous: true, trackedFrames: fullRep.length, candidateTracks: 2 },
  },
} satisfies Record<string, PoseSequence>;