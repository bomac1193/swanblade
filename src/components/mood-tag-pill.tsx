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
        "border px-4 py-2 text-label uppercase tracking-wider transition-all",
        active
          ? "border-brand-text bg-brand-text text-brand-bg"
          : "border-brand-border/30 bg-transparent text-brand-secondary hover:border-brand-text hover:text-brand-text",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
