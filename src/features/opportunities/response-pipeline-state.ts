import type { PipelineSuggestedAction, PipelineType } from "@/types";
import { pipelineStateToParams } from "../../lib/pipeline-model";

type ResponsePipelineInput = {
  type: PipelineType;
  status: string;
  profileId: string;
  pipelineStatus?: string;
  handoffStatus?: string;
};

export function responsePipelineActions(input: ResponsePipelineInput): { href: string; suggestion: PipelineSuggestedAction | null } | null {
  const final = input.type === "tender" ? input.status === "submitted" : input.status === "sent";
  if (!final) return null;
  const href = `/pipelines?${pipelineStateToParams({ type: input.type, profileId: input.profileId }).toString()}`;
  if (input.handoffStatus === "pending" || input.handoffStatus === "error") return { href, suggestion: null };
  if (input.type === "vacancy" && input.pipelineStatus === "Applied") return { href, suggestion: { key: "follow_up" } };
  if (input.type === "freelance") {
    if (input.pipelineStatus === "ResponseSent") return { href, suggestion: { key: "follow_up" } };
    if (["ClientReplied", "Negotiation"].includes(input.pipelineStatus ?? "")) return { href, suggestion: { key: "negotiation" } };
  }
  if (input.type === "tender" && input.pipelineStatus === "ApplicationSubmitted") return { href, suggestion: { key: "submission_reminder" } };
  return { href, suggestion: null };
}
