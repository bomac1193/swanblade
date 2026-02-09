import { forwardRef, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "w-full border border-brand-border/30 bg-brand-bg px-4 py-4 text-body text-brand-text leading-relaxed placeholder:text-brand-secondary focus:border-brand-text focus:bg-brand-surface focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed",
        className,
      )}
      {...props}
    />
  ),
);

Textarea.displayName = "Textarea";
