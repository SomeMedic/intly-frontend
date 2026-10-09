import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BrandArt, type BrandArtKind } from "@/components/intly/brand";

type EmptyStateProps = {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  illustration?: BrandArtKind | false;
};

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  className,
  illustration = "empty"
}: EmptyStateProps) {
  return (
    <div className={cn("rounded-lg border border-dashed bg-card/64 p-7 text-center", className)}>
      {illustration ? (
        <BrandArt kind={illustration} className="mx-auto w-32 opacity-95 sm:w-40" />
      ) : (
        <SearchX className="mx-auto size-8 text-muted-foreground" aria-hidden />
      )}
      <h3 className="mt-3 text-sm font-semibold">{title}</h3>
      {description ? (
        <p className="mx-auto mt-2 max-w-md text-[0.8125rem] leading-5 text-muted-foreground">
          {description}
        </p>
      ) : null}
      {actionLabel && onAction ? (
        <Button className="mt-5" variant="outline" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
