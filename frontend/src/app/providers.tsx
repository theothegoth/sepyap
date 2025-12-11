'use client';

import { ThemeProvider } from "../contexts/ThemeContext";
import Navigation from "../components/Navigation";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <Navigation />
      {children}
    </ThemeProvider>
  );
}

