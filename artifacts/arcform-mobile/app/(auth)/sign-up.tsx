import React, { useState } from 'react';
import { useAuth, useSignUp } from '@clerk/expo';
import { Link, useRouter, type Href } from 'expo-router';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { Brand, Button, Eyebrow, Title, type } from '@/components/ui';
import { useColors } from '@/hooks/useColors';

export default function SignUp() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { signUp, errors, fetchStatus } = useSignUp();
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [code, setCode] = useState('');

  const submit = async () => {
    const { error } = await signUp.password({ emailAddress, password });
    if (!error) await signUp.verifications.sendEmailCode();
  };

  const verify = async () => {
    await signUp.verifications.verifyEmailCode({ code });
    if (signUp.status === 'complete') {
      await signUp.finalize({
        navigate: ({ session, decorateUrl }) => {
          if (session?.currentTask) return;
          const url = decorateUrl('/onboarding');
          if (url.startsWith('http') && typeof window !== 'undefined') window.location.href = url;
          else router.replace(url as Href);
        },
      });
    }
  };

  if (signUp.status === 'complete' || isSignedIn) return null;
  const verifying =
    signUp.status === 'missing_requirements' &&
    signUp.unverifiedFields.includes('email_address') &&
    signUp.missingFields.length === 0;
  const passwordMismatch = confirm.length > 0 && password !== confirm;

  return (
    <KeyboardAwareScrollViewCompat
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + 28, paddingBottom: insets.bottom + 28 }]}
      bottomOffset={24}
    >
      <Brand />
      <View style={styles.hero}>
        <Eyebrow>{verifying ? 'One last step' : 'Athlete account'}</Eyebrow>
        <Title>{verifying ? 'Verify your email.' : 'Start stronger.'}</Title>
        <Text style={[type.body, { color: colors.mutedForeground }]}>
          {verifying ? `We sent a code to ${emailAddress}.` : 'Build your profile, get your plan, and keep your coach close.'}
        </Text>
      </View>
      <View style={styles.form}>
        {verifying ? (
          <TextInput
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            placeholder="6-digit code"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.input, { color: colors.foreground, borderColor: colors.input, backgroundColor: colors.card }]}
          />
        ) : (
          <>
            <TextInput value={emailAddress} onChangeText={setEmailAddress} autoCapitalize="none" keyboardType="email-address" autoComplete="email" placeholder="Email" placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.foreground, borderColor: colors.input, backgroundColor: colors.card }]} />
            <TextInput value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" placeholder="Password (15+ characters)" placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.foreground, borderColor: colors.input, backgroundColor: colors.card }]} />
            <TextInput value={confirm} onChangeText={setConfirm} secureTextEntry placeholder="Confirm password" placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.foreground, borderColor: colors.input, backgroundColor: colors.card }]} />
          </>
        )}
        {passwordMismatch ? <Text style={[type.muted, { color: colors.foreground }]}>Passwords do not match.</Text> : null}
        {errors.fields.code?.message || errors.fields.emailAddress?.message || errors.fields.password?.message ? (
          <Text style={[type.muted, { color: colors.foreground }]}>{errors.fields.code?.message ?? errors.fields.emailAddress?.message ?? errors.fields.password?.message}</Text>
        ) : null}
        <Button title={verifying ? 'Verify account' : 'Create account'} icon={verifying ? 'check' : 'arrow-right'} loading={fetchStatus === 'fetching'} disabled={verifying ? code.length < 6 : !emailAddress || password.length < 15 || passwordMismatch || !confirm} onPress={verifying ? verify : submit} />
        {verifying ? <Button title="Send a new code" variant="secondary" onPress={() => signUp.verifications.sendEmailCode()} /> : (
          <Text style={[type.body, styles.switch, { color: colors.mutedForeground }]}>Already have an account? <Link href="/(auth)/sign-in" style={{ color: colors.foreground }}>Sign in</Link></Text>
        )}
        <View nativeID="clerk-captcha" />
      </View>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: 22, gap: 34 },
  hero: { marginTop: 'auto', gap: 13 },
  form: { marginBottom: 'auto', gap: 12 },
  input: { minHeight: 56, borderWidth: 1, borderRadius: 16, paddingHorizontal: 17, fontFamily: 'Inter_400Regular', fontSize: 16 },
  switch: { textAlign: 'center', marginTop: 8 },
});