"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Plus, UserRound } from "lucide-react";
import type { ProfileSummary } from "@/types";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth";
import { cn } from "@/lib/utils";

const labels = {
  ru: {
    choose: "Выбрать профиль",
    empty: "Нет профиля",
    menu: "Профили",
    active: "Активный",
    create: "Создать профиль",
    openMenu: "Открыть выбор профиля"
  },
  en: {
    choose: "Choose profile",
    empty: "No profile",
    menu: "Profiles",
    active: "Active",
    create: "Create profile",
    openMenu: "Open profile selector"
  }
} as const;

export function ProfileSelector({ profile, profiles }: { profile: ProfileSummary | null; profiles: ProfileSummary[] }) {
  const { user } = useAuth();
  const locale = user?.settings.locale === "en" ? "en" : "ru";
  const text = labels[locale];
  const [open, setOpen] = useState(false);
  const currentLabel = profile ? `${profile.name} · ${profile.targetRole}` : profiles.length ? text.choose : text.empty;

  return (
    <div className="relative min-w-0">
      <Button
        variant="outline"
        className="w-full max-w-[18rem] justify-between"
        aria-label={text.openMenu}
        aria-expanded={open}
        aria-controls="profile-selector-menu"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="flex min-w-0 items-center gap-2">
          <UserRound className="size-4 shrink-0 text-primary" />
          <span className="min-w-0 truncate">{currentLabel}</span>
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </Button>
      {open ? (
        <div id="profile-selector-menu" className="absolute right-0 top-11 z-50 w-[min(22rem,calc(100vw-1rem))] rounded-lg border bg-card p-2 shadow-floating">
          <p className="px-2 py-1 text-xs font-semibold uppercase text-muted-foreground">{text.menu}</p>
          <div className="mt-1 grid max-h-72 gap-1 overflow-y-auto">
            {profiles.map((item) => {
              const active = profile?.id === item.id;
              return (
                <Link
                  key={item.id}
                  href={`/profiles/${item.id}`}
                  onClick={() => setOpen(false)}
                  className={cn("rounded-md px-2 py-2 text-sm transition hover:bg-muted", active && "border border-primary/35 bg-primary/10")}
                >
                  <span className="block truncate font-medium">{item.name}</span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">{item.targetRole || item.type}</span>
                  {active ? <span className="mt-1 inline-flex rounded-sm bg-success/10 px-1.5 py-0.5 text-[0.68rem] font-medium text-success">{text.active}</span> : null}
                </Link>
              );
            })}
            {!profiles.length ? <p className="px-2 py-2 text-sm text-muted-foreground">{text.empty}</p> : null}
          </div>
          <div className="mt-2 border-t pt-2">
            <Link
              href="/profiles?create=true"
              onClick={() => setOpen(false)}
              className="flex h-9 items-center gap-2 rounded-md px-2 text-sm font-medium text-primary transition hover:bg-primary/10"
            >
              <Plus className="size-4" />
              <span>{text.create}</span>
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
