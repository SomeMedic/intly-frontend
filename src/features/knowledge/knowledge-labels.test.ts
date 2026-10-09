import { describe, expect, it } from "vitest";
import { isKnowledgeProcessing, knowledgeChunkLabel, knowledgeStatusLabels } from "./knowledge-labels";
import type { KnowledgeStatus } from "./contracts";

describe("knowledge labels", () => {
  it("keeps processing detection aligned with document pipeline statuses", () => {
    const processing: KnowledgeStatus[] = ["Uploading", "Parsing", "Chunking", "Embedding", "Indexing"];
    const final: KnowledgeStatus[] = ["Indexed", "Failed"];

    expect(processing.every((status) => isKnowledgeProcessing({ status }))).toBe(true);
    expect(final.some((status) => isKnowledgeProcessing({ status }))).toBe(false);
  });

  it("shows human labels instead of backend status values", () => {
    expect(knowledgeStatusLabels.ru.Uploading).toBe("Загружается");
    expect(knowledgeStatusLabels.ru.Indexed).toBe("Готов");
    expect(knowledgeStatusLabels.ru.Failed).toBe("Ошибка");
    expect(knowledgeStatusLabels.en.Uploading).toBe("Uploading");
    expect(knowledgeStatusLabels.en.Indexed).toBe("Ready");
    expect(knowledgeStatusLabels.en.Failed).toBe("Failed");
  });

  it("formats fragment count for both locales", () => {
    expect(knowledgeChunkLabel(1)).toBe("1 фрагмент");
    expect(knowledgeChunkLabel(3)).toBe("3 фрагмента");
    expect(knowledgeChunkLabel(12)).toBe("12 фрагментов");
    expect(knowledgeChunkLabel(25)).toBe("25 фрагментов");
    expect(knowledgeChunkLabel(1, "en")).toBe("1 fragment");
    expect(knowledgeChunkLabel(2, "en")).toBe("2 fragments");
  });
});
