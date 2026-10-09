import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ErrorStateProps = {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
};

export function ErrorState({ title = "Не удалось загрузить данные", message, onRetry, className }: ErrorStateProps) {
  return (
    <div className={cn("rounded-lg border border-destructive/30 bg-destructive/10 p-5 text-sm", className)}>
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 size-5 text-destructive" aria-hidden />
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-destructive">{title}</h3>
          <p className="mt-1 text-muted-foreground">{message}</p>
          {onRetry ? (
            <Button className="mt-4" variant="outline" size="sm" onClick={onRetry}>
              Повторить
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
