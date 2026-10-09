import { api } from "@/services/api";
import type { ExportFormat, ListResponse, Resume, ResumeAdaptation, ResumeDocumentJson, ResumeOpportunityOption, ResumeStatus } from "../contracts";

function compactParams(input: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  Object.entries(input).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const query = params.toString();
  return query ? `?${query}` : "";
}

export const resumesApi = {
  listResumes(input: { profileId?: string; kind?: "base" | "adapted" } = {}) {
    return api.get<ListResponse<Resume>>(`/resumes${compactParams(input)}`);
  },
  createResume(input: { title: string; profileId?: string; documentJson: ResumeDocumentJson; markdownCache?: string }) {
    return api.post<Resume>("/resumes", input);
  },
  updateResume(id: string, input: { revision: number; profileId?: string | null; title?: string; documentJson?: ResumeDocumentJson; markdownCache?: string; status?: ResumeStatus }) {
    return api.patch<Resume>(`/resumes/${id}`, input);
  },
  listAdaptations(input: { opportunityId?: string; profileId?: string; baseResumeId?: string; deleted?: "only" } = {}) {
    return api.get<ListResponse<ResumeAdaptation>>(`/resume-adaptations${compactParams(input)}`);
  },
  getAdaptation(id: string) {
    return api.get<ResumeAdaptation>(`/resume-adaptations/${id}`);
  },
  searchOpportunities(input: { query?: string; profileId?: string; types?: string } = {}) {
    return api.get<ListResponse<ResumeOpportunityOption>>(`/opportunities${compactParams({ query: input.query, profileId: input.profileId, types: input.types })}`);
  },
  getOpportunity(id: string, profileId?: string) {
    return api.get<ResumeOpportunityOption>(`/opportunities/${id}${compactParams({ profileId })}`);
  },
  createAdaptation(opportunityId: string, input: { baseResumeId: string; profileId: string; customPrompt?: string }) {
    return api.post<ResumeAdaptation>(`/opportunities/${opportunityId}/resume-adaptations`, input);
  },
  updateAdaptation(id: string, input: { revision: number; documentJson?: ResumeDocumentJson; markdownCache?: string; status?: ResumeAdaptation["status"] }) {
    return api.patch<ResumeAdaptation>(`/resume-adaptations/${id}`, input);
  },
  acceptSuggestion(id: string, suggestionId: string, revision: number) {
    return api.post<ResumeAdaptation>(`/resume-adaptations/${id}/suggestions/${suggestionId}/accept`, { revision });
  },
  rejectSuggestion(id: string, suggestionId: string, revision: number) {
    return api.post<ResumeAdaptation>(`/resume-adaptations/${id}/suggestions/${suggestionId}/reject`, { revision });
  },
  undoReorder(id: string, suggestionId: string, revision: number, order: string[]) {
    return api.post<ResumeAdaptation>(`/resume-adaptations/${id}/suggestions/${suggestionId}/undo-reorder`, { revision, order });
  },
  deleteAdaptation(id: string, revision: number) {
    return api.delete<{ success: true }>(`/resume-adaptations/${id}`, { body: { revision } });
  },
  restoreAdaptation(id: string, revision: number) {
    return api.post<ResumeAdaptation>(`/resume-adaptations/${id}/restore`, { revision });
  },
  exportAdaptation(id: string, format: ExportFormat, revision?: number) {
    return api.post<{ fileId: string; filename: string; mimeType: string; size: number }>(`/resume-adaptations/${id}/export`, { format, ...(revision === undefined ? {} : { revision }) });
  }
};
