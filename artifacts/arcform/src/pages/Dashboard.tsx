import React, { useEffect, useState } from 'react';
import { getGetAthleteInviteCodeQueryKey, getGetTrainingDashboardQueryKey, getGetTrainingProfileQueryKey, useGenerateAthleteInviteCode, useGetAthleteInviteCode, useGetTrainingDashboard, useGetTrainingProfile, useSaveTrainingProfile } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import { Play, ArrowRight, Check, Copy, Link2, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQueryClient } from "@tanstack/react-query";

type Goal = 'strength' | 'hypertrophy' | 'general' | 'fat_loss';
type Lifestyle = 'sedentary' | 'active' | 'very_active';
type WeightUnit = 'lb' | 'kg';
type HeightUnit = 'in' | 'cm';
type Sex = 'male' | 'female';

function calculateBmr(
  ageValue: string,
  weightValue: string,
  weightUnit: WeightUnit,
  heightValue: string,
  heightUnit: HeightUnit,
  sex: Sex | '',
) {
  const age = Number(ageValue);
  const weight = Number(weightValue);
  const height = Number(heightValue);
  if (
    !sex
    || !Number.isFinite(age)
    || !Number.isFinite(weight)
    || !Number.isFinite(height)
    || age < 13
    || age > 100
    || weight <= 0
    || height <= 0
  ) return null;

  const weightKg = weightUnit === 'kg' ? weight : weight * 0.45359237;
  const weightLb = weightUnit === 'lb' ? weight : weight / 0.45359237;
  const heightCm = heightUnit === 'cm' ? height : height * 2.54;
  const heightIn = heightUnit === 'in' ? height : height / 2.54;

  const mifflin = sex === 'male'
    ? (10 * weightKg) + (6.25 * heightCm) - (5 * age) + 5
    : (10 * weightKg) + (6.25 * heightCm) - (5 * age) - 161;
  const harris = sex === 'male'
    ? 66 + (6.23 * weightLb) + (12.7 * heightIn) - (6.8 * age)
    : 655 + (4.35 * weightLb) + (4.7 * heightIn) - (4.7 * age);

  return {
    age,
    weight,
    height,
    bmrMifflin: Math.round(mifflin),
    bmrHarris: Math.round(harris),
  };
}

const goalOptions: { value: Goal; label: string; detail: string }[] = [
  { value: 'strength', label: 'Build strength', detail: 'Lift heavier with purpose' },
  { value: 'hypertrophy', label: 'Build muscle', detail: 'Grow with focused volume' },
  { value: 'general', label: 'Feel fitter', detail: 'Move well, stay consistent' },
  { value: 'fat_loss', label: 'Lose fat', detail: 'Train for sustainable change' },
];

const lifestyleOptions: { value: Lifestyle; label: string; detail: string }[] = [
  { value: 'sedentary', label: 'Mostly seated', detail: 'Desk-based or low daily movement' },
  { value: 'active', label: 'Generally active', detail: 'On your feet throughout the day' },
  { value: 'very_active', label: 'Highly active', detail: 'Physical work or sport outside training' },
];

export default function Dashboard() {
  const queryClient = useQueryClient();
  const { data: dashboard, isLoading: dashLoading } = useGetTrainingDashboard();
  const { data: profile } = useGetTrainingProfile();
  const saveProfile = useSaveTrainingProfile();
  const { data: inviteStatus } = useGetAthleteInviteCode({
    query: {
      queryKey: getGetAthleteInviteCodeQueryKey(),
      refetchInterval: 5000,
    },
  });
  const generateInvite = useGenerateAthleteInviteCode();
  const [profileOpen, setProfileOpen] = useState(false);
  const [goal, setGoal] = useState<Goal>('general');
  const [lifestyle, setLifestyle] = useState<Lifestyle>('active');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('lb');
  const [height, setHeight] = useState('');
  const [heightUnit, setHeightUnit] = useState<HeightUnit>('in');
  const [sex, setSex] = useState<Sex | ''>('');

  useEffect(() => {
    if (profile) {
      setGoal(profile.goal);
      setLifestyle(profile.lifestyle);
      setAge(profile.age?.toString() ?? '');
      setWeight(profile.weight?.toString() ?? '');
      setWeightUnit(profile.weightUnit ?? 'lb');
      setHeight(profile.height?.toString() ?? '');
      setHeightUnit(profile.heightUnit ?? 'in');
      setSex(profile.sex ?? '');
    }
  }, [profile]);

  const bmr = calculateBmr(age, weight, weightUnit, height, heightUnit, sex);

  const handleProfileSave = () => {
    if (!profile) return;
    saveProfile.mutate({
      data: {
        goal,
        lifestyle,
        experience: profile.experience,
        daysPerWeek: profile.daysPerWeek,
        equipment: profile.equipment,
        ...(bmr ? {
          age: bmr.age,
          weight: bmr.weight,
          weightUnit,
          height: bmr.height,
          heightUnit,
          sex: sex as Sex,
          bmrMifflin: bmr.bmrMifflin,
          bmrHarris: bmr.bmrHarris,
        } : {}),
      },
    }, {
      onSuccess: (saved) => {
        queryClient.setQueryData(getGetTrainingProfileQueryKey(), saved);
        queryClient.invalidateQueries({ queryKey: getGetTrainingDashboardQueryKey() });
        setProfileOpen(false);
      },
    });
  };

  const handleGenerateInvite = () => {
    generateInvite.mutate(undefined, {
      onSuccess: (result) => {
        queryClient.setQueryData(getGetAthleteInviteCodeQueryKey(), result);
      },
    });
  };

  if (dashLoading) {
    return (
      <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!dashboard) {
    return null;
  }

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-12 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-2 text-sm font-light">
            {profile?.goal.replace('_', ' ')} protocol active. {profile?.daysPerWeek} days/week.
          </p>
        </div>
        {dashboard.nextWorkout && (
          <Link href={`/workout/${dashboard.nextWorkout.id}`}>
            <button className="flex items-center justify-center gap-3 px-6 py-3 bg-foreground text-background font-medium hover:bg-foreground/90 transition-colors border border-foreground h-12 w-full md:w-auto">
              <Play className="w-4 h-4 fill-current" />
              Start Session
            </button>
          </Link>
        )}
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border shadow-none">
          <CardContent className="p-6">
            <div className="text-sm font-medium text-muted-foreground mb-3">Streak</div>
            <div className="text-4xl font-light tracking-tight">{dashboard.streak} <span className="text-lg text-muted-foreground font-light">days</span></div>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border shadow-none">
          <CardContent className="p-6">
            <div className="text-sm font-medium text-muted-foreground mb-3">This Week</div>
            <div className="text-4xl font-light tracking-tight">{dashboard.completedThisWeek}<span className="text-muted-foreground text-xl">/{dashboard.scheduledThisWeek}</span></div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-none col-span-2">
          <CardContent className="p-6">
            <div className="text-sm font-medium text-muted-foreground mb-3">Volume Delta</div>
            <div className="flex items-baseline gap-4">
              <div className="text-4xl font-light tracking-tight text-foreground">
                {dashboard.volumeChange > 0 ? '+' : ''}{dashboard.volumeChange}%
              </div>
              <p className="text-sm text-muted-foreground font-light">vs previous microcycle</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <section className="space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl tracking-tight">Your profile</h2>
            <p className="mt-1 text-sm font-light text-muted-foreground">
              Keep your coaching matched to your life and goals.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setProfileOpen((open) => !open)}
            className="gap-2 normal-case tracking-normal"
          >
            <Settings2 className="h-4 w-4" />
            {profileOpen ? 'Close' : 'Manage'}
          </Button>
        </div>

        <Card className="border-border bg-card shadow-none">
          <CardContent className="p-6 md:p-8">
            {!profileOpen ? (
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-light text-muted-foreground">Fitness goal</p>
                  <p className="mt-2 text-lg">
                    {goalOptions.find((option) => option.value === profile?.goal)?.label ?? 'Not set'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-light text-muted-foreground">Lifestyle</p>
                  <p className="mt-2 text-lg">
                    {lifestyleOptions.find((option) => option.value === profile?.lifestyle)?.label ?? 'Not set'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-light text-muted-foreground">BMR · Mifflin–St Jeor</p>
                  <p className="mt-2 text-lg">
                    {profile?.bmrMifflin ? `${profile.bmrMifflin.toLocaleString()} kcal / day` : 'Not calculated'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-light text-muted-foreground">BMR · Harris–Benedict</p>
                  <p className="mt-2 text-lg">
                    {profile?.bmrHarris ? `${profile.bmrHarris.toLocaleString()} kcal / day` : 'Not calculated'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-light text-muted-foreground">Coach calorie target</p>
                  <p className="mt-2 text-lg">{dashboard.calorieGoal.toLocaleString()} kcal</p>
                </div>
                <div>
                  <p className="text-xs font-light text-muted-foreground">Coach volume target</p>
                  <p className="mt-2 text-lg">{dashboard.weeklyVolumeGoal} sets / week</p>
                </div>
              </div>
            ) : (
              <div className="space-y-9">
                <fieldset>
                  <legend className="text-base">What are you working toward?</legend>
                  <p className="mt-1 text-sm font-light text-muted-foreground">
                    Choose the result you want your plan to prioritize.
                  </p>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {goalOptions.map((option) => {
                      const selected = goal === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setGoal(option.value)}
                          aria-pressed={selected}
                          className={`flex min-h-24 items-start justify-between gap-4 border p-4 text-left transition-colors ${
                            selected
                              ? 'border-foreground bg-foreground text-background'
                              : 'border-border bg-background hover:border-muted-foreground'
                          }`}
                        >
                          <span>
                            <span className="block text-sm font-medium">{option.label}</span>
                            <span className={`mt-1 block text-xs font-light ${selected ? 'text-background/70' : 'text-muted-foreground'}`}>
                              {option.detail}
                            </span>
                          </span>
                          {selected && <Check className="h-4 w-4 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>

                <fieldset>
                  <legend className="text-base">What does daily life look like?</legend>
                  <p className="mt-1 text-sm font-light text-muted-foreground">
                    This helps Arcform balance training stress and recovery.
                  </p>
                  <div className="mt-5 grid gap-3 md:grid-cols-3">
                    {lifestyleOptions.map((option) => {
                      const selected = lifestyle === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setLifestyle(option.value)}
                          aria-pressed={selected}
                          className={`flex min-h-28 items-start justify-between gap-3 border p-4 text-left transition-colors ${
                            selected
                              ? 'border-foreground bg-foreground text-background'
                              : 'border-border bg-background hover:border-muted-foreground'
                          }`}
                        >
                          <span>
                            <span className="block text-sm font-medium">{option.label}</span>
                            <span className={`mt-1 block text-xs font-light leading-relaxed ${selected ? 'text-background/70' : 'text-muted-foreground'}`}>
                              {option.detail}
                            </span>
                          </span>
                          {selected && <Check className="h-4 w-4 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>

                <fieldset className="space-y-5">
                  <div>
                    <legend className="text-base">Basal metabolic rate</legend>
                    <p className="mt-1 text-sm font-light text-muted-foreground">
                      Enter your measurements to estimate the calories your body uses at rest.
                    </p>
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="profile-age">Age</Label>
                      <Input
                        id="profile-age"
                        type="number"
                        inputMode="numeric"
                        min={13}
                        max={100}
                        value={age}
                        onChange={(event) => setAge(event.target.value)}
                        placeholder="30"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="profile-sex">Sex</Label>
                      <select
                        id="profile-sex"
                        value={sex}
                        onChange={(event) => setSex(event.target.value as Sex | '')}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                      >
                        <option value="">Select</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                      </select>
                    </div>
                    <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                      <Label htmlFor="profile-weight">Weight</Label>
                      <div className="flex gap-2">
                        <Input
                          id="profile-weight"
                          type="number"
                          inputMode="decimal"
                          min="1"
                          step="0.1"
                          value={weight}
                          onChange={(event) => setWeight(event.target.value)}
                          placeholder={weightUnit === 'lb' ? '165' : '75'}
                        />
                        <select
                          aria-label="Weight unit"
                          value={weightUnit}
                          onChange={(event) => setWeightUnit(event.target.value as WeightUnit)}
                          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                        >
                          <option value="lb">lb</option>
                          <option value="kg">kg</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                      <Label htmlFor="profile-height">Height</Label>
                      <div className="flex gap-2">
                        <Input
                          id="profile-height"
                          type="number"
                          inputMode="decimal"
                          min="1"
                          step="0.1"
                          value={height}
                          onChange={(event) => setHeight(event.target.value)}
                          placeholder={heightUnit === 'in' ? '70' : '178'}
                        />
                        <select
                          aria-label="Height unit"
                          value={heightUnit}
                          onChange={(event) => setHeightUnit(event.target.value as HeightUnit)}
                          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                        >
                          <option value="in">in</option>
                          <option value="cm">cm</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-border bg-background p-4">
                      <p className="text-xs text-muted-foreground">Mifflin–St Jeor estimate</p>
                      <p className="mt-2 text-2xl font-light">
                        {bmr ? `${bmr.bmrMifflin.toLocaleString()} kcal` : '—'}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">per day at rest</p>
                    </div>
                    <div className="rounded-xl border border-border bg-background p-4">
                      <p className="text-xs text-muted-foreground">Harris–Benedict estimate</p>
                      <p className="mt-2 text-2xl font-light">
                        {bmr ? `${bmr.bmrHarris.toLocaleString()} kcal` : '—'}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">per day at rest</p>
                    </div>
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    BMR is an estimate of resting energy use, not a daily calorie target.
                  </p>
                </fieldset>

                <div className="flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      if (profile) {
                        setGoal(profile.goal);
                        setLifestyle(profile.lifestyle);
                         setAge(profile.age?.toString() ?? '');
                         setWeight(profile.weight?.toString() ?? '');
                         setWeightUnit(profile.weightUnit ?? 'lb');
                         setHeight(profile.height?.toString() ?? '');
                         setHeightUnit(profile.heightUnit ?? 'in');
                         setSex(profile.sex ?? '');
                      }
                      setProfileOpen(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleProfileSave}
                    disabled={!profile || saveProfile.isPending}
                    className="normal-case tracking-normal"
                  >
                    {saveProfile.isPending ? 'Saving profile…' : 'Save profile'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-5">
        <div>
            <h2 className="text-xl tracking-tight">Link to Your Trainer</h2>
          <p className="mt-1 text-sm font-light text-muted-foreground">
            Only a trainer with your six-digit invite code can add you to their roster.
          </p>
        </div>
        <Card className="border-border bg-card shadow-none">
          <CardContent className="p-6 md:p-8">
            {inviteStatus?.linked ? (
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-full border border-border">
                  <Link2 className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-medium">Linked to {inviteStatus.trainerName}</p>
                  <p className="mt-1 text-sm font-light text-muted-foreground">
                    Your trainer can now review progress and update your program.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-light text-muted-foreground">Your one-time invite code</p>
                  {inviteStatus?.code ? (
                    <p className="mt-2 font-mono text-4xl font-light tracking-[0.2em]">{inviteStatus.code}</p>
                  ) : (
                    <p className="mt-2 text-lg font-light">No active code</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-3">
                  {inviteStatus?.code && (
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-2 normal-case tracking-normal"
                      onClick={() => navigator.clipboard.writeText(inviteStatus.code ?? "")}
                    >
                      <Copy className="h-4 w-4" />
                      Copy code
                    </Button>
                  )}
                  <Button
                    type="button"
                    onClick={handleGenerateInvite}
                    disabled={generateInvite.isPending}
                    className="normal-case tracking-normal"
                  >
                    {generateInvite.isPending
                      ? 'Generating…'
                      : inviteStatus?.code
                        ? 'Generate new code'
                        : 'Generate invite code'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Next Workout */}
        {dashboard.nextWorkout && (
          <div className="space-y-6">
            <h2 className="text-xl font-medium tracking-tight flex items-center gap-2">
              Next Session <ArrowRight className="w-4 h-4 text-muted-foreground" />
            </h2>
            <Card className="border-border bg-card shadow-none">
              <CardContent className="p-8">
                <div className="text-sm text-muted-foreground mb-2 font-medium">{dashboard.nextWorkout.day}</div>
                <h3 className="text-2xl font-semibold tracking-tight mb-2">{dashboard.nextWorkout.title}</h3>
                <p className="text-muted-foreground mb-8 text-sm font-light">Focus: {dashboard.nextWorkout.focus} • {dashboard.nextWorkout.duration} min</p>
                
                <div className="space-y-4">
                  {dashboard.nextWorkout.exercises.slice(0, 4).map((ex) => (
                    <div key={ex.id} className="flex justify-between items-center text-sm border-b border-border pb-3 last:border-0 last:pb-0">
                      <span className="font-medium">{ex.name}</span>
                      <span className="text-muted-foreground font-light">{ex.sets} × {ex.reps}</span>
                    </div>
                  ))}
                  {dashboard.nextWorkout.exercises.length > 4 && (
                    <div className="text-sm text-muted-foreground font-light pt-2">
                      + {dashboard.nextWorkout.exercises.length - 4} additional
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Recent History */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-medium tracking-tight">History</h2>
            <Link href="/history" className="text-sm text-foreground hover:text-muted-foreground transition-colors font-medium">View All</Link>
          </div>
          <div className="space-y-4">
            {dashboard.history.slice(0, 4).map((item) => (
              <Card key={item.id} className="bg-card border-border shadow-none hover:bg-secondary/50 transition-colors">
                <CardContent className="p-5 flex justify-between items-center">
                  <div>
                    <h4 className="font-medium">{item.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1 font-light">{item.date} • {item.duration}m</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">{item.totalSets} Sets</div>
                    <div className="text-sm text-muted-foreground font-light">RPE {item.avgRpe.toFixed(1)}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {dashboard.history.length === 0 && (
              <div className="text-center p-12 border border-border border-dashed text-muted-foreground text-sm font-light">
                No history available.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
