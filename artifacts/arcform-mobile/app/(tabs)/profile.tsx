import React, { useState } from 'react';
import { useAuth } from '@clerk/expo';
import { useGenerateAthleteInviteCode, useGetAthleteInviteCode, useGetAuthProfile, useGetTrainingProfile } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { StyleSheet, Text, View } from 'react-native';
import { Button, Card, ErrorState, Eyebrow, LoadingState, Screen, Title, type } from '@/components/ui';
import { useColors } from '@/hooks/useColors';
import { TrainingProfileEditor } from '@/components/TrainingProfileEditor';

export default function ProfileScreen() {
  const colors = useColors();
  const queryClient = useQueryClient();
  const { signOut } = useAuth();
  const authProfile = useGetAuthProfile();
  const training = useGetTrainingProfile();
  const invite = useGetAthleteInviteCode();
  const generate = useGenerateAthleteInviteCode();
  const [copied, setCopied] = useState(false);
  const loading = authProfile.isPending || training.isPending || invite.isPending;
  if (loading) return <LoadingState />;
  if (authProfile.isError || training.isError || invite.isError) return <ErrorState onRetry={() => { authProfile.refetch(); training.refetch(); invite.refetch(); }} />;

  const makeCode = () => generate.mutate(undefined, { onSuccess: async () => { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); await queryClient.invalidateQueries(); } });
  return (
    <Screen>
      <View style={styles.hero}><Eyebrow>Athlete profile</Eyebrow><Title>{authProfile.data.name}</Title><Text style={[type.body, { color: colors.mutedForeground }]}>{authProfile.data.email}</Text></View>
      <TrainingProfileEditor profile={training.data} />
      <Card>
        <Eyebrow>Link to your trainer</Eyebrow>
        {invite.data.linked ? (
          <View style={styles.linked}><Text style={[type.heading, { color: colors.foreground }]}>Connected</Text><Text style={[type.body, { color: colors.mutedForeground }]}>{invite.data.trainerName ?? 'Your trainer'} can now view and adjust your programming.</Text></View>
        ) : invite.data.code ? (
          <View style={styles.linked}>
            <Text style={[styles.code, { color: colors.foreground }]}>{invite.data.code}</Text>
            <Text style={[type.muted, { color: colors.mutedForeground }]}>Share this one-time code with your trainer.</Text>
            <Button title={copied ? 'Code ready to share' : 'Confirm code'} variant="secondary" icon="check" onPress={() => setCopied(true)} />
          </View>
        ) : (
          <View style={styles.linked}><Text style={[type.body, { color: colors.mutedForeground }]}>Generate a secure six-digit code for your trainer. It can only be used once.</Text><Button title="Generate code" icon="link-2" loading={generate.isPending} onPress={makeCode} /></View>
        )}
      </Card>
      <Button title="Sign out" variant="secondary" icon="log-out" onPress={() => signOut()} testID="sign-out" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { gap: 8, marginTop: 18, marginBottom: 4 },
  linked: { gap: 14, marginTop: 15 },
  code: { fontFamily: 'Inter_600SemiBold', fontSize: 40, letterSpacing: 8 },
});