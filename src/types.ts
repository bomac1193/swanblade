export type SoundGenerationStatus = "pending" | "ready" | "error";

export type SoundCategory = "FX" | "Ambience" | "UI" | "Foley" | "Melody" | "Bass" | "Percussion";

export interface SoundGeneration {
  id: string;
  name: string;
  prompt: string;
  createdAt: string;
  type: SoundCategory;
  moodTags: string[];
  lengthSeconds: number;
  bpm?: number;
  key?: string;
  intensity: number;
  texture: number;
  brightness: number;
  noisiness: number;
  seed?: number;
  audioUrl: string | null;
  status: SoundGenerationStatus;
  errorMessage?: string;
  variantOfId?: string;
  // Starforge LoRA
  loraId?: string;
  loraStrength?: number;
  // o8 Provenance
  provenanceCid?: string;
  identityId?: string;
}

export interface AudioReferencePayload {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  data: string;
}

export interface GenerateSoundRequestBody {
  prompt: string;
  parameters: Omit<SoundGeneration, "id" | "name" | "prompt" | "createdAt" | "audioUrl" | "status" | "errorMessage" | "variantOfId">;
  references?: AudioReferencePayload[];
}

export interface GenerateSoundResponse {
  audioUrl: string;
  provenanceCid?: string;
}

// ==================== Blue Ocean Types ====================

export type GameState =
  | "menu"
  | "exploration"
  | "combat"
  | "boss"
  | "victory"
  | "defeat"
  | "stealth"
  | "ambient"
  | "tension"
  | "chase"
  | "cutscene"
  | "credits";

export interface PaletteConstraints {
  bpmRange: [number, number] | null;
  energyRange: [number, number] | null;
  textureRange: [number, number] | null;
  brightnessRange: [number, number] | null;
  noisinessRange: [number, number] | null;
  valenceRange: [number, number] | null;
}

export interface SoundPaletteRef {
  id: string;
  name: string;
  constraints: PaletteConstraints;
  genres: string[];
  moods: string[];
}

export interface SoundDNARef {
  id: string;
  name: string;
  bpm: number;
  key: string | null;
  energy: number;
  brightness: number;
  texture: number;
}

export interface StemInfo {
  type: string;
  audioUrl: string;
  provenanceCid?: string;
}

export interface StemBundleRef {
  id: string;
  name: string;
  gameState: GameState;
  stems: StemInfo[];
  paletteId?: string;
  createdAt: string;
}
