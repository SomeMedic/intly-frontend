import { describe, expect, it } from "vitest";
import { parseResumeList } from "./resume-list-editor";

describe("resume item identity during manual editing", () => {
  const items = [{ id: "python", text: "Python", evidence: "original" }, { id: "fastapi", text: "FastAPI" }, { id: "sql", text: "PostgreSQL" }];
  it("keeps the correct targets after deleting or reordering rows", () => {
    expect(parseResumeList("PostgreSQL\nFastAPI", items)).toEqual([items[2], items[1]]);
  });
  it("keeps an edited row's identity and creates a separate appended item", () => {
    expect(parseResumeList("Python 3\nFastAPI\nPostgreSQL\nRedis\n", items, () => "redis")).toEqual([{ ...items[0], text: "Python 3" }, items[1], items[2], { id: "redis", text: "Redis" }]);
  });
});
