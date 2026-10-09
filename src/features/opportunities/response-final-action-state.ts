import type { OpportunityRecord } from "./contracts";

export type FinalSubmissionInput = {
  opportunityType: OpportunityRecord["type"];
  online: boolean;
  hydrated: boolean;
  blocked: boolean;
  actionPending: boolean;
  readinessBlocked: boolean;
  confirmed?: boolean;
};

export function canOpenFinalSubmission(input: FinalSubmissionInput): boolean {
  return baseFinalSubmissionAvailable(input) && (input.opportunityType === "tender" || !input.readinessBlocked);
}

export function canConfirmFinalSubmission(input: FinalSubmissionInput): boolean {
  return !!input.confirmed && canOpenFinalSubmission(input);
}

export function finalSubmissionStatusPayload(opportunityType: OpportunityRecord["type"]): Record<string, unknown> {
  return opportunityType === "tender"
    ? { status: "submitted", confirmedExternalSubmission: true }
    : { status: "sent" };
}

function baseFinalSubmissionAvailable(input: FinalSubmissionInput): boolean {
  return input.online && input.hydrated && !input.blocked && !input.actionPending;
}
