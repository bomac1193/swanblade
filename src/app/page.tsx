"use client";

import { useCallback, useState } from "react";
import { PromptComposer } from "@/components/prompt-composer";
import { ShaderBackground } from "@/components/shader-background";
import { ToastItem, ToastStack } from "@/components/toast-stack";
import { WaveformPlaceholder } from "@/components/waveform-placeholder";
import { AudioPlayerControls } from "@/components/audio-player-controls";
import type { SoundGeneration } from "@/types";
import { generateSoundName } from "@/lib/utils";

const PROMPT_SUGGESTIONS = [
  "Glitchy UI clicks in a neon-lit cybercafe",
  "Afrobeats percussion with metallic hits",
  "Deep dubstep bass stab with reverb tail",
  "Ambient rain with distant traffic",
];

const DEFAULT_PARAMETERS = {
  type: "FX",
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

  const toast = useCallback((message: string, tone: ToastItem["tone"] = "neutral") => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 4000);
  }, []);

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
    <div className="relative min-h-screen overflow-hidden bg-[#010409] text-white">
      <div className="pointer-events-none absolute inset-0">
        <ShaderBackground />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(16,185,129,0.12),transparent_70%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/90" />
      </div>

      <main className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-16 text-center">
        <div className="flex w-full max-w-3xl flex-col items-center gap-8">
          <div>
            <p className="text-xs uppercase tracking-[0.5em] text-emerald-300">Audiogen</p>
            <h1 className="mt-4 text-4xl font-semibold sm:text-5xl">Prompt → Sound</h1>
            <p className="mt-3 text-base text-white/70">Describe your sound. I&apos;ll turn it into audio.</p>
          </div>

          <PromptComposer
            value={prompt}
            onChange={setPrompt}
            onSubmit={runGeneration}
            suggestions={PROMPT_SUGGESTIONS}
            isGenerating={isGenerating}
          />

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
                  <div className="mt-6">
                    <AudioPlayerControls
                      key={currentSound.audioUrl ?? currentSound.id}
                      audioUrl={currentSound.audioUrl}
                      disabled={currentSound.status !== "ready"}
                    />
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
        </div>
      </main>

      <ToastStack items={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((toast) => toast.id !== id))} />
    </div>
  );
}
