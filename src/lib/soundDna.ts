/**
 * Sound DNA Extraction
 *
 * Extract sonic characteristics from audio to match future generations
 */

export interface SoundDNA {
  id: string;
  name: string;
  extractedAt: string;

  // Core characteristics
  bpm: number;
  key: string | null;
  energy: number; // 0-100
  valence: number; // 0-100 (negative to positive mood)

  // Timbral qualities
  brightness: number; // 0-100
  warmth: number; // 0-100
  texture: number; // 0-100 (sparse to dense)
  noisiness: number; // 0-100

  // Spectral balance
  bassPresence: number; // 0-100
  midPresence: number; // 0-100
  highPresence: number; // 0-100

  // Style
  genres: string[];
  moods: string[];

  // Source
  sourceType: "upload" | "generation" | "reference";
  sourceUrl?: string;
  fingerprint?: string;
}

export interface DNAMatchResult {
  similarity: number; // 0-1
  matchedFeatures: string[];
  divergentFeatures: string[];
}

/**
 * Extract Sound DNA from audio file via Starforge API
 */
export async function extractSoundDNA(
  audioData: ArrayBuffer,
  name: string,
  starforgeApiUrl: string = "http://localhost:5000"
): Promise<SoundDNA> {
  // Convert to base64 for API
  const base64 = Buffer.from(audioData).toString("base64");

  // Call Starforge audio analysis endpoint
  const response = await fetch(`${starforgeApiUrl}/api/audio/analyze-enhanced`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      audio: base64,
      filename: name,
    }),
  });

  if (!response.ok) {
    throw new Error(`DNA extraction failed: ${await response.text()}`);
  }

  const analysis = await response.json();

  // Map Starforge analysis to Sound DNA format
  return {
    id: `dna_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name,
    extractedAt: new Date().toISOString(),

    bpm: analysis.bpm || 120,
    key: analysis.key || null,
    energy: Math.round((analysis.energy || 0.5) * 100),
    valence: Math.round((analysis.valence || 0.5) * 100),

    brightness: Math.round((analysis.brightness || 0.5) * 100),
    warmth: Math.round((1 - (analysis.brightness || 0.5)) * 100), // Inverse of brightness
    texture: Math.round((analysis.texture || 0.5) * 100),
    noisiness: Math.round((analysis.noisiness || 0.2) * 100),

    bassPresence: Math.round((analysis.spectral?.bass || 0.5) * 100),
    midPresence: Math.round((analysis.spectral?.mid || 0.5) * 100),
    highPresence: Math.round((analysis.spectral?.high || 0.5) * 100),

    genres: analysis.genres || [],
    moods: analysis.moods || [],

    sourceType: "upload",
    fingerprint: analysis.fingerprint,
  };
}

/**
 * Compare two Sound DNAs and return similarity score
 */
export function compareDNA(dna1: SoundDNA, dna2: SoundDNA): DNAMatchResult {
  const features = [
    { name: "bpm", weight: 0.15, tolerance: 10 },
    { name: "energy", weight: 0.15, tolerance: 20 },
    { name: "brightness", weight: 0.1, tolerance: 20 },
    { name: "texture", weight: 0.1, tolerance: 20 },
    { name: "bassPresence", weight: 0.1, tolerance: 20 },
    { name: "midPresence", weight: 0.1, tolerance: 20 },
    { name: "highPresence", weight: 0.1, tolerance: 20 },
    { name: "valence", weight: 0.1, tolerance: 25 },
    { name: "warmth", weight: 0.1, tolerance: 20 },
  ];

  let totalScore = 0;
  const matchedFeatures: string[] = [];
  const divergentFeatures: string[] = [];

  for (const feature of features) {
    const val1 = (dna1 as any)[feature.name] as number;
    const val2 = (dna2 as any)[feature.name] as number;

    if (val1 === undefined || val2 === undefined) continue;

    const diff = Math.abs(val1 - val2);
    const normalizedDiff = Math.min(diff / feature.tolerance, 1);
    const featureScore = (1 - normalizedDiff) * feature.weight;

    totalScore += featureScore;

    if (normalizedDiff < 0.5) {
      matchedFeatures.push(feature.name);
    } else {
      divergentFeatures.push(feature.name);
    }
  }

  // Genre overlap bonus
  const genreOverlap = dna1.genres.filter((g) => dna2.genres.includes(g)).length;
  if (genreOverlap > 0) {
    totalScore += 0.05 * Math.min(genreOverlap, 2);
    matchedFeatures.push("genres");
  }

  return {
    similarity: Math.min(totalScore, 1),
    matchedFeatures,
    divergentFeatures,
  };
}

/**
 * Convert Sound DNA to generation parameters
 */
export function dnaToGenerationParams(dna: SoundDNA): {
  bpm: number;
  intensity: number;
  texture: number;
  brightness: number;
  noisiness: number;
  moodTags: string[];
} {
  return {
    bpm: dna.bpm,
    intensity: dna.energy,
    texture: dna.texture,
    brightness: dna.brightness,
    noisiness: dna.noisiness,
    moodTags: [...dna.moods, ...dna.genres.slice(0, 2)],
  };
}

/**
 * Build a prompt modifier from Sound DNA
 */
export function dnaToPromptModifier(dna: SoundDNA): string {
  const parts: string[] = [];

  // BPM
  parts.push(`${dna.bpm} BPM`);

  // Key if available
  if (dna.key) {
    parts.push(dna.key);
  }

  // Energy descriptor
  if (dna.energy > 70) {
    parts.push("high energy");
  } else if (dna.energy < 30) {
    parts.push("low energy, calm");
  }

  // Brightness descriptor
  if (dna.brightness > 70) {
    parts.push("bright, crisp highs");
  } else if (dna.brightness < 30) {
    parts.push("warm, dark tones");
  }

  // Texture descriptor
  if (dna.texture > 70) {
    parts.push("dense, layered");
  } else if (dna.texture < 30) {
    parts.push("minimal, sparse");
  }

  // Genres
  if (dna.genres.length > 0) {
    parts.push(dna.genres.slice(0, 2).join(" "));
  }

  // Moods
  if (dna.moods.length > 0) {
    parts.push(dna.moods.slice(0, 2).join(", "));
  }

  return parts.join(", ");
}

/**
 * Local storage for Sound DNA (browser-side)
 */
export class SoundDNAStore {
  private storageKey = "swanblade_sound_dna";

  getAll(): SoundDNA[] {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem(this.storageKey);
    return stored ? JSON.parse(stored) : [];
  }

  get(id: string): SoundDNA | undefined {
    return this.getAll().find((dna) => dna.id === id);
  }

  save(dna: SoundDNA): void {
    const all = this.getAll();
    const existing = all.findIndex((d) => d.id === dna.id);
    if (existing >= 0) {
      all[existing] = dna;
    } else {
      all.push(dna);
    }
    localStorage.setItem(this.storageKey, JSON.stringify(all));
  }

  delete(id: string): void {
    const all = this.getAll().filter((d) => d.id !== id);
    localStorage.setItem(this.storageKey, JSON.stringify(all));
  }

  clear(): void {
    localStorage.removeItem(this.storageKey);
  }
}
