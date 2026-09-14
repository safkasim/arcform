import React from 'react';
import { useGetTrainingDashboard } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { History as HistoryIcon, Calendar } from "lucide-react";

export default function History() {
  const { data: dashboard, isLoading } = useGetTrainingDashboard();

  if (isLoading) {
    return (
      <div className="p-6 md:p-10 space-y-6 max-w-4xl mx-auto">
        <Skeleton className="h-10 w-48 mb-10" />
        {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-24 w-full" />)}
      </div>
    );
  }

  if (!dashboard || dashboard.history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center space-y-8">
        <div className="w-16 h-16 border border-border flex items-center justify-center text-muted-foreground rounded-full">
          <HistoryIcon className="w-8 h-8" />
        </div>
        <div className="max-w-md">
          <h2 className="text-2xl font-semibold tracking-tight mb-3">No Records Found</h2>
          <p className="text-muted-foreground font-light">
            Complete workouts to build your training history and track adaptations.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto space-y-10 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Training Log</h1>
        <p className="text-muted-foreground mt-2 text-sm font-light">
          {dashboard.history.length} sessions recorded
        </p>
      </div>

      <div className="space-y-4">
        {dashboard.history.map((item) => (
          <Card key={item.id} className="bg-card border-border shadow-none hover:bg-secondary/30 transition-colors">
            <div className="bg-background/50 px-6 py-3 border-b border-border flex items-center gap-3">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium tracking-wide">{item.date}</span>
            </div>
            <CardContent className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h3 className="text-xl font-semibold tracking-tight">{item.title}</h3>
                <div className="flex items-center gap-4 mt-3">
                  <span className="border border-border px-2 py-1 text-sm text-foreground font-medium">{item.duration} min</span>
                  <span className="text-sm text-muted-foreground font-light">{item.totalSets} Sets Total</span>
                </div>
              </div>
              
              <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center border-t md:border-t-0 md:border-l border-border pt-6 md:pt-0 md:pl-8">
                <div className="text-sm text-muted-foreground font-medium mb-1">Avg RPE</div>
                <div className="text-2xl font-light text-foreground">
                  {item.avgRpe.toFixed(1)}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
