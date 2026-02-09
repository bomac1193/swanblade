"use client";

import React, { useState, useCallback, useRef } from "react";
import type { SoundGeneration } from "@/types";
import { TRANSFORM_PRESETS } from "@/lib/soundTransform";
import { cn } from "@/lib/utils";

interface TransformPanelProps {
  sourceSound?: SoundGeneration;
  onTransformComplete?: (resultSound: SoundGeneration) => void;
  onCancel?: () => void;
  className?: string;
}

export function TransformPanel({
  sourceSound,
  onTransformComplete,
  onCancel,
  className,
}: TransformPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [transformPrompt, setTransformPrompt] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [preserveRhythm, setPreserveRhythm] = useState(true);
  const [preservePitch, setPreservePitch] = useState(true);
  const [preserveTimbre, setPreserveTimbre] = useState(false);
  const [transformStrength, setTransformStrength] = useState(0.7);
  const [isTransforming, setIsTransforming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SoundGeneration | null>(null);

  // Handle file upload
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      setError(null);
    }
  }, []);

  // Handle preset selection
  const handlePresetSelect = useCallback((presetId: string) => {
    const preset = TRANSFORM_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setSelectedPreset(presetId);
      setPreserveRhythm(preset.preserveRhythm);
      setPreservePitch(preset.preservePitch);
      setPreserveTimbre(preset.preserveTimbre);
      setTransformStrength(preset.transformStrength);
      // Append preset suffix to prompt if empty
      if (!transformPrompt) {
        setTransformPrompt(preset.promptSuffix);
      }
    }
  }, [transformPrompt]);

  // Handle transform
  const handleTransform = useCallback(async () => {
    if (!transformPrompt) {
      setError("Please describe the transformation you want");
      return;
    }

    if (!sourceSound && !uploadedFile) {
      setError("Please upload an audio file or select a source sound");
      return;
    }

    setIsTransforming(true);
    setError(null);

    try {
      const formData = new FormData();

      if (uploadedFile) {
        formData.append("sourceAudio", uploadedFile);
      } else if (sourceSound) {
        formData.append("sourceSoundId", sourceSound.id);
      }

      formData.append("transformPrompt", transformPrompt);
      formData.append("preserveRhythm", String(preserveRhythm));
      formData.append("preservePitch", String(preservePitch));
      formData.append("preserveTimbre", String(preserveTimbre));
      formData.append("transformStrength", String(transformStrength));

      if (selectedPreset) {
        formData.append("presetId", selectedPreset);
      }

      const response = await fetch("/api/transform", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Transform failed");
      }

      const data = await response.json();
      setResult(data.sound);
      onTransformComplete?.(data.sound);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsTransforming(false);
    }
  }, [
    transformPrompt,
    sourceSound,
    uploadedFile,
    preserveRhythm,
    preservePitch,
    preserveTimbre,
    transformStrength,
    selectedPreset,
    onTransformComplete,
  ]);

  const hasSource = !!sourceSound || !!uploadedFile;

  return (
    <div className={cn("flex flex-col gap-4 p-4 bg-card rounded-lg border", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Sound Transform</h3>
          <p className="text-sm text-muted-foreground">
            Transform audio using AI-powered style transfer
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

      {/* Source Audio */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Source Audio</label>

        {sourceSound ? (
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <div className="w-10 h-10 bg-primary/20 rounded flex items-center justify-center">
              <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="font-medium text-sm">{sourceSound.name}</div>
              <div className="text-xs text-muted-foreground">
                {sourceSound.type} · {sourceSound.lengthSeconds}s
                {sourceSound.bpm && ` · ${sourceSound.bpm} BPM`}
              </div>
            </div>
          </div>
        ) : (
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
              uploadedFile ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
            )}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleFileChange}
              className="hidden"
            />
            {uploadedFile ? (
              <div className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">{uploadedFile.name}</span>
                <span className="text-sm text-muted-foreground">
                  ({(uploadedFile.size / 1024 / 1024).toFixed(1)} MB)
                </span>
              </div>
            ) : (
              <>
                <svg className="w-8 h-8 mx-auto text-muted-foreground mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-sm text-muted-foreground">
                  Click to upload audio file
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  MP3, WAV, OGG up to 25MB
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Transform Presets */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Transform Preset</label>
        <div className="grid grid-cols-2 gap-2">
          {TRANSFORM_PRESETS.slice(0, 6).map((preset) => (
            <button
              key={preset.id}
              className={cn(
                "p-2 rounded-lg border text-left text-sm transition-colors",
                selectedPreset === preset.id
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50"
              )}
              onClick={() => handlePresetSelect(preset.id)}
            >
              <div className="font-medium">{preset.name}</div>
              <div className="text-xs text-muted-foreground">{preset.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Transform Prompt */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Transformation Description</label>
        <textarea
          value={transformPrompt}
          onChange={(e) => setTransformPrompt(e.target.value)}
          placeholder="Describe how you want to transform the audio... e.g., 'Convert to 8-bit chiptune style' or 'Make it sound like a jazz ensemble'"
          className="w-full h-24 p-3 rounded-md border bg-background text-sm resize-none"
        />
      </div>

      {/* Preservation Options */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Preserve</label>
        <div className="flex flex-wrap gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={preserveRhythm}
              onChange={(e) => setPreserveRhythm(e.target.checked)}
              className="rounded"
            />
            Rhythm
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={preservePitch}
              onChange={(e) => setPreservePitch(e.target.checked)}
              className="rounded"
            />
            Pitch/Melody
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={preserveTimbre}
              onChange={(e) => setPreserveTimbre(e.target.checked)}
              className="rounded"
            />
            Timbre
          </label>
        </div>
      </div>

      {/* Transform Strength */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="font-medium">Transform Strength</span>
          <span className="text-muted-foreground">{Math.round(transformStrength * 100)}%</span>
        </div>
        <input
          type="range"
          min={0.1}
          max={1.0}
          step={0.05}
          value={transformStrength}
          onChange={(e) => setTransformStrength(parseFloat(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Subtle</span>
          <span>Dramatic</span>
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
            <span className="font-medium">Transform Complete</span>
          </div>
          <div className="text-sm text-muted-foreground">
            {result.name} saved to library
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 mt-2">
        {onCancel && (
          <button
            className="px-4 py-2 rounded-md border hover:bg-muted transition-colors"
            onClick={onCancel}
            disabled={isTransforming}
          >
            Cancel
          </button>
        )}
        <button
          className={cn(
            "flex-1 px-4 py-2 rounded-md bg-primary text-primary-foreground transition-colors",
            "hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          )}
          onClick={handleTransform}
          disabled={isTransforming || !hasSource || !transformPrompt}
        >
          {isTransforming ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Transforming...
            </span>
          ) : (
            "Transform Audio"
          )}
        </button>
      </div>
    </div>
  );
}

export default TransformPanel;
