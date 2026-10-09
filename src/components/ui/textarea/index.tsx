import * as React from "react";
import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "min-h-24 w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground focus:border-primary/70 focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-55",
      className
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
