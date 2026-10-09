import { api } from "@/services/api";
import type { AdminDedupRecheckResponse, AdminDedupResolveRequest, AdminDedupResolveResponse, AdminDedupReviewDetail, AdminDedupReviewList, AdminDedupStatus } from "@/types/admin-dedup";

export type AdminDedupReviewListParams = {
  limit?: number;
  cursor?: string | null;
  query?: string;
};

function buildQuery(params: AdminDedupReviewListParams = {}) {
  const search = new URLSearchParams();
  if (params.limit !== undefined) search.set("limit", String(params.limit));
  if (params.cursor) search.set("cursor", params.cursor);
  if (params.query) search.set("query", params.query);
  const value = search.toString();
  return value ? `?${value}` : "";
}

export const adminDedupApi = {
  status: () => api.get<AdminDedupStatus>("/admin/opportunities/dedup/status"),
  reviews: (params?: AdminDedupReviewListParams) => api.get<AdminDedupReviewList>(`/admin/opportunities/dedup/reviews${buildQuery(params)}`),
  review: (id: string) => api.get<AdminDedupReviewDetail>(`/admin/opportunities/dedup/reviews/${encodeURIComponent(id)}`),
  resolve: (id: string, body: AdminDedupResolveRequest) => api.post<AdminDedupResolveResponse>(`/admin/opportunities/dedup/reviews/${encodeURIComponent(id)}/resolve`, body),
  recheck: (id: string) => api.post<AdminDedupRecheckResponse>(`/admin/opportunities/dedup/reviews/${encodeURIComponent(id)}/recheck`),
};
