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
}
