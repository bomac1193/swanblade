import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-brand-surface border border-brand-border p-6",
        className,
      )}
      {...props}
    />
  );
}
