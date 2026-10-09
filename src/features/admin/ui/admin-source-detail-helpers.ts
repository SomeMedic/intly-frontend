import type { AdminSource, AdminSourceRun } from "@/types";
import type { AdminLocale } from "./admin-locale";

export function sourceCredentialsState(source: AdminSource & { credentialsRequired?: boolean }, locale: AdminLocale) {
  if (source.credentialsRequired === false) return locale === "en" ? "Public / not required" : "Публичный / не требуются";
  if (source.credentialsConfigured) return locale === "en" ? "Configured" : "Настроены";
  return locale === "en" ? "Missing" : "Отсутствуют";
}


export function localDateTimeInputToIso(value: string) {
  if (!value.trim()) return undefined;
  const date = new Date(value);
  return Number.isFinite(+date) ? date.toISOString() : undefined;
}

export function sourceCollectionSummary(run: AdminSourceRun | null | undefined, locale: AdminLocale) {
  if (!run) return undefined;
  const checkpoint = run.checkpointAfter ?? {};
  const active = ["Running", "Queued"].includes(run.status);
  const registrationRequired = checkpoint.fullCatalogRequiresCredentials === true
    || ["native-public-registration-boundary", "native-anonymous-pagination-boundary"].includes(String(checkpoint.terminalReason));
  const incomplete = checkpoint.incomplete === true || checkpoint.catalogComplete === false || checkpoint.hasMore === true || run.status !== "Succeeded";
  const title = active
    ? locale === "en" ? "Collection in progress" : "Сбор продолжается"
    : registrationRequired
      ? locale === "en" ? "An account is needed for the full catalog" : "Для полного каталога нужен аккаунт"
      : incomplete
        ? locale === "en" ? "Collection is incomplete" : "Сбор неполный"
        : locale === "en" ? "Available collection completed" : "Сбор доступных данных завершён";
  const description = registrationRequired
    ? locale === "en" ? "Public records are saved. The platform limits anonymous access; collection through an account still needs to be connected and verified." : "Публичные записи сохранены. Площадка ограничивает доступ без авторизации; сбор через аккаунт ещё нужно подключить и проверить."
    : incomplete
      ? locale === "en" ? "Saved records remain available. Coverage of the full catalog for the selected period is not confirmed." : "Сохранённые записи доступны. Полнота каталога за выбранный период пока не подтверждена."
      : locale === "en" ? "This result covers the available source or configured catalog. It does not establish coverage of the entire platform." : "Результат относится к доступному источнику или настроенному каталогу. Покрытие всей площадки отдельно не подтверждено.";
  const processed = run.stats?.upserted;
  return { title, description, active, incomplete, runId: run.id ?? run._id, processed: typeof processed === "number" && Number.isFinite(processed) && processed >= 0 ? processed : undefined, windowSince: checkpoint.windowSince ?? run.requestMetadata?.backfillSince, windowUntil: checkpoint.windowUntil ?? checkpoint.windowTo };
}
