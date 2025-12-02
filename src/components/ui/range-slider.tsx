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
    <label className="flex w-full flex-col gap-2 text-sm text-white/60">
      {label && <span className="text-xs font-semibold uppercase tracking-[0.3em] text-white/40">{label}</span>}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        className={cn(
          "h-2 w-full appearance-none rounded-full bg-white/10 accent-emerald-400 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-400 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-emerald-400",
          className,
        )}
        {...props}
      />
    </label>
  );
}
