import { useEffect, useRef, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Pressable, StyleSheet, Text, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  getGetTrainerClientQueryKey,
  getListTrainerClientsQueryKey,
  useGetTrainerClient,
  useUpdateTrainerClient,
  type TrainerClient,
  type Workout,
} from '@workspace/api-client-react';
import { Button, Card, ErrorState, LoadingState, Screen, type } from '@/components/ui';
import { useColors } from '@/hooks/useColors';

function cloneWorkouts(workouts: Workout[]) {
  return workouts.map((workout) => ({
    ...workout,
    exercises: workout.exercises.map((exercise) => ({ ...exercise })),
  }));
}

function numeric(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function serializeDraft(calories: string, volume: string, split: string, workouts: Workout[]) {
  return JSON.stringify({ calories, volume, split, workouts });
}

export default function TrainerClientDetail() {
  const colors = useColors();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const client = useGetTrainerClient(id, {
    query: { enabled: !!id, queryKey: getGetTrainerClientQueryKey(id) },
  });
  const update = useUpdateTrainerClient();
  const initialized = useRef<string | null>(null);
  const baseline = useRef('');
  const [calories, setCalories] = useState('');
  const [volume, setVolume] = useState('');
  const [split, setSplit] = useState('');
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [message, setMessage] = useState('');
  const isDirty = baseline.current !== ''
    && serializeDraft(calories, volume, split, workouts) !== baseline.current;

  const hydrate = (value: TrainerClient) => {
    const nextCalories = String(value.calorieGoal);
    const nextVolume = String(value.weeklyVolumeGoal);
    const nextWorkouts = cloneWorkouts(value.workouts);
    baseline.current = serializeDraft(nextCalories, nextVolume, value.workoutSplit, nextWorkouts);
    setCalories(nextCalories);
    setVolume(nextVolume);
    setSplit(value.workoutSplit);
    setWorkouts(nextWorkouts);
  };

  useEffect(() => {
    if (client.data && initialized.current !== client.data.id) {
      hydrate(client.data);
      initialized.current = client.data.id;
    }
  }, [client.data]);

  const sync = (saved: TrainerClient) => {
    queryClient.setQueryData(getGetTrainerClientQueryKey(id), saved);
    queryClient.setQueryData<TrainerClient[]>(getListTrainerClientsQueryKey(), (current) =>
      current?.map((item) => item.id === saved.id ? saved : item),
    );
    hydrate(saved);
  };

  const save = async () => {
    if (!client.data) return;
    setMessage('');
    try {
      const saved = await update.mutateAsync({
        clientId: id,
        data: {
          calorieGoal: numeric(calories, client.data.calorieGoal),
          weeklyVolumeGoal: numeric(volume, client.data.weeklyVolumeGoal),
          workoutSplit: split.trim(),
          workouts,
        },
      });
      sync(saved);
      setMessage('Programming targets updated.');
    } catch (error) {
      setMessage((error as { data?: { error?: string } }).data?.error ?? 'Targets could not be saved. Check each value and try again.');
    }
  };

  const refresh = async () => {
    const result = await client.refetch();
    if (result.data) hydrate(result.data);
  };

  const setExercise = (workoutIndex: number, exerciseIndex: number, field: 'targetWeight' | 'targetRpe', value: string) => {
    setWorkouts((current) => current.map((workout, wi) => wi !== workoutIndex ? workout : {
      ...workout,
      exercises: workout.exercises.map((exercise, ei) => ei !== exerciseIndex ? exercise : {
        ...exercise,
        [field]: field === 'targetRpe' ? numeric(value, exercise.targetRpe) : value,
      }),
    }));
  };

  const setWorkout = <K extends keyof Workout>(index: number, field: K, value: Workout[K]) => {
    setWorkouts((current) => current.map((workout, workoutIndex) => (
      workoutIndex === index ? { ...workout, [field]: value } : workout
    )));
  };

  const setExerciseField = <K extends keyof Workout['exercises'][number]>(
    workoutIndex: number,
    exerciseIndex: number,
    field: K,
    value: Workout['exercises'][number][K],
  ) => {
    setWorkouts((current) => current.map((workout, wi) => wi !== workoutIndex ? workout : {
      ...workout,
      exercises: workout.exercises.map((exercise, ei) => (
        ei === exerciseIndex ? { ...exercise, [field]: value } : exercise
      )),
    }));
  };

  const moveWorkout = (index: number, direction: -1 | 1) => {
    setWorkouts((current) => moveItem(current, index, index + direction));
  };

  const moveExercise = (workoutIndex: number, exerciseIndex: number, direction: -1 | 1) => {
    setWorkouts((current) => current.map((workout, wi) => wi !== workoutIndex ? workout : {
      ...workout,
      exercises: moveItem(workout.exercises, exerciseIndex, exerciseIndex + direction),
    }));
  };

  const addWorkout = () => {
    setWorkouts((current) => [...current, {
      id: createId('workout'),
      day: `Day ${current.length + 1}`,
      title: 'New workout',
      focus: 'General',
      duration: 60,
      status: 'upcoming',
      exercises: [],
    }]);
  };

  const addExercise = (workoutIndex: number) => {
    setWorkouts((current) => current.map((workout, index) => index !== workoutIndex ? workout : {
      ...workout,
      exercises: [...workout.exercises, {
        id: createId('exercise'),
        name: 'New exercise',
        sets: 3,
        reps: '10',
        targetWeight: 'Bodyweight',
        targetRpe: 8,
      }],
    }));
  };

  if (client.isPending) return <LoadingState />;
  if (client.isError || !client.data) return <ErrorState onRetry={() => client.refetch()} />;

  return (
    <Screen
      refresh={isDirty ? undefined : { refreshing: client.isRefetching, onRefresh: refresh }}
      keyboardDismissMode="interactive"
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.identity}>
        <Text style={[styles.name, { color: colors.foreground }]}>{client.data.name}</Text>
        <Text style={[type.muted, { color: colors.mutedForeground }]}>{client.data.email} · {client.data.goal.replaceAll('_', ' ')}</Text>
      </View>
      <View style={styles.metricGrid}>
        <Card style={styles.metricCard}>
          <Text style={[type.metric, { color: colors.foreground }]}>{client.data.adherence}%</Text>
          <Text style={[type.muted, { color: colors.mutedForeground }]}>Adherence</Text>
        </Card>
        <Card style={styles.metricCard}>
          <Text style={[type.metric, { color: colors.success }]}>{client.data.streak}</Text>
          <Text style={[type.muted, { color: colors.mutedForeground }]}>Week streak</Text>
        </Card>
      </View>
      <Card style={styles.section}>
        <Text style={[type.heading, { color: colors.foreground }]}>Training parameters</Text>
        <Field label="Daily calorie target" value={calories} onChangeText={setCalories} keyboardType="number-pad" />
        <Field label="Weekly volume target (sets)" value={volume} onChangeText={setVolume} keyboardType="number-pad" />
        <Field label="Workout split" value={split} onChangeText={setSplit} />
      </Card>
      <View style={styles.section}>
        <View style={styles.sectionHeading}>
          <Text style={[type.heading, { color: colors.foreground }]}>Programming</Text>
          <Text style={[type.muted, { color: colors.mutedForeground }]}>Build the weekly plan. Completion status stays synced with athlete activity.</Text>
          {isDirty ? <Text style={[type.muted, { color: colors.foreground }]}>Unsaved changes</Text> : null}
        </View>
        {workouts.map((workout, workoutIndex) => (
          <Card key={workout.id} style={styles.workout}>
            <View style={styles.cardHeading}>
              <Text style={[type.label, { color: colors.foreground }]}>Workout {workoutIndex + 1}</Text>
              <View style={styles.actions}>
                <IconButton label="Move workout up" icon="arrow-up" disabled={workoutIndex === 0} onPress={() => moveWorkout(workoutIndex, -1)} />
                <IconButton label="Move workout down" icon="arrow-down" disabled={workoutIndex === workouts.length - 1} onPress={() => moveWorkout(workoutIndex, 1)} />
                <IconButton label="Remove workout" icon="trash-2" destructive onPress={() => setWorkouts((current) => current.filter((_, index) => index !== workoutIndex))} />
              </View>
            </View>
            <View style={styles.workoutFields}>
              <Field label="Day" value={workout.day} onChangeText={(value) => setWorkout(workoutIndex, 'day', value)} />
              <Field label="Title" value={workout.title} onChangeText={(value) => setWorkout(workoutIndex, 'title', value)} />
              <Field label="Focus" value={workout.focus} onChangeText={(value) => setWorkout(workoutIndex, 'focus', value)} />
              <Field
                label="Duration (minutes)"
                value={String(workout.duration)}
                keyboardType="number-pad"
                onChangeText={(value) => setWorkout(workoutIndex, 'duration', numeric(value, workout.duration))}
              />
            </View>
            {workout.exercises.map((exercise, exerciseIndex) => (
              <View key={exercise.id} style={[styles.exercise, { borderTopColor: colors.border }]}>
                <View style={styles.cardHeading}>
                  <Text style={[type.muted, { color: colors.mutedForeground }]}>Exercise {exerciseIndex + 1}</Text>
                  <View style={styles.actions}>
                    <IconButton label="Move exercise up" icon="arrow-up" disabled={exerciseIndex === 0} onPress={() => moveExercise(workoutIndex, exerciseIndex, -1)} />
                    <IconButton label="Move exercise down" icon="arrow-down" disabled={exerciseIndex === workout.exercises.length - 1} onPress={() => moveExercise(workoutIndex, exerciseIndex, 1)} />
                    <IconButton label="Remove exercise" icon="x" destructive onPress={() => setWorkouts((current) => current.map((item, index) => index !== workoutIndex ? item : { ...item, exercises: item.exercises.filter((_, ei) => ei !== exerciseIndex) }))} />
                  </View>
                </View>
                <Field label="Exercise" value={exercise.name} onChangeText={(value) => setExerciseField(workoutIndex, exerciseIndex, 'name', value)} />
                <View style={styles.exerciseFields}>
                  <Field
                    label="Sets"
                    value={String(exercise.sets)}
                    keyboardType="number-pad"
                    onChangeText={(value) => setExerciseField(workoutIndex, exerciseIndex, 'sets', numeric(value, exercise.sets))}
                    containerStyle={styles.flexField}
                  />
                  <Field
                    label="Reps"
                    value={exercise.reps}
                    onChangeText={(value) => setExerciseField(workoutIndex, exerciseIndex, 'reps', value)}
                    containerStyle={styles.flexField}
                  />
                </View>
                <View style={styles.exerciseFields}>
                  <Field
                    label="Target weight"
                    value={exercise.targetWeight}
                    onChangeText={(value) => setExercise(workoutIndex, exerciseIndex, 'targetWeight', value)}
                    containerStyle={styles.flexField}
                  />
                  <Field
                    label="Target RPE"
                    value={String(exercise.targetRpe)}
                    keyboardType="decimal-pad"
                    onChangeText={(value) => setExercise(workoutIndex, exerciseIndex, 'targetRpe', value)}
                    containerStyle={styles.flexField}
                  />
                </View>
              </View>
            ))}
            <Button testID={`add-exercise-${workout.id}`} title="Add exercise" icon="plus" variant="secondary" onPress={() => addExercise(workoutIndex)} />
          </Card>
        ))}
        {workouts.length === 0 ? (
          <Card><Text style={[type.muted, { color: colors.mutedForeground }]}>No workouts yet. Add one to start this plan.</Text></Card>
        ) : null}
        <Button testID="add-workout" title="Add workout" icon="plus" variant="secondary" onPress={addWorkout} />
      </View>
      {message ? <Text accessibilityLiveRegion="polite" style={[type.muted, { color: colors.foreground }]}>{message}</Text> : null}
      <Button
        testID="save-programming-targets"
        title="Save complete program"
        icon="check"
        loading={update.isPending}
        disabled={!split.trim() || !isValidProgram(workouts)}
        onPress={save}
      />
    </Screen>
  );
}

function moveItem<T>(items: T[], from: number, to: number) {
  if (to < 0 || to >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function isValidProgram(workouts: Workout[]) {
  return workouts.length > 0 && workouts.every((workout) => (
    workout.day.trim()
    && workout.title.trim()
    && workout.focus.trim()
    && Number.isInteger(workout.duration)
    && workout.duration > 0
    && workout.exercises.every((exercise) => (
      exercise.name.trim()
      && Number.isInteger(exercise.sets)
      && exercise.sets > 0
      && exercise.reps.trim()
      && exercise.targetWeight.trim()
      && exercise.targetRpe >= 1
      && exercise.targetRpe <= 10
    ))
  ));
}

function IconButton({
  label,
  icon,
  destructive = false,
  disabled = false,
  onPress,
}: {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  destructive?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      disabled={disabled}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: disabled ? 0.25 : pressed ? 0.5 : 1, padding: 5 })}
    >
      <Feather name={icon} size={17} color={destructive ? colors.destructive : colors.mutedForeground} />
    </Pressable>
  );
}

function Field({
  label,
  containerStyle,
  ...props
}: React.ComponentProps<typeof TextInput> & { label: string; containerStyle?: StyleProp<ViewStyle> }) {
  const colors = useColors();
  return (
    <View style={[styles.field, containerStyle]}>
      <Text style={[type.muted, { color: colors.mutedForeground }]}>{label}</Text>
      <TextInput {...props} placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.foreground, borderColor: colors.input, backgroundColor: colors.background }, props.style]} />
    </View>
  );
}

const styles = StyleSheet.create({
  identity: { gap: 4 },
  name: { fontFamily: 'Inter_500Medium', fontSize: 29, letterSpacing: -0.8 },
  metricGrid: { flexDirection: 'row', gap: 10 },
  metricCard: { flex: 1, gap: 4 },
  section: { gap: 15 },
  sectionHeading: { gap: 4 },
  field: { gap: 7 },
  input: { height: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 13, fontFamily: 'Inter_400Regular', fontSize: 15 },
  workout: { gap: 12 },
  cardHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  workoutFields: { gap: 10 },
  exercise: { borderTopWidth: 1, paddingTop: 12, gap: 10 },
  exerciseFields: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  flexField: { flex: 1 },
});