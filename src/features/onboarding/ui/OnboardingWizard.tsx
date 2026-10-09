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
  { id: "language", label: "Язык и время" },
  { id: "profile", label: "Первый профиль" },
  { id: "roles", label: "Роль и стек" },
  { id: "sources", label: "Источники" },
  { id: "match", label: "Подбор" },
  { id: "review", label: "Старт" }
];

const profileKindLabels: Record<ProfileType, string> = {
  career: "Карьера",
  freelance: "Проекты",
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
  const inviteDefaults =
    typeof query.data?.checklist?.inviteDefaults === "object" &&
    query.data.checklist.inviteDefaults !== null
      ? (query.data.checklist.inviteDefaults as { starterProfile?: unknown })
      : null;
  const starterProfilePreset = inviteDefaults?.starterProfile !== false;
  const localeValue = locale ?? user?.settings.locale ?? "ru";
  const timezoneValue =
    timezone ??
    (typeof query.data?.checklist?.timezone === "string" ? query.data.checklist.timezone : null) ??
    user?.settings.timezone ??
    Intl.DateTimeFormat().resolvedOptions().timeZone;
  const profileNameValue =
    profileName ?? (starterProfilePreset ? "Senior Backend / AI automation" : "");
  const targetRoleValue = targetRole ?? (starterProfilePreset ? "Backend / AI automation" : "");
  const technologiesValue =
    technologies ?? (starterProfilePreset ? "TypeScript, Python, AI agents" : "");
  const saveSettings = useMutation({
    mutationFn: () => settingsApi.updateSettings({ locale: localeValue, timezone: timezoneValue }),
    onSuccess: (settings) => {
      if (user)
        setUser({
          ...user,
          settings: { ...user.settings, locale: settings.locale, timezone: settings.timezone }
        });
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    }
  });
  const finish = useMutation({
    mutationFn: async () => {
      const settings = await settingsApi.updateSettings({
        locale: localeValue,
        timezone: timezoneValue
      });
      const profile = await onboardingApi.createProfile({
        name: profileNameValue.trim(),
        kind: profileKind,
        targetRoles: targetRoleValue
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        technologies: technologiesValue
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
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
          onboarding: {
            minimumComplete: onboarding.minimumComplete,
            checklist: onboarding.checklist
          },
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
  const previewComplete = query.data?.minimumComplete
    ? steps.length
    : Math.max(1, completedIds.length);
  const progress = Math.round((previewComplete / steps.length) * 100);

  if (query.isLoading)
    return <EmptyState title="Готовим настройку" description="Проверяем сохранённый прогресс." />;
  if (query.isError)
    return (
      <ErrorState
        message="Не удалось открыть настройку. Повторите запрос."
        onRetry={() => query.refetch()}
      />
    );

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-5 rounded-lg border bg-card p-4 shadow-soft lg:grid-cols-[17rem_1fr]">
      <aside className="overflow-hidden rounded-md border bg-muted/25">
        <div className="relative aspect-[4/3] border-b bg-card/80">
          <Image
            src="/brand/opportunity-gateway.png"
            alt="Вход в рабочее пространство INTLY"
            fill
            sizes="288px"
            className="object-cover"
            priority
          />
        </div>
        <div className="p-3">
          <p className="text-sm font-semibold">Быстрый старт</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Задаём язык, время и первый профиль. Остальное можно уточнить позже.
          </p>
          <Progress className="mt-3" value={progress} />
          <nav className="mt-4 space-y-1">
            {steps.map((step, index) => {
              const complete = query.data?.minimumComplete || index < previewComplete;
              return (
                <div
                  key={step.id}
                  className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground"
                >
                  {complete ? (
                    <CheckCircle2 className="size-4 text-success" />
                  ) : (
                    <span className="size-4 rounded-full border" />
                  )}
                  <span className={complete ? "font-medium text-foreground" : undefined}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </nav>
        </div>
      </aside>
      <main className="min-w-0 p-2">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
          <div>
            <h1 className="text-2xl font-semibold leading-tight">Настройте рабочее пространство</h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              Сейчас нужен только первый профиль. Он поможет INTLY показывать подходящие вакансии,
              проекты и тендеры.
            </p>
          </div>
          <span className="rounded-sm border bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
            {progress}%
          </span>
        </div>
        {finish.error ? (
          <ErrorState
            className="mt-4"
            message="Не удалось создать профиль. Проверьте поля и повторите попытку."
          />
        ) : null}
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="space-y-1.5 text-sm">
            <span className="font-medium">Язык интерфейса</span>
            <select
              className="h-[var(--control-height)] w-full rounded-md border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              value={localeValue}
              onChange={(event) => setLocale(event.target.value as "ru" | "en")}
            >
              <option value="ru">Русский</option>
              <option value="en">English</option>
            </select>
          </label>
          <label className="space-y-1.5 text-sm">
            <span className="font-medium">Часовой пояс</span>
            <Input
              value={timezoneValue}
              onChange={(event) => setTimezone(event.target.value)}
              placeholder="Europe/Moscow"
            />
          </label>
          <div className="md:col-span-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => saveSettings.mutate()}
              loading={saveSettings.isPending}
              disabled={!timezoneValue.trim()}
            >
              <Save className="size-4" />
              Сохранить язык и часовой пояс
            </Button>
          </div>
          <label className="space-y-1.5 text-sm md:col-span-2">
            <span className="font-medium">Название профиля</span>
            <Input
              value={profileNameValue}
              onChange={(event) => setProfileName(event.target.value)}
              placeholder="Senior Backend / AI automation"
            />
          </label>
          <label className="space-y-1.5 text-sm">
            <span className="font-medium">Тип профиля</span>
            <select
              className="h-[var(--control-height)] w-full rounded-md border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              value={profileKind}
              onChange={(event) => setProfileKind(event.target.value as ProfileType)}
            >
              {Object.entries(profileKindLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5 text-sm">
            <span className="font-medium">Целевая роль</span>
            <Input
              value={targetRoleValue}
              onChange={(event) => setTargetRole(event.target.value)}
              placeholder="Backend, AI automation"
            />
          </label>
          <label className="space-y-1.5 text-sm md:col-span-2">
            <span className="font-medium">Навыки и технологии</span>
            <Input
              value={technologiesValue}
              onChange={(event) => setTechnologies(event.target.value)}
              placeholder="TypeScript, Python, AI agents"
            />
          </label>
        </div>
        <div className="mt-6 flex flex-col-reverse justify-end gap-2 sm:flex-row">
          <Button
            variant="outline"
            type="button"
            onClick={() => router.replace("/dashboard")}
            disabled={!query.data?.minimumComplete}
          >
            Продолжить позже
          </Button>
          <Button
            loading={finish.isPending}
            disabled={!profileNameValue.trim() || !timezoneValue.trim()}
            onClick={() => finish.mutate()}
          >
            Перейти к обзору
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </main>
    </div>
  );
}
