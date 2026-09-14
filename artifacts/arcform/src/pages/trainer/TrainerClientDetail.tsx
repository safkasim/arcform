import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { 
  useGetTrainerClient, 
  getGetTrainerClientQueryKey,
  useUpdateTrainerClient,
  useAddTrainerClientUpdate
  ,getListTrainerClientsQueryKey
} from "@workspace/api-client-react";
import type { TrainerClient } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "./components/StatusBadge";

interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  targetWeight: string;
  targetRpe: number;
}

interface Workout {
  id: string;
  day: string;
  title: string;
  focus: string;
  duration: number;
  status: 'upcoming' | 'completed';
  exercises: Exercise[];
}

function displayDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}/.test(value)) return value;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? value : new Date(timestamp).toLocaleDateString();
}

function cloneWorkoutList(workouts: Workout[]) {
  return workouts.map((workout) => ({
    ...workout,
    exercises: workout.exercises.map((exercise) => ({ ...exercise })),
  }));
}

export function TrainerClientDetail({ id, onLogout }: { id: string, onLogout: () => void }) {
  const queryClient = useQueryClient();
  const { data: client, isLoading } = useGetTrainerClient(id, {
    query: { enabled: !!id, queryKey: getGetTrainerClientQueryKey(id) }
  });
  
  const updateClient = useUpdateTrainerClient();
  const addUpdate = useAddTrainerClientUpdate();
  
  const [calorieGoal, setCalorieGoal] = useState<number>(0);
  const [volumeGoal, setVolumeGoal] = useState<number>(0);
  const [split, setSplit] = useState("");
  
  const [isEditingProgramming, setIsEditingProgramming] = useState(false);
  const [draftWorkouts, setDraftWorkouts] = useState<Workout[]>([]);
  
  const [updateMessage, setUpdateMessage] = useState("");
  const [updateType, setUpdateType] = useState<"coach"|"progress"|"nutrition"|"programming">("coach");

  const initializedRef = useRef<string | null>(null);

  useEffect(() => {
    if (client && initializedRef.current !== id) {
      setCalorieGoal(client.calorieGoal);
      setVolumeGoal(client.weeklyVolumeGoal);
      setSplit(client.workoutSplit);
      setDraftWorkouts(cloneWorkoutList(client.workouts as Workout[]));
      initializedRef.current = id;
    }
  }, [client, id]);

  if (isLoading || !client) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-8 w-8 rounded-full bg-border" />
          <div className="text-sm text-muted-foreground font-light">Loading workspace...</div>
        </div>
      </div>
    );
  }

  const handleSaveSettings = async () => {
    const saved = await updateClient.mutateAsync({
      clientId: id,
      data: {
        calorieGoal,
        weeklyVolumeGoal: volumeGoal,
        workoutSplit: split,
      }
    });
    syncClientCaches(saved);
  };

  const handleSaveProgramming = async () => {
    const saved = await updateClient.mutateAsync({
      clientId: id,
      data: {
        workouts: draftWorkouts
      }
    });
    setIsEditingProgramming(false);
    setDraftWorkouts(cloneWorkoutList(saved.workouts as Workout[]));
    syncClientCaches(saved);
  };

  const handleAddUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const saved = await addUpdate.mutateAsync({
      clientId: id,
      data: { message: updateMessage, type: updateType }
    });
    setUpdateMessage("");
    syncClientCaches(saved);
  };

  const syncClientCaches = (saved: TrainerClient) => {
    queryClient.setQueryData(getGetTrainerClientQueryKey(id), saved);
    queryClient.setQueryData<TrainerClient[]>(getListTrainerClientsQueryKey(), (current) => (
      current?.map((item) => item.id === saved.id ? saved : item)
    ));
  };

  const updateDraftWorkout = <K extends keyof Workout>(index: number, field: K, value: Workout[K]) => {
    const newWorkouts = [...draftWorkouts];
    newWorkouts[index] = { ...newWorkouts[index], [field]: value };
    setDraftWorkouts(newWorkouts);
  };

  const updateDraftExercise = <K extends keyof Exercise>(wIndex: number, eIndex: number, field: K, value: Exercise[K]) => {
    const newWorkouts = [...draftWorkouts];
    const workout = newWorkouts[wIndex];
    const newExercises = [...workout.exercises];
    newExercises[eIndex] = { ...newExercises[eIndex], [field]: value };
    newWorkouts[wIndex] = { ...workout, exercises: newExercises };
    setDraftWorkouts(newWorkouts);
  };

  return (
    <div className="flex flex-col flex-1">
      <header className="border-b border-border bg-background px-6 py-4 sticky top-0 z-10">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="inline-flex items-center justify-center h-8 w-8 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground border border-border">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </Link>
            <div>
              <h1 className="text-2xl font-light tracking-tight flex items-center gap-3">
                {client.name}
                <StatusBadge status={client.status} />
              </h1>
              <p className="text-xs text-muted-foreground font-light mt-0.5">{client.email} • {client.goal.replace('_', ' ')}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={onLogout} className="text-xs">Sign Out</Button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-[1400px] mx-auto p-6 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-1 flex flex-col gap-8">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-card border border-border rounded-xl p-6 flex flex-col items-center justify-center text-center">
                <div className="text-4xl font-light">{client.progressScore}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] mt-2">Progress</div>
                <div className="mt-2 text-[10px] font-light leading-relaxed text-muted-foreground">Adherence + training streak</div>
              </div>
              <div className="bg-card border border-border rounded-xl p-6 flex flex-col items-center justify-center text-center">
                <div className="text-4xl font-light">{client.adherence}%</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] mt-2">Adherence</div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="text-lg font-light tracking-tight mb-5">Training Parameters</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground font-light">Calorie Goal (kcal)</Label>
                  <Input type="number" value={calorieGoal} onChange={e => setCalorieGoal(Number(e.target.value))} className="h-10 bg-background" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground font-light">Weekly Volume (sets)</Label>
                  <Input type="number" value={volumeGoal} onChange={e => setVolumeGoal(Number(e.target.value))} className="h-10 bg-background" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground font-light">Workout Split</Label>
                  <Input value={split} onChange={e => setSplit(e.target.value)} className="h-10 bg-background" />
                </div>
                <Button 
                  className="w-full mt-4" 
                  onClick={handleSaveSettings}
                  disabled={
                    updateClient.isPending || 
                    (calorieGoal === client.calorieGoal && volumeGoal === client.weeklyVolumeGoal && split === client.workoutSplit)
                  }
                >
                  {updateClient.isPending ? "Saving..." : "Update Parameters"}
                </Button>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="text-lg font-light tracking-tight mb-5">Updates & Notes</h3>
              
              <form onSubmit={handleAddUpdate} className="mb-6 space-y-3 bg-background/50 p-4 rounded-lg border border-border/50">
                <select 
                  value={updateType}
                  onChange={e => setUpdateType(e.target.value as typeof updateType)}
                  className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-xs font-medium ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value="coach">Coach Note</option>
                  <option value="progress">Progress Update</option>
                  <option value="nutrition">Nutrition Update</option>
                  <option value="programming">Programming Update</option>
                </select>
                <textarea 
                  required
                  placeholder="Write an update..."
                  value={updateMessage}
                  onChange={e => setUpdateMessage(e.target.value)}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
                <div className="flex justify-end">
                  <Button type="submit" size="sm" disabled={addUpdate.isPending || !updateMessage.trim()}>
                    {addUpdate.isPending ? "Posting..." : "Post Update"}
                  </Button>
                </div>
              </form>

              <div className="space-y-5 max-h-[500px] overflow-y-auto pr-2">
                {client.updates.length === 0 ? (
                  <p className="text-sm text-muted-foreground font-light text-center py-4">No updates yet.</p>
                ) : (
                  client.updates.map(update => (
                    <div key={update.id} className="pb-5 border-b border-border/50 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">{update.type}</span>
                        <span className="text-[10px] text-muted-foreground font-light">{displayDate(update.date)}</span>
                      </div>
                      <p className="text-sm font-light leading-relaxed">{update.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          
          <div className="lg:col-span-2">
            <div className="bg-card border border-border rounded-xl p-6 md:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                  <h3 className="text-2xl font-light tracking-tight">Programming</h3>
                  <p className="text-sm text-muted-foreground font-light mt-1">Manage weekly workouts and targets.</p>
                </div>
                {!isEditingProgramming ? (
                  <Button variant="outline" onClick={() => setIsEditingProgramming(true)}>Edit Program</Button>
                ) : (
                  <div className="flex gap-3">
                    <Button variant="ghost" onClick={() => {
                      setDraftWorkouts(cloneWorkoutList(client.workouts as Workout[]));
                      setIsEditingProgramming(false);
                    }}>Cancel</Button>
                    <Button onClick={handleSaveProgramming} disabled={updateClient.isPending}>
                      {updateClient.isPending ? "Saving..." : "Save Program"}
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-8">
                {(isEditingProgramming ? draftWorkouts : client.workouts).length === 0 && (
                  <div className="text-center py-12 text-muted-foreground font-light text-sm border border-dashed border-border rounded-lg">
                    No workouts programmed yet. {isEditingProgramming && "Click 'Add Workout' below to begin."}
                  </div>
                )}

                {(isEditingProgramming ? draftWorkouts : client.workouts).map((workout, wIndex) => (
                  <div key={workout.id} className="border border-border rounded-xl p-5 bg-background/30">
                    <div className="flex items-start justify-between gap-4 mb-6 pb-5 border-b border-border/50">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
                        <div className="space-y-1.5">
                          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Day</Label>
                          {isEditingProgramming ? (
                            <Input value={workout.day} onChange={e => updateDraftWorkout(wIndex, 'day', e.target.value)} className="h-9 text-sm bg-background" />
                          ) : (
                            <div className="text-sm font-medium pt-1">{workout.day}</div>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Title</Label>
                          {isEditingProgramming ? (
                            <Input value={workout.title} onChange={e => updateDraftWorkout(wIndex, 'title', e.target.value)} className="h-9 text-sm bg-background" />
                          ) : (
                            <div className="text-sm font-medium pt-1">{workout.title}</div>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Focus</Label>
                          {isEditingProgramming ? (
                            <Input value={workout.focus} onChange={e => updateDraftWorkout(wIndex, 'focus', e.target.value)} className="h-9 text-sm bg-background" />
                          ) : (
                            <div className="text-sm font-medium pt-1 capitalize">{workout.focus.replace('_', ' ')}</div>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Duration (m)</Label>
                          {isEditingProgramming ? (
                            <Input type="number" value={workout.duration} onChange={e => updateDraftWorkout(wIndex, 'duration', Number(e.target.value))} className="h-9 text-sm bg-background" />
                          ) : (
                            <div className="text-sm font-medium pt-1">{workout.duration} min</div>
                          )}
                        </div>
                      </div>
                      {isEditingProgramming && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-9 px-2 text-muted-foreground hover:text-destructive shrink-0 mt-6"
                          onClick={() => {
                            const newWorkouts = draftWorkouts.filter((_, i) => i !== wIndex);
                            setDraftWorkouts(newWorkouts);
                          }}
                        >
                          Remove
                        </Button>
                      )}
                    </div>

                    <div className="space-y-2">
                      {workout.exercises.length > 0 && (
                        <div className="grid grid-cols-12 gap-2 px-2 text-[10px] uppercase tracking-[0.1em] font-medium text-muted-foreground mb-3">
                          <div className="col-span-4">Exercise</div>
                          <div className="col-span-2 text-center">Sets</div>
                          <div className="col-span-2 text-center">Reps</div>
                          <div className="col-span-2 text-center">Weight</div>
                          <div className="col-span-1 text-center">RPE</div>
                          <div className="col-span-1"></div>
                        </div>
                      )}
                      
                      {workout.exercises.map((exercise, eIndex) => (
                        <div key={exercise.id} className="grid grid-cols-12 gap-2 items-center bg-card p-2 rounded-lg border border-border/50 hover:border-border transition-colors">
                          <div className="col-span-4">
                            {isEditingProgramming ? (
                              <Input value={exercise.name} onChange={e => updateDraftExercise(wIndex, eIndex, 'name', e.target.value)} className="h-8 text-xs bg-background" />
                            ) : (
                              <div className="text-sm px-2 font-medium">{exercise.name}</div>
                            )}
                          </div>
                          <div className="col-span-2">
                            {isEditingProgramming ? (
                              <Input type="number" value={exercise.sets} onChange={e => updateDraftExercise(wIndex, eIndex, 'sets', Number(e.target.value))} className="h-8 text-xs bg-background text-center px-1" />
                            ) : (
                              <div className="text-sm text-center font-light">{exercise.sets}</div>
                            )}
                          </div>
                          <div className="col-span-2">
                            {isEditingProgramming ? (
                              <Input value={exercise.reps} onChange={e => updateDraftExercise(wIndex, eIndex, 'reps', e.target.value)} className="h-8 text-xs bg-background text-center px-1" />
                            ) : (
                              <div className="text-sm text-center font-light">{exercise.reps}</div>
                            )}
                          </div>
                          <div className="col-span-2">
                            {isEditingProgramming ? (
                              <Input value={exercise.targetWeight} onChange={e => updateDraftExercise(wIndex, eIndex, 'targetWeight', e.target.value)} className="h-8 text-xs bg-background text-center px-1" />
                            ) : (
                              <div className="text-sm text-center font-light">{exercise.targetWeight}</div>
                            )}
                          </div>
                          <div className="col-span-1">
                            {isEditingProgramming ? (
                              <Input type="number" value={exercise.targetRpe} onChange={e => updateDraftExercise(wIndex, eIndex, 'targetRpe', Number(e.target.value))} className="h-8 text-xs bg-background text-center px-1" />
                            ) : (
                              <div className="text-sm text-center font-light text-muted-foreground">@{exercise.targetRpe}</div>
                            )}
                          </div>
                          <div className="col-span-1 flex justify-end">
                            {isEditingProgramming && (
                              <button 
                                type="button"
                                className="text-muted-foreground hover:text-white p-1.5 rounded transition-colors"
                                onClick={() => {
                                  const newWorkouts = [...draftWorkouts];
                                  newWorkouts[wIndex] = {
                                    ...newWorkouts[wIndex],
                                    exercises: newWorkouts[wIndex].exercises.filter((_, i) => i !== eIndex),
                                  };
                                  setDraftWorkouts(newWorkouts);
                                }}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                      
                      {isEditingProgramming && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full mt-4 border-dashed bg-transparent"
                          onClick={() => {
                            const newWorkouts = [...draftWorkouts];
                            newWorkouts[wIndex] = {
                              ...newWorkouts[wIndex],
                              exercises: [...newWorkouts[wIndex].exercises, {
                              id: Math.random().toString(36).substring(7),
                              name: "New Exercise",
                              sets: 3,
                              reps: "10",
                              targetWeight: "Bodyweight",
                              targetRpe: 8
                              }],
                            };
                            setDraftWorkouts(newWorkouts);
                          }}
                        >
                          + Add Exercise
                        </Button>
                      )}
                    </div>
                  </div>
                ))}

                {isEditingProgramming && (
                  <Button 
                    variant="outline" 
                    className="w-full border-dashed py-8 bg-transparent"
                    onClick={() => {
                      setDraftWorkouts([
                        ...draftWorkouts,
                        {
                          id: Math.random().toString(36).substring(7),
                          day: "Day " + (draftWorkouts.length + 1),
                          title: "New Workout",
                          focus: "general",
                          duration: 60,
                          status: "upcoming",
                          exercises: []
                        }
                      ]);
                    }}
                  >
                    + Add New Workout
                  </Button>
                )}
              </div>
            </div>
          </div>
          
        </div>
      </main>
    </div>
  );
}
