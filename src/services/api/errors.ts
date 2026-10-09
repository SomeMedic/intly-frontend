import type { ApiErrorBody } from "@/types";

export type ApiErrorKind =
  | "ValidationError"
  | "Unauthorized"
  | "Forbidden"
  | "NotFound"
  | "Conflict"
  | "RateLimited"
  | "ServerError"
  | "NetworkError"
  | "AbortError";

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status?: number;
  readonly code?: string;
  readonly requestId?: string;
  readonly details?: unknown;

  constructor(message: string, options: { kind: ApiErrorKind; status?: number; code?: string; requestId?: string; details?: unknown }) {
    super(message);
    this.name = "ApiError";
    this.kind = options.kind;
    this.status = options.status;
    this.code = options.code;
    this.requestId = options.requestId;
    this.details = options.details;
  }
}

export function apiErrorKind(status: number): ApiErrorKind {
  if (status === 400 || status === 422) return "ValidationError";
  if (status === 401) return "Unauthorized";
  if (status === 403) return "Forbidden";
  if (status === 404) return "NotFound";
  if (status === 409) return "Conflict";
  if (status === 429) return "RateLimited";
  return "ServerError";
}

export function normalizeApiError(status: number, body: ApiErrorBody | null) {
  return new ApiError(body?.error.message ?? "Request failed", {
    kind: apiErrorKind(status),
    status,
    code: body?.error.code,
    requestId: body?.error.requestId,
    details: body?.error.details
  });
}
