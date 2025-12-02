"use client";

import { StatusBadge } from "@/components/status-badge";
import type { SoundGeneration } from "@/types";
import { formatRelativeTimestamp, cn } from "@/lib/utils";

interface SoundHistoryListProps {
  items: SoundGeneration[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function SoundHistoryList({ items, selectedId, onSelect }: SoundHistoryListProps) {
  if (!items.length) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-black/20 p-6 text-center">
        <p className="text-sm text-white/60">Describe a sound and I&apos;ll design it.</p>
        <p className="mt-2 text-xs text-white/30">Your sound history will live here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((sound) => (
        <button
          key={sound.id}
          type="button"
          onClick={() => onSelect(sound.id)}
          className={cn(
            "w-full rounded-3xl border border-white/10 p-4 text-left transition hover:border-emerald-400/40 hover:bg-emerald-400/5",
            selectedId === sound.id && "border-emerald-400/80 bg-emerald-500/10 shadow-[0_0_50px_rgba(16,185,129,0.3)]",
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-white">{sound.name}</p>
              <p className="text-[11px] uppercase tracking-[0.3em] text-white/40">
                {sound.type} • {formatRelativeTimestamp(sound.createdAt)}
              </p>
            </div>
            <StatusBadge status={sound.status} />
          </div>
          <p className="mt-3 line-clamp-2 text-sm text-white/60">{sound.prompt}</p>
        </button>
      ))}
    </div>
  );
}
