import { describe, expect, it } from "vitest";
import { flattenSearchResponse, nextSelectedIndex, scopeForCategory } from "./model";

describe("global search model", () => {
  it("flattens backend grouped results while preserving safe routes", () => {
    const result = flattenSearchResponse({
      query: "python",
      groups: {
        opportunities: {
          items: [
            { id: "opp-1", entityType: "opportunities", title: "Senior Python", subtitle: "Remote", url: "/opportunities/opp-1" },
            { id: "legacy-1", type: "opportunity", title: "Legacy shape" }
          ]
        },
        tasks: {
          items: [{ id: "task-1", entityType: "tasks", title: "Prepare response" }]
        }
      }
    });

    expect(result.flat.map((item) => [item.scope, item.href, item.title])).toEqual([
      ["opportunities", "/opportunities/opp-1", "Senior Python"],
      ["opportunities", "/opportunities/legacy-1", "Legacy shape"],
      ["tasks", "/tasks/task-1", "Prepare response"]
    ]);
  });

  it("keeps scoped results scoped and supports the old flat response during transition", () => {
    const result = flattenSearchResponse({
      query: "portfolio",
      items: [
        { id: "profile-1", type: "profile", title: "AI profile", href: "/profiles/profile-1" },
        { id: "doc-1", type: "knowledge", title: "Portfolio notes" }
      ]
    }, "profiles");

    expect(result.flat).toHaveLength(1);
    expect(result.flat[0]).toMatchObject({ scope: "profiles", href: "/profiles/profile-1" });
    expect(result.byScope.knowledge[0]).toMatchObject({ href: "/knowledge/documents/doc-1" });
  });

  it("cycles keyboard selection predictably", () => {
    expect(nextSelectedIndex(-1, 3, 1)).toBe(0);
    expect(nextSelectedIndex(-1, 3, -1)).toBe(2);
    expect(nextSelectedIndex(2, 3, 1)).toBe(0);
    expect(nextSelectedIndex(0, 3, -1)).toBe(2);
    expect(nextSelectedIndex(0, 0, 1)).toBe(-1);
  });

  it("maps quick categories to supported backend search scopes", () => {
    expect(scopeForCategory("vacancies")).toBe("opportunities");
    expect(scopeForCategory("freelance")).toBe("opportunities");
    expect(scopeForCategory("tenders")).toBe("opportunities");
    expect(scopeForCategory("tasks")).toBe("tasks");
    expect(scopeForCategory("unknown")).toBe("all");
  });
});
