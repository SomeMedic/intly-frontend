import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />;
}

export function KpiCardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-[var(--card-padding)]">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-3 h-8 w-20" />
      <Skeleton className="mt-4 h-8 w-full" />
    </div>
  );
}

export function OpportunityCardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-[var(--card-padding)]">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="mt-2 h-3 w-1/2" />
      <div className="mt-4 flex gap-2">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-5 w-14" />
      </div>
    </div>
  );
}
