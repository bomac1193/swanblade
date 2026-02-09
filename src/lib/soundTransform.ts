/**
 * Sound Transform - Audio-to-Audio Transformation
 *
 * Transform existing audio using AI models:
 * - Style transfer (change genre, mood)
 * - Timbre transformation (change instrument character)
 * - Rhythm preservation (keep timing, change everything else)
 * - Pitch/melody extraction and reimagining
 */

import type { TransformRequest, TransformResult, SoundGeneration } from "@/types";

// ==================== Transform Types ====================

export type TransformMode =
  | "style_transfer"
  | "timbre_morph"
  | "rhythm_extract"
  | "melody_reimagine"
  | "texture_evolve"
  | "reverse_engineer";

export interface TransformPreset {
  id: string;
  name: string;
  description: string;
  mode: TransformMode;
  preserveRhythm: boolean;
  preservePitch: boolean;
  preserveTimbre: boolean;
  transformStrength: number;
  promptSuffix: string;
}

export const TRANSFORM_PRESETS: TransformPreset[] = [
  {
    id: "genre_shift",
    name: "Genre Shift",
    description: "Transform to a different musical genre",
    mode: "style_transfer",
    preserveRhythm: true,
    preservePitch: true,
    preserveTimbre: false,
    transformStrength: 0.7,
    promptSuffix: "reimagined in a different genre while keeping the core melody",
  },
  {
    id: "instrument_swap",
    name: "Instrument Swap",
    description: "Replace instruments while keeping the music",
    mode: "timbre_morph",
    preserveRhythm: true,
    preservePitch: true,
    preserveTimbre: false,
    transformStrength: 0.8,
    promptSuffix: "with completely different instrumentation",
  },
  {
    id: "rhythm_to_melody",
    name: "Rhythm to Melody",
    description: "Extract rhythm, generate new melodic content",
    mode: "rhythm_extract",
    preserveRhythm: true,
    preservePitch: false,
    preserveTimbre: false,
    transformStrength: 0.9,
    promptSuffix: "new melodic interpretation based on the rhythm",
  },
  {
    id: "mood_transform",
    name: "Mood Transform",
    description: "Change emotional character",
    mode: "style_transfer",
    preserveRhythm: true,
    preservePitch: false,
    preserveTimbre: true,
    transformStrength: 0.6,
    promptSuffix: "transformed to evoke a different emotional response",
  },
  {
    id: "texture_exploration",
    name: "Texture Exploration",
    description: "Evolve sonic texture while keeping structure",
    mode: "texture_evolve",
    preserveRhythm: true,
    preservePitch: true,
    preserveTimbre: false,
    transformStrength: 0.5,
    promptSuffix: "with evolved, experimental textures",
  },
  {
    id: "deconstruct",
    name: "Deconstruct",
    description: "Break down and rebuild from scratch",
    mode: "reverse_engineer",
    preserveRhythm: false,
    preservePitch: false,
    preserveTimbre: false,
    transformStrength: 1.0,
    promptSuffix: "completely deconstructed and rebuilt",
  },
];

// ==================== Transform Prompt Building ====================

/**
 * Build a transformation prompt from source audio analysis and target description
 */
export function buildTransformPrompt(
  sourceAnalysis: SourceAudioAnalysis,
  request: TransformRequest
): string {
  const parts: string[] = [];

  // Start with target description
  parts.push(`Transform audio: ${request.transformPrompt}`);

  // Add preservation instructions
  const preservations: string[] = [];
  if (request.preserveRhythm) {
    preservations.push(`maintain exact rhythm at ${sourceAnalysis.bpm} BPM`);
  }
  if (request.preservePitch) {
    preservations.push(`preserve pitch relationships in ${sourceAnalysis.key || "original key"}`);
  }
  if (request.preserveTimbre) {
    preservations.push("keep similar timbral qualities");
  }

  if (preservations.length > 0) {
    parts.push(`Important: ${preservations.join(", ")}.`);
  }

  // Add strength indication
  const strength = request.transformStrength ?? 0.7;
  if (strength > 0.8) {
    parts.push("Apply dramatic transformation.");
  } else if (strength > 0.5) {
    parts.push("Apply moderate transformation while respecting source material.");
  } else {
    parts.push("Apply subtle transformation, mostly preserving original character.");
  }

  // Add source context
  parts.push(`Source audio characteristics: ${sourceAnalysis.description}`);

  return parts.join(" ");
}

export interface SourceAudioAnalysis {
  bpm: number;
  key: string | null;
  energy: number;
  description: string;
  duration: number;
}

/**
 * Analyze source audio to extract characteristics for transformation
 */
export async function analyzeSourceAudio(
  audioData: ArrayBuffer,
  starforgeApiUrl: string = "http://localhost:5000"
): Promise<SourceAudioAnalysis> {
  const base64 = Buffer.from(audioData).toString("base64");

  try {
    const response = await fetch(`${starforgeApiUrl}/api/audio/analyze-enhanced`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audio: base64 }),
    });

    if (!response.ok) {
      throw new Error(`Analysis failed: ${await response.text()}`);
    }

    const analysis = await response.json();

    // Build description from analysis
    const descParts: string[] = [];
    if (analysis.genres?.length > 0) {
      descParts.push(analysis.genres.slice(0, 2).join("/"));
    }
    if (analysis.energy > 0.7) {
      descParts.push("high energy");
    } else if (analysis.energy < 0.3) {
      descParts.push("calm, low energy");
    }
    if (analysis.moods?.length > 0) {
      descParts.push(analysis.moods[0]);
    }

    return {
      bpm: analysis.bpm || 120,
      key: analysis.key || null,
      energy: analysis.energy || 0.5,
      description: descParts.join(", ") || "audio content",
      duration: analysis.duration || 10,
    };
  } catch (error) {
    // Return defaults if analysis fails
    console.warn("Source audio analysis failed, using defaults:", error);
    return {
      bpm: 120,
      key: null,
      energy: 0.5,
      description: "uploaded audio",
      duration: 10,
    };
  }
}

// ==================== Transform Providers ====================

export type TransformProvider = "replicate_musicgen" | "audiocraft" | "stable_audio";

export interface TransformProviderConfig {
  id: TransformProvider;
  name: string;
  supportsAudioInput: boolean;
  maxDuration: number;
  description: string;
}

export const TRANSFORM_PROVIDERS: TransformProviderConfig[] = [
  {
    id: "replicate_musicgen",
    name: "MusicGen Melody",
    supportsAudioInput: true,
    maxDuration: 30,
    description: "Uses melody conditioning for style transfer",
  },
  {
    id: "audiocraft",
    name: "AudioCraft",
    supportsAudioInput: true,
    maxDuration: 30,
    description: "Meta's audio generation with melody conditioning",
  },
  {
    id: "stable_audio",
    name: "Stable Audio",
    supportsAudioInput: false,
    maxDuration: 180,
    description: "Text-guided generation (no audio input, uses analysis)",
  },
];

/**
 * Transform audio using MusicGen melody conditioning
 */
export async function transformWithMusicGenMelody(
  sourceAudioBase64: string,
  prompt: string,
  duration: number,
  replicateApiKey: string
): Promise<string> {
  const Replicate = (await import("replicate")).default;
  const replicate = new Replicate({ auth: replicateApiKey });

  // Use MusicGen melody model
  const output = await replicate.run(
    "meta/musicgen:671ac645ce5e552cc63a54a2bbff63fcf798043055d2dac5fc9e36a837eedcfb",
    {
      input: {
        prompt,
        model_version: "melody-large",
        input_audio: `data:audio/wav;base64,${sourceAudioBase64}`,
        duration: Math.min(duration, 30),
        temperature: 1.0,
        top_k: 250,
        top_p: 0.0,
        output_format: "wav",
        continuation: false,
        continuation_start: 0,
        multi_band_diffusion: false,
        normalization_strategy: "peak",
        classifier_free_guidance: 3,
      },
    }
  );

  // Handle output (URL or FileOutput)
  let audioUrl: string;
  if (typeof output === "string") {
    audioUrl = output;
  } else if (Array.isArray(output) && output.length > 0) {
    const first = output[0];
    audioUrl = typeof first === "string" ? first : (first as any).url?.() || (first as any).url;
  } else {
    audioUrl = (output as any).url?.() || (output as any).url;
  }

  // Fetch and convert to base64
  const audioResponse = await fetch(audioUrl);
  const audioBuffer = await audioResponse.arrayBuffer();
  const base64 = Buffer.from(audioBuffer).toString("base64");

  return `data:audio/wav;base64,${base64}`;
}

// ==================== Transform Result Handling ====================

/**
 * Create a SoundGeneration from transform result
 */
export function transformResultToSound(
  result: TransformResult,
  sourceSound: SoundGeneration,
  transformPrompt: string
): SoundGeneration {
  return {
    id: `transform_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: `${sourceSound.name} (Transformed)`,
    prompt: `Transformed from "${sourceSound.name}": ${transformPrompt}`,
    createdAt: new Date().toISOString(),
    type: sourceSound.type,
    moodTags: sourceSound.moodTags,
    lengthSeconds: sourceSound.lengthSeconds,
    bpm: sourceSound.bpm,
    key: sourceSound.key,
    intensity: sourceSound.intensity,
    texture: sourceSound.texture,
    brightness: sourceSound.brightness,
    noisiness: sourceSound.noisiness,
    audioUrl: result.audioUrl,
    status: "ready",
    provenanceCid: result.provenanceCid,
    variantOfId: sourceSound.id,
  };
}

// ==================== Transform History ====================

export interface TransformHistoryEntry {
  id: string;
  sourceSoundId: string;
  resultSoundId: string;
  transformPrompt: string;
  preset?: string;
  mode: TransformMode;
  preserveRhythm: boolean;
  preservePitch: boolean;
  preserveTimbre: boolean;
  transformStrength: number;
  createdAt: string;
}

export class TransformHistoryStore {
  private storageKey = "swanblade_transform_history";

  getAll(): TransformHistoryEntry[] {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem(this.storageKey);
    return stored ? JSON.parse(stored) : [];
  }

  getForSound(sourceSoundId: string): TransformHistoryEntry[] {
    return this.getAll().filter((e) => e.sourceSoundId === sourceSoundId);
  }

  save(entry: TransformHistoryEntry): void {
    const all = this.getAll();
    all.push(entry);
    // Keep only last 100 entries
    const trimmed = all.slice(-100);
    localStorage.setItem(this.storageKey, JSON.stringify(trimmed));
  }

  clear(): void {
    localStorage.removeItem(this.storageKey);
  }
}
