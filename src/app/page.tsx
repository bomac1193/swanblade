"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import { ToastItem, ToastStack } from "@/components/toast-stack";
import { WaveformPlaceholder } from "@/components/waveform-placeholder";
import { AudioPlayerControls } from "@/components/audio-player-controls";
import { LibraryPanel } from "@/components/library-panel";
import { ProviderSelector, type ProviderId, recommendProvider } from "@/components/provider-selector";
import { PaletteEditor } from "@/components/PaletteEditor";
import { GameStateSelector } from "@/components/GameStateSelector";
import type { AudioReferencePayload, SoundGeneration, SoundCategory, GameState } from "@/types";
import type { LibrarySound } from "@/lib/libraryStorage";
import type { SoundPalette } from "@/lib/soundPalette";
import type { StemBundle } from "@/lib/stemGenerator";
import { generateSoundName } from "@/lib/utils";

type AppMode = "generate" | "game-audio" | "library";

const PROMPT_SUGGESTIONS = [
  "Glitchy UI clicks in a neon-lit cybercafe",
  "Afrobeats percussion with metallic hits",
  "Deep dubstep bass stab with reverb tail",
  "Ambient rain with distant traffic",
];

const DEFAULT_PARAMETERS = {
  type: "FX" as SoundCategory,
  moodTags: ["Futuristic"],
  lengthSeconds: 10,
  intensity: 60,
  texture: 45,
  brightness: 0,
  noisiness: 0.1,
  bpm: 110,
  key: "D Minor",
  seed: 128,
};

type ReferenceClip = {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  previewUrl: string;
};

const MAX_REFERENCE_FILES = 3;
const MAX_REFERENCE_FILE_BYTES = 25 * 1024 * 1024;
const MAX_REFERENCE_FILE_SIZE_LABEL = "25 MB";
const LENGTH_PRESETS = [5, 12, 30, 60];

function formatDisplayBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "unknown";
  const units = ["B", "KB", "MB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const decimals = unitIndex === 0 ? 0 : 1;
  return `${value.toFixed(decimals)} ${units[unitIndex]}`;
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        const [, base64] = result.split(",");
        resolve(base64 ?? "");
      } else {
        reject(new Error("Failed to read audio reference."));
      }
    };
    reader.onerror = () => {
      reject(reader.error ?? new Error("Failed to read audio reference."));
    };
    reader.readAsDataURL(file);
  });
}

function ReferenceClipCard({ clip, onRemove }: { clip: ReferenceClip; onRemove: (id: string) => void }) {
  return (
    <div className="border border-brand-border bg-brand-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-body font-medium text-brand-text">{clip.name}</p>
          <p className="uppercase-label text-brand-secondary">{formatDisplayBytes(clip.size)}</p>
        </div>
        <button
          type="button"
          onClick={() => onRemove(clip.id)}
          className="uppercase-label text-brand-secondary hover:text-brand-text"
        >
          Remove
        </button>
      </div>
      <div className="mt-3 border border-brand-border bg-brand-bg p-2">
        <audio
          controls
          src={clip.previewUrl}
          preload="metadata"
          controlsList="nodownload noplaybackrate"
          className="h-8 w-full"
        />
      </div>
    </div>
  );
}

export default function Home() {
  const [mode, setMode] = useState<AppMode>("generate");
  const [prompt, setPrompt] = useState("");
  const [currentSound, setCurrentSound] = useState<SoundGeneration | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<ProviderId>("replicate");
  const [lengthSeconds, setLengthSeconds] = useState(DEFAULT_PARAMETERS.lengthSeconds);
  const [providerPinned, setProviderPinned] = useState(false);
  const [referenceClips, setReferenceClips] = useState<ReferenceClip[]>([]);
  const [isDraggingReference, setIsDraggingReference] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const referencePreviewUrls = useRef(new Set<string>());

  // Blue Ocean state
  const [selectedPalette, setSelectedPalette] = useState<SoundPalette | null>(null);
  const [selectedGameState, setSelectedGameState] = useState<GameState | null>(null);
  const [currentBundle, setCurrentBundle] = useState<StemBundle | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const toast = useCallback((message: string, tone: ToastItem["tone"] = "neutral") => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 4000);
  }, []);

  const addReferenceFiles = useCallback(
    (fileList: FileList | File[] | null) => {
      if (!fileList || fileList.length === 0) return;
      const allFiles = Array.from(fileList);
      const audioFiles = allFiles.filter((file) => file.type.startsWith("audio/"));
      if (!audioFiles.length) {
        toast("Only audio files can be used as references.", "error");
        return;
      }
      if (audioFiles.length !== allFiles.length) {
        toast("Non-audio files were ignored.", "neutral");
      }

      const availableSlots = Math.max(0, MAX_REFERENCE_FILES - referenceClips.length);
      if (availableSlots <= 0) {
        toast(`You can attach up to ${MAX_REFERENCE_FILES} audio references.`, "error");
        return;
      }

      const accepted: ReferenceClip[] = [];
      const oversized: string[] = [];
      for (const file of audioFiles) {
        if (accepted.length >= availableSlots) break;
        if (file.size > MAX_REFERENCE_FILE_BYTES) {
          oversized.push(file.name);
          continue;
        }

        const previewUrl = URL.createObjectURL(file);
        referencePreviewUrls.current.add(previewUrl);
        accepted.push({
          id: crypto.randomUUID(),
          file,
          name: file.name,
          size: file.size,
          type: file.type || "audio/mpeg",
          previewUrl,
        });
      }

      if (accepted.length) {
        setReferenceClips((prev) => [...prev, ...accepted]);
      }
      if (oversized.length) {
        toast(`These files exceeded ${MAX_REFERENCE_FILE_SIZE_LABEL}: ${oversized.join(", ")}`, "error");
      }
    },
    [referenceClips.length, toast],
  );

  const removeReference = useCallback((id: string) => {
    setReferenceClips((prev) => {
      const clip = prev.find((item) => item.id === id);
      if (clip) {
        URL.revokeObjectURL(clip.previewUrl);
        referencePreviewUrls.current.delete(clip.previewUrl);
      }
      return prev.filter((item) => item.id !== id);
    });
  }, []);

  useEffect(() => {
    const urls = referencePreviewUrls.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);

  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    addReferenceFiles(event.target.files);
    event.target.value = "";
  };

  const handleReferenceDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDraggingReference(false);
    addReferenceFiles(event.dataTransfer.files);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDraggingReference(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDraggingReference(false);
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const serializeReferencePayloads = useCallback(async (): Promise<AudioReferencePayload[]> => {
    if (!referenceClips.length) return [];
    return Promise.all(
      referenceClips.map(async (clip) => ({
        id: clip.id,
        name: clip.name,
        mimeType: clip.type || "audio/mpeg",
        size: clip.size,
        data: await readFileAsBase64(clip.file),
      })),
    );
  }, [referenceClips]);

  const recommendedProvider = useMemo(() => {
    return recommendProvider(prompt, referenceClips.length > 0, lengthSeconds);
  }, [prompt, referenceClips.length, lengthSeconds]);

  useEffect(() => {
    if (!providerPinned && recommendedProvider && selectedProvider !== recommendedProvider) {
      setSelectedProvider(recommendedProvider);
    }
  }, [providerPinned, recommendedProvider, selectedProvider]);

  const handleProviderChange = useCallback((provider: ProviderId) => {
    setProviderPinned(true);
    setSelectedProvider(provider);
  }, []);

  const resetProviderToAuto = useCallback(() => {
    setProviderPinned(false);
    if (recommendedProvider) {
      setSelectedProvider(recommendedProvider);
    }
  }, [recommendedProvider]);

  const saveToLibrary = async () => {
    if (!currentSound || currentSound.status !== "ready") {
      toast("No sound to save. Generate a sound first.", "error");
      return;
    }

    try {
      const response = await fetch("/api/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(currentSound),
      });

      if (!response.ok) throw new Error("Failed to save to library");
      toast("Saved to library.", "success");
    } catch {
      toast("Failed to save to library.", "error");
    }
  };

  const handlePlayLibrarySound = (sound: LibrarySound) => {
    setCurrentSound(sound);
    setMode("generate");
  };

  const runGeneration = async () => {
    if (isGenerating) {
      toast("Generation in progress.", "neutral");
      return;
    }

    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) {
      toast("Enter a prompt to generate.", "error");
      return;
    }

    const seedValue = DEFAULT_PARAMETERS.seed ?? Math.floor(Math.random() * 1000);
    const requestParameters = { ...DEFAULT_PARAMETERS, lengthSeconds, seed: seedValue };
    const pendingSound: SoundGeneration = {
      id: crypto.randomUUID(),
      name: generateSoundName(trimmedPrompt),
      prompt: trimmedPrompt,
      createdAt: new Date().toISOString(),
      audioUrl: null,
      status: "pending",
      ...requestParameters,
    };

    setCurrentSound(pendingSound);
    setIsGenerating(true);

    try {
      const referencePayloads = await serializeReferencePayloads();
      const response = await fetch("/api/generate-sound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: trimmedPrompt,
          parameters: requestParameters,
          provider: selectedProvider,
          references: referencePayloads,
          palette: selectedPalette,
          gameState: selectedGameState,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error ?? "Generation failed");
      }

      const data = (await response.json()) as { audioUrl: string; provenanceCid?: string };
      setCurrentSound((prev) =>
        prev ? { ...prev, audioUrl: data.audioUrl, status: "ready", provenanceCid: data.provenanceCid } : prev
      );
      toast("Generation complete.", "success");
    } catch (error) {
      setCurrentSound((prev) =>
        prev ? { ...prev, status: "error", errorMessage: error instanceof Error ? error.message : "Unknown error." } : prev
      );
      toast("Generation failed.", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const runGameAudioGeneration = async () => {
    if (isGenerating) {
      toast("Generation in progress.", "neutral");
      return;
    }

    if (!selectedGameState) {
      toast("Select a game state.", "error");
      return;
    }

    setIsGenerating(true);
    setCurrentBundle(null);

    try {
      const response = await fetch("/api/generate-game-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameState: selectedGameState,
          palette: selectedPalette,
          duration: lengthSeconds,
          bpm: DEFAULT_PARAMETERS.bpm,
          key: DEFAULT_PARAMETERS.key,
          basePrompt: prompt.trim() || undefined,
          provider: selectedProvider,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error ?? "Generation failed");
      }

      const data = await response.json();
      if (data.success && data.bundle) {
        setCurrentBundle(data.bundle);
        toast(`Generated ${data.bundle.stems.length} stems.`, "success");
      } else {
        throw new Error(data.error || "Unknown error");
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : "Generation failed.", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text">
      {/* Header */}
      <header className="border-b border-brand-border">
        <div className="mx-auto max-w-container px-6 py-6">
          <div className="flex items-center justify-between">
            <h1 className="font-display text-display-lg">Swanblade</h1>

            {/* Mode Toggle */}
            <nav className="flex gap-1">
              <button
                onClick={() => setMode("generate")}
                className={`px-4 py-2 uppercase-label border transition ${
                  mode === "generate"
                    ? "border-[#0A0A0A] bg-[#0A0A0A] text-[#FAFAFA]"
                    : "border-[#E0E0E0] bg-transparent text-[#6A6A6A] hover:border-[#0A0A0A] hover:text-[#0A0A0A]"
                }`}
              >
                Generate
              </button>
              <button
                onClick={() => setMode("game-audio")}
                className={`px-4 py-2 uppercase-label border transition ${
                  mode === "game-audio"
                    ? "border-[#0A0A0A] bg-[#0A0A0A] text-[#FAFAFA]"
                    : "border-[#E0E0E0] bg-transparent text-[#6A6A6A] hover:border-[#0A0A0A] hover:text-[#0A0A0A]"
                }`}
              >
                Game Audio
              </button>
              <button
                onClick={() => setMode("library")}
                className={`px-4 py-2 uppercase-label border transition ${
                  mode === "library"
                    ? "border-[#0A0A0A] bg-[#0A0A0A] text-[#FAFAFA]"
                    : "border-[#E0E0E0] bg-transparent text-[#6A6A6A] hover:border-[#0A0A0A] hover:text-[#0A0A0A]"
                }`}
              >
                Library
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-container px-6 py-8">
        {mode === "library" ? (
          <div className="card">
            <LibraryPanel onPlaySound={handlePlayLibrarySound} />
          </div>
        ) : mode === "game-audio" ? (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left: Controls */}
            <div className="space-y-6">
              <div className="card">
                <h4 className="text-heading-sm text-brand-text">Game State</h4>
                <p className="mt-1 text-body-sm text-brand-secondary">
                  Generate coherent stem bundles for specific game contexts.
                </p>
                <div className="mt-4">
                  <GameStateSelector
                    value={selectedGameState}
                    onChange={setSelectedGameState}
                    showDetails={true}
                  />
                </div>
              </div>

              <div className="card">
                <h4 className="text-heading-sm text-brand-text">Sound Palette</h4>
                <p className="mt-1 text-body-sm text-brand-secondary">
                  Constrain generation to a consistent aesthetic.
                </p>
                <div className="mt-4">
                  <PaletteEditor value={selectedPalette} onChange={setSelectedPalette} />
                </div>
              </div>

              <div className="card">
                <h4 className="text-heading-sm text-brand-text">Parameters</h4>

                {/* Duration */}
                <div className="mt-4">
                  <p className="uppercase-label text-brand-secondary">Duration</p>
                  <div className="mt-2 flex gap-2">
                    {[15, 30, 60].map((value) => (
                      <button
                        key={value}
                        onClick={() => setLengthSeconds(value)}
                        className={`px-4 py-2 uppercase-label border transition ${
                          lengthSeconds === value
                            ? "border-brand-text bg-brand-text text-brand-bg"
                            : "border-brand-border text-brand-secondary hover:border-brand-text hover:text-brand-text"
                        }`}
                      >
                        {value}s
                      </button>
                    ))}
                  </div>
                </div>

                {/* Provider */}
                <div className="mt-4">
                  <ProviderSelector
                    value={selectedProvider}
                    onChange={handleProviderChange}
                    prompt=""
                    recommendation={recommendedProvider}
                    isAuto={!providerPinned}
                    onResetAuto={providerPinned ? resetProviderToAuto : undefined}
                    durationSeconds={lengthSeconds}
                    hasReferences={false}
                  />
                </div>

                {/* Optional Prompt */}
                <div className="mt-4">
                  <p className="uppercase-label text-brand-secondary">Style Keywords (Optional)</p>
                  <textarea
                    className="input-field mt-2"
                    rows={2}
                    placeholder="e.g., orchestral, epic, brass..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    disabled={isGenerating}
                  />
                </div>

                {/* Generate Button */}
                <div className="mt-6">
                  <button
                    onClick={runGameAudioGeneration}
                    disabled={isGenerating || !selectedGameState}
                    className="btn-primary w-full"
                  >
                    {isGenerating ? "Generating..." : "Generate Stem Bundle"}
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Result */}
            <div className="card">
              <h4 className="text-heading-sm text-brand-text">Output</h4>

              {currentBundle ? (
                <div className="mt-4">
                  <div className="flex items-center justify-between border-b border-brand-border pb-3">
                    <div>
                      <p className="text-heading-sm capitalize">{currentBundle.gameState} Bundle</p>
                      <p className="text-body-sm text-brand-secondary">
                        {currentBundle.stems.length} stems generated
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    {currentBundle.stems.map((stem) => (
                      <div key={stem.stemType} className="border border-brand-border p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-body font-medium capitalize">{stem.stemType}</p>
                            <p className="text-body-sm text-brand-secondary">
                              {stem.duration}s · {stem.metadata.bpm} BPM
                              {stem.provenanceCid && " · Provenance verified"}
                            </p>
                          </div>
                        </div>
                        <div className="mt-2">
                          <audio
                            controls
                            src={stem.audioUrl}
                            preload="metadata"
                            controlsList="nodownload noplaybackrate"
                            className="h-8 w-full"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 border-t border-brand-border pt-4">
                    <p className="text-body-sm text-brand-secondary">
                      Bundle ID: {currentBundle.id}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mt-4 py-12 text-center">
                  <p className="text-body text-brand-secondary">
                    Select a game state and generate to create a stem bundle.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Generate Mode */
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left: Controls */}
            <div className="space-y-6">
              {/* Prompt */}
              <div className="card">
                <h4 className="text-heading-sm text-brand-text">Prompt</h4>
                <textarea
                  className="input-field mt-3"
                  rows={4}
                  placeholder="Describe the sound you want to generate..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  disabled={isGenerating}
                />

                {/* Suggestions */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {PROMPT_SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setPrompt(suggestion)}
                      className="btn-secondary px-3 py-1.5 text-[10px]"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>

              {/* References */}
              <div className="card">
                <h4 className="text-heading-sm text-brand-text">Audio References</h4>
                <p className="mt-1 text-body-sm text-brand-secondary">
                  Upload audio files as inspiration for generation.
                </p>

                <div
                  className={`mt-4 border-2 border-dashed p-6 text-center transition ${
                    isDraggingReference ? "border-brand-text bg-brand-surface" : "border-brand-border"
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleReferenceDrop}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*"
                    multiple
                    className="hidden"
                    onChange={handleFileInputChange}
                  />
                  <p className="text-body-sm text-brand-secondary">
                    Drag audio files here or{" "}
                    <button
                      type="button"
                      onClick={openFilePicker}
                      className="text-brand-text underline"
                    >
                      browse
                    </button>
                  </p>
                  <p className="mt-1 text-body-sm text-brand-secondary">
                    Up to {MAX_REFERENCE_FILES} files, {MAX_REFERENCE_FILE_SIZE_LABEL} max each
                  </p>
                </div>

                {referenceClips.length > 0 && (
                  <div className="mt-4 space-y-3">
                    {referenceClips.map((clip) => (
                      <ReferenceClipCard key={clip.id} clip={clip} onRemove={removeReference} />
                    ))}
                  </div>
                )}
              </div>

              {/* Parameters */}
              <div className="card">
                <h4 className="text-heading-sm text-brand-text">Parameters</h4>

                {/* Provider */}
                <div className="mt-4">
                  <ProviderSelector
                    value={selectedProvider}
                    onChange={handleProviderChange}
                    prompt={prompt}
                    recommendation={recommendedProvider}
                    isAuto={!providerPinned}
                    onResetAuto={providerPinned ? resetProviderToAuto : undefined}
                    durationSeconds={lengthSeconds}
                    hasReferences={referenceClips.length > 0}
                  />
                </div>

                {/* Duration */}
                <div className="mt-4">
                  <p className="uppercase-label text-brand-secondary">Duration</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {LENGTH_PRESETS.map((value) => (
                      <button
                        key={value}
                        onClick={() => setLengthSeconds(value)}
                        className={`px-4 py-2 uppercase-label border transition ${
                          lengthSeconds === value
                            ? "border-brand-text bg-brand-text text-brand-bg"
                            : "border-brand-border text-brand-secondary hover:border-brand-text hover:text-brand-text"
                        }`}
                      >
                        {value < 60 ? `${value}s` : `${value / 60}m`}
                      </button>
                    ))}
                    <div className="flex items-center border border-brand-border px-3 py-2">
                      <input
                        type="number"
                        min={2}
                        max={120}
                        value={lengthSeconds}
                        onChange={(e) => setLengthSeconds(Math.max(2, Math.min(120, Number(e.target.value))))}
                        className="w-12 bg-transparent text-center text-body text-brand-text focus:outline-none"
                      />
                      <span className="ml-1 text-body-sm text-brand-secondary">s</span>
                    </div>
                  </div>
                </div>

                {/* Advanced: Palette & Game State */}
                <div className="mt-4">
                  <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="uppercase-label text-brand-secondary hover:text-brand-text"
                  >
                    {showAdvanced ? "- Hide" : "+ Show"} Advanced Options
                  </button>

                  {showAdvanced && (
                    <div className="mt-4 space-y-4 border-t border-brand-border pt-4">
                      <div>
                        <p className="uppercase-label text-brand-secondary">Sound Palette</p>
                        <div className="mt-2">
                          <PaletteEditor value={selectedPalette} onChange={setSelectedPalette} />
                        </div>
                      </div>
                      <div>
                        <p className="uppercase-label text-brand-secondary">Game State</p>
                        <div className="mt-2">
                          <GameStateSelector value={selectedGameState} onChange={setSelectedGameState} showDetails={false} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Active Constraints */}
                {(selectedPalette || selectedGameState) && (
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-brand-border pt-4">
                    {selectedPalette && (
                      <span className="border border-brand-border px-2 py-1 text-body-sm">
                        Palette: {selectedPalette.name}
                      </span>
                    )}
                    {selectedGameState && (
                      <span className="border border-brand-border px-2 py-1 text-body-sm capitalize">
                        State: {selectedGameState}
                      </span>
                    )}
                  </div>
                )}

                {/* Generate Button */}
                <div className="mt-6">
                  <button
                    onClick={runGeneration}
                    disabled={isGenerating}
                    className="btn-primary w-full"
                  >
                    {isGenerating ? "Generating..." : "Generate Sound"}
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Result */}
            <div className="card">
              <h4 className="text-heading-sm text-brand-text">Output</h4>

              {currentSound ? (
                <div className="mt-4">
                  <div className="border-b border-brand-border pb-4">
                    <p className="uppercase-label text-brand-secondary">{currentSound.status}</p>
                    <h3 className="mt-1 font-display text-display-md">{currentSound.name}</h3>
                    <p className="mt-2 text-body text-brand-secondary">{currentSound.prompt}</p>

                    {currentSound.provenanceCid && (
                      <div className="mt-2">
                        <span className="border border-brand-border px-2 py-1 text-body-sm">
                          Provenance: {currentSound.provenanceCid.slice(0, 16)}...
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4">
                    <WaveformPlaceholder
                      isActive={currentSound.status === "ready"}
                      isLoading={currentSound.status === "pending"}
                    />
                  </div>

                  {currentSound.status === "error" ? (
                    <div className="mt-4 border border-status-error bg-status-error/5 p-4">
                      <p className="text-body text-status-error">
                        {currentSound.errorMessage ?? "Generation failed."}
                      </p>
                    </div>
                  ) : (
                    <div className="mt-4 space-y-3">
                      <AudioPlayerControls
                        key={currentSound.audioUrl ?? currentSound.id}
                        audioUrl={currentSound.audioUrl}
                        disabled={currentSound.status !== "ready"}
                      />
                      <button
                        onClick={saveToLibrary}
                        disabled={currentSound.status !== "ready"}
                        className="btn-secondary w-full"
                      >
                        Save to Library
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-4 py-12 text-center">
                  <p className="text-body text-brand-secondary">
                    Enter a prompt and generate to create audio.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <ToastStack items={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </div>
  );
}
