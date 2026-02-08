/**
 * Stem Generator - Adaptive Stem Bundle Generation
 *
 * Generates coherent multi-stem audio bundles for game integration
 */

import type { SoundPalette } from "./soundPalette";
import type { GameState, GameStateConfig, GAME_STATE_CONFIGS } from "./gameStateEngine";

export interface StemType {
  id: string;
  name: string;
  description: string;
  role: "foundation" | "accent" | "atmosphere" | "transition";
}

export const STEM_TYPES: Record<string, StemType> = {
  drums: {
    id: "drums",
    name: "Drums",
    description: "Rhythmic foundation - kicks, snares, hi-hats",
    role: "foundation",
  },
  bass: {
    id: "bass",
    name: "Bass",
    description: "Low-frequency foundation - basslines, sub bass",
    role: "foundation",
  },
  melody: {
    id: "melody",
    name: "Melody",
    description: "Melodic elements - leads, arpeggios, motifs",
    role: "accent",
  },
  harmony: {
    id: "harmony",
    name: "Harmony",
    description: "Harmonic support - pads, chords, drones",
    role: "atmosphere",
  },
  atmosphere: {
    id: "atmosphere",
    name: "Atmosphere",
    description: "Ambient textures - pads, soundscapes, noise",
    role: "atmosphere",
  },
  fx: {
    id: "fx",
    name: "FX",
    description: "Sound effects - risers, impacts, transitions",
    role: "transition",
  },
  vocals: {
    id: "vocals",
    name: "Vocals",
    description: "Vocal elements - choirs, chants, processed vocals",
    role: "accent",
  },
};

export interface StemRequest {
  stemType: string;
  prompt: string;
  duration: number;
  bpm?: number;
  key?: string;
  intensity?: number;
}

export interface StemResult {
  stemType: string;
  audioUrl: string;
  provenanceCid?: string;
  duration: number;
  metadata: {
    bpm?: number;
    key?: string;
    intensity?: number;
  };
}

export interface StemBundle {
  id: string;
  name: string;
  gameState: GameState;
  paletteId?: string;
  createdAt: string;
  stems: StemResult[];
  manifest: BundleManifest;
}

export interface BundleManifest {
  version: "1.0";
  gameState: GameState;
  palette?: string;
  bpm: number;
  key: string;
  duration: number;
  stems: Array<{
    type: string;
    filename: string;
    role: StemType["role"];
    provenanceCid?: string;
  }>;
  provenance: {
    generator: "swanblade";
    timestamp: string;
    identityId?: string;
  };
}

export interface StemBundleRequest {
  gameState: GameState;
  palette?: SoundPalette;
  stemTypes: string[];
  duration: number;
  bpm?: number;
  key?: string;
  basePrompt?: string;
}

/**
 * Build stem-specific prompts based on game state and palette
 */
export function buildStemPrompts(
  request: StemBundleRequest,
  stateConfig: (typeof GAME_STATE_CONFIGS)[GameState]
): StemRequest[] {
  const { gameState, palette, stemTypes, duration, bpm, key } = request;

  // Get effective BPM and key from palette or request
  const effectiveBpm = bpm ?? palette?.constraints.bpmRange?.[0] ?? stateConfig.modifiers.bpmOffset + 100;
  const effectiveKey = key ?? "C Minor";

  // Build base context from game state
  const stateContext = stateConfig.promptKeywords.slice(0, 3).join(", ");
  const paletteContext = palette ? `, ${palette.moods.slice(0, 2).join(", ")}` : "";

  const stemRequests: StemRequest[] = [];

  for (const stemType of stemTypes) {
    const stem = STEM_TYPES[stemType];
    if (!stem) continue;

    // Build stem-specific prompt
    let prompt = "";

    switch (stemType) {
      case "drums":
        prompt = `${effectiveBpm} BPM ${stateContext} drums, ${stem.description}${paletteContext}`;
        if (stateConfig.modifiers.energyOffset > 20) {
          prompt += ", driving, punchy";
        } else if (stateConfig.modifiers.energyOffset < -10) {
          prompt += ", subtle, minimal";
        }
        break;

      case "bass":
        prompt = `${effectiveBpm} BPM ${stateContext} bassline in ${effectiveKey}${paletteContext}`;
        if (stateConfig.modifiers.energyOffset > 20) {
          prompt += ", aggressive, heavy";
        } else {
          prompt += ", smooth, supportive";
        }
        break;

      case "melody":
        prompt = `${stateContext} melody in ${effectiveKey}, ${stem.description}${paletteContext}`;
        break;

      case "harmony":
        prompt = `${stateContext} harmonic pads in ${effectiveKey}${paletteContext}`;
        break;

      case "atmosphere":
        prompt = `${stateContext} ambient texture, ${stem.description}${paletteContext}`;
        break;

      case "fx":
        prompt = `${stateContext} sound effects, risers, impacts${paletteContext}`;
        break;

      case "vocals":
        prompt = `${stateContext} vocal elements, choirs, wordless${paletteContext}`;
        break;

      default:
        prompt = `${stateContext} ${stemType}${paletteContext}`;
    }

    // Add base prompt if provided
    if (request.basePrompt) {
      prompt = `${request.basePrompt}, ${prompt}`;
    }

    stemRequests.push({
      stemType,
      prompt,
      duration,
      bpm: effectiveBpm,
      key: effectiveKey,
      intensity: 50 + stateConfig.modifiers.energyOffset,
    });
  }

  return stemRequests;
}

/**
 * Generate a bundle manifest
 */
export function createBundleManifest(
  bundle: Omit<StemBundle, "manifest">,
  identityId?: string
): BundleManifest {
  // Find common BPM and key from stems
  const bpm = bundle.stems[0]?.metadata.bpm ?? 120;
  const key = bundle.stems[0]?.metadata.key ?? "C Minor";
  const duration = bundle.stems[0]?.duration ?? 30;

  return {
    version: "1.0",
    gameState: bundle.gameState,
    palette: bundle.paletteId,
    bpm,
    key,
    duration,
    stems: bundle.stems.map((stem) => ({
      type: stem.stemType,
      filename: `${stem.stemType}.wav`,
      role: STEM_TYPES[stem.stemType]?.role ?? "accent",
      provenanceCid: stem.provenanceCid,
    })),
    provenance: {
      generator: "swanblade",
      timestamp: bundle.createdAt,
      identityId,
    },
  };
}

/**
 * Get default stems for a game state
 */
export function getDefaultStemsForState(gameState: GameState): string[] {
  const defaultsByState: Record<GameState, string[]> = {
    menu: ["atmosphere", "melody", "harmony"],
    exploration: ["atmosphere", "melody", "bass"],
    combat: ["drums", "bass", "melody", "fx"],
    boss: ["drums", "bass", "melody", "harmony", "fx", "vocals"],
    victory: ["drums", "melody", "harmony", "fx"],
    defeat: ["atmosphere", "harmony"],
    stealth: ["atmosphere", "bass"],
    ambient: ["atmosphere", "harmony"],
    tension: ["atmosphere", "bass", "fx"],
    chase: ["drums", "bass", "fx"],
    cutscene: ["melody", "harmony", "atmosphere", "vocals"],
    credits: ["melody", "harmony", "atmosphere"],
  };

  return defaultsByState[gameState] ?? ["melody", "harmony", "atmosphere"];
}

/**
 * Validate stem bundle for completeness
 */
export function validateBundle(bundle: StemBundle): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check minimum stems
  if (bundle.stems.length === 0) {
    errors.push("Bundle has no stems");
  }

  // Check foundation stems for rhythmic states
  const rhythmicStates: GameState[] = ["combat", "boss", "chase", "victory"];
  if (rhythmicStates.includes(bundle.gameState)) {
    const hasDrums = bundle.stems.some((s) => s.stemType === "drums");
    if (!hasDrums) {
      warnings.push(`${bundle.gameState} state typically includes drums`);
    }
  }

  // Check for missing provenance
  const missingProvenance = bundle.stems.filter((s) => !s.provenanceCid);
  if (missingProvenance.length > 0) {
    warnings.push(`${missingProvenance.length} stems missing provenance CID`);
  }

  // Check duration consistency
  const durations = bundle.stems.map((s) => s.duration);
  const uniqueDurations = new Set(durations);
  if (uniqueDurations.size > 1) {
    warnings.push("Stems have inconsistent durations - may cause sync issues");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Browser-side storage for stem bundles
 */
export class StemBundleStore {
  private storageKey = "swanblade_stem_bundles";

  getAll(): StemBundle[] {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem(this.storageKey);
    return stored ? JSON.parse(stored) : [];
  }

  get(id: string): StemBundle | undefined {
    return this.getAll().find((b) => b.id === id);
  }

  getByGameState(gameState: GameState): StemBundle[] {
    return this.getAll().filter((b) => b.gameState === gameState);
  }

  save(bundle: StemBundle): void {
    const all = this.getAll();
    const existing = all.findIndex((b) => b.id === bundle.id);
    if (existing >= 0) {
      all[existing] = bundle;
    } else {
      all.push(bundle);
    }
    localStorage.setItem(this.storageKey, JSON.stringify(all));
  }

  delete(id: string): void {
    const all = this.getAll().filter((b) => b.id !== id);
    localStorage.setItem(this.storageKey, JSON.stringify(all));
  }
}
