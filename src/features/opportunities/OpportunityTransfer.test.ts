import { describe, expect, it } from "vitest";
import { formatOpportunityTransferError, isNetworkTransferError, isStorageFullTransferError } from "./opportunity-transfer-errors";

const copy = { storageFull: "Недостаточно места для подготовки файла.", networkError: "Не удалось скачать готовый файл. Проверьте сеть и повторите скачивание." };

describe("opportunity transfer error formatting", () => {
  it("maps MinIO storage threshold messages to a user-facing storage instruction", () => {
    const raw = "Storage backend has reached its minimum free drive threshold. Please delete a few objects to proceed.";
    expect(isStorageFullTransferError(new Error(raw))).toBe(true);
    expect(formatOpportunityTransferError(new Error(raw), copy)).toBe(copy.storageFull);
  });

  it("maps typed storage-full codes without hiding unrelated export errors", () => {
    expect(formatOpportunityTransferError({ code: "STORAGE_MIN_FREE_DRIVE_THRESHOLD", message: "backend raw" }, copy)).toBe(copy.storageFull);
    expect(formatOpportunityTransferError(new Error("Validation failed: field title is required"), copy)).toBe("Validation failed: field title is required");
    expect(isStorageFullTransferError({ code: "VALIDATION_ERROR", message: "minimum score is required" })).toBe(false);
  });

  it("maps network errors to retryable download copy when provided", () => {
    const error = { kind: "NetworkError", message: "Network request failed" };
    expect(isNetworkTransferError(error)).toBe(true);
    expect(formatOpportunityTransferError(error, copy)).toBe(copy.networkError);
    expect(formatOpportunityTransferError(error, { storageFull: copy.storageFull })).toBe("Request failed");
  });
});
