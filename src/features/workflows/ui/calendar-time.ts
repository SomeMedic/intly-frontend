import { localeTags, type WorkflowLocale } from "./workflow-labels";

const fallbackTimeZone = "Europe/Volgograd";

export function resolveCalendarTimeZone(userTimeZone?: string | null, browserTimeZone?: string | null) {
  return userTimeZone || browserTimeZone || fallbackTimeZone;
}

export function toDateInputInTimeZone(value: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(value);
}

export function formatDateTimeInTimeZone(value?: string | Date | null, timeZone = fallbackTimeZone, locale: WorkflowLocale = "ru") {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (!Number.isFinite(+date)) return "";
  return new Intl.DateTimeFormat(localeTags[locale], {
    timeZone,
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}

export function isoToZonedDateTimeLocal(value?: string | Date | null, timeZone = fallbackTimeZone) {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (!Number.isFinite(+date)) return "";
  const parts = dateTimeParts(date, timeZone);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function isoToZonedCalendarDateTime(value?: string | Date | null, timeZone = fallbackTimeZone) {
  if (!value) return undefined;
  const local = isoToZonedDateTimeLocal(value, timeZone);
  return local ? `${local}:00` : undefined;
}

export function zonedDateTimeLocalToIso(value?: string, timeZone = fallbackTimeZone) {
  if (!value) return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!match) return undefined;
  const [, year, month, day, hour, minute] = match.map(Number);
  const wallUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
  let instant = wallUtc - timeZoneOffsetMs(new Date(wallUtc), timeZone);
  instant = wallUtc - timeZoneOffsetMs(new Date(instant), timeZone);
  return new Date(instant).toISOString();
}

export function toDateTimeLocalInput(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  if (!Number.isFinite(+date)) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function dateTimeParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const map = new Map(parts.map((part) => [part.type, part.value]));
  return {
    year: map.get("year") ?? "1970",
    month: map.get("month") ?? "01",
    day: map.get("day") ?? "01",
    hour: map.get("hour") ?? "00",
    minute: map.get("minute") ?? "00",
    second: map.get("second") ?? "00"
  };
}

function timeZoneOffsetMs(date: Date, timeZone: string) {
  const parts = dateTimeParts(date, timeZone);
  const asUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second));
  return asUtc - date.getTime();
}
