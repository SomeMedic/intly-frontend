import type { Watchlist } from "@/types";

export type WatchlistDraft = {
  name: string; query: string; remoteType: string; type: string; companies: string; keywords: string;
  matchMin: string; aiMin: string; autoAi: boolean; dailyMax: string; rerun: boolean;
  inApp: boolean; email: boolean; telegram: boolean; mode: string; active: boolean;
};

export function watchlistDraft(item?: Watchlist): WatchlistDraft {
  const filters = item?.filters ?? {};
  const exclusions = item?.exclusions ?? {};
  const policy = item?.notificationPolicy ?? {};
  const text = (value: unknown) => typeof value === "string" ? value : "";
  const list = (value: unknown) => Array.isArray(value) ? value.join(", ") : "";
  return {
    name: item?.name ?? "", query: text(filters.query), remoteType: text(filters.remoteType), type: text(filters.type),
    companies: list(exclusions.companies), keywords: list(exclusions.keywords),
    matchMin: String(item ? item.matchMin ?? "" : 75), aiMin: String(item?.aiMin ?? ""),
    autoAi: Boolean(item?.autoAiRules?.enabled), dailyMax: String(item?.autoAiRules?.dailyMax ?? ""),
    rerun: item?.autoAiRules?.rerunOnMaterialChange ?? false,
    inApp: policy.inApp !== false, email: policy.email === true, telegram: policy.telegram === true,
    mode: text(policy.mode) || "instant", active: item?.active ?? true
  };
}

/** Preserve filter and routing options authored through other screens. */
export function watchlistPatch(draft: WatchlistDraft, item?: Watchlist): Partial<Watchlist> {
  const filters = { ...item?.filters };
  for (const key of ["query", "remoteType", "type"] as const) {
    if (draft[key].trim()) filters[key] = draft[key].trim();
    else delete filters[key];
  }
  const split = (value: string) => [...new Set(value.split(",").map((part) => part.trim()).filter(Boolean))];
  const exclusions = { ...item?.exclusions, companies: split(draft.companies), keywords: split(draft.keywords) };
  const autoAiRules = { ...item?.autoAiRules, enabled: draft.autoAi, rerunOnMaterialChange: draft.rerun };
  if (draft.dailyMax.trim()) autoAiRules.dailyMax = Number(draft.dailyMax);
  else if (item?.autoAiRules?.dailyMax != null) autoAiRules.dailyMax = null;
  else delete autoAiRules.dailyMax;
  return {
    name: draft.name.trim(), filters, exclusions,
    matchMin: draft.matchMin.trim() ? Number(draft.matchMin) : null,
    aiMin: draft.aiMin.trim() ? Number(draft.aiMin) : null,
    autoAiRules,
    notificationPolicy: { ...item?.notificationPolicy, inApp: draft.inApp, email: draft.email, telegram: draft.telegram, mode: draft.mode },
    active: draft.active
  };
}
