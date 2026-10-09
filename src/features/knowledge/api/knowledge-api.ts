import { api } from "@/services/api";
import type {
  CreateKnowledgeDocumentInput,
  KnowledgeDocument,
  KnowledgeListResponse,
  KnowledgeMode,
  KnowledgeSearchResponse,
  KnowledgeStatus,
  KnowledgeType,
  UpdateKnowledgeDocumentInput
} from "../contracts";

type ListFilters = {
  query?: string;
  type?: KnowledgeType | "all";
  mode?: KnowledgeMode | "all";
  status?: KnowledgeStatus | "all";
  profileId?: string;
};

function compactParams(input: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  Object.entries(input).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const query = params.toString();
  return query ? `?${query}` : "";
}

export const knowledgeApi = {
  list(filters: ListFilters = {}) {
    return api.get<KnowledgeListResponse>(
      `/knowledge/documents${compactParams({
        query: filters.query,
        type: filters.type && filters.type !== "all" ? filters.type : undefined,
        mode: filters.mode && filters.mode !== "all" ? filters.mode : undefined,
        status: filters.status && filters.status !== "all" ? filters.status : undefined,
        profileId: filters.profileId
      })}`
    );
  },
  get(id: string) {
    return api.get<KnowledgeDocument>(`/knowledge/documents/${id}`);
  },
  create(input: CreateKnowledgeDocumentInput) {
    return api.post<KnowledgeDocument>("/knowledge/documents", input);
  },
  upload(form: FormData) {
    return api.upload<KnowledgeDocument>("/knowledge/documents/multipart", form);
  },
  update(id: string, input: UpdateKnowledgeDocumentInput) {
    return api.patch<KnowledgeDocument>(`/knowledge/documents/${id}`, input);
  },
  remove(id: string) {
    return api.delete<{ success: true }>(`/knowledge/documents/${id}`);
  },
  reprocess(id: string) {
    return api.post<{ success: true }>(`/knowledge/documents/${id}/reprocess`);
  },
  search(input: { query: string; profileId?: string; topK?: number }) {
    return api.post<KnowledgeSearchResponse>("/knowledge/search", input);
  }
};
