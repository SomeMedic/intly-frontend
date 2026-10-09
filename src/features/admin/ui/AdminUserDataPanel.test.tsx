import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

vi.mock("@/services/api", () => ({ api: { get: vi.fn(), post: vi.fn() } }));
vi.mock("@/components/ui/badge", () => ({ Badge: ({ children }: { children?: ReactNode }) => <span>{children}</span> }));
vi.mock("@/components/ui/button", () => ({ Button: ({ children }: { children?: ReactNode }) => <button>{children}</button> }));
vi.mock("@/components/ui/modal", () => ({ Modal: ({ children }: { children?: ReactNode }) => <div>{children}</div> }));
vi.mock("@/components/intly/app-shell", () => ({ AppShell: ({ children }: { children?: ReactNode }) => <div>{children}</div> }));
vi.mock("@/components/intly/error-state", () => ({ ErrorState: ({ title }: { title?: string }) => <div>{title}</div> }));
vi.mock("@/components/intly/loading", () => ({ Skeleton: () => <div /> }));
vi.mock("@/features/auth", () => ({ useAuth: () => ({ bootstrapped: true, user: { role: "Admin", settings: { locale: "ru" } } }) }));
vi.mock("@/components/intly/rich-text-editor", () => ({
  documentToMarkdown: (document: { content?: Array<{ content?: Array<{ text?: string }> }> }) => document.content?.flatMap((node) => node.content?.flatMap((item) => item.text ? [item.text] : []) ?? []).join("\n\n") ?? "",
}));
vi.mock("@tanstack/react-query", () => ({ useQuery: () => ({ data: null, isLoading: false, isError: false, isFetching: false, refetch: vi.fn() }) }));
vi.mock("lucide-react", () => {
  const MockIcon = () => null;
  return {
    Activity: MockIcon,
    ArrowLeft: MockIcon,
    ArrowRight: MockIcon,
    Bot: MockIcon,
    Database: MockIcon,
    Eye: MockIcon,
    FileText: MockIcon,
    FolderKanban: MockIcon,
    ListChecks: MockIcon,
    Loader2: MockIcon,
    RefreshCcw: MockIcon,
    Search: MockIcon,
    UserRound: MockIcon,
  };
});
vi.mock("./admin-locale", () => ({
  useAdminLocale: () => "ru",
  commonAdminCopy: {
    ru: { loadingError: "Ошибка", retry: "Повторить", never: "Никогда", yes: "Да", no: "Нет", notTracked: "Не отслеживается", enabled: "Включено", off: "Выключено", created: "Создан", lastActive: "Последняя активность" },
    en: { loadingError: "Error", retry: "Retry", never: "Never", yes: "Yes", no: "No", notTracked: "Not tracked", enabled: "Enabled", off: "Off", created: "Created", lastActive: "Last active" },
  },
}));
vi.mock("../api/admin-user-inspector-api", async (importOriginal) => importOriginal<typeof import("../api/admin-user-inspector-api")>());

import { buildInspectorReadableContent } from "./AdminUserDataPanel";

describe("AdminUserDataPanel readable content helpers", () => {
  it("keeps a short summary visible alongside other readable content", () => {
    const result = buildInspectorReadableContent({ description: "Full description ".repeat(12), summary: "Short summary" }, "en");
    expect(result.primary.find((entry) => entry.key === "summary")?.value).toBe("Short summary");
  });
  it("renders sparse profile fields as readable primary content", () => {
    const result = buildInspectorReadableContent({
      id: "profile-1",
      title: "Python · удалённая работа",
      targetRoles: ["Python developer"],
      seniority: "middle",
      technologies: ["Python", "FastAPI"],
      compensationPreferences: { currency: "RUB", min: 250000, period: "month" },
      locations: ["Россия"],
      remotePreferences: ["remote"],
      employmentTypes: ["full-time"],
      sourceIds: ["hh", "habr"],
      matchWeights: { money: 15, remoteLocation: 15, employment: 10, freshness: 10, source: 5 },
      aiPreferences: { language: "ru", coverLetter: true },
      structuredExperienceSummary: "Python backend, API integrations",
    }, "ru");

    expect(result.primary).toHaveLength(2);
    expect(result.primary.map((entry) => entry.key)).toEqual(["structuredExperienceSummary", "profile"]);
    expect(result.primary[0]?.value).toContain("Python backend");
    expect(result.primary[1]?.value).toContain("Целевые роли: Python developer");
    expect(result.primary[1]?.value).toContain("Технологии: Python, FastAPI");
    expect(result.primary[1]?.value).toMatch(/Ожидания по оплате: Валюта: RUB; От: 250\s000; Период: месяц/);
    expect(result.primary[1]?.value).toContain("Удалённая работа: Удалённо");
    expect(result.primary[1]?.value).toContain("Тип занятости: Полная занятость");
    expect(result.primary[1]?.value).toContain("Источники: hh, habr");
    expect(result.primary[1]?.value).toContain("Вес критериев: Матч по оплате: 15; Локация и формат работы: 15; Занятость: 10; Свежесть: 10; Источник: 5");
    expect(result.primary[1]?.value).toContain("Сопроводительное письмо: Да");
  });

  it("renders structured resume schema before metadata", () => {
    const result = buildInspectorReadableContent({
      documentJson: {
        headline: "Python backend developer",
        summary: "Проверочное резюме для локального сценария адаптации и экспорта.",
        skills: [{ id: "s1", text: "Python" }, { id: "s2", text: "FastAPI" }, { id: "s3", text: "PostgreSQL" }],
        experience: [{ id: "e1", text: "Backend API, integrations and data pipelines." }],
        projects: [{ id: "p1", text: "INTLY local acceptance workspace." }],
        education: [],
        languages: [{ id: "l1", text: "English B2" }],
        links: [],
      },
      markdownCache: "Python backend developer\nPython, FastAPI, PostgreSQL",
    }, "ru");

    expect(result.primary[0]?.key).toBe("documentJson");
    expect(result.primary[0]?.value).toContain("Заголовок: Python backend developer");
    expect(result.primary[0]?.value).toContain("Навыки: Python, FastAPI, PostgreSQL");
    expect(result.primary[0]?.value).toContain("Опыт: Backend API, integrations and data pipelines.");
    expect(result.primary[0]?.value).toContain("Языки: English B2");
    expect(result.primary.some((entry) => entry.key === "markdownCache")).toBe(false);
  });

  it("keeps long rich documents as the first primary block", () => {
    const result = buildInspectorReadableContent({
      documentJson: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Primary resume text" }] }] },
      markdownCache: "Primary resume text",
      targetRoles: ["Backend developer"],
    }, "en");

    expect(result.primary[0]).toEqual({ key: "documentJson", value: "Primary resume text" });
    expect(result.primary.some((entry) => entry.key === "markdownCache")).toBe(false);
    expect(result.primary.some((entry) => entry.value.includes("Target roles: Backend developer"))).toBe(true);
  });
});
