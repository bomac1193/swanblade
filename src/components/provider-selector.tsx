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
  sculptActive?: boolean;
}

export function ProviderSelector({
  value,
  onChange,
  prompt,
  recommendation,
  isAuto = false,
  onResetAuto,
  durationSeconds,
  hasReferences = false,
  sculptActive = false,
}: ProviderSelectorProps) {
  const computedRecommendation = useMemo<ProviderId | null>(() => {
    if (typeof recommendation !== "undefined") {
      return recommendation;
    }
    return recommendProvider(prompt, hasReferences, durationSeconds);
  }, [prompt, recommendation, hasReferences, durationSeconds]);

  const availableProviders = PROVIDERS.filter((p) => p.available);

  return (
    <div className={sculptActive ? "opacity-40 pointer-events-none" : ""}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] text-gray-500">
          {sculptActive ? "Engine — managed by Sculpt" : "Engine"}
        </p>
        {!sculptActive && (
          <div className="flex items-center gap-2">
            {isAuto ? (
              <span className="text-[10px] text-gray-500">auto</span>
            ) : (
              onResetAuto && (
                <button
                  type="button"
                  onClick={onResetAuto}
                  className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors"
                >
                  reset
                </button>
              )
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {availableProviders.map((provider) => {
          const isSelected = provider.id === value;
          const isRecommended = provider.id === computedRecommendation;

          return (
            <button
              key={provider.id}
              onClick={() => onChange(provider.id)}
              className={`relative px-2 py-2 text-left border transition-colors duration-150 ${
                isSelected
                  ? "border-white/20 bg-white/[0.06]"
                  : "border-white/[0.04] hover:border-white/[0.10]"
              }`}
            >
              {isRecommended && !isSelected && (
                <span className="absolute top-1 right-1.5 w-1 h-1 rounded-full bg-white/40" />
              )}
              <p className={`text-[11px] font-medium leading-tight ${
                isSelected ? "text-white" : "text-gray-500"
              }`}>
                {provider.name}
              </p>
              <p className={`text-[9px] leading-tight mt-0.5 ${
                isSelected ? "text-gray-400" : "text-gray-600"
              }`}>
                {provider.strengths[0]}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
