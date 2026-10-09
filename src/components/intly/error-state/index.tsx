"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth";

type ErrorStateProps = {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
};

export function ErrorState({ title, message, onRetry, className }: ErrorStateProps) {
  const { user } = useAuth();
  const english = user?.settings.locale === "en";
  return (
    <div
      role="alert"
      className={cn(
        "rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-[0.8125rem]",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 size-4 text-destructive" aria-hidden />
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-destructive">
            {title ?? (english ? "Could not load this section" : "Не удалось загрузить раздел")}
          </h3>
          <p className="mt-1 text-muted-foreground">{message}</p>
          {onRetry ? (
            <Button className="mt-4" variant="outline" size="sm" onClick={onRetry}>
              {english ? "Try again" : "Попробовать снова"}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
