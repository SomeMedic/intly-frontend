"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Play, Plus, RotateCcw, Save, Trash2, Webhook as WebhookIcon } from "lucide-react";
import { AppShell } from "@/components/intly/app-shell";
import { BrandArt } from "@/components/intly/brand";
import { ErrorState } from "@/components/intly/error-state";
import { Skeleton } from "@/components/intly/loading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Modal } from "@/components/ui/modal";
import { useAuthStore } from "@/features/auth";
import { queryKeys } from "@/services/api";
import { guardDraftHistory } from "@/lib/draft-history";
import { clearAiDraft, clearDraftHistoryRequest, readDraftHistoryRequest, writeDraftHistoryRequest } from "../settings-drafts";
import type { ApiTokenScope } from "@/types";
import { settingsApi } from "../api/settings-api";
import { apiTokenScopes, parseWebhookEvents, webhookEvents } from "../api/settings-form";
import { apiTokenScopeLabel, apiTokenScopeLabels, booleanStatusLabels, deliveryStatusLabels, formatSettingsDate, resolveSettingsLocale, webhookEventLabel, webhookEventLabels, type SettingsLocale } from "../settings-labels";

function itemId(item: { id?: string; _id?: string }) {
  return item.id ?? item._id ?? "";
}

const settingsCopy = {
  ru: {
    title: "Настройки",
    subtitle: "Личные параметры, уведомления, Telegram, API-токены, webhooks и AI-контекст.",
    loadError: "Не удалось загрузить настройки. Повторите запрос.",
    account: "Аккаунт",
    name: "Имя",
    timezone: "Часовой пояс",
    locale: "Язык интерфейса",
    density: "Плотность интерфейса",
    notifications: "Уведомления",
    digest: "Дайджест",
    aiPreferences: "AI-настройки",
    aiLanguage: "Язык AI",
    userPreferences: "Пользовательские предпочтения",
    customPrompt: "Дополнительный промпт",
    webhooks: "Webhooks",
    webhookName: "Название webhook",
    webhookUrl: "URL webhook",
    webhookSecret: "Секрет подписи",
    webhookEvents: "События через запятую",
    createWebhook: "Создать webhook",
    test: "Тест",
    history: "История",
    deleteWebhook: "Удалить webhook",
    queued: "В очереди",
    retry: "Повторить",
    loadingDeliveries: "Загружаем историю доставок…",
    noDeliveries: "Доставок пока нет.",
    telegram: "Telegram",
    linked: "Связь",
    link: "Подключить",
    unlink: "Отключить",
    token: "Токен",
    apiTokens: "API-токены",
    tokenName: "Название токена",
    expiresInDays: "Срок действия, дней",
    createToken: "Создать токен",
    createdSecretHint: "Скопируйте токен сейчас. Позже он не будет показан полностью.",
    created: "Создан",
    lastUsed: "Последнее использование",
    expires: "Истекает",
    unknown: "неизвестно",
    never: "никогда",
    revokeToken: "Отозвать токен",
    saving: "Сохраняем…",
    actionError: "Действие не выполнено"
  },
  en: {
    title: "Settings",
    subtitle: "Personal preferences, notifications, Telegram, API tokens, webhooks, and AI context.",
    loadError: "Could not load settings. Try again.",
    account: "Account",
    name: "Name",
    timezone: "Timezone",
    locale: "Interface language",
    density: "Interface density",
    notifications: "Notifications",
    digest: "Digest",
    aiPreferences: "AI preferences",
    aiLanguage: "AI language",
    userPreferences: "User preferences",
    customPrompt: "Custom prompt",
    webhooks: "Webhooks",
    webhookName: "Webhook name",
    webhookUrl: "Webhook URL",
    webhookSecret: "Signing secret",
    webhookEvents: "Comma-separated events",
    createWebhook: "Create webhook",
    test: "Test",
    history: "History",
    deleteWebhook: "Delete webhook",
    queued: "Queued",
    retry: "Retry",
    loadingDeliveries: "Loading delivery history…",
    noDeliveries: "No deliveries yet.",
    telegram: "Telegram",
    linked: "Linked",
    link: "Link",
    unlink: "Unlink",
    token: "Token",
    apiTokens: "API tokens",
    tokenName: "Token name",
    expiresInDays: "Expires in days",
    createToken: "Create token",
    createdSecretHint: "Copy this token now. It will not be shown in full again.",
    created: "Created",
    lastUsed: "Last used",
    expires: "Expires",
    unknown: "unknown",
    never: "never",
    revokeToken: "Revoke token",
    saving: "Saving…",
    actionError: "Action failed"
  }
};

import { SettingsAi, SettingsAppearance, SettingsExport, SettingsNotifications, SettingsPassword, SettingsSearch, settingsTabs, type SettingsTab } from "./SettingsSections";

type SettingsCopy = (typeof settingsCopy)[SettingsLocale];

function mutationError(...mutations: Array<{ error: Error | null }>) {
  return mutations.find((mutation) => mutation.error)?.error?.message;
}

function TimezoneSetting({ locale, value, saving, onSave }: { locale: SettingsLocale; value: string; saving: boolean; onSave: (timezone: string) => Promise<unknown> }) {
  const [draft, setDraft] = useState(value);
  const [message, setMessage] = useState("");
  return <form className="max-w-sm space-y-3" onSubmit={async event => {
    event.preventDefault();
    try {
      new Intl.DateTimeFormat("en", { timeZone: draft }).format();
      await onSave(draft);
      setMessage(locale === "en" ? "Timezone saved." : "Часовой пояс сохранён.");
    } catch {
      setMessage(locale === "en" ? "Could not save. Enter a valid timezone, for example Europe/Moscow." : "Не удалось сохранить. Укажите часовой пояс, например Europe/Moscow.");
    }
  }}><label className="block space-y-1 text-sm"><span>{locale === "en" ? "Timezone" : "Часовой пояс"}</span><Input value={draft} required onChange={event => setDraft(event.target.value)} /></label><Button type="submit" variant="outline" loading={saving}>{locale === "en" ? "Save timezone" : "Сохранить часовой пояс"}</Button>{message ? <p role="status" className="text-xs text-muted-foreground">{message}</p> : null}</form>;
}

export function SettingsScreen() {
  return <Suspense fallback={<AppShell><Skeleton className="h-96 w-full" /></AppShell>}><SettingsContents /></Suspense>;
}

function SettingsContents() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const tab: SettingsTab = settingsTabs.find(([id]) => id === requestedTab)?.[0] ?? "account";
  const [promptDirty, setPromptDirty] = useState(false);
  const [aiEditorVersion, setAiEditorVersion] = useState(0);
  const [pendingTab, setPendingTab] = useState<SettingsTab | null>(null);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [pendingHistory, setPendingHistory] = useState<(() => void) | null>(null);
  const historyGuard = useRef<(() => void) | null>(null);
  const user = useAuthStore(state => state.user);
  const ownerId = user?.id ?? "anonymous";
  const handlePromptDirty = useCallback((dirty: boolean) => {
    setPromptDirty(dirty);
    if (!dirty) return;
    const pending = readDraftHistoryRequest(ownerId);
    if (pending?.originHref === window.location.href) setPendingHistory(() => () => window.history.go(pending.delta));
  }, [ownerId]);
  useLayoutEffect(() => {
    if (!promptDirty) return;
    const remove = guardDraftHistory(window, resume => setPendingHistory(() => resume), request => writeDraftHistoryRequest(ownerId, request));
    historyGuard.current = remove;
    return () => { remove(); if (historyGuard.current === remove) historyGuard.current = null; };
  }, [ownerId, promptDirty]);
  const clearPendingNavigation = () => {
    setPendingTab(null);
    setPendingHref(null);
    setPendingHistory(null);
    clearDraftHistoryRequest(ownerId);
  };
  useEffect(() => {
    if (!promptDirty) return;
    const guardNavigation = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
      const target = new URL(link.href, window.location.href);
      if (target.origin !== window.location.origin || target.href === window.location.href) return;
      event.preventDefault();
      event.stopPropagation();
      setPendingHref(`${target.pathname}${target.search}${target.hash}`);
    };
    document.addEventListener("click", guardNavigation, true);
    return () => document.removeEventListener("click", guardNavigation, true);
  }, [promptDirty]);
  const goToTab = (next: SettingsTab) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", next);
    router.push(`/settings?${params}`, { scroll: false });
  };
  const changeTab = (next: SettingsTab) => {
    if (next === tab) return;
    if (promptDirty) setPendingTab(next);
    else goToTab(next);
  };
  const discardAndNavigate = () => {
    if (!pendingTab && !pendingHref && !pendingHistory) return;
    const resume = pendingHistory;
    const href = pendingHref;
    const nextTab = pendingTab;
    clearAiDraft(ownerId);
    historyGuard.current?.();
    historyGuard.current = null;
    setPromptDirty(false);
    setAiEditorVersion(version => version + 1);
    clearPendingNavigation();
    // Let the old editor remove its beforeunload listener before traversing.
    window.setTimeout(() => {
      if (resume) resume();
      else if (href) router.push(href);
      else if (nextTab) goToTab(nextTab);
    }, 0);
  };
  const queryClient = useQueryClient();
  const settings = useQuery({ queryKey: ["settings", "me"], queryFn: settingsApi.settings });
  const notifications = useQuery({ queryKey: ["settings", "notifications"], queryFn: settingsApi.notificationSettings });
  const tokens = useQuery({ queryKey: ["settings", "tokens"], queryFn: settingsApi.apiTokens });
  const webhooks = useQuery({ queryKey: ["settings", "webhooks"], queryFn: settingsApi.webhooks });
  const ai = useQuery({ queryKey: ["settings", "ai"], queryFn: settingsApi.aiPreferences });
  const locale = resolveSettingsLocale(settings.data?.locale);
  const copy = settingsCopy[locale];
  const [tokenName, setTokenName] = useState("Local integration");
  const [tokenScopes, setTokenScopes] = useState<ApiTokenScope[]>(["read:opportunities"]);
  const [tokenExpiresInDays, setTokenExpiresInDays] = useState(90);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [webhookDraft, setWebhookDraft] = useState({ name: "Workflow webhook", url: "", secret: "", events: "test,notification.created", enabled: true });
  const [selectedWebhookId, setSelectedWebhookId] = useState<string | null>(null);
  const webhookDeliveries = useQuery({ queryKey: ["settings", "webhooks", selectedWebhookId, "deliveries"], queryFn: () => settingsApi.webhookDeliveries(selectedWebhookId!), enabled: Boolean(selectedWebhookId) });

  const updateSettings = useMutation({
    mutationFn: settingsApi.updateSettings,
    scope: { id: "account-settings" },
    onSuccess: (updated, patch) => {
      const { user: current, setUser } = useAuthStore.getState();
      if (current) {
        const currentUser = {
          ...current,
          ...(patch.name !== undefined ? { name: updated.name ?? current.name } : {}),
          settings: {
            ...current.settings,
            ...(patch.locale !== undefined ? { locale: updated.locale } : {}),
            ...(patch.timezone !== undefined ? { timezone: updated.timezone } : {})
          }
        };
        setUser(currentUser);
        queryClient.setQueryData(queryKeys.session(), currentUser);
      }
      queryClient.setQueryData(["settings", "me"], updated);
    }
  });
  const updateNotifications = useMutation({
    mutationFn: settingsApi.updateNotificationSettings,
    scope: { id: "notification-settings" },
    onSuccess: updated => { queryClient.setQueryData(["settings", "notifications"], updated); }
  });
  const updateAi = useMutation({
    mutationFn: settingsApi.updateAiPreferences,
    onSuccess: updated => { queryClient.setQueryData(["settings", "ai"], updated); }
  });
  const linkTelegram = useMutation({ mutationFn: settingsApi.linkTelegram });
  const unlinkTelegram = useMutation({ mutationFn: settingsApi.unlinkTelegram, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["settings"] }) });
  const createToken = useMutation({
    mutationFn: () => settingsApi.createApiToken({ name: tokenName, scopes: tokenScopes, expiresInDays: tokenExpiresInDays }),
    onSuccess: (token) => { setCreatedSecret(token.token); queryClient.invalidateQueries({ queryKey: ["settings", "tokens"] }); }
  });
  const revokeToken = useMutation({ mutationFn: settingsApi.revokeApiToken, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["settings", "tokens"] }) });
  const createWebhook = useMutation({
    mutationFn: () => settingsApi.createWebhook({ name: webhookDraft.name, url: webhookDraft.url, secret: webhookDraft.secret, events: parseWebhookEvents(webhookDraft.events), enabled: webhookDraft.enabled }),
    onSuccess: (webhook) => { setSelectedWebhookId(itemId(webhook)); queryClient.invalidateQueries({ queryKey: ["settings", "webhooks"] }); }
  });
  const updateWebhook = useMutation({ mutationFn: ({ id, body }: { id: string; body: Parameters<typeof settingsApi.updateWebhook>[1] }) => settingsApi.updateWebhook(id, body), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["settings", "webhooks"] }) });
  const deleteWebhook = useMutation({ mutationFn: settingsApi.deleteWebhook, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["settings", "webhooks"] }) });
  const testWebhook = useMutation({ mutationFn: settingsApi.testWebhook, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["settings", "webhooks"] }) });
  const retryDelivery = useMutation({ mutationFn: settingsApi.retryWebhookDelivery, onSuccess: () => selectedWebhookId ? queryClient.invalidateQueries({ queryKey: ["settings", "webhooks", selectedWebhookId, "deliveries"] }) : undefined });

  const busy = settings.isLoading || notifications.isLoading || tokens.isLoading || webhooks.isLoading || ai.isLoading;
  const failed = settings.isError || notifications.isError || tokens.isError || webhooks.isError || ai.isError;
  const actionError = mutationError(updateSettings, updateNotifications, updateAi, linkTelegram, unlinkTelegram, createToken, revokeToken, createWebhook, updateWebhook, deleteWebhook, testWebhook, retryDelivery);

  return (
    <AppShell>
      <header className="mb-5 flex min-w-0 items-center gap-4">
        <BrandArt kind={tab === "ai" ? "analysis" : tab === "notifications" ? "workflow" : tab === "profiles" ? "resume" : "connections"} className="w-20 shrink-0 sm:w-28" />
        <div className="min-w-0">
        <h1 className="text-2xl font-semibold">{copy.title}</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{copy.subtitle}</p>
        </div>
      </header>
      {busy ? <Skeleton className="h-96 w-full" /> : null}
      {failed ? <ErrorState message={copy.loadError} onRetry={() => { settings.refetch(); notifications.refetch(); tokens.refetch(); webhooks.refetch(); ai.refetch(); }} /> : null}
      {!busy && !failed ? (
        <div className="grid min-w-0 gap-4 lg:grid-cols-[13rem_minmax(0,1fr)]">
          <nav aria-label={locale === "en" ? "Settings categories" : "Разделы настроек"} className="min-w-0">
            <label className="block space-y-1 text-sm lg:hidden"><span>{locale === "en" ? "Category" : "Раздел"}</span><select className="h-[var(--control-height)] w-full rounded-md border bg-card px-3" value={tab} onChange={event => changeTab(event.target.value as SettingsTab)}>{settingsTabs.map(([id, ru, en]) => <option key={id} value={id}>{locale === "en" ? en : ru}</option>)}</select></label>
            <div className="hidden space-y-1 rounded-lg border bg-card p-2 lg:block">{settingsTabs.map(([id, ru, en]) => <button type="button" key={id} onClick={() => changeTab(id)} aria-current={tab === id ? "page" : undefined} className={`block w-full rounded-md px-3 py-2.5 text-left text-sm ${tab === id ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>{locale === "en" ? en : ru}</button>)}</div>
          </nav>
          <div className="min-w-0 max-w-4xl space-y-4">
            {tab === "account" ? <section className="space-y-4 rounded-lg border bg-card p-[var(--card-padding)]">
              <h2 className="font-semibold">{copy.account}</h2>
              <label className="block max-w-lg space-y-1 text-sm"><span>{copy.name}</span><Input defaultValue={settings.data?.name ?? ""} onBlur={event => { if (event.target.value !== settings.data?.name) updateSettings.mutate({ name: event.target.value }); }} /></label>
              <dl className="grid min-w-0 gap-3 text-sm sm:grid-cols-2"><div className="min-w-0"><dt className="text-muted-foreground">Email</dt><dd className="mt-1 break-all">{settings.data?.email ?? user?.email}</dd></div><div><dt className="text-muted-foreground">{locale === "en" ? "Account status" : "Статус аккаунта"}</dt><dd className="mt-1"><Badge intent={settings.data?.status === "Active" ? "success" : "neutral"}>{locale === "en" ? settings.data?.status : ({ Active: "Активен", Invited: "Приглашён", Disabled: "Отключён", Locked: "Заблокирован", Deleted: "Удалён" }[settings.data?.status ?? ""] ?? settings.data?.status)}</Badge></dd></div></dl>
              <SettingsPassword locale={locale} />
            </section> : null}
            {tab === "appearance" ? <SettingsAppearance locale={locale} /> : null}
            {tab === "language" ? <section className="space-y-4 rounded-lg border bg-card p-[var(--card-padding)]"><h2 className="font-semibold">{locale === "en" ? "Language & time" : "Язык и время"}</h2><label className="block max-w-sm space-y-1 text-sm"><span>{copy.locale}</span><select className="h-[var(--control-height)] w-full rounded-md border bg-card px-3" value={settings.data?.locale} onChange={event => updateSettings.mutate({ locale: event.target.value as "ru" | "en" })}><option value="ru">Русский</option><option value="en">English</option></select></label><TimezoneSetting locale={locale} value={settings.data?.timezone ?? "Europe/Moscow"} saving={updateSettings.isPending} onSave={timezone => updateSettings.mutateAsync({ timezone })} /></section> : null}
            {tab === "notifications" && notifications.data ? <SettingsNotifications locale={locale} value={notifications.data} timezone={settings.data?.timezone ?? "Europe/Moscow"} isAdmin={user?.role === "Admin"} saving={updateNotifications.isPending} onSave={updateNotifications.mutateAsync} /> : null}
            {tab === "telegram" ? <section className="rounded-lg border bg-card p-[var(--card-padding)]"><h2 className="font-semibold">{copy.telegram}</h2><div className="mt-3 flex min-w-0 items-center justify-between gap-3 text-sm"><span>{copy.linked}</span><Badge intent={settings.data?.telegram?.linked ? "success" : "warning"}>{settings.data?.telegram?.linked ? booleanStatusLabels[locale].linked : booleanStatusLabels[locale].notLinked}</Badge></div><p className="mt-3 text-sm text-muted-foreground">{locale === "en" ? "Link your Telegram account to receive the events you select in notification settings." : "Подключите Telegram, чтобы получать события, выбранные в настройках уведомлений."}</p><div className="mt-4 flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => linkTelegram.mutate()} loading={linkTelegram.isPending}>{copy.link}</Button><Button size="sm" variant="outline" onClick={() => unlinkTelegram.mutate()} loading={unlinkTelegram.isPending} disabled={!settings.data?.telegram?.linked}>{copy.unlink}</Button></div>{linkTelegram.data?.deepLink ? <a className="mt-3 block break-all text-sm text-primary underline" href={linkTelegram.data.deepLink}>{locale === "en" ? "Open Telegram to finish linking" : "Открыть Telegram для подключения"}</a> : linkTelegram.data ? <p role="status" className="mt-3 text-sm text-muted-foreground">{locale === "en" ? "The Telegram bot is not configured yet. An administrator needs to set its username." : "Telegram-бот пока не настроен. Администратору нужно указать его имя."}</p> : null}</section> : null}
            {tab === "profiles" ? <section className="space-y-4 rounded-lg border bg-card p-[var(--card-padding)]"><h2 className="font-semibold">{locale === "en" ? "Profiles" : "Профили"}</h2><p className="text-sm text-muted-foreground">{locale === "en" ? "Your profiles define search criteria, resume context and recommendations. Shared imports are available to everyone in the workspace." : "Профили задают критерии поиска, контекст резюме и рекомендаций. Общие импорты доступны всем участникам."}</p><div className="flex flex-wrap gap-2"><Button asChild variant="outline"><Link href="/profiles">{locale === "en" ? "Manage profiles" : "Управлять профилями"}</Link></Button><Button asChild variant="outline"><Link href="/resumes">{locale === "en" ? "Open resumes" : "Открыть резюме"}</Link></Button></div></section> : null}
            {tab === "ai" && ai.data ? <SettingsAi key={`${ownerId}:${aiEditorVersion}`} ownerId={ownerId} locale={locale} value={ai.data} saving={updateAi.isPending} onSave={updateAi.mutateAsync} onDirty={handlePromptDirty} /> : null}
            {tab === "api" ? <ApiTokensSection copy={copy} locale={locale} tokenName={tokenName} setTokenName={setTokenName} tokenExpiresInDays={tokenExpiresInDays} setTokenExpiresInDays={setTokenExpiresInDays} tokenScopes={tokenScopes} setTokenScopes={setTokenScopes} createToken={createToken} createdSecret={createdSecret} tokens={tokens.data?.items ?? []} revokeToken={revokeToken} /> : null}
            {tab === "webhooks" ? <WebhooksSection copy={copy} locale={locale} webhookDraft={webhookDraft} selectedWebhookId={selectedWebhookId} setSelectedWebhookId={setSelectedWebhookId} setWebhookDraft={setWebhookDraft} webhooks={webhooks.data?.items ?? []} webhookDeliveries={webhookDeliveries} createWebhook={createWebhook} updateWebhook={updateWebhook} deleteWebhook={deleteWebhook} testWebhook={testWebhook} retryDelivery={retryDelivery} /> : null}
            {tab === "search" ? <SettingsSearch locale={locale} /> : null}
            {tab === "export" && settings.data ? <SettingsExport locale={locale} value={settings.data} saving={updateSettings.isPending} onSave={updateSettings.mutate} /> : null}
          </div>
        </div>
      ) : null}
      <Modal open={pendingTab !== null || pendingHref !== null || pendingHistory !== null} onOpenChange={open => { if (!open) clearPendingNavigation(); }} title={locale === "en" ? "Unsaved AI preferences" : "Несохранённые настройки AI"} description={locale === "en" ? "Your edited prompt has not been saved. Stay to save it or discard these changes." : "Изменённый промпт ещё не сохранён. Останьтесь, чтобы сохранить его, или отмените изменения."}><div className="flex flex-wrap justify-end gap-2"><Button variant="outline" onClick={clearPendingNavigation}>{locale === "en" ? "Keep editing" : "Продолжить редактирование"}</Button><Button onClick={discardAndNavigate}>{locale === "en" ? "Discard changes" : "Отменить изменения"}</Button></div></Modal>
      {actionError ? <div className="fixed bottom-20 right-5 max-w-sm rounded-md border border-destructive/40 bg-card px-3 py-2 text-sm text-destructive shadow-soft" role="alert">{copy.actionError}: {actionError}</div> : null}
      {updateSettings.isPending || updateNotifications.isPending || updateAi.isPending ? <div className="fixed bottom-20 right-5 rounded-md border bg-card px-3 py-2 text-sm shadow-soft"><Save className="mr-2 inline size-4" />{copy.saving}</div> : null}
    </AppShell>
  );
}

type WebhooksSectionProps = {
  copy: SettingsCopy;
  locale: SettingsLocale;
  webhookDraft: { name: string; url: string; secret: string; events: string; enabled: boolean };
  selectedWebhookId: string | null;
  setSelectedWebhookId: (id: string | null) => void;
  setWebhookDraft: React.Dispatch<React.SetStateAction<{ name: string; url: string; secret: string; events: string; enabled: boolean }>>;
  webhooks: Awaited<ReturnType<typeof settingsApi.webhooks>>["items"];
  webhookDeliveries: ReturnType<typeof useQuery<Awaited<ReturnType<typeof settingsApi.webhookDeliveries>>>>;
  createWebhook: ReturnType<typeof useMutation<Awaited<ReturnType<typeof settingsApi.createWebhook>>, Error, void>>;
  updateWebhook: ReturnType<typeof useMutation<Awaited<ReturnType<typeof settingsApi.updateWebhook>>, Error, { id: string; body: Parameters<typeof settingsApi.updateWebhook>[1] }>>;
  deleteWebhook: ReturnType<typeof useMutation<Awaited<ReturnType<typeof settingsApi.deleteWebhook>>, Error, string>>;
  testWebhook: ReturnType<typeof useMutation<Record<string, unknown>, Error, string>>;
  retryDelivery: ReturnType<typeof useMutation<Awaited<ReturnType<typeof settingsApi.retryWebhookDelivery>>, Error, string>>;
};

function WebhooksSection({ copy, locale, webhookDraft, selectedWebhookId, setSelectedWebhookId, setWebhookDraft, webhooks, webhookDeliveries, createWebhook, updateWebhook, deleteWebhook, testWebhook, retryDelivery }: WebhooksSectionProps) {
  const parsedDraftEvents = parseWebhookEvents(webhookDraft.events);

  return <section className="rounded-lg border bg-card p-[var(--card-padding)]">
    <h2 className="font-semibold">{copy.webhooks}</h2>
    <form className="mt-3 grid min-w-0 gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]" onSubmit={(event) => { event.preventDefault(); if (webhookDraft.url && webhookDraft.secret && parsedDraftEvents.length) createWebhook.mutate(); }}>
      <Input aria-label={copy.webhookName} value={webhookDraft.name} onChange={(event) => setWebhookDraft((value) => ({ ...value, name: event.target.value }))} placeholder={copy.webhookName} />
      <Input aria-label={copy.webhookUrl} value={webhookDraft.url} onChange={(event) => setWebhookDraft((value) => ({ ...value, url: event.target.value }))} placeholder="https://example.com/webhook" />
      <Input aria-label={copy.webhookSecret} value={webhookDraft.secret} onChange={(event) => setWebhookDraft((value) => ({ ...value, secret: event.target.value }))} placeholder={copy.webhookSecret} />
      <Input aria-label={copy.webhookEvents} value={webhookDraft.events} onChange={(event) => setWebhookDraft((value) => ({ ...value, events: event.target.value }))} placeholder={webhookEvents.join(",")} />
      <label className="flex min-w-0 items-center gap-2 text-sm"><Switch checked={webhookDraft.enabled} onCheckedChange={(enabled) => setWebhookDraft((value) => ({ ...value, enabled }))} />{booleanStatusLabels[locale].enabled}</label>
      <Button type="submit" loading={createWebhook.isPending} disabled={!webhookDraft.url || !webhookDraft.secret || !parsedDraftEvents.length}><WebhookIcon className="size-4" />{copy.createWebhook}</Button>
    </form>
    <div className="mt-3 flex flex-wrap gap-1.5 text-xs text-muted-foreground">{webhookEvents.map((event) => <Badge key={event}>{webhookEventLabels[locale][event]}</Badge>)}</div>
    <div className="mt-4 space-y-2">{webhooks.map((webhook) => {
      const id = itemId(webhook);
      return (
        <div key={id} className="min-w-0 space-y-3 rounded-md border p-3 text-sm">
          <div className="grid min-w-0 gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <Input aria-label={copy.webhookName} defaultValue={webhook.name} onBlur={(event) => updateWebhook.mutate({ id, body: { name: event.target.value } })} />
            <Input aria-label={copy.webhookUrl} defaultValue={webhook.url} onBlur={(event) => updateWebhook.mutate({ id, body: { url: event.target.value } })} />
            <Input aria-label={copy.webhookEvents} defaultValue={webhook.events.join(",")} onBlur={(event) => updateWebhook.mutate({ id, body: { events: parseWebhookEvents(event.target.value) } })} />
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <Badge intent={webhook.enabled ? "success" : "warning"}>{webhook.enabled ? booleanStatusLabels[locale].enabled : booleanStatusLabels[locale].disabled}</Badge>
              <Switch checked={webhook.enabled} onCheckedChange={(enabled) => updateWebhook.mutate({ id, body: { enabled } })} />
              <Button size="sm" variant="outline" onClick={() => { setSelectedWebhookId(id); testWebhook.mutate(id); }} loading={testWebhook.isPending}><Play className="size-4" />{copy.test}</Button>
              <Button size="sm" variant="outline" onClick={() => setSelectedWebhookId(id)}>{copy.history}</Button>
              <Button size="icon" variant="ghost" onClick={() => deleteWebhook.mutate(id)} aria-label={copy.deleteWebhook}><Trash2 className="size-4 text-destructive" /></Button>
            </div>
          </div>
          {selectedWebhookId === id ? <div className="space-y-2 rounded-md bg-muted/40 p-2">{webhookDeliveries.data?.items.length ? webhookDeliveries.data.items.map((delivery) => {
            const deliveryId = itemId(delivery);
            const status = delivery.status ?? "queued";
            return <div key={deliveryId} className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded border bg-card p-2"><div className="min-w-0"><Badge intent={status === "sent" ? "success" : status === "failed" ? "danger" : "warning"}>{deliveryStatusLabels[locale][status] ?? status}</Badge><span className="ml-2 break-words">{webhookEventLabel(delivery.event, locale)}</span><span className="ml-2 text-muted-foreground">{delivery.statusCode ? `HTTP ${delivery.statusCode}` : copy.queued}</span>{delivery.errorSummary ? <p className="mt-1 break-words text-xs text-destructive">{delivery.errorSummary}</p> : null}</div><Button size="sm" variant="outline" onClick={() => retryDelivery.mutate(deliveryId)} disabled={delivery.status !== "failed"}><RotateCcw className="size-4" />{copy.retry}</Button></div>;
          }) : <p className="text-xs text-muted-foreground">{webhookDeliveries.isLoading ? copy.loadingDeliveries : copy.noDeliveries}</p>}</div> : null}
        </div>
      );
    })}</div>
  </section>;
}

type ApiTokensSectionProps = {
  copy: SettingsCopy;
  locale: SettingsLocale;
  tokenName: string;
  setTokenName: (value: string) => void;
  tokenExpiresInDays: number;
  setTokenExpiresInDays: (value: number) => void;
  tokenScopes: ApiTokenScope[];
  setTokenScopes: React.Dispatch<React.SetStateAction<ApiTokenScope[]>>;
  createToken: ReturnType<typeof useMutation<Awaited<ReturnType<typeof settingsApi.createApiToken>>, Error, void>>;
  createdSecret: string | null;
  tokens: Awaited<ReturnType<typeof settingsApi.apiTokens>>["items"];
  revokeToken: ReturnType<typeof useMutation<Awaited<ReturnType<typeof settingsApi.revokeApiToken>>, Error, string>>;
};

function ApiTokensSection({ copy, locale, tokenName, setTokenName, tokenExpiresInDays, setTokenExpiresInDays, tokenScopes, setTokenScopes, createToken, createdSecret, tokens, revokeToken }: ApiTokensSectionProps) {
  return <section className="rounded-lg border bg-card p-[var(--card-padding)]">
    <h2 className="font-semibold">{copy.apiTokens}</h2>
    <div className="mt-3 grid min-w-0 gap-2">
      <Input aria-label={copy.tokenName} value={tokenName} onChange={(event) => setTokenName(event.target.value)} placeholder={copy.tokenName} />
      <label className="min-w-0 space-y-1 text-sm"><span>{copy.expiresInDays}</span><Input type="number" min={1} max={365} value={tokenExpiresInDays} onChange={(event) => setTokenExpiresInDays(Number(event.target.value))} /></label>
      <div className="grid min-w-0 gap-2 text-sm">
        {apiTokenScopes.map((scope) => (
          <label key={scope} className="flex min-w-0 items-center gap-2">
            <Checkbox
              checked={tokenScopes.includes(scope)}
              onCheckedChange={(checked) => setTokenScopes((value) => checked ? [...new Set([...value, scope])] : value.filter((item) => item !== scope))}
            />
            <span className="min-w-0">{apiTokenScopeLabels[locale][scope]}</span>
          </label>
        ))}
      </div>
      <Button onClick={() => createToken.mutate()} loading={createToken.isPending} disabled={!tokenName.trim() || !tokenScopes.length}><Plus className="size-4" />{copy.createToken}</Button>
    </div>
    {createdSecret ? <div className="mt-3 rounded-md border border-warning/40 bg-warning/10 p-2 text-xs break-all"><KeyRound className="mb-1 size-4" /><p className="mb-1 text-muted-foreground">{copy.createdSecretHint}</p>{createdSecret}</div> : null}
    <div className="mt-3 space-y-2">{tokens.map((token) => {
      const id = itemId(token);
      return <div key={id} className="flex min-w-0 items-center justify-between gap-2 rounded-md border p-2 text-sm"><div className="min-w-0"><p className="truncate">{token.name}</p><Badge>{token.scopes.map((scope) => apiTokenScopeLabel(scope, locale)).join(", ")}</Badge>{token.tokenPrefix ? <p className="text-xs text-muted-foreground">{token.tokenPrefix}…</p> : null}<p className="text-xs text-muted-foreground">{copy.created} {formatSettingsDate(token.createdAt, locale, copy.unknown)} · {copy.lastUsed} {formatSettingsDate(token.lastUsedAt, locale, copy.never)} · {copy.expires} {formatSettingsDate(token.expiresAt, locale, copy.unknown)}</p></div><Button size="icon" variant="ghost" onClick={() => revokeToken.mutate(id)} aria-label={copy.revokeToken}><Trash2 className="size-4 text-destructive" /></Button></div>;
    })}</div>
  </section>;
}
