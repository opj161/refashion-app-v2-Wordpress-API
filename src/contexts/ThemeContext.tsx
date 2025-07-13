"use client";

import type React from 'react';
import { createContext, useContext, useState, useEffect } from 'react';

// 1. Define Types
type Theme = 'light' | 'dark' | 'system';

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isHydrated: boolean;
}

// 2. Create Context
const initialState: ThemeContextType = {
  theme: 'dark',
  setTheme: () => null,
  isHydrated: false,
};

const ThemeContext = createContext<ThemeContextType>(initialState);

// 3. ThemeProvider Component
export function ThemeProvider({
  children,
  defaultTheme = 'dark',
  storageKey = 'theme',
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [isHydrated, setIsHydrated] = useState(false);
  // Effect to mark hydration complete and read from localStorage
  useEffect(() => {
    setIsHydrated(true);
    
    if (typeof window === 'undefined') return;
    
    try {
      const storedTheme = window.localStorage.getItem(storageKey) as Theme | null;
      if (storedTheme && storedTheme !== theme) {
        setThemeState(storedTheme);
      }
    } catch (e) {
      console.warn(`Failed to read theme from localStorage (key: "${storageKey}"):`, e);
    }
  }, [storageKey, theme]);
  // Effect for applying theme and listening to system changes
  useEffect(() => {
    if (typeof window === 'undefined' || !isHydrated) return;

    const root = window.document.documentElement;
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    const darkColor = '#020410'; // from globals.css dark theme --background
    const lightColor = '#f9fafb'; // from globals.css light theme --background

    const applyThemePreference = () => {
      // Remove all theme classes first
      root.classList.remove('light', 'dark');
      if (theme === 'system') {
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (systemPrefersDark) {
          root.classList.add('dark');
          if (themeColorMeta) themeColorMeta.setAttribute('content', darkColor);
        } else {
          root.classList.add('light');
          if (themeColorMeta) themeColorMeta.setAttribute('content', lightColor);
        }
      } else {
        root.classList.add(theme);
        if (themeColorMeta) {
          themeColorMeta.setAttribute('content', theme === 'dark' ? darkColor : lightColor);
        }
      }
    };

    // Apply theme immediately
    applyThemePreference();

    // Listener for system preference changes if theme is 'system'
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', applyThemePreference);
      return () => mediaQuery.removeEventListener('change', applyThemePreference);
    }
  }, [theme, isHydrated]); // Re-run when theme changes or hydration completes

  const setTheme = (newTheme: Theme) => {
    if (typeof window !== 'undefined') {
      try {
        // Store the user's explicit choice ('light', 'dark', or 'system')
        window.localStorage.setItem(storageKey, newTheme);
      } catch (e) {
        console.warn(`Failed to save theme to localStorage (key: "${storageKey}"):`, e);
      }
    }
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isHydrated }}>
      {children}
    </ThemeContext.Provider>
  );
}

// 4. useTheme Hook
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
