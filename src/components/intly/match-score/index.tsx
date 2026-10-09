import { cn } from "@/lib/utils";

type MatchScoreProps = {
  value: number | null;
  label: "Match" | "AI";
  className?: string;
};

export function MatchScore({ value, label, className }: MatchScoreProps) {
  if (value === null) {
    return (
      <div className={cn("grid place-items-center gap-1 text-center", className)}>
        <div className="grid size-12 place-items-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">—</div>
        <span className="text-[0.68rem] font-medium uppercase text-muted-foreground">{label}</span>
      </div>
    );
  }

  const clamped = Math.max(0, Math.min(100, value));
  const intent =
    clamped >= 75
      ? "text-success [--score-color:hsl(var(--success))]"
      : clamped >= 50
        ? "text-warning [--score-color:hsl(var(--warning))]"
        : "text-destructive [--score-color:hsl(var(--destructive))]";

  return (
    <div className={cn("grid place-items-center gap-1 text-center", className)}>
      <div
        className={cn(
          "grid size-12 place-items-center rounded-full text-xs font-semibold",
          intent
        )}
        style={{
          background: `conic-gradient(var(--score-color) ${clamped * 3.6}deg, hsl(var(--muted)) 0deg)`
        }}
      >
        <span className="grid size-9 place-items-center rounded-full bg-card">{clamped}</span>
      </div>
      <span className="text-[0.68rem] font-medium uppercase text-muted-foreground">{label}</span>
    </div>
  );
}
