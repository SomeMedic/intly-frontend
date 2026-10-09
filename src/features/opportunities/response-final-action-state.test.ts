import { describe, expect, it } from "vitest";
import { canConfirmFinalSubmission, canOpenFinalSubmission, finalSubmissionStatusPayload } from "./response-final-action-state";

const base = { online: true, hydrated: true, blocked: false, actionPending: false, readinessBlocked: true };

describe("response final submission actions", () => {
  it("keeps non-tender external sent strict on readiness checks", () => {
    expect(canOpenFinalSubmission({ ...base, opportunityType: "vacancy" })).toBe(false);
    expect(canConfirmFinalSubmission({ ...base, opportunityType: "freelance", confirmed: true })).toBe(false);
  });

  it("allows tender submitted fact recording despite readiness warnings when explicitly confirmed", () => {
    expect(canOpenFinalSubmission({ ...base, opportunityType: "tender" })).toBe(true);
    expect(canConfirmFinalSubmission({ ...base, opportunityType: "tender", confirmed: false })).toBe(false);
    expect(canConfirmFinalSubmission({ ...base, opportunityType: "tender", confirmed: true })).toBe(true);
  });

  it("keeps tender submitted blocked by sync and conflict state", () => {
    expect(canOpenFinalSubmission({ ...base, opportunityType: "tender", online: false })).toBe(false);
    expect(canOpenFinalSubmission({ ...base, opportunityType: "tender", hydrated: false })).toBe(false);
    expect(canOpenFinalSubmission({ ...base, opportunityType: "tender", blocked: true })).toBe(false);
    expect(canOpenFinalSubmission({ ...base, opportunityType: "tender", actionPending: true })).toBe(false);
  });

  it("sends the backend confirmation flag only for tender submitted", () => {
    expect(finalSubmissionStatusPayload("tender")).toEqual({ status: "submitted", confirmedExternalSubmission: true });
    expect(finalSubmissionStatusPayload("vacancy")).toEqual({ status: "sent" });
    expect(finalSubmissionStatusPayload("freelance")).toEqual({ status: "sent" });
  });
});
