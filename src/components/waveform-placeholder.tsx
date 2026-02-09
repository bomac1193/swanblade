"use client";

import { useId, useMemo } from "react";
import { cn } from "@/lib/utils";

interface WaveformPlaceholderProps {
  isActive?: boolean;
  isLoading?: boolean;
}

export function WaveformPlaceholder({ isActive, isLoading }: WaveformPlaceholderProps) {
  const gradientId = useId();
  const bars = useMemo(
    () =>
      Array.from({ length: 120 }, (_, index) => {
        const pseudoRandom = Math.abs(Math.sin(index * 12.9898 + 78.233) * Math.cos(index * 0.618));
        const smoothWave = Math.sin(index * 0.15) * 0.3;
        return 0.4 + (pseudoRandom % 1) * 0.6 + smoothWave;
      }),
    [],
  );

  const pathD = useMemo(() => {
    const amplitude = isActive ? 40 : 28;
    const baseline = 50;
    const coords = bars
      .map((value, idx) => {
        const x = (idx / (bars.length - 1)) * 100;
        const centered = value - 0.5;
        const y = baseline - centered * amplitude;
        return `${idx === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(" ");
    return `M 0 ${baseline} ${coords} L 100 ${baseline} Z`;
  }, [bars, isActive]);

  return (
    <div className="w-full border border-brand-border/30 bg-brand-bg p-4">
      <div className={cn("relative h-32 w-full", isLoading && "animate-pulse opacity-70")}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(10, 10, 10, 0.1)" />
              <stop offset="50%" stopColor="rgba(10, 10, 10, 0.3)" />
              <stop offset="100%" stopColor="rgba(10, 10, 10, 0.1)" />
            </linearGradient>
          </defs>
          <path
            d={pathD}
            fill={`url(#${gradientId})`}
            opacity={isActive ? 0.9 : 0.5}
            className="transition-all duration-500"
          />
          <path
            d={pathD}
            fill="none"
            stroke="rgba(10, 10, 10, 0.4)"
            strokeWidth={isActive ? 0.9 : 0.6}
            className="transition-all duration-500"
          />
        </svg>
      </div>
    </div>
  );
}
