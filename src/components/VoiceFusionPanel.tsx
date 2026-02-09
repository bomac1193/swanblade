"use client";

import React, { useState, useCallback, useEffect } from "react";
import type { SoundGeneration, VoiceFusionType } from "@/types";
import { cn } from "@/lib/utils";

interface VoiceFusionPanelProps {
  onGenerationComplete?: (sound: SoundGeneration) => void;
  onCancel?: () => void;
  className?: string;
}

interface CreaturePreset {
  id: string;
  name: string;
  description: string;
  category: string;
}

interface AlienPreset {
  id: string;
  name: string;
  description: string;
  syllablePattern: string;
  tonality: string;
}

interface EffortPreset {
  id: string;
  name: string;
  types: string[];
}

const FUSION_TYPES: { id: VoiceFusionType; name: string; description: string }[] = [
  { id: "creature", name: "Creature", description: "Monster, alien, beast vocalizations" },
  { id: "alien_language", name: "Alien Language", description: "Unknown species speech" },
  { id: "effort", name: "Effort", description: "Attack, jump, death sounds" },
  { id: "ambient_vocal", name: "Ambient Vocal", description: "Ethereal textures" },
  { id: "choir", name: "Choir", description: "Harmonic voices" },
  { id: "processed", name: "Processed", description: "Abstract vocal elements" },
];

const EFFORT_TYPES = [
  { id: "attack", name: "Attack", description: "Combat strike" },
  { id: "hit", name: "Hit", description: "Taking damage" },
  { id: "jump", name: "Jump", description: "Leaping" },
  { id: "climb", name: "Climb", description: "Climbing effort" },
  { id: "death", name: "Death", description: "Final breath" },
  { id: "exertion", name: "Exertion", description: "Physical effort" },
  { id: "pain", name: "Pain", description: "Suffering" },
  { id: "relief", name: "Relief", description: "Catching breath" },
];

export function VoiceFusionPanel({
  onGenerationComplete,
  onCancel,
  className,
}: VoiceFusionPanelProps) {
  const [fusionType, setFusionType] = useState<VoiceFusionType>("creature");
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState(3);
  const [intensity, setIntensity] = useState(0.5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SoundGeneration | null>(null);

  // Type-specific states
  const [creatureType, setCreatureType] = useState("beast");
  const [effortType, setEffortType] = useState<string>("attack");
  const [alienTonality, setAlienTonality] = useState<string>("atonal");
  const [syllablePattern, setSyllablePattern] = useState("CV-CVC-V");

  // Presets
  const [creaturePresets, setCreaturePresets] = useState<CreaturePreset[]>([]);
  const [alienPresets, setAlienPresets] = useState<AlienPreset[]>([]);

  // Fetch presets on mount
  useEffect(() => {
    async function fetchPresets() {
      try {
        const response = await fetch("/api/voice-fusion");
        if (response.ok) {
          const data = await response.json();
          setCreaturePresets(data.creature || []);
          setAlienPresets(data.alien || []);
        }
      } catch (err) {
        console.warn("Failed to fetch presets:", err);
      }
    }
    fetchPresets();
  }, []);

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const body: Record<string, unknown> = {
        type: fusionType,
        prompt,
        duration,
        emotionalIntensity: intensity,
      };

      // Add type-specific parameters
      switch (fusionType) {
        case "creature":
          body.creatureType = creatureType;
          break;
        case "alien_language":
          body.alienLanguageParams = {
            tonality: alienTonality,
            syllablePattern,
          };
          break;
        case "effort":
          body.effortType = effortType;
          break;
      }

      const response = await fetch("/api/voice-fusion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Generation failed");
      }

      const data = await response.json();
      setResult(data.sound);
      onGenerationComplete?.(data.sound);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsGenerating(false);
    }
  }, [
    fusionType,
    prompt,
    duration,
    intensity,
    creatureType,
    effortType,
    alienTonality,
    syllablePattern,
    onGenerationComplete,
  ]);

  return (
    <div className={cn("flex flex-col gap-4 p-4 bg-card rounded-lg border", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Voice + Sound Fusion</h3>
          <p className="text-sm text-muted-foreground">
            Generate creature vocalizations, alien speech, and effort sounds
          </p>
        </div>
        {onCancel && (
          <button
            className="p-1 text-muted-foreground hover:text-foreground"
            onClick={onCancel}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Fusion Type Selection */}
      <div className="grid grid-cols-3 gap-2">
        {FUSION_TYPES.map((ft) => (
          <button
            key={ft.id}
            className={cn(
              "p-2 rounded-lg border text-left text-sm transition-colors",
              fusionType === ft.id
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/50"
            )}
            onClick={() => setFusionType(ft.id)}
          >
            <div className="font-medium">{ft.name}</div>
            <div className="text-xs text-muted-foreground">{ft.description}</div>
          </button>
        ))}
      </div>

      {/* Type-specific Options */}
      {fusionType === "creature" && (
        <div className="space-y-3">
          <label className="text-sm font-medium">Creature Type</label>
          <div className="grid grid-cols-4 gap-2">
            {creaturePresets.length > 0 ? (
              creaturePresets.map((preset) => (
                <button
                  key={preset.id}
                  className={cn(
                    "p-2 rounded-md border text-sm transition-colors",
                    creatureType === preset.id
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  )}
                  onClick={() => setCreatureType(preset.id)}
                >
                  {preset.name}
                </button>
              ))
            ) : (
              <>
                {["beast", "dragon", "goblin", "demon", "ghost", "alien"].map((type) => (
                  <button
                    key={type}
                    className={cn(
                      "p-2 rounded-md border text-sm transition-colors capitalize",
                      creatureType === type
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    )}
                    onClick={() => setCreatureType(type)}
                  >
                    {type}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {fusionType === "alien_language" && (
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">Tonality</label>
            <div className="grid grid-cols-4 gap-2 mt-1">
              {["tonal", "atonal", "whispered", "guttural"].map((tone) => (
                <button
                  key={tone}
                  className={cn(
                    "p-2 rounded-md border text-sm transition-colors capitalize",
                    alienTonality === tone
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  )}
                  onClick={() => setAlienTonality(tone)}
                >
                  {tone}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Syllable Pattern</label>
            <input
              type="text"
              value={syllablePattern}
              onChange={(e) => setSyllablePattern(e.target.value)}
              placeholder="CV-CVC-V (C=consonant, V=vowel)"
              className="w-full mt-1 p-2 rounded-md border bg-background text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">
              C = consonant, V = vowel, S = sibilant
            </p>
          </div>
        </div>
      )}

      {fusionType === "effort" && (
        <div className="space-y-3">
          <label className="text-sm font-medium">Effort Type</label>
          <div className="grid grid-cols-4 gap-2">
            {EFFORT_TYPES.map((et) => (
              <button
                key={et.id}
                className={cn(
                  "p-2 rounded-md border text-left text-sm transition-colors",
                  effortType === et.id
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                )}
                onClick={() => setEffortType(et.id)}
                title={et.description}
              >
                {et.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Common Options */}
      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium">Description/Context</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the vocalization... e.g., 'angry dragon warning roar' or 'exhausted warrior catching breath'"
            className="w-full h-20 mt-1 p-2 rounded-md border bg-background text-sm resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex justify-between text-sm">
              <span className="font-medium">Duration</span>
              <span className="text-muted-foreground">{duration}s</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={10}
              step={0.5}
              value={duration}
              onChange={(e) => setDuration(parseFloat(e.target.value))}
              className="w-full mt-1"
            />
          </div>

          <div>
            <div className="flex justify-between text-sm">
              <span className="font-medium">Intensity</span>
              <span className="text-muted-foreground">{Math.round(intensity * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={intensity}
              onChange={(e) => setIntensity(parseFloat(e.target.value))}
              className="w-full mt-1"
            />
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md">
          {error}
        </div>
      )}

      {/* Result Preview */}
      {result && (
        <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
          <div className="flex items-center gap-2 text-green-600 mb-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">Generation Complete</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="text-sm font-medium">{result.name}</div>
              <div className="text-xs text-muted-foreground">
                {result.lengthSeconds}s · Saved to library
              </div>
            </div>
            {result.audioUrl && (
              <audio
                src={result.audioUrl}
                controls
                className="h-8 w-40"
              />
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 mt-2">
        {onCancel && (
          <button
            className="px-4 py-2 rounded-md border hover:bg-muted transition-colors"
            onClick={onCancel}
            disabled={isGenerating}
          >
            Cancel
          </button>
        )}
        <button
          className={cn(
            "flex-1 px-4 py-2 rounded-md bg-primary text-primary-foreground transition-colors",
            "hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          )}
          onClick={handleGenerate}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Generating...
            </span>
          ) : (
            `Generate ${FUSION_TYPES.find((f) => f.id === fusionType)?.name}`
          )}
        </button>
      </div>
    </div>
  );
}

export default VoiceFusionPanel;
