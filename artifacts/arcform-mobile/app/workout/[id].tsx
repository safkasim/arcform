import { useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import {
  getGetTrainingDashboardQueryKey,
  getGetTrainingPlanQueryKey,
  type LoggedSet,
  useGetTrainingPlan,
  useLogWorkout,
} from '@workspace/api-client-react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { Button, Card, ErrorState, Eyebrow, LoadingState, Title, type } from '@/components/ui';
import { useColors } from '@/hooks/useColors';

type SetDraft = { weight: string; reps: string; rpe: string; completed: boolean };
type WorkoutDraft = { sets: Record<string, Record<number, SetDraft>>; notes: string };

const emptySet: SetDraft = { weight: '', reps: '', rpe: '', completed: false };

function draftKey(workoutId: string) {
  return `arcform:workout-draft:${workoutId}`;
}

function numberFromTarget(value: string) {
  return value.replace(/[^0-9.]/g, '');
}

export default function WorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const workoutId = Array.isArray(id) ? id[0] : id;
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const plan = useGetTrainingPlan();
  const logWorkout = useLogWorkout();
  const [draft, setDraft] = useState<WorkoutDraft>({ sets: {}, notes: '' });
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [adaptation, setAdaptation] = useState<string | null>(null);

  const workout = useMemo(
    () => plan.data?.workouts.find((item) => item.id === workoutId),
    [plan.data, workoutId],
  );

  useEffect(() => {
    let active = true;
    if (!workoutId) return;
    AsyncStorage.getItem(draftKey(workoutId))
      .then((stored) => {
        if (active && stored) setDraft(JSON.parse(stored) as WorkoutDraft);
      })
      .finally(() => {
        if (active) setDraftLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [workoutId]);

  useEffect(() => {
    if (!workoutId || !draftLoaded || adaptation) return;
    void AsyncStorage.setItem(draftKey(workoutId), JSON.stringify(draft));
  }, [adaptation, draft, draftLoaded, workoutId]);

  const updateSet = (exerciseId: string, setIndex: number, patch: Partial<SetDraft>) => {
    setDraft((current) => ({
      ...current,
      sets: {
        ...current.sets,
        [exerciseId]: {
          ...(current.sets[exerciseId] ?? {}),
          [setIndex]: { ...(current.sets[exerciseId]?.[setIndex] ?? emptySet), ...patch },
        },
      },
    }));
  };

  const completedSets = useMemo(() => {
    const sets: LoggedSet[] = [];
    Object.entries(draft.sets).forEach(([exerciseId, exerciseSets]) => {
      Object.entries(exerciseSets).forEach(([setIndex, set]) => {
        if (!set.completed) return;
        sets.push({
          exerciseId,
          setNumber: Number(setIndex) + 1,
          reps: Number.parseInt(set.reps, 10) || 0,
          weight: Number.parseFloat(set.weight) || 0,
          rpe: Number.parseInt(set.rpe, 10) || 7,
        });
      });
    });
    return sets;
  }, [draft.sets]);

  const finishWorkout = () => {
    if (!workoutId || completedSets.length === 0) return;
    logWorkout.mutate(
      {
        workoutId,
        data: { sets: completedSets, notes: draft.notes.trim() || undefined },
      },
      {
        onSuccess: async (result) => {
          await AsyncStorage.removeItem(draftKey(workoutId));
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: getGetTrainingDashboardQueryKey() }),
            queryClient.invalidateQueries({ queryKey: getGetTrainingPlanQueryKey() }),
          ]);
          setAdaptation(result.adaptation);
        },
      },
    );
  };

  if (plan.isPending || !draftLoaded) return <LoadingState />;
  if (plan.isError) return <ErrorState onRetry={() => plan.refetch()} />;
  if (!workout || !workoutId) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[type.heading, { color: colors.foreground }]}>Session not found</Text>
        <Button title="Return to plan" variant="secondary" onPress={() => router.replace('/(tabs)/plan')} />
      </View>
    );
  }

  if (adaptation) {
    return (
      <View style={[styles.success, { backgroundColor: colors.background, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
        <View style={[styles.successIcon, { borderColor: colors.success }]}>
          <Feather name="check" size={30} color={colors.success} />
        </View>
        <View style={styles.successCopy}>
          <Eyebrow>Workout complete</Eyebrow>
          <Title>Session logged</Title>
          <Card><Text style={[type.body, { color: colors.foreground }]}>{adaptation}</Text></Card>
        </View>
        <Button title="Return to dashboard" icon="arrow-right" onPress={() => router.replace('/(tabs)')} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 120, paddingHorizontal: 16 }}
        bottomOffset={24}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.back} testID="close-workout">
            <Feather name="chevron-left" size={25} color={colors.foreground} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Eyebrow>{workout.focus} · {workout.duration} min</Eyebrow>
            <Text style={[type.heading, { color: colors.foreground }]}>{workout.title}</Text>
          </View>
        </View>

        {workout.exercises.map((exercise, exerciseIndex) => (
          <Card key={exercise.id} style={styles.exerciseCard}>
            <View style={styles.exerciseHeader}>
              <View style={styles.exerciseTitle}>
                <Text style={[type.muted, { color: colors.mutedForeground }]}>{String(exerciseIndex + 1).padStart(2, '0')}</Text>
                <Text style={[type.heading, { color: colors.foreground, flex: 1 }]}>{exercise.name}</Text>
              </View>
              <Text style={[type.muted, { color: colors.mutedForeground }]}>{exercise.sets} × {exercise.reps} · RPE {exercise.targetRpe}</Text>
            </View>
            <View style={[styles.labels, { borderBottomColor: colors.border }]}>
              <Text style={[styles.setLabel, type.muted, { color: colors.mutedForeground }]}>Set</Text>
              <Text style={[styles.fieldLabel, type.muted, { color: colors.mutedForeground }]}>Weight</Text>
              <Text style={[styles.fieldLabel, type.muted, { color: colors.mutedForeground }]}>Reps</Text>
              <Text style={[styles.fieldLabel, type.muted, { color: colors.mutedForeground }]}>RPE</Text>
              <View style={styles.checkSpace} />
            </View>
            {Array.from({ length: exercise.sets }).map((_, setIndex) => {
              const set = draft.sets[exercise.id]?.[setIndex] ?? emptySet;
              return (
                <View key={setIndex} style={[styles.setRow, setIndex > 0 && { borderTopColor: colors.border, borderTopWidth: 1 }]}>
                  <Text style={[styles.setLabel, type.label, { color: colors.mutedForeground }]}>{setIndex + 1}</Text>
                  <TextInput
                    accessibilityLabel={`${exercise.name} set ${setIndex + 1} weight`}
                    editable={!set.completed}
                    keyboardType="decimal-pad"
                    placeholder={exercise.targetWeight}
                    placeholderTextColor={colors.mutedForeground}
                    value={set.weight}
                    onChangeText={(weight) => updateSet(exercise.id, setIndex, { weight })}
                    style={[styles.input, { color: colors.foreground, borderColor: colors.input, backgroundColor: colors.background }]}
                    testID={`set-${exercise.id}-${setIndex}-weight`}
                  />
                  <TextInput
                    accessibilityLabel={`${exercise.name} set ${setIndex + 1} reps`}
                    editable={!set.completed}
                    keyboardType="number-pad"
                    placeholder={numberFromTarget(exercise.reps)}
                    placeholderTextColor={colors.mutedForeground}
                    value={set.reps}
                    onChangeText={(reps) => updateSet(exercise.id, setIndex, { reps })}
                    style={[styles.input, { color: colors.foreground, borderColor: colors.input, backgroundColor: colors.background }]}
                    testID={`set-${exercise.id}-${setIndex}-reps`}
                  />
                  <TextInput
                    accessibilityLabel={`${exercise.name} set ${setIndex + 1} RPE`}
                    editable={!set.completed}
                    keyboardType="number-pad"
                    maxLength={2}
                    placeholder={String(exercise.targetRpe)}
                    placeholderTextColor={colors.mutedForeground}
                    value={set.rpe}
                    onChangeText={(rpe) => updateSet(exercise.id, setIndex, { rpe })}
                    style={[styles.input, { color: colors.foreground, borderColor: colors.input, backgroundColor: colors.background }]}
                    testID={`set-${exercise.id}-${setIndex}-rpe`}
                  />
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: set.completed }}
                    onPress={() => updateSet(exercise.id, setIndex, {
                      completed: !set.completed,
                      weight: set.weight || numberFromTarget(exercise.targetWeight),
                      reps: set.reps || numberFromTarget(exercise.reps),
                      rpe: set.rpe || String(exercise.targetRpe),
                    })}
                    style={[styles.check, { backgroundColor: set.completed ? colors.primary : colors.secondary, borderColor: set.completed ? colors.primary : colors.border }]}
                    testID={`set-${exercise.id}-${setIndex}-complete`}
                  >
                    <Feather name="check" size={17} color={set.completed ? colors.primaryForeground : colors.mutedForeground} />
                  </Pressable>
                </View>
              );
            })}
          </Card>
        ))}

        <Card>
          <Text style={[type.label, { color: colors.foreground, marginBottom: 10 }]}>Session notes</Text>
          <TextInput
            multiline
            placeholder="Energy, discomfort, or execution notes..."
            placeholderTextColor={colors.mutedForeground}
            value={draft.notes}
            onChangeText={(notes) => setDraft((current) => ({ ...current, notes }))}
            style={[styles.notes, { color: colors.foreground, borderColor: colors.input, backgroundColor: colors.background }]}
            textAlignVertical="top"
            testID="workout-notes"
          />
        </Card>

        {logWorkout.isError ? (
          <Text style={[type.muted, { color: colors.destructive }]}>The workout could not be saved. Check your connection and try again.</Text>
        ) : null}
      </KeyboardAwareScrollViewCompat>
      <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: insets.bottom + 12 }]}>
        <Text style={[type.muted, { color: colors.mutedForeground }]}>{completedSets.length} sets ready</Text>
        <Button
          title="Finish workout"
          icon="zap"
          loading={logWorkout.isPending}
          disabled={completedSets.length === 0}
          onPress={finishWorkout}
          testID="finish-workout"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  headerCopy: { flex: 1, gap: 5 },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  exerciseCard: { padding: 0, overflow: 'hidden', marginBottom: 16 },
  exerciseHeader: { padding: 16, gap: 6 },
  exerciseTitle: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  labels: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 9, borderBottomWidth: 1 },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 10 },
  setLabel: { width: 28, textAlign: 'center' },
  fieldLabel: { flex: 1, textAlign: 'center', fontSize: 11 },
  checkSpace: { width: 40 },
  input: { flex: 1, height: 44, minWidth: 0, borderWidth: 1, borderRadius: 10, textAlign: 'center', fontFamily: 'Inter_500Medium', fontSize: 14 },
  check: { width: 40, height: 44, borderWidth: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  notes: { minHeight: 100, borderWidth: 1, borderRadius: 12, padding: 12, fontFamily: 'Inter_400Regular', fontSize: 14 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopWidth: 1, paddingHorizontal: 16, paddingTop: 12, gap: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18, padding: 24 },
  success: { flex: 1, justifyContent: 'center', gap: 24, paddingHorizontal: 24 },
  successIcon: { width: 64, height: 64, borderRadius: 32, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  successCopy: { gap: 12 },
});