import { describe, expect, it } from "vitest";
import { profileKindLabels, profileSourceHealthLabels, resolveProfileLocale, selectedSourcesLabel } from "./profile-labels";

describe("profile labels", () => {
  it("resolves supported locales", () => {
    expect(resolveProfileLocale("en")).toBe("en");
    expect(resolveProfileLocale("ru")).toBe("ru");
    expect(resolveProfileLocale(undefined)).toBe("ru");
  });

  it("labels profile metadata in Russian and English", () => {
    expect(profileKindLabels.ru.freelance).toBe("Фриланс");
    expect(profileKindLabels.en.freelance).toBe("Freelance");
    expect(profileSourceHealthLabels.ru.Degraded).toBe("нестабилен");
    expect(profileSourceHealthLabels.en.Degraded).toBe("degraded");
  });

  it("formats selected source guidance per locale", () => {
    expect(selectedSourcesLabel(2, 12, "ru")).toBe("Выбрано 2 из 12. Без выбора используется весь общий корпус.");
    expect(selectedSourcesLabel(2, 12, "en")).toBe("2 selected out of 12. If none are selected, the whole shared corpus is used.");
  });
});

