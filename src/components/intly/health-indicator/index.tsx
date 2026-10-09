"use client";

import { Activity, AlertCircle, CheckCircle2 } from "lucide-react";
import type { SystemHealth } from "@/types";
import { useAuth } from "@/features/auth";
import { cn } from "@/lib/utils";

const labels = {
  ru: {
    sources: "Источники",
    failed: "Ошибки",
    fallbackByStatus: {
      operational: "Источники работают",
      degraded: "Есть проблемы с источниками",
      issue: "Есть ошибки источников",
      unknown: "Статус источников ещё не проверен"
    }
  },
  en: {
    sources: "Sources",
    failed: "Failed",
    fallbackByStatus: {
      operational: "Sources operational",
      degraded: "Some sources need attention",
      issue: "Source errors detected",
      unknown: "Source status has not been checked yet"
    }
  }
} as const;

const localizedBackendLabels = {
  "Источники работают": {
    en: labels.en.fallbackByStatus.operational
  },
  "Есть проблемы с источниками": {
    en: labels.en.fallbackByStatus.degraded
  },
  "Есть ошибки источников": {
    en: labels.en.fallbackByStatus.issue
  },
  "Статус источников ещё не проверен": {
    en: labels.en.fallbackByStatus.unknown
  }
} as const;

export function HealthIndicator({ health, compact }: { health: SystemHealth; compact?: boolean }) {
  const { user } = useAuth();
  const locale = user?.settings.locale === "en" ? "en" : "ru";
  const text = labels[locale];
  const Icon = health.status === "operational" ? CheckCircle2 : health.status === "degraded" || health.status === "unknown" ? Activity : AlertCircle;
  const color = health.status === "operational" ? "text-success" : health.status === "degraded" || health.status === "unknown" ? "text-warning" : "text-destructive";
  const label = locale === "en" && health.label in localizedBackendLabels ? localizedBackendLabels[health.label as keyof typeof localizedBackendLabels].en : health.label || text.fallbackByStatus[health.status];

  return (
    <div className="rounded-md border bg-card p-3">
      <div className="flex items-center gap-2">
        <Icon className={cn("size-4", color)} />
        <span className="truncate text-sm font-medium">{label}</span>
      </div>
      {!compact ? <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground"><span>{text.sources}: {health.activeSources}</span><span>{text.failed}: {health.failedSources}</span></div> : null}
    </div>
  );
}
