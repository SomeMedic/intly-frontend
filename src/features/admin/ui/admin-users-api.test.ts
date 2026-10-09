import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/services/api";
import { adminUsersApi } from "./admin-users-api";
import { passwordResetNotice } from "./admin-users-reset-notice";

vi.mock("@/services/api", () => ({ api: { get: vi.fn(), post: vi.fn() } }));

describe("adminUsersApi", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sends the full users filter contract without touching the shared admin api", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ items: [], nextCursor: null });

    await adminUsersApi.list({
      query: "anna",
      role: "Admin",
      status: "Deleted",
      inviteState: "accepted",
      createdFrom: "2026-10-01T00:00:00.000Z",
      createdTo: "2026-10-07T00:00:00.000Z",
      sort: "lastActiveAt:desc",
      cursor: "user-42",
    });

    expect(api.get).toHaveBeenCalledWith("/admin/users?query=anna&role=Admin&status=Deleted&inviteState=accepted&createdFrom=2026-10-01T00%3A00%3A00.000Z&createdTo=2026-10-07T00%3A00%3A00.000Z&sort=lastActiveAt%3Adesc&cursor=user-42");
  });

  it("keeps admin password reset responses token-free at the screen boundary", async () => {
    vi.mocked(api.post).mockResolvedValueOnce({ accepted: true, emailSent: true });

    const result = await adminUsersApi.resetPassword("user-1");

    expect(api.post).toHaveBeenCalledWith("/admin/users/user-1/reset-password");
    expect("resetToken" in result).toBe(false);
  });

  it("formats password reset delivery truthfully without promising queued email", () => {
    expect(passwordResetNotice({ accepted: true, emailSent: true }, "en")).toEqual({
      intent: "success",
      message: "Reset link sent. The token is not displayed.",
    });
    expect(passwordResetNotice({ accepted: true, emailSent: false }, "en")).toEqual({
      intent: "warning",
      message: "Reset request accepted, but email delivery was not confirmed. The token is not displayed.",
    });
    expect(passwordResetNotice({ accepted: false, emailSent: false, deliveryError: "Email delivery is not configured" }, "ru")).toEqual({
      intent: "danger",
      message: "Ссылка сброса не отправлена. Email delivery is not configured",
    });
  });
});
