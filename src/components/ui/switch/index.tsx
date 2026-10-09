"use client";

import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

export function Switch({ className, ...props }: SwitchPrimitive.SwitchProps) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "relative h-5 w-9 rounded-full border bg-muted transition data-[state=checked]:border-primary data-[state=checked]:bg-primary",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="block size-4 translate-x-0.5 rounded-full bg-background shadow transition data-[state=checked]:translate-x-4" />
    </SwitchPrimitive.Root>
  );
}
