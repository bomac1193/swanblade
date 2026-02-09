/**
 * Procedural Audio Recipes
 *
 * Define audio generation rules for runtime procedural audio:
 * - Footsteps that never repeat
 * - Evolving ambiences
 * - Randomized UI sounds
 * - Adaptive music layers
 */

// ==================== Core Recipe Types ====================

export interface ProceduralRecipe {
  id: string;
  name: string;
  description: string;
  category: RecipeCategory;
  createdAt: string;
  updatedAt: string;

  // Audio sources
  sources: AudioSource[];

  // Layers and mixing
  layers: RecipeLayer[];

  // Variation rules
  variationRules: VariationRule[];

  // Sequencing
  sequencing: SequencingConfig;

  // Output settings
  output: OutputConfig;

  // Tags for organization
  tags: string[];
}

export type RecipeCategory =
  | "footsteps"
  | "ambience"
  | "ui"
  | "weapon"
  | "impact"
  | "voice"
  | "music"
  | "custom";

// ==================== Audio Sources ====================

export interface AudioSource {
  id: string;
  name: string;
  type: "generated" | "sample" | "reference";

  // For generated sources
  generationPrompt?: string;
  generationParams?: GenerationParams;

  // For sample sources
  sampleUrl?: string;
  sampleLibraryId?: string;

  // Source properties
  duration: number;
  bpm?: number;
  key?: string;

  // Variation potential
  variationRange: VariationRange;
}

export interface GenerationParams {
  type: string;
  intensity: number;
  texture: number;
  brightness: number;
  noisiness: number;
  moodTags: string[];
}

export interface VariationRange {
  pitch: [number, number]; // semitones
  speed: [number, number]; // multiplier
  volume: [number, number]; // 0-1
  filter: [number, number]; // Hz cutoff
}

// ==================== Recipe Layers ====================

export interface RecipeLayer {
  id: string;
  name: string;
  sourceIds: string[];
  role: "primary" | "accent" | "texture" | "transition";

  // Selection rules
  selection: SelectionRule;

  // Processing
  processing: LayerProcessing;

  // Mixing
  volume: number;
  pan: number;
  mute: boolean;
  solo: boolean;

  // Conditions
  conditions: LayerCondition[];
}

export type SelectionRule =
  | { type: "random" }
  | { type: "round_robin" }
  | { type: "weighted"; weights: number[] }
  | { type: "sequential" }
  | { type: "shuffle" }
  | { type: "parameter_mapped"; parameter: string; mapping: [number, number][] };

export interface LayerProcessing {
  pitchShift?: { min: number; max: number; curve: "linear" | "exponential" };
  timeStretch?: { min: number; max: number };
  filter?: { type: "lowpass" | "highpass" | "bandpass"; frequencyRange: [number, number] };
  reverb?: { mix: number; size: number };
  delay?: { time: number; feedback: number; mix: number };
  distortion?: { amount: number };
}

export interface LayerCondition {
  parameter: string;
  operator: ">" | "<" | ">=" | "<=" | "==" | "!=";
  value: number | string;
}

// ==================== Variation Rules ====================

export interface VariationRule {
  id: string;
  name: string;
  target: VariationTarget;
  type: VariationType;
  config: VariationConfig;
  weight: number;
}

export type VariationTarget =
  | { scope: "global" }
  | { scope: "layer"; layerId: string }
  | { scope: "source"; sourceId: string };

export type VariationType =
  | "pitch_humanize"
  | "timing_humanize"
  | "volume_humanize"
  | "parameter_drift"
  | "random_swap"
  | "crossfade_variation"
  | "granular_scatter";

export interface VariationConfig {
  // Common
  amount: number; // 0-1 intensity

  // Pitch humanize
  pitchRange?: number; // cents

  // Timing humanize
  timingRange?: number; // ms

  // Volume humanize
  volumeRange?: number; // dB

  // Parameter drift
  driftSpeed?: number;
  driftRange?: number;

  // Random swap
  swapProbability?: number;

  // Crossfade
  crossfadeDuration?: number;

  // Granular
  grainSize?: number;
  grainDensity?: number;
  scatterRange?: number;
}

// ==================== Sequencing ====================

export interface SequencingConfig {
  mode: SequencingMode;
  tempo?: number;
  timeSignature?: [number, number];

  // Loop settings
  loopEnabled: boolean;
  loopCount?: number; // undefined = infinite

  // Transition settings
  transitionType: "cut" | "crossfade" | "beat_sync";
  transitionDuration: number;

  // Timing
  preDelay: number;
  postDelay: number;

  // Scheduling
  quantize?: "beat" | "bar" | "phrase" | "none";
}

export type SequencingMode =
  | "one_shot"
  | "loop"
  | "random_interval"
  | "triggered"
  | "continuous";

// ==================== Output Config ====================

export interface OutputConfig {
  format: "wav" | "ogg" | "mp3";
  sampleRate: 44100 | 48000 | 96000;
  bitDepth: 16 | 24 | 32;
  channels: 1 | 2;

  // Normalization
  normalize: boolean;
  targetLoudness?: number; // LUFS

  // Limiting
  limiter: boolean;
  limiterThreshold?: number;

  // Export variations
  exportVariationCount?: number;
}

// ==================== Recipe Presets ====================

export const RECIPE_PRESETS: Partial<ProceduralRecipe>[] = [
  {
    name: "Footsteps - Dirt",
    description: "Procedural footsteps on dirt/gravel surface",
    category: "footsteps",
    layers: [
      {
        id: "impact",
        name: "Foot Impact",
        sourceIds: [],
        role: "primary",
        selection: { type: "round_robin" },
        processing: {
          pitchShift: { min: -2, max: 2, curve: "linear" },
        },
        volume: 1.0,
        pan: 0,
        mute: false,
        solo: false,
        conditions: [],
      },
      {
        id: "debris",
        name: "Debris Scatter",
        sourceIds: [],
        role: "texture",
        selection: { type: "random" },
        processing: {
          pitchShift: { min: -4, max: 4, curve: "linear" },
          timeStretch: { min: 0.9, max: 1.1 },
        },
        volume: 0.6,
        pan: 0,
        mute: false,
        solo: false,
        conditions: [],
      },
    ],
    variationRules: [
      {
        id: "humanize",
        name: "Timing Humanize",
        target: { scope: "global" },
        type: "timing_humanize",
        config: { amount: 0.3, timingRange: 20 },
        weight: 1.0,
      },
      {
        id: "pitch_var",
        name: "Pitch Variation",
        target: { scope: "global" },
        type: "pitch_humanize",
        config: { amount: 0.4, pitchRange: 50 },
        weight: 1.0,
      },
    ],
    sequencing: {
      mode: "triggered",
      loopEnabled: false,
      transitionType: "cut",
      transitionDuration: 0,
      preDelay: 0,
      postDelay: 0,
    },
    output: {
      format: "wav",
      sampleRate: 48000,
      bitDepth: 24,
      channels: 2,
      normalize: true,
      targetLoudness: -18,
      limiter: true,
      limiterThreshold: -1,
    },
    tags: ["footsteps", "dirt", "outdoor"],
  },
  {
    name: "Ambient - Forest",
    description: "Evolving forest ambience with birds and wind",
    category: "ambience",
    layers: [
      {
        id: "bed",
        name: "Wind Bed",
        sourceIds: [],
        role: "primary",
        selection: { type: "sequential" },
        processing: {
          filter: { type: "lowpass", frequencyRange: [800, 2000] },
        },
        volume: 0.7,
        pan: 0,
        mute: false,
        solo: false,
        conditions: [],
      },
      {
        id: "birds",
        name: "Bird Calls",
        sourceIds: [],
        role: "accent",
        selection: { type: "random" },
        processing: {
          pitchShift: { min: -3, max: 5, curve: "linear" },
          reverb: { mix: 0.3, size: 0.6 },
        },
        volume: 0.5,
        pan: 0,
        mute: false,
        solo: false,
        conditions: [],
      },
      {
        id: "leaves",
        name: "Rustling Leaves",
        sourceIds: [],
        role: "texture",
        selection: { type: "shuffle" },
        processing: {
          pitchShift: { min: -2, max: 2, curve: "linear" },
        },
        volume: 0.4,
        pan: 0,
        mute: false,
        solo: false,
        conditions: [],
      },
    ],
    variationRules: [
      {
        id: "drift",
        name: "Parameter Drift",
        target: { scope: "global" },
        type: "parameter_drift",
        config: { amount: 0.5, driftSpeed: 0.1, driftRange: 0.3 },
        weight: 1.0,
      },
    ],
    sequencing: {
      mode: "continuous",
      loopEnabled: true,
      transitionType: "crossfade",
      transitionDuration: 2000,
      preDelay: 0,
      postDelay: 0,
    },
    output: {
      format: "ogg",
      sampleRate: 48000,
      bitDepth: 16,
      channels: 2,
      normalize: true,
      targetLoudness: -23,
      limiter: false,
    },
    tags: ["ambience", "forest", "nature", "outdoor"],
  },
  {
    name: "UI - Button Click",
    description: "Randomized UI button click sounds",
    category: "ui",
    layers: [
      {
        id: "click",
        name: "Click Core",
        sourceIds: [],
        role: "primary",
        selection: { type: "weighted", weights: [0.4, 0.3, 0.2, 0.1] },
        processing: {
          pitchShift: { min: -1, max: 1, curve: "linear" },
        },
        volume: 1.0,
        pan: 0,
        mute: false,
        solo: false,
        conditions: [],
      },
    ],
    variationRules: [
      {
        id: "subtle_pitch",
        name: "Subtle Pitch Variation",
        target: { scope: "global" },
        type: "pitch_humanize",
        config: { amount: 0.2, pitchRange: 20 },
        weight: 1.0,
      },
    ],
    sequencing: {
      mode: "one_shot",
      loopEnabled: false,
      transitionType: "cut",
      transitionDuration: 0,
      preDelay: 0,
      postDelay: 0,
    },
    output: {
      format: "wav",
      sampleRate: 44100,
      bitDepth: 16,
      channels: 1,
      normalize: true,
      targetLoudness: -12,
      limiter: true,
      limiterThreshold: -0.5,
    },
    tags: ["ui", "button", "click", "interface"],
  },
  {
    name: "Weapon - Sword Swing",
    description: "Varied sword swing whooshes",
    category: "weapon",
    layers: [
      {
        id: "whoosh",
        name: "Whoosh Core",
        sourceIds: [],
        role: "primary",
        selection: { type: "round_robin" },
        processing: {
          pitchShift: { min: -3, max: 3, curve: "exponential" },
          timeStretch: { min: 0.85, max: 1.15 },
        },
        volume: 1.0,
        pan: 0,
        mute: false,
        solo: false,
        conditions: [],
      },
      {
        id: "air",
        name: "Air Movement",
        sourceIds: [],
        role: "texture",
        selection: { type: "random" },
        processing: {
          filter: { type: "highpass", frequencyRange: [200, 500] },
        },
        volume: 0.3,
        pan: 0,
        mute: false,
        solo: false,
        conditions: [],
      },
    ],
    variationRules: [
      {
        id: "intensity_pitch",
        name: "Intensity-Based Pitch",
        target: { scope: "layer", layerId: "whoosh" },
        type: "pitch_humanize",
        config: { amount: 0.5, pitchRange: 100 },
        weight: 1.0,
      },
    ],
    sequencing: {
      mode: "one_shot",
      loopEnabled: false,
      transitionType: "cut",
      transitionDuration: 0,
      preDelay: 0,
      postDelay: 0,
    },
    output: {
      format: "wav",
      sampleRate: 48000,
      bitDepth: 24,
      channels: 2,
      normalize: true,
      targetLoudness: -14,
      limiter: true,
      limiterThreshold: -1,
    },
    tags: ["weapon", "sword", "melee", "whoosh"],
  },
];

// ==================== Recipe Builder Helpers ====================

/**
 * Create a new empty recipe
 */
export function createEmptyRecipe(
  name: string,
  category: RecipeCategory
): ProceduralRecipe {
  const now = new Date().toISOString();
  return {
    id: `recipe_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name,
    description: "",
    category,
    createdAt: now,
    updatedAt: now,
    sources: [],
    layers: [],
    variationRules: [],
    sequencing: {
      mode: "one_shot",
      loopEnabled: false,
      transitionType: "cut",
      transitionDuration: 0,
      preDelay: 0,
      postDelay: 0,
    },
    output: {
      format: "wav",
      sampleRate: 48000,
      bitDepth: 24,
      channels: 2,
      normalize: true,
      limiter: true,
      limiterThreshold: -1,
    },
    tags: [category],
  };
}

/**
 * Create a recipe from a preset
 */
export function createRecipeFromPreset(
  presetIndex: number,
  customName?: string
): ProceduralRecipe {
  const preset = RECIPE_PRESETS[presetIndex];
  if (!preset) {
    throw new Error(`Preset ${presetIndex} not found`);
  }

  const now = new Date().toISOString();
  return {
    id: `recipe_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: customName || preset.name || "New Recipe",
    description: preset.description || "",
    category: preset.category || "custom",
    createdAt: now,
    updatedAt: now,
    sources: [],
    layers: preset.layers || [],
    variationRules: preset.variationRules || [],
    sequencing: preset.sequencing || {
      mode: "one_shot",
      loopEnabled: false,
      transitionType: "cut",
      transitionDuration: 0,
      preDelay: 0,
      postDelay: 0,
    },
    output: preset.output || {
      format: "wav",
      sampleRate: 48000,
      bitDepth: 24,
      channels: 2,
      normalize: true,
      limiter: true,
      limiterThreshold: -1,
    },
    tags: preset.tags || [],
  };
}

/**
 * Add a layer to a recipe
 */
export function addLayer(
  recipe: ProceduralRecipe,
  layer: Omit<RecipeLayer, "id">
): ProceduralRecipe {
  const newLayer: RecipeLayer = {
    ...layer,
    id: `layer_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  };

  return {
    ...recipe,
    layers: [...recipe.layers, newLayer],
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Add a source to a recipe
 */
export function addSource(
  recipe: ProceduralRecipe,
  source: Omit<AudioSource, "id">
): ProceduralRecipe {
  const newSource: AudioSource = {
    ...source,
    id: `source_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  };

  return {
    ...recipe,
    sources: [...recipe.sources, newSource],
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Add a variation rule to a recipe
 */
export function addVariationRule(
  recipe: ProceduralRecipe,
  rule: Omit<VariationRule, "id">
): ProceduralRecipe {
  const newRule: VariationRule = {
    ...rule,
    id: `rule_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  };

  return {
    ...recipe,
    variationRules: [...recipe.variationRules, newRule],
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Validate a recipe for completeness
 */
export function validateRecipe(recipe: ProceduralRecipe): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check basic requirements
  if (!recipe.name) {
    errors.push("Recipe must have a name");
  }

  if (recipe.sources.length === 0) {
    errors.push("Recipe must have at least one audio source");
  }

  if (recipe.layers.length === 0) {
    errors.push("Recipe must have at least one layer");
  }

  // Check layer-source references
  for (const layer of recipe.layers) {
    if (layer.sourceIds.length === 0) {
      warnings.push(`Layer "${layer.name}" has no sources assigned`);
    }

    for (const sourceId of layer.sourceIds) {
      if (!recipe.sources.find((s) => s.id === sourceId)) {
        errors.push(`Layer "${layer.name}" references non-existent source: ${sourceId}`);
      }
    }
  }

  // Check variation rule targets
  for (const rule of recipe.variationRules) {
    if (rule.target.scope === "layer") {
      const layerId = (rule.target as { scope: "layer"; layerId: string }).layerId;
      if (!recipe.layers.find((l) => l.id === layerId)) {
        errors.push(`Variation rule "${rule.name}" targets non-existent layer: ${layerId}`);
      }
    }
    if (rule.target.scope === "source") {
      const sourceId = (rule.target as { scope: "source"; sourceId: string }).sourceId;
      if (!recipe.sources.find((s) => s.id === sourceId)) {
        errors.push(`Variation rule "${rule.name}" targets non-existent source: ${sourceId}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ==================== Browser Storage ====================

export class RecipeStore {
  private storageKey = "swanblade_recipes";

  getAll(): ProceduralRecipe[] {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem(this.storageKey);
    return stored ? JSON.parse(stored) : [];
  }

  get(id: string): ProceduralRecipe | undefined {
    return this.getAll().find((r) => r.id === id);
  }

  getByCategory(category: RecipeCategory): ProceduralRecipe[] {
    return this.getAll().filter((r) => r.category === category);
  }

  save(recipe: ProceduralRecipe): void {
    const all = this.getAll();
    const existing = all.findIndex((r) => r.id === recipe.id);
    if (existing >= 0) {
      all[existing] = recipe;
    } else {
      all.push(recipe);
    }
    localStorage.setItem(this.storageKey, JSON.stringify(all));
  }

  delete(id: string): void {
    const all = this.getAll().filter((r) => r.id !== id);
    localStorage.setItem(this.storageKey, JSON.stringify(all));
  }

  search(query: string): ProceduralRecipe[] {
    const lowerQuery = query.toLowerCase();
    return this.getAll().filter(
      (r) =>
        r.name.toLowerCase().includes(lowerQuery) ||
        r.description.toLowerCase().includes(lowerQuery) ||
        r.tags.some((t) => t.toLowerCase().includes(lowerQuery))
    );
  }
}
