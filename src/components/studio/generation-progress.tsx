"use client";

import { useEffect, useRef, useState } from "react";

interface GenerationProgressProps {
  isActive: boolean;
  label?: string;
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function GenerationProgress({ isActive, label }: GenerationProgressProps) {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isActive) {
      setElapsed(0);
      intervalRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive]);

  if (!isActive) return null;

  return (
    <div className="py-6">
      {/* Thin progress line — indeterminate sweep */}
      <div className="relative w-full h-px bg-white/[0.06] overflow-hidden">
        <div className="absolute inset-y-0 left-0 h-full bg-white/30 animate-progress-sweep" />
      </div>

      {/* Label + Timer */}
      <div className="flex items-center justify-between mt-3">
        <span className="text-[11px] text-gray-500 font-light">
          {label ?? "Generating"}
        </span>
        <span className="text-[11px] text-gray-500 font-mono tabular-nums">
          {formatElapsed(elapsed)}
        </span>
      </div>
    </div>
  );
}
