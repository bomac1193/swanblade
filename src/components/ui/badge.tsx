import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Tone = "ready" | "pending" | "error" | "neutral";

const toneClasses: Record<Tone, string> = {
  ready: "bg-emerald-500/20 text-emerald-200 border border-emerald-500/40",
  pending: "bg-yellow-500/10 text-yellow-200 border border-yellow-500/30",
  error: "bg-red-500/10 text-red-200 border border-red-500/30",
  neutral: "bg-white/10 text-white border border-white/20",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em]",
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}
