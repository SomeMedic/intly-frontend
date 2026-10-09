import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SseClient, type SseConnectionState } from "./client";
import { setAccessToken } from "../auth/token-store";

const encoder = new TextEncoder();

describe("SseClient", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setAccessToken("token");
  });

  afterEach(() => {
    setAccessToken(null);
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("parses multiline data while ignoring heartbeats and malformed events", async () => {
    const events: unknown[] = [];
    const client = new SseClient({
      fetchFn: vi.fn().mockResolvedValue(sseResponse([
        ":heartbeat\n\n",
        "data: {\"type\":\"ai.run.progress\",\n",
        "data: \"timestamp\":\"2026-10-03T00:00:00.000Z\",\"payload\":{\"runId\":\"run-1\"}}\n\n",
        "data: not-json\n\n",
        "data: null\n\n",
        "data: 42\n\n",
        "data: {\"payload\":{\"heartbeat\":true}}\n\n",
      ])),
      onEvent: event => events.push(event),
      retryBaseMs: 10,
    });

    client.connect();
    await vi.waitFor(() => expect(events).toHaveLength(1));

    expect(events[0]).toMatchObject({ type: "ai.run.progress", payload: { runId: "run-1" } });
    client.disconnect();
  });

  it("reconnects after a clean EOF", async () => {
    const fetchFn = vi.fn()
      .mockResolvedValueOnce(sseResponse([]))
      .mockImplementation(() => new Promise<Response>(() => {}));
    const states: SseConnectionState[] = [];
    const client = new SseClient({ fetchFn, onEvent: () => {}, onStateChange: state => states.push(state), retryBaseMs: 10 });

    client.connect();
    await settle();
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(1);
    await vi.advanceTimersByTimeAsync(10);

    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(states).toContain("connected");
    client.disconnect();
  });

  it("reconnects after stream read errors and reports offline state", async () => {
    const fetchFn = vi.fn()
      .mockResolvedValueOnce(new Response(errorStream(), { status: 200, headers: { "Content-Type": "text/event-stream" } }))
      .mockImplementation(() => new Promise<Response>(() => {}));
    const states: SseConnectionState[] = [];
    const client = new SseClient({ fetchFn, onEvent: () => {}, onStateChange: state => states.push(state), retryBaseMs: 10 });

    client.connect();
    await settle();
    expect(states).toContain("offline");
    await vi.advanceTimersByTimeAsync(10);

    expect(fetchFn).toHaveBeenCalledTimes(2);
    client.disconnect();
  });


  it("opens automatically when a token arrives after initial hydration", async () => {
    setAccessToken(null);
    const states: SseConnectionState[] = [];
    const fetchFn = vi.fn().mockImplementation(() => new Promise<Response>(() => {}));
    const client = new SseClient({ fetchFn, onEvent: () => {}, onStateChange: state => states.push(state), retryBaseMs: 10 });

    client.connect();
    await settle();
    expect(fetchFn).not.toHaveBeenCalled();
    expect(states).toContain("offline");

    setAccessToken("late-token");
    await settle();

    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn.mock.calls[0]?.[1]?.headers).toMatchObject({ Authorization: "Bearer late-token" });
    expect(states).toContain("connecting");
    client.disconnect();
  });

  it("aborts and reopens with the new token on token rotation", async () => {
    const first = pendingSseResponse();
    const second = pendingSseResponse();
    const fetchFn = vi.fn()
      .mockResolvedValueOnce(first.response)
      .mockResolvedValueOnce(second.response);
    const events: unknown[] = [];
    const client = new SseClient({ fetchFn, onEvent: event => events.push(event), retryBaseMs: 10 });

    client.connect();
    await settle();
    expect(fetchFn).toHaveBeenCalledTimes(1);
    const firstSignal = fetchFn.mock.calls[0]?.[1]?.signal as AbortSignal;

    setAccessToken("rotated-token");
    await settle();

    expect(firstSignal.aborted).toBe(true);
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(fetchFn.mock.calls[1]?.[1]?.headers).toMatchObject({ Authorization: "Bearer rotated-token" });

    first.controller.enqueue(encoder.encode("data: {\"type\":\"pipeline.changed\",\"payload\":{}}\n\n"));
    await settle();
    expect(events).toEqual([]);
    client.disconnect();
  });

  it("clears reconnect timers and stays offline when the token is cleared", async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response(null, { status: 503 }));
    const states: SseConnectionState[] = [];
    const client = new SseClient({ fetchFn, onEvent: () => {}, onStateChange: state => states.push(state), retryBaseMs: 10 });

    client.connect();
    await settle();
    expect(vi.getTimerCount()).toBe(1);

    setAccessToken(null);
    await vi.advanceTimersByTimeAsync(10);

    expect(vi.getTimerCount()).toBe(0);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(states.at(-1)).toBe("offline");
    client.disconnect();
  });

  it("unsubscribes on disconnect so a later token does not reopen", async () => {
    setAccessToken(null);
    const fetchFn = vi.fn().mockImplementation(() => new Promise<Response>(() => {}));
    const client = new SseClient({ fetchFn, onEvent: () => {}, retryBaseMs: 10 });

    client.connect();
    await settle();
    client.disconnect();
    setAccessToken("after-disconnect");
    await settle();

    expect(fetchFn).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("clears reconnect timers on disconnect", async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response(null, { status: 503 }));
    const client = new SseClient({ fetchFn, onEvent: () => {}, retryBaseMs: 10 });

    client.connect();
    await settle();
    expect(vi.getTimerCount()).toBe(1);
    client.disconnect();
    await vi.advanceTimersByTimeAsync(10);

    expect(vi.getTimerCount()).toBe(0);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("does not deliver events after disconnect while a read is pending", async () => {
    const pending = pendingSseResponse();
    const events: unknown[] = [];
    const client = new SseClient({ fetchFn: vi.fn().mockResolvedValue(pending.response), onEvent: event => events.push(event), retryBaseMs: 10 });

    client.connect();
    await settle();
    client.disconnect();
    pending.controller.enqueue(encoder.encode("data: {\"type\":\"ai.run.progress\",\"timestamp\":\"2026-10-03T00:00:00.000Z\",\"payload\":{\"runId\":\"late\"}}\n\n"));
    pending.controller.close();
    await settle();

    expect(events).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
  });
});

function sseResponse(chunks: string[]): Response {
  return new Response(new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  }), { status: 200, headers: { "Content-Type": "text/event-stream" } });
}

function errorStream(): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    pull() {
      throw new Error("stream failed");
    },
  });
}

function pendingSseResponse(): { response: Response; controller: ReadableStreamDefaultController<Uint8Array> } {
  let controller: ReadableStreamDefaultController<Uint8Array> | undefined;
  const response = new Response(new ReadableStream<Uint8Array>({
    start(streamController) {
      controller = streamController;
    },
  }), { status: 200, headers: { "Content-Type": "text/event-stream" } });
  if (!controller) throw new Error("stream controller was not initialized");
  return { response, controller };
}

async function settle() {
  for (let index = 0; index < 8; index += 1) await Promise.resolve();
}
