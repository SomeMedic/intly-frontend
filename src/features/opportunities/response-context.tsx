"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { BriefcaseBusiness, ChevronDown, ChevronRight, CircleDollarSign, ExternalLink, Lightbulb, Pin, PinOff, Plus, Sparkles, UserRound } from "lucide-react";
import { api } from "@/services/api";
import { useAuth } from "@/features/auth";
import { useProfiles } from "@/features/profiles";
import { EmptyState } from "@/components/intly/empty-state";
import { ErrorState } from "@/components/intly/error-state";
import { Skeleton } from "@/components/intly/loading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { moneyLabel, sourceUrl, type AiRun, type OpportunityRecord, type Page } from "./contracts";
import { commercialDraftFromInitial, commercialInsertValue, updateCommercialDraft, type ResponseCommercialFieldsValue } from "./response-commercial-state";
import type { OpportunityLocale } from "./opportunity-workspace-labels";
import {
  readContextSectionState,
  responseContextCollapseKey,
  responsePresetInstruction,
  writeContextSectionState,
  type ContextRailSectionId,
  type PinnedContextFact,
  type ResponsePresetId,
  RESPONSE_PRESET_IDS,
} from "./response-context-state";

export type ResponseContextRailProps = {
  opportunity: OpportunityRecord;
  profileId?: string | null;
  ownerId?: string | null;
  draftId?: string | null;
  locale?: OpportunityLocale;
  pinnedFacts?: PinnedContextFact[];
  onPin?: (fact: PinnedContextFact) => void;
  onUnpin?: (fact: PinnedContextFact) => void;
  onReference?: (fact: PinnedContextFact) => void;
};

export type ResponseAiPresetsProps = {
  locale?: OpportunityLocale;
  disabled?: boolean;
  onChoose: (preset: { id: ResponsePresetId; label: string; instruction: string; toolHint: string }) => void;
};

export { commercialFieldsFromAnalysis, type ResponseCommercialFieldsValue } from "./response-commercial-state";

export type ResponseCommercialFieldsProps = {
  locale?: OpportunityLocale;
  initial?: ResponseCommercialFieldsValue | null;
  onInsert: (value: ResponseCommercialFieldsValue & { text: string }) => void;
  disabled?: boolean;
  loading?: boolean;
};

type ProfileContextRecord = {
  id: string;
  name: string;
  targetRoles: string[];
  technologies: string[];
  compensationPreferences: { min?: number; currency?: string; period?: string };
  structuredExperienceSummary: string;
};

const copy = {
  ru: {
    pinned: "Закреплено",
    noPins: "Закрепите требование, факт профиля или вывод AI",
    opportunity: "Возможность",
    requirements: "Требования",
    profile: "Профиль",
    insights: "AI-инсайты",
    loading: "Загружаем контекст…",
    noProfile: "Выберите профиль, чтобы увидеть факты и AI-анализ.",
    profileFailed: "Профиль не загрузился",
    analysisFailed: "AI-анализ не загрузился",
    source: "Источник",
    openSource: "Открыть источник",
    match: "Match",
    aiScore: "AI",
    money: "Оплата",
    counterpart: "Контрагент",
    role: "Роль",
    skills: "Навыки",
    experience: "Опыт",
    compensation: "Ожидания",
    strengths: "Сильные стороны",
    missing: "Недостаёт",
    risks: "Риски",
    emptyRequirements: "Явных требований нет, используем описание источника.",
    emptyInsights: "Завершённый AI-анализ ещё не найден.",
    pin: "Закрепить",
    unpin: "Открепить",
    reference: "Передать в AI",
    presets: "Быстрые правки",
    commercial: "Коммерческие условия",
    commercialDescription: "Поля вставляются в текст только по кнопке.",
    fixed: "Фикс",
    hourly: "Почасово",
    price: "Цена",
    rate: "Ставка",
    hours: "Часы",
    duration: "Срок",
    insert: "Вставить",
    nothingToInsert: "Заполните хотя бы одно поле",
  },
  en: {
    pinned: "Pinned",
    noPins: "Pin a requirement, profile fact, or AI insight",
    opportunity: "Opportunity",
    requirements: "Requirements",
    profile: "Profile",
    insights: "AI insights",
    loading: "Loading context…",
    noProfile: "Choose a profile to see profile facts and AI analysis.",
    profileFailed: "Profile failed to load",
    analysisFailed: "AI analysis failed to load",
    source: "Source",
    openSource: "Open source",
    match: "Match",
    aiScore: "AI",
    money: "Pay",
    counterpart: "Counterpart",
    role: "Role",
    skills: "Skills",
    experience: "Experience",
    compensation: "Expectations",
    strengths: "Strengths",
    missing: "Missing",
    risks: "Risks",
    emptyRequirements: "No explicit requirements yet; the source description is used.",
    emptyInsights: "No completed AI analysis has been found yet.",
    pin: "Pin",
    unpin: "Unpin",
    reference: "Send to AI",
    presets: "Fast edits",
    commercial: "Commercial terms",
    commercialDescription: "Fields are inserted into the text only by button.",
    fixed: "Fixed",
    hourly: "Hourly",
    price: "Price",
    rate: "Rate",
    hours: "Hours",
    duration: "Duration",
    insert: "Insert",
    nothingToInsert: "Fill at least one field",
  },
} as const;

export function ResponseContextRail({ opportunity, profileId, ownerId, draftId, locale = "ru", pinnedFacts = [], onPin, onUnpin, onReference }: ResponseContextRailProps) {
  const text = copy[locale];
  const { user } = useAuth();
  const storageOwnerId = ownerId ?? user?.id;
  const scope = React.useMemo(() => ({
    ownerId: storageOwnerId,
    profileId,
    draftId,
    opportunityId: opportunity.id,
  }), [draftId, opportunity.id, profileId, storageOwnerId]);
  const scopeKey = responseContextCollapseKey(scope);
  const profiles = useProfiles();
  const profile = profiles.data?.find((item) => item.id === profileId) ?? null;
  const [sectionDraft, setSectionDraft] = React.useState(() => ({
    key: scopeKey,
    state: readContextSectionState(contextSessionStorage(), scope),
  }));
  const openSections = sectionDraft.key === scopeKey
    ? sectionDraft.state
    : readContextSectionState(contextSessionStorage(), scope);
  const analysis = useQuery({
    queryKey: ["ai-runs", opportunity.id, profileId, "response-context"],
    queryFn: () => api.get<Page<AiRun>>(`/ai/runs?opportunityId=${encodeURIComponent(opportunity.id)}&profileId=${encodeURIComponent(profileId || "")}&taskType=opportunity_analysis`),
    enabled: !!profileId,
  });

  const completedAnalysis = analysis.data?.items.find((item) => item.status === "completed" && item.structuredOutput);
  const context = React.useMemo(() => buildContextFacts(opportunity, profile, completedAnalysis, locale), [opportunity, profile, completedAnalysis, locale]);
  const pinnedKeys = new Set(pinnedFacts.map((fact) => `${fact.source}:${fact.id}`));

  function toggleSection(id: ContextRailSectionId) {
    setSectionDraft((current) => {
      const currentState = current.key === scopeKey ? current.state : readContextSectionState(contextSessionStorage(), scope);
      const next = { ...currentState, [id]: !currentState[id] };
      writeContextSectionState(contextSessionStorage(), scope, next);
      return { key: scopeKey, state: next };
    });
  }

  if (!profileId) {
    return <EmptyState illustration={false} title={text.profile} description={text.noProfile} />;
  }

  return (
    <TooltipProvider>
      <aside className="grid max-h-full min-w-0 grid-cols-1 gap-3 overflow-y-auto pr-1 text-sm">
        <section className="min-w-0 rounded-lg border bg-card p-3">
          <div className="mb-2 flex items-center gap-2">
            <Pin className="size-4 text-primary" aria-hidden />
            <h3 className="font-semibold">{text.pinned}</h3>
          </div>
          {pinnedFacts.length ? (
            <div className="space-y-2">
              {pinnedFacts.map((fact) => (
                <FactRow
                  key={`${fact.source}:${fact.id}`}
                  fact={fact}
                  locale={locale}
                  pinned
                  onPin={onPin}
                  onUnpin={onUnpin}
                  onReference={onReference}
                />
              ))}
            </div>
          ) : (
            <p className="text-xs leading-5 text-muted-foreground">{text.noPins}</p>
          )}
        </section>

        <ContextSection id="opportunity" title={text.opportunity} icon={<BriefcaseBusiness className="size-4" />} open={openSections.opportunity} onToggle={toggleSection}>
          <div className="space-y-2">
            {context.opportunity.map((fact) => <FactRow key={fact.id} fact={fact} locale={locale} pinned={pinnedKeys.has(`${fact.source}:${fact.id}`)} onPin={onPin} onUnpin={onUnpin} onReference={onReference} />)}
            {sourceUrl(opportunity) ? (
              <Button variant="outline" size="sm" asChild className="w-full">
                <a href={sourceUrl(opportunity)} target="_blank" rel="noreferrer"><ExternalLink className="size-3.5" />{text.openSource}</a>
              </Button>
            ) : null}
          </div>
        </ContextSection>

        <ContextSection id="requirements" title={text.requirements} icon={<Lightbulb className="size-4" />} open={openSections.requirements} onToggle={toggleSection}>
          {context.requirements.length ? (
            <div className="space-y-2">{context.requirements.map((fact) => <FactRow key={fact.id} fact={fact} locale={locale} pinned={pinnedKeys.has(`${fact.source}:${fact.id}`)} onPin={onPin} onUnpin={onUnpin} onReference={onReference} />)}</div>
          ) : (
            <p className="text-xs leading-5 text-muted-foreground">{text.emptyRequirements}</p>
          )}
        </ContextSection>

        <ContextSection id="profile" title={text.profile} icon={<UserRound className="size-4" />} open={openSections.profile} onToggle={toggleSection}>
          {profiles.isPending ? <LoadingLines /> : profiles.isError ? <ErrorState title={text.profileFailed} message={profiles.error.message} onRetry={() => profiles.refetch()} /> : profile ? (
            <div className="space-y-2">
              <Link href={`/profiles/${profile.id}`} className="block truncate font-medium text-primary hover:underline">{profile.name}</Link>
              {context.profile.map((fact) => <FactRow key={fact.id} fact={fact} locale={locale} pinned={pinnedKeys.has(`${fact.source}:${fact.id}`)} onPin={onPin} onUnpin={onUnpin} onReference={onReference} />)}
            </div>
          ) : <p className="text-xs leading-5 text-muted-foreground">{text.noProfile}</p>}
        </ContextSection>

        <ContextSection id="insights" title={text.insights} icon={<Sparkles className="size-4 text-ai" />} open={openSections.insights} onToggle={toggleSection}>
          {analysis.isPending ? <LoadingLines /> : analysis.isError ? <ErrorState title={text.analysisFailed} message={analysis.error.message} onRetry={() => analysis.refetch()} /> : context.analysis.length ? (
            <div className="space-y-2">{context.analysis.map((fact) => <FactRow key={fact.id} fact={fact} locale={locale} pinned={pinnedKeys.has(`${fact.source}:${fact.id}`)} onPin={onPin} onUnpin={onUnpin} onReference={onReference} />)}</div>
          ) : <p className="text-xs leading-5 text-muted-foreground">{text.emptyInsights}</p>}
        </ContextSection>
      </aside>
    </TooltipProvider>
  );
}

export function ResponseAiPresets({ locale = "ru", disabled, onChoose }: ResponseAiPresetsProps) {
  const text = copy[locale];
  return (
    <section className="min-w-0 rounded-lg border bg-card p-3">
      <h3 className="mb-2 text-sm font-semibold">{text.presets}</h3>
      <div className="grid min-w-0 grid-cols-1 gap-2 2xl:grid-cols-2">
        {RESPONSE_PRESET_IDS.map((id) => {
          const preset = responsePresetInstruction(id, locale);
          return (
            <Button
              key={id}
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              className="min-w-0 justify-start"
              onClick={() => onChoose({ id, ...preset })}
              title={preset.instruction}
            >
              <Sparkles className="size-3.5 shrink-0 text-ai" />
              <span className="truncate">{preset.label}</span>
            </Button>
          );
        })}
      </div>
    </section>
  );
}

export function ResponseCommercialFields({ locale = "ru", initial, onInsert, disabled, loading }: ResponseCommercialFieldsProps) {
  const text = copy[locale];
  const initialKey = `${initial?.mode ?? ""}|${initial?.price ?? ""}|${initial?.rate ?? ""}|${initial?.hours ?? ""}|${initial?.duration ?? ""}`;
  const [draft, setDraft] = React.useState(() => ({ key: initialKey, value: commercialDraftFromInitial(initial) }));
  const value = draft.key === initialKey ? draft.value : commercialDraftFromInitial(initial);
  const { mode, price, rate, hours, duration } = value;
  const controlsDisabled = disabled || loading;
  const insertValue = commercialInsertValue(value, locale);
  const setField = (patch: Partial<ResponseCommercialFieldsValue>) => {
    setDraft((current) => {
      const base = current.key === initialKey ? current.value : commercialDraftFromInitial(initial);
      return { key: initialKey, value: updateCommercialDraft(base, patch) };
    });
  };
  return (
    <section className="min-w-0 rounded-lg border bg-card p-3">
      <div className="mb-3 flex items-start gap-2">
        <CircleDollarSign className="mt-0.5 size-4 text-success" aria-hidden />
        <div className="min-w-0">
          <h3 className="font-semibold">{text.commercial}</h3>
          <p className="text-xs leading-5 text-muted-foreground">{text.commercialDescription}</p>
        </div>
      </div>
      <div className="mb-3 grid grid-cols-2 gap-2">
        <Button type="button" variant={mode === "fixed" ? "primary" : "outline"} size="sm" disabled={controlsDisabled} aria-pressed={mode === "fixed"} onClick={() => setField({ mode: "fixed" })}>{text.fixed}</Button>
        <Button type="button" variant={mode === "hourly" ? "primary" : "outline"} size="sm" disabled={controlsDisabled} aria-pressed={mode === "hourly"} onClick={() => setField({ mode: "hourly" })}>{text.hourly}</Button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {mode === "fixed" ? <label className="grid gap-1 text-xs font-medium text-muted-foreground">{text.price}<Input value={price} onChange={(event) => setField({ price: event.target.value })} disabled={controlsDisabled} /></label> : null}
        {mode === "hourly" ? <label className="grid gap-1 text-xs font-medium text-muted-foreground">{text.rate}<Input value={rate} onChange={(event) => setField({ rate: event.target.value })} disabled={controlsDisabled} /></label> : null}
        <label className="grid gap-1 text-xs font-medium text-muted-foreground">{text.hours}<Input value={hours} onChange={(event) => setField({ hours: event.target.value })} disabled={controlsDisabled} /></label>
        <label className="grid gap-1 text-xs font-medium text-muted-foreground">{text.duration}<Input value={duration} onChange={(event) => setField({ duration: event.target.value })} disabled={controlsDisabled} /></label>
      </div>
      <Button
        type="button"
        className="mt-3 w-full"
        variant="outline"
        disabled={disabled || loading || !insertValue}
        loading={loading}
        title={!insertValue ? text.nothingToInsert : undefined}
        onClick={() => insertValue && onInsert(insertValue)}
      >
        <Plus className="size-4" />{text.insert}
      </Button>
    </section>
  );
}

function ContextSection({ id, title, icon, open, onToggle, children }: { id: ContextRailSectionId; title: string; icon: React.ReactNode; open: boolean; onToggle: (id: ContextRailSectionId) => void; children: React.ReactNode }) {
  return (
    <section className="min-w-0 rounded-lg border bg-card">
      <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left font-medium" onClick={() => onToggle(id)} aria-expanded={open}>
        {icon}
        <span className="min-w-0 flex-1 truncate">{title}</span>
        {open ? <ChevronDown className="size-4 text-muted-foreground" /> : <ChevronRight className="size-4 text-muted-foreground" />}
      </button>
      {open ? <div className="min-w-0 border-t p-3">{children}</div> : null}
    </section>
  );
}

function FactRow({ fact, locale, pinned, onPin, onUnpin, onReference }: { fact: PinnedContextFact; locale: OpportunityLocale; pinned?: boolean; onPin?: (fact: PinnedContextFact) => void; onUnpin?: (fact: PinnedContextFact) => void; onReference?: (fact: PinnedContextFact) => void }) {
  const text = copy[locale];
  return (
    <article className="min-w-0 rounded-md border bg-background p-2">
      <div className="flex min-w-0 flex-col items-stretch gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <Badge className="max-w-full whitespace-normal break-words" intent={fact.source === "analysis" ? "ai" : fact.source === "profile" ? "success" : "neutral"}>{fact.label}</Badge>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <p className="mt-1 line-clamp-3 break-words text-xs leading-5 text-foreground">{fact.text}</p>
            </TooltipTrigger>
            <TooltipContent>{fact.text}</TooltipContent>
          </Tooltip>
        </div>
        <div className="flex shrink-0 justify-end gap-1">
          {pinned ? (
            <Button type="button" variant="ghost" size="icon" aria-label={text.unpin} onClick={() => onUnpin?.(fact)}><PinOff className="size-3.5" /></Button>
          ) : (
            <Button type="button" variant="ghost" size="icon" aria-label={text.pin} onClick={() => onPin?.(fact)}><Pin className="size-3.5" /></Button>
          )}
          <Button type="button" variant="ghost" size="icon" aria-label={text.reference} onClick={() => onReference?.(fact)}><Sparkles className="size-3.5 text-ai" /></Button>
        </div>
      </div>
    </article>
  );
}

function LoadingLines() {
  return <div className="space-y-2"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>;
}

function buildContextFacts(opportunity: OpportunityRecord, profile: ProfileContextRecord | null, analysis: AiRun | undefined, locale: OpportunityLocale) {
  const text = copy[locale];
  const opportunityFacts = compactFacts([
    fact("opportunity:title", text.opportunity, opportunity.title, "opportunity"),
    fact("opportunity:counterpart", text.counterpart, opportunity.companyOrClient, "opportunity"),
    fact("opportunity:money", text.money, moneyLabel(opportunity.money, locale), "opportunity"),
    fact("opportunity:source", text.source, opportunity.sourceOccurrences.find((source) => source.primary)?.sourceId ?? opportunity.sourceOccurrences[0]?.sourceId, "opportunity"),
    fact("opportunity:match", text.match, scoreLabel(opportunity.matchScore ?? opportunity.personalState?.matchScore), "opportunity"),
    fact("opportunity:ai", text.aiScore, scoreLabel(opportunity.aiScore ?? analysis?.aiScore ?? null), "analysis"),
  ]);
  const requirements = extractRequirements(opportunity).map((item, index) => fact(`requirement:${index}`, text.requirements, item, "opportunity")).filter(Boolean) as PinnedContextFact[];
  const profileFacts = profile ? compactFacts([
    fact("profile:role", text.role, profile.targetRoles.join(", "), "profile"),
    fact("profile:skills", text.skills, profile.technologies.slice(0, 16).join(", "), "profile"),
    fact("profile:experience", text.experience, profile.structuredExperienceSummary, "profile"),
    fact("profile:compensation", text.compensation, profile.compensationPreferences.min ? `${profile.compensationPreferences.min.toLocaleString(locale === "en" ? "en-US" : "ru-RU")} ${profile.compensationPreferences.currency ?? ""} / ${profile.compensationPreferences.period ?? ""}` : "", "profile"),
  ]) : [];
  const output = analysis?.structuredOutput;
  const analysisFacts = compactFacts([
    ...extractOutputList(output?.strengths).map((item, index) => fact(`analysis:strength:${index}`, text.strengths, item, "analysis")),
    ...extractOutputList(output?.missingRequirements).map((item, index) => fact(`analysis:missing:${index}`, text.missing, item, "analysis")),
    ...extractOutputList(output?.risks).map((item, index) => fact(`analysis:risk:${index}`, text.risks, item, "analysis")),
  ]);
  return { opportunity: opportunityFacts, requirements, profile: profileFacts, analysis: analysisFacts };
}

function fact(id: string, label: string, text: unknown, source: PinnedContextFact["source"]): PinnedContextFact | null {
  const normalized = stringValue(text);
  return normalized ? { id, label, text: normalized, source } : null;
}

function compactFacts(items: Array<PinnedContextFact | null>) {
  return items.filter(Boolean) as PinnedContextFact[];
}

function scoreLabel(value?: number | null) {
  return typeof value === "number" ? `${Math.round(value)}` : "";
}

function extractRequirements(opportunity: OpportunityRecord) {
  const data = { ...opportunity.vacancyData, ...opportunity.freelanceData, ...opportunity.tenderData } as Record<string, unknown>;
  const candidates = [
    data.requirements,
    data.keyRequirements,
    data.deliverables,
    data.responsibilities,
    data.tasks,
    data.scope,
    data.eligibility,
  ];
  const values = candidates.flatMap(extractOutputList);
  return values.length ? values.slice(0, 10) : splitTextList(opportunity.summary || opportunity.description).slice(0, 6);
}

function extractOutputList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => stringValue(item)).filter(Boolean).slice(0, 12);
  return splitTextList(stringValue(value)).slice(0, 12);
}

function splitTextList(value: string) {
  return value
    .replace(/<[^>]+>/g, " ")
    .split(/\n|•|- |\d+\.\s/)
    .map((item) => item.replace(/\s+/g, " ").trim())
    .filter((item) => item.length > 12)
    .slice(0, 12);
}

function stringValue(value: unknown): string {
  if (typeof value === "string") return value.replace(/\s+/g, " ").trim();
  if (typeof value === "number") return String(value);
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return stringValue(record.title ?? record.text ?? record.label ?? record.value ?? record.summary ?? record.evidence);
  }
  return "";
}

function contextSessionStorage(): Storage | undefined {
  try { return typeof window === "undefined" ? undefined : window.sessionStorage; } catch { return undefined; }
}
