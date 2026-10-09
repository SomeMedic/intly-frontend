import { describe, expect, it } from "vitest";
import { formatDateTimeInTimeZone, isoToZonedCalendarDateTime, isoToZonedDateTimeLocal, resolveCalendarTimeZone, zonedDateTimeLocalToIso } from "./calendar-time";

describe("calendar timezone helpers", () => {
  it("round-trips Europe/Volgograd wall time without FullCalendar named-timezone coercion", () => {
    const iso = zonedDateTimeLocalToIso("2026-10-03T10:30", "Europe/Volgograd");

    expect(iso).toBe("2026-10-03T07:30:00.000Z");
    expect(isoToZonedDateTimeLocal(iso, "Europe/Volgograd")).toBe("2026-10-03T10:30");
    expect(isoToZonedCalendarDateTime(iso, "Europe/Volgograd")).toBe("2026-10-03T10:30:00");
  });

  it("prefers the user timezone and formats display text through Intl", () => {
    expect(resolveCalendarTimeZone("Europe/Volgograd", "UTC")).toBe("Europe/Volgograd");
    expect(formatDateTimeInTimeZone("2026-10-03T07:30:00.000Z", "Europe/Volgograd")).toContain("10:30");
    expect(formatDateTimeInTimeZone("2026-10-03T07:30:00.000Z", "Europe/Volgograd", "en")).toContain("10:30");
  });
});
