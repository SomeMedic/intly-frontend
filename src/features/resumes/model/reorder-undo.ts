import type { ResumeDocumentJson, ResumeSuggestion } from "../contracts";

export type ReorderUndoReceipt = {
  ownerId: string;
  adaptationId: string;
  suggestionId: string;
  sectionId: ReorderUndoSection;
  beforeOrder: string[];
  afterOrder: string[];
  createdAt: number;
};

export type ReorderUndoStore = {
  capture: (suggestion: ResumeSuggestion, beforeDocument: ResumeDocumentJson, afterDocument: ResumeDocumentJson) => ReorderUndoReceipt | null;
  remove: (suggestionId: string) => void;
  canUndo: (suggestion: ResumeSuggestion, currentDocument: ResumeDocumentJson) => boolean;
  getOrder: (suggestion: ResumeSuggestion, currentDocument: ResumeDocumentJson) => string[] | null;
};

type ReorderUndoSection = "skills" | "experience" | "projects" | "education" | "languages" | "links";
type ReorderUndoStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const listSections: readonly ReorderUndoSection[] = ["skills", "experience", "projects", "education", "languages", "links"];
const storagePrefix = "intly:resume-reorder-undo";
const maxReceiptCount = 100;
const maxSerializedBytes = 64 * 1024;
const fallbackMemory = new Map<string, string>();
const fallbackTombstones = new Set<string>();

export function createReorderUndoStore(input: { ownerId: string; adaptationId: string; storage?: ReorderUndoStorage | null }): ReorderUndoStore {
  const key = reorderUndoStorageKey(input.ownerId, input.adaptationId);
  const storage = usableStorage(input.storage);

  const read = () => readReceipts(storage, key, input.ownerId, input.adaptationId);
  const write = (receipts: ReorderUndoReceipt[]) => writeReceipts(storage, key, receipts);

  return {
    capture(suggestion, beforeDocument, afterDocument) {
      const receipt = buildReorderUndoReceipt({ ownerId: input.ownerId, adaptationId: input.adaptationId, suggestion, beforeDocument, afterDocument });
      if (!receipt) return null;
      const next = [receipt, ...read().filter((item) => item.suggestionId !== receipt.suggestionId)].slice(0, maxReceiptCount);
      write(next);
      return receipt;
    },
    remove(suggestionId) {
      write(read().filter((item) => item.suggestionId !== suggestionId));
    },
    canUndo(suggestion, currentDocument) {
      return undoOrderForSuggestion(read(), suggestion, currentDocument) !== null;
    },
    getOrder(suggestion, currentDocument) {
      return undoOrderForSuggestion(read(), suggestion, currentDocument);
    }
  };
}

export function buildReorderUndoReceipt(input: {
  ownerId: string;
  adaptationId: string;
  suggestion: ResumeSuggestion;
  beforeDocument: ResumeDocumentJson;
  afterDocument: ResumeDocumentJson;
  createdAt?: number;
}): ReorderUndoReceipt | null {
  const sectionId = reorderSectionId(input.suggestion);
  if (!sectionId) return null;
  const beforeOrder = stableItemIds(input.beforeDocument[sectionId]);
  const afterOrder = stableItemIds(input.afterDocument[sectionId]);
  if (!beforeOrder || !afterOrder) return null;
  if (sameOrder(beforeOrder, afterOrder)) return null;
  if (!sameIdSet(beforeOrder, afterOrder)) return null;
  return {
    ownerId: input.ownerId,
    adaptationId: input.adaptationId,
    suggestionId: input.suggestion.id,
    sectionId,
    beforeOrder,
    afterOrder,
    createdAt: input.createdAt ?? Date.now()
  };
}

export function canUndoReorder(receipt: ReorderUndoReceipt, suggestion: ResumeSuggestion, currentDocument: ResumeDocumentJson): boolean {
  return undoOrderForSuggestion([receipt], suggestion, currentDocument) !== null;
}

export function reorderUndoStorageKey(ownerId: string, adaptationId: string): string {
  return `${storagePrefix}:${encodeURIComponent(ownerId)}:${encodeURIComponent(adaptationId)}`;
}

function undoOrderForSuggestion(receipts: ReorderUndoReceipt[], suggestion: ResumeSuggestion, currentDocument: ResumeDocumentJson): string[] | null {
  if (suggestion.status !== "accepted") return null;
  const sectionId = reorderSectionId(suggestion);
  if (!sectionId) return null;
  const receipt = receipts.find((item) => item.suggestionId === suggestion.id && item.sectionId === sectionId);
  if (!receipt) return null;
  const currentOrder = stableItemIds(currentDocument[sectionId]);
  if (!currentOrder || !sameOrder(currentOrder, receipt.afterOrder)) return null;
  return receipt.beforeOrder;
}

function reorderSectionId(suggestion: ResumeSuggestion): ReorderUndoSection | null {
  const proposed = suggestion.proposed ?? {};
  if (isRecord(proposed.document) || isRecord(proposed.documentPatch)) return null;
  const action = stringValue(proposed.action ?? proposed.operation ?? proposed.kind);
  if (action !== "reorder") return null;
  const sectionId = stringValue(proposed.sectionId ?? proposed.section ?? proposed.targetSection);
  return listSections.includes(sectionId as ReorderUndoSection) ? sectionId as ReorderUndoSection : null;
}

function stableItemIds(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const ids = value.map((item) => isRecord(item) ? stringValue(item.id) : undefined);
  if (ids.some((id) => !id)) return null;
  const stableIds = ids as string[];
  return new Set(stableIds).size === stableIds.length ? stableIds : null;
}

function readReceipts(storage: ReorderUndoStorage, key: string, ownerId: string, adaptationId: string): ReorderUndoReceipt[] {
  try {
    const raw = storage.getItem(key);
    if (!raw || raw.length > maxSerializedBytes) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((value) => parseReceipt(value, ownerId, adaptationId)).filter((value): value is ReorderUndoReceipt => value !== null).slice(0, maxReceiptCount);
  } catch {
    return [];
  }
}

function writeReceipts(storage: ReorderUndoStorage, key: string, receipts: ReorderUndoReceipt[]) {
  try {
    const bounded = receipts.slice(0, maxReceiptCount);
    const serialized = JSON.stringify(bounded);
    if (serialized.length > maxSerializedBytes) return;
    if (bounded.length) storage.setItem(key, serialized);
    else storage.removeItem(key);
  } catch {
    fallbackMemory.set(key, JSON.stringify(receipts.slice(0, maxReceiptCount)));
  }
}

function parseReceipt(value: unknown, ownerId: string, adaptationId: string): ReorderUndoReceipt | null {
  if (!isRecord(value) || value.ownerId !== ownerId || value.adaptationId !== adaptationId) return null;
  if (typeof value.suggestionId !== "string" || !value.suggestionId.trim()) return null;
  if (!listSections.includes(value.sectionId as ReorderUndoSection)) return null;
  if (!Array.isArray(value.beforeOrder) || !Array.isArray(value.afterOrder)) return null;
  const beforeOrder = value.beforeOrder.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  const afterOrder = value.afterOrder.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  if (beforeOrder.length !== value.beforeOrder.length || afterOrder.length !== value.afterOrder.length) return null;
  if (!sameIdSet(beforeOrder, afterOrder) || sameOrder(beforeOrder, afterOrder)) return null;
  if (new Set(beforeOrder).size !== beforeOrder.length || new Set(afterOrder).size !== afterOrder.length) return null;
  return {
    ownerId,
    adaptationId,
    suggestionId: value.suggestionId,
    sectionId: value.sectionId as ReorderUndoSection,
    beforeOrder,
    afterOrder,
    createdAt: typeof value.createdAt === "number" && Number.isFinite(value.createdAt) ? value.createdAt : 0
  };
}

function usableStorage(storage: ReorderUndoStorage | null | undefined): ReorderUndoStorage {
  if (!storage) return memoryStorage;
  try {
    const probe = `${storagePrefix}:probe`;
    storage.setItem(probe, "1");
    storage.removeItem(probe);
    return {
      getItem(key) {
        if (fallbackMemory.has(key)) return fallbackMemory.get(key) ?? null;
        if (fallbackTombstones.has(key)) return null;
        try {
          return storage.getItem(key);
        } catch {
          return null;
        }
      },
      setItem(key, value) {
        try {
          storage.setItem(key, value);
          fallbackMemory.delete(key);
          fallbackTombstones.delete(key);
        } catch {
          fallbackMemory.set(key, value);
          fallbackTombstones.delete(key);
        }
      },
      removeItem(key) {
        try {
          storage.removeItem(key);
          fallbackMemory.delete(key);
          fallbackTombstones.delete(key);
        } catch {
          fallbackMemory.delete(key);
          fallbackTombstones.add(key);
        }
      }
    };
  } catch {
    return memoryStorage;
  }
}

const memoryStorage: ReorderUndoStorage = {
  getItem(key) {
    return fallbackMemory.get(key) ?? null;
  },
  setItem(key, value) {
    fallbackMemory.set(key, value);
    fallbackTombstones.delete(key);
  },
  removeItem(key) {
    fallbackMemory.delete(key);
    fallbackTombstones.add(key);
  }
};

function sameIdSet(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false;
  const rightSet = new Set(right);
  return left.every((item) => rightSet.has(item));
}

function sameOrder(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((item, index) => item === right[index]);
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
