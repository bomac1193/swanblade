"use client";

import { useMemo } from "react";

export type ProviderId = "replicate" | "elevenlabs" | "stability" | "openai" | "fal" | "suno";

export interface Provider {
  id: ProviderId;
  name: string; // Custom copyright-free name
  description: string;
  strengths: string[];
  goodFor: string[]; // Tags like "Vocals", "Bass", "SFX"
  available: boolean;
}

export const PROVIDERS: Provider[] = [
  {
    id: "suno",
    name: "VocalForge",
    description: "Professional vocal and choir synthesis",
    strengths: ["Vocals", "Choir", "Harmonies", "Full Songs"],
    goodFor: ["vocals", "choir", "singing", "harmonies", "lyrics"],
    available: false, // Will check dynamically
  },
  {
    id: "replicate",
    name: "BeatSmith",
    description: "High-quality instrumental music generator",
    strengths: ["Beats", "Bass", "Drums", "Melodies", "Instrumental"],
    goodFor: ["bass", "drums", "beats", "instrumental", "music", "rhythm"],
    available: true,
  },
  {
    id: "elevenlabs",
    name: "SonicCraft",
    description: "Sound effects and environmental audio",
    strengths: ["SFX", "Ambience", "Foley", "Nature Sounds"],
    goodFor: ["sound effects", "sfx", "ambient", "environment", "foley", "ui sounds"],
    available: true,
  },
  {
    id: "stability",
    name: "HarmonyEngine",
    description: "Balanced music and sound generation",
    strengths: ["Music", "Soundscapes", "Textures"],
    goodFor: ["music", "soundscape", "texture", "atmosphere"],
    available: true,
  },
  {
    id: "fal",
    name: "AudioSmith",
    description: "Enterprise-grade audio synthesis",
    strengths: ["High-Fidelity", "Long-Form", "Studio Quality"],
    goodFor: ["high quality", "professional", "stereo", "production"],
    available: true,
  },
  {
    id: "openai",
    name: "VoiceWeaver",
    description: "AI narration and speech synthesis",
    strengths: ["Narration", "Speech", "Voice", "Talking"],
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

  // Extract BPM if mentioned
  const bpmMatch = trimmed.match(/(\d{2,3})\s*bpm/);
  const hasBPM = bpmMatch !== null || mentionsRhythm;

  // Determine if this is a short or long request
  const duration = durationSeconds ?? 10;
  const isShort = duration <= 22; // ElevenLabs max
  const isLong = duration > 30; // Beyond Replicate

  const pickIfAvailable = (id: ProviderId): ProviderId | null => {
    const provider = PROVIDERS.find((p) => p.id === id && p.available);
    return provider ? provider.id : null;
  };

  // PRIORITY 1: Vocals/Speech (OpenAI or Suno)
  if (mentionsVocals || mentionsSpeech) {
    return pickIfAvailable("openai") ?? pickIfAvailable("suno") ?? pickIfAvailable("elevenlabs") ?? pickIfAvailable("replicate");
  }

  // PRIORITY 2: Percussion with BPM (ElevenLabs for short, FAL for long)
  if (mentionsPercussion && hasBPM) {
    if (isShort) {
      return pickIfAvailable("elevenlabs") ?? pickIfAvailable("fal") ?? pickIfAvailable("replicate");
    } else if (isLong) {
      return pickIfAvailable("fal") ?? pickIfAvailable("stability") ?? pickIfAvailable("replicate");
    } else {
      // Medium length (22-30s)
      return pickIfAvailable("elevenlabs") ?? pickIfAvailable("fal") ?? pickIfAvailable("replicate");
    }
  }

  // PRIORITY 3: References provided (FAL/Stability best for resampling)
  if (hasReferences) {
    return pickIfAvailable("fal") ?? pickIfAvailable("stability") ?? pickIfAvailable("replicate");
  }

  // PRIORITY 4: SFX/Percussion without strict BPM
  if (mentionsSfx || mentionsPercussion) {
    if (isShort) {
      return pickIfAvailable("elevenlabs") ?? pickIfAvailable("stability") ?? pickIfAvailable("replicate");
    } else {
      return pickIfAvailable("fal") ?? pickIfAvailable("stability") ?? pickIfAvailable("replicate");
    }
  }

  // PRIORITY 5: Ambient/Soundscapes
  if (mentionsAmbience) {
    return pickIfAvailable("stability") ?? pickIfAvailable("fal") ?? pickIfAvailable("replicate");
  }

  // PRIORITY 6: Long duration content
  if (isLong) {
    return pickIfAvailable("fal") ?? pickIfAvailable("stability") ?? pickIfAvailable("replicate");
  }

  // DEFAULT: Replicate for general music
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
        <label className="text-[11px] font-medium uppercase tracking-wider text-white/50">Audio Engine</label>
        <div className="flex items-center gap-2">
          {isAuto ? (
            <span className="text-[10px] uppercase tracking-wider text-emerald-300">Auto</span>
          ) : (
            onResetAuto && (
              <button
                type="button"
                onClick={onResetAuto}
                className="text-[10px] uppercase tracking-wider text-white/50 transition hover:text-emerald-300"
              >
                Auto-pick
              </button>
            )
          )}
          {computedRecommendation && computedRecommendation !== value && recommendedProvider && (
            <button
              onClick={() => onChange(computedRecommendation)}
              className="text-[10px] text-emerald-400 transition hover:text-emerald-300"
            >
              💡 Use {recommendedProvider.name}
            </button>
          )}
        </div>
      </div>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value as ProviderId)}
        className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white hover:border-white/20 focus:border-emerald-400 focus:outline-none"
      >
        {PROVIDERS.filter((p) => p.available).map((provider) => {
          const isRecommended = provider.id === computedRecommendation;
          return (
            <option key={provider.id} value={provider.id}>
              {provider.name} — {provider.strengths.slice(0, 2).join(", ")}
              {isRecommended ? " ✨ RECOMMENDED" : ""}
            </option>
          );
        })}
      </select>

      {selectedProvider && (
        <div className="text-[10px] text-white/50">
          {selectedProvider.description}
        </div>
      )}
    </div>
  );
}
