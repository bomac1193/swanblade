"use client";

import { useState, useCallback, useEffect } from "react";
import type { SoundCategory, GameState } from "@/types";
import type { SoundPalette } from "@/lib/soundPalette";
import type { ProviderId } from "@/components/provider-selector";

const STORAGE_KEY = "swanblade-presets";

export interface GenerationPreset {
  id: string;
  name: string;
  createdAt: string;
  prompt: string;
  provider: ProviderId;
  lengthSeconds: number;
  palette?: SoundPalette | null;
  gameState?: GameState | null;
  type?: SoundCategory;
  tags?: string[];
}

function loadPresets(): GenerationPreset[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function savePresets(presets: GenerationPreset[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
  } catch {
    // Storage full or unavailable
  }
}

// Default presets to start with
const DEFAULT_PRESETS: GenerationPreset[] = [
  {
    id: "default-ambient",
    name: "Ambient Atmosphere",
    createdAt: new Date().toISOString(),
    prompt: "Gentle ambient atmosphere with soft pads and subtle textures",
    provider: "replicate",
    lengthSeconds: 30,
    gameState: "exploration",
  },
  {
    id: "default-combat",
    name: "Intense Combat",
    createdAt: new Date().toISOString(),
    prompt: "Aggressive percussion with driving bass and intense energy",
    provider: "replicate",
    lengthSeconds: 15,
    gameState: "combat",
  },
  {
    id: "default-ui",
    name: "UI Sounds",
    createdAt: new Date().toISOString(),
    prompt: "Clean digital UI click sounds, modern and minimal",
    provider: "elevenlabs",
    lengthSeconds: 5,
    type: "FX",
  },
];

export function usePresets() {
  const [presets, setPresets] = useState<GenerationPreset[]>([]);

  // Load presets on mount
  useEffect(() => {
    const loaded = loadPresets();
    if (loaded.length === 0) {
      // Initialize with defaults
      setPresets(DEFAULT_PRESETS);
      savePresets(DEFAULT_PRESETS);
    } else {
      setPresets(loaded);
    }
  }, []);

  // Save preset
  const savePreset = useCallback((preset: Omit<GenerationPreset, "id" | "createdAt">) => {
    const newPreset: GenerationPreset = {
      ...preset,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };

    setPresets((prev) => {
      const updated = [newPreset, ...prev];
      savePresets(updated);
      return updated;
    });

    return newPreset;
  }, []);

  // Update preset
  const updatePreset = useCallback((id: string, updates: Partial<GenerationPreset>) => {
    setPresets((prev) => {
      const updated = prev.map((p) => (p.id === id ? { ...p, ...updates } : p));
      savePresets(updated);
      return updated;
    });
  }, []);

  // Delete preset
  const deletePreset = useCallback((id: string) => {
    setPresets((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      savePresets(updated);
      return updated;
    });
  }, []);

  // Duplicate preset
  const duplicatePreset = useCallback((id: string) => {
    const original = presets.find((p) => p.id === id);
    if (!original) return null;

    const duplicate: GenerationPreset = {
      ...original,
      id: crypto.randomUUID(),
      name: `${original.name} (Copy)`,
      createdAt: new Date().toISOString(),
    };

    setPresets((prev) => {
      const updated = [duplicate, ...prev];
      savePresets(updated);
      return updated;
    });

    return duplicate;
  }, [presets]);

  return {
    presets,
    savePreset,
    updatePreset,
    deletePreset,
    duplicatePreset,
  };
}
