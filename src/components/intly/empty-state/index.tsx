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

export function EmptyState({ title, description, actionLabel, onAction, className, illustration = "empty" }: EmptyStateProps) {
  return (
    <div className={cn("rounded-lg border bg-card p-8 text-center", className)}>
      {illustration ? <BrandArt kind={illustration} className="mx-auto w-40 sm:w-48" /> : <SearchX className="mx-auto size-9 text-muted-foreground" aria-hidden />}
      <h3 className="mt-3 text-base font-semibold">{title}</h3>
      {description ? <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{description}</p> : null}
      {actionLabel ? (
        <Button className="mt-5" variant="outline" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
