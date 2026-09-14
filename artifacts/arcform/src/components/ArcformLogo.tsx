import React from 'react';
import { cn } from '@/lib/utils';

interface ArcformLogoProps {
  variant?: 'large' | 'nav';
  className?: string;
  iconOnly?: boolean;
}

export function ArcformLogo({ variant = 'nav', className, iconOnly = false }: ArcformLogoProps) {
  const isNav = variant === 'nav';
  
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <img
        src={`${import.meta.env.BASE_URL}arcform-logo.png`}
        alt=""
        aria-hidden="true"
        className={cn(
          "shrink-0 object-contain",
          isNav ? "h-7 w-7" : "h-12 w-12",
        )}
      />
      {!iconOnly && (
        <span className={isNav ? "arcform-wordmark-nav" : "arcform-wordmark"}>
          arcform
        </span>
      )}
    </div>
  );
}
