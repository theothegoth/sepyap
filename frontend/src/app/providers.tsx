'use client';

import { LanguageProvider } from "../contexts/LanguageContext";
import { ThemeProvider } from "../contexts/ThemeContext";
import Navigation from "../components/Navigation";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <Navigation />
        {children}
      </LanguageProvider>
    </ThemeProvider>
  );
}

