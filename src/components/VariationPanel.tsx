"use client";

import React, { useState, useCallback } from "react";
import type { SoundGeneration, VariationType, VariationRequest } from "@/types";
import { cn } from "@/lib/utils";

interface VariationPanelProps {
  parentSound: SoundGeneration;
  librarySounds?: SoundGeneration[];
  onVariationsGenerated?: (sounds: SoundGeneration[], lineageId: string) => void;
  onCancel?: () => void;
  className?: string;
}

const VARIATION_TYPES: {
  type: VariationType;
  label: string;
  description: string;
  icon: string;
}[] = [
  {
    type: "parameter_shift",
    label: "Parameter Shift",
    description: "Adjust intensity, texture, brightness systematically",
    icon: "sliders",
  },
  {
    type: "evolve",
    label: "Evolution",
    description: "Gradual refinement in a consistent direction",
    icon: "trending-up",
  },
  {
    type: "mutate",
    label: "Mutation",
    description: "Random exploration for unexpected results",
    icon: "shuffle",
  },
  {
    type: "combine",
    label: "Combine",
    description: "Blend with another sound from your library",
    icon: "git-merge",
  },
];

export function VariationPanel({
  parentSound,
  librarySounds = [],
  onVariationsGenerated,
  onCancel,
  className,
}: VariationPanelProps) {
  const [variationType, setVariationType] = useState<VariationType>("parameter_shift");
  const [count, setCount] = useState(3);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Parameter shift settings
  const [intensityShift, setIntensityShift] = useState(0);
  const [textureShift, setTextureShift] = useState(0);
  const [brightnessShift, setBrightnessShift] = useState(0);
  const [noisinessShift, setNoisinessShift] = useState(0);
  const [bpmShift, setBpmShift] = useState(0);

  // Evolution settings
  const [evolutionStrength, setEvolutionStrength] = useState(0.2);

  // Mutation settings
  const [mutationRate, setMutationRate] = useState(0.3);
  const [preserveCore, setPreserveCore] = useState(true);

  // Combine settings
  const [combineWithId, setCombineWithId] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const request: VariationRequest & { provider?: string } = {
        parentSoundId: parentSound.id,
        variationType,
        count,
        provider: "elevenlabs",
      };

      // Add type-specific parameters
      if (variationType === "parameter_shift") {
        request.parameterShifts = {
          intensity: intensityShift,
          texture: textureShift,
          brightness: brightnessShift,
          noisiness: noisinessShift,
          bpm: bpmShift,
        };
      } else if (variationType === "evolve") {
        request.evolutionStrength = evolutionStrength;
      } else if (variationType === "mutate") {
        request.mutationRate = mutationRate;
        request.preserveCore = preserveCore;
      } else if (variationType === "combine" && combineWithId) {
        request.combineWithSoundId = combineWithId;
      }

      const response = await fetch("/api/variations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to generate variations");
      }

      const result = await response.json();
      onVariationsGenerated?.(result.sounds, result.lineageId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsGenerating(false);
    }
  }, [
    parentSound,
    variationType,
    count,
    intensityShift,
    textureShift,
    brightnessShift,
    noisinessShift,
    bpmShift,
    evolutionStrength,
    mutationRate,
    preserveCore,
    combineWithId,
    onVariationsGenerated,
  ]);

  return (
    <div className={cn("flex flex-col gap-4 p-4 bg-card rounded-lg border", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Create Variations</h3>
          <p className="text-sm text-muted-foreground">
            Based on: {parentSound.name}
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

      {/* Variation Type Selection */}
      <div className="grid grid-cols-2 gap-2">
        {VARIATION_TYPES.map((vt) => (
          <button
            key={vt.type}
            className={cn(
              "flex flex-col items-start p-3 rounded-lg border text-left transition-colors",
              variationType === vt.type
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/50"
            )}
            onClick={() => setVariationType(vt.type)}
          >
            <div className="flex items-center gap-2">
              <VariationIcon type={vt.icon} />
              <span className="font-medium text-sm">{vt.label}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{vt.description}</p>
          </button>
        ))}
      </div>

      {/* Count Selector */}
      <div>
        <label className="text-sm font-medium">Number of Variations</label>
        <div className="flex items-center gap-2 mt-1">
          {[1, 3, 5, 7].map((n) => (
            <button
              key={n}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm transition-colors",
                count === n
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80"
              )}
              onClick={() => setCount(n)}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Type-specific Settings */}
      {variationType === "parameter_shift" && (
        <ParameterShiftSettings
          intensityShift={intensityShift}
          textureShift={textureShift}
          brightnessShift={brightnessShift}
          noisinessShift={noisinessShift}
          bpmShift={bpmShift}
          parentBpm={parentSound.bpm}
          onIntensityChange={setIntensityShift}
          onTextureChange={setTextureShift}
          onBrightnessChange={setBrightnessShift}
          onNoisinessChange={setNoisinessShift}
          onBpmChange={setBpmShift}
        />
      )}

      {variationType === "evolve" && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Evolution Strength</label>
          <input
            type="range"
            min={0.1}
            max={0.5}
            step={0.05}
            value={evolutionStrength}
            onChange={(e) => setEvolutionStrength(parseFloat(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Subtle</span>
            <span>{Math.round(evolutionStrength * 100)}%</span>
            <span>Dramatic</span>
          </div>
        </div>
      )}

      {variationType === "mutate" && (
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">Mutation Rate</label>
            <input
              type="range"
              min={0.1}
              max={0.7}
              step={0.05}
              value={mutationRate}
              onChange={(e) => setMutationRate(parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Conservative</span>
              <span>{Math.round(mutationRate * 100)}%</span>
              <span>Wild</span>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={preserveCore}
              onChange={(e) => setPreserveCore(e.target.checked)}
              className="rounded"
            />
            Preserve core character (keep intensity, BPM stable)
          </label>
        </div>
      )}

      {variationType === "combine" && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Combine With</label>
          {librarySounds.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No other sounds in library to combine with
            </p>
          ) : (
            <select
              value={combineWithId || ""}
              onChange={(e) => setCombineWithId(e.target.value || null)}
              className="w-full p-2 rounded-md border bg-background text-sm"
            >
              <option value="">Select a sound...</option>
              {librarySounds
                .filter((s) => s.id !== parentSound.id)
                .map((sound) => (
                  <option key={sound.id} value={sound.id}>
                    {sound.name} ({sound.type})
                  </option>
                ))}
            </select>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-2 bg-destructive/10 text-destructive text-sm rounded-md">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 mt-2">
        {onCancel && (
          <button
            className="flex-1 px-4 py-2 rounded-md border hover:bg-muted transition-colors"
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
          disabled={isGenerating || (variationType === "combine" && !combineWithId)}
        >
          {isGenerating ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Generating...
            </span>
          ) : (
            `Generate ${count} Variation${count > 1 ? "s" : ""}`
          )}
        </button>
      </div>
    </div>
  );
}

// ==================== Parameter Shift Settings ====================

interface ParameterShiftSettingsProps {
  intensityShift: number;
  textureShift: number;
  brightnessShift: number;
  noisinessShift: number;
  bpmShift: number;
  parentBpm?: number;
  onIntensityChange: (value: number) => void;
  onTextureChange: (value: number) => void;
  onBrightnessChange: (value: number) => void;
  onNoisinessChange: (value: number) => void;
  onBpmChange: (value: number) => void;
}

function ParameterShiftSettings({
  intensityShift,
  textureShift,
  brightnessShift,
  noisinessShift,
  bpmShift,
  parentBpm,
  onIntensityChange,
  onTextureChange,
  onBrightnessChange,
  onNoisinessChange,
  onBpmChange,
}: ParameterShiftSettingsProps) {
  const renderSlider = (
    label: string,
    value: number,
    onChange: (v: number) => void,
    min: number,
    max: number,
    unit: string = ""
  ) => (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">
          {value > 0 ? "+" : ""}
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={(max - min) / 20}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full"
      />
    </div>
  );

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Set the range of parameter changes. Variations will spread across these values.
      </p>
      {renderSlider("Intensity", intensityShift, onIntensityChange, -30, 30)}
      {renderSlider("Texture", textureShift, onTextureChange, -25, 25)}
      {renderSlider("Brightness", brightnessShift, onBrightnessChange, -25, 25)}
      {renderSlider("Noisiness", noisinessShift, onNoisinessChange, -20, 20)}
      {parentBpm && renderSlider("BPM", bpmShift, onBpmChange, -20, 20, " BPM")}
    </div>
  );
}

// ==================== Icons ====================

function VariationIcon({ type }: { type: string }) {
  const iconClass = "w-4 h-4";

  switch (type) {
    case "sliders":
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
      );
    case "trending-up":
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      );
    case "shuffle":
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      );
    case "git-merge":
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle cx="18" cy="18" r="3" strokeWidth={2} />
          <circle cx="6" cy="6" r="3" strokeWidth={2} />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 21V9a9 9 0 009 9" />
        </svg>
      );
    default:
      return null;
  }
}

export default VariationPanel;
