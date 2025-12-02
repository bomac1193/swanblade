"use client";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { WaveformPlaceholder } from "@/components/waveform-placeholder";
import { AudioPlayerControls } from "@/components/audio-player-controls";
import type { SoundGeneration } from "@/types";

interface SoundDetailPanelProps {
  sound: SoundGeneration | null;
  onRegenerate: (sound: SoundGeneration) => void;
  onVariation: (sound: SoundGeneration) => void;
  onDownload: (sound: SoundGeneration) => void;
  onCopyPreset: (sound: SoundGeneration) => void;
}

export function SoundDetailPanel({ sound, onRegenerate, onVariation, onDownload, onCopyPreset }: SoundDetailPanelProps) {
  if (!sound) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-black/20 p-12 text-center">
        <p className="text-2xl font-semibold text-white">Audiogen is idle.</p>
        <p className="mt-3 max-w-md text-base text-white/60">
          Describe a sound using the composer below to generate cinematic sound design mockups.
        </p>
      </div>
    );
  }

  const disabled = sound.status !== "ready";

  return (
    <div className="flex h-full flex-col gap-6 rounded-3xl border border-white/5 bg-black/30/50 p-8 backdrop-blur-3xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-white/40">{sound.type}</p>
          <h2 className="mt-2 text-3xl font-semibold text-white">{sound.name}</h2>
          <p className="mt-2 text-sm text-white/60">{sound.prompt}</p>
        </div>
        <StatusBadge status={sound.status} />
      </div>

      <WaveformPlaceholder isActive={sound.status === "ready"} isLoading={sound.status === "pending"} />

      <AudioPlayerControls audioUrl={sound.audioUrl} disabled={disabled} />

      {sound.status === "error" && (
        <div className="rounded-2xl border border-red-400/30 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          {sound.errorMessage ?? "Generation failed. Try again with a different prompt or parameters."}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <Button
          variant="secondary"
          onClick={() => onRegenerate(sound)}
          disabled={sound.status === "pending"}
          className="w-full"
        >
          Regenerate
        </Button>
        <Button
          variant="secondary"
          onClick={() => onVariation(sound)}
          disabled={sound.status === "pending"}
          className="w-full"
        >
          Make Variation
        </Button>
        <Button variant="ghost" onClick={() => onDownload(sound)} disabled={!sound.audioUrl} className="w-full">
          Download
        </Button>
        <Button variant="ghost" onClick={() => onCopyPreset(sound)} className="w-full">
          Copy Preset
        </Button>
      </div>
    </div>
  );
}
