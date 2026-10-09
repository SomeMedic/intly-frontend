"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Plus, Settings2, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/services/api";
import { useAuth } from "@/features/auth";
import { useActiveProfileStore } from "@/hooks/use-active-profile";
import { AppShell } from "@/components/intly/app-shell";
import { BrandArt } from "@/components/intly/brand";
import { EmptyState } from "@/components/intly/empty-state";
import { ErrorState } from "@/components/intly/error-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { DEFAULT_WEIGHTS, type ProfileRecord } from "./contracts";
import { getPublicSources } from "./api";
import {
  profileKindLabels,
  profilePeriodLabels,
  profileRemoteLabels,
  profileSeniorityLabels,
  profileSourceHealthLabels,
  profileWeightLabels,
  resolveProfileLocale,
  selectedSourcesLabel,
  type ProfileLocale
} from "./profile-labels";

const selectClass =
  "h-[var(--control-height)] rounded-md border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring";

const profileCopy = {
  ru: {
    title: "Профили",
    subtitle: "Настройте роли, навыки, географию и источники для каждого направления поиска.",
    createProfile: "Создать профиль",
    loadingProfiles: "Загружаем профили…",
    targetRoleMissing: "Целевая роль не указана",
    seniorityMissing: "Уровень не указан",
    selectedSources: "выбранных источников",
    active: "Активный",
    settings: "Настроить",
    choose: "Выбрать",
    copyProfile: "Копировать",
    deleteProfile: "Удалить",
    emptyTitle: "Создайте первый профиль",
    emptyDescription:
      "Выберите роль, навыки и источники. Один профиль можно использовать для вакансий, заказов и тендеров.",
    newProfile: "Новый профиль",
    deleteTitle: "Удалить профиль?",
    deleteDescription: "Профиль будет скрыт. История и общие возможности сохранятся.",
    deleteButton: "Удалить профиль",
    backToProfiles: "← Профили",
    detailFallback: "Настройки профиля",
    recalculateMatch: "Обновить соответствие",
    recalculationQueued: "Пересчёт соответствия добавлен в очередь",
    loadingProfile: "Загружаем профиль…",
    saved: "Профиль сохранён",
    navAria: "Настройки профиля",
    tabs: { profile: "Профиль", sources: "Источники", match: "Соответствие", ai: "Контекст AI" },
    name: "Название профиля",
    kind: "Направление",
    targetRoles: "Целевые роли через запятую",
    skills: "Навыки и технологии через запятую",
    seniority: "Уровень",
    notSpecified: "Не указан",
    workFormat: "Формат работы",
    anyFormat: "Любой",
    geography: "География через запятую",
    minAmount: "Минимальная сумма",
    currency: "Валюта",
    amountPeriod: "Период суммы",
    experience: "Подтверждённый опыт и ограничения",
    experiencePlaceholder:
      "Опыт, проекты, навыки и ограничения, которые AI может использовать без выдуманных фактов.",
    knowledgeHint: "Резюме и дополнительные документы доступны в базе знаний.",
    openKnowledge: "Открыть базу знаний →",
    sourceSearchAria: "Поиск источников",
    sourceSearchPlaceholder: "Найти источник…",
    unknownHealth: "статус неизвестен",
    matchHint: (total: number) =>
      `Веса определяют оценку соответствия. Сумма ${total}; значения нормализуются до 100%.`,
    resetWeights: "Сбросить веса",
    aiInstructions: "Личные инструкции AI для этого профиля",
    aiHint:
      "Инструкции дополняют системный контекст. Полный собранный промпт можно прочитать в истории своего AI-анализа. Подтверждения опыта берутся из профиля и связанной базы знаний.",
    saveProfile: "Сохранить профиль"
  },
  en: {
    title: "Profiles",
    subtitle: "Set roles, skills, geography, and sources for each search direction.",
    createProfile: "Create profile",
    loadingProfiles: "Loading profiles…",
    targetRoleMissing: "Target role is not set",
    seniorityMissing: "Seniority is not set",
    selectedSources: "selected sources",
    active: "Active",
    settings: "Settings",
    choose: "Choose",
    copyProfile: "Copy",
    deleteProfile: "Delete",
    emptyTitle: "Create the first profile",
    emptyDescription:
      "Choose a role, skills, and sources. One profile can cover jobs, projects, and tenders.",
    newProfile: "New profile",
    deleteTitle: "Delete profile?",
    deleteDescription:
      "The profile will be hidden. History and shared opportunities remain available.",
    deleteButton: "Delete profile",
    backToProfiles: "← Profiles",
    detailFallback: "Profile settings",
    recalculateMatch: "Update fit",
    recalculationQueued: "Fit recalculation was queued",
    loadingProfile: "Loading profile…",
    saved: "Profile saved",
    navAria: "Profile settings",
    tabs: { profile: "Profile", sources: "Sources", match: "Fit", ai: "AI context" },
    name: "Profile name",
    kind: "Direction",
    targetRoles: "Target roles, comma-separated",
    skills: "Skills and technologies, comma-separated",
    seniority: "Seniority",
    notSpecified: "Not specified",
    workFormat: "Work format",
    anyFormat: "Any",
    geography: "Geography, comma-separated",
    minAmount: "Minimum amount",
    currency: "Currency",
    amountPeriod: "Amount period",
    experience: "Confirmed experience and constraints",
    experiencePlaceholder:
      "Experience, projects, skills, and constraints that AI can use without inventing facts.",
    knowledgeHint: "Resumes and extra documents are available in the knowledge base.",
    openKnowledge: "Open knowledge base →",
    sourceSearchAria: "Search sources",
    sourceSearchPlaceholder: "Find a source…",
    unknownHealth: "health unknown",
    matchHint: (total: number) =>
      `Weights define the fit score. Current sum is ${total}; values are normalized to 100%.`,
    resetWeights: "Reset weights",
    aiInstructions: "Personal AI instructions for this profile",
    aiHint:
      "Instructions extend the system context. The full assembled prompt is available in the AI analysis history. Experience confirmations come from this profile and the linked knowledge base.",
    saveProfile: "Save profile"
  }
};

type ProfileCopy = (typeof profileCopy)[ProfileLocale];

export function useProfiles() {
  const { user, bootstrapped } = useAuth();
  return useQuery({
    queryKey: ["profiles", user?.id],
    queryFn: () => api.get<ProfileRecord[]>("/profiles"),
    enabled: bootstrapped && !!user
  });
}

export function ProfilesScreen() {
  const { user } = useAuth();
  const locale = resolveProfileLocale(user?.settings.locale);
  const copy = profileCopy[locale];
  const query = useProfiles();
  const client = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const createRequested = searchParams.get("create") === "true";
  const [createDraftOpen, setCreateDraftOpen] = useState(false);
  const creating = createRequested || createDraftOpen;
  const [deleting, setDeleting] = useState<ProfileRecord | null>(null);
  const setActiveProfileId = useActiveProfileStore((state) => state.setActiveProfileId);

  function closeCreateModal() {
    setCreateDraftOpen(false);
    if (createRequested) router.replace("/profiles");
  }

  const action = useMutation({
    mutationFn: async ({
      id,
      name
    }: {
      id: string;
      name: "duplicate" | "set-active" | "delete";
    }) => {
      const result =
        name === "delete"
          ? await api.delete(`/profiles/${id}`)
          : await api.post<ProfileRecord>(`/profiles/${id}/${name}`);
      if (name === "set-active") setActiveProfileId(id);
      return result;
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["profiles"] });
      client.invalidateQueries({ queryKey: ["dashboard"] });
      setDeleting(null);
    },
    onError: (error) => toast.error(error.message)
  });

  return (
    <AppShell>
      <header className="intly-page-header mb-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-5">
          <BrandArt kind="gateway" className="hidden w-44 shrink-0 lg:block" />
          <div>
            <h1 className="text-2xl font-semibold">{copy.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{copy.subtitle}</p>
          </div>
        </div>
        <Button
          onClick={() => {
            setCreateDraftOpen(true);
            router.replace("/profiles?create=true");
          }}
        >
          <Plus className="size-4" />
          {copy.createProfile}
        </Button>
      </header>
      {query.isPending ? (
        <p className="text-muted-foreground">{copy.loadingProfiles}</p>
      ) : query.isError ? (
        <ErrorState message={query.error.message} onRetry={() => query.refetch()} />
      ) : query.data.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {query.data.map((profile) => (
            <section key={profile.id} className="rounded-lg border bg-card p-5">
              <div className="flex items-start gap-3">
                <div className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
                  <UserRound className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/profiles/${profile.id}`}
                    className="font-semibold hover:text-primary"
                  >
                    {profile.name}
                  </Link>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {profileKindLabels[locale][profile.kind]} ·{" "}
                    {profile.targetRoles.join(", ") || copy.targetRoleMissing}
                  </p>
                </div>
                {profile.isActive && <Badge intent="success">{copy.active}</Badge>}
              </div>
              <div className="my-4 flex flex-wrap gap-1.5">
                {profile.technologies.slice(0, 8).map((skill) => (
                  <Badge key={skill}>{skill}</Badge>
                ))}
              </div>
              <div className="border-t pt-3 text-xs text-muted-foreground">
                {profile.sourceIds.length} {copy.selectedSources} ·{" "}
                {formatSeniority(profile.seniority, locale) || copy.seniorityMissing}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/profiles/${profile.id}`}>
                    <Settings2 className="size-3.5" />
                    {copy.settings}
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={profile.isActive || action.isPending}
                  onClick={() => action.mutate({ id: profile.id, name: "set-active" })}
                >
                  <Check className="size-3.5" />
                  {copy.choose}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`${copy.copyProfile} ${profile.name}`}
                  disabled={action.isPending}
                  onClick={() => action.mutate({ id: profile.id, name: "duplicate" })}
                >
                  <Copy className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`${copy.deleteProfile} ${profile.name}`}
                  onClick={() => setDeleting(profile)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </section>
          ))}
        </div>
      ) : (
        <EmptyState title={copy.emptyTitle} description={copy.emptyDescription} />
      )}
      <Modal
        open={creating}
        onOpenChange={(open) => (open ? setCreateDraftOpen(true) : closeCreateModal())}
        title={copy.newProfile}
        wide
      >
        <ProfileForm
          locale={locale}
          copy={copy}
          onSaved={() => {
            closeCreateModal();
            client.invalidateQueries({ queryKey: ["profiles"] });
          }}
        />
      </Modal>
      <Modal
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={copy.deleteTitle}
        description={copy.deleteDescription}
      >
        <p className="mb-4">{deleting?.name}</p>
        <Button
          variant="danger"
          loading={action.isPending}
          onClick={() => deleting && action.mutate({ id: deleting.id, name: "delete" })}
        >
          {copy.deleteButton}
        </Button>
      </Modal>
    </AppShell>
  );
}

export function ProfileDetailScreen({ id }: { id: string }) {
  const { user } = useAuth();
  const locale = resolveProfileLocale(user?.settings.locale);
  const copy = profileCopy[locale];
  const query = useQuery({
    queryKey: ["profile", id],
    queryFn: () => api.get<ProfileRecord>(`/profiles/${id}`)
  });
  const client = useQueryClient();
  const recalculate = useMutation({
    mutationFn: () => api.post(`/profiles/${id}/recalculate-match`),
    onSuccess: () => toast.success(copy.recalculationQueued),
    onError: (error) => toast.error(error.message)
  });

  return (
    <AppShell>
      <header className="intly-page-header mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/profiles" className="text-sm text-muted-foreground">
            {copy.backToProfiles}
          </Link>
          <h1 className="mt-2 text-2xl font-semibold">{query.data?.name ?? copy.detailFallback}</h1>
        </div>
        <Button
          variant="outline"
          loading={recalculate.isPending}
          onClick={() => recalculate.mutate()}
        >
          {copy.recalculateMatch}
        </Button>
      </header>
      {query.isPending ? (
        <p>{copy.loadingProfile}</p>
      ) : query.isError ? (
        <ErrorState message={query.error.message} onRetry={() => query.refetch()} />
      ) : (
        <ProfileForm
          key={query.data.id}
          profile={query.data}
          locale={locale}
          copy={copy}
          onSaved={() => {
            client.invalidateQueries({ queryKey: ["profile", id] });
            client.invalidateQueries({ queryKey: ["profiles"] });
          }}
        />
      )}
    </AppShell>
  );
}

function ProfileForm({
  profile,
  locale,
  copy,
  onSaved
}: {
  profile?: ProfileRecord;
  locale: ProfileLocale;
  copy: ProfileCopy;
  onSaved: () => void;
}) {
  const router = useRouter();
  const [tab, setTab] = useState("profile");
  const [name, setName] = useState(profile?.name ?? "");
  const [kind, setKind] = useState(profile?.kind ?? "career");
  const [roles, setRoles] = useState(profile?.targetRoles.join(", ") ?? "");
  const [technologies, setTechnologies] = useState(profile?.technologies.join(", ") ?? "");
  const [seniority, setSeniority] = useState(profile?.seniority[0] ?? "");
  const [remote, setRemote] = useState(profile?.remotePreferences[0] ?? "remote");
  const [locations, setLocations] = useState(profile?.locations.join(", ") ?? "");
  const [salary, setSalary] = useState(String(profile?.compensationPreferences?.min ?? ""));
  const [currency, setCurrency] = useState(profile?.compensationPreferences?.currency ?? "RUB");
  const [period, setPeriod] = useState(profile?.compensationPreferences?.period ?? "month");
  const [summary, setSummary] = useState(profile?.structuredExperienceSummary ?? "");
  const [sources, setSources] = useState<string[]>(profile?.sourceIds ?? []);
  const [sourceFilter, setSourceFilter] = useState("");
  const [weights, setWeights] = useState(profile?.matchWeights ?? DEFAULT_WEIGHTS);
  const [prompt, setPrompt] = useState(String(profile?.aiPreferences?.customPrompt ?? ""));
  const catalog = useQuery({ queryKey: ["public-sources"], queryFn: getPublicSources });
  const split = (text: string) => [
    ...new Set(
      text
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
    )
  ];
  const mutation = useMutation({
    mutationFn: () => {
      const body = {
        name: name.trim(),
        kind,
        targetRoles: split(roles),
        technologies: split(technologies),
        seniority: seniority ? [seniority] : [],
        remotePreferences: remote ? [remote] : [],
        locations: split(locations),
        sourceIds: sources,
        matchWeights: weights,
        compensationPreferences: { ...(salary ? { min: Number(salary) } : {}), currency, period },
        structuredExperienceSummary: summary,
        aiPreferences: { ...profile?.aiPreferences, customPrompt: prompt }
      };
      return profile
        ? api.patch<ProfileRecord>(`/profiles/${profile.id}`, body)
        : api.post<ProfileRecord>("/profiles", body);
    },
    onSuccess: (result) => {
      toast.success(copy.saved);
      onSaved();
      if (!profile) router.push(`/profiles/${result.id}`);
    },
    onError: (error) => toast.error(error.message)
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate();
  }

  const totalWeight = Object.values(weights).reduce((total, value) => total + value, 0);

  return (
    <form onSubmit={submit} className="max-w-5xl">
      <nav aria-label={copy.navAria} className="mb-5 flex flex-wrap gap-2 border-b pb-3">
        {Object.entries(copy.tabs).map(([value, label]) => (
          <Button
            key={value}
            type="button"
            variant={tab === value ? "secondary" : "ghost"}
            onClick={() => setTab(value)}
          >
            {label}
          </Button>
        ))}
      </nav>
      {tab === "profile" && (
        <div className="grid gap-4 rounded-lg border bg-card p-5 md:grid-cols-2">
          <Field label={copy.name} id="profile-name">
            <Input
              id="profile-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              maxLength={160}
            />
          </Field>
          <Field label={copy.kind} id="profile-kind">
            <select
              id="profile-kind"
              className={selectClass}
              value={kind}
              onChange={(event) => setKind(event.target.value as ProfileRecord["kind"])}
            >
              {Object.entries(profileKindLabels[locale]).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label={copy.targetRoles} id="profile-roles">
            <Input
              id="profile-roles"
              value={roles}
              onChange={(event) => setRoles(event.target.value)}
            />
          </Field>
          <Field label={copy.skills} id="profile-skills">
            <Input
              id="profile-skills"
              value={technologies}
              onChange={(event) => setTechnologies(event.target.value)}
            />
          </Field>
          <Field label={copy.seniority} id="profile-level">
            <select
              id="profile-level"
              className={selectClass}
              value={seniority}
              onChange={(event) => setSeniority(event.target.value)}
            >
              <option value="">{copy.notSpecified}</option>
              {Object.entries(profileSeniorityLabels[locale]).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label={copy.workFormat} id="profile-remote">
            <select
              id="profile-remote"
              className={selectClass}
              value={remote}
              onChange={(event) => setRemote(event.target.value)}
            >
              <option value="">{copy.anyFormat}</option>
              {Object.entries(profileRemoteLabels[locale]).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label={copy.geography} id="profile-locations">
            <Input
              id="profile-locations"
              value={locations}
              onChange={(event) => setLocations(event.target.value)}
            />
          </Field>
          <Field label={copy.minAmount} id="profile-money">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-[minmax(0,1fr)_5rem_6.5rem]">
              <Input
                id="profile-money"
                className="col-span-2 sm:col-span-1"
                type="number"
                min={0}
                value={salary}
                onChange={(event) => setSalary(event.target.value)}
              />
              <select
                aria-label={copy.currency}
                className={selectClass}
                value={currency}
                onChange={(event) => setCurrency(event.target.value)}
              >
                {["RUB", "USD", "EUR"].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
              <select
                aria-label={copy.amountPeriod}
                className={selectClass}
                value={period}
                onChange={(event) => setPeriod(event.target.value)}
              >
                {Object.entries(profilePeriodLabels[locale]).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </Field>
          <div className="md:col-span-2">
            <Field label={copy.experience} id="profile-summary">
              <Textarea
                id="profile-summary"
                className="min-h-40"
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
                placeholder={copy.experiencePlaceholder}
              />
            </Field>
            <p className="mt-2 text-xs text-muted-foreground">{copy.knowledgeHint}</p>
            <Button type="button" variant="ghost" size="sm" asChild>
              <Link href="/knowledge">{copy.openKnowledge}</Link>
            </Button>
          </div>
        </div>
      )}
      {tab === "sources" && (
        <section className="rounded-lg border bg-card p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {selectedSourcesLabel(sources.length, catalog.data?.length, locale)}
            </p>
            <Input
              className="max-w-xs"
              aria-label={copy.sourceSearchAria}
              value={sourceFilter}
              onChange={(event) => setSourceFilter(event.target.value)}
              placeholder={copy.sourceSearchPlaceholder}
            />
          </div>
          {catalog.isError ? (
            <ErrorState message={catalog.error.message} onRetry={() => catalog.refetch()} />
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {catalog.data
                ?.filter((source) =>
                  `${source.name} ${source.group}`
                    .toLowerCase()
                    .includes(sourceFilter.toLowerCase())
                )
                .map((source) => (
                  <label
                    key={source.id}
                    className="flex items-start gap-2 rounded-md border p-3 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={sources.includes(source.id)}
                      onChange={(event) =>
                        setSources((current) =>
                          event.target.checked
                            ? [...current, source.id]
                            : current.filter((value) => value !== source.id)
                        )
                      }
                      className="mt-1 accent-primary"
                    />
                    <span>
                      {source.name}
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {source.group} · {sourceHealthLabel(source.healthState, locale, copy)}
                      </span>
                    </span>
                  </label>
                ))}
            </div>
          )}
        </section>
      )}
      {tab === "match" && (
        <section className="max-w-2xl space-y-5 rounded-lg border bg-card p-5">
          <p className="text-sm text-muted-foreground">{copy.matchHint(totalWeight)}</p>
          {Object.entries(profileWeightLabels[locale]).map(([key, label]) => (
            <label key={key} className="grid grid-cols-[1fr_3rem] gap-3">
              <span>{label}</span>
              <span className="text-right font-mono">{weights[key as keyof typeof weights]}</span>
              <input
                className="col-span-2 accent-primary"
                type="range"
                min={0}
                max={100}
                step={5}
                value={weights[key as keyof typeof weights]}
                onChange={(event) =>
                  setWeights((current) => ({ ...current, [key]: Number(event.target.value) }))
                }
              />
            </label>
          ))}
          <Button type="button" variant="outline" onClick={() => setWeights(DEFAULT_WEIGHTS)}>
            {copy.resetWeights}
          </Button>
        </section>
      )}
      {tab === "ai" && (
        <section className="space-y-3 rounded-lg border bg-card p-5">
          <Field label={copy.aiInstructions} id="profile-prompt">
            <Textarea
              id="profile-prompt"
              className="min-h-48"
              maxLength={4000}
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
            />
          </Field>
          <p className="text-sm text-muted-foreground">{copy.aiHint}</p>
        </section>
      )}
      <div className="mt-5 flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3">
        <Button
          type="submit"
          loading={mutation.isPending}
          disabled={!name.trim() || totalWeight <= 0}
        >
          {copy.saveProfile}
        </Button>
        {mutation.isError && <p className="text-sm text-destructive">{mutation.error.message}</p>}
      </div>
    </form>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
    </div>
  );
}

function sourceHealthLabel(value: string | undefined, locale: ProfileLocale, copy: ProfileCopy) {
  return value ? (profileSourceHealthLabels[locale][value] ?? value) : copy.unknownHealth;
}

function formatSeniority(values: string[], locale: ProfileLocale) {
  return values.map((value) => profileSeniorityLabels[locale][value] ?? value).join(", ");
}
