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
        "border px-4 py-2 text-sm transition-all",
        active
          ? "border-white bg-white text-black"
          : "border-[#1a1a1a] bg-transparent text-gray-500 hover:border-white hover:text-white",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
