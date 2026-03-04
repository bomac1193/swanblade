import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Tone = "ready" | "pending" | "error" | "neutral";

const toneClasses: Record<Tone, string> = {
  ready: "bg-white text-black",
  pending: "bg-gray-500 text-black",
  error: "bg-red-400 text-white",
  neutral: "bg-[#1a1a1a] text-white",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-3 py-1 text-caption uppercase tracking-wider",
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}
