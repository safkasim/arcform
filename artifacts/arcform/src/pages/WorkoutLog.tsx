import React, { useState } from 'react';
import { useLocation, useParams } from 'wouter';
import { useGetTrainingPlan, useLogWorkout, getGetTrainingDashboardQueryKey, getGetTrainingPlanQueryKey } from "@workspace/api-client-react";
import type { LoggedSet } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Check, ChevronLeft, Zap } from "lucide-react";

export default function WorkoutLog() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  const { data: plan, isLoading } = useGetTrainingPlan();
  const logWorkout = useLogWorkout();

  // state: { exerciseId: { setIndex: { weight, reps, rpe, completed } } }
  const [logs, setLogs] = useState<Record<string, Record<number, { weight: string, reps: string, rpe: string, completed: boolean }>>>({});
  const [notes, setNotes] = useState("");
  const [finishSuccess, setFinishSuccess] = useState<string | null>(null);

  if (isLoading) {
    return <div className="p-10 text-center text-muted-foreground font-light">Loading session...</div>;
  }

  const workout = plan?.workouts.find(w => w.id === id);

  if (!workout) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-8 text-center space-y-6">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Session Not Found</h2>
        <button onClick={() => setLocation('/plan')} className="px-6 py-2 border border-border hover:bg-foreground hover:text-background transition-colors text-sm font-medium">
          Return to Plan
        </button>
      </div>
    );
  }

  const updateSet = (exerciseId: string, setIndex: number, field: string, value: string | boolean) => {
    setLogs(prev => {
      const exLogs = prev[exerciseId] || {};
      const setLog = exLogs[setIndex] || { weight: "", reps: "", rpe: "", completed: false };
      return {
        ...prev,
        [exerciseId]: {
          ...exLogs,
          [setIndex]: { ...setLog, [field]: value }
        }
      };
    });
  };

  const handleFinish = () => {
    // Collect all completed sets
    const completedSets: LoggedSet[] = [];
    Object.entries(logs).forEach(([exerciseId, exLogs]) => {
      Object.entries(exLogs).forEach(([setIndexStr, setLog]) => {
        if (setLog.completed) {
          completedSets.push({
            exerciseId,
            setNumber: parseInt(setIndexStr) + 1,
            reps: parseInt(setLog.reps) || 0,
            weight: parseFloat(setLog.weight) || 0,
            rpe: parseInt(setLog.rpe) || 7
          });
        }
      });
    });

    logWorkout.mutate({
      workoutId: id,
      data: {
        sets: completedSets,
        notes: notes.trim() ? notes : undefined
      }
    }, {
      onSuccess: (res) => {
        setFinishSuccess(res.adaptation);
        queryClient.invalidateQueries({ queryKey: getGetTrainingDashboardQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetTrainingPlanQueryKey() });
      }
    });
  };

  if (finishSuccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] p-8 text-center space-y-8 animate-in zoom-in-95 duration-500">
        <div className="w-16 h-16 border border-foreground rounded-full flex items-center justify-center text-foreground">
          <Check className="w-8 h-8" />
        </div>
        <div className="max-w-md space-y-4">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground">Session Logged</h2>
          <div className="text-muted-foreground text-sm font-light leading-relaxed border border-border p-6 text-left">
            {finishSuccess}
          </div>
        </div>
        <button onClick={() => setLocation('/')} className="mt-8 px-8 py-3 bg-foreground text-background font-medium hover:bg-foreground/90 transition-colors border border-foreground">
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="pb-32 animate-in fade-in duration-500 bg-background min-h-[100dvh]">
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border px-6 py-5 flex items-center gap-6">
        <button onClick={() => setLocation('/plan')} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight truncate">{workout.title}</h1>
          <p className="text-sm text-muted-foreground font-light truncate">Focus: {workout.focus} • {workout.duration} min</p>
        </div>
      </div>

      <div className="p-6 md:p-10 space-y-10 max-w-4xl mx-auto">
        {workout.exercises.map((ex, exIndex) => (
          <Card key={ex.id} className="border-border shadow-none rounded-none bg-card">
            <div className="px-6 py-5 border-b border-border flex justify-between items-center bg-card">
              <h3 className="font-medium text-lg tracking-tight flex items-center gap-3">
                <span className="text-muted-foreground text-sm font-light">{exIndex + 1}.</span> {ex.name}
              </h3>
              <span className="text-sm font-medium border border-border px-3 py-1">
                {ex.sets}×{ex.reps} @ {ex.targetRpe} RPE
              </span>
            </div>
            <CardContent className="p-0">
              <div className="grid grid-cols-[auto_1fr_1fr_1fr_auto] gap-4 p-4 text-xs font-medium text-muted-foreground border-b border-border bg-card">
                <div className="w-10 text-center">Set</div>
                <div>Weight</div>
                <div>Reps</div>
                <div>RPE</div>
                <div className="w-12 text-center"><Check className="w-4 h-4 mx-auto" /></div>
              </div>
              
              {Array.from({ length: ex.sets }).map((_, s) => {
                const currentLog = logs[ex.id]?.[s] || { weight: "", reps: "", rpe: "", completed: false };
                return (
                  <div key={s} className={`grid grid-cols-[auto_1fr_1fr_1fr_auto] gap-4 p-4 items-center border-b border-border last:border-0 transition-colors ${currentLog.completed ? 'bg-secondary/20' : ''}`}>
                    <div className="w-10 text-center font-light text-muted-foreground">{s + 1}</div>
                    <Input 
                      type="number" 
                      placeholder={ex.targetWeight} 
                      className="h-10 text-center bg-background border-border rounded-none focus-visible:ring-1 focus-visible:ring-foreground"
                      value={currentLog.weight}
                      onChange={(e) => updateSet(ex.id, s, 'weight', e.target.value)}
                      disabled={currentLog.completed}
                    />
                    <Input 
                      type="number" 
                      placeholder={ex.reps} 
                      className="h-10 text-center bg-background border-border rounded-none focus-visible:ring-1 focus-visible:ring-foreground"
                      value={currentLog.reps}
                      onChange={(e) => updateSet(ex.id, s, 'reps', e.target.value)}
                      disabled={currentLog.completed}
                    />
                    <Input 
                      type="number" 
                      placeholder={ex.targetRpe.toString()} 
                      className="h-10 text-center bg-background border-border rounded-none focus-visible:ring-1 focus-visible:ring-foreground"
                      value={currentLog.rpe}
                      onChange={(e) => updateSet(ex.id, s, 'rpe', e.target.value)}
                      disabled={currentLog.completed}
                    />
                    <button 
                      className={`w-12 h-10 shrink-0 border border-border flex items-center justify-center transition-colors ${currentLog.completed ? 'bg-foreground text-background border-foreground' : 'text-muted-foreground hover:bg-foreground hover:text-background'}`}
                      onClick={() => {
                        if (!currentLog.completed) {
                          if (!currentLog.weight) updateSet(ex.id, s, 'weight', ex.targetWeight.replace(/[^0-9.]/g, ''));
                          if (!currentLog.reps) updateSet(ex.id, s, 'reps', ex.reps.replace(/[^0-9]/g, ''));
                          if (!currentLog.rpe) updateSet(ex.id, s, 'rpe', ex.targetRpe.toString());
                        }
                        updateSet(ex.id, s, 'completed', !currentLog.completed);
                      }}
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}

        <Card className="border-border shadow-none rounded-none bg-card">
          <div className="px-6 py-5 border-b border-border">
            <h3 className="font-medium tracking-tight">Session Notes</h3>
          </div>
          <CardContent className="p-6">
            <Textarea 
              placeholder="Record any discomfort, energy levels, or execution notes..." 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-sm font-light min-h-[120px] bg-background border-border rounded-none focus-visible:ring-1 focus-visible:ring-foreground p-4"
            />
          </CardContent>
        </Card>
      </div>

      <div className="fixed bottom-0 left-0 right-0 md:pl-64 p-6 bg-background/95 backdrop-blur border-t border-border z-40">
        <div className="max-w-4xl mx-auto flex justify-end">
          <button 
            className="w-full md:w-auto px-8 py-3.5 bg-foreground text-background font-medium hover:bg-foreground/90 transition-colors border border-foreground disabled:opacity-50 flex items-center justify-center gap-2"
            onClick={handleFinish}
            disabled={logWorkout.isPending}
          >
            {logWorkout.isPending ? 'Syncing...' : 'Finalize Session'}
            {!logWorkout.isPending && <Zap className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
