import React, { useState } from "react";
import { useSaveTrainingProfile, getGetTrainingProfileQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ArcformLogo } from "@/components/ArcformLogo";

type Goal = 'strength' | 'hypertrophy' | 'general' | 'fat_loss';
type Lifestyle = 'sedentary' | 'active' | 'very_active';
type Experience = 'beginner' | 'intermediate' | 'advanced';
type Equipment = 'full_gym' | 'home_gym' | 'bodyweight';

export default function Onboarding() {
  const queryClient = useQueryClient();
  const saveProfile = useSaveTrainingProfile();

  const [goal, setGoal] = useState<Goal>('hypertrophy');
  const [lifestyle, setLifestyle] = useState<Lifestyle>('active');
  const [experience, setExperience] = useState<Experience>('intermediate');
  const [daysPerWeek, setDaysPerWeek] = useState(4);
  const [equipment, setEquipment] = useState<Equipment>('full_gym');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveProfile.mutate({
      data: {
        goal,
        lifestyle,
        experience,
        daysPerWeek,
        equipment,
      }
    }, {
      onSuccess: (data) => {
        queryClient.setQueryData(getGetTrainingProfileQueryKey(), data);
      }
    });
  };

  return (
    <div className="min-h-full flex flex-col items-center justify-center py-16 px-4 animate-in fade-in duration-1000 bg-background">
      <div className="w-full max-w-xl p-8 border border-border bg-card">
        <div className="mb-12 text-center flex flex-col items-center">
          <ArcformLogo variant="large" className="mb-6" />
          <h1 className="text-2xl font-medium text-foreground tracking-tight">
            Configure Protocol
          </h1>
          <p className="text-muted-foreground mt-2 text-sm font-light">
            Set your training parameters to initialize the system.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-10">
          <div className="space-y-4">
            <Label className="text-sm font-medium text-muted-foreground">Primary Objective</Label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'strength', label: 'Absolute Strength' },
                { id: 'hypertrophy', label: 'Hypertrophy' },
                { id: 'fat_loss', label: 'Fat Loss' },
                { id: 'general', label: 'Conditioning' }
              ].map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setGoal(g.id as Goal)}
                  className={`p-4 border text-left transition-colors ${goal === g.id ? 'border-foreground bg-foreground text-background' : 'border-border text-foreground hover:bg-foreground hover:text-background'}`}
                >
                  <div className="text-sm font-medium">{g.label}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <Label className="text-sm font-medium text-muted-foreground">Daily Lifestyle</Label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                { id: 'sedentary', label: 'Mostly Seated' },
                { id: 'active', label: 'Generally Active' },
                { id: 'very_active', label: 'Highly Active' }
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setLifestyle(item.id as Lifestyle)}
                  className={`p-3 md:p-4 border text-center transition-colors ${lifestyle === item.id ? 'border-foreground bg-foreground text-background' : 'border-border text-foreground hover:bg-foreground hover:text-background'}`}
                >
                  <div className="text-sm font-medium">{item.label}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <Label className="text-sm font-medium text-muted-foreground">Experience Level</Label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'beginner', label: '< 1 Year' },
                { id: 'intermediate', label: '1 - 3 Years' },
                { id: 'advanced', label: '3+ Years' }
              ].map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => setExperience(e.id as Experience)}
                  className={`p-3 md:p-4 border text-center transition-colors ${experience === e.id ? 'border-foreground bg-foreground text-background' : 'border-border text-foreground hover:bg-foreground hover:text-background'}`}
                >
                  <div className="text-sm font-medium">{e.label}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <Label className="text-sm font-medium text-muted-foreground flex justify-between">
              <span>Training Frequency</span>
              <span className="text-foreground">{daysPerWeek} Days/Week</span>
            </Label>
            <input 
              type="range" 
              min={2} max={6} step={1} 
              value={daysPerWeek}
              onChange={(e) => setDaysPerWeek(Number(e.target.value))}
              className="w-full h-1 bg-border appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:rounded-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground pt-1">
              <span>2</span><span>3</span><span>4</span><span>5</span><span>6</span>
            </div>
          </div>

          <div className="space-y-4">
            <Label className="text-sm font-medium text-muted-foreground">Environment</Label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'full_gym', label: 'Full Gym' },
                { id: 'home_gym', label: 'Home Gym' },
                { id: 'bodyweight', label: 'Bodyweight' }
              ].map((eq) => (
                <button
                  key={eq.id}
                  type="button"
                  onClick={() => setEquipment(eq.id as Equipment)}
                  className={`p-3 md:p-4 border text-center transition-colors ${equipment === eq.id ? 'border-foreground bg-foreground text-background' : 'border-border text-foreground hover:bg-foreground hover:text-background'}`}
                >
                  <div className="text-sm font-medium">{eq.label}</div>
                </button>
              ))}
            </div>
          </div>

          <Button 
            type="submit" 
            size="lg" 
            className="w-full text-base font-medium h-14 bg-foreground text-background hover:bg-foreground/90 border border-foreground" 
            disabled={saveProfile.isPending}
          >
            {saveProfile.isPending ? 'Processing...' : 'Initialize'}
          </Button>
        </form>
      </div>
    </div>
  );
}
