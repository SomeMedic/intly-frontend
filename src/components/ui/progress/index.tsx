"use client";

import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "@/lib/utils";

export function Progress({ value, className }: { value: number; className?: string }) {
  return (
    <ProgressPrimitive.Root
      className={cn("h-1.5 overflow-hidden rounded-full bg-secondary", className)}
      value={value}
    >
      <ProgressPrimitive.Indicator
        className="h-full rounded-full bg-primary transition-all"
        style={{ transform: `translateX(-${100 - value}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}
