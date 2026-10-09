export type OpportunityType = "vacancy" | "freelance" | "tender";

export type SourceStatus = "Active" | "Closed" | "Expired" | "Removed" | "Unknown";

export type PipelineStage =
  | "New"
  | "Reviewed"
  | "Interested"
  | "Applied"
  | "HRReply"
  | "Interview"
  | "TechnicalInterview"
  | "Offer"
  | "Rejected"
  | "Archived"
  | "ResponseSent"
  | "ClientReplied"
  | "Negotiation"
  | "Won"
  | "InProgress"
  | "Completed"
  | "Lost"
  | "PreparingApplication"
  | "ApplicationSubmitted"
  | "Admitted"
  | "BiddingEvaluation"
  | "Contracting";

export type OpportunityMini = {
  id: string;
  type: OpportunityType;
  title: string;
  companyOrClient: string;
  compensationLabel: string;
  placeLabel?: string;
  source: {
    id: string;
    name: string;
    url?: string;
    status: SourceStatus;
    extraCount?: number;
  };
  matchScore: number | null;
  aiScore?: number | null;
  aiState?: "idle" | "queued" | "processing" | "complete" | "failed";
  skills: string[];
  pipelineStage: PipelineStage;
  firstSeenAt: string;
  publishedAt?: string;
  favorite: boolean;
  hidden?: boolean;
  archived?: boolean;
  description?: string;
};
