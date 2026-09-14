import { useAuth } from '@clerk/expo';
import { Redirect, useRouter } from 'expo-router';
import { ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { Brand } from '@/components/ui';
import { useColors } from '@/hooks/useColors';

export default function WelcomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isSignedIn } = useAuth();

  if (isSignedIn) return <Redirect href="/" />;

  const continueAs = (role: 'athlete' | 'trainer') => {
    router.push({ pathname: '/(auth)/sign-in', params: { role } });
  };

  return (
    <ImageBackground
      source={require('@/assets/images/login-background.png')}
      resizeMode="cover"
      style={[styles.background, { backgroundColor: colors.background }]}
      imageStyle={styles.backgroundImage}
    >
      <Svg viewBox="0 0 400 900" preserveAspectRatio="none" style={styles.edgeVignette}>
        <Defs>
          <RadialGradient id="edgeFade" cx="50%" cy="50%" r="70%">
            <Stop offset="0%" stopColor={colors.background} stopOpacity="0" />
            <Stop offset="66%" stopColor={colors.background} stopOpacity="0.065" />
            <Stop offset="100%" stopColor={colors.background} stopOpacity="0.533" />
          </RadialGradient>
        </Defs>
        <Rect width="400" height="900" fill="url(#edgeFade)" />
      </Svg>
      <Svg viewBox="0 0 400 400" style={styles.centerVignette}>
        <Defs>
          <RadialGradient id="centerFade" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={colors.background} stopOpacity="0.611" />
            <Stop offset="54%" stopColor={colors.background} stopOpacity="0.507" />
            <Stop offset="100%" stopColor={colors.background} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx="200" cy="200" r="200" fill="url(#centerFade)" />
      </Svg>
      <View style={[styles.content, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.center}>
          <View style={styles.brand}><Brand /></View>
          <View style={styles.actions}>
            <RoleButton role="athlete" onPress={() => continueAs('athlete')} />
            <RoleButton role="trainer" onPress={() => continueAs('trainer')} />
          </View>
        </View>
      </View>
    </ImageBackground>
  );
}

function RoleButton({ role, onPress }: { role: 'athlete' | 'trainer'; onPress: () => void }) {
  const colors = useColors();
  const primary = role === 'athlete';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Continue as ${role}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.roleButton,
        {
          backgroundColor: primary ? colors.primary : colors.secondary,
          opacity: pressed ? 0.66 : primary ? 0.88 : 0.78,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
      ]}
    >
      <Text style={[styles.roleLabel, { color: primary ? colors.primaryForeground : colors.foreground }]}>
        {role}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  backgroundImage: { transform: [{ scale: 1 }] },
  edgeVignette: { position: 'absolute', inset: 0, pointerEvents: 'none' },
  centerVignette: {
    position: 'absolute',
    pointerEvents: 'none',
    width: 520,
    height: 520,
    left: '50%',
    top: '50%',
    transform: [{ translateX: -260 }, { translateY: -260 }],
  },
  content: { flex: 1, paddingHorizontal: 42 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 54 },
  brand: { transform: [{ scale: 1.6 }] },
  actions: { alignItems: 'center', gap: 10 },
  roleButton: {
    minWidth: 148,
    height: 46,
    borderRadius: 23,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleLabel: { fontFamily: 'Inter_400Regular', fontSize: 14, textTransform: 'capitalize' },
});