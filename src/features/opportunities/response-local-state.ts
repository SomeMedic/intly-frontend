import type { JSONContent } from "@tiptap/react";
import type { RichTextSelection } from "@/components/intly/rich-text-editor";
import type { EditorTarget, EditorTool } from "./response-panel-state";

export type ResponseRecoverySnapshot = {
  document: JSONContent;
  text: string;
  baseRevision: number;
  updatedAt: number;
};

export type ResponsePendingTransform = {
  runId: string;
  baseRevision: number;
  localVersion: number;
  target: EditorTarget;
  tool: EditorTool;
  instruction: string;
  selection?: RichTextSelection;
};

const MAX_DOCUMENT_BYTES = 1024 * 1024;
const MAX_TEXT_BYTES = 1024 * 1024;
const MAX_DEPTH = 40;
const MAX_NODE_COUNT = 5000;
const MAX_STRING_LENGTH = 200000;
const MAX_INSTRUCTION_LENGTH = 4000;
const RECOVERY_KIND = "recovery";
const TRANSFORM_KIND = "pending-transform";
const tools: readonly EditorTool[] = ["rewriteSelection", "replaceBlock", "regenerateBlock", "shortenBlock", "changeTone", "emphasizeFact", "insertBefore", "insertAfter", "addParagraph", "removeBlock", "updateHeading", "replaceDocument"];

export function responseLocalStorage(): Storage | undefined {
  try { return typeof window === "undefined" ? undefined : window.localStorage; } catch { return undefined; }
}

export function readResponseRecovery(source: Storage | undefined, ownerId: string, draftId: string): ResponseRecoverySnapshot | null {
  const parsed = readJson(source, key(ownerId, draftId, RECOVERY_KIND));
  return isRecoverySnapshot(parsed) ? parsed : null;
}

export function writeResponseRecovery(source: Storage | undefined, ownerId: string, draftId: string, snapshot: ResponseRecoverySnapshot): boolean {
  if (!isRecoverySnapshot(snapshot)) return false;
  return writeJson(source, key(ownerId, draftId, RECOVERY_KIND), snapshot);
}

export function clearResponseRecovery(source: Storage | undefined, ownerId: string, draftId: string, expectedUpdatedAt?: number): boolean {
  if (expectedUpdatedAt !== undefined) {
    const current = readResponseRecovery(source, ownerId, draftId);
    if (current && current.updatedAt !== expectedUpdatedAt) return false;
  }
  return remove(source, key(ownerId, draftId, RECOVERY_KIND));
}

export function readPendingResponseTransform(source: Storage | undefined, ownerId: string, draftId: string): ResponsePendingTransform | null {
  const parsed = readJson(source, key(ownerId, draftId, TRANSFORM_KIND));
  return isPendingTransform(parsed) ? parsed : null;
}

export function writePendingResponseTransform(source: Storage | undefined, ownerId: string, draftId: string, job: ResponsePendingTransform): boolean {
  if (!isPendingTransform(job)) return false;
  return writeJson(source, key(ownerId, draftId, TRANSFORM_KIND), job);
}

export function clearPendingResponseTransform(source: Storage | undefined, ownerId: string, draftId: string): boolean {
  return remove(source, key(ownerId, draftId, TRANSFORM_KIND));
}

function readJson(source: Storage | undefined, itemKey: string): unknown {
  try {
    const raw = source?.getItem(itemKey);
    if (!raw || byteLength(raw) > MAX_DOCUMENT_BYTES + MAX_TEXT_BYTES) return null;
    return JSON.parse(raw) as unknown;
  } catch { return null; }
}

function writeJson(source: Storage | undefined, itemKey: string, value: unknown): boolean {
  try {
    const raw = JSON.stringify(value);
    if (byteLength(raw) > MAX_DOCUMENT_BYTES + MAX_TEXT_BYTES) return false;
    source?.setItem(itemKey, raw);
    return !!source;
  } catch { return false; }
}

function remove(source: Storage | undefined, itemKey: string): boolean {
  try {
    source?.removeItem(itemKey);
    return !!source;
  } catch { return false; }
}

function key(ownerId: string, draftId: string, kind: string) {
  return `intly:response:${encodeURIComponent(ownerId)}:${encodeURIComponent(draftId)}:${kind}`;
}

function isRecoverySnapshot(value: unknown): value is ResponseRecoverySnapshot {
  if (!isRecord(value)) return false;
  return isDocJson(value.document)
    && byteLength(JSON.stringify(value.document)) <= MAX_DOCUMENT_BYTES
    && typeof value.text === "string"
    && byteLength(value.text) <= MAX_TEXT_BYTES
    && isNonNegativeInteger(value.baseRevision)
    && isPositiveInteger(value.updatedAt);
}

function isPendingTransform(value: unknown): value is ResponsePendingTransform {
  if (!isRecord(value)) return false;
  return typeof value.runId === "string"
    && value.runId.length > 0
    && value.runId.length <= 200
    && isNonNegativeInteger(value.baseRevision)
    && isNonNegativeInteger(value.localVersion)
    && isEditorTarget(value.target)
    && typeof value.tool === "string"
    && tools.includes(value.tool as EditorTool)
    && typeof value.instruction === "string"
    && value.instruction.trim().length > 0
    && value.instruction.length <= MAX_INSTRUCTION_LENGTH
    && (value.selection === undefined || isRichTextSelection(value.selection));
}

function isDocJson(value: unknown): value is JSONContent {
  if (!isRecord(value) || value.type !== "doc" || !Array.isArray(value.content)) return false;
  return boundedJson(value, 0, { count: 0 });
}

function boundedJson(value: unknown, depth: number, state: { count: number }): boolean {
  if (depth > MAX_DEPTH || ++state.count > MAX_NODE_COUNT) return false;
  if (value === null || typeof value === "number" || typeof value === "boolean") return true;
  if (typeof value === "string") return value.length <= MAX_STRING_LENGTH;
  if (Array.isArray(value)) return value.every((item) => boundedJson(item, depth + 1, state));
  if (!isRecord(value)) return false;
  return Object.entries(value).every(([entryKey, entryValue]) => entryKey.length <= 100 && boundedJson(entryValue, depth + 1, state));
}

function isEditorTarget(value: unknown): value is EditorTarget {
  if (!isRecord(value)) return false;
  if (value.kind === "document") return true;
  if (value.kind === "block") return typeof value.blockId === "string" && value.blockId.trim().length > 0 && value.blockId.length <= 200;
  if (value.kind !== "selection") return false;
  return typeof value.selectionText === "string"
    && value.selectionText.trim().length > 0
    && value.selectionText.length <= MAX_STRING_LENGTH
    && (value.surroundingText === undefined || (typeof value.surroundingText === "string" && value.surroundingText.length <= MAX_STRING_LENGTH))
    && (value.blockId === undefined || (typeof value.blockId === "string" && value.blockId.length <= 200));
}

function isRichTextSelection(value: unknown): value is RichTextSelection {
  if (!isRecord(value)) return false;
  return isNonNegativeInteger(value.from)
    && isNonNegativeInteger(value.to)
    && value.to > value.from
    && typeof value.text === "string"
    && value.text.trim().length > 0
    && value.text.length <= MAX_STRING_LENGTH
    && (value.surroundingText === undefined || (typeof value.surroundingText === "string" && value.surroundingText.length <= MAX_STRING_LENGTH))
    && (value.blockId === undefined || (typeof value.blockId === "string" && value.blockId.length <= 200));
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}
