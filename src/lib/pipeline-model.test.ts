import { describe, expect, it } from "vitest";
import type { PipelineBoard } from "@/types";
import { dragPayload, isClosedPipelineStage, keyboardStageForPipelineMove, normalizePipelineBoard, normalizePipelineStatus, pipelineFiltersForApi, pipelineItemToCard, pipelineStageDefinitions, pipelineStateToParams, pipelineSuggestedActionKeys, pipelineUrlState, stagesForPipeline, suggestionToTaskDraft } from "./pipeline-model";

describe("pipeline model", () => {
  it("keeps exact canonical stage arrays per opportunity type", () => {
    expect(stagesForPipeline("vacancy")).toEqual(["New", "Reviewed", "Interested", "Applied", "HRReply", "Interview", "TechnicalInterview", "Offer", "Rejected", "Archived"]);
    expect(stagesForPipeline("freelance")).toEqual(["New", "Reviewed", "Interested", "ResponseSent", "ClientReplied", "Negotiation", "Won", "InProgress", "Completed", "Lost", "Archived"]);
    expect(stagesForPipeline("tender")).toEqual(["New", "Reviewed", "Interested", "PreparingApplication", "ApplicationSubmitted", "Admitted", "BiddingEvaluation", "Won", "Contracting", "InProgress", "Completed", "Lost", "Archived"]);
    expect(Object.keys(pipelineStageDefinitions)).toEqual(["vacancy", "freelance", "tender"]);
  });

  it("normalizes legacy and canonical pipeline statuses per opportunity type", () => {
    expect(normalizePipelineStatus("vacancy", "Shortlisted")).toBe("Interested");
    expect(normalizePipelineStatus("vacancy", "Won")).toBe("Offer");
    expect(normalizePipelineStatus("vacancy", "Offer")).toBe("Offer");
    expect(normalizePipelineStatus("freelance", "Shortlisted")).toBe("Interested");
    expect(normalizePipelineStatus("freelance", "Applied")).toBe("ResponseSent");
    expect(normalizePipelineStatus("freelance", "Won")).toBe("Won");
    expect(normalizePipelineStatus("tender", "Shortlisted")).toBe("Interested");
    expect(normalizePipelineStatus("tender", "Applied")).toBe("ApplicationSubmitted");
    expect(normalizePipelineStatus("tender", "Won")).toBe("Won");
    expect(normalizePipelineStatus("tender", "Unknown")).toBe("New");
    expect(normalizePipelineStatus("vacancy", null)).toBe("New");
  });

  it("round-trips URL state and API filters with validated type, sort and attention", () => {
    const state = pipelineUrlState(new URLSearchParams("type=tender&profileId=p1&sourceIds=hh,manual&minMatch=110&minAiScore=80&tags=go,ai&dateFrom=2026-10-01&attention=overdue&counterpart=acme&sort=deadline"), "fallback");
    expect(state).toMatchObject({ type: "tender", profileId: "p1", sourceIds: ["hh", "manual"], minMatch: 100, minAiScore: 80, tags: ["go", "ai"], attention: "overdue", sort: "deadline" });
    expect(pipelineStateToParams(state).toString()).toContain("type=tender");
    expect(pipelineFiltersForApi(state)).toMatchObject({ sourceIds: ["hh", "manual"], minMatch: 100, minAiScore: 80, attention: "overdue", sort: "deadline" });
  });

  it("builds a drag payload only for cross-column drops in the active profile", () => {
    const board: PipelineBoard = { columns: [{ status: "New", items: [{ state: { id: "state-1", opportunityId: "opp-1", profileId: "p1", pipelineStatus: "New" }, opportunity: null }] }, { status: "Applied", items: [] }] };
    expect(dragPayload({ activeId: "state-1", overId: "Applied", board, type: "vacancy", profileId: "p1" })).toEqual({ opportunityId: "opp-1", from: "New", to: "Applied", profileId: "p1", type: "vacancy" });
    expect(dragPayload({ activeId: "state-1", overId: "Won", board, type: "vacancy", profileId: "p1" })).toBeNull();
    expect(dragPayload({ activeId: "state-1", overId: "New", board, type: "vacancy", profileId: "p1" })).toBeNull();
  });


  it("normalizes real backend card shape with top-level ai score, primary source and canonical tags", () => {
    const card = pipelineItemToCard({
      state: { id: "state-1", opportunityId: "opp-1", profileId: "profile-1", pipelineStatus: "Interested", matchScore: 77, tags: ["hot"], favorite: true },
      opportunity: { title: "Backend", companyOrClient: "Acme", canonicalTags: ["python"], sourceOccurrences: [{ sourceId: "secondary" }, { sourceId: "hh", primary: true }], firstSeenAt: "2026-10-01T00:00:00.000Z" },
      attention: ["needs_attention"],
      dueAt: "2026-10-05T00:00:00.000Z",
      suggestedActions: ["follow_up"],
      aiScore: 91
    }, { hh: "HeadHunter" });

    expect(card).toMatchObject({ title: "Backend", counterpart: "Acme", aiScore: 91, sourceId: "hh", sourceName: "HeadHunter", tags: ["hot"], attention: ["needs_attention"], suggestedActions: [{ key: "follow_up" }], favorite: true, closed: false });
  });

  it("marks closed pipeline cards and computes adjacent keyboard moves by canonical stage", () => {
    const board: PipelineBoard = {
      columns: [
        { status: "New", items: [{ state: { id: "state-1", opportunityId: "opp-1", profileId: "p1", pipelineStatus: "New" }, opportunity: null }] },
        { status: "Reviewed", items: [{ state: { id: "state-2", opportunityId: "opp-2", profileId: "p1", pipelineStatus: "Reviewed" }, opportunity: { title: "Done", archived: true } }] }
      ]
    };

    expect(keyboardStageForPipelineMove({ activeId: "state-1", key: "ArrowRight", board, type: "vacancy" })).toBe("Reviewed");
    expect(keyboardStageForPipelineMove({ activeId: "state-1", key: "ArrowRight", board, type: "vacancy", currentStage: "Reviewed" })).toBe("Interested");
    expect(keyboardStageForPipelineMove({ activeId: "state-1", key: "ArrowLeft", board, type: "vacancy", currentStage: "Interested" })).toBe("Reviewed");
    expect(keyboardStageForPipelineMove({ activeId: "opp-2", key: "ArrowLeft", board, type: "vacancy" })).toBe("New");
    expect(keyboardStageForPipelineMove({ activeId: "state-1", key: "Enter", board, type: "vacancy" })).toBeNull();
    expect(keyboardStageForPipelineMove({ activeId: "state-1", key: "ArrowLeft", board, type: "vacancy" })).toBeNull();
    expect(keyboardStageForPipelineMove({ activeId: "state-1", key: "ArrowRight", board, type: "vacancy", currentStage: "Archived" })).toBeNull();
    expect(keyboardStageForPipelineMove({ activeId: "state-1", key: "ArrowRight", board, type: "vacancy", currentStage: "Won" })).toBe("Rejected");
    expect(isClosedPipelineStage("Rejected")).toBe(true);
    expect(isClosedPipelineStage("Archived")).toBe(true);
    expect(isClosedPipelineStage("Interested")).toBe(false);
    expect(pipelineItemToCard(board.columns[1].items[0])).toMatchObject({ archived: true, closed: true });
  });

  it("groups legacy backend board columns under canonical frontend stages", () => {
    const board = normalizePipelineBoard({
      type: "vacancy",
      profileId: "p1",
      columns: [
        { status: "Shortlisted" as never, items: [{ state: { id: "state-1", opportunityId: "opp-1", profileId: "p1", pipelineStatus: "Shortlisted" as never }, opportunity: null }] },
        { status: "Won", items: [{ state: { id: "state-2", opportunityId: "opp-2", profileId: "p1", pipelineStatus: "Won" }, opportunity: null }] }
      ]
    }, "vacancy");

    expect(board.columns.find(column => column.status === "Interested")?.items.map(item => item.state.opportunityId)).toEqual(["opp-1"]);
    expect(board.columns.find(column => column.status === "Offer")?.items.map(item => item.state.opportunityId)).toEqual(["opp-2"]);
    expect(board.columns.find(column => column.status === "Won")).toBeUndefined();
  });

  it("maps confirmed suggestions to task creation defaults", () => {
    expect(suggestionToTaskDraft({ key: "interview_prep" }, { opportunityId: "opp", opportunityTitle: "Backend", profileId: "p", boardId: "b", statusColumnId: "todo" })).toMatchObject({ boardId: "b", title: "Prepare interview: Backend", type: "Interview Prep", priority: "normal", opportunityId: "opp", profileId: "p", labels: ["pipeline", "interview_prep"] });
    expect(suggestionToTaskDraft({ key: "contracting" }, { opportunityId: "opp", opportunityTitle: "Tender", boardId: "b" })).toMatchObject({ type: "Tender Step", priority: "high" });
    expect(suggestionToTaskDraft({ key: "application" }, { opportunityId: "opp", opportunityTitle: "Tender", boardId: "b" })).toMatchObject({ type: "Application" });
    expect(suggestionToTaskDraft({ key: "submission_reminder" }, { opportunityId: "opp", opportunityTitle: "Tender", boardId: "b", locale: "ru" })).toMatchObject({ title: "Проверить результат заявки: Tender", checklist: [{ text: "Проверить статус рассмотрения" }, { text: "Зафиксировать ответ площадки" }, { text: "Запланировать следующий шаг по результату" }] });
    for (const key of pipelineSuggestedActionKeys) {
      const draft = suggestionToTaskDraft({ key }, { opportunityId: "opp", opportunityTitle: "Сделка", locale: "ru" });
      expect(draft.title).not.toMatch(/Follow up|Prepare|Check|Create/);
      expect(draft.checklist?.length).toBeGreaterThan(0);
    }
  });
});
