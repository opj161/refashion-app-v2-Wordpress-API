// src/components/ui/page-header.tsx
import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
}

export function PageHeader({ icon: Icon, title, description, className }: PageHeaderProps) {
  return (
    <header className={cn("text-center py-4", className)}>
      <div className="flex items-center justify-center gap-3 sm:gap-4">
        <Icon className="w-10 h-10 sm:w-12 sm:h-12 text-primary" />
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground font-sans">
          {title}
        </h1>
      </div>
      <p className="mt-3 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
        {description}
      </p>
    </header>
  );
}
