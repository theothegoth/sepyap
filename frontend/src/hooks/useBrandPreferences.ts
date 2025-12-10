'use client';

import { useState, useEffect } from 'react';

export interface BrandPreferenceSet {
  id: string;
  name: string;
  includeBrands: string[];
  excludeBrands: string[];
  createdAt: number;
}

const STORAGE_KEY = 'brandPreferences';

export function useBrandPreferences() {
  const [preferenceSets, setPreferenceSets] = useState<BrandPreferenceSet[]>([]);
  const [currentSetId, setCurrentSetId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        setPreferenceSets(data.sets || []);
        setCurrentSetId(data.currentSetId || null);
      }
      setIsLoaded(true);
    } catch (error) {
      console.error('Error loading brand preferences:', error);
      setIsLoaded(true);
    }
  }, []);

  // Save preferences to localStorage
  const saveToStorage = (sets: BrandPreferenceSet[], currentId: string | null) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        sets,
        currentSetId: currentId
      }));
    } catch (error) {
      console.error('Error saving brand preferences:', error);
    }
  };

  // Save current brand selection as a new preference set
  const savePreferenceSet = (name: string, includeBrands: string[], excludeBrands: string[]) => {
    const newSet: BrandPreferenceSet = {
      id: `pref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      includeBrands,
      excludeBrands,
      createdAt: Date.now()
    };
    const updated = [...preferenceSets, newSet];
    setPreferenceSets(updated);
    setCurrentSetId(newSet.id);
    saveToStorage(updated, newSet.id);
    return newSet;
  };

  // Load a preference set
  const loadPreferenceSet = (id: string) => {
    const set = preferenceSets.find(s => s.id === id);
    if (set) {
      setCurrentSetId(id);
      saveToStorage(preferenceSets, id);
      return set;
    }
    return null;
  };

  // Delete a preference set
  const deletePreferenceSet = (id: string) => {
    const updated = preferenceSets.filter(s => s.id !== id);
    setPreferenceSets(updated);
    if (currentSetId === id) {
      setCurrentSetId(null);
    }
    saveToStorage(updated, currentSetId === id ? null : currentSetId);
  };

  // Get current preference set
  const getCurrentSet = (): BrandPreferenceSet | null => {
    if (!currentSetId || !isLoaded) return null;
    return preferenceSets.find(s => s.id === currentSetId) || null;
  };

  // Clear current selection (but keep saved sets)
  const clearCurrent = () => {
    setCurrentSetId(null);
    saveToStorage(preferenceSets, null);
  };

  return {
    preferenceSets,
    currentSetId,
    currentSet: getCurrentSet(),
    isLoaded,
    savePreferenceSet,
    loadPreferenceSet,
    deletePreferenceSet,
    clearCurrent
  };
}

