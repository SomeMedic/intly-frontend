"use client";

import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function Checkbox({ className, ...props }: CheckboxPrimitive.CheckboxProps) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        "flex size-4 items-center justify-center rounded-sm border bg-card text-primary transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator>
        <Check className="size-3" strokeWidth={2.4} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
