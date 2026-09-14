import { useGetTrainingPlan } from '@workspace/api-client-react';
import { type Href, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Card, ErrorState, Eyebrow, LoadingState, Screen, Title, type } from '@/components/ui';
import { useColors } from '@/hooks/useColors';

export default function PlanScreen() {
  const colors = useColors();
  const router = useRouter();
  const plan = useGetTrainingPlan();
  if (plan.isPending) return <LoadingState />;
  if (plan.isError) return <ErrorState onRetry={() => plan.refetch()} />;
  return (
    <Screen refresh={{ refreshing: plan.isRefetching, onRefresh: () => plan.refetch() }}>
      <View style={styles.hero}><Eyebrow>Week {plan.data.week} of {plan.data.totalWeeks}</Eyebrow><Title>{plan.data.name}</Title><Text style={[type.body, { color: colors.mutedForeground }]}>{plan.data.rationale}</Text></View>
      {plan.data.workouts.map((workout, index) => (
        <Pressable
          key={workout.id}
          accessibilityRole="button"
          disabled={workout.status === 'completed'}
          onPress={() => router.push({ pathname: '/workout/[id]', params: { id: workout.id } } as unknown as Href)}
          testID={`open-workout-${workout.id}`}
          style={({ pressed }) => ({ opacity: workout.status === 'completed' ? 0.62 : pressed ? 0.78 : 1 })}
        >
          <Card>
            <View style={styles.row}>
              <View style={[styles.number, { backgroundColor: colors.secondary }]}><Text style={[type.label, { color: colors.foreground }]}>{String(index + 1).padStart(2, '0')}</Text></View>
              <View style={styles.flex}><Text style={[type.heading, { color: colors.foreground }]}>{workout.title}</Text><Text style={[type.muted, { color: colors.mutedForeground }]}>{workout.day} · {workout.focus} · {workout.duration} min</Text></View>
              <Feather name={workout.status === 'completed' ? 'check' : 'chevron-right'} size={19} color={colors.mutedForeground} />
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            {workout.exercises.slice(0, 4).map((exercise) => (
              <View key={exercise.id} style={styles.exercise}><Text style={[type.body, { color: colors.foreground, flex: 1 }]}>{exercise.name}</Text><Text style={[type.muted, { color: colors.mutedForeground }]}>{exercise.sets} × {exercise.reps}</Text></View>
            ))}
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { gap: 10, marginTop: 14, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flex: { flex: 1, gap: 4 },
  number: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  divider: { height: 1, marginVertical: 16 },
  exercise: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, gap: 12 },
});