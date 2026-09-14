import React, { useState } from 'react';
import { useSignIn } from '@clerk/expo';
import { Feather } from '@expo/vector-icons';
import { Link, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { ImageBackground, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { Brand, Button, Eyebrow, Title, type } from '@/components/ui';
import { useColors } from '@/hooks/useColors';

export default function SignIn() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { role } = useLocalSearchParams<{ role?: string }>();
  const selectedRole = role === 'trainer' ? 'trainer' : 'athlete';
  const { signIn, errors, fetchStatus } = useSignIn();
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');

  const finalize = async () => {
    await signIn.finalize({
      navigate: ({ session, decorateUrl }) => {
        if (session?.currentTask) return;
        const url = decorateUrl(`/?role=${selectedRole}`);
        if (url.startsWith('http') && typeof window !== 'undefined') window.location.href = url;
        else router.replace(url as Href);
      },
    });
  };

  const submit = async () => {
    const { error } = await signIn.password({ emailAddress, password });
    if (error) return;
    if (signIn.status === 'complete') await finalize();
    else if (signIn.status === 'needs_client_trust') {
      const emailFactor = signIn.supportedSecondFactors.find((factor) => factor.strategy === 'email_code');
      if (emailFactor) await signIn.mfa.sendEmailCode();
    }
  };

  const verify = async () => {
    await signIn.mfa.verifyEmailCode({ code });
    if (signIn.status === 'complete') await finalize();
  };

  const verifying = signIn.status === 'needs_client_trust';
  return (
    <ImageBackground
      source={require('@/assets/images/login-background.png')}
      resizeMode="cover"
      style={[styles.background, { backgroundColor: colors.background }]}
      imageStyle={styles.backgroundImage}
    >
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background, opacity: 0.08 }]} />
      <KeyboardAwareScrollViewCompat
        style={styles.scroll}
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 28, paddingBottom: insets.bottom + 28 }]}
        bottomOffset={24}
      >
        <Svg
          viewBox="0 0 400 400"
          style={styles.contentVignette}
        >
          <Defs>
            <RadialGradient id="loginVignette" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={colors.background} stopOpacity="1" />
              <Stop offset="58%" stopColor={colors.background} stopOpacity="0.9" />
              <Stop offset="82%" stopColor={colors.background} stopOpacity="0.5" />
              <Stop offset="100%" stopColor={colors.background} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx="200" cy="200" r="200" fill="url(#loginVignette)" />
        </Svg>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Return to role selection"
          onPress={() => router.replace('/welcome')}
          style={({ pressed }) => [styles.backButton, { opacity: pressed ? 0.55 : 1 }]}
          testID="return-to-role-selection"
        >
          <Feather name="arrow-left" size={18} strokeWidth={1.5} color={colors.foreground} />
          <Text style={[type.label, { color: colors.foreground }]}>Choose role</Text>
        </Pressable>
        <Brand />
        <View style={styles.hero}>
          <Eyebrow>{verifying ? 'Secure access' : `${selectedRole} access`}</Eyebrow>
          <Title light={!verifying}>{verifying ? 'Check your email.' : 'Form, Refined.'}</Title>
          <Text style={[type.body, { color: colors.mutedForeground }]}>
            {verifying ? 'Enter the verification code to finish signing in.' : 'Your coach, programming, and progress—built into every session.'}
          </Text>
        </View>
        <View style={styles.formZone}>
          <View style={styles.form}>
            {verifying ? (
              <TextInput
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                placeholder="6-digit code"
                placeholderTextColor={colors.mutedForeground}
                style={[styles.input, { color: colors.foreground, borderColor: colors.input, backgroundColor: colors.card }]}
                testID="sign-in-code"
              />
            ) : (
              <>
                <TextInput value={emailAddress} onChangeText={setEmailAddress} autoCapitalize="none" keyboardType="email-address" autoComplete="email" placeholder="Email" placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.foreground, borderColor: colors.input, backgroundColor: colors.card }]} testID="sign-in-email" />
                <TextInput value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" placeholder="Password" placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.foreground, borderColor: colors.input, backgroundColor: colors.card }]} testID="sign-in-password" />
              </>
            )}
            {errors.fields.code?.message || errors.fields.password?.message ? <Text style={[type.muted, { color: colors.foreground }]}>{errors.fields.code?.message ?? errors.fields.password?.message}</Text> : null}
            <Button title={verifying ? 'Verify' : 'Sign in'} icon={verifying ? 'check' : 'arrow-right'} loading={fetchStatus === 'fetching'} disabled={verifying ? code.length < 6 : !emailAddress || !password} onPress={verifying ? verify : submit} testID="sign-in-submit" />
            {verifying ? <Button title="Start over" variant="secondary" onPress={() => signIn.reset()} /> : <Text style={[type.body, styles.switch, { color: colors.mutedForeground }]}>New to Arcform? <Link href="/(auth)/sign-up" style={{ color: colors.foreground }}>Create account</Link></Text>}
          </View>
        </View>
      </KeyboardAwareScrollViewCompat>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  backgroundImage: { opacity: 0.92 },
  scroll: { flex: 1, backgroundColor: 'transparent' },
  container: { flexGrow: 1, paddingHorizontal: 22, gap: 46, position: 'relative' },
  backButton: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 8, minHeight: 40 },
  hero: { marginTop: 'auto', gap: 13 },
  formZone: { position: 'relative', marginBottom: 'auto' },
  contentVignette: {
    position: 'absolute',
    pointerEvents: 'none',
    width: 760,
    height: 760,
    left: '50%',
    top: '50%',
    transform: [{ translateX: -380 }, { translateY: -380 }],
  },
  form: { marginBottom: 'auto', gap: 12 },
  input: { minHeight: 56, borderWidth: 1, borderRadius: 16, paddingHorizontal: 17, fontFamily: 'Inter_400Regular', fontSize: 16 },
  switch: { textAlign: 'center', marginTop: 8 },
});