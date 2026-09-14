import React, { useState } from 'react';
import { useAuth, useUser } from '@clerk/expo';
import { useSaveAuthProfile } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Redirect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { Brand, Button, Card, Eyebrow, Title, type } from '@/components/ui';
import { useColors } from '@/hooks/useColors';

type AppRole = 'athlete' | 'trainer';

export default function Onboarding() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isSignedIn, signOut } = useAuth();
  const { user } = useUser();
  const { role: requestedRole } = useLocalSearchParams<{ role?: string }>();
  const save = useSaveAuthProfile();
  const [name, setName] = useState(user?.fullName ?? '');
  const [role, setRole] = useState<AppRole>(requestedRole === 'trainer' ? 'trainer' : 'athlete');

  if (!isSignedIn) return <Redirect href="/(auth)/sign-in" />;
  const email = user?.primaryEmailAddress?.emailAddress ?? '';

  const finish = () => {
    save.mutate(
      { data: { name: name.trim(), email, role } },
      {
        onSuccess: async () => {
          await queryClient.invalidateQueries();
          router.replace((role === 'trainer' ? '/trainer' : '/(tabs)') as Href);
        },
      },
    );
  };

  return (
    <KeyboardAwareScrollViewCompat
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + 28, paddingBottom: insets.bottom + 28 }]}
    >
      <Brand />
      <View style={styles.hero}>
        <Eyebrow>Set your foundation</Eyebrow>
        <Title>Welcome to Arcform.</Title>
        <Text style={[type.body, { color: colors.mutedForeground }]}>Confirm your name and choose the workspace that matches how you use Arcform.</Text>
      </View>
      <View style={styles.form}>
        <TextInput value={name} onChangeText={setName} autoComplete="name" placeholder="Your name" placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.foreground, borderColor: colors.input, backgroundColor: colors.card }]} />
        <View style={styles.roles}>
          {(['athlete', 'trainer'] as const).map((option) => (
            <Card key={option} style={[styles.roleCard, role === option && { borderColor: colors.foreground }]}>
              <Text style={[type.label, { color: colors.foreground, textTransform: 'capitalize' }]}>{option}</Text>
              <Text style={[type.muted, { color: colors.mutedForeground }]}>
                {option === 'athlete' ? 'Log training and follow your plan.' : 'Manage athletes and programming.'}
              </Text>
              <Button title={`Choose ${option}`} variant={role === option ? 'primary' : 'secondary'} onPress={() => setRole(option)} />
            </Card>
          ))}
        </View>
        {save.isError ? <Text style={[type.muted, { color: colors.foreground }]}>We couldn’t create your profile. Please try again.</Text> : null}
        <Button title={`Continue as ${role}`} icon="arrow-right" loading={save.isPending} disabled={!name.trim() || !email} onPress={finish} />
        <Button title="Use another account" variant="secondary" onPress={() => signOut()} />
      </View>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: 22, gap: 42 },
  hero: { marginTop: 'auto', gap: 13 },
  form: { marginBottom: 'auto', gap: 12 },
  roles: { flexDirection: 'row', gap: 10 },
  roleCard: { flex: 1, padding: 14, gap: 12 },
  input: { minHeight: 56, borderWidth: 1, borderRadius: 16, paddingHorizontal: 17, fontFamily: 'Inter_400Regular', fontSize: 16 },
});