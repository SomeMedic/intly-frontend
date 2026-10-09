export type ApiList<T> = {
  items: T[];
  nextCursor: string | null;
  total?: number;
};

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    requestId?: string;
    details?: unknown;
  };
};

export type DeleteResult = {
  success: true;
};

export type SseEvent<TPayload = Record<string, unknown>> = {
  id?: string;
  type: string;
  timestamp: string;
  payload: TPayload;
};
