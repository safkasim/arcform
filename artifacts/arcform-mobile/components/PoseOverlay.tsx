import Svg, { Circle, Line } from 'react-native-svg';
import type { PoseFrame } from '../modules/arcform-vision/src';

const BONES = [
  ['leftShoulder', 'rightShoulder'], ['leftShoulder', 'leftHip'], ['rightShoulder', 'rightHip'],
  ['leftHip', 'rightHip'], ['leftHip', 'leftKnee'], ['leftKnee', 'leftAnkle'],
  ['rightHip', 'rightKnee'], ['rightKnee', 'rightAnkle'],
] as const;

export function PoseOverlay({ frame, color }: { frame: PoseFrame; color: string }) {
  const points = Object.values(frame.joints);
  const normalized = points.every((point) => point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1);
  if (!normalized) return null;
  return (
    <Svg pointerEvents="none" style={{ position: 'absolute', inset: 0 }} viewBox="0 0 100 100">
      {BONES.map(([from, to]) => {
        const a = frame.joints[from];
        const b = frame.joints[to];
        return a && b ? <Line key={`${from}-${to}`} x1={a.x * 100} y1={a.y * 100} x2={b.x * 100} y2={b.y * 100} stroke={color} strokeWidth="1.4" /> : null;
      })}
      {points.map((point, index) => <Circle key={index} cx={point.x * 100} cy={point.y * 100} r="1.6" fill={color} />)}
    </Svg>
  );
}