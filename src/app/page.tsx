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
import { O8IdentityPanel } from "@/components/o8-identity-panel";
import { ProvenanceBadge, ProvenanceStampButton } from "@/components/provenance-badge";
import { StemExportPanel } from "@/components/stem-export-panel";
import type { AudioReferencePayload, SoundGeneration, SoundCategory, GameState } from "@/types";
import type { SoundPalette } from "@/lib/soundPalette";
import type { StemBundle } from "@/lib/stemGenerator";
import type { O8Identity, O8Provenance } from "@/lib/o8/types";
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

  // o8 Identity state
  const [o8Identity, setO8Identity] = useState<O8Identity | null>(null);
  const [o8PromptModifier, setO8PromptModifier] = useState<string>("");
  const [currentProvenance, setCurrentProvenance] = useState<O8Provenance | null>(null);
  const [showStemExport, setShowStemExport] = useState(false);

  const handleIdentityChange = useCallback((identity: O8Identity | null, promptModifier: string) => {
    setO8Identity(identity);
    setO8PromptModifier(promptModifier);
  }, []);

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

    // Combine user prompt with o8 identity modifier
    const fullPrompt = o8PromptModifier
      ? `${trimmedPrompt}. Style: ${o8PromptModifier}`
      : trimmedPrompt;

    const seedValue = DEFAULT_PARAMETERS.seed ?? Math.floor(Math.random() * 1000);
    const requestParameters = { ...DEFAULT_PARAMETERS, lengthSeconds, seed: seedValue };
    const pendingSound: SoundGeneration = {
      id: crypto.randomUUID(),
      name: generateSoundName(trimmedPrompt),
      prompt: fullPrompt,
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
      <header className="border-b border-brand-border bg-brand-surface">
        <div className="mx-auto max-w-container px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Logo */}
              <svg width="36" height="36" viewBox="0 0 100 100" fill="none" className="text-brand-text">
                <path
                  d="M25 85 C15 75, 12 55, 20 40 C28 25, 35 15, 50 10 C55 8, 58 12, 55 18 C52 24, 48 28, 45 35 C42 42, 44 48, 50 50 C56 52, 65 48, 75 35 C85 22, 90 15, 95 12"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                  fill="none"
                />
                <path
                  d="M25 85 C30 80, 40 78, 50 80 C60 82, 68 78, 72 70 C76 62, 72 55, 65 52"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  fill="none"
                />
                <path d="M75 35 L95 12" stroke="currentColor" strokeWidth="5" strokeLinecap="square" />
                <circle cx="22" cy="88" r="4" fill="currentColor" />
                <ellipse cx="32" cy="92" rx="3" ry="2" fill="currentColor" />
              </svg>
              <h1 className="brand-title text-2xl tracking-tight">Swanblade</h1>
            </div>

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
            <LibraryPanel />
          </div>
        ) : mode === "game-audio" ? (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left: Controls */}
            <div className="space-y-6">
              {/* ∞8 Identity */}
              <O8IdentityPanel
                onIdentityChange={handleIdentityChange}
                className="card p-0"
              />

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

                    {/* Bundle Provenance */}
                    <div className="mt-3">
                      {o8Identity ? (
                        <div className="flex items-center gap-2 text-[#66023C]">
                          <svg width="14" height="14" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" fill="none" />
                            <path d="M8 12l2.5 2.5L16 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          </svg>
                          <span className="text-body-sm">
                            Created by {o8Identity.creator.name}
                          </span>
                        </div>
                      ) : (
                        <p className="text-body-sm text-brand-secondary">
                          Connect an ∞8 identity to stamp provenance
                        </p>
                      )}
                    </div>

                    {/* Export all stems to Burn the Square */}
                    {currentBundle.stems.length > 0 && (
                      <button
                        onClick={() => toast(`Exported ${currentBundle.stems.length} stems to Burn the Square.`, "success")}
                        className="mt-3 w-full border border-[#66023C] bg-[#66023C]/10 px-4 py-2 text-[#66023C] transition-colors hover:bg-[#66023C] hover:text-white"
                      >
                        <span className="flex items-center justify-center gap-2">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          </svg>
                          Export to Burn the Square
                        </span>
                      </button>
                    )}
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

              {/* ∞8 Identity */}
              <O8IdentityPanel
                onIdentityChange={handleIdentityChange}
                className="card p-0"
              />

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

                      {/* Provenance */}
                      {currentSound.status === "ready" && (
                        <div className="flex items-center justify-between border border-brand-border p-3">
                          {currentProvenance ? (
                            <ProvenanceBadge provenance={currentProvenance} />
                          ) : (
                            <ProvenanceStampButton
                              identityId={o8Identity?.identity_id ?? "anonymous"}
                              prompt={currentSound.prompt}
                              audioFingerprint={`swanblade-${currentSound.id}-${Date.now()}`}
                              parameters={{
                                lengthSeconds: currentSound.lengthSeconds,
                                type: currentSound.type,
                                provider: selectedProvider,
                              }}
                              provider={selectedProvider}
                              onStamped={(result) => {
                                setCurrentProvenance({
                                  identity_id: o8Identity?.identity_id ?? "anonymous",
                                  fingerprint: result.declaration_cid,
                                  timestamp: new Date().toISOString(),
                                  content_type: "audio",
                                });
                                toast("Audio stamped with provenance.", "success");
                              }}
                            />
                          )}
                        </div>
                      )}

                      <button
                        onClick={saveToLibrary}
                        disabled={currentSound.status !== "ready"}
                        className="btn-secondary w-full"
                      >
                        Save to Library
                      </button>

                      {/* Stem Export to Burn the Square */}
                      {currentSound.status === "ready" && currentSound.audioUrl && (
                        <div className="border-t border-brand-border pt-3">
                          <button
                            onClick={() => setShowStemExport(!showStemExport)}
                            className="flex w-full items-center justify-between text-left"
                          >
                            <span className="uppercase-label text-brand-secondary">
                              Export to Burn the Square
                            </span>
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="none"
                              className={`text-brand-secondary transition-transform ${showStemExport ? "rotate-180" : ""}`}
                            >
                              <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                          </button>
                          {showStemExport && (
                            <div className="mt-3">
                              <StemExportPanel
                                soundId={currentSound.id}
                                soundName={currentSound.name}
                                audioUrl={currentSound.audioUrl}
                                onExport={(config) => {
                                  toast(`Exported ${config.stems.length} stems to Burn the Square.`, "success");
                                  setShowStemExport(false);
                                }}
                              />
                            </div>
                          )}
                        </div>
                      )}
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
