import { describe, expect, it } from "vitest";
import { responsePipelineActions } from "./response-pipeline-state";

describe("response workflow handoff", () => {
  it("preserves exact type/profile navigation for confirmed final actions only", () => {
    expect(responsePipelineActions({ type: "vacancy", status: "ready", profileId: "other-profile", pipelineStatus: "Applied" })).toBeNull();
    expect(responsePipelineActions({ type: "tender", status: "sent", profileId: "profile" })).toBeNull();
    const action = responsePipelineActions({ type: "tender", status: "submitted", profileId: "profile & 2", pipelineStatus: "ApplicationSubmitted" });
    const url = new URL(action!.href, "http://localhost:3000");
    expect(url.searchParams.get("type")).toBe("tender");
    expect(url.searchParams.get("profileId")).toBe("profile & 2");
  });

  it("offers follow-up or negotiation from the actual current workflow stage", () => {
    expect(responsePipelineActions({ type: "vacancy", status: "sent", profileId: "p", pipelineStatus: "Applied" })?.suggestion?.key).toBe("follow_up");
    expect(responsePipelineActions({ type: "freelance", status: "sent", profileId: "p", pipelineStatus: "ClientReplied" })?.suggestion?.key).toBe("negotiation");
    expect(responsePipelineActions({ type: "freelance", status: "sent", profileId: "p", pipelineStatus: "Negotiation" })?.suggestion?.key).toBe("negotiation");
    expect(responsePipelineActions({ type: "vacancy", status: "sent", profileId: "p", pipelineStatus: "Offer" })?.suggestion).toBeNull();
    expect(responsePipelineActions({ type: "freelance", status: "sent", profileId: "p", pipelineStatus: "Lost" })?.suggestion).toBeNull();
  });

  it("does not suggest tasks while durable pipeline synchronization is pending", () => {
    for (const handoffStatus of ["pending", "error"]) expect(responsePipelineActions({ type: "vacancy", status: "sent", profileId: "p", pipelineStatus: "Applied", handoffStatus })).toEqual({ href: "/pipelines?type=vacancy&profileId=p", suggestion: null });
  });
});
