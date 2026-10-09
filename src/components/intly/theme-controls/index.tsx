"use client";

import { useState } from "react";
import { Gauge, Layers3, MonitorCog, Moon, SunMedium } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppearancePreferences } from "@/hooks/use-appearance-preferences";
import { themePacks } from "@/hooks/use-ui-preferences";
import { useAuth } from "@/features/auth";
import { cn } from "@/lib/utils";

const labels = {
  ru: {
    displaySettings: "Настройки отображения",
    colorTheme: "Цветовая тема",
    openThemeMenu: "Открыть меню темы",
    theme: "Тема",
    lightMode: "Светлый режим",
    darkMode: "Тёмный режим",
    systemMode: "Системная тема",
    toggleDensity: "Переключить плотность",
    compactDensity: "Компактная плотность",
    comfortableDensity: "Свободная плотность"
  },
  en: {
    displaySettings: "Display settings",
    colorTheme: "Color theme",
    openThemeMenu: "Open theme menu",
    theme: "Theme",
    lightMode: "Light mode",
    darkMode: "Dark mode",
    systemMode: "System theme",
    toggleDensity: "Toggle density",
    compactDensity: "Compact density",
    comfortableDensity: "Comfortable density"
  }
} as const;

export function ThemeControls() {
  const { themePack, mode, density, updateAppearance } = useAppearancePreferences();
  const { user } = useAuth();
  const locale = user?.settings.locale === "en" ? "en" : "ru";
  const text = labels[locale];
  const [menuOpen, setMenuOpen] = useState(false);
  const activePack = themePacks.find((pack) => pack.id === themePack) ?? themePacks[0];
  const saveAppearance = (patch: Parameters<typeof updateAppearance>[0]) => {
    void updateAppearance(patch).catch(() => undefined);
  };

  return (
    <div className="relative flex items-center gap-1" aria-label={text.displaySettings}>
      <div className="hidden items-center gap-1 rounded-md border bg-card p-1 2xl:flex" aria-label={text.colorTheme}>
        {themePacks.map((pack) => <ThemePackButton key={pack.id} pack={pack} selected={themePack === pack.id} onSelect={() => saveAppearance({ themePack: pack.id })} themeLabel={text.theme} />)}
      </div>
      <Button size="icon" variant={menuOpen ? "secondary" : "ghost"} onClick={() => setMenuOpen((open) => !open)} aria-label={text.openThemeMenu} aria-haspopup="menu" aria-expanded={menuOpen} aria-controls="theme-pack-menu" className="2xl:hidden" title={`${text.theme}: ${activePack.label}`}>
        <Layers3 className="size-4" />
      </Button>
      {menuOpen ? (
        <div id="theme-pack-menu" className="absolute right-0 top-11 z-50 w-56 rounded-lg border bg-card p-2 shadow-floating 2xl:hidden" role="menu">
          <p className="px-2 py-1 text-xs font-semibold uppercase text-muted-foreground">{text.colorTheme}</p>
          <div className="grid gap-1">
            {themePacks.map((pack) => <ThemePackButton key={pack.id} pack={pack} selected={themePack === pack.id} onSelect={() => { saveAppearance({ themePack: pack.id }); setMenuOpen(false); }} themeLabel={text.theme} menu />)}
          </div>
        </div>
      ) : null}
      <Button size="icon" variant={mode === "light" ? "secondary" : "ghost"} onClick={() => saveAppearance({ mode: "light" })} aria-label={text.lightMode}>
        <SunMedium className="size-4" />
      </Button>
      <Button size="icon" variant={mode === "dark" ? "secondary" : "ghost"} onClick={() => saveAppearance({ mode: "dark" })} aria-label={text.darkMode}>
        <Moon className="size-4" />
      </Button>
      <Button size="icon" variant={mode === "system" ? "secondary" : "ghost"} onClick={() => saveAppearance({ mode: "system" })} aria-label={text.systemMode}>
        <MonitorCog className="size-4" />
      </Button>
      <Button size="icon" variant={density === "compact" ? "secondary" : "ghost"} onClick={() => saveAppearance({ density: density === "compact" ? "comfortable" : "compact" })} aria-label={text.toggleDensity} title={density === "compact" ? text.compactDensity : text.comfortableDensity}>
        <Gauge className="size-4" />
      </Button>
    </div>
  );
}

function ThemePackButton({ pack, selected, onSelect, themeLabel, menu }: { pack: typeof themePacks[number]; selected: boolean; onSelect: () => void; themeLabel: string; menu?: boolean }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn("flex items-center gap-1.5 rounded text-xs transition", menu ? "h-9 px-2" : "h-7 px-1.5", selected ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:bg-muted")}
      aria-label={`${themeLabel} ${pack.label}`}
      aria-pressed={menu ? undefined : selected}
      aria-checked={menu ? selected : undefined}
      title={`${themeLabel} ${pack.label}`}
      role={menu ? "menuitemradio" : undefined}
    >
      <span className="grid size-4 grid-cols-2 overflow-hidden rounded-full border" aria-hidden>
        <span style={{ background: pack.swatch }} />
        <span style={{ background: pack.accent }} />
        <span className="bg-card" />
        <span className="bg-foreground" />
      </span>
      <span>{pack.label}</span>
    </button>
  );
}
