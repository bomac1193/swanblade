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
      <div className="flex h-full flex-col items-center justify-center border border-dashed border-brand-border/30 bg-brand-surface p-6 text-center">
        <p className="text-body text-brand-secondary">Describe a sound and I&apos;ll design it.</p>
        <p className="mt-2 text-body-sm text-brand-secondary/60">Your sound history will live here.</p>
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
            "w-full border border-brand-border/30 p-4 text-left transition hover:border-brand-text",
            selectedId === sound.id && "border-brand-text bg-brand-bg",
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-body font-medium text-brand-text">{sound.name}</p>
              <p className="text-label uppercase tracking-wider text-brand-secondary">
                {sound.type} • {formatRelativeTimestamp(sound.createdAt)}
              </p>
            </div>
            <StatusBadge status={sound.status} />
          </div>
          <p className="mt-3 line-clamp-2 text-body-sm text-brand-secondary">{sound.prompt}</p>
        </button>
      ))}
    </div>
  );
}
