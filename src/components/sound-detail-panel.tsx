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
      <div className="flex h-full flex-col items-center justify-center border border-dashed border-brand-border bg-brand-surface p-12 text-center">
        <p className="font-display text-display-lg text-brand-text">Swanblade is idle.</p>
        <p className="mt-3 max-w-md text-body text-brand-secondary">
          Describe a sound using the composer below to generate audio mockups.
        </p>
      </div>
    );
  }

  const disabled = sound.status !== "ready";

  return (
    <div className="flex h-full flex-col gap-6 border border-brand-border bg-brand-surface p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-label uppercase tracking-wider text-brand-secondary">{sound.type}</p>
          <h2 className="mt-2 font-display text-display-lg text-brand-text">{sound.name}</h2>
          <p className="mt-2 text-body text-brand-secondary">{sound.prompt}</p>
        </div>
        <StatusBadge status={sound.status} />
      </div>

      <WaveformPlaceholder isActive={sound.status === "ready"} isLoading={sound.status === "pending"} />

      <AudioPlayerControls audioUrl={sound.audioUrl} disabled={disabled} />

      {sound.status === "error" && (
        <div className="border border-status-error bg-brand-surface px-4 py-3 text-body text-status-error">
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
