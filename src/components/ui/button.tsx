import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "danger";
type Size = "sm" | "md" | "lg" | "icon";

const variantClasses: Record<Variant, string> = {
  primary: "bg-white text-black border border-white hover:bg-[#66023C] hover:border-[#66023C]",
  secondary: "bg-transparent text-white border border-[#1a1a1a] hover:border-white",
  ghost: "bg-transparent text-gray-500 hover:text-white hover:bg-[#1a1a1a]",
  outline: "border border-[#1a1a1a] text-white hover:border-white",
  danger: "bg-red-400 text-white border border-red-400 hover:opacity-90",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-9 px-4 text-caption",
  md: "h-11 px-6 text-caption",
  lg: "h-12 px-8 text-caption",
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
          "relative inline-flex items-center justify-center font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white focus-visible:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed",
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
