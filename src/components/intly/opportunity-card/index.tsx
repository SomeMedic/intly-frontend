"use client";

import Link from "next/link";
import { Bot, ExternalLink, Heart } from "lucide-react";
import type { OpportunityMini, OpportunityType } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MatchScore } from "@/components/intly/match-score";
import { useAuth } from "@/features/auth";
import { cn, formatRelativeTime } from "@/lib/utils";
import { stageLabelsByLocale } from "@/features/opportunities";
import { descriptionPreviewText } from "./description-preview";

type OpportunityCardProps = {
  opportunity: OpportunityMini;
  onOpen?: (id: string) => void;
  onFavoriteChange?: (id: string, favorite: boolean) => void;
  onAiAnalyze?: (id: string) => void;
  selected?: boolean;
  onSelect?: (selected: boolean) => void;
};

const labels = {
  ru: {
    open: "Открыть",
    ai: "Оценить с AI",
    favorite: "В избранное",
    removeFavorite: "Убрать из избранного",
    source: "Открыть источник",
    type: { vacancy: "Вакансия", freelance: "Проект", tender: "Тендер" } satisfies Record<
      OpportunityType,
      string
    >,
    legacyStage: { Shortlisted: "В списке" }
  },
  en: {
    open: "Open",
    ai: "Rate with AI",
    favorite: "Favorite",
    removeFavorite: "Remove favorite",
    source: "Open source",
    type: { vacancy: "Vacancy", freelance: "Project", tender: "Tender" } satisfies Record<
      OpportunityType,
      string
    >,
    legacyStage: { Shortlisted: "Shortlisted" }
  }
} as const;

const moneyPeriodLabels = {
  ru: { HOUR: "час", DAY: "день", WEEK: "неделя", MONTH: "месяц", YEAR: "год", PROJECT: "проект" },
  en: { HOUR: "hour", DAY: "day", WEEK: "week", MONTH: "month", YEAR: "year", PROJECT: "project" }
} as const;

function humanCompensation(label: string, locale: "ru" | "en") {
  const match = label.match(
    /^(.*?)(?:\s+(RUR|RUB|USD|EUR|GBP|KZT|₽|\$|€|£|₸))?\s+(HOUR|DAY|WEEK|MONTH|YEAR|PROJECT)$/i
  );
  if (!match) return label;
  const [, amount, currency = "", periodRaw] = match;
  const period =
    moneyPeriodLabels[locale][periodRaw.toUpperCase() as keyof (typeof moneyPeriodLabels)["ru"]];
  return `${amount.trim()}${currency ? ` ${currency}` : ""}${period ? ` / ${period}` : ""}`;
}

export function OpportunityCard({
  opportunity,
  onOpen,
  onFavoriteChange,
  onAiAnalyze,
  selected,
  onSelect
}: OpportunityCardProps) {
  const { user } = useAuth();
  const locale = user?.settings.locale === "en" ? "en" : "ru";
  const text = labels[locale];
  const favoriteLabel = opportunity.favorite ? text.removeFavorite : text.favorite;
  const descriptionPreview = opportunity.description
    ? descriptionPreviewText(opportunity.description)
    : "";
  return (
    <article
      className={cn(
        "group rounded-lg border border-border/70 bg-card/95 p-[var(--card-padding)] transition hover:border-primary/35 hover:bg-muted/25",
        opportunity.favorite && "border-primary/35 bg-primary/5",
        opportunity.hidden && "opacity-45",
        opportunity.archived && "opacity-65"
      )}
    >
      <div className="space-y-3">
        <div className="min-w-0">
          <div className="flex items-start gap-2">
            {onSelect && (
              <input
                type="checkbox"
                className="mt-1 shrink-0"
                aria-label={`${locale === "ru" ? "Выбрать" : "Select"} ${opportunity.title}`}
                checked={selected ?? false}
                onChange={(event) => onSelect(event.target.checked)}
              />
            )}
            <h3 className="min-w-0 flex-1 line-clamp-2 text-sm font-semibold leading-5">
              {opportunity.title}
            </h3>
            <Badge className="shrink-0" intent="neutral">
              {text.type[opportunity.type] ?? opportunity.type}
            </Badge>
          </div>
          <p className="mt-1 truncate text-sm text-muted-foreground">
            {opportunity.companyOrClient}
            {opportunity.placeLabel ? ` · ${opportunity.placeLabel}` : ""}
          </p>
        </div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <Badge intent="primary">
              {humanCompensation(opportunity.compensationLabel, locale)}
            </Badge>
            <Badge intent={opportunity.source.status === "Unknown" ? "warning" : "neutral"}>
              {opportunity.source.name}
              {opportunity.source.extraCount ? ` +${opportunity.source.extraCount}` : ""}
            </Badge>
            <Badge intent="neutral">
              {stageLabelsByLocale[locale][opportunity.pipelineStage] ??
                text.legacyStage[opportunity.pipelineStage as keyof typeof text.legacyStage] ??
                opportunity.pipelineStage}
            </Badge>
          </div>
          <div className="flex shrink-0 items-start gap-2">
            <MatchScore
              value={opportunity.matchScore}
              label={locale === "ru" ? "Подходит" : "Fit"}
            />
            {opportunity.aiScore !== undefined ? (
              <MatchScore value={opportunity.aiScore} label={locale === "ru" ? "AI" : "AI"} />
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {opportunity.skills.slice(0, 5).map((skill) => (
          <span
            key={skill}
            className="rounded-sm border border-border/70 bg-muted/45 px-1.5 py-0.5 text-xs text-muted-foreground"
          >
            {skill}
          </span>
        ))}
      </div>

      {descriptionPreview ? (
        <p className="mt-3 line-clamp-2 text-sm leading-5 text-muted-foreground">
          {descriptionPreview}
        </p>
      ) : null}

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground">
          {formatRelativeTime(opportunity.firstSeenAt, locale)}
        </span>
        <div className="flex items-center gap-1 transition">
          {onOpen ? (
            <Button size="sm" variant="ghost" onClick={() => onOpen(opportunity.id)}>
              {text.open}
            </Button>
          ) : (
            <Button size="sm" variant="ghost" asChild>
              <Link href={`/opportunities/${opportunity.id}`}>{text.open}</Link>
            </Button>
          )}
          {onAiAnalyze ? (
            <Button
              size="icon"
              variant="ghost"
              aria-label={text.ai}
              onClick={() => onAiAnalyze(opportunity.id)}
              title={text.ai}
            >
              <Bot className="size-4 text-ai" />
            </Button>
          ) : (
            <Button size="icon" variant="ghost" aria-label={text.ai} title={text.ai} asChild>
              <Link href={`/opportunities/${opportunity.id}?tab=ai`}>
                <Bot className="size-4 text-ai" />
              </Link>
            </Button>
          )}
          <Button
            size="icon"
            variant={opportunity.favorite ? "secondary" : "ghost"}
            aria-label={favoriteLabel}
            title={favoriteLabel}
            onClick={() => onFavoriteChange?.(opportunity.id, !opportunity.favorite)}
            disabled={!onFavoriteChange}
          >
            <Heart className="size-4" />
          </Button>
          {opportunity.source.url ? (
            <Button
              size="icon"
              variant="ghost"
              aria-label={text.source}
              title={text.source}
              asChild
            >
              <a href={opportunity.source.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-4" />
              </a>
            </Button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
