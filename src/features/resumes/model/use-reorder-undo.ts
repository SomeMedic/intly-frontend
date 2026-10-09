"use client";

import { useMemo } from "react";
import type { ResumeDocumentJson, ResumeSuggestion } from "../contracts";
import { createReorderUndoStore } from "./reorder-undo";

type UseReorderUndoInput = {
  ownerId: string;
  adaptationId: string;
};

type UseReorderUndoResult = {
  capture: (suggestion: ResumeSuggestion, beforeDocument: ResumeDocumentJson, afterDocument: ResumeDocumentJson) => void;
  remove: (suggestionId: string) => void;
  canUndo: (suggestion: ResumeSuggestion, currentDocument: ResumeDocumentJson) => boolean;
  getOrder: (suggestion: ResumeSuggestion, currentDocument: ResumeDocumentJson) => string[] | null;
};

export function useReorderUndo({ ownerId, adaptationId }: UseReorderUndoInput): UseReorderUndoResult {
  const storage = safeSessionStorage();
  const store = useMemo(() => createReorderUndoStore({ ownerId, adaptationId, storage }), [adaptationId, ownerId, storage]);
  return {
    capture(suggestion, beforeDocument, afterDocument) {
      store.capture(suggestion, beforeDocument, afterDocument);
    },
    remove: store.remove,
    canUndo: store.canUndo,
    getOrder: store.getOrder
  };
}

function safeSessionStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}
