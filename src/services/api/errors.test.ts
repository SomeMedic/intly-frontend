import { describe, expect, it } from "vitest";
import { ApiError, normalizeApiError } from "./errors";

describe("API error transport boundary", () => {
  it("retains safe source error codes even when the server masks upstream messages", () => {
    const error = normalizeApiError(502, { error: { code: "SOURCE_DOCUMENT_TLS_ERROR", message: "Service temporarily unavailable", requestId: "request-1" } });
    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe("SOURCE_DOCUMENT_TLS_ERROR");
    expect(error.message).toBe("Service temporarily unavailable");
    expect(error.requestId).toBe("request-1");
    expect(error.status).toBe(502);
  });

  it("keeps error details separate from the server code and handles missing bodies", () => {
    const details = { fields: ["profileId"] };
    const error = normalizeApiError(400, { error: { code: "VALIDATION_ERROR", message: "Profile required", details } });
    expect(error.details).toEqual(details);
    expect(error.code).toBe("VALIDATION_ERROR");
    expect(normalizeApiError(503, null).code).toBeUndefined();
    expect(normalizeApiError(503, null).kind).toBe("ServerError");
  });
});
