import { describe, expect, it } from "vitest";
import { currentReturnTo, safeReturnTo } from "./redirect";

describe("auth redirect helpers", () => {
  it("keeps safe same-app returnTo paths with query and hash", () => {
    expect(safeReturnTo("/calendar?view=month#today")).toBe("/calendar?view=month#today");
  });

  it("rejects external, protocol-relative and auth-public returnTo values", () => {
    expect(safeReturnTo("https://evil.test/calendar")).toBe("/dashboard");
    expect(safeReturnTo("//evil.test/calendar")).toBe("/dashboard");
    expect(safeReturnTo("/login?returnTo=%2Fcalendar")).toBe("/dashboard");
    expect(safeReturnTo("javascript:alert(1)")).toBe("/dashboard");
  });

  it("builds returnTo from current protected route without dropping query string", () => {
    expect(currentReturnTo("/calendar", new URLSearchParams({ view: "week", profileId: "p1" }))).toBe("/calendar?view=week&profileId=p1");
  });
});
