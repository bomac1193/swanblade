"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import { ToastItem, ToastStack } from "@/components/toast-stack";
import { WaveformPlaceholder } from "@/components/waveform-placeholder";
import { AudioPlayerControls } from "@/components/audio-player-controls";
import { LibraryPanel } from "@/components/library-panel";
import { ProviderSelector, type ProviderId, recommendProvider } from "@/components/provider-selector";
import type { AudioReferencePayload, SoundGeneration, SoundCategory } from "@/types";
import type { LibrarySound } from "@/lib/libraryStorage";
import { generateSoundName } from "@/lib/utils";

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
const MAX_REFERENCE_FILE_BYTES = 25 * 1024 * 1024; // 25MB
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
    <div className="rounded-2xl border border-white/10 bg-black/80 px-4 py-3 text-white shadow-[0_10px_30px_rgba(0,0,0,0.4)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">{clip.name}</p>
          <p className="text-[11px] uppercase tracking-[0.3em] text-white/50">{formatDisplayBytes(clip.size)}</p>
        </div>
        <button
          type="button"
          onClick={() => onRemove(clip.id)}
          className="text-[11px] font-semibold uppercase tracking-[0.4em] text-white/50 transition hover:text-rose-200"
        >
          Remove
        </button>
      </div>
      <div className="mt-2 rounded-xl border border-white/15 bg-black/90 px-3 py-2">
        <audio
          controls
          src={clip.previewUrl}
          preload="metadata"
          controlsList="nodownload noplaybackrate"
          className="h-8 w-full accent-white"
          style={{ colorScheme: "dark" }}
        />
      </div>
    </div>
  );
}

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [currentSound, setCurrentSound] = useState<SoundGeneration | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [showLibrary, setShowLibrary] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<ProviderId>("replicate");
  const [lengthSeconds, setLengthSeconds] = useState(DEFAULT_PARAMETERS.lengthSeconds);
  const [providerPinned, setProviderPinned] = useState(false);
  const [referenceClips, setReferenceClips] = useState<ReferenceClip[]>([]);
  const [isDraggingReference, setIsDraggingReference] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const referencePreviewUrls = useRef(new Set<string>());

  const toast = useCallback((message: string, tone: ToastItem["tone"] = "neutral") => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 4000);
  }, []);

  const addReferenceFiles = useCallback(
    (fileList: FileList | File[] | null) => {
      if (!fileList || fileList.length === 0) {
        return;
      }
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
      if (audioFiles.length > accepted.length + oversized.length) {
        toast("Audio reference limit reached. Remove one to add another.", "neutral");
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
    if (!referenceClips.length) {
      return [];
    }
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
    return recommendProvider(prompt, referenceClips.length > 0);
  }, [prompt, referenceClips.length]);

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

      if (!response.ok) {
        throw new Error("Failed to save to library");
      }

      toast("Saved to library!", "success");
    } catch {
      toast("Failed to save to library", "error");
    }
  };

  const handlePlayLibrarySound = (sound: LibrarySound) => {
    setCurrentSound(sound);
    setShowLibrary(false);
  };

  const runGeneration = async () => {
    if (isGenerating) {
      toast("Audiogen is still rendering. Please wait.", "neutral");
      return;
    }

    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) {
      toast("Describe the sound or how to treat your references.", "error");
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
          provider: selectedProvider, // Send selected provider
          references: referencePayloads,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error ?? "Mock generation failed");
      }

      const data = (await response.json()) as { audioUrl: string };
      setCurrentSound((prev) => (prev ? { ...prev, audioUrl: data.audioUrl, status: "ready" } : prev));
      toast("Audiogen finished rendering.", "success");
    } catch (error) {
      setCurrentSound((prev) =>
        prev
          ? {
              ...prev,
              status: "error",
              errorMessage: error instanceof Error ? error.message : "Unknown error.",
            }
          : prev,
      );
      toast("Generation failed. Try again.", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-4">
        <div className="h-[88%] w-full max-w-5xl rounded-[40px] border border-white/10 bg-gradient-to-b from-zinc-950 via-black to-black shadow-[0_35px_120px_rgba(0,0,0,0.8)]" />
      </div>
      <main className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 pb-16 pt-28 text-center">
        <div className="flex w-full max-w-5xl flex-col items-center gap-8">
          <div>
            <p className="text-xs uppercase tracking-[0.5em] text-emerald-300">Swanblade</p>
            <h1 className="mt-4 text-2xl font-semibold sm:text-3xl">Burn the square. Birth the Strange.</h1>
          </div>

          {/* Library Toggle */}
          <div className="flex gap-3">
            <button
              onClick={() => setShowLibrary(false)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                !showLibrary ? "bg-emerald-500 text-white" : "bg-black/40 text-white/60 hover:text-white"
              }`}
            >
              Generate
            </button>
            <button
              onClick={() => setShowLibrary(true)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                showLibrary ? "bg-emerald-500 text-white" : "bg-black/40 text-white/60 hover:text-white"
              }`}
            >
              Library
            </button>
          </div>

          {showLibrary ? (
            <div className="w-full rounded-3xl border border-white/10 bg-black/40 p-6 backdrop-blur-2xl">
              <LibraryPanel onPlaySound={handlePlayLibrarySound} />
            </div>
          ) : (
            <>
              {/* Combined Prompt Composer with Provider Selection */}
              <div className="rounded-3xl border border-white/10 bg-black/50 p-6 backdrop-blur-3xl">
                <p className="text-xs uppercase tracking-[0.3em] text-white/40">Prompt Composer</p>

                {/* Reference Dropzone */}
                <div
                  className={`mt-4 rounded-2xl border-2 border-dashed px-5 py-6 text-left transition ${
                    isDraggingReference ? "border-emerald-400/70 bg-emerald-500/10" : "border-white/15 bg-black/30"
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
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.35em] text-white/50">Audio References</p>
                      <p className="text-sm text-white/70">
                        Drag WAV/MP3 inspiration here or upload up to {MAX_REFERENCE_FILES} clips (
                        {MAX_REFERENCE_FILE_SIZE_LABEL} max each).
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={openFilePicker}
                      className="self-start rounded-full border border-white/30 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white transition hover:border-emerald-400 hover:text-emerald-200"
                    >
                      Upload
                    </button>
                  </div>

                  {referenceClips.length ? (
                    <div className="mt-4 space-y-3">
                      {referenceClips.map((clip) => (
                        <ReferenceClipCard key={clip.id} clip={clip} onRemove={removeReference} />
                      ))}
                      <p className="text-xs text-white/50">
                        Swanblade mutates these stems according to your prompt. Reference order influences weight.
                      </p>
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-white/60">
                      Drop stems, full songs, or raw textures. Swanblade will treat them as DNA to warp per your prompt.
                    </p>
                  )}
                </div>

                {/* Provider Selector */}
                <div className="mt-3">
                  <ProviderSelector
                    value={selectedProvider}
                    onChange={handleProviderChange}
                    prompt={prompt}
                    recommendation={recommendedProvider}
                    isAuto={!providerPinned}
                    onResetAuto={providerPinned ? resetProviderToAuto : undefined}
                  />
                </div>

                {/* Length Selector */}
                <div className="mt-4 text-left">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-white/50">Length</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {LENGTH_PRESETS.map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setLengthSeconds(value)}
                        className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wider transition ${
                          lengthSeconds === value
                            ? "bg-emerald-500/80 text-white"
                            : "border border-white/15 text-white/60 hover:text-white"
                        }`}
                      >
                        {value < 60 ? `${value}s` : `${value / 60}m`}
                      </button>
                    ))}
                    <div className="flex items-center gap-2 rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/70">
                      <span>Custom</span>
                      <input
                        type="number"
                        min={2}
                        max={120}
                        value={lengthSeconds}
                        onChange={(event) => setLengthSeconds(Math.max(2, Math.min(120, Number(event.target.value))))}
                        className="w-16 bg-transparent text-right text-sm text-white focus:outline-none"
                      />
                      <span>s</span>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-white/50">Swanblade will keep the texture alive for the entire duration.</p>
                </div>

                {/* Prompt Input */}
                <textarea
                  className="mt-3 w-full rounded-3xl border border-white/10 bg-black/40 px-6 py-5 text-base text-white leading-relaxed placeholder:text-white/40 focus:border-emerald-400/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 disabled:opacity-60"
                  rows={3}
                  placeholder="Describe the sound or how to transform your references…"
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
                      className="rounded-full border border-white/15 px-4 py-2 text-xs text-white/70 transition hover:border-emerald-400/60 hover:text-white"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>

                {/* Generate Button */}
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={runGeneration}
                    disabled={isGenerating}
                    className="relative inline-flex items-center justify-center rounded-full font-medium uppercase tracking-wide transition-all focus-visible:outline-none focus-visible:ring-2 disabled:opacity-60 disabled:cursor-not-allowed bg-emerald-500/80 text-white hover:bg-emerald-400 focus-visible:ring-emerald-300 h-11 px-5 text-sm"
                  >
                    <span className="flex items-center gap-2">
                      <span>{isGenerating ? "Generating..." : "Generate Sound"}</span>
                    </span>
                  </button>
                </div>
              </div>

              <div className="w-full rounded-3xl border border-white/10 bg-black/40 p-6 backdrop-blur-2xl">
            {currentSound ? (
              <>
                <p className="text-xs uppercase tracking-[0.3em] text-white/40">{currentSound.status}</p>
                <h2 className="mt-2 text-2xl font-semibold">{currentSound.name}</h2>
                <p className="mt-1 text-sm text-white/60">{currentSound.prompt}</p>

                <div className="mt-6">
                  <WaveformPlaceholder isActive={currentSound.status === "ready"} isLoading={currentSound.status === "pending"} />
                </div>

                {currentSound.status === "error" ? (
                  <div className="mt-4 rounded-2xl border border-red-400/30 bg-red-950/40 px-4 py-3 text-sm text-red-200">
                    {currentSound.errorMessage ?? "Generation failed. Try again."}
                  </div>
                ) : (
                  <div className="mt-6 flex flex-col gap-3">
                    <AudioPlayerControls
                      key={currentSound.audioUrl ?? currentSound.id}
                      audioUrl={currentSound.audioUrl}
                      disabled={currentSound.status !== "ready"}
                    />
                    <button
                      onClick={saveToLibrary}
                      disabled={currentSound.status !== "ready"}
                      className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      💾 Save to Library
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center gap-2 py-8 text-sm text-white/60">
                <p>Cinematic silence.</p>
                <p>Prompt me and I&apos;ll paint a waveform.</p>
              </div>
            )}
          </div>
            </>
          )}
        </div>
      </main>

      <ToastStack items={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((toast) => toast.id !== id))} />
    </div>
  );
}
