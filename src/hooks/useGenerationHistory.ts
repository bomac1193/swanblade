"use client";

import { useState, useCallback, useEffect } from "react";
import type { SoundGeneration } from "@/types";

const STORAGE_KEY = "swanblade-generation-history";
const MAX_HISTORY = 20;

export interface GenerationHistoryEntry {
  id: string;
  sound: SoundGeneration;
  timestamp: string;
}

function loadHistory(): GenerationHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveHistory(history: GenerationHistoryEntry[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
  } catch {
    // Storage full or unavailable
  }
}

export function useGenerationHistory() {
  const [history, setHistory] = useState<GenerationHistoryEntry[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  // Load history on mount
  useEffect(() => {
    const loaded = loadHistory();
    setHistory(loaded);
    if (loaded.length > 0) {
      setCurrentIndex(0);
    }
  }, []);

  // Add new generation to history
  const addToHistory = useCallback((sound: SoundGeneration) => {
    if (sound.status !== "ready" || !sound.audioUrl) return;

    const entry: GenerationHistoryEntry = {
      id: crypto.randomUUID(),
      sound,
      timestamp: new Date().toISOString(),
    };

    setHistory((prev) => {
      // Remove any entries after current index (discard redo stack)
      const trimmed = currentIndex >= 0 ? prev.slice(currentIndex) : prev;
      const newHistory = [entry, ...trimmed].slice(0, MAX_HISTORY);
      saveHistory(newHistory);
      return newHistory;
    });
    setCurrentIndex(0);
  }, [currentIndex]);

  // Navigate history
  const canUndo = currentIndex < history.length - 1;
  const canRedo = currentIndex > 0;

  const undo = useCallback(() => {
    if (!canUndo) return null;
    const newIndex = currentIndex + 1;
    setCurrentIndex(newIndex);
    return history[newIndex]?.sound ?? null;
  }, [canUndo, currentIndex, history]);

  const redo = useCallback(() => {
    if (!canRedo) return null;
    const newIndex = currentIndex - 1;
    setCurrentIndex(newIndex);
    return history[newIndex]?.sound ?? null;
  }, [canRedo, currentIndex, history]);

  // Get specific entry
  const getEntry = useCallback((index: number) => {
    return history[index] ?? null;
  }, [history]);

  // Go to specific entry
  const goTo = useCallback((index: number) => {
    if (index < 0 || index >= history.length) return null;
    setCurrentIndex(index);
    return history[index]?.sound ?? null;
  }, [history]);

  // Clear history
  const clearHistory = useCallback(() => {
    setHistory([]);
    setCurrentIndex(-1);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    history,
    currentIndex,
    currentEntry: history[currentIndex] ?? null,
    addToHistory,
    canUndo,
    canRedo,
    undo,
    redo,
    getEntry,
    goTo,
    clearHistory,
    count: history.length,
  };
}
