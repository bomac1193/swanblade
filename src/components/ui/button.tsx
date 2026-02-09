import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "danger";
type Size = "sm" | "md" | "lg" | "icon";

const variantClasses: Record<Variant, string> = {
  primary: "bg-brand-text text-brand-bg border border-brand-text hover:bg-brand-accent hover:border-brand-accent",
  secondary: "bg-transparent text-brand-text border border-brand-border/30 hover:border-brand-text",
  ghost: "bg-transparent text-brand-secondary hover:text-brand-text hover:bg-brand-border/30",
  outline: "border border-brand-border/30 text-brand-text hover:border-brand-text",
  danger: "bg-status-error text-white border border-status-error hover:opacity-90",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-9 px-4 text-label",
  md: "h-11 px-6 text-label",
  lg: "h-12 px-8 text-label",
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
          "relative inline-flex items-center justify-center font-medium uppercase tracking-wider transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-text focus-visible:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed",
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        disabled={disabled || loading}
        {...props}
      >
        <span className="flex items-center gap-2">
          {loading && <span className="h-1.5 w-1.5 animate-ping bg-current"></span>}
          <span>{children}</span>
        </span>
      </button>
    );
  },
);

Button.displayName = "Button";
