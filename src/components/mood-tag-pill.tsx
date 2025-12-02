"use client";

import { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface MoodTagPillProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

export function MoodTagPill({ active, className, children, ...props }: MoodTagPillProps) {
  return (
    <button
      type="button"
      className={cn(
        "rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] transition-all",
        active
          ? "border-emerald-400/60 bg-emerald-500/20 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]"
          : "border-white/15 bg-transparent text-white/70 hover:border-white/40 hover:text-white",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
