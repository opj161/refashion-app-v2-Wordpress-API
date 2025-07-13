"use client";

import React, { useState, useEffect } from 'react';
import { Moon, Sun, Monitor, Check, ChevronDown, Settings } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  variant?: 'icon' | 'button' | 'compact';
  showLabel?: boolean;
}

export function ThemeToggleImproved({ variant = 'button', showLabel = true }: ThemeToggleProps) {
  const { theme, setTheme, isHydrated } = useTheme();
  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      setEffectiveTheme(mediaQuery.matches ? 'dark' : 'light');
      const handler = (e: MediaQueryListEvent) => setEffectiveTheme(e.matches ? 'dark' : 'light');
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    } else {
      setEffectiveTheme(theme);
    }
  }, [theme]);

  const getIcon = () => {
    if (!isHydrated) {
      return <Monitor className="h-4 w-4" />;
    }

    if (theme === 'light') {
      return <Sun className="h-4 w-4" />;
    } else if (theme === 'dark') {
      return <Moon className="h-4 w-4" />;
    } else {
      return <Monitor className="h-4 w-4" />;
    }
  };

  const getThemeLabel = () => {
    if (!isHydrated) return "Theme";
    
    if (theme === 'light') return "Light";
    if (theme === 'dark') return "Dark";
    return "System";
  };

  const themeOptions = [
    { value: 'light', label: 'Light', icon: Sun, description: 'Always use light theme' },
    { value: 'dark', label: 'Dark', icon: Moon, description: 'Always use dark theme' },
    { value: 'system', label: 'System', icon: Monitor, description: 'Use system preference' },
  ] as const;

  // Quick cycle for icon variant
  const cycleTheme = () => {
    if (theme === 'system') {
      setTheme('light');
    } else if (theme === 'light') {
      setTheme('dark');
    } else {
      setTheme('system');
    }
  };

  // Icon-only variant (cycling button)
  if (variant === 'icon') {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={cycleTheme}
        className="h-8 w-8 transition-all duration-200 hover:bg-accent/50"
        title={`Current: ${getThemeLabel()}${theme === 'system' ? ` (${effectiveTheme})` : ''}`}
      >
        <span className="transition-transform duration-200 hover:scale-110">
          {getIcon()}
        </span>
      </Button>
    );
  }

  // Compact variant (smaller dropdown)
  if (variant === 'compact') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 transition-all duration-200 hover:bg-accent/50"
          >
            <span className="transition-transform duration-200">
              {getIcon()}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-32">
          {themeOptions.map((option) => {
            const Icon = option.icon;
            const isSelected = theme === option.value;
            
            return (
              <DropdownMenuItem
                key={option.value}
                onClick={() => setTheme(option.value)}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1">{option.label}</span>
                {isSelected && (
                  <Check className="h-3 w-3 text-primary" />
                )}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Full button variant (default)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "transition-all duration-200 hover:bg-accent/50 group",
            showLabel ? "h-8 gap-2" : "h-8 w-8 p-0"
          )}
        >
          <span className="transition-transform duration-200 group-hover:scale-110">
            {getIcon()}
          </span>
          {showLabel && (
            <>
              <span className="text-sm font-medium">
                {getThemeLabel()}
              </span>
              <ChevronDown className="h-3 w-3 transition-transform duration-200 group-data-[state=open]:rotate-180" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
          Theme Settings
        </div>
        <DropdownMenuSeparator />
        {themeOptions.map((option) => {
          const Icon = option.icon;
          const isSelected = theme === option.value;
          
          return (
            <DropdownMenuItem
              key={option.value}
              onClick={() => setTheme(option.value)}
              className="flex items-start gap-3 cursor-pointer py-3"
            >
              <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{option.label}</span>
                  {isSelected && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {option.description}
                </p>
                {option.value === 'system' && isHydrated && (
                  <p className="text-xs text-muted-foreground">
                    Currently: <span className="font-medium">{effectiveTheme}</span>
                  </p>
                )}
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Export variants as separate components for convenience
export const ThemeToggleIcon = () => <ThemeToggleImproved variant="icon" />;
export const ThemeToggleCompact = () => <ThemeToggleImproved variant="compact" />;
export const ThemeToggleButton = ({ showLabel = true }: { showLabel?: boolean }) => 
  <ThemeToggleImproved variant="button" showLabel={showLabel} />;
