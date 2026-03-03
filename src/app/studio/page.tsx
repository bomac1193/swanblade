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
import { uuid } from "@/lib/utils";
import type { SoundPalette } from "@/lib/soundPalette";
import type { StemBundle } from "@/lib/stemGenerator";
import type { O8Identity, O8Provenance } from "@/lib/o8/types";
import { generateSoundName } from "@/lib/utils";
import { useKeyboardShortcuts, getShortcutsList } from "@/hooks/useKeyboardShortcuts";
import { useTheme } from "@/hooks/useTheme";
import { useGenerationHistory } from "@/hooks/useGenerationHistory";
import { GenerationHistory, HistoryControls } from "@/components/generation-history";
import { usePresets } from "@/hooks/usePresets";
import { PresetsPanel } from "@/components/presets-panel";

type AppMode = "generate" | "game-audio" | "library";

type BriefMode = "sound" | "song" | "stem" | "catalog" | "album";

const BRIEF_MODES: { id: BriefMode; label: string; description: string }[] = [
  { id: "sound", label: "Sound", description: "Single sound effect, texture, or loop" },
  { id: "song", label: "Song", description: "Full composition with structure" },
  { id: "stem", label: "Stem", description: "Individual layer — drums, bass, vocals, etc." },
  { id: "catalog", label: "Catalog", description: "Batch of related sounds with shared DNA" },
  { id: "album", label: "Album", description: "Cohesive multi-track collection" },
];

const BRIEF_PLACEHOLDERS: Record<BriefMode, string> = {
  sound: "Describe the sound you need...",
  song: "Describe the mood, genre, and energy of the track...",
  stem: "Describe the layer — instrument, feel, role in the mix...",
  catalog: "Describe the family of sounds — shared texture, purpose, aesthetic...",
  album: "Describe the world — narrative arc, sonic palette, track flow...",
};

const BRIEF_SUGGESTIONS: Record<BriefMode, string[]> = {
  sound: [
    "Glitchy UI clicks in a neon-lit cybercafe",
    "Afrobeats percussion with metallic hits",
    "Deep dubstep bass stab with reverb tail",
    "Ambient rain with distant traffic",
  ],
  song: [
    "Afrobeats x UK garage crossover, 128 BPM, euphoric",
    "Lo-fi jazz ballad with tape hiss and soft Rhodes",
    "Dark minimal techno, hypnotic, 4 AM warehouse",
    "Neo-soul with live drums and warm synth pads",
  ],
  stem: [
    "808 sub bass pattern, trap feel, D minor",
    "Chopped vocal chops, pitched and glitchy",
    "Acoustic guitar loop, fingerpicked, melancholic",
    "Hi-hat pattern, bouncy triplets, crisp",
  ],
  catalog: [
    "10 cinematic risers for sci-fi trailers",
    "UI sound kit — clicks, hovers, confirms, errors",
    "Organic foley textures from a Lagos market",
    "Modular synth stabs, all in the same harmonic family",
  ],
  album: [
    "6-track ambient EP inspired by West African coastline",
    "Electronic producer album — each track a different city",
    "Instrumental beats tape, dusty samples, warm",
    "Soundtrack for a film set in near-future Nairobi",
  ],
};

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

const MAX_REFERENCE_FILES = 10;
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

function ReferenceClipCard({ clip, onRemove, dataProtected }: { clip: ReferenceClip; onRemove: (id: string) => void; dataProtected?: boolean }) {
  return (
    <div className="border border-[#1a1a1a] bg-[#0a0a0a] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {dataProtected && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-emerald-500 shrink-0">
              <path d="M12 2L4 6v6c0 5.25 3.4 10.2 8 12 4.6-1.8 8-6.75 8-12V6l-8-4z" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.15" />
            </svg>
          )}
          <div>
            <p className="text-sm font-medium text-white">{clip.name}</p>
            <p className="text-body-sm font-light text-gray-500">{formatDisplayBytes(clip.size)}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onRemove(clip.id)}
          className="text-body-sm font-light text-gray-500 hover:text-white"
        >
          Remove
        </button>
      </div>
      <div className="mt-3 border border-[#1a1a1a] bg-black p-2">
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
  const [briefMode, setBriefMode] = useState<BriefMode>("sound");
  const [prompt, setPrompt] = useState("");
  const [currentSound, setCurrentSound] = useState<SoundGeneration | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<ProviderId>("replicate");
  const [lengthSeconds, setLengthSeconds] = useState(DEFAULT_PARAMETERS.lengthSeconds);
  const [providerPinned, setProviderPinned] = useState(false);
  const [referenceClips, setReferenceClips] = useState<ReferenceClip[]>([]);
  const [isDraggingReference, setIsDraggingReference] = useState(false);
  const [dataProtected, setDataProtected] = useState(true);
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

  // Keyboard shortcuts state
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Theme
  const { toggleTheme, isDark } = useTheme();

  // Generation history
  const {
    history: generationHistory,
    currentIndex: historyIndex,
    addToHistory,
    canUndo,
    canRedo,
    undo,
    redo,
    goTo: goToHistory,
    clearHistory,
  } = useGenerationHistory();

  const handleUndo = useCallback(() => {
    const sound = undo();
    if (sound) setCurrentSound(sound);
  }, [undo]);

  const handleRedo = useCallback(() => {
    const sound = redo();
    if (sound) setCurrentSound(sound);
  }, [redo]);

  const handleHistorySelect = useCallback((index: number) => {
    const sound = goToHistory(index);
    if (sound) setCurrentSound(sound);
  }, [goToHistory]);

  // Presets
  const { presets, savePreset, deletePreset } = usePresets();

  const handleSavePreset = useCallback((name: string) => {
    savePreset({
      name,
      prompt,
      provider: selectedProvider,
      lengthSeconds,
      palette: selectedPalette,
      gameState: selectedGameState,
    });
  }, [savePreset, prompt, selectedProvider, lengthSeconds, selectedPalette, selectedGameState]);

  const handleLoadPreset = useCallback((preset: { prompt: string; provider: string; lengthSeconds: number; palette?: unknown; gameState?: unknown }) => {
    setPrompt(preset.prompt);
    setSelectedProvider(preset.provider as ProviderId);
    setLengthSeconds(preset.lengthSeconds);
    if (preset.palette) setSelectedPalette(preset.palette as SoundPalette);
    if (preset.gameState) setSelectedGameState(preset.gameState as GameState);
  }, []);

  const toast = useCallback((message: string, tone: ToastItem["tone"] = "neutral") => {
    const id = uuid();
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
          id: uuid(),
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

  const clearAllReferences = useCallback(() => {
    setReferenceClips((prev) => {
      prev.forEach((clip) => {
        URL.revokeObjectURL(clip.previewUrl);
        referencePreviewUrls.current.delete(clip.previewUrl);
      });
      return [];
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
      toast("Enter a brief to generate.", "error");
      return;
    }

    // Combine user prompt with o8 identity modifier
    const fullPrompt = o8PromptModifier
      ? `${trimmedPrompt}. Style: ${o8PromptModifier}`
      : trimmedPrompt;

    const seedValue = DEFAULT_PARAMETERS.seed ?? Math.floor(Math.random() * 1000);
    const requestParameters = { ...DEFAULT_PARAMETERS, lengthSeconds, seed: seedValue };
    const pendingSound: SoundGeneration = {
      id: uuid(),
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
          brief_mode: briefMode,
          parameters: requestParameters,
          provider: selectedProvider,
          references: referencePayloads,
          palette: selectedPalette,
          gameState: selectedGameState,
          data_protection: dataProtected,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error ?? "Generation failed");
      }

      const data = (await response.json()) as { audioUrl: string; provenanceCid?: string };
      const completedSound = {
        ...pendingSound,
        audioUrl: data.audioUrl,
        status: "ready" as const,
        provenanceCid: data.provenanceCid,
      };
      setCurrentSound(completedSound);
      addToHistory(completedSound);
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

  // Keyboard shortcuts
  const shortcuts = useMemo(
    () => [
      {
        key: "g",
        description: "Generate sound",
        action: () => {
          if (mode === "generate") runGeneration();
          else if (mode === "game-audio") runGameAudioGeneration();
        },
      },
      {
        key: "s",
        ctrl: true,
        description: "Save to library",
        action: () => {
          if (currentSound?.status === "ready") saveToLibrary();
        },
      },
      {
        key: "1",
        description: "Switch to Generate mode",
        action: () => setMode("generate"),
      },
      {
        key: "2",
        description: "Switch to Game Audio mode",
        action: () => setMode("game-audio"),
      },
      {
        key: "3",
        description: "Switch to Library",
        action: () => setMode("library"),
      },
      {
        key: "?",
        description: "Show keyboard shortcuts",
        action: () => setShowShortcuts((prev) => !prev),
      },
      {
        key: "d",
        description: "Toggle dark mode",
        action: toggleTheme,
      },
      {
        key: "z",
        ctrl: true,
        description: "Undo (previous generation)",
        action: handleUndo,
      },
      {
        key: "z",
        ctrl: true,
        shift: true,
        description: "Redo (next generation)",
        action: handleRedo,
      },
      {
        key: "Escape",
        description: "Close dialogs",
        action: () => {
          setShowShortcuts(false);
          setShowStemExport(false);
        },
      },
    ],
    [mode, currentSound?.status, toggleTheme, handleUndo, handleRedo]
  );

  useKeyboardShortcuts(shortcuts);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-black border-r border-[#1a1a1a] flex flex-col z-30">
        {/* Logo */}
        <div className="p-6 border-b border-[#1a1a1a]">
          <span
            className="text-2xl text-white"
            style={{ fontFamily: "var(--font-canela), Georgia, serif" }}
          >
            Swanblade
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {(["generate", "game-audio", "library"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setMode(tab)}
              className={`block w-full text-left px-4 py-3 transition-all duration-200 border-l-2 ${
                mode === tab
                  ? "text-white border-l-[#66023C]"
                  : "text-gray-500 hover:text-white border-transparent"
              }`}
            >
              <span className="font-display">
                {tab === "game-audio" ? "Game Audio" : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </span>
            </button>
          ))}
        </nav>

        {/* Bottom */}
        <div className="p-4 border-t border-[#1a1a1a]">
          <div className="px-4 py-3 text-xs text-gray-600">
            Press <kbd className="px-1 border border-[#1a1a1a] text-gray-500">?</kbd> for shortcuts
          </div>
        </div>
      </aside>

      {/* Header */}
      <header className="fixed top-0 left-64 right-0 h-16 bg-black border-b border-[#1a1a1a] flex items-center px-6 z-20">
        {/* Search */}
        <div className="relative w-96 flex items-center">
          <svg className="absolute left-3 w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.5" />
            <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder="Search sounds..."
            className="w-full h-10 pl-10 pr-4 bg-[#0a0a0a] border border-[#1a1a1a] text-white text-sm font-light placeholder:text-gray-500 focus:outline-none focus:border-[#333] transition-all duration-200"
          />
        </div>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-4">
          <button
            onClick={() => setShowShortcuts(true)}
            className="flex items-center justify-center w-10 h-10 text-gray-500 hover:text-white transition-colors"
            title="Keyboard shortcuts"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
              <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M6 16h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
          <div className="w-8 h-8 bg-[#0a0a0a] border border-[#1a1a1a] flex items-center justify-center text-sm text-gray-400">
            S
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="ml-64 pt-28 min-h-screen px-8 pb-12">
        {mode === "library" ? (
          <>
            <h2 className="text-[11px] font-display tracking-wide text-white mb-4">Library</h2>
            <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-6">
              <LibraryPanel />
            </div>
          </>
        ) : mode === "game-audio" ? (
          <>
          <h2 className="text-[11px] font-display tracking-wide text-white mb-4">Game Audio</h2>
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left: Controls */}
            <div className="space-y-6">
              {/* ∞8 Identity */}
              <O8IdentityPanel
                onIdentityChange={handleIdentityChange}
                className="bg-[#0a0a0a] border border-[#1a1a1a]"
              />

              <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-6">
                <p className="text-sm font-medium text-gray-400">Game State</p>
                <p className="mt-2 text-body-sm font-light text-gray-500">
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

              <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-6">
                <p className="text-sm font-medium text-gray-400">Sound Palette</p>
                <p className="mt-2 text-body-sm font-light text-gray-500">
                  Constrain generation to a consistent aesthetic.
                </p>
                <div className="mt-4">
                  <PaletteEditor value={selectedPalette} onChange={setSelectedPalette} />
                </div>
              </div>

              <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-6">
                <p className="text-sm font-medium text-gray-400">Parameters</p>

                {/* Duration */}
                <div className="mt-4">
                  <p className="text-body-sm font-light text-gray-500">Duration</p>
                  <div className="mt-2 flex gap-2">
                    {[15, 30, 60].map((value) => (
                      <button
                        key={value}
                        onClick={() => setLengthSeconds(value)}
                        className={`px-4 py-2 text-body-sm border transition ${
                          lengthSeconds === value
                            ? "border-white bg-white text-black"
                            : "border-[#1a1a1a] text-gray-500 hover:border-white hover:text-white"
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

                {/* Optional Brief */}
                <div className="mt-4">
                  <p className="text-body-sm font-light text-gray-500">Style Direction (Optional)</p>
                  <textarea
                    className="w-full bg-black border-0 border-b border-[#1a1a1a] px-3 py-3 text-white font-light placeholder:text-gray-600 focus:outline-none focus:border-[#333] transition-colors mt-2 resize-none"
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
                    className="w-full px-6 py-3 text-body-sm font-medium text-black bg-white hover:bg-gray-200 transition-colors duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isGenerating ? "Generating..." : "Generate Stem Bundle"}
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Result */}
            <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-6">
              <p className="text-sm font-medium text-gray-400">Output</p>

              {currentBundle ? (
                <div className="mt-4">
                  <div className="flex items-center justify-between border-b border-[#1a1a1a] pb-3">
                    <div>
                      <p className="text-lg font-medium capitalize text-white" style={{ fontFamily: "var(--font-canela), Georgia, serif" }}>{currentBundle.gameState} Bundle</p>
                      <p className="text-body-sm font-light text-gray-500">
                        {currentBundle.stems.length} stems generated
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    {currentBundle.stems.map((stem) => (
                      <div key={stem.stemType} className="border border-[#1a1a1a] p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium capitalize">{stem.stemType}</p>
                            <p className="text-body-sm font-light text-gray-500">
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

                  <div className="mt-4 border-t border-[#1a1a1a] pt-4">
                    <p className="text-body-sm font-light text-gray-500">
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
                        <p className="text-body-sm font-light text-gray-500">
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
                  <p className="text-sm font-light text-gray-500">
                    Select a game state and generate to create a stem bundle.
                  </p>
                </div>
              )}
            </div>
          </div>
          </>
        ) : (
          /* Generate Mode */
          <>
          <h2 className="text-[11px] font-display tracking-wide text-white mb-4">Generate</h2>
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left: Controls */}
            <div className="space-y-6">
              {/* Brief */}
              <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-400">Brief</p>
                  <p className="text-body-sm font-light text-gray-600">
                    {BRIEF_MODES.find((m) => m.id === briefMode)?.description}
                  </p>
                </div>

                {/* Mode Tabs */}
                <div className="mt-4 flex gap-px bg-[#111]">
                  {BRIEF_MODES.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setBriefMode(m.id)}
                      className={`flex-1 px-3 py-2 text-body-sm font-light transition-all duration-200 ${
                        briefMode === m.id
                          ? "bg-white text-black"
                          : "bg-[#0a0a0a] text-gray-500 hover:text-white"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                <textarea
                  className="w-full bg-black border-0 border-b border-[#1a1a1a] px-3 py-3 text-white font-light placeholder:text-gray-600 focus:outline-none focus:border-[#333] transition-colors mt-3 resize-none"
                  rows={3}
                  placeholder={BRIEF_PLACEHOLDERS[briefMode]}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  disabled={isGenerating}
                />

                {/* Suggestions */}
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {BRIEF_SUGGESTIONS[briefMode].map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setPrompt(suggestion)}
                      className="px-2.5 py-1 text-xs text-gray-500 hover:text-white hover:bg-white/5 transition-all duration-200"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>

              {/* Presets */}
              <PresetsPanel
                presets={presets}
                onSelect={handleLoadPreset}
                onSave={handleSavePreset}
                onDelete={deletePreset}
                className="bg-[#0a0a0a] border border-[#1a1a1a]"
              />

              {/* References */}
              <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-400">Audio References</p>
                  {referenceClips.length > 0 && (
                    <p className="text-body-sm font-light text-gray-500">
                      {referenceClips.length} of {MAX_REFERENCE_FILES} slots used
                    </p>
                  )}
                </div>
                <p className="mt-2 text-body-sm font-light text-gray-500">
                  Upload audio files as inspiration for generation.
                </p>

                {/* Data Protection Toggle */}
                <div className="mt-4 flex items-center justify-between border border-[#1a1a1a] p-3">
                  <div className="flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className={dataProtected ? "text-emerald-500" : "text-gray-600"}>
                      <path d="M12 2L4 6v6c0 5.25 3.4 10.2 8 12 4.6-1.8 8-6.75 8-12V6l-8-4z" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.15" />
                    </svg>
                    <span className="text-body-sm font-light text-white">Data Protection</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDataProtected((prev) => !prev)}
                    className={`relative w-9 h-5 rounded-full transition-colors ${dataProtected ? "bg-emerald-600" : "bg-[#333]"}`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${dataProtected ? "translate-x-4" : "translate-x-0"}`}
                    />
                  </button>
                </div>
                {!dataProtected && (
                  <p className="mt-2 text-body-sm font-light text-amber-500/80">
                    Your audio may be used to improve generation quality.
                  </p>
                )}

                <div
                  className={`group mt-4 relative cursor-pointer overflow-hidden border transition-all duration-300 ${
                    isDraggingReference
                      ? "border-white/30 bg-white/[0.03]"
                      : "border-[#1a1a1a] hover:border-[#333]"
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleReferenceDrop}
                  onClick={openFilePicker}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*"
                    multiple
                    className="hidden"
                    onChange={handleFileInputChange}
                  />
                  {/* Subtle gradient line at top */}
                  <div className={`absolute top-0 left-0 right-0 h-px transition-opacity duration-300 ${isDraggingReference ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`} style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)" }} />

                  <div className="flex items-center gap-5 px-6 py-5">
                    {/* Icon */}
                    <div className={`flex items-center justify-center w-10 h-10 border transition-all duration-300 ${isDraggingReference ? "border-white/20 bg-white/5" : "border-[#1a1a1a] group-hover:border-[#333]"}`}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className={`transition-all duration-300 ${isDraggingReference ? "text-white -translate-y-0.5" : "text-gray-500 group-hover:text-gray-300"}`}>
                        <path d="M12 16V4m0 0l-4 4m4-4l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M20 16v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-light transition-colors duration-300 ${isDraggingReference ? "text-white" : "text-gray-400 group-hover:text-gray-300"}`}>
                        {isDraggingReference ? "Drop to add references" : "Drop audio files or click to browse"}
                      </p>
                      <p className="mt-0.5 text-body-sm font-light text-gray-600">
                        {MAX_REFERENCE_FILE_SIZE_LABEL} max per file
                      </p>
                    </div>

                    {/* Arrow */}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-gray-600 group-hover:text-gray-400 transition-colors duration-300 shrink-0">
                      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>

                {referenceClips.length > 0 && (
                  <div className="mt-4">
                    {referenceClips.length > 1 && (
                      <div className="flex justify-end mb-3">
                        <button
                          type="button"
                          onClick={clearAllReferences}
                          className="text-body-sm font-light text-gray-500 hover:text-white transition-colors"
                        >
                          Clear all
                        </button>
                      </div>
                    )}
                    <div className="space-y-3">
                      {referenceClips.map((clip) => (
                        <ReferenceClipCard key={clip.id} clip={clip} onRemove={removeReference} dataProtected={dataProtected} />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* ∞8 Identity */}
              <O8IdentityPanel
                onIdentityChange={handleIdentityChange}
                className="bg-[#0a0a0a] border border-[#1a1a1a]"
              />

              {/* Parameters */}
              <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-6">
                <p className="text-sm font-medium text-gray-400">Parameters</p>

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
                  <p className="text-body-sm font-light text-gray-500">Duration</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {LENGTH_PRESETS.map((value) => (
                      <button
                        key={value}
                        onClick={() => setLengthSeconds(value)}
                        className={`px-4 py-2 text-body-sm border transition ${
                          lengthSeconds === value
                            ? "border-white bg-white text-black"
                            : "border-[#1a1a1a] text-gray-500 hover:border-white hover:text-white"
                        }`}
                      >
                        {value < 60 ? `${value}s` : `${value / 60}m`}
                      </button>
                    ))}
                    <div className="flex items-center border border-[#1a1a1a] px-3 py-2">
                      <input
                        type="number"
                        min={2}
                        max={120}
                        value={lengthSeconds}
                        onChange={(e) => setLengthSeconds(Math.max(2, Math.min(120, Number(e.target.value))))}
                        className="w-12 bg-transparent text-center text-sm text-white focus:outline-none"
                      />
                      <span className="ml-1 text-body-sm font-light text-gray-500">s</span>
                    </div>
                  </div>
                </div>

                {/* Advanced: Palette & Game State */}
                <div className="mt-4">
                  <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="text-body-sm font-light text-gray-500 hover:text-white"
                  >
                    {showAdvanced ? "- Hide" : "+ Show"} Advanced Options
                  </button>

                  {showAdvanced && (
                    <div className="mt-4 space-y-4 border-t border-[#1a1a1a] pt-4">
                      <div>
                        <p className="text-body-sm font-light text-gray-500">Sound Palette</p>
                        <div className="mt-2">
                          <PaletteEditor value={selectedPalette} onChange={setSelectedPalette} />
                        </div>
                      </div>
                      <div>
                        <p className="text-body-sm font-light text-gray-500">Game State</p>
                        <div className="mt-2">
                          <GameStateSelector value={selectedGameState} onChange={setSelectedGameState} showDetails={false} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Active Constraints */}
                {(selectedPalette || selectedGameState) && (
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-[#1a1a1a] pt-4">
                    {selectedPalette && (
                      <span className="border border-[#1a1a1a] px-2 py-1 text-body-sm">
                        Palette: {selectedPalette.name}
                      </span>
                    )}
                    {selectedGameState && (
                      <span className="border border-[#1a1a1a] px-2 py-1 text-body-sm capitalize">
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
                    className="w-full px-6 py-3 text-body-sm font-medium text-black bg-white hover:bg-gray-200 transition-colors duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isGenerating ? "Generating..." : "Generate Sound"}
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Result */}
            <div className="space-y-4">
              <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-400">Output</p>
                  <HistoryControls
                    canUndo={canUndo}
                    canRedo={canRedo}
                    onUndo={handleUndo}
                    onRedo={handleRedo}
                  />
                </div>

                {currentSound ? (
                <div className="mt-4">
                  <div className="border-b border-[#1a1a1a] pb-4">
                    <p className="text-sm font-medium text-gray-400">{currentSound.status}</p>
                    <h3 className="mt-2 text-2xl font-medium text-white" style={{ fontFamily: "var(--font-canela), Georgia, serif" }}>{currentSound.name}</h3>
                    <p className="mt-2 text-sm font-light text-gray-500">{currentSound.prompt}</p>

                    {currentSound.provenanceCid && (
                      <div className="mt-2">
                        <span className="border border-[#1a1a1a] px-2 py-1 text-body-sm">
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
                    <div className="mt-4 border border-[#1a1a1a] p-4">
                      <p className="text-sm text-red-400">
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
                        <div className="flex items-center justify-between border border-[#1a1a1a] p-3">
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
                        className="w-full px-6 py-3 text-body-sm font-medium text-white border border-[#1a1a1a] hover:border-[#333] transition-colors duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Save to Library
                      </button>

                      {/* Stem Export to Burn the Square */}
                      {currentSound.status === "ready" && currentSound.audioUrl && (
                        <div className="border-t border-[#1a1a1a] pt-3">
                          <button
                            onClick={() => setShowStemExport(!showStemExport)}
                            className="flex w-full items-center justify-between text-left"
                          >
                            <span className="text-body-sm font-light text-gray-500">
                              Export to Burn the Square
                            </span>
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="none"
                              className={`text-gray-500 transition-transform ${showStemExport ? "rotate-180" : ""}`}
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
                  <p className="text-sm font-light text-gray-500">
                    Enter a brief and generate to create audio.
                  </p>
                </div>
              )}
              </div>

              {/* Generation History */}
              <GenerationHistory
                history={generationHistory}
                currentIndex={historyIndex}
                onSelect={handleHistorySelect}
                onClear={clearHistory}
              />
            </div>
          </div>
          </>
        )}
      </main>

      {/* Keyboard Shortcuts Modal */}
      {showShortcuts && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowShortcuts(false)}
        >
          <div
            className="bg-[#0a0a0a] border border-[#1a1a1a] p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-white" style={{ fontFamily: "var(--font-canela), Georgia, serif" }}>Shortcuts</h3>
              <button
                onClick={() => setShowShortcuts(false)}
                className="text-gray-500 hover:text-white"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M6 6l12 12M6 18L18 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="space-y-2">
              {getShortcutsList(shortcuts).map(({ key, description }) => (
                <div key={key} className="flex items-center justify-between py-2 border-b border-[#1a1a1a] last:border-b-0">
                  <span className="text-sm font-light text-gray-400">{description}</span>
                  <kbd className="px-2 py-1 bg-black border border-[#1a1a1a] text-caption font-mono text-gray-300">
                    {key}
                  </kbd>
                </div>
              ))}
            </div>
            <p className="mt-4 text-caption text-gray-600 text-center">
              Press <kbd className="px-1 bg-black border border-[#1a1a1a] text-gray-400">?</kbd> anytime
            </p>
          </div>
        </div>
      )}

      <ToastStack items={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </div>
  );
}
