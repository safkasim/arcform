import React from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center space-y-6">
      <div className="max-w-md">
        <h1 className="text-6xl font-bold uppercase tracking-tighter text-primary mb-2">404</h1>
        <h2 className="text-2xl font-bold uppercase tracking-tighter mb-4">Sector Not Found</h2>
        <p className="text-muted-foreground">
          The requested trajectory is outside your active program parameters.
        </p>
      </div>
      <Link href="/">
        <Button size="lg">Return to Command Center</Button>
      </Link>
    </div>
  );
}
