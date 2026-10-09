import { cn } from "@/lib/utils";

type MatchScoreProps = {
  value: number | null;
  label: string;
  compact?: boolean;
  className?: string;
};

export function MatchScore({ value, label, compact = false, className }: MatchScoreProps) {
  const hasValue = typeof value === "number" && Number.isFinite(value);
  const clamped = hasValue ? Math.max(0, Math.min(100, Math.round(value))) : null;
  const tone =
    clamped === null
      ? "border-border/70 bg-muted/35 text-muted-foreground"
      : clamped >= 75
        ? "border-success/25 bg-success/10 text-success"
        : clamped >= 50
          ? "border-warning/30 bg-warning/10 text-warning"
          : "border-destructive/30 bg-destructive/10 text-destructive";

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-1 text-xs tabular-nums",
        compact ? "justify-center" : "min-w-[4.75rem] justify-between gap-2",
        tone,
        className
      )}
      aria-label={`${label}: ${clamped ?? "—"}`}
    >
      <span className={compact ? "sr-only" : "truncate text-muted-foreground"}>{label}</span>
      <span className="font-semibold text-current">{clamped ?? "—"}</span>
    </div>
  );
}
