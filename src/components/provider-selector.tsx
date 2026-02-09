"use client";

import { useMemo } from "react";

export type ProviderId = "replicate" | "elevenlabs" | "stability" | "openai" | "fal" | "suno" | "starforge";

export interface Provider {
  id: ProviderId;
  name: string;
  description: string;
  strengths: string[];
  goodFor: string[];
  available: boolean;
}

export const PROVIDERS: Provider[] = [
  {
    id: "starforge",
    name: "Forge",
    description: "Your trained sonic identity",
    strengths: ["Custom", "LoRA", "Signature"],
    goodFor: ["custom", "lora", "trained", "identity", "signature", "style"],
    available: true,
  },
  {
    id: "suno",
    name: "Siren",
    description: "Vocal and choir synthesis",
    strengths: ["Vocals", "Choir", "Harmonies"],
    goodFor: ["vocals", "choir", "singing", "harmonies", "lyrics"],
    available: false,
  },
  {
    id: "replicate",
    name: "Anvil",
    description: "Beats and percussion",
    strengths: ["Beats", "Drums", "Rhythm"],
    goodFor: ["bass", "drums", "beats", "instrumental", "music", "rhythm"],
    available: true,
  },
  {
    id: "elevenlabs",
    name: "Crucible",
    description: "Sound effects and foley",
    strengths: ["SFX", "Foley", "Impact"],
    goodFor: ["sound effects", "sfx", "ambient", "environment", "foley", "ui sounds"],
    available: true,
  },
  {
    id: "stability",
    name: "Prism",
    description: "Music and atmospheres",
    strengths: ["Music", "Texture", "Atmosphere"],
    goodFor: ["music", "soundscape", "texture", "atmosphere"],
    available: true,
  },
  {
    id: "fal",
    name: "Meridian",
    description: "High-fidelity synthesis",
    strengths: ["Hi-Fi", "Long-Form", "Studio"],
    goodFor: ["high quality", "professional", "stereo", "production"],
    available: true,
  },
  {
    id: "openai",
    name: "Oracle",
    description: "Speech and narration",
    strengths: ["Speech", "Voice", "Narration"],
    goodFor: ["talking", "speech", "narration", "voice", "speaking"],
    available: true,
  },
];

const VOCAL_KEYWORDS = ["vocal", "vocals", "sing", "singer", "sung", "choir", "lyrics", "lyric", "vox", "harmonies"];
const SPEECH_KEYWORDS = ["speech", "narration", "voiceover", "voice over", "spoken", "talking"];
const SFX_KEYWORDS = ["sfx", "ui", "interface", "click", "hit", "impact", "glitch", "whoosh", "button"];
const AMBIENT_KEYWORDS = ["ambience", "ambient", "drones", "texture", "atmosphere", "soundscape"];
const PERCUSSION_KEYWORDS = ["drum", "drums", "percussion", "beat", "kick", "snare", "hi-hat", "hihat", "cymbal", "tom", "clap", "rim", "loop"];
const RHYTHMIC_KEYWORDS = ["bpm", "tempo", "groove", "rhythm", "rhythmic", "metronome", "quantized"];

export function recommendProvider(prompt: string, hasReferences: boolean, durationSeconds?: number): ProviderId | null {
  const trimmed = prompt.trim().toLowerCase();
  const mentionsVocals = VOCAL_KEYWORDS.some((keyword) => trimmed.includes(keyword));
  const mentionsSpeech = SPEECH_KEYWORDS.some((keyword) => trimmed.includes(keyword));
  const mentionsSfx = SFX_KEYWORDS.some((keyword) => trimmed.includes(keyword));
  const mentionsAmbience = AMBIENT_KEYWORDS.some((keyword) => trimmed.includes(keyword));
  const mentionsPercussion = PERCUSSION_KEYWORDS.some((keyword) => trimmed.includes(keyword));
  const mentionsRhythm = RHYTHMIC_KEYWORDS.some((keyword) => trimmed.includes(keyword));

  const bpmMatch = trimmed.match(/(\d{2,3})\s*bpm/);
  const hasBPM = bpmMatch !== null || mentionsRhythm;

  const duration = durationSeconds ?? 10;
  const isShort = duration <= 22;
  const isLong = duration > 30;

  const pickIfAvailable = (id: ProviderId): ProviderId | null => {
    const provider = PROVIDERS.find((p) => p.id === id && p.available);
    return provider ? provider.id : null;
  };

  if (mentionsVocals || mentionsSpeech) {
    return pickIfAvailable("openai") ?? pickIfAvailable("suno") ?? pickIfAvailable("elevenlabs") ?? pickIfAvailable("replicate");
  }

  if (mentionsPercussion && hasBPM) {
    if (isShort) {
      return pickIfAvailable("elevenlabs") ?? pickIfAvailable("fal") ?? pickIfAvailable("replicate");
    } else if (isLong) {
      return pickIfAvailable("fal") ?? pickIfAvailable("stability") ?? pickIfAvailable("replicate");
    } else {
      return pickIfAvailable("elevenlabs") ?? pickIfAvailable("fal") ?? pickIfAvailable("replicate");
    }
  }

  if (hasReferences) {
    return pickIfAvailable("fal") ?? pickIfAvailable("stability") ?? pickIfAvailable("replicate");
  }

  if (mentionsSfx || mentionsPercussion) {
    if (isShort) {
      return pickIfAvailable("elevenlabs") ?? pickIfAvailable("stability") ?? pickIfAvailable("replicate");
    } else {
      return pickIfAvailable("fal") ?? pickIfAvailable("stability") ?? pickIfAvailable("replicate");
    }
  }

  if (mentionsAmbience) {
    return pickIfAvailable("stability") ?? pickIfAvailable("fal") ?? pickIfAvailable("replicate");
  }

  if (isLong) {
    return pickIfAvailable("fal") ?? pickIfAvailable("stability") ?? pickIfAvailable("replicate");
  }

  if (trimmed.length > 0) {
    return pickIfAvailable("replicate") ?? pickIfAvailable("fal");
  }

  return PROVIDERS.find((p) => p.available)?.id ?? null;
}

interface ProviderSelectorProps {
  value: ProviderId;
  onChange: (provider: ProviderId) => void;
  prompt: string;
  recommendation?: ProviderId | null;
  isAuto?: boolean;
  onResetAuto?: () => void;
  durationSeconds?: number;
  hasReferences?: boolean;
}

export function ProviderSelector({
  value,
  onChange,
  prompt,
  recommendation,
  isAuto = false,
  onResetAuto,
  durationSeconds,
  hasReferences = false
}: ProviderSelectorProps) {
  const computedRecommendation = useMemo<ProviderId | null>(() => {
    if (typeof recommendation !== "undefined") {
      return recommendation;
    }
    return recommendProvider(prompt, hasReferences, durationSeconds);
  }, [prompt, recommendation, hasReferences, durationSeconds]);

  const selectedProvider = PROVIDERS.find((p) => p.id === value);
  const recommendedProvider = PROVIDERS.find((p) => p.id === computedRecommendation);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-body-sm text-brand-secondary">Audio Engine</label>
        <div className="flex items-center gap-2">
          {isAuto ? (
            <span className="text-body-sm text-brand-text">Auto</span>
          ) : (
            onResetAuto && (
              <button
                type="button"
                onClick={onResetAuto}
                className="text-body-sm text-brand-secondary hover:text-brand-text transition"
              >
                Auto-pick
              </button>
            )
          )}
          {computedRecommendation && computedRecommendation !== value && recommendedProvider && (
            <button
              onClick={() => onChange(computedRecommendation)}
              className="text-label text-brand-text hover:underline transition"
            >
              Use {recommendedProvider.name}
            </button>
          )}
        </div>
      </div>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value as ProviderId)}
        className="w-full border border-brand-border/30 bg-brand-bg px-3 py-2 text-body text-brand-text hover:border-brand-text focus:border-brand-text focus:outline-none"
      >
        {PROVIDERS.filter((p) => p.available).map((provider) => {
          const isRecommended = provider.id === computedRecommendation;
          return (
            <option key={provider.id} value={provider.id}>
              {provider.name} — {provider.strengths.slice(0, 2).join(", ")}
              {isRecommended ? " (Recommended)" : ""}
            </option>
          );
        })}
      </select>

      {selectedProvider && (
        <div className="text-body-sm text-brand-secondary">
          {selectedProvider.description}
        </div>
      )}
    </div>
  );
}
