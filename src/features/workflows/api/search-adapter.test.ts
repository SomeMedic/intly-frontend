import { describe, expect, it } from "vitest";
import { normalizeUnifiedSearchResponse } from "./search-adapter";

describe("normalizeUnifiedSearchResponse", () => {
  it("flattens grouped backend search results without replacing source fields", () => {
    const result = normalizeUnifiedSearchResponse({
      query: "python",
      mode: "hybrid",
      indexAvailable: true,
      groups: {
        opportunities: {
          items: [
            {
              id: "opp-1",
              entityType: "opportunities",
              title: "Senior Python Engineer",
              subtitle: "Remote",
              excerpt: "FastAPI and scraping",
              score: 0.92,
              url: "/opportunities/opp-1",
              payload: { source: "hh" }
            }
          ],
          nextCursor: null
        },
        tasks: {
          items: [
            {
              id: "task-1",
              entityType: "tasks",
              title: "Reply to customer",
              url: "/tasks?taskId=task-1"
            }
          ],
          nextCursor: "tasks-next"
        }
      }
    });

    expect(result).toEqual({
      items: [
        {
          id: "opp-1",
          type: "opportunities",
          title: "Senior Python Engineer",
          subtitle: "Remote",
          href: "/opportunities/opp-1",
          score: 0.92,
          excerpt: "FastAPI and scraping",
          preview: { source: "hh" }
        },
        {
          id: "task-1",
          type: "tasks",
          title: "Reply to customer",
          subtitle: undefined,
          href: "/tasks?taskId=task-1",
          score: undefined,
          excerpt: undefined,
          preview: undefined
        }
      ],
      nextCursor: "tasks-next"
    });
  });

  it("returns an empty list when grouped search has no items", () => {
    expect(normalizeUnifiedSearchResponse({ groups: { opportunities: { items: [], nextCursor: null }, knowledge: undefined } })).toEqual({
      items: [],
      nextCursor: null
    });
  });

  it("preserves the previous flat list response shape", () => {
    expect(normalizeUnifiedSearchResponse([{ id: "legacy-1", type: "opportunity", title: "Legacy", href: "/opportunities/legacy-1" }])).toEqual({
      items: [{ id: "legacy-1", type: "opportunity", title: "Legacy", href: "/opportunities/legacy-1" }],
      nextCursor: null
    });
  });
});
