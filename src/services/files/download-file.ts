import { clickDownloadLink } from "../../lib/download";

type StoredFileDownloadGrant = { url: string; expiresAt?: string };

type ResolveOptions = {
  apiBaseUrl?: string;
  windowOrigin?: string;
};

const DEFAULT_API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";

function currentWindowOrigin() {
  return typeof window === "undefined" ? "http://localhost" : window.location.origin;
}

function apiBaseUrl(input = DEFAULT_API_BASE_URL, windowOrigin = currentWindowOrigin()) {
  const base = new URL(input, windowOrigin);
  if (!/^https?:$/.test(base.protocol) || base.username || base.password || base.hash) throw new Error("Invalid API base URL");
  return base;
}

function cleanBasePath(pathname: string) {
  const trimmed = pathname.replace(/\/+$/, "");
  return trimmed === "/" ? "" : trimmed;
}

export function resolveStoredFileDownloadUrl(grantUrl: string, fileId: string, options: ResolveOptions = {}) {
  const base = apiBaseUrl(options.apiBaseUrl, options.windowOrigin);
  const href = new URL(grantUrl, base);
  if (!/^https?:$/.test(href.protocol)) throw new Error("Invalid file download URL");
  if (href.username || href.password) throw new Error("Invalid file download URL");
  if (href.origin !== base.origin) throw new Error("Invalid file download URL");
  if (href.hash) throw new Error("Invalid file download URL");

  const expectedPrefix = `${cleanBasePath(base.pathname)}/files/`;
  if (!href.pathname.startsWith(expectedPrefix)) throw new Error("Invalid file download URL");
  const suffix = href.pathname.slice(expectedPrefix.length);
  const parts = suffix.split("/");
  if (parts.length !== 2 || parts[1] !== "download") throw new Error("Invalid file download URL");
  try {
    if (decodeURIComponent(parts[0]) !== fileId) throw new Error("Invalid file download URL");
  } catch {
    throw new Error("Invalid file download URL");
  }
  return href.toString();
}

export function downloadStoredFileFromGrant(input: { fileId: string; filename: string; grantUrl: string }, options: ResolveOptions = {}) {
  const href = resolveStoredFileDownloadUrl(input.grantUrl, input.fileId, options);
  clickDownloadLink(href, input.filename);
}

export async function downloadStoredFile(fileId: string, filename: string) {
  const { api } = await import("../api");
  const grant = await api.post<StoredFileDownloadGrant>(`/files/${encodeURIComponent(fileId)}/download-url`);
  downloadStoredFileFromGrant({ fileId, filename, grantUrl: grant.url });
  return grant;
}
