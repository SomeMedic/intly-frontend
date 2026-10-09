"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, KeyRound, Lock, MailPlus, RefreshCcw, Search, ShieldCheck, ShieldOff, Trash2, UserCheck, UserCog } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import type { AccountStatus, AdminUser, UserRole } from "@/types";
import { AdminFrame, AdminQueryState } from "./AdminShared";
import { AdminUserDataPanel } from "./AdminUserDataPanel";
import { adminUserInspectorApi, extractAiUsageSummary, type AdminUserInspectorOverview } from "../api/admin-user-inspector-api";
import type { AdminLocale, Localized } from "./admin-locale";
import { commonAdminCopy, useAdminLocale } from "./admin-locale";
import { adminUsersApi, type AdminUsersInviteState, type AdminUsersSort } from "./admin-users-api";
import { passwordResetNotice, type AdminUsersNotice } from "./admin-users-reset-notice";

const userStatuses: AccountStatus[] = ["Invited", "Active", "Disabled", "Locked", "Deleted"];
const userRoles: UserRole[] = ["User", "Admin"];
const userInviteStates: AdminUsersInviteState[] = ["pending", "accepted"];
const userSorts: AdminUsersSort[] = ["createdAt:desc", "createdAt:asc", "lastActiveAt:desc", "lastActiveAt:asc", "name:asc", "name:desc"];

function getUserId(user: AdminUser) {
  return user.id ?? user._id ?? user.email;
}

function formatDate(value?: string, locale: AdminLocale = "ru") {
  if (!value) return commonAdminCopy[locale].never;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return commonAdminCopy[locale].never;
  return new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-US", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function dateStart(value: string) {
  return value ? new Date(`${value}T00:00:00.000Z`).toISOString() : undefined;
}

function dateEnd(value: string) {
  if (!value) return undefined;
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString();
}

function aiUsageRunLabel(count: number, locale: AdminLocale) {
  if (locale === "en") return count === 1 ? "run" : "runs";
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return "запуск";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "запуска";
  return "запусков";
}

function costCoverageHint(value: unknown, locale: AdminLocale) {
  const summary = extractAiUsageSummary(value);
  const numberFormat = new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "en-US");
  if (!summary.costUnknownRuns) return summary.estimatedCost === null ? locale === "ru" ? "Стоимость неизвестна" : "Cost unknown" : locale === "ru" ? "Известная стоимость" : "Known cost";
  const unknownCount = numberFormat.format(summary.costUnknownRuns);
  if (locale === "ru") return summary.estimatedCost === null ? `Стоимость неизвестна · ${unknownCount} ${aiUsageRunLabel(summary.costUnknownRuns, locale)} без стоимости` : `Известная стоимость · ${unknownCount} ${aiUsageRunLabel(summary.costUnknownRuns, locale)} без стоимости`;
  return summary.estimatedCost === null ? `Cost unknown · ${unknownCount} ${summary.costUnknownRuns === 1 ? "run" : "runs"} cost unknown` : `Known cost · ${unknownCount} ${summary.costUnknownRuns === 1 ? "run" : "runs"} cost unknown`;
}

function formatMonthlyAiUsage(value: unknown, locale: AdminLocale, fallback: string) {
  if (!value) return { value: fallback, hint: "" };
  const summary = extractAiUsageSummary(value);
  const numberFormat = new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "en-US");
  const hasUsage = summary.runs > 0 || summary.totalTokens > 0 || summary.estimatedCost !== null;
  if (!hasUsage) return { value: locale === "ru" ? "0 запусков" : "0 runs", hint: costCoverageHint(value, locale) };
  const parts = [locale === "ru" ? `${numberFormat.format(summary.runs)} ${aiUsageRunLabel(summary.runs, locale)}` : `${numberFormat.format(summary.runs)} ${aiUsageRunLabel(summary.runs, locale)}`];
  if (summary.totalTokens > 0) parts.push(locale === "ru" ? `${numberFormat.format(summary.totalTokens)} токенов` : `${numberFormat.format(summary.totalTokens)} tokens`);
  if (summary.estimatedCost !== null) parts.push(new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 4 }).format(summary.estimatedCost));
  return { value: parts.join(" · "), hint: costCoverageHint(value, locale) };
}


type UsersCopy = {
  title: string; description: string; email: string; name: string; timezone: string; invite: string;
  emailLabel: string; nameLabel: string; roleLabel: string; localeLabel: string; timezoneLabel: string; searchLabel: string; statusFilter: string; inviteFilter: string;
  starterProfile: string; defaultPrompts: string; notifications: string; presetsNote: string;
  searchPlaceholder: string; allRoles: string; allStatuses: string; allInvites: string; createdFrom: string; createdTo: string; sort: string; lastActive: string; created: string;
  open: string; resendInviteShort: string; disable: string; activate: string; deleteUser: string; emptyDetail: string;
  role: string; locale: string; profiles: string; aiUsage: string; telegram: string; onboarding: string; linked: string; notLinked: string; complete: string; pending: string;
  initialPresets: string; profile: string; aiPrompt: string; lifecycle: string; safetyActions: string; resendInvite: string; resetPassword: string; revokeSessions: string; delete: string;
  previous: string; next: string; page: string; sessionsRevoked: string; noRows: string;
  statusLabels: Record<AccountStatus, string>; roleLabels: Record<UserRole, string>; inviteLabels: Record<AdminUsersInviteState, string>; sortLabels: Record<AdminUsersSort, string>;
};

const usersCopy: Localized<UsersCopy> = {
  ru: {
    title: "Пользователи", description: "Управление жизненным циклом аккаунтов User и Admin.", email: "email", name: "имя", timezone: "часовой пояс", invite: "Пригласить",
    emailLabel: "Email", nameLabel: "Имя", roleLabel: "Роль", localeLabel: "Язык", timezoneLabel: "Часовой пояс", searchLabel: "Поиск", statusFilter: "Статус", inviteFilter: "Инвайт",
    starterProfile: "Стартовый профиль", defaultPrompts: "Базовые AI-промпты", notifications: "Настройки уведомлений", presetsNote: "Эти настройки сохраняются в приглашённом аккаунте и заполняют первый запуск.",
    searchPlaceholder: "Поиск по имени или email", allRoles: "Все роли", allStatuses: "Все статусы", allInvites: "Любой инвайт", createdFrom: "Создан с", createdTo: "Создан до", sort: "Сортировка", lastActive: "Активность", created: "Создан",
    open: "Открыть", resendInviteShort: "Инвайт", disable: "Отключить", activate: "Активировать", deleteUser: "Удалить пользователя", emptyDetail: "Откройте пользователя, чтобы посмотреть данные аккаунта и действия жизненного цикла.",
    role: "Роль", locale: "Язык", profiles: "Профили", aiUsage: "AI за месяц", telegram: "Telegram", onboarding: "Онбординг", linked: "Связан", notLinked: "Не связан", complete: "Готов", pending: "Ожидает",
    initialPresets: "Стартовые настройки", profile: "Профиль", aiPrompt: "AI-промпт", lifecycle: "Жизненный цикл", safetyActions: "Безопасные действия", resendInvite: "Отправить инвайт снова", resetPassword: "Сбросить пароль", revokeSessions: "Завершить сессии", delete: "Удалить",
    previous: "Назад", next: "Далее", page: "Страница", sessionsRevoked: "Сессии пользователя завершены.", noRows: "Пользователей по этим фильтрам нет.",
    statusLabels: { Invited: "Приглашён", Active: "Активен", Disabled: "Отключён", Locked: "Заблокирован", Deleted: "Удалён" }, roleLabels: { User: "Пользователь", Admin: "Админ" },
    inviteLabels: { pending: "Инвайт ожидает", accepted: "Инвайт принят" },
    sortLabels: { "createdAt:desc": "Новые первыми", "createdAt:asc": "Старые первыми", "lastActiveAt:desc": "Недавняя активность", "lastActiveAt:asc": "Давняя активность", "name:asc": "Имя А-Я", "name:desc": "Имя Я-А" },
  },
  en: {
    title: "Users", description: "Lifecycle controls for User and Admin accounts.", email: "email", name: "name", timezone: "timezone", invite: "Invite",
    emailLabel: "Email", nameLabel: "Name", roleLabel: "Role", localeLabel: "Language", timezoneLabel: "Timezone", searchLabel: "Search", statusFilter: "Status", inviteFilter: "Invite state",
    starterProfile: "Starter profile", defaultPrompts: "Default AI prompts", notifications: "Notification defaults", presetsNote: "These choices are saved to the invited account and prefill first setup.",
    searchPlaceholder: "Search name or email", allRoles: "All roles", allStatuses: "All statuses", allInvites: "Any invite state", createdFrom: "Created from", createdTo: "Created to", sort: "Sort", lastActive: "Last active", created: "Created",
    open: "Open", resendInviteShort: "Invite", disable: "Disable", activate: "Activate", deleteUser: "Delete user", emptyDetail: "Open a user to inspect account details and lifecycle controls.",
    role: "Role", locale: "Locale", profiles: "Profiles", aiUsage: "Monthly AI usage", telegram: "Telegram", onboarding: "Onboarding", linked: "Linked", notLinked: "Not linked", complete: "Complete", pending: "Pending",
    initialPresets: "Initial presets", profile: "Profile", aiPrompt: "AI prompt", lifecycle: "Lifecycle", safetyActions: "Safety actions", resendInvite: "Resend invite", resetPassword: "Reset password", revokeSessions: "Revoke sessions", delete: "Delete",
    previous: "Previous", next: "Next", page: "Page", sessionsRevoked: "User sessions were revoked.", noRows: "No users match these filters.",
    statusLabels: { Invited: "Invited", Active: "Active", Disabled: "Disabled", Locked: "Locked", Deleted: "Deleted" }, roleLabels: { User: "User", Admin: "Admin" },
    inviteLabels: { pending: "Invite pending", accepted: "Invite accepted" },
    sortLabels: { "createdAt:desc": "Newest first", "createdAt:asc": "Oldest first", "lastActiveAt:desc": "Recent activity", "lastActiveAt:asc": "Old activity", "name:asc": "Name A-Z", "name:desc": "Name Z-A" },
  },
};

function boolPreset(value: boolean | undefined, locale: AdminLocale) {
  return value ? commonAdminCopy[locale].enabled : commonAdminCopy[locale].off;
}

function statusIntent(status: AccountStatus) {
  if (status === "Active") return "success" as const;
  if (status === "Deleted" || status === "Locked") return "danger" as const;
  return "warning" as const;
}

const fieldLabelClass = "space-y-1 text-sm";
const fieldLabelTextClass = "block text-xs font-medium text-muted-foreground";
const selectClass = "h-[var(--control-height)] w-full min-w-0 rounded-md border bg-card px-3 text-sm";

export function AdminUsersScreen() {
  const locale = useAdminLocale();
  const text = usersCopy[locale];
  const common = commonAdminCopy[locale];
  const queryClient = useQueryClient();
  const [filters, setFiltersState] = useState<{ query: string; role: "all" | UserRole; status: "all" | AccountStatus; inviteState: "all" | AdminUsersInviteState; createdFrom: string; createdTo: string; sort: AdminUsersSort }>({ query: "", role: "all", status: "all", inviteState: "all", createdFrom: "", createdTo: "", sort: "createdAt:desc" });
  const [cursors, setCursors] = useState<Array<string | null>>([null]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [inviteDraft, setInviteDraft] = useState({ email: "", name: "", role: "User" as UserRole, locale: "ru" as "ru" | "en", timezone: "Europe/Moscow", starterProfile: true, defaultPrompts: true, notifications: true });
  const [notice, setNotice] = useState<AdminUsersNotice | null>(null);
  const cursor = cursors.at(-1) ?? null;
  const setFilters = (next: typeof filters | ((value: typeof filters) => typeof filters)) => {
    setFiltersState((value) => typeof next === "function" ? next(value) : next);
    setCursors([null]);
  };

  const listQuery = useQuery({
    queryKey: ["admin", "users", filters, cursor],
    queryFn: () => adminUsersApi.list({
      query: filters.query,
      role: filters.role === "all" ? undefined : filters.role,
      status: filters.status === "all" ? undefined : filters.status,
      inviteState: filters.inviteState === "all" ? undefined : filters.inviteState,
      createdFrom: dateStart(filters.createdFrom),
      createdTo: dateEnd(filters.createdTo),
      sort: filters.sort,
      cursor,
    })
  });
  const selectedId = selectedUserId ?? (listQuery.data?.items[0] ? getUserId(listQuery.data.items[0]) : null);
  const detailQuery = useQuery({ queryKey: ["admin", "users", selectedId], queryFn: () => adminUsersApi.detail(selectedId!), enabled: Boolean(selectedId) });

  const invalidateUsers = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
  };

  const invite = useMutation({
    mutationFn: () => adminUsersApi.create({
      email: inviteDraft.email.trim(),
      name: inviteDraft.name.trim(),
      role: inviteDraft.role,
      locale: inviteDraft.locale,
      timezone: inviteDraft.timezone,
      inviteDefaults: {
        starterProfile: inviteDraft.starterProfile,
        defaultPrompts: inviteDraft.defaultPrompts,
        notifications: inviteDraft.notifications
      }
    }),
    onSuccess: (result) => {
      setInviteDraft((draft) => ({ ...draft, email: "", name: "" }));
      setSelectedUserId(result.user.id);
      setNotice(null);
      invalidateUsers();
    }
  });
  const updateUser = useMutation({ mutationFn: ({ id, body }: { id: string; body: Partial<AdminUser> }) => adminUsersApi.update(id, body), onSuccess: invalidateUsers });
  const status = useMutation({ mutationFn: ({ id, next }: { id: string; next: AccountStatus }) => adminUsersApi.status(id, next), onSuccess: invalidateUsers });
  const role = useMutation({ mutationFn: ({ id, next }: { id: string; next: UserRole }) => adminUsersApi.role(id, next), onSuccess: invalidateUsers });
  const resend = useMutation({ mutationFn: adminUsersApi.resendInvite, onSuccess: invalidateUsers });
  const resetPassword = useMutation({ mutationFn: adminUsersApi.resetPassword, onSuccess: (result) => setNotice(passwordResetNotice(result, locale)) });
  const revokeSessions = useMutation({ mutationFn: adminUsersApi.revokeSessions, onSuccess: () => setNotice({ intent: "success", message: text.sessionsRevoked }) });
  const remove = useMutation({ mutationFn: adminUsersApi.remove, onSuccess: invalidateUsers });

  const items = useMemo(() => listQuery.data?.items ?? [], [listQuery.data?.items]);
  const currentPageUserIds = useMemo(() => Array.from(new Set(items.map((user) => getUserId(user)).filter(Boolean))).slice(0, 50), [items]);
  const overviewBatch = useQuery({
    queryKey: ["admin", "users", "inspector", "overview-batch", currentPageUserIds],
    queryFn: () => adminUserInspectorApi.batchOverview(currentPageUserIds),
    enabled: currentPageUserIds.length > 0,
    staleTime: 30_000,
  });

  useEffect(() => {
    for (const overview of overviewBatch.data?.items ?? []) {
      queryClient.setQueryData(["admin", "users", "inspector", overview.userId, "overview"], overview);
    }
  }, [overviewBatch.data?.items, queryClient]);

  const overviewByUserId = useMemo(() => new Map((overviewBatch.data?.items ?? []).map((item) => [item.userId, item] as const)), [overviewBatch.data?.items]);
  const selectedUser = detailQuery.data ?? items.find((user) => getUserId(user) === selectedId);
  const selectedUserIdResolved = selectedUser ? getUserId(selectedUser) : null;
  const selectedOverview: AdminUserInspectorOverview | undefined = selectedUserIdResolved ? overviewByUserId.get(selectedUserIdResolved) : undefined;
  const selectedAiUsage = selectedOverview ? formatMonthlyAiUsage(selectedOverview.currentMonthAiUsage, locale, common.notTracked) : null;
  const selectedStatusActions = useMemo(() => selectedUser?.status === "Deleted" ? [] : userStatuses.filter((item) => item !== selectedUser?.status), [selectedUser?.status]);
  const selectedDeleted = selectedUser?.status === "Deleted";

  return (
    <AdminFrame title={text.title} description={text.description}>
      <div className="mb-4 grid gap-3 rounded-lg border bg-card p-3">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <label className={fieldLabelClass}>
            <span className={fieldLabelTextClass}>{text.emailLabel}</span>
            <Input type="email" aria-label={text.emailLabel} placeholder="user@example.com" value={inviteDraft.email} onChange={(event) => setInviteDraft((draft) => ({ ...draft, email: event.target.value }))} />
          </label>
          <label className={fieldLabelClass}>
            <span className={fieldLabelTextClass}>{text.nameLabel}</span>
            <Input aria-label={text.nameLabel} placeholder={text.nameLabel} value={inviteDraft.name} onChange={(event) => setInviteDraft((draft) => ({ ...draft, name: event.target.value }))} />
          </label>
          <label className={fieldLabelClass}>
            <span className={fieldLabelTextClass}>{text.roleLabel}</span>
            <select aria-label={text.roleLabel} className={selectClass} value={inviteDraft.role} onChange={(event) => setInviteDraft((draft) => ({ ...draft, role: event.target.value as UserRole }))}>
              {userRoles.map((item) => <option key={item} value={item}>{text.roleLabels[item]}</option>)}
            </select>
          </label>
          <label className={fieldLabelClass}>
            <span className={fieldLabelTextClass}>{text.localeLabel}</span>
            <select aria-label={text.localeLabel} className={selectClass} value={inviteDraft.locale} onChange={(event) => setInviteDraft((draft) => ({ ...draft, locale: event.target.value as "ru" | "en" }))}>
              <option value="ru">RU</option>
              <option value="en">EN</option>
            </select>
          </label>
          <label className={fieldLabelClass}>
            <span className={fieldLabelTextClass}>{text.timezoneLabel}</span>
            <Input aria-label={text.timezoneLabel} value={inviteDraft.timezone} onChange={(event) => setInviteDraft((draft) => ({ ...draft, timezone: event.target.value }))} />
          </label>
          <div className="flex items-end">
            <Button className="w-full" onClick={() => invite.mutate()} loading={invite.isPending} disabled={!inviteDraft.email || !inviteDraft.name}><MailPlus className="size-4" />{text.invite}</Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          <label className="flex items-center gap-2"><Checkbox checked={inviteDraft.starterProfile} onCheckedChange={(checked) => setInviteDraft((draft) => ({ ...draft, starterProfile: Boolean(checked) }))} />{text.starterProfile}</label>
          <label className="flex items-center gap-2"><Checkbox checked={inviteDraft.defaultPrompts} onCheckedChange={(checked) => setInviteDraft((draft) => ({ ...draft, defaultPrompts: Boolean(checked) }))} />{text.defaultPrompts}</label>
          <label className="flex items-center gap-2"><Checkbox checked={inviteDraft.notifications} onCheckedChange={(checked) => setInviteDraft((draft) => ({ ...draft, notifications: Boolean(checked) }))} />{text.notifications}</label>
          <span>{text.presetsNote}</span>
        </div>
      </div>

      <div className="mb-4 grid gap-3 rounded-lg border bg-card p-3 md:grid-cols-2 xl:grid-cols-3">
        <label className={fieldLabelClass}>
          <span className={fieldLabelTextClass}>{text.searchLabel}</span>
          <span className="relative block min-w-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input aria-label={text.searchLabel} className="pl-9" placeholder={text.searchPlaceholder} value={filters.query} onChange={(event) => setFilters((value) => ({ ...value, query: event.target.value }))} />
          </span>
        </label>
        <label className={fieldLabelClass}>
          <span className={fieldLabelTextClass}>{text.roleLabel}</span>
          <select aria-label={text.roleLabel} className={selectClass} value={filters.role} onChange={(event) => setFilters((value) => ({ ...value, role: event.target.value as typeof filters.role }))}>
            <option value="all">{text.allRoles}</option>
            {userRoles.map((item) => <option key={item} value={item}>{text.roleLabels[item]}</option>)}
          </select>
        </label>
        <label className={fieldLabelClass}>
          <span className={fieldLabelTextClass}>{text.statusFilter}</span>
          <select aria-label={text.statusFilter} className={selectClass} value={filters.status} onChange={(event) => setFilters((value) => ({ ...value, status: event.target.value as typeof filters.status }))}>
            <option value="all">{text.allStatuses}</option>
            {userStatuses.map((item) => <option key={item} value={item}>{text.statusLabels[item]}</option>)}
          </select>
        </label>
        <label className={fieldLabelClass}>
          <span className={fieldLabelTextClass}>{text.inviteFilter}</span>
          <select aria-label={text.inviteFilter} className={selectClass} value={filters.inviteState} onChange={(event) => setFilters((value) => ({ ...value, inviteState: event.target.value as typeof filters.inviteState }))}>
            <option value="all">{text.allInvites}</option>
            {userInviteStates.map((item) => <option key={item} value={item}>{text.inviteLabels[item]}</option>)}
          </select>
        </label>
        <label className={fieldLabelClass}>
          <span className={fieldLabelTextClass}>{text.createdFrom}</span>
          <Input type="date" aria-label={text.createdFrom} value={filters.createdFrom} onChange={(event) => setFilters((value) => ({ ...value, createdFrom: event.target.value }))} />
        </label>
        <label className={fieldLabelClass}>
          <span className={fieldLabelTextClass}>{text.createdTo}</span>
          <Input type="date" aria-label={text.createdTo} value={filters.createdTo} onChange={(event) => setFilters((value) => ({ ...value, createdTo: event.target.value }))} />
        </label>
        <label className={fieldLabelClass}>
          <span className={fieldLabelTextClass}>{text.sort}</span>
          <select aria-label={text.sort} className={selectClass} value={filters.sort} onChange={(event) => setFilters((value) => ({ ...value, sort: event.target.value as AdminUsersSort }))}>
            {userSorts.map((item) => <option key={item} value={item}>{text.sortLabels[item]}</option>)}
          </select>
        </label>
      </div>

      <AdminQueryState isLoading={listQuery.isLoading} isError={listQuery.isError} onRetry={() => listQuery.refetch()}>
        <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_26rem]">
          <div className="min-w-0 space-y-2">
            {!items.length ? <p className="rounded-lg border bg-card p-5 text-center text-sm text-muted-foreground">{text.noRows}</p> : null}
            {items.map((user) => {
              const id = getUserId(user);
              return (
                <article key={id} className="grid min-w-0 grid-cols-1 gap-3 rounded-lg border bg-card p-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="min-w-0 max-w-full truncate font-semibold">{user.name}</h2>
                      <Badge>{text.roleLabels[user.role]}</Badge>
                      <Badge intent={statusIntent(user.status)}>{text.statusLabels[user.status]}</Badge>
                    </div>
                    <p className="mt-1 break-all text-sm text-muted-foreground">{user.email}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{text.lastActive}: {formatDate(user.lastActiveAt, locale)} · {text.created}: {formatDate(user.createdAt, locale)}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center lg:justify-end">
                    <Button className="w-full sm:w-auto" size="sm" variant="outline" onClick={() => setSelectedUserId(id)}><Eye className="size-4" />{text.open}</Button>
                    <Button className="w-full sm:w-auto" size="sm" variant="outline" onClick={() => resend.mutate(id)} disabled={user.status !== "Invited"}><RefreshCcw className="size-4" />{text.resendInviteShort}</Button>
                    <Button className="w-full sm:w-auto" size="sm" variant="outline" onClick={() => status.mutate({ id, next: user.status === "Active" ? "Disabled" : "Active" })} disabled={user.status === "Deleted"}><ShieldOff className="size-4" />{user.status === "Active" ? text.disable : text.activate}</Button>
                    <Button size="icon" variant="ghost" onClick={() => remove.mutate(id)} disabled={user.status === "Deleted"} aria-label={text.deleteUser}><Trash2 className="size-4 text-destructive" /></Button>
                  </div>
                </article>
              );
            })}
          </div>

          <aside className="min-w-0 rounded-lg border bg-card p-[var(--card-padding)]">
            {!selectedUser ? <p className="text-sm text-muted-foreground">{text.emptyDetail}</p> : (
              <div className="space-y-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="min-w-0 max-w-full break-words text-lg font-semibold">{selectedUser.name}</h2>
                    <Badge>{text.roleLabels[selectedUser.role]}</Badge>
                    <Badge intent={statusIntent(selectedUser.status)}>{text.statusLabels[selectedUser.status]}</Badge>
                  </div>
                  <p className="mt-1 break-all text-sm text-muted-foreground">{selectedUser.email}</p>
                </div>

                <div className="grid min-w-0 grid-cols-1 gap-2 text-sm">
                  <label className={fieldLabelClass}><span className={fieldLabelTextClass}>{text.nameLabel}</span><Input aria-label={text.nameLabel} defaultValue={selectedUser.name} disabled={selectedDeleted} onBlur={(event) => selectedUserIdResolved && !selectedDeleted && updateUser.mutate({ id: selectedUserIdResolved, body: { name: event.target.value } })} /></label>
                  <label className={fieldLabelClass}><span className={fieldLabelTextClass}>{text.timezoneLabel}</span><Input aria-label={text.timezoneLabel} defaultValue={selectedUser.timezone ?? ""} disabled={selectedDeleted} onBlur={(event) => selectedUserIdResolved && !selectedDeleted && updateUser.mutate({ id: selectedUserIdResolved, body: { timezone: event.target.value } })} /></label>
                  <label className={fieldLabelClass}><span className={fieldLabelTextClass}>{text.localeLabel}</span><select aria-label={text.localeLabel} disabled={selectedDeleted} className={`${selectClass} disabled:opacity-55`} value={selectedUser.locale ?? "ru"} onChange={(event) => selectedUserIdResolved && updateUser.mutate({ id: selectedUserIdResolved, body: { locale: event.target.value as "ru" | "en" } })}><option value="ru">RU</option><option value="en">EN</option></select></label>
                  <label className={fieldLabelClass}><span className={fieldLabelTextClass}>{text.roleLabel}</span><select aria-label={text.roleLabel} disabled={selectedDeleted} className={`${selectClass} disabled:opacity-55`} value={selectedUser.role} onChange={(event) => selectedUserIdResolved && role.mutate({ id: selectedUserIdResolved, next: event.target.value as UserRole })}>{userRoles.map((item) => <option key={item} value={item}>{text.roleLabels[item]}</option>)}</select></label>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-md border p-2"><span className="text-muted-foreground">{text.profiles}</span><p className="text-base font-semibold">{selectedOverview ? selectedOverview.counts.profiles : overviewBatch.isLoading ? "…" : common.notTracked}</p></div>
                  <div className="rounded-md border p-2"><span className="text-muted-foreground">{text.aiUsage}</span><p className="text-base font-semibold">{selectedAiUsage ? selectedAiUsage.value : overviewBatch.isLoading ? "…" : common.notTracked}</p>{selectedAiUsage?.hint ? <p className="mt-1 text-[11px] text-muted-foreground">{selectedAiUsage.hint}</p> : null}</div>
                  <div className="rounded-md border p-2"><span className="text-muted-foreground">{text.telegram}</span><p className="text-base font-semibold">{selectedUser.telegram?.linked ? text.linked : text.notLinked}</p></div>
                  <div className="rounded-md border p-2"><span className="text-muted-foreground">{text.onboarding}</span><p className="text-base font-semibold">{selectedUser.onboarding?.minimumComplete ? text.complete : text.pending}</p></div>
                </div>

                {selectedUser.inviteDefaults ? (
                  <div className="rounded-md border p-3 text-xs">
                    <h3 className="text-sm font-medium">{text.initialPresets}</h3>
                    <div className="mt-2 grid gap-2 sm:grid-cols-3">
                      <div><span className="text-muted-foreground">{text.profile}</span><p className="font-semibold">{boolPreset(selectedUser.inviteDefaults.starterProfile, locale)}</p></div>
                      <div><span className="text-muted-foreground">{text.aiPrompt}</span><p className="font-semibold">{boolPreset(selectedUser.inviteDefaults.defaultPrompts, locale)}</p></div>
                      <div><span className="text-muted-foreground">{text.notifications}</span><p className="font-semibold">{boolPreset(selectedUser.inviteDefaults.notifications, locale)}</p></div>
                    </div>
                  </div>
                ) : null}

                <div>
                  <h3 className="text-sm font-medium">{text.lifecycle}</h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedStatusActions.map((next) => <Button key={next} size="sm" variant="outline" onClick={() => selectedUserIdResolved && status.mutate({ id: selectedUserIdResolved, next })} disabled={selectedUser.status === "Deleted" && next !== "Deleted"}>{next === "Active" ? <UserCheck className="size-4" /> : next === "Locked" ? <Lock className="size-4" /> : <ShieldCheck className="size-4" />}{text.statusLabels[next]}</Button>)}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium">{text.safetyActions}</h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => selectedUserIdResolved && resend.mutate(selectedUserIdResolved)} disabled={selectedUser.status !== "Invited"} loading={resend.isPending}><RefreshCcw className="size-4" />{text.resendInvite}</Button>
                    <Button size="sm" variant="outline" onClick={() => selectedUserIdResolved && resetPassword.mutate(selectedUserIdResolved)} disabled={selectedUser.status !== "Active"} loading={resetPassword.isPending}><KeyRound className="size-4" />{text.resetPassword}</Button>
                    <Button size="sm" variant="outline" onClick={() => selectedUserIdResolved && revokeSessions.mutate(selectedUserIdResolved)} disabled={selectedDeleted} loading={revokeSessions.isPending}><UserCog className="size-4" />{text.revokeSessions}</Button>
                    <Button size="sm" variant="danger" onClick={() => selectedUserIdResolved && remove.mutate(selectedUserIdResolved)} disabled={selectedUser.status === "Deleted"} loading={remove.isPending}><Trash2 className="size-4" />{text.delete}</Button>
                  </div>
                </div>

                {notice ? <div aria-live="polite" className={`rounded-md border p-2 text-xs ${notice.intent === "danger" ? "border-destructive/40 bg-destructive/10 text-destructive" : notice.intent === "warning" ? "border-warning/40 bg-warning/10 text-warning" : "border-success/40 bg-success/10 text-success"}`}>{notice.message}</div> : null}
              </div>
            )}
          </aside>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">{text.page} {cursors.length}</p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={cursors.length === 1 || listQuery.isFetching} onClick={() => setCursors((value) => value.slice(0, -1))}>{text.previous}</Button>
            <Button size="sm" variant="outline" disabled={!listQuery.data?.nextCursor || listQuery.isFetching} onClick={() => {
              const nextCursor = listQuery.data?.nextCursor ?? null;
              if (nextCursor) setCursors((value) => [...value, nextCursor]);
            }}>{text.next}</Button>
          </div>
        </div>

        <div className="mt-4 min-w-0">
          <AdminUserDataPanel key={selectedUserIdResolved ?? "empty"} userId={selectedUserIdResolved} userLabel={selectedUser ? `${selectedUser.name} · ${selectedUser.email}` : undefined} initialOverview={selectedOverview} />
        </div>
      </AdminQueryState>
    </AdminFrame>
  );
}
