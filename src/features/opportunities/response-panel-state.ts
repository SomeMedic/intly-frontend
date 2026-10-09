import type { JSONContent } from "@tiptap/react";
import type { RichTextSelection } from "@/components/intly/rich-text-editor";
import { RESPONSE_SEMANTIC_BLOCK_TYPES, markdownToDocument, normalizeRichTextDocument, sanitizeLinkHref, semanticBlockType } from "../../components/intly/rich-text-editor/model";
import type { OpportunityLocale } from "./opportunity-workspace-labels";
import type { TenderApplicationSection } from "./response-tender-sections";

export type ResponseChecklistItem = {
  id: string;
  label: string;
  description: string;
  required: boolean;
  checked: boolean;
};

export type ResponseChecklist = {
  items: ResponseChecklistItem[];
  complete: boolean;
};

export const REQUIRED_RESPONSE_CHECKLIST_ITEMS: ResponseChecklistItem[] = [
  { id: "factsChecked", label: "Факты проверены", description: "Опыт, сроки, цифры и обещания в тексте соответствуют профилю и возможностям.", required: true, checked: false },
  { id: "requirementsCovered", label: "Требования закрыты", description: "Текст отвечает на ключевые требования вакансии, заказа или тендера.", required: true, checked: false },
  { id: "noUnresolvedPlaceholders", label: "Нет незаполненных мест", description: "В тексте не осталось плейсхолдеров, подсказок и спорных AI-предложений.", required: true, checked: false },
  { id: "userReviewed", label: "Проверено человеком", description: "Вы перечитали итоговый текст и готовы использовать его вне INTLY.", required: true, checked: false },
];

const REQUIRED_RESPONSE_CHECKLIST_ITEM_LABELS: Record<OpportunityLocale, Record<string, Pick<ResponseChecklistItem, "label" | "description">>> = {
  ru: {
    factsChecked: { label: "Факты проверены", description: "Опыт, сроки, цифры и обещания в тексте соответствуют профилю и возможностям." },
    requirementsCovered: { label: "Требования закрыты", description: "Текст отвечает на ключевые требования вакансии, заказа или тендера." },
    noUnresolvedPlaceholders: { label: "Нет незаполненных мест", description: "В тексте не осталось плейсхолдеров, подсказок и спорных AI-предложений." },
    userReviewed: { label: "Проверено человеком", description: "Вы перечитали итоговый текст и готовы использовать его вне INTLY." }
  },
  en: {
    factsChecked: { label: "Facts checked", description: "Experience, dates, numbers, and promises in the text match the profile and opportunity." },
    requirementsCovered: { label: "Requirements covered", description: "The text answers the key requirements of the vacancy, project, or tender." },
    noUnresolvedPlaceholders: { label: "No unresolved placeholders", description: "The text has no placeholders, prompts, or disputed AI suggestions left." },
    userReviewed: { label: "Reviewed by a human", description: "You have reread the final text and are ready to use it outside INTLY." }
  }
};

export type EditorTarget =
  | { kind: "selection"; selectionText: string; surroundingText?: string; blockId?: string }
  | { kind: "block"; blockId: string }
  | { kind: "document" };

export type EditorTool = "rewriteSelection" | "replaceBlock" | "regenerateBlock" | "shortenBlock" | "changeTone" | "emphasizeFact" | "insertBefore" | "insertAfter" | "addParagraph" | "removeBlock" | "updateHeading" | "replaceDocument";

export type RewriteSelectionOperation = {
  tool: "rewriteSelection";
  baseRevision: number;
  target: Extract<EditorTarget, { kind: "selection" }>;
  content: { text: string };
  explanation?: string;
};

type ReplaceBlockOperation = {
  tool: "replaceBlock";
  baseRevision: number;
  target: Extract<EditorTarget, { kind: "block" }>;
  content: { nodeType?: string; text: string };
  explanation?: string;
};

type SimpleTextOperation = {
  tool: Exclude<EditorTool, "rewriteSelection" | "replaceBlock" | "removeBlock" | "replaceDocument">;
  baseRevision: number;
  target: EditorTarget;
  content: { nodeType?: string; text: string };
  explanation?: string;
};

type RemoveBlockOperation = {
  tool: "removeBlock";
  baseRevision: number;
  target: Extract<EditorTarget, { kind: "block" }>;
  explanation?: string;
};

type ReplaceDocumentOperation = {
  tool: "replaceDocument";
  baseRevision: number;
  target: Extract<EditorTarget, { kind: "document" }>;
  content: { documentJson?: JSONContent; markdown?: string };
  explanation?: string;
};

export type EditorOperation = RewriteSelectionOperation | ReplaceBlockOperation | SimpleTextOperation | RemoveBlockOperation | ReplaceDocumentOperation;

export type EditorTransformOutput = {
  draftId: string;
  baseRevision: number;
  explanation: string;
  operations: EditorOperation[];
};

export type ResponseEditorBlock = {
  id: string;
  index: number;
  nodeType: string;
  semanticType?: string;
  text: string;
};

export type OperationPreview = {
  before: string;
  after: string;
  changed: boolean;
  valid: boolean;
  reason?: string;
};

export type ReadinessInput = {
  hydrated: boolean;
  text: string;
  checklist: ResponseChecklist;
  unresolvedPlaceholders: string[];
  hasUnresolvedSuggestion: boolean;
  generationStatus?: string;
  tenderSections?: TenderApplicationSection[];
  tenderSectionsValid?: boolean;
};

export type ReadinessIssueTarget =
  | { kind: "editor" }
  | { kind: "placeholder"; value: string }
  | { kind: "checklist"; itemId: string }
  | { kind: "suggestion" }
  | { kind: "generation" }
  | { kind: "tender-section"; sectionType: TenderApplicationSection["type"] };

export type ReadinessIssue = {
  id: string;
  message: string;
  target?: ReadinessIssueTarget;
};

export function shouldHydrateFromServer(input: { hydrated: boolean; localVersion: number; savedVersion: number; userEdited: boolean }): boolean {
  return input.hydrated && !input.userEdited && input.localVersion === input.savedVersion;
}

export function shouldAutosaveDraft(input: { hydrated: boolean; saveState: string; userEdited: boolean }): boolean {
  return input.hydrated && input.userEdited && input.saveState === "dirty";
}

export type ResponseNavigationClickTarget = {
  actionable: boolean;
  insideWrapper: boolean;
  targetBlank?: boolean;
  sameHref?: boolean;
  download?: boolean;
};

export function shouldInterceptResponseNavigationClick(input: {
  allowNavigation: boolean;
  defaultPrevented: boolean;
  button: number;
  modifierKey: boolean;
  target: ResponseNavigationClickTarget;
  hasPendingJob: boolean;
  hasUnsavedChanges: boolean;
}): boolean {
  if (input.allowNavigation || input.defaultPrevented || input.button !== 0 || input.modifierKey) return false;
  if (!input.target.actionable || input.target.insideWrapper || input.target.targetBlank || input.target.sameHref || input.target.download) return false;
  return input.hasPendingJob || input.hasUnsavedChanges;
}

export function normalizeResponseChecklist(value: unknown, locale: OpportunityLocale = "ru"): ResponseChecklist {
  const byId = new Map<string, Partial<ResponseChecklistItem>>();
  if (isRecord(value)) {
    for (const item of REQUIRED_RESPONSE_CHECKLIST_ITEMS) {
      if (value[item.id] === true) byId.set(item.id, { checked: true });
    }
    const items = value.items;
    if (Array.isArray(items)) {
      for (const item of items) {
        if (!isRecord(item) || typeof item.id !== "string") continue;
        byId.set(item.id, {
          ...byId.get(item.id),
          label: typeof item.label === "string" ? item.label : undefined,
          description: typeof item.description === "string" ? item.description : undefined,
          required: typeof item.required === "boolean" ? item.required : undefined,
          checked: byId.get(item.id)?.checked === true || item.checked === true || item.status === "done" || item.status === "passed",
        });
      }
    }
  }
  const requiredItems = REQUIRED_RESPONSE_CHECKLIST_ITEMS.map((item) => {
    const existing = byId.get(item.id);
    const localized = REQUIRED_RESPONSE_CHECKLIST_ITEM_LABELS[locale][item.id] ?? item;
    byId.delete(item.id);
    return {
      ...item,
      ...localized,
      id: item.id,
      required: true,
      checked: existing?.checked === true,
    };
  });
  const extraItems = Array.from(byId.entries()).map(([id, item]) => ({
    id,
    label: item.label ?? id,
    description: item.description ?? (locale === "ru" ? "Дополнительная проверка" : "Additional check"),
    required: item.required !== false,
    checked: item.checked === true,
  }));
  const checklist = { items: [...requiredItems, ...extraItems], complete: false };
  checklist.complete = checklist.items.every((item) => !item.required || item.checked);
  return checklist;
}

export function serializeResponseChecklist(checklist: ResponseChecklist): Record<string, unknown> {
  const payload: Record<string, unknown> = { complete: checklist.complete, items: checklist.items };
  for (const item of REQUIRED_RESPONSE_CHECKLIST_ITEMS) {
    payload[item.id] = checklist.items.find((candidate) => candidate.id === item.id)?.checked === true;
  }
  return payload;
}

export function withChecklistItem(checklist: ResponseChecklist, id: string, checked: boolean): ResponseChecklist {
  const items = checklist.items.map((item) => item.id === id ? { ...item, checked } : item);
  return { items, complete: items.every((item) => !item.required || item.checked) };
}

export function responseReadinessIssues(input: ReadinessInput, locale: OpportunityLocale = "ru"): ReadinessIssue[] {
  const issues: ReadinessIssue[] = [];
  if (!input.hydrated) {
    issues.push({ id: "draft-loading", message: locale === "ru" ? "Дождитесь загрузки актуального черновика" : "Wait for the current draft to load" });
  }
  if (!input.text.trim()) {
    issues.push({ id: "empty-text", message: locale === "ru" ? "Добавьте текст отклика" : "Add response text", target: { kind: "editor" } });
  }
  if (input.tenderSectionsValid === false) {
    issues.push({ id: "tender-sections-config", message: locale === "ru" ? "Не удалось прочитать требования к разделам заявки. Сообщите администратору." : "The required application sections could not be read. Contact an administrator." });
  }
  for (const section of input.tenderSections ?? []) {
    if (!section.complete) issues.push({
      id: `tender-section:${section.type}`,
      message: locale === "ru" ? `Заполните раздел «${section.label}»` : `Complete the “${section.label}” section`,
      target: { kind: "tender-section", sectionType: section.type },
    });
  }
  for (const item of input.checklist.items) {
    if (item.required && !item.checked) {
      issues.push({ id: `checklist:${item.id}`, message: locale === "ru" ? `Подтвердите: ${item.label.toLowerCase()}` : `Confirm: ${item.label.toLowerCase()}`, target: { kind: "checklist", itemId: item.id } });
    }
  }
  if (input.unresolvedPlaceholders.length) {
    issues.push({
      id: `placeholders:${input.unresolvedPlaceholders.join("|")}`,
      message: locale === "ru" ? `Заполните плейсхолдеры: ${input.unresolvedPlaceholders.join(", ")}` : `Fill placeholders: ${input.unresolvedPlaceholders.join(", ")}`,
      target: { kind: "placeholder", value: input.unresolvedPlaceholders[0] ?? "" },
    });
  }
  if (input.hasUnresolvedSuggestion) {
    issues.push({ id: "unresolved-suggestion", message: locale === "ru" ? "Примените или отклоните AI-правку" : "Apply or dismiss the AI suggestion", target: { kind: "suggestion" } });
  }
  if (input.generationStatus === "stale") {
    issues.push({ id: "stale-generation", message: locale === "ru" ? "Перезапустите или проигнорируйте устаревшую AI-генерацию после проверки текста" : "Restart or ignore the outdated AI generation after reviewing the text", target: { kind: "generation" } });
  }
  return issues;
}

export function responseReadinessBlockers(input: ReadinessInput, locale: OpportunityLocale = "ru"): string[] {
  return responseReadinessIssues(input, locale).map((issue) => issue.message);
}

export function rewriteSelectionOperationText(operation: RewriteSelectionOperation): string {
  return operation.content.text;
}

export function editorTransformOutput(output: Record<string, unknown> | undefined, expectedDraftId: string, expectedBaseRevision: number): EditorTransformOutput | null {
  if (!isRecord(output)) return null;
  if (output.draftId !== expectedDraftId || output.baseRevision !== expectedBaseRevision || typeof output.explanation !== "string") return null;
  if (!Array.isArray(output.operations)) return null;
  if (!output.operations.every((item) => isEditorOperation(item, expectedBaseRevision))) return null;
  const operations = output.operations as EditorOperation[];
  if (operations.length === 0) return null;
  return { draftId: expectedDraftId, baseRevision: expectedBaseRevision, explanation: output.explanation, operations };
}

export function parseEditorTransformOperations(output: Record<string, unknown> | undefined, expectedDraftId: string, expectedBaseRevision: number): EditorOperation[] {
  return editorTransformOutput(output, expectedDraftId, expectedBaseRevision)?.operations ?? [];
}

export function parseRewriteSelectionOperations(output: Record<string, unknown> | undefined, expectedDraftId: string, expectedBaseRevision: number): RewriteSelectionOperation[] {
  return parseEditorTransformOperations(output, expectedDraftId, expectedBaseRevision).filter(isRewriteSelectionOperation);
}

export function selectionMatchesOperation(selection: RichTextSelection, operation: RewriteSelectionOperation): boolean {
  return operation.target.kind === "selection" && operation.target.selectionText.trim() === selection.text.trim();
}

export function transformSelectionPayload(selection: RichTextSelection) {
  return {
    target: {
      kind: "selection" as const,
      ...(selection.blockId ? { blockId: selection.blockId } : {}),
      selectionText: selection.text,
      ...(selection.surroundingText ? { surroundingText: selection.surroundingText } : {}),
    },
  };
}

export function targetFromSelection(selection: RichTextSelection): Extract<EditorTarget, { kind: "selection" }> {
  return transformSelectionPayload(selection).target;
}

export function humanRewriteDiff(before: string, after: string): { removed: string; added: string; changed: boolean } {
  const normalizedBefore = before.trim();
  const normalizedAfter = after.trim();
  return {
    removed: normalizedBefore,
    added: normalizedAfter,
    changed: normalizedBefore !== normalizedAfter,
  };
}

export function listResponseEditorBlocks(documentJson: JSONContent): ResponseEditorBlock[] {
  const content = Array.isArray(documentJson.content) ? documentJson.content : [];
  return content.map((node, index) => {
    const attrs = isRecord(node.attrs) ? node.attrs : {};
    const semanticType = typeof attrs.semanticType === "string" ? attrs.semanticType : undefined;
    return {
      id: blockId(node, index),
      index,
      nodeType: typeof node.type === "string" ? node.type : "paragraph",
      ...(semanticType ? { semanticType } : {}),
      text: nodeText(node).trim(),
    };
  });
}

export function editorToolLabel(tool: EditorTool, locale: OpportunityLocale = "ru"): string {
  const labels: Record<OpportunityLocale, Record<EditorTool, string>> = {
    ru: {
    rewriteSelection: "Переписать выделение",
    replaceBlock: "Заменить блок",
    regenerateBlock: "Перегенерировать блок",
    shortenBlock: "Сократить блок",
    changeTone: "Изменить тон",
    emphasizeFact: "Усилить факт",
    insertBefore: "Вставить перед блоком",
    insertAfter: "Вставить после блока",
    addParagraph: "Добавить абзац",
    removeBlock: "Удалить блок",
    updateHeading: "Обновить заголовок",
    replaceDocument: "Заменить весь документ",
    },
    en: {
      rewriteSelection: "Rewrite selection",
      replaceBlock: "Replace block",
      regenerateBlock: "Regenerate block",
      shortenBlock: "Shorten block",
      changeTone: "Change tone",
      emphasizeFact: "Emphasize fact",
      insertBefore: "Insert before block",
      insertAfter: "Insert after block",
      addParagraph: "Add paragraph",
      removeBlock: "Remove block",
      updateHeading: "Update heading",
      replaceDocument: "Replace whole document",
    }
  };
  return labels[locale][tool];
}

export function operationLabel(operation: EditorOperation, locale: OpportunityLocale = "ru"): string {
  return editorToolLabel(operation.tool, locale);
}

export function previewEditorOperation(documentJson: JSONContent, operation: EditorOperation, selection?: RichTextSelection, locale: OpportunityLocale = "ru"): OperationPreview {
  if (operation.target.kind === "selection" && "content" in operation && "text" in operation.content) {
    const before = selection?.text ?? operation.target.selectionText;
    const after = operation.content.text;
    return { before, after, changed: before.trim() !== after.trim(), valid: true };
  }
  const before = previewBeforeText(documentJson, operation);
  const afterDocument = applyEditorOperation(documentJson, operation);
  if (!afterDocument) return { before, after: "", changed: false, valid: false, reason: locale === "ru" ? "Целевой блок не найден или операция невалидна" : "The target block was not found or the operation is invalid" };
  const after = previewAfterText(afterDocument, operation);
  return { before, after, changed: before.trim() !== after.trim(), valid: true };
}

export function applyEditorOperation(documentJson: JSONContent, operation: EditorOperation): JSONContent | null {
  return applyEditorOperationAtOffset(documentJson, operation, 0);
}

function applyEditorOperationAtOffset(documentJson: JSONContent, operation: EditorOperation, insertAfterOffset: number): JSONContent | null {
  if (operation.tool === "rewriteSelection") return documentJson;
  const doc = cloneDocument(documentJson);
  if (operation.tool === "replaceDocument") {
    if (operation.content.documentJson && isDocJson(operation.content.documentJson)) return normalizeRichTextDocument(operation.content.documentJson);
    if (operation.content.markdown?.trim()) return normalizeRichTextDocument(markdownToDocument(operation.content.markdown));
    return null;
  }
  const content = Array.isArray(doc.content) ? [...doc.content] : [];
  const index = findBlockIndex(content, operation.target.kind === "block" ? operation.target.blockId : undefined);
  if (operation.target.kind === "block" && index < 0) return null;
  if (operation.tool === "removeBlock") {
    content.splice(index, 1);
    return normalizeRichTextDocument({ ...doc, content: content.length ? content : [paragraphNode("")] });
  }
  if (operation.tool === "insertBefore" || operation.tool === "insertAfter") {
    if (operation.target.kind !== "block") return null;
    const node = operationNode(operation, undefined, false);
    if (!node) return null;
    const insertIndex = operation.tool === "insertAfter" ? index + 1 + insertAfterOffset : index;
    content.splice(insertIndex, 0, node);
    return normalizeRichTextDocument({ ...doc, content });
  }
  if (operation.tool === "addParagraph") {
    if (operation.target.kind !== "block") return null;
    const node = paragraphNode(operation.content.text);
    content.splice(index + 1 + insertAfterOffset, 0, node);
    return normalizeRichTextDocument({ ...doc, content });
  }
  if (operation.target.kind !== "block") return null;
  const current = content[index];
  if (operation.tool === "updateHeading" && current.type !== "heading") return null;
  const node = operationNode(operation, current, true);
  if (!node) return null;
  content[index] = node;
  return normalizeRichTextDocument({ ...doc, content });
}

/** Validate the complete proposal before exposing a single transaction to the editor. */
export function applyEditorOperations(documentJson: JSONContent, operations: EditorOperation[], target: EditorTarget): JSONContent | null {
  if (!operations.length || operations.length > 20) return null;
  let next = cloneDocument(documentJson);
  const originalIds = new Set(listResponseEditorBlocks(documentJson).map((block) => block.id));
  const afterInsertCounts = new Map<string, number>();
  for (const operation of operations) {
    if (target.kind !== "document" && operation.target.kind !== target.kind) return null;
    if (operation.target.kind === "selection") return null;
    if (target.kind === "selection") return null; // Selection offsets require the live editor transaction.
    if (target.kind === "block" && (operation.target.kind !== "block" || operation.target.blockId !== target.blockId)) return null;
    if (operation.target.kind === "block" && !originalIds.has(operation.target.blockId)) return null;
    if (target.kind !== "document" && operation.tool === "replaceDocument") return null;
    const afterInsertKey = operation.target.kind === "block" && (operation.tool === "insertAfter" || operation.tool === "addParagraph")
      ? operation.target.blockId
      : null;
    const changed = applyEditorOperationAtOffset(next, operation, afterInsertKey ? afterInsertCounts.get(afterInsertKey) ?? 0 : 0);
    if (!changed) return null;
    if (afterInsertKey) afterInsertCounts.set(afterInsertKey, (afterInsertCounts.get(afterInsertKey) ?? 0) + 1);
    next = changed;
  }
  return next;
}

function previewBeforeText(documentJson: JSONContent, operation: EditorOperation): string {
  if (operation.tool === "insertBefore" || operation.tool === "insertAfter" || operation.tool === "addParagraph") return "";
  if (operation.tool === "replaceDocument") return nodeText(documentJson);
  const target = operation.target;
  if (target.kind !== "block") return nodeText(documentJson);
  const blocks = listResponseEditorBlocks(documentJson);
  return blocks.find((block) => block.id === target.blockId)?.text ?? "";
}

function previewAfterText(documentJson: JSONContent, operation: EditorOperation): string {
  if (operation.tool === "replaceDocument") return nodeText(documentJson);
  if (operation.tool === "insertBefore" || operation.tool === "insertAfter" || operation.tool === "addParagraph") return operation.content.text;
  if (operation.tool === "removeBlock") return "";
  const target = operation.target;
  if (target.kind !== "block") return nodeText(documentJson);
  const blocks = listResponseEditorBlocks(documentJson);
  return blocks.find((block) => block.id === target.blockId)?.text ?? nodeText(documentJson);
}

function isEditorOperation(value: unknown, expectedBaseRevision: number): value is EditorOperation {
  if (!isRecord(value) || typeof value.tool !== "string" || value.baseRevision !== expectedBaseRevision) return false;
  if (value.explanation !== undefined && typeof value.explanation !== "string") return false;
  if (value.tool === "rewriteSelection") return isRewriteSelectionOperation(value);
  if (value.tool === "replaceBlock") return isBlockTarget(value.target) && isTextContent(value.content, true);
  if (value.tool === "replaceDocument") return isDocumentTarget(value.target) && isReplaceDocumentContent(value.content);
  if (value.tool === "removeBlock") return isBlockTarget(value.target);
  if (value.tool === "changeTone") return (isSelectionTarget(value.target) || isBlockTarget(value.target)) && isTextContent(value.content, false);
  if (value.tool === "insertBefore" || value.tool === "insertAfter") return isBlockTarget(value.target) && isTextContent(value.content, true);
  if (["regenerateBlock", "shortenBlock", "emphasizeFact", "addParagraph", "updateHeading"].includes(value.tool)) return isBlockTarget(value.target) && isTextContent(value.content, false);
  return false;
}

function isRewriteSelectionOperation(value: unknown): value is RewriteSelectionOperation {
  if (!isRecord(value) || value.tool !== "rewriteSelection") return false;
  if (!isSelectionTarget(value.target)) return false;
  if (!isTextContent(value.content, false)) return false;
  return true;
}

function isSelectionTarget(value: unknown): value is Extract<EditorTarget, { kind: "selection" }> {
  if (!isRecord(value) || value.kind !== "selection") return false;
  if (typeof value.selectionText !== "string" || !value.selectionText.trim()) return false;
  if (value.surroundingText !== undefined && typeof value.surroundingText !== "string") return false;
  if (value.blockId !== undefined && typeof value.blockId !== "string") return false;
  return true;
}

function isBlockTarget(value: unknown): value is Extract<EditorTarget, { kind: "block" }> {
  return isRecord(value) && value.kind === "block" && typeof value.blockId === "string" && !!value.blockId.trim();
}

function isDocumentTarget(value: unknown): value is Extract<EditorTarget, { kind: "document" }> {
  return isRecord(value) && value.kind === "document";
}

function isTextContent(value: unknown, allowNodeType: boolean): value is { text: string; nodeType?: string } {
  if (!isRecord(value) || typeof value.text !== "string" || !value.text.trim()) return false;
  if (!allowNodeType && value.nodeType !== undefined) return false;
  if (value.nodeType !== undefined && (!isAllowedBlockNodeType(value.nodeType))) return false;
  return true;
}

function isReplaceDocumentContent(value: unknown): value is { documentJson?: JSONContent; markdown?: string } {
  if (!isRecord(value)) return false;
  return (isDocJson(value.documentJson) || (typeof value.markdown === "string" && !!value.markdown.trim()));
}

function isDocJson(value: unknown): value is JSONContent {
  return isValidRichDocumentNode(value, "doc", 0);
}

function cloneDocument(documentJson: JSONContent): JSONContent {
  return JSON.parse(JSON.stringify(documentJson)) as JSONContent;
}

function findBlockIndex(content: JSONContent[], id?: string): number {
  if (!id) return -1;
  return content.findIndex((node, index) => blockId(node, index) === id);
}

function blockId(node: JSONContent, index: number): string {
  const attrs = isRecord(node.attrs) ? node.attrs : {};
  for (const key of ["id", "blockId", "dataId", "data-block-id"]) {
    const value = attrs[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return `block-${index + 1}`;
}

function nodeText(node: JSONContent): string {
  if (node.type === "text") return node.text ?? "";
  const children = Array.isArray(node.content) ? node.content : [];
  return children.map(nodeText).join(node.type === "doc" ? "\n" : "");
}

function paragraphNode(text: string): JSONContent {
  return textBlockNode("paragraph", text);
}

function textBlockNode(type: string, text: string, attrs?: JSONContent["attrs"]): JSONContent {
  return blockNode(type, text, attrs);
}

const ALLOWED_TEXT_BLOCK_NODE_TYPES = new Set(["paragraph", "heading", "semanticBlock", "bulletList", "orderedList", "blockquote", "codeBlock", ...RESPONSE_SEMANTIC_BLOCK_TYPES]);
const SIMPLE_BLOCK_TOOLS = new Set<EditorTool>(["regenerateBlock", "shortenBlock", "changeTone", "emphasizeFact", "updateHeading"]);

function operationNode(operation: EditorOperation, current: JSONContent | undefined, replacing: boolean): JSONContent | null {
  if (!("content" in operation) || !("text" in operation.content)) return null;
  if (operation.tool === "replaceBlock" || operation.tool === "insertBefore" || operation.tool === "insertAfter") {
    const currentType = typeof current?.type === "string" ? current.type : "paragraph";
    const type = operation.content.nodeType ?? currentType;
    if (!isAllowedBlockNodeType(type)) return null;
    return blockNode(type, operation.content.text, replacing ? retainedAttrs(current, type) : semanticAttrsForInserted(type));
  }
  if (operation.tool === "addParagraph") return paragraphNode(operation.content.text);
  if (!SIMPLE_BLOCK_TOOLS.has(operation.tool)) return null;
  const currentType = typeof current?.type === "string" ? current.type : "paragraph";
  return blockNode(currentType, operation.content.text, retainedAttrs(current, currentType));
}

function blockNode(type: string, text: string, attrs?: JSONContent["attrs"]): JSONContent {
  const semanticAlias = RESPONSE_SEMANTIC_BLOCK_TYPES.includes(type as (typeof RESPONSE_SEMANTIC_BLOCK_TYPES)[number]) ? type : null;
  const normalizedType = semanticAlias ? "semanticBlock" : type === "heading" ? "heading" : type || "paragraph";
  const normalizedAttrs = attrs && Object.keys(attrs).length ? attrs : undefined;
  if (normalizedType === "bulletList" || normalizedType === "orderedList") {
    return {
      type: normalizedType,
      ...(normalizedAttrs ? { attrs: normalizedAttrs } : normalizedType === "orderedList" ? { attrs: { start: 1 } } : {}),
      content: listItemsFromText(text),
    };
  }
  if (normalizedType === "blockquote") {
    return { type: "blockquote", ...(normalizedAttrs ? { attrs: normalizedAttrs } : {}), content: paragraphNodesFromText(text) };
  }
  if (normalizedType === "codeBlock") {
    return { type: "codeBlock", ...(normalizedAttrs ? { attrs: normalizedAttrs } : {}), content: text ? [{ type: "text", text }] : [] };
  }
  if (normalizedType === "semanticBlock") {
    return {
      type: "semanticBlock",
      attrs: { ...(normalizedAttrs ?? {}), semanticType: semanticBlockType(isRecord(normalizedAttrs) ? normalizedAttrs.semanticType : semanticAlias) },
      content: inlineContent(text),
    };
  }
  return {
    type: normalizedType,
    ...(normalizedAttrs ? { attrs: normalizedAttrs } : normalizedType === "heading" ? { attrs: { level: 2 } } : {}),
    content: inlineContent(text),
  };
}

function retainedAttrs(current: JSONContent | undefined, nextType: string): JSONContent["attrs"] {
  const attrs = isRecord(current?.attrs) ? { ...current.attrs } : {};
  const blockIdValue = blockIdFromAttrs(attrs);
  const next: Record<string, unknown> = {};
  if (blockIdValue) next.blockId = blockIdValue;
  const semanticAlias = RESPONSE_SEMANTIC_BLOCK_TYPES.includes(nextType as (typeof RESPONSE_SEMANTIC_BLOCK_TYPES)[number]) ? nextType : null;
  if (nextType === "semanticBlock" || semanticAlias) next.semanticType = semanticBlockType(attrs.semanticType ?? semanticAlias);
  if (nextType === "heading") next.level = typeof attrs.level === "number" && Number.isFinite(attrs.level) ? attrs.level : 2;
  if (nextType === "orderedList" && typeof attrs.start === "number" && Number.isFinite(attrs.start)) next.start = Math.max(1, Math.floor(attrs.start));
  return next;
}

function semanticAttrsForInserted(type: string): JSONContent["attrs"] | undefined {
  const semanticAlias = RESPONSE_SEMANTIC_BLOCK_TYPES.includes(type as (typeof RESPONSE_SEMANTIC_BLOCK_TYPES)[number]) ? type : null;
  if (type === "semanticBlock" || semanticAlias) return { semanticType: semanticBlockType(semanticAlias) };
  if (type === "orderedList") return { start: 1 };
  if (type === "heading") return { level: 2 };
  return undefined;
}

function blockIdFromAttrs(attrs: Record<string, unknown>): string | null {
  for (const key of ["blockId", "id", "dataId", "data-block-id"]) {
    const value = attrs[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function isAllowedBlockNodeType(value: unknown): value is string {
  return typeof value === "string" && ALLOWED_TEXT_BLOCK_NODE_TYPES.has(value);
}

function listItemsFromText(text: string): JSONContent[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n").map(line => line.trim()).filter(Boolean);
  return (lines.length ? lines : [text]).map(line => ({ type: "listItem", content: [{ type: "paragraph", content: inlineContent(line) }] }));
}

function paragraphNodesFromText(text: string): JSONContent[] {
  const groups = text.replace(/\r\n/g, "\n").split(/\n{2,}/).map(group => group.trim()).filter(Boolean);
  return (groups.length ? groups : [text]).map(group => ({ type: "paragraph", content: inlineContent(group) }));
}

const RICH_DOCUMENT_MAX_DEPTH = 24;
const SAFE_MARK_TYPES = new Set(["bold", "italic", "strike", "code", "link"]);

function isValidRichDocumentNode(value: unknown, context: "doc" | "block" | "inline" | "listItem" | "listChild" | "code", depth: number): value is JSONContent {
  if (depth > RICH_DOCUMENT_MAX_DEPTH || !isRecord(value) || typeof value.type !== "string") return false;
  if (value.attrs !== undefined && !isRecord(value.attrs)) return false;
  if (context === "doc") return value.type === "doc" && Array.isArray(value.content) && value.content.every(node => isValidRichDocumentNode(node, "block", depth + 1));
  if (context === "inline") {
    if (value.type === "hardBreak") return !("content" in value) && !("text" in value) && value.marks === undefined;
    if (value.type !== "text" || typeof value.text !== "string" || !value.text || "content" in value) return false;
    return value.marks === undefined || isValidRichTextMarks(value.marks);
  }
  if (context === "code") {
    return value.type === "text" && typeof value.text === "string" && !!value.text && !("content" in value) && value.marks === undefined;
  }
  if (context === "listItem") {
    const content = Array.isArray(value.content) ? value.content : null;
    return value.type === "listItem" && !!content?.length && content[0]?.type === "paragraph" && content.every(node => isValidRichDocumentNode(node, "block", depth + 1));
  }
  if (context === "listChild") return value.type === "bulletList" || value.type === "orderedList" ? isListNode(value, depth + 1) : false;
  if (value.type === "paragraph") return isParagraphLikeNode(value, depth + 1);
  if (value.type === "heading") return isHeadingNode(value, depth + 1);
  if (value.type === "semanticBlock" || RESPONSE_SEMANTIC_BLOCK_TYPES.includes(value.type as (typeof RESPONSE_SEMANTIC_BLOCK_TYPES)[number])) return isSemanticNode(value, depth + 1);
  if (value.type === "bulletList" || value.type === "orderedList") return isListNode(value, depth + 1);
  if (value.type === "blockquote") return isBlockquoteNode(value, depth + 1);
  if (value.type === "codeBlock") return isCodeBlockNode(value, depth + 1);
  return false;
}

function isParagraphLikeNode(value: unknown, depth: number): value is JSONContent {
  if (!isRecord(value) || value.type !== "paragraph") return false;
  return value.content === undefined || Array.isArray(value.content) && value.content.every(node => isValidRichDocumentNode(node, "inline", depth + 1));
}

function isHeadingNode(value: Record<string, unknown>, depth: number): boolean {
  const attrs = isRecord(value.attrs) ? value.attrs : {};
  const level = attrs.level;
  if (level !== undefined && (!Number.isInteger(level) || typeof level !== "number" || level < 1 || level > 6)) return false;
  return value.content === undefined || Array.isArray(value.content) && value.content.every(node => isValidRichDocumentNode(node, "inline", depth + 1));
}

function isSemanticNode(value: Record<string, unknown>, depth: number): boolean {
  const attrs = isRecord(value.attrs) ? value.attrs : {};
  if (attrs.semanticType !== undefined && semanticBlockType(attrs.semanticType) === "generic" && attrs.semanticType !== "generic") return false;
  return value.content === undefined || Array.isArray(value.content) && value.content.every(node => isValidRichDocumentNode(node, "inline", depth + 1));
}

function isListNode(value: unknown, depth: number): boolean {
  if (!isRecord(value) || (value.type !== "bulletList" && value.type !== "orderedList")) return false;
  const attrs = isRecord(value.attrs) ? value.attrs : {};
  const start = attrs.start;
  if (value.type === "orderedList" && start !== undefined && (!Number.isInteger(start) || typeof start !== "number" || start < 1)) return false;
  const content = Array.isArray(value.content) ? value.content : null;
  return !!content?.length && content.every(node => isValidRichDocumentNode(node, "listItem", depth + 1));
}

function isBlockquoteNode(value: Record<string, unknown>, depth: number): boolean {
  const content = Array.isArray(value.content) ? value.content : null;
  return !!content?.length && content.every(node => isValidRichDocumentNode(node, "block", depth + 1));
}

function isCodeBlockNode(value: Record<string, unknown>, depth: number): boolean {
  return value.content === undefined || Array.isArray(value.content) && value.content.every(node => isValidRichDocumentNode(node, "code", depth + 1));
}

function isValidRichTextMarks(value: unknown): boolean {
  return Array.isArray(value) && value.every(mark => {
    if (!isRecord(mark) || typeof mark.type !== "string" || !SAFE_MARK_TYPES.has(mark.type)) return false;
    if (mark.type !== "link") return mark.attrs === undefined;
    const attrs = isRecord(mark.attrs) ? mark.attrs : {};
    return typeof attrs.href === "string" && sanitizeLinkHref(attrs.href) === attrs.href;
  });
}

function inlineContent(text: string): JSONContent[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  return lines.flatMap((line, index): JSONContent[] => [
    ...(index > 0 ? [{ type: "hardBreak" }] : []),
    ...(line ? [{ type: "text", text: line }] : []),
  ]);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
