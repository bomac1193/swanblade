"use client";

import { useCallback, useState } from "react";
import { PromptComposer } from "@/components/prompt-composer";
import { ToastItem, ToastStack } from "@/components/toast-stack";
import { WaveformPlaceholder } from "@/components/waveform-placeholder";
import { AudioPlayerControls } from "@/components/audio-player-controls";
import { LibraryPanel } from "@/components/library-panel";
import { ProviderSelector, type ProviderId } from "@/components/provider-selector";
import type { SoundGeneration, SoundCategory } from "@/types";
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

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [currentSound, setCurrentSound] = useState<SoundGeneration | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [showLibrary, setShowLibrary] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<ProviderId>("replicate");

  const toast = useCallback((message: string, tone: ToastItem["tone"] = "neutral") => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 4000);
  }, []);

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
    } catch (error) {
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
      toast("Describe the sound you want me to build.", "error");
      return;
    }

    const seedValue = DEFAULT_PARAMETERS.seed ?? Math.floor(Math.random() * 1000);
    const requestParameters = { ...DEFAULT_PARAMETERS, seed: seedValue };
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
      const response = await fetch("/api/generate-sound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: trimmedPrompt,
          parameters: requestParameters,
          provider: selectedProvider, // Send selected provider
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

                {/* Provider Selector */}
                <div className="mt-3">
                  <ProviderSelector
                    value={selectedProvider}
                    onChange={setSelectedProvider}
                    prompt={prompt}
                  />
                </div>

                {/* Prompt Input */}
                <textarea
                  className="mt-3 w-full rounded-3xl border border-white/10 bg-black/40 px-6 py-5 text-base text-white leading-relaxed placeholder:text-white/40 focus:border-emerald-400/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 disabled:opacity-60"
                  rows={3}
                  placeholder="Describe the sound you want Audiogen to create…"
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
