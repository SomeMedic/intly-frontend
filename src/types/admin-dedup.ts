export type AdminDedupRunStatus = "queued" | "running" | "retrying" | "completed" | string;
export type AdminDedupReviewStatus = "open" | "resolved" | "stale" | "queued" | "running" | string;

export type AdminDedupStatusRun = {
  id: string;
  status: AdminDedupRunStatus;
  startedAt?: string | null;
  scanned: number;
  merged: number;
  review: number;
  missing: number;
  updatedAt?: string | null;
  finishedAt?: string | null;
  lastError?: string | null;
};

export type AdminDedupStatus = {
  runs: AdminDedupStatusRun[];
  pending: number;
  review: number;
};

export type AdminDedupSourceOccurrence = {
  sourceId: string;
  externalId?: string | null;
  url?: string | null;
};

export type AdminDedupOpportunityPreview = {
  id: string;
  type: string;
  title: string;
  companyOrClient?: string | null;
  location?: string | null;
  publishedAt?: string | null;
  description?: string | null;
  sourceOccurrences?: AdminDedupSourceOccurrence[];
};

export type AdminDedupSemanticFieldComparison = {
  minimum?: number | null;
  maximum?: number | null;
  weightedMean?: number | null;
  left?: Array<{ index: number; matchedIndex: number; cosine: number; bytes: number }>;
  right?: Array<{ index: number; matchedIndex: number; cosine: number; bytes: number }>;
};

export type AdminDedupSemanticAudit = {
  title?: AdminDedupSemanticFieldComparison | null;
  description?: AdminDedupSemanticFieldComparison | null;
  model?: string | null;
  unavailable?: boolean | null;
};

export type AdminDedupReviewCandidate = {
  opportunityId: string;
  reasons: string[];
  semantic?: AdminDedupSemanticAudit | null;
};

export type AdminDedupReviewListItem = {
  id: string;
  status: AdminDedupReviewStatus;
  checkedAt?: string | null;
  candidateSearchComplete?: boolean;
  review: AdminDedupReviewCandidate[];
  opportunity: AdminDedupOpportunityPreview | null;
};

export type AdminDedupReviewList = {
  items: AdminDedupReviewListItem[];
  total?: number;
  nextCursor?: string | null;
  hasMore?: boolean;
};

export type AdminDedupReviewPair = {
  candidate: AdminDedupOpportunityPreview;
  reasons: string[];
  semantic?: AdminDedupSemanticAudit | null;
  reviewToken: string;
};

export type AdminDedupReviewDetail = {
  id: string;
  status: AdminDedupReviewStatus;
  checkedAt?: string | null;
  candidateSearchComplete?: boolean;
  opportunity: AdminDedupOpportunityPreview | null;
  pairs: AdminDedupReviewPair[];
  unavailableCandidates: string[];
};

export type AdminDedupResolveDecision = "distinct" | "merge";

export type AdminDedupResolveRequest = {
  candidateId: string;
  decision: AdminDedupResolveDecision;
  targetId?: string;
  reviewToken: string;
  reason?: string;
};

export type AdminDedupResolveResponse = {
  success: true;
  decision: AdminDedupResolveDecision;
  opportunityId?: string;
  targetId?: string;
};

export type AdminDedupRecheckResponse = {
  accepted: true;
  queued: boolean;
  queuePending: boolean;
  opportunityId: string;
  jobId?: string;
};
