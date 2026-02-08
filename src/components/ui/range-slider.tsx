import { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface RangeSliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  min?: number;
  max?: number;
  step?: number;
}

export function RangeSlider({ className, label, min = 0, max = 100, step = 1, ...props }: RangeSliderProps) {
  return (
    <label className="flex w-full flex-col gap-2 text-body text-brand-secondary">
      {label && <span className="text-label uppercase tracking-wider text-brand-secondary">{label}</span>}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        className={cn(
          "h-1 w-full appearance-none bg-brand-border accent-brand-text [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:bg-brand-text [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-brand-text",
          className,
        )}
        {...props}
      />
    </label>
  );
}
