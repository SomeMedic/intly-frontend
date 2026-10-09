export type ResumeStatus = "draft" | "ready" | "archived";
export type ResumeKind = "base" | "adapted";
export type ResumeAdaptationStatus = "generating" | "review" | "editing" | "ready" | "exported" | "failed";
export type SuggestionStatus = "pending" | "accepted" | "rejected";

export type ResumeListItem = string | { id: string; text?: string; title?: string; description?: string; [key: string]: unknown };

export type ResumeDocumentJson = {
  headline?: string;
  summary?: string;
  skills?: ResumeListItem[];
  experience?: ResumeListItem[];
  projects?: ResumeListItem[];
  education?: ResumeListItem[];
  languages?: ResumeListItem[];
  links?: ResumeListItem[];
  [key: string]: unknown;
};

export type Resume = {
  id: string;
  userId: string;
  profileId?: string;
  kind: ResumeKind;
  title: string;
  documentJson: ResumeDocumentJson;
  markdownCache?: string;
  sourceFileId?: string;
  baseResumeId?: string;
  opportunityId?: string;
  revision: number;
  status: ResumeStatus;
  createdAt?: string;
  updatedAt?: string;
};

export type ResumeSuggestion = {
  id: string;
  type: string;
  title: string;
  rationale?: string;
  evidence?: string;
  proposed: Record<string, unknown>;
  status: SuggestionStatus;
  decidedAt?: string;
};

export type ResumeAdaptation = {
  id: string;
  userId: string;
  profileId: string;
  opportunityId: string;
  baseResumeId: string;
  documentJson: ResumeDocumentJson;
  markdownCache?: string;
  suggestions: ResumeSuggestion[];
  status: ResumeAdaptationStatus;
  revision: number;
  aiRunId?: string;
  generation?: Record<string, unknown>;
  exportState?: Record<string, unknown>;
  deletedAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type ListResponse<T> = { items: T[]; nextCursor: string | null };

export type ExportFormat = "pdf" | "docx" | "txt";
export type ResumeAdaptableOpportunityType = "vacancy" | "freelance";
export type ResumeOpportunityOption = { id: string; type: ResumeAdaptableOpportunityType | "tender"; title: string; companyOrClient?: string; sourceStatus?: string };

export const emptyResumeDocument: ResumeDocumentJson = {
  headline: "",
  summary: "",
  skills: [],
  experience: [],
  projects: [],
  education: [],
  languages: [],
  links: []
};
