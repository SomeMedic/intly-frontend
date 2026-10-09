type TransferErrorCopy = { storageFull: string; networkError?: string };

const storageFullCodes = new Set([
  "STORAGE_FULL",
  "FILE_STORAGE_FULL",
  "INSUFFICIENT_STORAGE",
  "MINIO_STORAGE_FULL",
  "STORAGE_MIN_FREE_DRIVE_THRESHOLD"
]);

function errorStringParts(error: unknown): string[] {
  if (typeof error === "string") return [error];
  if (!error || typeof error !== "object") return [];
  const record = error as Record<string, unknown>;
  const parts = [record.message, record.code, record.kind].filter((value): value is string => typeof value === "string");
  if (record.details && typeof record.details === "object") {
    try {
      parts.push(JSON.stringify(record.details));
    } catch {
      /* Details are best-effort classification input only. */
    }
  }
  return parts;
}

export function isStorageFullTransferError(error: unknown) {
  const parts = errorStringParts(error);
  return parts.some((part) => {
    const normalized = part.toLowerCase();
    return storageFullCodes.has(part) ||
      storageFullCodes.has(part.toUpperCase()) ||
      normalized.includes("minimum free drive threshold") ||
      normalized.includes("storage backend has reached its minimum free drive threshold");
  });
}

export function isNetworkTransferError(error: unknown) {
  return !!error && typeof error === "object" && (error as Record<string, unknown>).kind === "NetworkError";
}

export function formatOpportunityTransferError(error: unknown, copy: TransferErrorCopy) {
  if (isStorageFullTransferError(error)) return copy.storageFull;
  if (copy.networkError && isNetworkTransferError(error)) return copy.networkError;
  return error instanceof Error ? error.message : typeof error === "string" ? error : "Request failed";
}
