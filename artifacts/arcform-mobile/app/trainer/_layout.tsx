import { useAuth } from '@clerk/expo';
import { Redirect, Stack } from 'expo-router';
import { useGetAuthProfile } from '@workspace/api-client-react';
import { ErrorState, LoadingState } from '@/components/ui';
import { useColors } from '@/hooks/useColors';

export default function TrainerLayout() {
  const colors = useColors();
  const { isSignedIn } = useAuth();
  const profile = useGetAuthProfile();

  if (!isSignedIn) return <Redirect href="/(auth)/sign-in" />;
  if (profile.isPending) return <LoadingState />;
  if (profile.isError) {
    if ((profile.error as { status?: number }).status === 404) return <Redirect href="/onboarding" />;
    return <ErrorState onRetry={() => profile.refetch()} />;
  }
  if (profile.data.role !== 'trainer') return <Redirect href="/(tabs)" />;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.foreground,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
        headerTitleStyle: { fontFamily: 'Inter_500Medium' },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[id]" options={{ title: 'Athlete' }} />
    </Stack>
  );
}