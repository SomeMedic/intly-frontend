import { describe, expect, it } from "vitest";
import { createSharedRefresh } from "./refresh-coordinator";

describe("createSharedRefresh", () => {
  it("shares one in-flight refresh across concurrent callers and resets after completion", async () => {
    let calls = 0;
    const refresh = createSharedRefresh(async () => {
      calls += 1;
      await new Promise((resolve) => setTimeout(resolve, 5));
      return { accessToken: `token-${calls}` };
    });

    const [first, second] = await Promise.all([refresh(), refresh()]);
    expect(first).toBe(second);
    expect(first.accessToken).toBe("token-1");
    expect(calls).toBe(1);

    const third = await refresh();
    expect(third.accessToken).toBe("token-2");
    expect(calls).toBe(2);
  });
});
