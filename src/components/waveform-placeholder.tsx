"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface WaveformPlaceholderProps {
  isActive?: boolean;
  isLoading?: boolean;
}

export function WaveformPlaceholder({ isActive, isLoading }: WaveformPlaceholderProps) {
  const bars = useMemo(
    () =>
      Array.from({ length: 120 }, (_, index) => {
        const pseudoRandom = Math.abs(Math.sin(index * 12.9898 + 78.233) * Math.cos(index * 0.618));
        const smoothWave = Math.sin(index * 0.15) * 0.3;
        return 0.4 + (pseudoRandom % 1) * 0.6 + smoothWave;
      }),
    [],
  );

  return (
    <div className="w-full rounded-3xl border border-emerald-400/20 bg-gradient-to-br from-black/60 via-emerald-950/30 to-black/60 p-6 backdrop-blur-2xl shadow-2xl shadow-emerald-500/10">
      <div className={cn("flex h-40 items-end gap-[2px] overflow-hidden", isLoading && "animate-pulse opacity-70")}>
        {bars.map((scale, idx) => {
          const normalizedHeight = isActive ? scale * 100 : scale * 60;
          const barHeight = Math.max(12, normalizedHeight);
          const hue = 160 + (idx / bars.length) * 20;

          return (
            <div
              key={idx}
              className={cn(
                "flex-1 rounded-full bg-gradient-to-t transition-all duration-300 ease-out",
                isActive ? "opacity-100 shadow-lg shadow-emerald-400/30" : "opacity-60",
              )}
              style={{
                height: `${barHeight}%`,
                background: `linear-gradient(to top,
                  hsl(${hue}, 70%, 15%) 0%,
                  hsl(${hue}, 80%, 45%) 50%,
                  hsl(${hue}, 90%, 65%) 100%)`,
                animationDelay: `${idx * 15}ms`,
                animationDuration: `${1200 + (idx % 7) * 100}ms`,
                animationName: isActive ? "audiogen-bounce" : undefined,
                filter: isActive ? "brightness(1.2) saturate(1.3)" : "brightness(0.8)",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
