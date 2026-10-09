import { describe, expect, it } from "vitest";
import { aiProgressLabel, chooseAiRunProgress, isAiRunProgressPayload, progressFromEvent, progressFromRun } from "./response-ai-progress";

describe("response AI progress helpers", () => {
  it("accepts only real progress events with backend stage/status values", () => {
    expect(isAiRunProgressPayload({ runId: "run-1", taskType: "editor_transform", responseDraftId: "draft-1", stage: "retrieving_knowledge", status: "running" })).toBe(true);
    expect(isAiRunProgressPayload({ runId: "run-1", taskType: "editor_transform", responseDraftId: "draft-1", stage: "failed", status: "failed" })).toBe(false);
    expect(isAiRunProgressPayload({ payload: { heartbeat: true } })).toBe(false);
  });

  it("recovers progress from persisted AiRun stage and supports _id", () => {
    expect(progressFromRun({ _id: "run-1", taskType: "response_generation", stage: "calling_model", status: "running", updatedAt: "2026-10-03T10:00:00.000Z" }, "draft-1", 12)).toEqual({
      runId: "run-1",
      taskType: "response_generation",
      responseDraftId: "draft-1",
      stage: "calling_model",
      status: "running",
      observedAt: Date.parse("2026-10-03T10:00:00.000Z"),
    });
  });

  it("keeps a newer live stage over a stale persisted GET snapshot", () => {
    const live = progressFromEvent({ runId: "run-1", taskType: "response_generation", responseDraftId: "draft-1", stage: "calling_model", status: "running" }, "2026-10-03T10:00:10.000Z");
    const persisted = progressFromRun({ id: "run-1", taskType: "response_generation", stage: "retrieving_knowledge", status: "running", updatedAt: "2026-10-03T10:00:00.000Z" }, "draft-1");

    expect(chooseAiRunProgress(live, persisted)).toBe(live);
  });

  it("lets terminal live status override an older running GET snapshot", () => {
    const live = progressFromEvent({ runId: "run-1", taskType: "editor_transform", responseDraftId: "draft-1", stage: "retrieving_knowledge", status: "failed" }, "2026-10-03T10:00:00.000Z");
    const persisted = progressFromRun({ id: "run-1", taskType: "editor_transform", stage: "retrieving_knowledge", status: "running", updatedAt: "2026-10-03T10:00:05.000Z" }, "draft-1");

    expect(chooseAiRunProgress(live, persisted)).toBe(live);
    expect(aiProgressLabel(live, "ru")).toBe("Ошибка · этап: Ищем знания");
  });

  it("lets terminal persisted status override a stale live stage", () => {
    const live = progressFromEvent({ runId: "run-1", taskType: "editor_transform", responseDraftId: "draft-1", stage: "retrieving_knowledge", status: "running" }, "2026-10-03T10:00:20.000Z");
    const persisted = progressFromRun({ id: "run-1", taskType: "editor_transform", stage: "retrieving_knowledge", status: "failed", updatedAt: "2026-10-03T10:00:10.000Z" }, "draft-1");

    expect(chooseAiRunProgress(live, persisted)).toBe(persisted);
    expect(persisted && aiProgressLabel(persisted, "ru")).toBe("Ошибка · этап: Ищем знания");
  });

  it("uses the persisted stage when there is no live event yet", () => {
    const persisted = progressFromRun({ id: "run-2", taskType: "response_generation", stage: "validating_output", status: "running", updatedAt: "2026-10-03T10:00:00.000Z" }, "draft-1");

    expect(chooseAiRunProgress(undefined, persisted)).toBe(persisted);
    expect(persisted && aiProgressLabel(persisted, "en")).toBe("Validating output · Running");
  });
});
