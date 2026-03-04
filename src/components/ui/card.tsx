import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-[#0a0a0a] border border-[#1a1a1a] p-6",
        className,
      )}
      {...props}
    />
  );
}
