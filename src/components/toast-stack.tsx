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
  success: "border-brand-text bg-brand-surface text-brand-text",
  error: "border-status-error bg-brand-surface text-status-error",
  neutral: "border-brand-border bg-brand-surface text-brand-text",
};

export function ToastStack({ items, onDismiss }: ToastStackProps) {
  return (
    <div className="pointer-events-none fixed bottom-6 right-6 flex w-80 flex-col gap-3">
      {items.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "pointer-events-auto border px-4 py-3 text-body shadow-lg",
            toneClasses[toast.tone],
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <p>{toast.message}</p>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="text-label uppercase tracking-wider text-brand-secondary hover:text-brand-text"
            >
              Close
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
