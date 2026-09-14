import React from "react";
import { useGetTrainingProfile } from "@workspace/api-client-react";
import Dashboard from "./Dashboard";
import Onboarding from "./Onboarding";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const { data: profile, isLoading, isError } = useGetTrainingProfile();

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-6 md:p-10">
        <div className="space-y-8 w-full max-w-6xl">
          <Skeleton className="h-10 w-1/3" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-foreground font-light">
        <p>Failed to load profile. Please refresh.</p>
      </div>
    );
  }

  if (profile.complete) {
    return <Dashboard />;
  }

  return <Onboarding />;
}
