import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 text-xs font-medium leading-5",
  {
    variants: {
      intent: {
        neutral: "border-border bg-muted text-muted-foreground",
        primary: "border-primary/30 bg-primary/10 text-primary",
        success: "border-success/30 bg-success/10 text-success",
        warning: "border-warning/40 bg-warning/15 text-warning",
        danger: "border-destructive/30 bg-destructive/10 text-destructive",
        ai: "border-ai/35 bg-ai/10 text-ai"
      }
    },
    defaultVariants: {
      intent: "neutral"
    }
  }
);

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>;

export function Badge({ className, intent, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ intent }), className)} {...props} />;
}
