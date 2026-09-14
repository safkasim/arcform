import React, { useState } from 'react';
import {
  useAddNutritionMeal,
  useDeleteNutritionMeal,
  useGetDailyNutrition,
  useGetTrainingProfile,
} from '@workspace/api-client-react';
import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Button, Card, ErrorState, Eyebrow, LoadingState, Screen, Title, type } from '@/components/ui';
import { useColors } from '@/hooks/useColors';

const todayKey = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
};

export default function MealScreen() {
  const colors = useColors();
  const date = todayKey();
  const nutrition = useGetDailyNutrition(date);
  const profile = useGetTrainingProfile();
  const addMeal = useAddNutritionMeal();
  const deleteMeal = useDeleteNutritionMeal();
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');

  if (nutrition.isPending || profile.isPending) return <LoadingState />;
  if (nutrition.isError || profile.isError) return <ErrorState onRetry={() => { nutrition.refetch(); profile.refetch(); }} />;

  const data = nutrition.data;
  const progress = Math.min(1, data.caloriesConsumed / Math.max(1, data.calorieGoal));
  const reset = () => {
    setName('');
    setCalories('');
    setProtein('');
    setCarbs('');
    setFat('');
  };
  const submit = () => {
    if (!name.trim() || !calories) return;
    addMeal.mutate(
      {
        date,
        data: {
          name: name.trim(),
          calories: Number(calories) || 0,
          protein: Number(protein) || 0,
          carbs: Number(carbs) || 0,
          fat: Number(fat) || 0,
        },
      },
      { onSuccess: () => { reset(); nutrition.refetch(); } },
    );
  };

  return (
    <Screen refresh={{ refreshing: nutrition.isRefetching, onRefresh: () => nutrition.refetch() }}>
      <View style={styles.hero}>
        <Eyebrow>Daily nutrition</Eyebrow>
        <Title>Fuel the work.</Title>
      </View>
      <View style={styles.summary}>
        <View>
          <Eyebrow>BMR</Eyebrow>
          <Text style={[type.heading, { color: colors.foreground }]}>
            {profile.data.bmrHarris ? Math.round(profile.data.bmrHarris).toLocaleString() : '—'}
          </Text>
        </View>
        <View style={styles.goal}>
          <Eyebrow>Daily goal</Eyebrow>
          <Text style={[type.heading, { color: colors.foreground }]}>{data.calorieGoal.toLocaleString()}</Text>
        </View>
      </View>
      <Card style={styles.ringCard}>
        <CalorieRing progress={progress} consumed={data.caloriesConsumed} color={colors.foreground} track={colors.muted} />
        <Text style={[type.body, { color: colors.mutedForeground, textAlign: 'center' }]}>
          {Math.max(0, data.calorieGoal - data.caloriesConsumed).toLocaleString()} calories remaining
        </Text>
      </Card>
      <Card style={styles.macroCard}>
        <Eyebrow>Macros</Eyebrow>
        <Macro label="Protein" consumed={data.proteinConsumed} goal={data.proteinGoal} />
        <Macro label="Carbs" consumed={data.carbsConsumed} goal={data.carbsGoal} />
        <Macro label="Fat" consumed={data.fatConsumed} goal={data.fatGoal} />
      </Card>
      <Card style={styles.form}>
        <Eyebrow>Add meal</Eyebrow>
        <TextInput value={name} onChangeText={setName} placeholder="Meal or food" placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.foreground, borderColor: colors.input }]} />
        <View style={styles.inputGrid}>
          <NumberInput label="Calories" value={calories} onChange={setCalories} />
          <NumberInput label="Protein (g)" value={protein} onChange={setProtein} />
          <NumberInput label="Carbs (g)" value={carbs} onChange={setCarbs} />
          <NumberInput label="Fat (g)" value={fat} onChange={setFat} />
        </View>
        {addMeal.isError ? <Text style={[type.muted, { color: colors.foreground }]}>Couldn’t add this meal. Check the values and try again.</Text> : null}
        <Button title="Add to today" icon="plus" loading={addMeal.isPending} disabled={!name.trim() || !calories} onPress={submit} />
      </Card>
      <View style={styles.log}>
        <Eyebrow>Today’s meals</Eyebrow>
        {data.meals.length ? data.meals.map((meal) => (
          <View key={meal.id} style={[styles.meal, { borderBottomColor: colors.border }]}>
            <View style={styles.flex}>
              <Text style={[type.body, { color: colors.foreground }]}>{meal.name}</Text>
              <Text style={[type.muted, { color: colors.mutedForeground }]}>{meal.calories} cal · P {meal.protein} · C {meal.carbs} · F {meal.fat}</Text>
            </View>
            <Pressable
              accessibilityLabel={`Delete ${meal.name}`}
              disabled={deleteMeal.isPending}
              onPress={() => deleteMeal.mutate({ date, mealId: meal.id }, { onSuccess: () => nutrition.refetch() })}
              hitSlop={12}
            >
              <Feather name="trash-2" size={17} color={colors.mutedForeground} />
            </Pressable>
          </View>
        )) : <Text style={[type.body, { color: colors.mutedForeground }]}>No meals logged yet.</Text>}
      </View>
    </Screen>
  );
}

function CalorieRing({ progress, consumed, color, track }: { progress: number; consumed: number; color: string; track: string }) {
  const radius = 74;
  const circumference = 2 * Math.PI * radius;
  return (
    <View style={styles.ring}>
      <Svg width={180} height={180} viewBox="0 0 180 180">
        <Circle cx="90" cy="90" r={radius} stroke={track} strokeWidth="12" fill="none" />
        <Circle cx="90" cy="90" r={radius} stroke={color} strokeWidth="12" fill="none" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - progress)} rotation="-90" origin="90, 90" />
      </Svg>
      <View style={styles.ringLabel}>
        <Text style={[type.metric, { color }]}>{consumed.toLocaleString()}</Text>
        <Text style={[type.muted, { color }]}>calories</Text>
      </View>
    </View>
  );
}

function Macro({ label, consumed, goal }: { label: string; consumed: number; goal: number }) {
  const colors = useColors();
  const percent = Math.min(100, consumed / Math.max(1, goal) * 100);
  return (
    <View style={styles.macro}>
      <View style={styles.macroHeader}><Text style={[type.body, { color: colors.foreground }]}>{label}</Text><Text style={[type.muted, { color: colors.mutedForeground }]}>{consumed} / {goal}g</Text></View>
      <View style={[styles.track, { backgroundColor: colors.muted }]}><View style={[styles.fill, { backgroundColor: colors.foreground, width: `${percent}%` }]} /></View>
    </View>
  );
}

function NumberInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const colors = useColors();
  return <TextInput value={value} onChangeText={onChange} keyboardType="decimal-pad" placeholder={label} placeholderTextColor={colors.mutedForeground} style={[styles.input, styles.gridInput, { color: colors.foreground, borderColor: colors.input }]} />;
}

const styles = StyleSheet.create({
  hero: { gap: 8, marginTop: 12 },
  summary: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
  goal: { alignItems: 'flex-end' },
  ringCard: { alignItems: 'center', gap: 5 },
  ring: { width: 180, height: 180, alignItems: 'center', justifyContent: 'center' },
  ringLabel: { position: 'absolute', alignItems: 'center' },
  macroCard: { gap: 17 },
  macro: { gap: 7 },
  macroHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  track: { height: 7, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  form: { gap: 12 },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, fontFamily: 'Inter_400Regular', fontSize: 15 },
  inputGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  gridInput: { width: '48%' },
  log: { gap: 10, paddingHorizontal: 3 },
  meal: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, gap: 12 },
  flex: { flex: 1 },
});