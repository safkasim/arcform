import { Router, type IRouter, type Request, type Response } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { db, trainingPortalStateTable, appUsersTable, type AppUser } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { trainingGuideReference } from "../knowledge/trainingGuide";
import { requireAppUser, requireRole } from "../lib/auth";

const router: IRouter = Router();

type Profile = {
  goal: "strength" | "hypertrophy" | "general" | "fat_loss";
  lifestyle: "sedentary" | "active" | "very_active";
  experience: "beginner" | "intermediate" | "advanced";
  daysPerWeek: number;
  equipment: "full_gym" | "home_gym" | "bodyweight";
  age?: number;
  weight?: number;
  weightUnit?: "lb" | "kg";
  height?: number;
  heightUnit?: "in" | "cm";
  sex?: "male" | "female";
  bmrMifflin?: number;
  bmrHarris?: number;
};

type Exercise = {
  id: string; name: string; sets: number; reps: string;
  targetWeight: string; targetRpe: number;
};
type Workout = {
  id: string; day: string; title: string; focus: string;
  duration: number; status: "upcoming" | "completed"; exercises: Exercise[];
};
type Plan = {
  name: string; week: number; totalWeeks: number;
  rationale: string; workouts: Workout[];
};

type ClientUpdate = {
  id: string;
  date: string;
  message: string;
  type: "coach" | "progress" | "nutrition" | "programming";
};

type NutritionMeal = {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

type NutritionDay = {
  meals: NutritionMeal[];
};

type NutritionByDate = Record<string, NutritionDay>;

type TrainerClient = {
  id: string;
  clerkUserId?: string;
  name: string;
  email: string;
  goal: string;
  status: "on_track" | "attention" | "new";
  lastCheckIn: string;
  progressScore: number;
  adherence: number;
  streak: number;
  calorieGoal: number;
  weeklyVolumeGoal: number;
  workoutSplit: string;
  workouts: Workout[];
  updates: ClientUpdate[];
  inviteCode: string | null;
  linkedTrainerId: string | null;
};

const initialProfile: Profile & { complete: boolean } = {
  goal: "strength", experience: "intermediate", daysPerWeek: 4,
  equipment: "full_gym", lifestyle: "active", complete: false,
};

const initialPlan: Plan = {
  name: "Strength Foundation",
  week: 1,
  totalWeeks: 6,
  rationale: "A balanced four-day strength block built around repeatable compound patterns and recoverable volume.",
  workouts: [
    { id: "w1", day: "MON", title: "Lower Strength", focus: "Squat / posterior chain", duration: 62, status: "upcoming", exercises: [
      { id: "e1", name: "Back Squat", sets: 4, reps: "5", targetWeight: "185 lb", targetRpe: 7.5 },
      { id: "e2", name: "Romanian Deadlift", sets: 3, reps: "8", targetWeight: "135 lb", targetRpe: 7 },
      { id: "e3", name: "Walking Lunge", sets: 3, reps: "10 / side", targetWeight: "30 lb", targetRpe: 8 },
    ]},
    { id: "w2", day: "TUE", title: "Upper Strength", focus: "Press / pull", duration: 58, status: "upcoming", exercises: [
      { id: "e4", name: "Bench Press", sets: 4, reps: "5", targetWeight: "145 lb", targetRpe: 7.5 },
      { id: "e5", name: "Chest-Supported Row", sets: 4, reps: "8", targetWeight: "55 lb", targetRpe: 8 },
      { id: "e6", name: "Half-Kneeling Press", sets: 3, reps: "10", targetWeight: "30 lb", targetRpe: 7 },
    ]},
    { id: "w3", day: "THU", title: "Lower Volume", focus: "Hinge / unilateral", duration: 55, status: "upcoming", exercises: [
      { id: "e7", name: "Trap Bar Deadlift", sets: 3, reps: "6", targetWeight: "205 lb", targetRpe: 8 },
      { id: "e8", name: "Front-Foot Elevated Split Squat", sets: 3, reps: "10 / side", targetWeight: "25 lb", targetRpe: 8 },
    ]},
    { id: "w4", day: "SAT", title: "Upper Volume", focus: "Shoulders / back", duration: 52, status: "upcoming", exercises: [
      { id: "e9", name: "Incline Dumbbell Press", sets: 4, reps: "8", targetWeight: "45 lb", targetRpe: 8 },
      { id: "e10", name: "Lat Pulldown", sets: 4, reps: "10", targetWeight: "110 lb", targetRpe: 8 },
    ]},
  ],
};

const history = [
  { id: "h1", title: "Upper Strength", date: "SEP 10", duration: 54, totalSets: 15, avgRpe: 7.6 },
  { id: "h2", title: "Lower Strength", date: "SEP 8", duration: 61, totalSets: 14, avgRpe: 7.4 },
];

const copyWorkouts = () => initialPlan.workouts.map((workout) => ({
  ...workout,
  status: "upcoming" as const,
  exercises: workout.exercises.map((exercise) => ({ ...exercise })),
}));

const cloneWorkouts = (workouts: Workout[]) => workouts.map((workout) => ({
  ...workout,
  exercises: workout.exercises.map((exercise) => ({ ...exercise })),
}));

const refreshProgressScore = (client: TrainerClient) => {
  const streakScore = Math.min(client.streak * 10, 100);
  client.progressScore = Math.round((client.adherence * 0.8) + (streakScore * 0.2));
  client.status = client.adherence === 0 ? "new" : client.progressScore >= 75 ? "on_track" : "attention";
  return client;
};

const publicClient = (client: TrainerClient) => {
  refreshProgressScore(client);
  const { inviteCode: _inviteCode, linkedTrainerId: _linkedTrainerId, ...visibleClient } = client;
  return visibleClient;
};

const createUniqueInviteCode = (clients: Array<Pick<TrainerClient, "inviteCode">>) => {
  let code = "";
  do {
    code = String(Math.floor(100000 + Math.random() * 900000));
  } while (clients.some((client) => client.inviteCode === code));
  return code;
};

const calculateProfileBmr = (profile: Profile) => {
  const { age, weight, weightUnit, height, heightUnit, sex } = profile;
  if (
    age === undefined
    || weight === undefined
    || height === undefined
    || !weightUnit
    || !heightUnit
    || !sex
    || age < 13
    || age > 100
    || weight <= 0
    || height <= 0
  ) return {};

  const weightKg = weightUnit === "kg" ? weight : weight * 0.45359237;
  const weightLb = weightUnit === "lb" ? weight : weight / 0.45359237;
  const heightCm = heightUnit === "cm" ? height : height * 2.54;
  const heightIn = heightUnit === "in" ? height : height / 2.54;
  const bmrMifflin = sex === "male"
    ? (10 * weightKg) + (6.25 * heightCm) - (5 * age) + 5
    : (10 * weightKg) + (6.25 * heightCm) - (5 * age) - 161;
  const bmrHarris = sex === "male"
    ? 66 + (6.23 * weightLb) + (12.7 * heightIn) - (6.8 * age)
    : 655 + (4.35 * weightLb) + (4.7 * heightIn) - (4.7 * age);

  return {
    bmrMifflin: Math.round(bmrMifflin),
    bmrHarris: Math.round(bmrHarris),
  };
};

const isWorkoutList = (value: unknown): value is Workout[] => {
  if (!Array.isArray(value) || value.length === 0) return false;
  const workoutIds = new Set<string>();
  const exerciseIds = new Set<string>();
  return value.every((workout) => {
    if (!workout || typeof workout !== "object") return false;
    const candidate = workout as Partial<Workout>;
    if (
      typeof candidate.id !== "string"
      || !candidate.id.trim()
      || workoutIds.has(candidate.id)
    ) return false;
    workoutIds.add(candidate.id);
    return (
      typeof candidate.day === "string" &&
      Boolean(candidate.day.trim()) &&
      typeof candidate.title === "string" &&
      Boolean(candidate.title.trim()) &&
      typeof candidate.focus === "string" &&
      Boolean(candidate.focus.trim()) &&
      Number.isInteger(candidate.duration) &&
      Number(candidate.duration) > 0 &&
      (candidate.status === "upcoming" || candidate.status === "completed") &&
      Array.isArray(candidate.exercises) &&
      candidate.exercises.every((exercise) => {
        if (
          !exercise
          || typeof exercise.id !== "string"
          || !exercise.id.trim()
          || exerciseIds.has(exercise.id)
        ) return false;
        exerciseIds.add(exercise.id);
        return (
          typeof exercise.name === "string" &&
          Boolean(exercise.name.trim()) &&
          Number.isInteger(exercise.sets) &&
          exercise.sets > 0 &&
          typeof exercise.reps === "string" &&
          Boolean(exercise.reps.trim()) &&
          typeof exercise.targetWeight === "string" &&
          Boolean(exercise.targetWeight.trim()) &&
          typeof exercise.targetRpe === "number" &&
          exercise.targetRpe >= 1 &&
          exercise.targetRpe <= 10
        );
      })
    );
  });
};

const initialTrainerClients: TrainerClient[] = [
  {
    id: "client-maya",
    name: "Maya Chen",
    email: "maya@arcform.fit",
    goal: "Build strength",
    status: "on_track",
    lastCheckIn: "Today",
    progressScore: 92,
    adherence: 96,
    streak: 11,
    calorieGoal: 2350,
    weeklyVolumeGoal: 58,
    workoutSplit: "Upper / Lower · 4 days",
    workouts: copyWorkouts(),
    updates: [
      { id: "update-maya-1", date: "Today", type: "progress", message: "Completed all four sessions and added 5 lb to the working squat sets." },
      { id: "update-maya-2", date: "Sep 11", type: "coach", message: "Recovery is strong. Keep lower-body volume unchanged this week." },
    ],
    inviteCode: null,
    linkedTrainerId: null,
  },
  {
    id: "client-jordan",
    name: "Jordan Ellis",
    email: "jordan@arcform.fit",
    goal: "Build muscle",
    status: "attention",
    lastCheckIn: "2 days ago",
    progressScore: 68,
    adherence: 71,
    streak: 3,
    calorieGoal: 2800,
    weeklyVolumeGoal: 72,
    workoutSplit: "Push / Pull / Legs · 5 days",
    workouts: copyWorkouts(),
    updates: [
      { id: "update-jordan-1", date: "2 days ago", type: "progress", message: "Missed the final session after reporting poor sleep and elevated fatigue." },
    ],
    inviteCode: null,
    linkedTrainerId: null,
  },
  {
    id: "client-sofia",
    name: "Sofia Ramirez",
    email: "sofia@arcform.fit",
    goal: "Lose fat",
    status: "on_track",
    lastCheckIn: "Yesterday",
    progressScore: 84,
    adherence: 88,
    streak: 7,
    calorieGoal: 1950,
    weeklyVolumeGoal: 46,
    workoutSplit: "Full body · 3 days",
    workouts: copyWorkouts().slice(0, 3),
    updates: [
      { id: "update-sofia-1", date: "Yesterday", type: "nutrition", message: "Weekly average intake is within 2% of target and bodyweight is trending steadily." },
    ],
    inviteCode: null,
    linkedTrainerId: null,
  },
];

type PortalState = {
  clerkUserId: string;
  profile: Profile & { complete: boolean };
  plan: Plan;
  trainerClients: TrainerClient[];
  history: typeof history;
  nutrition: NutritionByDate;
};

const cloneState = (user: Pick<AppUser, "clerkUserId" | "name" | "email">): PortalState => ({
  clerkUserId: user.clerkUserId,
  profile: { ...initialProfile },
  plan: { ...initialPlan, workouts: cloneWorkouts(initialPlan.workouts) },
  trainerClients: [{
    ...initialTrainerClients[0],
    id: `client-${user.clerkUserId}`,
    clerkUserId: user.clerkUserId,
    name: user.name,
    email: user.email,
    status: "new",
    lastCheckIn: "Never",
    progressScore: 0,
    adherence: 0,
    streak: 0,
    workouts: copyWorkouts(),
    updates: [],
    inviteCode: null,
    linkedTrainerId: null,
  }],
  history: history.map((item) => ({ ...item })),
  nutrition: {},
});

const getCurrentUser = (req: Request): AppUser => {
  if (!req.appUser) throw new Error("authenticated-user-not-found");
  return req.appUser;
};

const stateFromRow = (row: typeof trainingPortalStateTable.$inferSelect): PortalState => ({
  clerkUserId: row.clerkUserId,
  profile: row.profile as PortalState["profile"],
  plan: row.plan as Plan,
  trainerClients: row.trainerClients as TrainerClient[],
  history: row.history as PortalState["history"],
  nutrition: (row.nutrition ?? {}) as NutritionByDate,
});
const athleteFromState = (state: PortalState) => state.trainerClients[0];

async function readState(user: Pick<AppUser, "clerkUserId" | "name" | "email">): Promise<PortalState> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${user.clerkUserId}))`);
    const [existing] = await tx.select().from(trainingPortalStateTable)
      .where(eq(trainingPortalStateTable.clerkUserId, user.clerkUserId));
    if (existing) return stateFromRow(existing);

    const seeded = cloneState(user);
    const [created] = await tx.insert(trainingPortalStateTable).values({
      clerkUserId: user.clerkUserId,
      profile: seeded.profile,
      plan: seeded.plan,
      trainerClients: seeded.trainerClients,
      history: seeded.history,
      nutrition: seeded.nutrition,
    }).returning();
    return stateFromRow(created);
  });
}

async function mutateState(
  user: Pick<AppUser, "clerkUserId" | "name" | "email">,
  update: (state: PortalState) => void,
): Promise<PortalState> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${user.clerkUserId}))`);
    let [row] = await tx.select().from(trainingPortalStateTable)
      .where(eq(trainingPortalStateTable.clerkUserId, user.clerkUserId));
    if (!row) {
      const seeded = cloneState(user);
      [row] = await tx.insert(trainingPortalStateTable).values({
        clerkUserId: user.clerkUserId,
        profile: seeded.profile,
        plan: seeded.plan,
        trainerClients: seeded.trainerClients,
        history: seeded.history,
        nutrition: seeded.nutrition,
      }).returning();
    }
    const state = stateFromRow(row);
    update(state);
    await tx.update(trainingPortalStateTable).set({
      profile: state.profile,
      plan: state.plan,
      trainerClients: state.trainerClients,
      history: state.history,
      nutrition: state.nutrition,
      updatedAt: new Date(),
    }).where(eq(trainingPortalStateTable.clerkUserId, user.clerkUserId));
    return state;
  });
}

async function readAllStates(): Promise<PortalState[]> {
  const rows = await db.select().from(trainingPortalStateTable);
  return rows.map(stateFromRow);
}

async function mutateAllStates(update: (states: PortalState[]) => void): Promise<PortalState[]> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(8142026)`);
    const snapshot = await tx.select({ clerkUserId: trainingPortalStateTable.clerkUserId })
      .from(trainingPortalStateTable);
    const userIds = snapshot.map((row) => row.clerkUserId).sort();
    for (const userId of userIds) {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${userId}))`);
    }
    const rows = await tx.select().from(trainingPortalStateTable);
    const states = rows.map(stateFromRow);
    update(states);
    for (const state of states) {
      await tx.update(trainingPortalStateTable).set({
        profile: state.profile,
        plan: state.plan,
        trainerClients: state.trainerClients,
        history: state.history,
        nutrition: state.nutrition,
        updatedAt: new Date(),
      }).where(eq(trainingPortalStateTable.clerkUserId, state.clerkUserId));
    }
    return states;
  });
}

async function askCoach(system: string, user: string) {
  const response = await openai.chat.completions.create({
    model: "gpt-5.6-terra",
    max_completion_tokens: 8192,
    messages: [{ role: "system", content: system }, { role: "user", content: user }],
  });
  return response.choices[0]?.message?.content?.trim() ?? "";
}

const coachSystemPrompt = `You are Arcform's evidence-informed AI gym coach. Respond like an experienced personal trainer speaking naturally to an athlete of any experience level.

Match this response style:
- Open with a direct answer to the athlete's actual question. Do not start with a greeting, a heading, "Protocol," or a generic disclaimer.
- Write 3-5 short, connected paragraphs in natural prose. A typical answer should first answer the question, then explain why, give practical actions or examples, and finish with an important caveat only when one is relevant.
- Keep ordinary answers around 130-230 words. Use enough detail to be useful without turning the response into an article.
- Use clear everyday language. When a useful technical term appears, define it immediately in plain language.
- Give concrete next steps: a physical cue, exercise substitution, rep or load adjustment, recovery target, or simple way to evaluate whether the change is working.
- When a useful range or benchmark is well established, state it plainly while making clear that individual needs vary.
- Sound calm, practical, and reassuring. Validate common concerns without exaggerating, praising unsupported progress, or being overly motivational.

Do not use markdown headings, bullet points, numbered lists, tables, labels, or canned response sections. Do not repeat the athlete's question. Never invent workout metrics, progress, symptoms, form problems, or personal details that are not present in the athlete's message, profile, or current plan. Use profile and plan details only when they genuinely improve the answer.

For pain or injury concerns, do not diagnose. Distinguish common discomfort or soreness from warning signs, suggest conservative training modifications when appropriate, and recommend a qualified medical professional for sharp, severe, worsening, persistent, radiating, unstable, or otherwise concerning symptoms.

For progress questions, compare only against supplied facts. For workout summaries, include only supplied totals such as exercises, duration, calories, rest time, volume, or adherence. A comprehensive workout review may be up to 350 words.

Use the following training reference as grounded coaching guidance. Apply only the parts relevant to the athlete's question. If the reference conflicts with the athlete's safety, current medical guidance, or the instruction not to diagnose, choose the safer response. Do not mention the reference document unless the athlete asks about sources.

${trainingGuideReference}`;

const isDateKey = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
};

const nutritionGoals = (calorieGoal: number) => ({
  calorieGoal,
  proteinGoal: Math.round((calorieGoal * 0.3) / 4),
  carbsGoal: Math.round((calorieGoal * 0.4) / 4),
  fatGoal: Math.round((calorieGoal * 0.3) / 9),
});

const dailyNutrition = (date: string, nutrition: NutritionDay | undefined, calorieGoal: number) => {
  const meals = nutrition?.meals ?? [];
  const totals = meals.reduce((sum, meal) => ({
    caloriesConsumed: sum.caloriesConsumed + meal.calories,
    proteinConsumed: sum.proteinConsumed + meal.protein,
    carbsConsumed: sum.carbsConsumed + meal.carbs,
    fatConsumed: sum.fatConsumed + meal.fat,
  }), {
    caloriesConsumed: 0,
    proteinConsumed: 0,
    carbsConsumed: 0,
    fatConsumed: 0,
  });
  return { date, ...nutritionGoals(calorieGoal), ...totals, meals };
};

const parseNutritionMeal = (value: unknown): Omit<NutritionMeal, "id"> | null => {
  if (!value || typeof value !== "object") return null;
  const meal = value as Record<string, unknown>;
  if (
    typeof meal.name !== "string"
    || !meal.name.trim()
    || !Number.isInteger(meal.calories)
    || Number(meal.calories) < 0
    || typeof meal.protein !== "number"
    || !Number.isFinite(meal.protein)
    || meal.protein < 0
    || typeof meal.carbs !== "number"
    || !Number.isFinite(meal.carbs)
    || meal.carbs < 0
    || typeof meal.fat !== "number"
    || !Number.isFinite(meal.fat)
    || meal.fat < 0
  ) return null;
  return {
    name: meal.name.trim(),
    calories: Number(meal.calories),
    protein: meal.protein,
    carbs: meal.carbs,
    fat: meal.fat,
  };
};

router.use(requireAppUser);
router.use("/training", requireRole("athlete"));
router.use("/trainer", requireRole("trainer"));

router.get("/training/profile", async (req, res, next) => {
  try { res.json((await readState(getCurrentUser(req))).profile); } catch (error) { next(error); }
});
router.post("/training/profile", async (req, res, next) => {
  try {
    const incomingProfile = req.body as Profile;
    const state = await mutateState(getCurrentUser(req), (current) => {
      current.profile = {
        ...incomingProfile,
        ...calculateProfileBmr(incomingProfile),
        complete: true,
      } as PortalState["profile"];
    });
    res.json(state.profile);
  } catch (error) { next(error); }
});

router.get("/training/plan", async (req, res, next) => {
  try { res.json((await readState(getCurrentUser(req))).plan); } catch (error) { next(error); }
});
router.post("/training/plan", async (req, res, next) => {
  try {
    const p = req.body.profile as Profile;
    const content = await askCoach(
      "You are Arcform, an expert evidence-informed strength coach. Return only valid JSON matching: {name:string,week:1,totalWeeks:number,rationale:string,workouts:[{id:string,day:string,title:string,focus:string,duration:number,status:'upcoming',exercises:[{id:string,name:string,sets:number,reps:string,targetWeight:string,targetRpe:number}]}]}. Create one week with the requested number of sessions. Be conservative with unknown starting weights: use 'RPE-based' as targetWeight.",
      `Create a multi-week plan for this athlete: ${JSON.stringify(p)}`,
    );
    const clean = content.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
    const generatedPlan = JSON.parse(clean) as Plan;
    const state = await mutateState(getCurrentUser(req), (current) => {
      current.plan = generatedPlan;
      current.profile = { ...p, complete: true };
      const athleteRecord = athleteFromState(current);
      if (athleteRecord) {
        athleteRecord.workouts = cloneWorkouts(generatedPlan.workouts);
        athleteRecord.adherence = Math.round(
          (athleteRecord.workouts.filter((workout) => workout.status === "completed").length /
            Math.max(athleteRecord.workouts.length, 1)) * 100,
        );
        athleteRecord.updates = [{
          id: `update-${Date.now()}`,
          date: "Today",
          type: "programming",
          message: `The athlete generated a new ${generatedPlan.totalWeeks}-week plan. Trainer programming has been synchronized.`,
        }, ...athleteRecord.updates];
        refreshProgressScore(athleteRecord);
      }
    });
    res.json(state.plan);
  } catch (error) { next(error); }
});

router.get("/training/dashboard", async (req, res, next) => {
  try {
    const snapshot = await readState(getCurrentUser(req));
    const { plan } = snapshot;
    const nextWorkout = plan.workouts.find((w) => w.status === "upcoming") ?? plan.workouts[0];
    const athleteRecord = athleteFromState(snapshot);
    res.json({
      streak: athleteRecord?.streak ?? 6,
      completedThisWeek: plan.workouts.filter((w) => w.status === "completed").length,
      scheduledThisWeek: plan.workouts.length,
      volumeChange: 8.4,
      calorieGoal: athleteRecord?.calorieGoal ?? 2350,
      weeklyVolumeGoal: athleteRecord?.weeklyVolumeGoal ?? 58,
      nextWorkout,
      history: snapshot.history,
    });
  } catch (error) { next(error); }
});

router.post("/training/chat", async (req, res, next) => {
  try {
    const message = String(req.body.message ?? "");
    const { profile, plan } = await readState(getCurrentUser(req));
    const reply = await askCoach(
      coachSystemPrompt,
      `Athlete profile: ${JSON.stringify(profile)}\nCurrent plan: ${JSON.stringify(plan)}\nQuestion: ${message}`,
    );
    res.json({ message: reply, adjusted: /swap|replace|reduce|increase|change|instead/i.test(reply) });
  } catch (error) { next(error); }
});

router.post("/training/workouts/:workoutId/log", async (req, res, next) => {
  try {
    const snapshot = await readState(getCurrentUser(req));
    const workout = snapshot.plan.workouts.find((w) => w.id === req.params.workoutId);
    if (!workout) {
      res.status(404).json({ error: "Workout not found" });
      return;
    }
    const adaptation = await askCoach(
      "You are Arcform's adaptive programming engine. Review planned versus completed sets and RPE. Give one short, plain-language explanation of the next-session adjustment. Mention a specific exercise and exact change. Keep it under 45 words.",
      `Profile: ${JSON.stringify(snapshot.profile)}\nWorkout: ${JSON.stringify(workout)}\nLog: ${JSON.stringify(req.body)}`,
    );
    await mutateState(getCurrentUser(req), (current) => {
      const currentWorkout = current.plan.workouts.find((item) => item.id === workout.id);
      if (currentWorkout) currentWorkout.status = "completed";
      current.history = [{
        id: `history-${Date.now()}`,
        title: workout.title,
        date: "Today",
        duration: workout.duration,
        totalSets: workout.exercises.reduce((total, exercise) => total + exercise.sets, 0),
        avgRpe: workout.exercises.reduce((total, exercise) => total + exercise.targetRpe, 0) /
          Math.max(workout.exercises.length, 1),
      }, ...current.history.filter((item) => item.title !== workout.title)];
      const athleteRecord = athleteFromState(current);
      if (athleteRecord) {
        const clientWorkout = athleteRecord.workouts.find((item) => item.id === workout.id);
        if (clientWorkout) clientWorkout.status = "completed";
        const completed = athleteRecord.workouts.filter((item) => item.status === "completed").length;
        athleteRecord.adherence = Math.round((completed / Math.max(athleteRecord.workouts.length, 1)) * 100);
        athleteRecord.streak += 1;
        athleteRecord.lastCheckIn = "Today";
        athleteRecord.updates = [{
          id: `update-${Date.now()}`,
          date: "Today",
          type: "progress",
          message: `${workout.title} completed in the athlete app. Adherence and progress score were recalculated.`,
        }, ...athleteRecord.updates];
        refreshProgressScore(athleteRecord);
      }
    });
    res.json({ success: true, adaptation });
  } catch (error) { next(error); }
});

router.get("/training/nutrition/:date", async (req, res, next) => {
  const { date } = req.params;
  if (!isDateKey(date)) {
    res.status(400).json({ error: "Date must be a valid YYYY-MM-DD date." });
    return;
  }
  try {
    const state = await readState(getCurrentUser(req));
    const athlete = athleteFromState(state);
    res.json(dailyNutrition(date, state.nutrition[date], athlete?.calorieGoal ?? 2350));
  } catch (error) { next(error); }
});

router.post("/training/nutrition/:date", async (req, res, next) => {
  const { date } = req.params;
  if (!isDateKey(date)) {
    res.status(400).json({ error: "Date must be a valid YYYY-MM-DD date." });
    return;
  }
  const meal = parseNutritionMeal(req.body);
  if (!meal) {
    res.status(400).json({ error: "Meal requires a name and non-negative calorie and macro values." });
    return;
  }
  try {
    const state = await mutateState(getCurrentUser(req), (current) => {
      current.nutrition[date] ??= { meals: [] };
      current.nutrition[date].meals.push({
        ...meal,
        id: `meal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      });
    });
    const athlete = athleteFromState(state);
    res.status(201).json(dailyNutrition(date, state.nutrition[date], athlete?.calorieGoal ?? 2350));
  } catch (error) { next(error); }
});

router.delete("/training/nutrition/:date/meals/:mealId", async (req, res, next) => {
  const { date, mealId } = req.params;
  if (!isDateKey(date)) {
    res.status(400).json({ error: "Date must be a valid YYYY-MM-DD date." });
    return;
  }
  try {
    let deleted = false;
    const state = await mutateState(getCurrentUser(req), (current) => {
      const day = current.nutrition[date];
      if (!day) return;
      const meals = day.meals.filter((meal) => meal.id !== mealId);
      deleted = meals.length !== day.meals.length;
      day.meals = meals;
    });
    if (!deleted) {
      res.status(404).json({ error: "Meal not found." });
      return;
    }
    const athlete = athleteFromState(state);
    res.json(dailyNutrition(date, state.nutrition[date], athlete?.calorieGoal ?? 2350));
  } catch (error) { next(error); }
});

router.get("/training/invite-code", async (req, res, next) => {
  try {
    const snapshot = await readState(getCurrentUser(req));
    const athlete = athleteFromState(snapshot);
    const linkedTrainer = athlete?.linkedTrainerId
      ? (await db.select().from(appUsersTable).where(eq(appUsersTable.clerkUserId, athlete.linkedTrainerId)))[0]
      : undefined;
    res.json({
      code: athlete?.linkedTrainerId ? null : athlete?.inviteCode ?? null,
      linked: Boolean(athlete?.linkedTrainerId),
      trainerName: linkedTrainer?.name ?? null,
    });
  } catch (error) { next(error); }
});

router.post("/training/invite-code", async (req, res, next) => {
  try {
    let inviteCode: string | null = null;
    const usedCodes = (await readAllStates()).flatMap((state) =>
      state.trainerClients.map((client) => client.inviteCode).filter((code): code is string => Boolean(code)),
    );
    await mutateState(getCurrentUser(req), (current) => {
      const athlete = athleteFromState(current);
      if (!athlete) throw new Error("athlete-not-found");
      if (athlete.linkedTrainerId) throw new Error("already-linked");
      athlete.inviteCode = createUniqueInviteCode(usedCodes.map((code) => ({ inviteCode: code })));
      inviteCode = athlete.inviteCode;
    });
    res.json({ code: inviteCode, linked: false, trainerName: null });
  } catch (error) {
    if (error instanceof Error && error.message === "athlete-not-found") {
      res.status(404).json({ error: "Athlete record not found." });
    } else if (error instanceof Error && error.message === "already-linked") {
      res.status(409).json({ error: "This athlete is already linked to a trainer." });
    } else next(error);
  }
});

router.get("/trainer/clients", async (req, res, next) => {
  try {
    const states = await readAllStates();
    res.json(
      states.flatMap((state) => state.trainerClients)
        .filter((client) => client.linkedTrainerId === getCurrentUser(req).clerkUserId)
        .map(publicClient),
    );
  } catch (error) { next(error); }
});

router.post("/trainer/client-links", async (req, res, next) => {
  const code = String(req.body.code ?? "").trim();
  if (!/^[0-9]{6}$/.test(code)) {
    res.status(400).json({ error: "Enter a valid six-digit invite code." });
    return;
  }

  try {
    let linkedClient: ReturnType<typeof publicClient> | undefined;
    await mutateAllStates((states) => {
      const linkedCount = states.flatMap((state) => state.trainerClients).filter(
        (client) => client.linkedTrainerId === getCurrentUser(req).clerkUserId,
      ).length;
      if (linkedCount >= 25) throw new Error("limit");
      const athlete = states.flatMap((state) => state.trainerClients)
        .find((client) => client.inviteCode === code);
      if (!athlete) throw new Error("code-not-found");
      if (athlete.linkedTrainerId) throw new Error("already-linked");
      athlete.linkedTrainerId = getCurrentUser(req).clerkUserId;
      athlete.inviteCode = null;
      athlete.lastCheckIn = "Today";
      athlete.updates = [{
        id: `update-${Date.now()}`, date: "Today", type: "coach",
        message: `Athlete linked to ${getCurrentUser(req).name} with an invite code.`,
      }, ...athlete.updates];
      linkedClient = publicClient(athlete);
    });
    if (!linkedClient) throw new Error("code-not-found");
    res.status(201).json(linkedClient);
  } catch (error) {
    if (error instanceof Error && error.message === "limit") {
      res.status(409).json({ error: "The 25-client roster limit has been reached." });
    } else if (error instanceof Error && error.message === "code-not-found") {
      res.status(404).json({ error: "This invite code is invalid, expired, or has already been used." });
    } else if (error instanceof Error && error.message === "already-linked") {
      res.status(409).json({ error: "This athlete is already linked to a trainer." });
    } else next(error);
  }
});

router.get("/trainer/clients/:clientId", async (req, res, next) => {
  try {
    const client = (await readAllStates()).flatMap((state) => state.trainerClients).find(
      (item) => item.id === req.params.clientId && item.linkedTrainerId === getCurrentUser(req).clerkUserId,
    );
    if (!client) {
      res.status(404).json({ error: "Client not found." });
      return;
    }
    res.json(publicClient(client));
  } catch (error) { next(error); }
});

router.patch("/trainer/clients/:clientId", async (req, res, next) => {
  const { calorieGoal, weeklyVolumeGoal, workoutSplit, workouts } = req.body as Record<string, unknown>;
  if (calorieGoal !== undefined && (!Number.isInteger(calorieGoal) || Number(calorieGoal) < 1000 || Number(calorieGoal) > 6000)) {
    res.status(400).json({ error: "Calorie goal must be an integer from 1000 to 6000." });
    return;
  }
  if (weeklyVolumeGoal !== undefined && (!Number.isInteger(weeklyVolumeGoal) || Number(weeklyVolumeGoal) < 1 || Number(weeklyVolumeGoal) > 200)) {
    res.status(400).json({ error: "Weekly volume must be an integer from 1 to 200." });
    return;
  }
  if (workoutSplit !== undefined && (typeof workoutSplit !== "string" || !workoutSplit.trim())) {
    res.status(400).json({ error: "Workout split cannot be empty." });
    return;
  }
  if (workouts !== undefined && !isWorkoutList(workouts)) {
    res.status(400).json({ error: "Workout programming is invalid." });
    return;
  }

  try {
    let result: ReturnType<typeof publicClient> | undefined;
    await mutateAllStates((states) => {
      const ownerState = states.find((state) => state.trainerClients.some(
        (item) => item.id === req.params.clientId && item.linkedTrainerId === getCurrentUser(req).clerkUserId,
      ));
      const client = ownerState?.trainerClients.find(
        (item) => item.id === req.params.clientId && item.linkedTrainerId === getCurrentUser(req).clerkUserId,
      );
      if (!client || !ownerState) throw new Error("not-found");
      if (calorieGoal !== undefined) client.calorieGoal = Number(calorieGoal);
      if (weeklyVolumeGoal !== undefined) client.weeklyVolumeGoal = Number(weeklyVolumeGoal);
      if (typeof workoutSplit === "string") client.workoutSplit = workoutSplit.trim();
      if (isWorkoutList(workouts)) {
        const currentStatuses = new Map(client.workouts.map((workout) => [workout.id, workout.status]));
        client.workouts = workouts.map((workout) => ({
          ...workout,
          status: currentStatuses.get(workout.id) ?? "upcoming",
          exercises: workout.exercises.map((exercise) => ({ ...exercise })),
        }));
        ownerState.plan.workouts = cloneWorkouts(client.workouts);
      }
      client.updates = [{ id: `update-${Date.now()}`, date: "Today", type: "programming",
        message: `Program updated: ${client.workoutSplit}, ${client.calorieGoal} kcal, ${client.weeklyVolumeGoal} weekly sets.` }, ...client.updates];
      result = publicClient(client);
    });
    if (!result) throw new Error("not-found");
    res.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "not-found") res.status(404).json({ error: "Client not found." });
    else next(error);
  }
});

router.post("/trainer/clients/:clientId/updates", async (req, res, next) => {
  const message = String(req.body.message ?? "").trim();
  const updateType = String(req.body.type ?? "");
  if (!message || !["coach", "progress", "nutrition", "programming"].includes(updateType)) {
    res.status(400).json({ error: "A message and valid update type are required." });
    return;
  }

  try {
    let result: ReturnType<typeof publicClient> | undefined;
    await mutateAllStates((states) => {
      const client = states.flatMap((state) => state.trainerClients).find(
        (item) => item.id === req.params.clientId && item.linkedTrainerId === getCurrentUser(req).clerkUserId,
      );
      if (!client) throw new Error("not-found");
      client.updates = [{ id: `update-${Date.now()}`, date: "Today", message,
        type: updateType as ClientUpdate["type"] }, ...client.updates];
      client.lastCheckIn = "Today";
      result = publicClient(client);
    });
    res.status(201).json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "not-found") res.status(404).json({ error: "Client not found." });
    else next(error);
  }
});

export default router;
