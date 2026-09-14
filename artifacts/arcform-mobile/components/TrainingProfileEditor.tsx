import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSaveTrainingProfile, type TrainingProfile } from '@workspace/api-client-react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Card, Eyebrow, type } from '@/components/ui';
import { useColors } from '@/hooks/useColors';

type Goal = 'strength' | 'hypertrophy' | 'general' | 'fat_loss';
type Experience = 'beginner' | 'intermediate' | 'advanced';
type Equipment = 'full_gym' | 'home_gym' | 'bodyweight';
type Sex = 'male' | 'female';
type WeightUnit = 'lb' | 'kg';
type HeightUnit = 'in' | 'cm';

const goals: { value: Goal; label: string }[] = [
  { value: 'strength', label: 'Strength' },
  { value: 'hypertrophy', label: 'Muscle' },
  { value: 'general', label: 'General' },
  { value: 'fat_loss', label: 'Fat loss' },
];
const experiences: Experience[] = ['beginner', 'intermediate', 'advanced'];
const equipment: { value: Equipment; label: string }[] = [
  { value: 'full_gym', label: 'Full gym' },
  { value: 'home_gym', label: 'Home gym' },
  { value: 'bodyweight', label: 'Bodyweight' },
];

export function TrainingProfileEditor({ profile }: { profile: TrainingProfile }) {
  const colors = useColors();
  const queryClient = useQueryClient();
  const save = useSaveTrainingProfile();
  const [goal, setGoal] = useState<Goal>(profile.goal);
  const [experience, setExperience] = useState<Experience>(profile.experience);
  const [daysPerWeek, setDaysPerWeek] = useState(profile.daysPerWeek);
  const [equipmentLevel, setEquipmentLevel] = useState<Equipment>(profile.equipment);
  const [age, setAge] = useState(profile.age?.toString() ?? '');
  const [weight, setWeight] = useState(profile.weight?.toString() ?? '');
  const [weightUnit, setWeightUnit] = useState<WeightUnit>(profile.weightUnit ?? 'lb');
  const [height, setHeight] = useState(profile.height?.toString() ?? '');
  const [heightUnit, setHeightUnit] = useState<HeightUnit>(profile.heightUnit ?? 'in');
  const [sex, setSex] = useState<Sex>(profile.sex ?? 'male');
  const [saved, setSaved] = useState(false);

  const weightValue = Number(weight);
  const heightValue = Number(height);
  const ageValue = Number(age);
  const weightKg = weightUnit === 'kg' ? weightValue : weightValue * 0.45359237;
  const heightCm = heightUnit === 'cm' ? heightValue : heightValue * 2.54;
  const bmr = ageValue > 0 && weightKg > 0 && heightCm > 0
    ? sex === 'male'
      ? 88.362 + 13.397 * weightKg + 4.799 * heightCm - 5.677 * ageValue
      : 447.593 + 9.247 * weightKg + 3.098 * heightCm - 4.33 * ageValue
    : null;

  const submit = () => {
    setSaved(false);
    save.mutate(
      {
        data: {
          goal,
          lifestyle: profile.lifestyle,
          experience,
          daysPerWeek,
          equipment: equipmentLevel,
          age: ageValue || undefined,
          weight: weightValue || undefined,
          weightUnit,
          height: heightValue || undefined,
          heightUnit,
          sex,
        },
      },
      {
        onSuccess: async () => {
          setSaved(true);
          await queryClient.invalidateQueries();
        },
      },
    );
  };

  return (
    <Card style={styles.card}>
      <View style={styles.headingRow}>
        <View style={styles.flex}>
          <Eyebrow>Training & body profile</Eyebrow>
          <Text style={[type.muted, { color: colors.mutedForeground }]}>Used for programming and your BMR calculation.</Text>
        </View>
        {bmr ? <Text style={[styles.bmr, { color: colors.foreground }]}>{Math.round(bmr)} BMR</Text> : null}
      </View>

      <Field label="Goal">
        <ChoiceRow options={goals} value={goal} onChange={setGoal} />
      </Field>
      <Field label="Experience level">
        <ChoiceRow options={experiences.map((value) => ({ value, label: capitalize(value) }))} value={experience} onChange={setExperience} />
      </Field>
      <Field label="Frequency">
        <ChoiceRow options={[2, 3, 4, 5, 6].map((value) => ({ value, label: `${value} days` }))} value={daysPerWeek} onChange={setDaysPerWeek} />
      </Field>
      <Field label="Equipment level">
        <ChoiceRow options={equipment} value={equipmentLevel} onChange={setEquipmentLevel} />
      </Field>
      <View style={styles.measureGrid}>
        <Field label="Age">
          <TextInput value={age} onChangeText={setAge} keyboardType="number-pad" placeholder="Years" placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.foreground, borderColor: colors.input }]} />
        </Field>
        <Field label="Sex">
          <ChoiceRow options={[{ value: 'male' as const, label: 'Male' }, { value: 'female' as const, label: 'Female' }]} value={sex} onChange={setSex} />
        </Field>
      </View>
      <Field label="Weight">
        <View style={styles.measureRow}>
          <TextInput value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="Weight" placeholderTextColor={colors.mutedForeground} style={[styles.input, styles.flex, { color: colors.foreground, borderColor: colors.input }]} />
          <UnitToggle options={['lb', 'kg']} value={weightUnit} onChange={setWeightUnit} />
        </View>
        {weightValue > 0 ? <Text style={[type.muted, { color: colors.mutedForeground }]}>{weightKg.toFixed(1)} kg · {(weightKg / 0.45359237).toFixed(1)} lb</Text> : null}
      </Field>
      <Field label="Height">
        <View style={styles.measureRow}>
          <TextInput value={height} onChangeText={setHeight} keyboardType="decimal-pad" placeholder="Height" placeholderTextColor={colors.mutedForeground} style={[styles.input, styles.flex, { color: colors.foreground, borderColor: colors.input }]} />
          <UnitToggle options={['in', 'cm']} value={heightUnit} onChange={setHeightUnit} />
        </View>
        {heightValue > 0 ? <Text style={[type.muted, { color: colors.mutedForeground }]}>{heightCm.toFixed(1)} cm · {(heightCm / 2.54).toFixed(1)} in</Text> : null}
      </Field>
      {save.isError ? <Text style={[type.muted, { color: colors.foreground }]}>Couldn’t save your profile. Check the values and try again.</Text> : null}
      <Button title={saved ? 'Profile saved' : 'Save profile'} icon="check" loading={save.isPending} onPress={submit} />
    </Card>
  );
}

function Field({ label, children }: React.PropsWithChildren<{ label: string }>) {
  const colors = useColors();
  return <View style={styles.field}><Text style={[type.label, { color: colors.foreground }]}>{label}</Text>{children}</View>;
}

function ChoiceRow<T extends string | number>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (value: T) => void }) {
  const colors = useColors();
  return (
    <View style={styles.choices}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable key={String(option.value)} onPress={() => onChange(option.value)} style={[styles.choice, { backgroundColor: selected ? colors.primary : colors.secondary, borderColor: selected ? colors.primary : colors.border }]}>
            <Text style={[type.muted, { color: selected ? colors.primaryForeground : colors.foreground }]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function UnitToggle<T extends string>({ options, value, onChange }: { options: T[]; value: T; onChange: (value: T) => void }) {
  return <ChoiceRow options={options.map((option) => ({ value: option, label: option }))} value={value} onChange={onChange} />;
}

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const styles = StyleSheet.create({
  card: { gap: 22 },
  headingRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  flex: { flex: 1 },
  bmr: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  field: { gap: 9 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  choice: { minHeight: 36, justifyContent: 'center', borderWidth: 1, borderRadius: 18, paddingHorizontal: 12 },
  measureGrid: { gap: 18 },
  measureRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, fontFamily: 'Inter_400Regular', fontSize: 15 },
});