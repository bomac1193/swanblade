/**
 * Sound Palette System
 *
 * Define aesthetic constraints for consistent sound generation
 */

export interface SoundPalette {
  id: string;
  name: string;
  description: string;
  createdAt: string;

  // Constraints (null = no constraint)
  constraints: {
    bpmRange: [number, number] | null;
    energyRange: [number, number] | null;
    textureRange: [number, number] | null;
    brightnessRange: [number, number] | null;
    noisinessRange: [number, number] | null;
    valenceRange: [number, number] | null;
  };

  // Style guidance
  genres: string[];
  moods: string[];
  keywords: string[];

  // Reference DNA IDs (sounds that define this palette)
  referenceDnaIds: string[];

  // Provenance
  identityId?: string;
}

export interface PaletteValidation {
  valid: boolean;
  violations: string[];
  suggestions: string[];
}

/**
 * Built-in palette presets
 */
export const PALETTE_PRESETS: Record<string, Omit<SoundPalette, "id" | "createdAt">> = {
  "dark-electronic": {
    name: "Dark Electronic",
    description: "Moody, atmospheric electronic with heavy bass and minimal highs",
    constraints: {
      bpmRange: [100, 140],
      energyRange: [40, 80],
      textureRange: [50, 90],
      brightnessRange: [10, 40],
      noisinessRange: [20, 60],
      valenceRange: [10, 40],
    },
    genres: ["Electronic", "Dark Ambient", "Industrial"],
    moods: ["Dark", "Atmospheric", "Intense"],
    keywords: ["bass-heavy", "analog", "gritty", "reverb"],
    referenceDnaIds: [],
  },

  "uplifting-pop": {
    name: "Uplifting Pop",
    description: "Bright, energetic pop with clear production and positive vibes",
    constraints: {
      bpmRange: [110, 130],
      energyRange: [60, 90],
      textureRange: [60, 85],
      brightnessRange: [60, 90],
      noisinessRange: [5, 25],
      valenceRange: [70, 100],
    },
    genres: ["Pop", "Dance Pop", "Electro Pop"],
    moods: ["Happy", "Energetic", "Uplifting"],
    keywords: ["polished", "catchy", "bright", "clean"],
    referenceDnaIds: [],
  },

  "cinematic-epic": {
    name: "Cinematic Epic",
    description: "Orchestral, dramatic scoring with dynamic range",
    constraints: {
      bpmRange: [80, 120],
      energyRange: [50, 95],
      textureRange: [70, 100],
      brightnessRange: [40, 70],
      noisinessRange: [5, 30],
      valenceRange: [30, 70],
    },
    genres: ["Orchestral", "Cinematic", "Epic"],
    moods: ["Epic", "Dramatic", "Powerful"],
    keywords: ["orchestral", "sweeping", "dramatic", "layered"],
    referenceDnaIds: [],
  },

  "lo-fi-chill": {
    name: "Lo-Fi Chill",
    description: "Relaxed, warm beats with vinyl texture and mellow vibes",
    constraints: {
      bpmRange: [70, 95],
      energyRange: [20, 50],
      textureRange: [40, 70],
      brightnessRange: [20, 50],
      noisinessRange: [30, 60],
      valenceRange: [40, 70],
    },
    genres: ["Lo-Fi", "Chillhop", "Jazz Hop"],
    moods: ["Relaxed", "Nostalgic", "Warm"],
    keywords: ["vinyl", "dusty", "mellow", "jazzy"],
    referenceDnaIds: [],
  },

  "aggressive-gaming": {
    name: "Aggressive Gaming",
    description: "High-energy, intense music for action games",
    constraints: {
      bpmRange: [130, 180],
      energyRange: [75, 100],
      textureRange: [60, 95],
      brightnessRange: [50, 80],
      noisinessRange: [30, 70],
      valenceRange: [30, 60],
    },
    genres: ["Electronic", "Metal", "Dubstep"],
    moods: ["Aggressive", "Intense", "Powerful"],
    keywords: ["driving", "heavy", "distorted", "fast"],
    referenceDnaIds: [],
  },

  "ambient-exploration": {
    name: "Ambient Exploration",
    description: "Atmospheric, spacious soundscapes for exploration and discovery",
    constraints: {
      bpmRange: [60, 100],
      energyRange: [10, 40],
      textureRange: [30, 70],
      brightnessRange: [30, 60],
      noisinessRange: [10, 40],
      valenceRange: [40, 70],
    },
    genres: ["Ambient", "Atmospheric", "Drone"],
    moods: ["Mysterious", "Calm", "Wonder"],
    keywords: ["spacious", "ethereal", "floating", "subtle"],
    referenceDnaIds: [],
  },
};

/**
 * Create a new palette from a preset
 */
export function createPaletteFromPreset(
  presetId: keyof typeof PALETTE_PRESETS
): SoundPalette {
  const preset = PALETTE_PRESETS[presetId];
  if (!preset) {
    throw new Error(`Unknown preset: ${presetId}`);
  }

  return {
    id: `palette_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    ...preset,
  };
}

/**
 * Create a palette from Sound DNA (average of multiple DNAs)
 */
export function createPaletteFromDNA(
  dnas: Array<{ dna: import("./soundDna").SoundDNA; weight?: number }>,
  name: string,
  tolerance: number = 15 // How much variance to allow
): SoundPalette {
  if (dnas.length === 0) {
    throw new Error("Need at least one DNA to create palette");
  }

  // Calculate weighted averages
  let totalWeight = 0;
  const sums = {
    bpm: 0,
    energy: 0,
    texture: 0,
    brightness: 0,
    noisiness: 0,
    valence: 0,
  };

  for (const { dna, weight = 1 } of dnas) {
    totalWeight += weight;
    sums.bpm += dna.bpm * weight;
    sums.energy += dna.energy * weight;
    sums.texture += dna.texture * weight;
    sums.brightness += dna.brightness * weight;
    sums.noisiness += dna.noisiness * weight;
    sums.valence += dna.valence * weight;
  }

  const avg = {
    bpm: Math.round(sums.bpm / totalWeight),
    energy: Math.round(sums.energy / totalWeight),
    texture: Math.round(sums.texture / totalWeight),
    brightness: Math.round(sums.brightness / totalWeight),
    noisiness: Math.round(sums.noisiness / totalWeight),
    valence: Math.round(sums.valence / totalWeight),
  };

  // Collect unique genres and moods
  const allGenres = new Set<string>();
  const allMoods = new Set<string>();
  for (const { dna } of dnas) {
    dna.genres.forEach((g) => allGenres.add(g));
    dna.moods.forEach((m) => allMoods.add(m));
  }

  return {
    id: `palette_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name,
    description: `Custom palette from ${dnas.length} reference sounds`,
    createdAt: new Date().toISOString(),
    constraints: {
      bpmRange: [Math.max(60, avg.bpm - 15), Math.min(200, avg.bpm + 15)],
      energyRange: [
        Math.max(0, avg.energy - tolerance),
        Math.min(100, avg.energy + tolerance),
      ],
      textureRange: [
        Math.max(0, avg.texture - tolerance),
        Math.min(100, avg.texture + tolerance),
      ],
      brightnessRange: [
        Math.max(0, avg.brightness - tolerance),
        Math.min(100, avg.brightness + tolerance),
      ],
      noisinessRange: [
        Math.max(0, avg.noisiness - tolerance),
        Math.min(100, avg.noisiness + tolerance),
      ],
      valenceRange: [
        Math.max(0, avg.valence - tolerance),
        Math.min(100, avg.valence + tolerance),
      ],
    },
    genres: Array.from(allGenres).slice(0, 5),
    moods: Array.from(allMoods).slice(0, 5),
    keywords: [],
    referenceDnaIds: dnas.map(({ dna }) => dna.id),
  };
}

/**
 * Validate generation parameters against a palette
 */
export function validateAgainstPalette(
  params: {
    bpm?: number;
    intensity?: number;
    texture?: number;
    brightness?: number;
    noisiness?: number;
  },
  palette: SoundPalette
): PaletteValidation {
  const violations: string[] = [];
  const suggestions: string[] = [];
  const { constraints } = palette;

  // Check BPM
  if (params.bpm && constraints.bpmRange) {
    if (params.bpm < constraints.bpmRange[0]) {
      violations.push(`BPM ${params.bpm} is below palette minimum ${constraints.bpmRange[0]}`);
      suggestions.push(`Set BPM to ${constraints.bpmRange[0]}`);
    } else if (params.bpm > constraints.bpmRange[1]) {
      violations.push(`BPM ${params.bpm} is above palette maximum ${constraints.bpmRange[1]}`);
      suggestions.push(`Set BPM to ${constraints.bpmRange[1]}`);
    }
  }

  // Check energy/intensity
  if (params.intensity && constraints.energyRange) {
    if (params.intensity < constraints.energyRange[0]) {
      violations.push(`Intensity ${params.intensity} is below palette minimum`);
      suggestions.push(`Increase intensity to ${constraints.energyRange[0]}`);
    } else if (params.intensity > constraints.energyRange[1]) {
      violations.push(`Intensity ${params.intensity} is above palette maximum`);
      suggestions.push(`Decrease intensity to ${constraints.energyRange[1]}`);
    }
  }

  // Check texture
  if (params.texture && constraints.textureRange) {
    if (params.texture < constraints.textureRange[0] || params.texture > constraints.textureRange[1]) {
      violations.push(`Texture ${params.texture} is outside palette range`);
      const mid = Math.round((constraints.textureRange[0] + constraints.textureRange[1]) / 2);
      suggestions.push(`Set texture to ${mid}`);
    }
  }

  // Check brightness
  if (params.brightness && constraints.brightnessRange) {
    if (params.brightness < constraints.brightnessRange[0] || params.brightness > constraints.brightnessRange[1]) {
      violations.push(`Brightness ${params.brightness} is outside palette range`);
      const mid = Math.round((constraints.brightnessRange[0] + constraints.brightnessRange[1]) / 2);
      suggestions.push(`Set brightness to ${mid}`);
    }
  }

  return {
    valid: violations.length === 0,
    violations,
    suggestions,
  };
}

/**
 * Apply palette constraints to generation parameters
 */
export function applyPaletteConstraints(
  params: {
    bpm?: number;
    intensity?: number;
    texture?: number;
    brightness?: number;
    noisiness?: number;
    moodTags?: string[];
  },
  palette: SoundPalette
): typeof params {
  const { constraints } = palette;
  const result = { ...params };

  // Clamp BPM
  if (constraints.bpmRange) {
    result.bpm = Math.max(
      constraints.bpmRange[0],
      Math.min(constraints.bpmRange[1], result.bpm || (constraints.bpmRange[0] + constraints.bpmRange[1]) / 2)
    );
  }

  // Clamp intensity
  if (constraints.energyRange) {
    result.intensity = Math.max(
      constraints.energyRange[0],
      Math.min(constraints.energyRange[1], result.intensity || (constraints.energyRange[0] + constraints.energyRange[1]) / 2)
    );
  }

  // Clamp texture
  if (constraints.textureRange) {
    result.texture = Math.max(
      constraints.textureRange[0],
      Math.min(constraints.textureRange[1], result.texture || (constraints.textureRange[0] + constraints.textureRange[1]) / 2)
    );
  }

  // Clamp brightness
  if (constraints.brightnessRange) {
    result.brightness = Math.max(
      constraints.brightnessRange[0],
      Math.min(constraints.brightnessRange[1], result.brightness || (constraints.brightnessRange[0] + constraints.brightnessRange[1]) / 2)
    );
  }

  // Clamp noisiness
  if (constraints.noisinessRange) {
    result.noisiness = Math.max(
      constraints.noisinessRange[0],
      Math.min(constraints.noisinessRange[1], result.noisiness || (constraints.noisinessRange[0] + constraints.noisinessRange[1]) / 2)
    );
  }

  // Add palette moods to tags
  result.moodTags = [...(result.moodTags || []), ...palette.moods, ...palette.genres.slice(0, 2)];

  return result;
}

/**
 * Generate prompt suffix from palette
 */
export function paletteToPromptSuffix(palette: SoundPalette): string {
  const parts: string[] = [];

  // Genres
  if (palette.genres.length > 0) {
    parts.push(palette.genres.slice(0, 2).join(" "));
  }

  // Moods
  if (palette.moods.length > 0) {
    parts.push(palette.moods.slice(0, 2).join(", "));
  }

  // Keywords
  if (palette.keywords.length > 0) {
    parts.push(palette.keywords.slice(0, 3).join(", "));
  }

  // Constraints as descriptors
  const { constraints } = palette;
  if (constraints.energyRange) {
    const avgEnergy = (constraints.energyRange[0] + constraints.energyRange[1]) / 2;
    if (avgEnergy > 70) parts.push("high energy");
    else if (avgEnergy < 30) parts.push("calm, low energy");
  }

  if (constraints.brightnessRange) {
    const avgBright = (constraints.brightnessRange[0] + constraints.brightnessRange[1]) / 2;
    if (avgBright > 70) parts.push("bright");
    else if (avgBright < 30) parts.push("dark, warm");
  }

  return parts.join(", ");
}

/**
 * Local storage for palettes (browser-side)
 */
export class SoundPaletteStore {
  private storageKey = "swanblade_palettes";

  getAll(): SoundPalette[] {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem(this.storageKey);
    return stored ? JSON.parse(stored) : [];
  }

  get(id: string): SoundPalette | undefined {
    return this.getAll().find((p) => p.id === id);
  }

  save(palette: SoundPalette): void {
    const all = this.getAll();
    const existing = all.findIndex((p) => p.id === palette.id);
    if (existing >= 0) {
      all[existing] = palette;
    } else {
      all.push(palette);
    }
    localStorage.setItem(this.storageKey, JSON.stringify(all));
  }

  delete(id: string): void {
    const all = this.getAll().filter((p) => p.id !== id);
    localStorage.setItem(this.storageKey, JSON.stringify(all));
  }
}
