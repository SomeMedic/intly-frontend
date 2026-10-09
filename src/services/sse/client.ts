import type { SseEvent } from "@/types";
import { getAccessToken, subscribeAccessToken } from "../auth/token-store";

type SseClientOptions = {
  onEvent: (event: SseEvent) => void;
  onStateChange?: (state: SseConnectionState) => void;
  retryBaseMs?: number;
  retryMaxMs?: number;
  fetchFn?: typeof fetch;
};

export type SseConnectionState = "idle" | "connecting" | "connected" | "reconnecting" | "degraded" | "offline";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";

export class SseClient {
  private abortController: AbortController | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private retryAttempt = 0;
  private state: SseConnectionState = "idle";
  private closed = true;
  private currentToken: string | null = null;
  private unsubscribeToken: (() => void) | null = null;

  constructor(private readonly options: SseClientOptions) {}

  connect() {
    if (!this.unsubscribeToken) this.unsubscribeToken = subscribeAccessToken(this.handleTokenChange);
    if (this.abortController || this.reconnectTimer) return;
    this.closed = false;
    this.open();
  }

  disconnect() {
    this.closed = true;
    this.unsubscribeToken?.();
    this.unsubscribeToken = null;
    this.clearReconnectTimer();
    this.abortController?.abort();
    this.abortController = null;
    this.currentToken = null;
    this.retryAttempt = 0;
    this.setState("idle");
  }

  private readonly handleTokenChange = (token: string | null) => {
    if (this.closed) return;

    if (!token) {
      this.clearReconnectTimer();
      this.abortController?.abort();
      this.abortController = null;
      this.currentToken = null;
      this.retryAttempt = 0;
      this.setState("offline");
      return;
    }

    if (this.currentToken && this.currentToken !== token) {
      this.clearReconnectTimer();
      this.abortController?.abort();
      this.abortController = null;
      this.currentToken = null;
      this.retryAttempt = 0;
      this.open();
      return;
    }

    if (!this.abortController && !this.reconnectTimer) this.open();
  };

  private setState(state: SseConnectionState) {
    this.state = state;
    this.options.onStateChange?.(state);
  }

  private clearReconnectTimer() {
    if (!this.reconnectTimer) return;
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }

  private async open() {
    const token = getAccessToken();
    if (!token || this.closed) {
      this.setState("offline");
      return;
    }

    this.currentToken = token;
    const controller = new AbortController();
    this.abortController = controller;
    this.setState(this.retryAttempt > 0 ? "reconnecting" : "connecting");

    try {
      const fetchFn = this.options.fetchFn ?? fetch;
      const response = await fetchFn(`${API_BASE_URL}/events`, {
        headers: {
          Accept: "text/event-stream",
          Authorization: `Bearer ${token}`
        },
        signal: controller.signal
      });

      if (controller.signal.aborted || this.closed) return;

      if (!response.ok || !response.body) {
        this.setState(response.status >= 500 ? "degraded" : "offline");
        this.scheduleReconnect(controller);
        return;
      }

      this.retryAttempt = 0;
      this.setState("connected");
      await this.readStream(response.body, controller);
    } catch {
      if (controller.signal.aborted || this.closed) return;
      this.setState("offline");
      this.scheduleReconnect(controller);
    }
  }

  private scheduleReconnect(controller: AbortController) {
    if (this.closed || controller.signal.aborted || this.abortController !== controller) return;
    this.abortController = null;
    this.setState("reconnecting");
    const delay = Math.min(this.options.retryMaxMs ?? 30000, (this.options.retryBaseMs ?? 1000) * 2 ** this.retryAttempt);
    this.retryAttempt += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.open();
    }, delay);
  }

  private async readStream(body: ReadableStream<Uint8Array>, controller: AbortController) {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (!controller.signal.aborted && !this.closed) {
        const { value, done } = await reader.read();
        if (controller.signal.aborted || this.closed || this.abortController !== controller) break;
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split(/\r?\n\r?\n/);
        buffer = chunks.pop() ?? "";

        for (const chunk of chunks) {
          const event = parseSseChunk(chunk);
          if (event) this.options.onEvent(event);
        }
      }
    } catch {
      if (!controller.signal.aborted && !this.closed) this.setState("offline");
    } finally {
      reader.releaseLock();
    }

    this.scheduleReconnect(controller);
  }
}

function parseSseChunk(chunk: string): SseEvent | null {
  const data: string[] = [];
  for (const line of chunk.split(/\r?\n/)) {
    if (!line || line.startsWith(":")) continue;
    const separator = line.indexOf(":");
    const field = separator >= 0 ? line.slice(0, separator) : line;
    const rawValue = separator >= 0 ? line.slice(separator + 1) : "";
    const value = rawValue.startsWith(" ") ? rawValue.slice(1) : rawValue;
    if (field === "data") data.push(value);
  }
  if (!data.length) return null;
  try {
    const parsed = JSON.parse(data.join("\n")) as unknown;
    return isSseEvent(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function isSseEvent(value: unknown): value is SseEvent {
  return typeof value === "object"
    && value !== null
    && !Array.isArray(value)
    && typeof (value as { type?: unknown }).type === "string";
}
