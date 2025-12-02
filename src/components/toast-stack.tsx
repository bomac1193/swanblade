"use client";

import { cn } from "@/lib/utils";

export type ToastTone = "success" | "error" | "neutral";

export interface ToastItem {
  id: string;
  message: string;
  tone: ToastTone;
}

interface ToastStackProps {
  items: ToastItem[];
  onDismiss: (id: string) => void;
}

const toneClasses: Record<ToastTone, string> = {
  success: "border-emerald-400/40 bg-emerald-500/10 text-emerald-50",
  error: "border-red-400/40 bg-red-950/30 text-red-200",
  neutral: "border-white/20 bg-white/5 text-white",
};

export function ToastStack({ items, onDismiss }: ToastStackProps) {
  return (
    <div className="pointer-events-none fixed bottom-6 right-6 flex w-80 flex-col gap-3">
      {items.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "pointer-events-auto rounded-2xl border px-4 py-3 text-sm shadow-2xl backdrop-blur-2xl",
            toneClasses[toast.tone],
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <p>{toast.message}</p>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="text-xs uppercase tracking-[0.3em] text-white/60"
            >
              Close
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
