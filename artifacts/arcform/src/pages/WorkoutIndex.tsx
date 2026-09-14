import React from 'react';
import { useGetTrainingPlan } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Dumbbell } from "lucide-react";

export default function WorkoutIndex() {
  const { data: plan, isLoading } = useGetTrainingPlan();

  if (isLoading) {
    return (
      <div className="p-6 md:p-10 space-y-6 max-w-4xl mx-auto">
        <Skeleton className="h-10 w-48 mb-10" />
        {[1,2,3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
      </div>
    );
  }

  if (!plan || !plan.workouts.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center space-y-8">
        <div className="w-16 h-16 border border-border flex items-center justify-center text-muted-foreground rounded-full">
          <Dumbbell className="w-8 h-8" />
        </div>
        <div className="max-w-md">
          <h2 className="text-2xl font-semibold tracking-tight mb-3">No Workouts Available</h2>
          <p className="text-muted-foreground font-light">
            Generate a protocol in the Plan tab first.
          </p>
        </div>
        <Link href="/plan">
          <button className="px-8 py-3 bg-foreground text-background font-medium hover:bg-foreground/90 transition-colors border border-foreground">
            Go to Plan
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto space-y-10 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Active Workouts</h1>
        <p className="text-muted-foreground mt-2 text-sm font-light">
          Select a session to begin logging.
        </p>
      </div>

      <div className="space-y-4">
        {plan.workouts.map((workout) => (
          <Link key={workout.id} href={`/workout/${workout.id}`}>
            <div className="rounded-xl block bg-card border border-border p-6 md:p-8 hover:bg-secondary/50 transition-colors cursor-pointer group">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="text-sm text-muted-foreground font-medium mb-1">{workout.day}</div>
                  <h3 className="text-xl font-semibold tracking-tight group-hover:text-muted-foreground transition-colors">{workout.title}</h3>
                  <div className="text-sm text-muted-foreground font-light mt-2">
                    Focus: {workout.focus} • {workout.duration} min
                  </div>
                </div>
                <div className="text-right">
                  {workout.status === 'upcoming' ? (
                    <span className="rounded-lg px-4 py-2 border border-foreground text-foreground text-sm font-medium">Start</span>
                  ) : (
                    <span className="rounded-lg px-4 py-2 border border-border text-muted-foreground text-sm font-medium">Completed</span>
                  )}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
