import React from 'react';
import { useGetTrainingPlan, useGenerateTrainingPlan, useGetTrainingProfile, getGetTrainingPlanQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Plan() {
  const queryClient = useQueryClient();
  const { data: profile } = useGetTrainingProfile();
  const { data: plan, isLoading: planLoading, isError: planError } = useGetTrainingPlan({
    query: { retry: false, queryKey: getGetTrainingPlanQueryKey() }
  });
  const generatePlan = useGenerateTrainingPlan();

  const handleGenerate = () => {
    if (!profile) return;
    const { goal, lifestyle, experience, daysPerWeek, equipment } = profile;
    generatePlan.mutate({
      data: {
        profile: { goal, lifestyle, experience, daysPerWeek, equipment }
      }
    }, {
      onSuccess: (data) => {
        queryClient.setQueryData(getGetTrainingPlanQueryKey(), data);
      }
    });
  };

  if (planLoading) {
    return (
      <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-32 w-full" />
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  if (planError || !plan) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-8 text-center space-y-8">
        <div className="max-w-md">
          <h2 className="text-2xl font-semibold tracking-tight mb-3">No Active Protocol</h2>
          <p className="text-muted-foreground font-light">
            Generate an intelligent training schedule based on your current profile parameters.
          </p>
        </div>
        <Button 
          size="lg" 
          onClick={handleGenerate} 
          disabled={generatePlan.isPending}
          className="bg-foreground text-background hover:bg-foreground/90 h-14 px-8 text-base border border-foreground font-medium"
        >
          {generatePlan.isPending ? 'Computing...' : 'Generate Protocol'}
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-12 animate-in fade-in duration-500">
      <div>
        <div className="flex items-center gap-4 mb-3">
          <span className="text-sm font-medium border border-border px-3 py-1">Week {plan.week} of {plan.totalWeeks}</span>
          <span className="text-sm text-muted-foreground font-light">{plan.name}</span>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">Current Protocol</h1>
      </div>

      <Card className="bg-card border-border shadow-none">
        <CardContent className="p-8">
          <h3 className="font-medium text-sm text-muted-foreground mb-3">Rationale</h3>
          <p className="text-base text-foreground font-light leading-relaxed">{plan.rationale}</p>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <h2 className="text-2xl font-semibold tracking-tight">Structure</h2>
        <div className="grid gap-6">
          {plan.workouts.map((workout) => (
            <Card key={workout.id} className="border-border bg-card shadow-none">
              <CardContent className="p-8">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8 border-b border-border pb-8">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-2">{workout.day}</div>
                    <h3 className="text-2xl font-semibold tracking-tight">{workout.title}</h3>
                    <p className="text-sm text-muted-foreground mt-2 font-light">Focus: {workout.focus} • {workout.duration} min</p>
                  </div>
                  {workout.status === 'upcoming' ? (
                    <Link href={`/workout/${workout.id}`}>
                      <button className="rounded-lg px-6 py-2.5 border border-foreground text-foreground hover:bg-foreground hover:text-background font-medium text-sm transition-colors w-full md:w-auto">
                        Start Session
                      </button>
                    </Link>
                  ) : (
                    <span className="rounded-lg px-6 py-2.5 border border-border text-muted-foreground font-medium text-sm w-full md:w-auto text-center inline-block">
                      Completed
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {workout.exercises.map(ex => (
                    <div key={ex.id} className="group">
                      <div className="font-medium text-base mb-2 group-hover:text-muted-foreground transition-colors">{ex.name}</div>
                      <div className="flex gap-6 text-sm text-muted-foreground font-light">
                        <div>Sets: <span className="text-foreground font-medium">{ex.sets}</span></div>
                        <div>Reps: <span className="text-foreground font-medium">{ex.reps}</span></div>
                        <div>RPE: <span className="text-foreground font-medium">{ex.targetRpe}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
