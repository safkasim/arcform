import { useAuth } from '@clerk/expo';
import { Redirect, useLocalSearchParams, type Href } from 'expo-router';
import { useGetAuthProfile } from '@workspace/api-client-react';
import { ErrorState, LoadingState } from '@/components/ui';

export default function Index() {
  const { isSignedIn } = useAuth();
  const { role } = useLocalSearchParams<{ role?: string }>();

  if (!isSignedIn) return <Redirect href="/welcome" />;
  return <SignedInIndex preferredRole={role === 'trainer' ? 'trainer' : role === 'athlete' ? 'athlete' : undefined} />;
}

function SignedInIndex({ preferredRole }: { preferredRole?: 'athlete' | 'trainer' }) {
  const profile = useGetAuthProfile();

  if (profile.isPending) return <LoadingState />;
  if (profile.isError) {
    if ((profile.error as { status?: number }).status === 404) {
      return <Redirect href={{ pathname: '/onboarding', params: preferredRole ? { role: preferredRole } : {} }} />;
    }
    return <ErrorState onRetry={() => profile.refetch()} />;
  }
  if (profile.data.role === 'trainer') return <Redirect href={'/trainer' as Href} />;
  return <Redirect href="/(tabs)" />;
}