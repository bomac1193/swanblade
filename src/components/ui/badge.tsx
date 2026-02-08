import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Tone = "ready" | "pending" | "error" | "neutral";

const toneClasses: Record<Tone, string> = {
  ready: "bg-brand-text text-brand-bg",
  pending: "bg-brand-secondary text-brand-bg",
  error: "bg-status-error text-white",
  neutral: "bg-brand-border text-brand-text",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-3 py-1 text-label uppercase tracking-wider",
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}
