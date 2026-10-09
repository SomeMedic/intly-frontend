import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "flex h-[var(--control-height)] w-full min-w-0 rounded-md border border-input bg-card px-3 text-[0.8125rem] text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary/70 focus:ring-2 focus:ring-ring/20 aria-invalid:border-destructive disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
