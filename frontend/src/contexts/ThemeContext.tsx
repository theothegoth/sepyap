'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Initial state: Check if HTML already has 'dark' class (set by inline script)
  // This prevents flash of light mode on page load
  const getInitialTheme = (): Theme => {
    if (typeof window === 'undefined') return 'light';
    try {
      // Check if inline script already set dark class
      if (document.documentElement.classList.contains('dark')) {
        return 'dark';
      }
      // Fallback: check localStorage
      const savedTheme = localStorage.getItem('theme') as Theme;
      if (savedTheme) return savedTheme;
      // Fallback: check system preference
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    } catch (e) {
      // If anything fails, default to light
    }
    return 'light';
  };

  const [theme, setThemeState] = useState<Theme>(getInitialTheme);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Ensure theme is applied (in case inline script didn't run or state is out of sync)
    const savedTheme = localStorage.getItem('theme') as Theme;
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme) {
      setThemeState(savedTheme);
      applyTheme(savedTheme);
    } else if (systemPrefersDark) {
      setThemeState('dark');
      applyTheme('dark');
    } else {
      applyTheme('light');
    }
  }, []);

  const applyTheme = (newTheme: Theme) => {
    const root = document.documentElement;
    if (newTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    if (mounted) {
      localStorage.setItem('theme', newTheme);
    }
    applyTheme(newTheme);
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  };

  // Always provide the context, even before mounting
  // This prevents the "useTheme must be used within a ThemeProvider" error
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

