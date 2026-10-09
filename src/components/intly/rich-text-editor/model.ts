import type { JSONContent } from "@tiptap/react";

export const RESPONSE_SEMANTIC_BLOCK_TYPES = [
  "greeting",
  "intro",
  "experience-fit",
  "technical-fit",
  "motivation",
  "understanding",
  "approach",
  "experience",
  "price-timeline",
  "application-summary",
  "eligibility",
  "technical-response",
  "documents-checklist",
  "commercial-notes",
  "closing",
] as const;

export type ResponseSemanticBlockType = (typeof RESPONSE_SEMANTIC_BLOCK_TYPES)[number] | "generic" | (string & {});

export const ADDRESSABLE_BLOCK_NODE_TYPES = new Set([
  "paragraph",
  "heading",
  "semanticBlock",
  "bulletList",
  "orderedList",
  "blockquote",
  "codeBlock",
]);

// prosemirror-history's closeHistory helper keys metadata with PluginKey("closeHistory"),
// which resolves to "closeHistory$"; the package is transitive here, so we cannot import it directly.
export const PROSEMIRROR_CLOSE_HISTORY_META = "closeHistory$";

const TIPTAP_CORE_NODE_TYPES = new Set([
  "doc",
  "text",
  "paragraph",
  "heading",
  "bulletList",
  "orderedList",
  "listItem",
  "blockquote",
  "codeBlock",
  "hardBreak",
  "horizontalRule",
  "semanticBlock",
]);

const RESPONSE_SEMANTIC_BLOCK_TYPE_SET = new Set<string>(RESPONSE_SEMANTIC_BLOCK_TYPES);

type MarkdownMark = { type: string; attrs?: Record<string, unknown> };

export type RichTextDocumentNormalizationOptions = {
  createId?: () => string;
};

export function normalizeRichTextDocument(document: JSONContent | null | undefined, options: RichTextDocumentNormalizationOptions = {}): JSONContent {
  const seen = new Set<string>();
  const createId = options.createId ?? createRichTextBlockId;
  const source = isRecord(document) && document.type === "doc" ? document : { type: "doc", content: [] };
  const content = Array.isArray(source.content) ? source.content : [];
  const normalizedContent = content.map((node) => normalizeNode(node, seen, createId, true));
  return {
    ...source,
    type: "doc",
    content: normalizedContent.length ? normalizedContent : [normalizeNode({ type: "paragraph", content: [] }, seen, createId)],
  };
}

export function equivalentRichTextDocuments(left: JSONContent | null | undefined, right: JSONContent | null | undefined): boolean {
  return stableJson(canonicalComparisonDocument(left)) === stableJson(canonicalComparisonDocument(right));
}

export function documentToMarkdown(document: JSONContent | null | undefined): string {
  const normalized = normalizeRichTextDocument(document);
  const blocks = Array.isArray(normalized.content) ? normalized.content : [];
  return blocks.map((node) => blockToMarkdown(node, 0)).filter(Boolean).join("\n\n").trim();
}

export function markdownToDocument(markdown: string, options: RichTextDocumentNormalizationOptions = {}): JSONContent {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: JSONContent[] = [];
  for (let index = 0; index < lines.length;) {
    const line = lines[index] ?? "";
    if (!line.trim()) {
      index += 1;
      continue;
    }
    if (/^```/.test(line.trim())) {
      const content: string[] = [];
      index += 1;
      while (index < lines.length && !/^```/.test((lines[index] ?? "").trim())) {
        content.push(lines[index] ?? "");
        index += 1;
      }
      if (index < lines.length) index += 1;
      blocks.push({ type: "codeBlock", content: content.length ? [{ type: "text", text: content.join("\n") }] : [] });
      continue;
    }
    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      const level = Math.min(3, Math.max(2, heading[1].length));
      blocks.push({ type: "heading", attrs: { level }, content: parseInlineMarkdown(heading[2]) });
      index += 1;
      continue;
    }
    if (/^>\s?/.test(line)) {
      const quoteLines: string[] = [];
      while (index < lines.length && /^>\s?/.test(lines[index] ?? "")) {
        quoteLines.push((lines[index] ?? "").replace(/^>\s?/, ""));
        index += 1;
      }
      blocks.push({ type: "blockquote", content: paragraphNodesFromLines(quoteLines) });
      continue;
    }
    if (listLine(line)) {
      const parsed = parseList(lines, index);
      blocks.push(parsed.node);
      index = parsed.nextIndex;
      continue;
    }
    const paragraphLines = [line];
    index += 1;
    while (index < lines.length && (lines[index] ?? "").trim() && !startsMarkdownBlock(lines[index] ?? "")) {
      paragraphLines.push(lines[index] ?? "");
      index += 1;
    }
    blocks.push({ type: "paragraph", content: inlineWithHardBreaks(paragraphLines) });
  }
  return normalizeRichTextDocument({ type: "doc", content: blocks }, options);
}

export function replacementTextToInlineContent(text: string): JSONContent[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  const lines = normalized ? normalized.split("\n") : [""];
  return lines.flatMap((line, index): JSONContent[] => [
    ...(index > 0 ? [{ type: "hardBreak" }] : []),
    ...(line ? [{ type: "text", text: line }] : []),
  ]);
}

export function sanitizeLinkHref(href: string | null | undefined): string | null {
  if (typeof href !== "string") return null;
  const trimmed = href.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(/[\u0000-\u001F\u007F\s]+/g, "");
  if (/^(https?:\/\/|mailto:)/i.test(normalized)) return normalized;
  return null;
}

export function semanticBlockType(value: unknown): ResponseSemanticBlockType {
  if (typeof value !== "string") return "generic";
  const trimmed = value.trim();
  if (!trimmed) return "generic";
  if (!/^[a-z][a-z0-9-]{0,63}$/.test(trimmed)) return "generic";
  return trimmed;
}

export function createRichTextBlockId(): string {
  const random = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 12);
  return `rtb-${random}`;
}

export function blockIdFromNode(node: JSONContent | null | undefined): string | null {
  const attrs = isRecord(node?.attrs) ? node.attrs : {};
  for (const key of ["blockId", "id", "data-block-id"]) {
    const value = attrs[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function normalizeNode(node: JSONContent, seen: Set<string>, createId: () => string, topLevel = false): JSONContent {
  const rawType = typeof node.type === "string" ? node.type : "paragraph";
  const attrs = isRecord(node.attrs) ? { ...node.attrs } : {};
  const semanticType = semanticTypeFromNode(rawType, attrs);
  const type = semanticType ? "semanticBlock" : TIPTAP_CORE_NODE_TYPES.has(rawType) ? rawType : "paragraph";
  const content = Array.isArray(node.content) ? node.content.map((child) => normalizeNode(child, seen, createId)) : undefined;
  const marks = Array.isArray(node.marks) ? normalizeMarks(node.marks) : undefined;
  const normalized: JSONContent = {
    type,
    ...(content ? { content } : {}),
    ...(marks?.length ? { marks } : {}),
  };
  if (node.text !== undefined) normalized.text = node.text;
  if (Object.keys(attrs).length) normalized.attrs = attrs;
  if (topLevel && ADDRESSABLE_BLOCK_NODE_TYPES.has(type)) {
    normalized.attrs = {
      ...stripTechnicalIdAttrs(isRecord(normalized.attrs) ? normalized.attrs : {}),
      blockId: uniqueBlockId(blockIdFromNode(normalized), seen, createId),
    };
  }
  if (type === "semanticBlock") {
    normalized.attrs = {
      ...(isRecord(normalized.attrs) ? normalized.attrs : {}),
      semanticType: semanticType ?? semanticBlockType(attrs.semanticType),
    };
  }
  return normalized;
}

function semanticTypeFromNode(type: string, attrs: Record<string, unknown>): ResponseSemanticBlockType | null {
  const fromAttrs = semanticBlockType(attrs.semanticType);
  if (fromAttrs !== "generic") return fromAttrs;
  return RESPONSE_SEMANTIC_BLOCK_TYPE_SET.has(type) ? type : null;
}

function stripTechnicalIdAttrs(attrs: Record<string, unknown>): Record<string, unknown> {
  const next = { ...attrs };
  delete next.id;
  delete next.dataId;
  delete next["data-block-id"];
  return next;
}

function canonicalComparisonDocument(document: JSONContent | null | undefined): JSONContent {
  return stripSchemaDefaults(normalizeRichTextDocument(document));
}

function stripSchemaDefaults(node: JSONContent): JSONContent {
  const attrs = isRecord(node.attrs) ? Object.fromEntries(Object.entries(node.attrs).filter(([, value]) => value !== null && value !== undefined)) : undefined;
  const content = Array.isArray(node.content) ? node.content.map(stripSchemaDefaults) : undefined;
  return {
    ...node,
    ...(attrs && Object.keys(attrs).length ? { attrs } : { attrs: undefined }),
    ...(content ? { content } : {}),
  };
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function normalizeMarks(marks: JSONContent["marks"]): JSONContent["marks"] {
  return marks?.flatMap((mark) => {
    if (!isRecord(mark) || typeof mark.type !== "string") return [];
    if (mark.type !== "link") return [mark];
    const attrs = isRecord(mark.attrs) ? { ...mark.attrs } : {};
    const href = sanitizeLinkHref(typeof attrs.href === "string" ? attrs.href : null);
    if (!href) return [];
    return [{ ...mark, attrs: { ...attrs, href } }];
  });
}

function blockToMarkdown(node: JSONContent, depth: number): string {
  switch (node.type) {
    case "heading": {
      const level = isRecord(node.attrs) && node.attrs.level === 3 ? 3 : 2;
      return `${"#".repeat(level)} ${inlineToMarkdown(node.content)}`.trim();
    }
    case "semanticBlock":
    case "paragraph":
      return inlineToMarkdown(node.content);
    case "bulletList":
      return listToMarkdown(node, depth, false);
    case "orderedList":
      return listToMarkdown(node, depth, true);
    case "blockquote":
      return childrenToMarkdown(node.content, depth).split("\n").map((line) => `> ${line}`.trimEnd()).join("\n");
    case "codeBlock":
      return `\`\`\`\n${textContent(node)}\n\`\`\``;
    default:
      return textContent(node);
  }
}

function listToMarkdown(node: JSONContent, depth: number, ordered: boolean): string {
  const items = Array.isArray(node.content) ? node.content : [];
  const start = ordered && isRecord(node.attrs) && typeof node.attrs.start === "number" && Number.isFinite(node.attrs.start) ? Math.max(1, Math.floor(node.attrs.start)) : 1;
  return items.map((item, index) => {
    const children = Array.isArray(item.content) ? item.content : [];
    const firstText = children.find((child) => child.type === "paragraph") ?? children[0];
    const nested = children.filter((child) => child !== firstText).map((child) => blockToMarkdown(child, depth + 1)).filter(Boolean);
    const marker = ordered ? `${start + index}.` : "-";
    const prefix = `${"  ".repeat(depth)}${marker} `;
    const line = `${prefix}${inlineToMarkdown(firstText?.content) || textContent(firstText)}`.trimEnd();
    return [line, ...nested].join("\n");
  }).join("\n");
}

function childrenToMarkdown(content: JSONContent["content"], depth: number): string {
  return (Array.isArray(content) ? content : []).map((node) => blockToMarkdown(node, depth)).filter(Boolean).join("\n\n");
}

function inlineToMarkdown(content: JSONContent["content"]): string {
  return (Array.isArray(content) ? content : []).map((node) => {
    if (node.type === "hardBreak") return "\n";
    if (node.type !== "text") return textContent(node);
    return applyMarkdownMarks(node.text ?? "", node.marks);
  }).join("");
}

function applyMarkdownMarks(text: string, marks: JSONContent["marks"]): string {
  const markList = Array.isArray(marks) ? marks.filter((mark): mark is MarkdownMark => isRecord(mark) && typeof mark.type === "string") : [];
  const hasCode = markList.some((mark) => mark.type === "code");
  const hasBold = markList.some((mark) => mark.type === "bold");
  const hasItalic = markList.some((mark) => mark.type === "italic");
  const hasStrike = markList.some((mark) => mark.type === "strike");
  const link = markList.find((mark) => mark.type === "link");
  const href = isRecord(link?.attrs) && typeof link.attrs.href === "string" ? sanitizeLinkHref(link.attrs.href) : null;
  let value = hasCode ? `\`${escapeInlineCode(text)}\`` : escapeMarkdownText(text);
  if (!hasCode) {
    if (hasBold && hasItalic) value = `***${value}***`;
    else if (hasBold) value = `**${value}**`;
    else if (hasItalic) value = `*${value}*`;
    if (hasStrike) value = `~~${value}~~`;
  }
  if (href) value = `[${value}](${href})`;
  return value;
}

function parseInlineMarkdown(text: string): JSONContent[] {
  return parseInlineSegment(text, []);
}

function parseInlineSegment(text: string, activeMarks: JSONContent["marks"]): JSONContent[] {
  const nodes: JSONContent[] = [];
  let buffer = "";
  let index = 0;
  const flush = () => {
    if (!buffer) return;
    nodes.push(textNode(buffer, activeMarks));
    buffer = "";
  };
  while (index < text.length) {
    const char = text[index];
    if (char === "\\") {
      const next = text[index + 1];
      if (next && /[\\*_~`[\]()]/.test(next)) {
        buffer += next;
        index += 2;
        continue;
      }
      buffer += char;
      index += 1;
      continue;
    }
    if (char === "`") {
      const end = findUnescaped(text, "`", index + 1);
      if (end > index) {
        flush();
        nodes.push(textNode(unescapeInlineCode(text.slice(index + 1, end)), [...(activeMarks ?? []), { type: "code" }]));
        index = end + 1;
        continue;
      }
    }
    if (char === "[") {
      const closeLabel = findUnescaped(text, "]", index + 1);
      if (closeLabel > index && text[closeLabel + 1] === "(") {
        const closeHref = findUnescaped(text, ")", closeLabel + 2);
        if (closeHref > closeLabel) {
          const href = sanitizeLinkHref(text.slice(closeLabel + 2, closeHref));
          flush();
          const labelNodes = parseInlineSegment(text.slice(index + 1, closeLabel), href ? [...(activeMarks ?? []), { type: "link", attrs: { href } }] : activeMarks);
          nodes.push(...labelNodes);
          index = closeHref + 1;
          continue;
        }
      }
    }
    const delimiter = markdownDelimiterAt(text, index);
    if (delimiter) {
      const end = findClosingDelimiter(text, delimiter.token, index + delimiter.token.length);
      if (end > index) {
        flush();
        nodes.push(...parseInlineSegment(text.slice(index + delimiter.token.length, end), [...(activeMarks ?? []), ...(delimiter.marks ?? [])]));
        index = end + delimiter.token.length;
        continue;
      }
    }
    buffer += char;
    index += 1;
  }
  flush();
  return mergeAdjacentTextNodes(nodes);
}

function markdownDelimiterAt(text: string, index: number): { token: string; marks: JSONContent["marks"] } | null {
  if (text.startsWith("***", index)) return { token: "***", marks: [{ type: "bold" }, { type: "italic" }] };
  if (text.startsWith("**", index)) return { token: "**", marks: [{ type: "bold" }] };
  if (text.startsWith("~~", index)) return { token: "~~", marks: [{ type: "strike" }] };
  if (text[index] === "*") return { token: "*", marks: [{ type: "italic" }] };
  return null;
}

function parseList(lines: string[], startIndex: number): { node: JSONContent; nextIndex: number } {
  const first = listLine(lines[startIndex] ?? "");
  const ordered = first?.ordered === true;
  const root: JSONContent = { type: ordered ? "orderedList" : "bulletList", ...(ordered && first ? { attrs: { start: first.start } } : {}), content: [] };
  const stack: Array<{ indent: number; list: JSONContent }> = [{ indent: first?.indent ?? 0, list: root }];
  let index = startIndex;
  while (index < lines.length) {
    const parsed = listLine(lines[index] ?? "");
    if (!parsed) break;
    while (stack.length > 1 && parsed.indent < stack[stack.length - 1].indent) stack.pop();
    if (parsed.indent > stack[stack.length - 1].indent) {
      const parentItems = stack[stack.length - 1].list.content ?? [];
      const parentItem = parentItems[parentItems.length - 1];
      if (!parentItem) break;
      const nested: JSONContent = { type: parsed.ordered ? "orderedList" : "bulletList", ...(parsed.ordered ? { attrs: { start: parsed.start } } : {}), content: [] };
      parentItem.content = [...(parentItem.content ?? []), nested];
      stack.push({ indent: parsed.indent, list: nested });
    }
    const current = stack[stack.length - 1].list;
    current.content = [...(current.content ?? []), { type: "listItem", content: [{ type: "paragraph", content: parseInlineMarkdown(parsed.text) }] }];
    index += 1;
  }
  return { node: root, nextIndex: index };
}

function paragraphNodesFromLines(lines: string[]): JSONContent[] {
  const groups: string[][] = [[]];
  for (const line of lines) {
    if (!line.trim()) groups.push([]);
    else groups[groups.length - 1].push(line);
  }
  return groups.filter((group) => group.length).map((group) => ({ type: "paragraph", content: inlineWithHardBreaks(group) }));
}

function inlineWithHardBreaks(lines: string[]): JSONContent[] {
  return lines.flatMap((line, index): JSONContent[] => [
    ...(index > 0 ? [{ type: "hardBreak" }] : []),
    ...parseInlineMarkdown(line),
  ]);
}

function startsMarkdownBlock(line: string): boolean {
  return /^(```|#{1,3}\s+|>\s?|(\s*)([-*]|\d+[.)])\s+)/.test(line);
}

function listLine(line: string): { indent: number; ordered: boolean; start: number; text: string } | null {
  const match = /^(\s*)([-*]|\d+[.)])\s+(.+)$/.exec(line);
  if (!match) return null;
  const ordered = /\d/.test(match[2]);
  return { indent: Math.floor(match[1].replace(/\t/g, "  ").length / 2), ordered, start: ordered ? Number.parseInt(match[2], 10) : 1, text: match[3] };
}

function textContent(node: JSONContent | undefined): string {
  if (!node) return "";
  if (node.type === "text") return node.text ?? "";
  if (node.type === "hardBreak") return "\n";
  return (Array.isArray(node.content) ? node.content : []).map(textContent).join(node.type === "doc" ? "\n\n" : "");
}

function escapeMarkdownText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/([*_~`[\]()])/g, "\\$1");
}

function escapeInlineCode(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/`/g, "\\`");
}

function unescapeInlineCode(text: string): string {
  return text.replace(/\\([\\`])/g, "$1");
}

function textNode(text: string, marks: JSONContent["marks"]): JSONContent {
  return { type: "text", text, ...(marks?.length ? { marks: normalizeInlineMarks(marks) } : {}) };
}

function normalizeInlineMarks(marks: JSONContent["marks"]): NonNullable<JSONContent["marks"]> {
  const normalized: NonNullable<JSONContent["marks"]> = [];
  for (const mark of Array.isArray(marks) ? marks : []) {
    if (!isRecord(mark) || typeof mark.type !== "string") continue;
    if (mark.type === "link") {
      const attrs = isRecord(mark.attrs) ? mark.attrs : {};
      const href = sanitizeLinkHref(typeof attrs.href === "string" ? attrs.href : null);
      if (href && !normalized.some((existing) => existing.type === "link")) normalized.push({ type: "link", attrs: { href } });
      continue;
    }
    if (["bold", "italic", "strike", "code"].includes(mark.type) && !normalized.some((existing) => existing.type === mark.type)) normalized.push({ type: mark.type });
  }
  return normalized;
}

function mergeAdjacentTextNodes(nodes: JSONContent[]): JSONContent[] {
  const merged: JSONContent[] = [];
  for (const node of nodes) {
    const previous = merged[merged.length - 1];
    if (previous?.type === "text" && node.type === "text" && JSON.stringify(previous.marks ?? []) === JSON.stringify(node.marks ?? [])) {
      previous.text = `${previous.text ?? ""}${node.text ?? ""}`;
    } else {
      merged.push(node);
    }
  }
  return merged;
}

function findUnescaped(text: string, token: string, from: number): number {
  for (let index = from; index < text.length; index += 1) {
    if (text[index] === "\\" && index + 1 < text.length) {
      index += 1;
      continue;
    }
    if (text.startsWith(token, index)) return index;
  }
  return -1;
}

function findClosingDelimiter(text: string, token: string, from: number): number {
  for (let index = from; index < text.length; index += 1) {
    if (text[index] === "\\" && index + 1 < text.length) {
      index += 1;
      continue;
    }
    if (text.startsWith(token, index)) return index;
  }
  return -1;
}

function uniqueBlockId(candidate: string | null, seen: Set<string>, createId: () => string): string {
  if (candidate && !seen.has(candidate)) {
    seen.add(candidate);
    return candidate;
  }
  let next = createId();
  while (!next || seen.has(next)) next = createId();
  seen.add(next);
  return next;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
