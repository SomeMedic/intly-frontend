import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRelativeTime(iso: string, locale = "ru") {
  const date = new Date(iso);
  const diffMs = date.getTime() - Date.now();
  const abs = Math.abs(diffMs);
  const divisions: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 1000 * 60 * 60 * 24 * 365],
    ["month", 1000 * 60 * 60 * 24 * 30],
    ["day", 1000 * 60 * 60 * 24],
    ["hour", 1000 * 60 * 60],
    ["minute", 1000 * 60]
  ];
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const match = divisions.find(([, ms]) => abs >= ms);

  if (!match) {
    return formatter.format(0, "minute");
  }

  const [unit, ms] = match;
  return formatter.format(Math.round(diffMs / ms), unit);
}

export function exhaustive(value: never): never {
  throw new Error(`Unhandled value: ${String(value)}`);
}
