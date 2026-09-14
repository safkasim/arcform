import { useCallback, useEffect, useRef, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import {
  CameraView,
  useCameraPermissions,
  useMicrophonePermissions,
} from 'expo-camera';
import { VideoView, useVideoPlayer } from 'expo-video';
import * as Haptics from 'expo-haptics';
import { analyzeVideo, isArcformVisionAvailable } from '../../modules/arcform-vision/src';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Button, Card, Eyebrow, Screen, Title, type } from '@/components/ui';
import { useColors } from '@/hooks/useColors';
import { PoseOverlay } from '@/components/PoseOverlay';
import { analyzeSquat, type SquatAnalysis } from '@/lib/squatAnalysis';

export default function FormScreen() {
  const colors = useColors();
  const cameraRef = useRef<CameraView>(null);
  const [cameraPermission, requestCameraPermission, getCameraPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission, getMicrophonePermission] = useMicrophonePermissions();
  const [clipUri, setClipUri] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraKey, setCameraKey] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const [isAppActive, setIsAppActive] = useState(AppState.currentState === 'active');

  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      void getCameraPermission();
      void getMicrophonePermission();
      return () => {
        cameraRef.current?.stopRecording();
        setIsRecording(false);
        setCameraReady(false);
        setIsFocused(false);
      };
    }, [getCameraPermission, getMicrophonePermission]),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const active = nextState === 'active';
      if (!active) {
        cameraRef.current?.stopRecording();
        setIsRecording(false);
        setCameraReady(false);
      } else {
        void getCameraPermission();
        void getMicrophonePermission();
      }
      setIsAppActive(active);
    });
    return () => subscription.remove();
  }, [getCameraPermission, getMicrophonePermission]);

  const requestPermissions = async () => {
    const camera = cameraPermission?.granted
      ? cameraPermission
      : await requestCameraPermission();
    if (!camera.granted) return;
    if (!microphonePermission?.granted) await requestMicrophonePermission();
  };

  const startRecording = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Use a phone to record', 'Video recording is available in Arcform on iOS and Android.');
      return;
    }
    if (!cameraRef.current || !cameraReady || isRecording) return;
    try {
      setIsRecording(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const clip = await cameraRef.current.recordAsync({ maxDuration: 120 });
      if (clip?.uri) setClipUri(clip.uri);
    } catch {
      Alert.alert('Recording stopped', 'Arcform could not save that clip. Please try again.');
    } finally {
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    cameraRef.current?.stopRecording();
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const discardClip = () => {
    setClipUri(null);
    setCameraReady(false);
    setCameraError(null);
  };

  const retryCamera = () => {
    setCameraError(null);
    setCameraReady(false);
    setCameraKey((current) => current + 1);
  };

  const openSettings = async () => {
    if (Platform.OS === 'web') return;
    try {
      await Linking.openSettings();
    } catch {
      Alert.alert('Open device settings', 'Enable camera access for Arcform, then return to record.');
    }
  };

  if (!cameraPermission || !microphonePermission) {
    return (
      <Screen contentContainerStyle={styles.centered}>
        <ActivityIndicator color={colors.foreground} />
      </Screen>
    );
  }

  if (clipUri) return <ClipReview uri={clipUri} onDiscard={discardClip} />;

  if (!cameraPermission.granted) {
    const blocked = cameraPermission.status === 'denied' && !cameraPermission.canAskAgain;
    return (
      <Screen contentContainerStyle={styles.permissionScreen}>
        <View style={styles.hero}>
          <Eyebrow>Movement analysis</Eyebrow>
          <Title>Record your set.</Title>
          <Text style={[type.body, { color: colors.mutedForeground }]}>
            Arcform needs camera access to record your lift. Microphone access is optional.
          </Text>
        </View>
        <Card style={styles.permissionCard}>
          <View style={[styles.cameraMark, { backgroundColor: colors.secondary }]}>
            <Feather name="camera" size={27} color={colors.foreground} />
          </View>
          <Text style={[type.heading, { color: colors.foreground }]}>Camera permission</Text>
          <Text style={[type.muted, styles.copy, { color: colors.mutedForeground }]}>
            Your clip stays on this device while you review it. Recording does not change or block your training log.
          </Text>
          <Button
            title={blocked ? 'Open settings' : 'Allow camera'}
            icon={blocked ? 'settings' : 'camera'}
            onPress={blocked ? openSettings : requestPermissions}
            testID="camera-permission-button"
          />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen contentContainerStyle={styles.screen}>
      <View style={styles.hero}>
        <View style={styles.statusRow}>
          <Eyebrow>{isRecording ? 'Recording working set' : 'Movement analysis'}</Eyebrow>
          {isRecording ? <View style={[styles.liveDot, { backgroundColor: colors.success }]} /> : null}
        </View>
        <Title>{isRecording ? 'Stay with the set.' : 'Frame your lift.'}</Title>
        <Text style={[type.body, { color: colors.mutedForeground }]}>
          Side or three-quarter view · phone at hip height · full range visible
        </Text>
      </View>
      <View style={[styles.cameraShell, { borderColor: colors.border, backgroundColor: colors.card }]}>
        {isFocused && isAppActive ? (
          <CameraView
            key={cameraKey}
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            facing="back"
            mode="video"
            mute={!microphonePermission.granted}
            onCameraReady={() => setCameraReady(true)}
            onMountError={({ message }) => {
              setCameraReady(false);
              setCameraError(message);
            }}
          />
        ) : null}
        {cameraError ? (
          <View style={[styles.cameraFallback, { backgroundColor: colors.card }]}>
            <Feather name="alert-circle" size={24} color={colors.foreground} />
            <Text style={[type.body, styles.copy, { color: colors.foreground }]}>
              The camera could not start.
            </Text>
            <Text style={[type.muted, styles.copy, { color: colors.mutedForeground }]}>
              Check that no other app is using it, then try again.
            </Text>
            <Button title="Try camera again" icon="refresh-cw" variant="secondary" onPress={retryCamera} />
          </View>
        ) : (
          <>
            <View pointerEvents="none" style={styles.frameGuide}>
              <View style={[styles.frameCorner, styles.topLeft, { borderColor: colors.foreground }]} />
              <View style={[styles.frameCorner, styles.topRight, { borderColor: colors.foreground }]} />
              <View style={[styles.frameCorner, styles.bottomLeft, { borderColor: colors.foreground }]} />
              <View style={[styles.frameCorner, styles.bottomRight, { borderColor: colors.foreground }]} />
            </View>
            {!cameraReady ? (
              <ActivityIndicator style={styles.cameraLoader} color={colors.foreground} />
            ) : null}
            <View style={styles.recordControl}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={isRecording ? 'Stop recording' : 'Start recording'}
                testID="record-button"
                disabled={!cameraReady}
                onPress={isRecording ? stopRecording : startRecording}
                style={({ pressed }) => [
                  styles.recordOuter,
                  { borderColor: colors.foreground, opacity: !cameraReady ? 0.4 : pressed ? 0.65 : 1 },
                ]}
              >
                <View
                  style={[
                    isRecording ? styles.stopInner : styles.recordInner,
                    { backgroundColor: colors.foreground },
                  ]}
                />
              </Pressable>
            </View>
          </>
        )}
      </View>
      <Text style={[type.muted, styles.cameraNote, { color: colors.mutedForeground }]}>
        {isRecording ? 'Tap stop when the set is complete. Maximum 2 minutes.' : 'Tap once to start recording.'}
      </Text>
    </Screen>
  );
}

function ClipReview({ uri, onDiscard }: { uri: string; onDiscard: () => void }) {
  const colors = useColors();
  const player = useVideoPlayer(uri);
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'complete' | 'failed'>('idle');
  const [result, setResult] = useState<SquatAnalysis | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    player.play();
  }, [player]);

  const supported = Platform.OS === 'ios' && isArcformVisionAvailable;

  const startAnalysis = async () => {
    setStatus('analyzing');
    setFailure(null);
    setResult(null);
    player.pause();
    try {
      const sequence = await analyzeVideo(uri, { sampleRate: 6 });
      const analysis = analyzeSquat(sequence);
      setResult(analysis);
      setStatus('complete');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      const reason = error instanceof Error ? error.message : '';
      setFailure(reason === 'LOW_CONFIDENCE'
        ? 'Arcform could not see enough of your shoulders, hips, knees, and ankles to measure this set reliably. Record again with your full body visible and even lighting.'
        : reason === 'AMBIGUOUS_SUBJECT'
          ? 'Arcform found more than one possible athlete and could not identify you reliably. Record again with only you in frame, centered and closer to the camera.'
        : reason === 'NO_COMPLETE_REP'
          ? 'Arcform did not find a complete standing-to-depth-to-standing squat in a continuous section of this clip. Record the full set with your whole body visible.'
        : 'Analysis was interrupted or the clip could not be read. You can retry without recording again.');
      setStatus('failed');
    }
  };

  return (
    <Screen contentContainerStyle={styles.screen}>
      <View style={styles.hero}>
        <Eyebrow>Set review</Eyebrow>
        <Title>Review your form.</Title>
        <Text style={[type.body, { color: colors.mutedForeground }]}>
          Replay the clip and use these checkpoints before logging your set.
        </Text>
      </View>
      <View style={[styles.videoShell, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <VideoView
          player={player}
          style={StyleSheet.absoluteFill}
          nativeControls
          contentFit="contain"
          fullscreenOptions={{ enable: true }}
        />
         {result?.overlayFrame ? <PoseOverlay frame={result.overlayFrame} color={colors.success} /> : null}
      </View>
       {!supported ? (
         <Card style={styles.feedbackCard}>
           <Text style={[type.heading, { color: colors.foreground }]}>Manual review only</Text>
           <Text style={[type.body, { color: colors.mutedForeground }]}>
              Apple Vision squat analysis requires iOS 17 or newer in an Arcform development or production build. Expo Go, Android, and web can still record and replay clips.
           </Text>
         </Card>
       ) : status === 'idle' ? (
         <Card style={styles.feedbackCard}>
           <Text style={[type.heading, { color: colors.foreground }]}>Analyze this squat</Text>
           <Text style={[type.body, { color: colors.mutedForeground }]}>
             Analysis runs locally on this device. Your video is not uploaded or saved to an analysis history.
           </Text>
           <Button title="Start on-device analysis" icon="activity" onPress={startAnalysis} testID="start-analysis-button" />
         </Card>
       ) : status === 'analyzing' ? (
         <Card style={styles.analysisLoading}>
           <ActivityIndicator color={colors.foreground} />
           <Text style={[type.heading, { color: colors.foreground }]}>Analyzing sampled frames…</Text>
           <Text style={[type.muted, { color: colors.mutedForeground }]}>Keep Arcform open while Apple Vision checks the clip.</Text>
         </Card>
       ) : status === 'failed' ? (
         <Card style={styles.feedbackCard}>
           <Text style={[type.heading, { color: colors.foreground }]}>No reliable result</Text>
           <Text style={[type.body, { color: colors.mutedForeground }]}>{failure}</Text>
           <Button title="Try analysis again" icon="refresh-cw" variant="secondary" onPress={startAnalysis} testID="retry-analysis-button" />
         </Card>
       ) : result ? (
         <Card style={styles.feedbackCard}>
           <View style={styles.resultHeader}>
             <View><Text style={[type.muted, { color: colors.mutedForeground }]}>REPS</Text><Text style={[styles.metricValue, { color: colors.foreground }]}>{result.reps}</Text></View>
             <View><Text style={[type.muted, { color: colors.mutedForeground }]}>POSE QUALITY</Text><Text style={[styles.metricValue, { color: colors.foreground }]}>{Math.round(result.confidence * 100)}%</Text></View>
             <View><Text style={[type.muted, { color: colors.mutedForeground }]}>DEPTH</Text><Text style={[styles.metricSmall, { color: colors.foreground }]}>{result.depth}</Text></View>
           </View>
           <View style={styles.angleRow}>
             <Text style={[type.body, { color: colors.foreground }]}>Bottom knee angle <Text style={type.heading}>{result.kneeAngle}°</Text></Text>
             <Text style={[type.body, { color: colors.foreground }]}>Bottom hip angle <Text style={type.heading}>{result.hipAngle}°</Text></Text>
           </View>
           <Text style={[type.muted, { color: colors.mutedForeground }]}>
             {result.mode === '3d' ? '3D body pose · iOS 17+' : '2D body pose · camera angle can affect measurements'}
           </Text>
           {result.cues.map((cue) => <Feedback key={cue} text={cue} />)}
           <Button title="Analyze again" icon="refresh-cw" variant="secondary" onPress={startAnalysis} />
        <Text style={[type.muted, styles.feedbackNote, { color: colors.mutedForeground }]}>
           Measurements are coaching guidance, not medical or injury advice.
        </Text>
      </Card>
       ) : null}
      <Button
        title="Discard and record again"
        icon="trash-2"
        variant="secondary"
        onPress={onDiscard}
        testID="discard-clip-button"
      />
    </Screen>
  );
}

function Feedback({ text }: { text: string }) {
  const colors = useColors();
  return (
    <View style={styles.feedbackRow}>
      <Feather name="check-circle" size={18} color={colors.success} />
      <Text style={[type.body, styles.feedbackText, { color: colors.foreground }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { gap: 16 },
  centered: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  permissionScreen: { flexGrow: 1, justifyContent: 'center' },
  hero: { gap: 8, marginTop: 12 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveDot: { width: 7, height: 7, borderRadius: 4 },
  permissionCard: { minHeight: 300, alignItems: 'center', justifyContent: 'center', gap: 14 },
  cameraMark: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center' },
  copy: { maxWidth: 260, textAlign: 'center' },
  cameraShell: {
    aspectRatio: 3 / 4,
    maxHeight: 540,
    overflow: 'hidden',
    borderWidth: 1,
    borderRadius: 16,
  },
  cameraLoader: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  cameraFallback: {
    ...StyleSheet.absoluteFill,
    zIndex: 3,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  frameGuide: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, margin: 22 },
  frameCorner: { position: 'absolute', width: 32, height: 32 },
  topLeft: { top: 0, left: 0, borderTopWidth: 2, borderLeftWidth: 2 },
  topRight: { top: 0, right: 0, borderTopWidth: 2, borderRightWidth: 2 },
  bottomLeft: { bottom: 0, left: 0, borderBottomWidth: 2, borderLeftWidth: 2 },
  bottomRight: { bottom: 0, right: 0, borderBottomWidth: 2, borderRightWidth: 2 },
  recordControl: { position: 'absolute', left: 0, right: 0, bottom: 24, alignItems: 'center' },
  recordOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordInner: { width: 58, height: 58, borderRadius: 29 },
  stopInner: { width: 28, height: 28, borderRadius: 5 },
  cameraNote: { textAlign: 'center' },
  videoShell: { aspectRatio: 3 / 4, maxHeight: 520, overflow: 'hidden', borderWidth: 1, borderRadius: 16 },
  feedbackCard: { gap: 14 },
  feedbackRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 11 },
  feedbackText: { flex: 1 },
  feedbackNote: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 14 },
  analysisLoading: { minHeight: 180, alignItems: 'center', justifyContent: 'center', gap: 12 },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  metricValue: { fontFamily: 'Inter_600SemiBold', fontSize: 28, marginTop: 4 },
  metricSmall: { fontFamily: 'Inter_600SemiBold', fontSize: 16, marginTop: 8 },
  angleRow: { gap: 6, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 14 },
});