"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";

export type ProviderId = "replicate" | "elevenlabs" | "stability" | "openai" | "fal" | "suno";

export interface Provider {
  id: ProviderId;
  name: string; // Custom copyright-free name
  description: string;
  strengths: string[];
  goodFor: string[]; // Tags like "Vocals", "Bass", "SFX"
  available: boolean;
}

const PROVIDERS: Provider[] = [
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

interface ProviderSelectorProps {
  value: ProviderId;
  onChange: (provider: ProviderId) => void;
  prompt: string;
}

export function ProviderSelector({ value, onChange, prompt }: ProviderSelectorProps) {
  const [recommendation, setRecommendation] = useState<ProviderId | null>(null);

  // Analyze prompt and recommend provider
  useEffect(() => {
    if (!prompt.trim()) {
      setRecommendation(null);
      return;
    }

    const lowerPrompt = prompt.toLowerCase();
    const scores = PROVIDERS.map((provider) => {
      let score = 0;
      provider.goodFor.forEach((keyword) => {
        if (lowerPrompt.includes(keyword)) {
          score += 1;
        }
      });
      return { id: provider.id, score };
    });

    // Get highest scoring available provider
    const best = scores
      .filter((s) => PROVIDERS.find((p) => p.id === s.id)?.available)
      .sort((a, b) => b.score - a.score)[0];

    if (best && best.score > 0) {
      setRecommendation(best.id);
    } else {
      setRecommendation(null);
    }
  }, [prompt]);

  const selectedProvider = PROVIDERS.find((p) => p.id === value);
  const recommendedProvider = PROVIDERS.find((p) => p.id === recommendation);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-medium uppercase tracking-wider text-white/50">
          Audio Engine
        </label>
        {recommendation && recommendation !== value && recommendedProvider && (
          <button
            onClick={() => onChange(recommendation)}
            className="text-[10px] text-emerald-400 hover:text-emerald-300 transition"
          >
            💡 Use {recommendedProvider.name}
          </button>
        )}
      </div>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value as ProviderId)}
        className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white hover:border-white/20 focus:border-emerald-400 focus:outline-none"
      >
        {PROVIDERS.filter((p) => p.available).map((provider) => {
          const isRecommended = provider.id === recommendation;
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
