import { useGetAuthProfile, useGetTrainingDashboard } from '@workspace/api-client-react';
import { type Href, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, ErrorState, Eyebrow, LoadingState, Screen, Title, type } from '@/components/ui';
import { useColors } from '@/hooks/useColors';

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const profile = useGetAuthProfile();
  const dashboard = useGetTrainingDashboard();
  const loading = profile.isPending || dashboard.isPending;
  if (loading) return <LoadingState />;
  if (profile.isError || dashboard.isError) return <ErrorState onRetry={() => { profile.refetch(); dashboard.refetch(); }} />;

  const data = dashboard.data;
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Screen refresh={{ refreshing: dashboard.isRefetching, onRefresh: () => dashboard.refetch() }}>
        <View style={styles.hero}>
          <Eyebrow>Today</Eyebrow>
          <Title>Ready, {profile.data.name.split(' ')[0]}?</Title>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open daily meal tracking"
          onPress={() => router.push('/meal' as Href)}
          testID="open-daily-intake"
          style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1 })}
        >
          <Card style={styles.bmrCard}>
            <View style={styles.row}>
              <View>
                <Eyebrow>Daily intake</Eyebrow>
                <Text style={[type.metric, { color: colors.foreground, marginTop: 7 }]}>
                  {data.calorieGoal.toLocaleString()}
                </Text>
                <Text style={[type.muted, { color: colors.mutedForeground }]}>daily calorie goal</Text>
              </View>
              <Feather name="chevron-right" size={21} color={colors.mutedForeground} />
            </View>
          </Card>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/workout/[id]', params: { id: data.nextWorkout.id } } as unknown as Href)}
          testID="open-next-workout"
          style={({ pressed }) => ({ opacity: pressed ? 0.78 : 1 })}
        >
          <Card style={styles.nextCard}>
            <View style={styles.row}>
              <View style={styles.flex}>
                <Eyebrow>Next workout</Eyebrow>
                <Text style={[type.heading, { color: colors.foreground, marginTop: 8 }]}>{data.nextWorkout.title}</Text>
                <Text style={[type.muted, { color: colors.mutedForeground, marginTop: 4 }]}>{data.nextWorkout.focus} · {data.nextWorkout.duration} min</Text>
              </View>
              <View style={[styles.circle, { backgroundColor: colors.primary }]}><Feather name="arrow-up-right" size={20} color={colors.primaryForeground} /></View>
            </View>
          </Card>
        </Pressable>
        <View style={styles.metrics}>
          <Card style={styles.metricCard}><Text style={[type.metric, { color: colors.foreground }]}>{data.streak}</Text><Text style={[type.muted, { color: colors.mutedForeground }]}>day streak</Text></Card>
          <Card style={styles.metricCard}><Text style={[type.metric, { color: colors.foreground }]}>{data.completedThisWeek}/{data.scheduledThisWeek}</Text><Text style={[type.muted, { color: colors.mutedForeground }]}>this week</Text></Card>
        </View>
        <Card>
          <View style={styles.row}><Eyebrow>Weekly volume</Eyebrow><Text style={[type.label, { color: colors.success }]}>{data.volumeChange >= 0 ? '+' : ''}{data.volumeChange}%</Text></View>
          <View style={[styles.track, { backgroundColor: colors.muted }]}><View style={[styles.fill, { backgroundColor: colors.foreground, width: `${Math.min(100, Math.max(8, data.completedThisWeek / Math.max(1, data.scheduledThisWeek) * 100))}%` }]} /></View>
          <Text style={[type.muted, { color: colors.mutedForeground }]}>{data.weeklyVolumeGoal} working sets targeted this week</Text>
        </Card>
        {data.history.length ? (
          <View style={styles.section}>
            <Eyebrow>Recent work</Eyebrow>
            {data.history.slice(0, 3).map((item) => (
              <View key={item.id} style={[styles.history, { borderBottomColor: colors.border }]}>
                <View><Text style={[type.body, { color: colors.foreground }]}>{item.title}</Text><Text style={[type.muted, { color: colors.mutedForeground }]}>{item.date}</Text></View>
                <Text style={[type.muted, { color: colors.mutedForeground }]}>{item.totalSets} sets · RPE {item.avgRpe}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </Screen>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open Form camera"
        onPress={() => router.push('/form' as Href)}
        style={({ pressed }) => [
          styles.formButton,
          {
            bottom: insets.bottom + 18,
            backgroundColor: colors.primary,
            opacity: pressed ? 0.7 : 0.88,
            transform: [{ scale: pressed ? 0.96 : 1 }],
          },
        ]}
      >
        <Text style={[styles.formButtonText, { color: colors.primaryForeground }]}>FORM</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: { gap: 8, marginTop: 16, marginBottom: 4 },
  bmrCard: { paddingVertical: 16 },
  nextCard: { padding: 20 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  flex: { flex: 1 },
  circle: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  metrics: { flexDirection: 'row', gap: 12 },
  metricCard: { flex: 1, gap: 3 },
  track: { height: 5, borderRadius: 3, overflow: 'hidden', marginVertical: 15 },
  fill: { height: '100%', borderRadius: 3 },
  section: { marginTop: 8 },
  history: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1 },
  formButton: {
    position: 'absolute',
    alignSelf: 'center',
    minWidth: 104,
    height: 48,
    borderRadius: 24,
    paddingHorizontal: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formButtonText: { fontFamily: 'Inter_500Medium', fontSize: 13, letterSpacing: 2.2 },
});