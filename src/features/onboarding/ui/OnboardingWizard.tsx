"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ChevronRight, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/intly/empty-state";
import { ErrorState } from "@/components/intly/error-state";
import { queryKeys } from "@/services/api";
import { useAuthStore } from "@/features/auth";
import { settingsApi } from "@/features/settings";
import type { ProfileType } from "@/types";
import { onboardingApi } from "../api/onboarding-api";

const steps = [
  { id: "language", label: "Язык и часовой пояс" },
  { id: "profile", label: "Первый профиль" },
  { id: "roles", label: "Роли и стек" },
  { id: "sources", label: "Источники" },
  { id: "match", label: "Оценка совпадения" },
  { id: "review", label: "Проверка" }
];

const profileKindLabels: Record<ProfileType, string> = {
  career: "Карьера",
  freelance: "Фриланс",
  mixed: "Смешанный"
};

export function OnboardingWizard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);
  const user = useAuthStore((state) => state.user);
  const [locale, setLocale] = useState<"ru" | "en" | null>(null);
  const [timezone, setTimezone] = useState<string | null>(null);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [profileKind, setProfileKind] = useState<ProfileType>("mixed");
  const [targetRole, setTargetRole] = useState<string | null>(null);
  const [technologies, setTechnologies] = useState<string | null>(null);

  const query = useQuery({ queryKey: queryKeys.onboarding(), queryFn: onboardingApi.get });
  const inviteDefaults = typeof query.data?.checklist?.inviteDefaults === "object" && query.data.checklist.inviteDefaults !== null
    ? query.data.checklist.inviteDefaults as { starterProfile?: unknown }
    : null;
  const starterProfilePreset = inviteDefaults?.starterProfile !== false;
  const localeValue = locale ?? user?.settings.locale ?? "ru";
  const timezoneValue = timezone
    ?? (typeof query.data?.checklist?.timezone === "string" ? query.data.checklist.timezone : null)
    ?? user?.settings.timezone
    ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const profileNameValue = profileName ?? (starterProfilePreset ? "Senior Backend / AI automation" : "");
  const targetRoleValue = targetRole ?? (starterProfilePreset ? "Backend / AI automation" : "");
  const technologiesValue = technologies ?? (starterProfilePreset ? "TypeScript, Python, AI agents" : "");
  const saveSettings = useMutation({
    mutationFn: () => settingsApi.updateSettings({ locale: localeValue, timezone: timezoneValue }),
    onSuccess: (settings) => {
      if (user) setUser({ ...user, settings: { ...user.settings, locale: settings.locale, timezone: settings.timezone } });
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    }
  });
  const finish = useMutation({
    mutationFn: async () => {
      const settings = await settingsApi.updateSettings({ locale: localeValue, timezone: timezoneValue });
      const profile = await onboardingApi.createProfile({
        name: profileNameValue.trim(),
        kind: profileKind,
        targetRoles: targetRoleValue.split(",").map((item) => item.trim()).filter(Boolean),
        technologies: technologiesValue.split(",").map((item) => item.trim()).filter(Boolean)
      });
      const onboarding = await onboardingApi.patch({
        minimumComplete: true,
        checklist: {
          language: true,
          timezone: settings.timezone,
          profileId: profile.id,
          profileKind: profile.kind,
          roles: true,
          sources: false,
          match: true,
          review: true
        }
      });
      return { profile, onboarding, settings };
    },
    onSuccess: ({ onboarding, settings }) => {
      if (user) {
        setUser({
          ...user,
          onboardingComplete: onboarding.minimumComplete,
          onboarding: { minimumComplete: onboarding.minimumComplete, checklist: onboarding.checklist },
          settings: { ...user.settings, locale: settings.locale, timezone: settings.timezone }
        });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.onboarding() });
      queryClient.invalidateQueries({ queryKey: queryKeys.profiles.all() });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      router.replace("/dashboard");
    }
  });

  const completedIds = useMemo(() => {
    const checklist = query.data?.checklist ?? {};
    return steps.filter((step) => checklist[step.id] === true).map((step) => step.id);
  }, [query.data]);
  const previewComplete = query.data?.minimumComplete ? steps.length : Math.max(1, completedIds.length);
  const progress = Math.round((previewComplete / steps.length) * 100);

  if (query.isLoading) return <EmptyState title="Загружаем настройку" description="Проверяем сохранённый прогресс." />;
  if (query.isError) return <ErrorState message="Не удалось загрузить настройку. Повторите запрос." onRetry={() => query.refetch()} />;

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-5 rounded-lg border bg-card p-4 shadow-soft lg:grid-cols-[18rem_1fr]">
      <aside className="overflow-hidden rounded-md border bg-muted/45">
        <div className="relative aspect-[4/3] border-b bg-card">
          <Image src="/brand/opportunity-gateway.png" alt="Вход в рабочее пространство INTLY" fill sizes="288px" className="object-cover" priority />
        </div>
        <div className="p-3">
          <p className="text-sm font-semibold">Быстрый старт</p>
          <p className="mt-1 text-xs text-muted-foreground">Создаём профиль, язык интерфейса и базу для рекомендаций.</p>
          <Progress className="mt-3" value={progress} />
          <nav className="mt-4 space-y-1">
            {steps.map((step, index) => {
              const complete = query.data?.minimumComplete || index < previewComplete;
              return (
                <div key={step.id} className="flex items-center gap-2 rounded-md px-2 py-2 text-sm">
                  {complete ? <CheckCircle2 className="size-4 text-success" /> : <span className="size-4 rounded-full border" />}
                  <span>{step.label}</span>
                </div>
              );
            })}
          </nav>
        </div>
      </aside>
      <main className="min-w-0 p-2">
        <h1 className="text-xl font-semibold">Первичная настройка</h1>
        <p className="mt-1 text-sm text-muted-foreground">Выберите язык, часовой пояс и первый рабочий профиль. Источники и веса можно уточнить позже.</p>
        {finish.error ? <ErrorState className="mt-4" message="Не удалось создать профиль или завершить настройку. Проверьте данные и повторите попытку." /> : null}
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="space-y-1.5 text-sm">
            <span className="font-medium">Язык интерфейса</span>
            <select className="h-[var(--control-height)] w-full rounded-md border bg-card px-3 text-sm" value={localeValue} onChange={(event) => setLocale(event.target.value as "ru" | "en")}>
              <option value="ru">Русский</option>
              <option value="en">English</option>
            </select>
          </label>
          <label className="space-y-1.5 text-sm">
            <span className="font-medium">Часовой пояс</span>
            <Input value={timezoneValue} onChange={(event) => setTimezone(event.target.value)} placeholder="Europe/Moscow" />
          </label>
          <div className="md:col-span-2">
            <Button type="button" variant="outline" onClick={() => saveSettings.mutate()} loading={saveSettings.isPending} disabled={!timezoneValue.trim()}><Save className="size-4" />Сохранить язык и часовой пояс</Button>
          </div>
          <label className="space-y-1.5 text-sm md:col-span-2">
            <span className="font-medium">Первый профиль</span>
            <Input value={profileNameValue} onChange={(event) => setProfileName(event.target.value)} placeholder="Senior Backend / AI automation" />
          </label>
          <label className="space-y-1.5 text-sm">
            <span className="font-medium">Тип профиля</span>
            <select className="h-[var(--control-height)] w-full rounded-md border bg-card px-3 text-sm" value={profileKind} onChange={(event) => setProfileKind(event.target.value as ProfileType)}>
              {Object.entries(profileKindLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="space-y-1.5 text-sm">
            <span className="font-medium">Целевые роли</span>
            <Input value={targetRoleValue} onChange={(event) => setTargetRole(event.target.value)} />
          </label>
          <label className="space-y-1.5 text-sm md:col-span-2">
            <span className="font-medium">Стек через запятую</span>
            <Input value={technologiesValue} onChange={(event) => setTechnologies(event.target.value)} />
          </label>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" type="button" onClick={() => router.replace("/dashboard")} disabled={!query.data?.minimumComplete}>Пропустить дополнительные шаги</Button>
          <Button loading={finish.isPending} disabled={!profileNameValue.trim() || !timezoneValue.trim()} onClick={() => finish.mutate()}>
            Завершить настройку
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </main>
    </div>
  );
}
