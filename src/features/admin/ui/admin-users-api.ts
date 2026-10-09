import { api } from "@/services/api";
import type { AccountStatus, AdminUser, ApiList, UserRole } from "@/types";
import type { InviteUserRequest } from "../api/admin-api";

export type AdminUsersInviteState = "pending" | "accepted";
export type AdminUsersSort = "createdAt:desc" | "createdAt:asc" | "lastActiveAt:desc" | "lastActiveAt:asc" | "name:asc" | "name:desc";

export type AdminUsersListParams = {
  query?: string;
  role?: UserRole;
  status?: AccountStatus;
  inviteState?: AdminUsersInviteState;
  createdFrom?: string;
  createdTo?: string;
  sort?: AdminUsersSort;
  cursor?: string | null;
};

function usersPath(params: AdminUsersListParams = {}) {
  const search = new URLSearchParams();
  if (params.query) search.set("query", params.query);
  if (params.role) search.set("role", params.role);
  if (params.status) search.set("status", params.status);
  if (params.inviteState) search.set("inviteState", params.inviteState);
  if (params.createdFrom) search.set("createdFrom", params.createdFrom);
  if (params.createdTo) search.set("createdTo", params.createdTo);
  if (params.sort) search.set("sort", params.sort);
  if (params.cursor) search.set("cursor", params.cursor);
  const query = search.toString();
  return `/admin/users${query ? `?${query}` : ""}`;
}

export const adminUsersApi = {
  list: (params?: AdminUsersListParams) => api.get<ApiList<AdminUser>>(usersPath(params)),
  create: (body: InviteUserRequest) => api.post<{ user: AdminUser; activationToken?: string }>("/admin/users", body),
  detail: (id: string) => api.get<AdminUser>(`/admin/users/${id}`),
  update: (id: string, body: Partial<AdminUser>) => api.patch<AdminUser>(`/admin/users/${id}`, body),
  status: (id: string, status: AccountStatus) => api.post<AdminUser>(`/admin/users/${id}/status`, { status }),
  role: (id: string, role: UserRole) => api.post<AdminUser>(`/admin/users/${id}/role`, { role }),
  resendInvite: (id: string) => api.post<{ success?: true; activationToken?: string }>(`/admin/users/${id}/resend-invite`),
  resetPassword: (id: string) => api.post<{ success?: true; accepted?: boolean; emailSent?: boolean; deliveryError?: string }>(`/admin/users/${id}/reset-password`),
  revokeSessions: (id: string) => api.post<{ success: true }>(`/admin/users/${id}/revoke-sessions`),
  remove: (id: string) => api.delete<{ success: true }>(`/admin/users/${id}`),
};
