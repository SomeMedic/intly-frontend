import type { ApiTokenScope, WebhookEvent } from "../../../types";

export const apiTokenScopes: ApiTokenScope[] = ["read:opportunities", "read:profiles", "read:responses", "read:resumes", "write:responses", "write:resumes"];

export const webhookEvents: WebhookEvent[] = ["opportunity.created", "opportunity.updated", "response.submitted", "resume.ready", "notification.created", "test"];

export function parseWebhookEvents(input: string): WebhookEvent[] {
  return input
    .split(",")
    .map((event) => event.trim())
    .filter((event): event is WebhookEvent => webhookEvents.includes(event as WebhookEvent));
}

export function buildApiTokenCreatePayload(input: { name: string; scopes: ApiTokenScope[]; expiresInDays: number }) {
  return {
    name: input.name.trim(),
    scopes: input.scopes.length ? input.scopes : ["read:opportunities" as ApiTokenScope],
    expiresInDays: Math.min(Math.max(Math.trunc(input.expiresInDays) || 1, 1), 365)
  };
}
