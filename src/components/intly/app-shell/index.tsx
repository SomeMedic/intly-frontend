"use client";

import { useState, type ComponentType, type ReactNode } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import {
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Database,
  LayoutDashboard,
  LineChart,
  ListChecks,
  LogOut,
  Menu,
  Plus,
  Settings,
  Shield,
  UserRound,
  Workflow
} from "lucide-react";
import type { CurrentUser, ProfileSummary, SystemHealth } from "@/types";
import { Button } from "@/components/ui/button";
import { GlobalSearch } from "@/components/intly/global-search";
import { HealthIndicator } from "@/components/intly/health-indicator";
import { ProfileSelector } from "@/components/intly/profile-selector";
import { ThemeControls } from "@/components/intly/theme-controls";
import { BrandMark } from "@/components/intly/brand";
import { useAuth } from "@/features/auth";
import { dashboardApi } from "@/features/dashboard";
import { useActiveProfileStore } from "@/hooks/use-active-profile";
import { useUiPreferences } from "@/hooks/use-ui-preferences";
import { queryKeys } from "@/services/api";
import { cn } from "@/lib/utils";

type NavKey =
  | "dashboard"
  | "opportunities"
  | "watchlists"
  | "savedViews"
  | "search"
  | "pipelines"
  | "tasks"
  | "calendar"
  | "analyticsPersonal"
  | "analyticsMarket"
  | "profiles"
  | "resumes"
  | "knowledge"
  | "notifications"
  | "settings"
  | "admin";

type NavGroupKey = "discovery" | "work" | "analytics" | "profile";

type NavItem = {
  href: string;
  labelKey: NavKey;
  icon: ComponentType<{ className?: string }>;
  adminOnly?: boolean;
};

type NavGroup = { labelKey: NavGroupKey; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    labelKey: "discovery",
    items: [
      { href: "/dashboard", labelKey: "dashboard", icon: LayoutDashboard },
      { href: "/opportunities", labelKey: "opportunities", icon: BriefcaseBusiness },
      { href: "/watchlists", labelKey: "watchlists", icon: ListChecks },
      { href: "/saved-views", labelKey: "savedViews", icon: Database },
      { href: "/search", labelKey: "search", icon: Menu }
    ]
  },
  {
    labelKey: "work",
    items: [
      { href: "/pipelines", labelKey: "pipelines", icon: Workflow },
      { href: "/tasks", labelKey: "tasks", icon: ListChecks },
      { href: "/calendar", labelKey: "calendar", icon: CalendarDays }
    ]
  },
  {
    labelKey: "analytics",
    items: [
      { href: "/analytics/personal", labelKey: "analyticsPersonal", icon: LineChart },
      { href: "/analytics/market", labelKey: "analyticsMarket", icon: LineChart }
    ]
  },
  {
    labelKey: "profile",
    items: [
      { href: "/profiles", labelKey: "profiles", icon: UserRound },
      { href: "/resumes", labelKey: "resumes", icon: Database },
      { href: "/knowledge", labelKey: "knowledge", icon: Database },
      { href: "/notifications", labelKey: "notifications", icon: Bell },
      { href: "/settings", labelKey: "settings", icon: Settings },
      { href: "/admin", labelKey: "admin", icon: Shield, adminOnly: true }
    ]
  }
];

const mobileNav = [
  { href: "/dashboard", labelKey: "dashboard", icon: LayoutDashboard },
  { href: "/opportunities", labelKey: "opportunities", icon: BriefcaseBusiness },
  { href: "/tasks", labelKey: "tasks", icon: ListChecks },
  { href: "/notifications", labelKey: "notifications", icon: Bell },
  { labelKey: "more", icon: Menu, more: true }
] satisfies Array<
  NavItem | { labelKey: "more"; icon: ComponentType<{ className?: string }>; more: true }
>;

const shellCopy = {
  ru: {
    groups: {
      discovery: "Поиск",
      work: "Работа",
      analytics: "Аналитика",
      profile: "Материалы"
    } satisfies Record<NavGroupKey, string>,
    nav: {
      dashboard: "Обзор",
      opportunities: "Возможности",
      watchlists: "Автопоиск",
      savedViews: "Сохранённые поиски",
      search: "Поиск",
      pipelines: "Отклики",
      tasks: "Задачи",
      calendar: "Календарь",
      analyticsPersonal: "Личная",
      analyticsMarket: "Рынок",
      profiles: "Профили",
      resumes: "Резюме",
      knowledge: "База знаний",
      notifications: "Уведомления",
      settings: "Настройки",
      admin: "Администрирование"
    } satisfies Record<NavKey, string>,
    mobile: {
      opportunities: "Лента",
      notifications: "Входящие",
      more: "Ещё"
    },
    add: "Новая возможность",
    notifications: "Уведомления",
    unread: "Непрочитанных",
    collapseMenu: "Свернуть меню",
    expandMenu: "Развернуть меню",
    fullMenu: "Разделы",
    fullMenuDescription: "Навигация, профиль и внешний вид",
    close: "Закрыть",
    appearance: "Внешний вид",
    profileAttention: "Профиль требует внимания",
    healthUnknown: "Статус системы недоступен",
    account: {
      open: "Открыть меню аккаунта",
      fallback: "Пользователь",
      settings: "Настройки",
      signOut: "Выйти"
    }
  },
  en: {
    groups: {
      discovery: "Search",
      work: "Work",
      analytics: "Analytics",
      profile: "Materials"
    } satisfies Record<NavGroupKey, string>,
    nav: {
      dashboard: "Overview",
      opportunities: "Opportunities",
      watchlists: "Autosearch",
      savedViews: "Saved searches",
      search: "Search",
      pipelines: "Responses",
      tasks: "Tasks",
      calendar: "Calendar",
      analyticsPersonal: "Personal",
      analyticsMarket: "Market",
      profiles: "Profiles",
      resumes: "Resumes",
      knowledge: "Knowledge",
      notifications: "Notifications",
      settings: "Settings",
      admin: "Administration"
    } satisfies Record<NavKey, string>,
    mobile: {
      opportunities: "Browse",
      notifications: "Inbox",
      more: "More"
    },
    add: "New opportunity",
    notifications: "Notifications",
    unread: "Unread",
    collapseMenu: "Collapse menu",
    expandMenu: "Expand menu",
    fullMenu: "Sections",
    fullMenuDescription: "Navigation, profile, and appearance",
    close: "Close",
    appearance: "Appearance",
    profileAttention: "Profile needs attention",
    healthUnknown: "System status unavailable",
    account: {
      open: "Open account menu",
      fallback: "User",
      settings: "Settings",
      signOut: "Sign out"
    }
  }
} as const;

export function AppShell({
  children,
  profiles,
  activeProfile,
  health,
  unreadNotifications
}: {
  children: ReactNode;
  profiles?: ProfileSummary[];
  activeProfile?: ProfileSummary | null;
  health?: SystemHealth;
  unreadNotifications?: number;
}) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const locale = user?.settings.locale === "en" ? "en" : "ru";
  const text = shellCopy[locale];
  const activeProfileId = useActiveProfileStore((state) => state.activeProfileId);
  const dashboard = useQuery({
    queryKey: queryKeys.dashboard.summary(activeProfileId),
    queryFn: () => dashboardApi.summary(activeProfileId),
    enabled: !!user,
    staleTime: 30_000
  });
  const shellProfiles = profiles ?? dashboard.data?.profiles ?? [];
  const shellActiveProfile = activeProfile ?? dashboard.data?.activeProfile ?? null;
  const shellHealth =
    health ??
    dashboard.data?.systemHealth ??
    ({
      status: "unknown",
      label: text.healthUnknown,
      activeSources: 0,
      failedSources: 0
    } satisfies SystemHealth);
  const shellUnreadNotifications = unreadNotifications ?? dashboard.data?.notificationsUnread ?? 0;
  const notificationsLabel =
    shellUnreadNotifications > 0
      ? `${text.notifications}, ${text.unread.toLowerCase()}: ${shellUnreadNotifications.toLocaleString(locale === "ru" ? "ru-RU" : "en-US")}`
      : text.notifications;
  const { sidebarCollapsed, setSidebarCollapsed } = useUiPreferences();

  return (
    <div className="flex min-h-screen overflow-x-clip bg-background text-foreground">
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 border-r bg-[hsl(var(--sidebar))] backdrop-blur-xl xl:flex xl:flex-col",
          sidebarCollapsed ? "w-[4.5rem]" : "w-[14.5rem]"
        )}
      >
        <div className="flex h-14 items-center justify-between border-b px-3">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-2 font-semibold">
            <BrandMark wordmark={!sidebarCollapsed} />
          </Link>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            aria-label={sidebarCollapsed ? text.expandMenu : text.collapseMenu}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="size-4" />
            ) : (
              <ChevronLeft className="size-4" />
            )}
          </Button>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          {navGroups.map((group) => (
            <div key={group.labelKey} className="mb-4">
              {!sidebarCollapsed ? (
                <p className="mb-1.5 px-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  {text.groups[group.labelKey]}
                </p>
              ) : null}
              <div className="space-y-1">
                {group.items
                  .filter((item) => !item.adminOnly || user?.role === "Admin")
                  .map((item) => {
                    const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex h-8 items-center gap-2 rounded-md px-2 text-[0.8125rem] font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground",
                          active &&
                            "bg-primary/10 text-primary shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.28)]",
                          sidebarCollapsed && "justify-center"
                        )}
                      >
                        <Icon className="size-4 shrink-0" />
                        {!sidebarCollapsed ? <span>{text.nav[item.labelKey]}</span> : null}
                      </Link>
                    );
                  })}
              </div>
            </div>
          ))}
        </nav>
        <div className="space-y-2 border-t p-3">
          {shellActiveProfile?.needsAttention?.length && !sidebarCollapsed ? (
            <div className="rounded-md border border-warning/30 bg-warning/10 p-3 text-xs">
              <p className="font-semibold text-warning">{text.profileAttention}</p>
              <p className="mt-1 text-muted-foreground">
                {shellActiveProfile.needsAttention[0]?.label}
              </p>
            </div>
          ) : null}
          {!sidebarCollapsed ? <HealthIndicator health={shellHealth} compact /> : null}
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-40 flex h-14 max-w-full items-center gap-2 overflow-visible border-b bg-background/88 px-2 backdrop-blur-xl sm:gap-3 md:px-5">
          <GlobalSearch />
          <div className="hidden min-w-0 max-w-72 flex-1 lg:block 2xl:flex-none">
            <ProfileSelector profile={shellActiveProfile} profiles={shellProfiles} />
          </div>
          <Button variant="outline" className="shrink-0 px-2 sm:px-3" asChild>
            <Link href="/opportunities?add=true">
              <Plus className="size-4" />
              <span className="hidden sm:inline">{text.add}</span>
            </Link>
          </Button>
          <Button
            size="icon"
            variant="outline"
            aria-label={notificationsLabel}
            className="relative shrink-0"
            asChild
          >
            <Link href="/notifications" title={notificationsLabel}>
              <Bell className="size-4" />
              {shellUnreadNotifications > 0 ? (
                <span
                  aria-hidden="true"
                  className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[0.62rem] tabular-nums text-destructive-foreground"
                >
                  {shellUnreadNotifications > 99 ? "99+" : shellUnreadNotifications}
                </span>
              ) : null}
            </Link>
          </Button>
          <div className="hidden shrink-0 md:block">
            <ThemeControls />
          </div>
          <AccountMenu
            user={user}
            text={text.account}
            open={accountMenuOpen}
            onOpenChange={setAccountMenuOpen}
            onLogout={logout}
          />
        </header>
        <main className="px-3 pb-24 pt-5 md:px-6 xl:pb-5">{children}</main>
      </div>
      {mobileMenuOpen ? (
        <div
          id="mobile-full-menu"
          className="fixed inset-x-2 bottom-16 z-50 max-h-[70vh] overflow-y-auto rounded-lg border bg-card/98 p-3 shadow-floating backdrop-blur xl:hidden"
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">{text.fullMenu}</p>
              <p className="text-xs text-muted-foreground">{text.fullMenuDescription}</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setMobileMenuOpen(false)}>
              {text.close}
            </Button>
          </div>
          <div className="md:hidden">
            <ProfileSelector profile={shellActiveProfile} profiles={shellProfiles} />
          </div>
          <section className="mt-3 rounded-md border bg-background/70 p-2 md:hidden">
            <p className="px-2 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {text.appearance}
            </p>
            <div className="px-1 py-2">
              <ThemeControls />
            </div>
          </section>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {navGroups.map((group) => {
              const visibleItems = group.items.filter(
                (item) => !item.adminOnly || user?.role === "Admin"
              );
              if (!visibleItems.length) return null;
              return (
                <section key={group.labelKey} className="rounded-md border bg-background/70 p-2">
                  <p className="px-2 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    {text.groups[group.labelKey]}
                  </p>
                  <div className="grid gap-1">
                    {visibleItems.map((item) => {
                      const Icon = item.icon;
                      const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={cn(
                            "flex items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground",
                            active &&
                              "bg-primary/10 text-primary shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.28)]"
                          )}
                        >
                          <Icon className="size-4" />
                          <span>{text.nav[item.labelKey]}</span>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
          <div className="mt-3">
            <HealthIndicator health={shellHealth} compact />
          </div>
        </div>
      ) : null}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t bg-card/95 px-1 py-1 backdrop-blur-xl xl:hidden">
        {mobileNav.map((item) => {
          const Icon = item.icon;
          if ("more" in item) {
            return (
              <button
                key={item.labelKey}
                type="button"
                onClick={() => setMobileMenuOpen((open) => !open)}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 rounded-md px-1 py-2 text-xs font-medium text-muted-foreground",
                  mobileMenuOpen && "bg-primary/10 text-primary"
                )}
                aria-expanded={mobileMenuOpen}
                aria-controls="mobile-full-menu"
              >
                <Icon className="size-4" />
                <span>{text.mobile.more}</span>
              </button>
            );
          }
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const label =
            item.labelKey === "opportunities"
              ? text.mobile.opportunities
              : item.labelKey === "notifications"
                ? text.mobile.notifications
                : text.nav[item.labelKey];
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              aria-label={text.nav[item.labelKey]}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 rounded-md px-1 py-2 text-xs font-medium text-muted-foreground",
                active && "bg-primary/10 text-primary"
              )}
            >
              <Icon className="size-4" />
              <span className="max-w-full truncate">{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function AccountMenu({
  user,
  text,
  open,
  onOpenChange,
  onLogout
}: {
  user?: CurrentUser | null;
  text: (typeof shellCopy)["ru"]["account"] | (typeof shellCopy)["en"]["account"];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLogout: () => void;
}) {
  const name = user?.name?.trim() || text.fallback;
  const initial = name.slice(0, 1).toLocaleUpperCase();

  return (
    <div className="relative shrink-0">
      <Button
        variant={open ? "secondary" : "ghost"}
        className="max-w-[10rem] px-2 sm:max-w-[14rem] sm:px-3"
        aria-label={text.open}
        aria-expanded={open}
        aria-controls="account-menu"
        onClick={() => onOpenChange(!open)}
      >
        <span
          className="grid size-7 shrink-0 place-items-center rounded-full border bg-muted text-xs font-semibold text-muted-foreground"
          aria-hidden
        >
          {initial}
        </span>
        <span className="hidden min-w-0 truncate sm:inline">{name}</span>
      </Button>
      {open ? (
        <div
          id="account-menu"
          className="absolute right-0 top-11 z-50 w-[min(18rem,calc(100vw-1rem))] rounded-lg border bg-card p-2 shadow-floating"
          role="menu"
        >
          <div className="border-b px-2 pb-2 pt-1">
            <p className="truncate text-sm font-semibold">{name}</p>
            {user?.email ? (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{user.email}</p>
            ) : null}
          </div>
          <div className="mt-2 grid gap-1">
            <Link
              href="/settings"
              onClick={() => onOpenChange(false)}
              className="flex h-9 items-center gap-2 rounded-md px-2 text-sm transition hover:bg-muted"
              role="menuitem"
            >
              <Settings className="size-4" />
              <span>{text.settings}</span>
            </Link>
            <button
              type="button"
              onClick={() => {
                onOpenChange(false);
                onLogout();
              }}
              className="flex h-9 items-center gap-2 rounded-md px-2 text-left text-sm text-destructive transition hover:bg-destructive/10"
              role="menuitem"
            >
              <LogOut className="size-4" />
              <span>{text.signOut}</span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
