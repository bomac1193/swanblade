import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "danger";
type Size = "sm" | "md" | "lg" | "icon";

const variantClasses: Record<Variant, string> = {
  primary: "bg-emerald-500/80 text-white hover:bg-emerald-400 focus-visible:ring-emerald-300",
  secondary: "bg-white/10 text-white hover:bg-white/20 focus-visible:ring-white/30",
  ghost: "bg-transparent text-white/70 hover:text-white hover:bg-white/5 focus-visible:ring-white/20",
  outline: "border border-white/20 text-white hover:bg-white/5 focus-visible:ring-white/30",
  danger: "bg-red-500/80 text-white hover:bg-red-400 focus-visible:ring-red-400",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-base",
  icon: "h-11 w-11",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "relative inline-flex items-center justify-center rounded-full font-medium uppercase tracking-wide transition-all focus-visible:outline-none focus-visible:ring-2 disabled:opacity-60 disabled:cursor-not-allowed",
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        disabled={disabled || loading}
        {...props}
      >
        <span className="flex items-center gap-2">
          {loading && <span className="h-2 w-2 animate-ping rounded-full bg-current"></span>}
          <span>{children}</span>
        </span>
      </button>
    );
  },
);

Button.displayName = "Button";
