import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { KpiMetric } from "@/types";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function KpiCard({ metric }: { metric: KpiMetric }) {
  const negative = metric.delta?.trim().startsWith("-");
  const sparkline = metric.sparkline?.filter((value) => Number.isFinite(value));
  return (
    <Card className="p-[var(--card-padding)] transition hover:-translate-y-0.5 hover:border-primary/45 hover:shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase text-muted-foreground">{metric.label}</p>
        {metric.delta ? (
          <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium", negative ? "text-destructive" : "text-success")}>
            {negative ? <ArrowDownRight className="size-3" /> : <ArrowUpRight className="size-3" />}
            {metric.delta}
          </span>
        ) : null}
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="text-2xl font-semibold tracking-normal">{metric.value}</div>
        {sparkline?.length ? (
          <div className="flex h-8 items-end gap-0.5" aria-label="Тренд">
            {sparkline.map((value, index) => <span key={index} className="w-1 rounded-sm bg-primary/55" style={{ height: `${Math.max(12, value)}%` }} />)}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
