"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { EditorContent, Extension, mergeAttributes, Node, useEditor, useEditorState, type Editor, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Bold, Heading2, Heading3, Italic, Link2, List, ListOrdered, Redo2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ADDRESSABLE_BLOCK_NODE_TYPES, PROSEMIRROR_CLOSE_HISTORY_META, createRichTextBlockId, documentToMarkdown, equivalentRichTextDocuments, normalizeRichTextDocument, replacementTextToInlineContent, sanitizeLinkHref, semanticBlockType } from "./model";

export { RESPONSE_SEMANTIC_BLOCK_TYPES, documentToMarkdown, equivalentRichTextDocuments, markdownToDocument, normalizeRichTextDocument, sanitizeLinkHref, type ResponseSemanticBlockType } from "./model";

type RichTextEditorLocale = "ru" | "en";

const editorLabels: Record<RichTextEditorLocale, { placeholder: string; textArea: string; bold: string; italic: string; bulletList: string; orderedList: string; link: string; heading2: string; heading3: string; undo: string; redo: string }> = {
  ru: {
    placeholder: "Напишите текст или запустите AI-генерацию…",
    textArea: "Текст отклика",
    bold: "Жирный",
    italic: "Курсив",
    bulletList: "Список",
    orderedList: "Нумерованный список",
    link: "Ссылка",
    heading2: "Заголовок",
    heading3: "Подзаголовок",
    undo: "Отменить",
    redo: "Повторить",
  },
  en: {
    placeholder: "Write the response or start AI generation…",
    textArea: "Response text",
    bold: "Bold",
    italic: "Italic",
    bulletList: "Bullet list",
    orderedList: "Numbered list",
    link: "Link",
    heading2: "Heading",
    heading3: "Subheading",
    undo: "Undo",
    redo: "Redo",
  },
};

export type RichTextSelection = {
  from: number;
  to: number;
  text: string;
  surroundingText?: string;
  blockId?: string;
};

export type RichTextEditorHandle = {
  captureSelection: () => RichTextSelection | null;
  getCurrentBlockId: () => string | null;
  getTextAtRange: (selection: RichTextSelection) => string | null;
  replaceRangeWithText: (selection: RichTextSelection, replacement: string) => boolean;
  getDocument: () => JSONContent | null;
  getHtml: () => string | null;
  getMarkdown: () => string | null;
  applyDocument: (document: JSONContent) => boolean;
  focus: () => void;
  focusText: (text: string) => boolean;
  focusBlock: (blockId: string) => boolean;
};

export type RichTextSelectionState = {
  selection: RichTextSelection | null;
  blockId: string | null;
};

export const RichTextEditor = forwardRef<RichTextEditorHandle, {
  value: JSONContent;
  onChange: (document: JSONContent, text: string) => void;
  onBlur?: () => void;
  onSelectionChange?: (state: RichTextSelectionState) => void;
  disabled?: boolean;
  locale?: RichTextEditorLocale;
  sectionPlaceholders?: Record<string, string>;
}>(({ value, onChange, onBlur, onSelectionChange, disabled = false, locale = "ru", sectionPlaceholders }, ref) => {
  const labels = editorLabels[locale];
  const onChangeRef = useRef(onChange);
  const onBlurRef = useRef(onBlur);
  const onSelectionChangeRef = useRef(onSelectionChange);
  const sectionPlaceholdersRef = useRef(sectionPlaceholders);
  sectionPlaceholdersRef.current = sectionPlaceholders;
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  useEffect(() => { onBlurRef.current = onBlur; }, [onBlur]);
  useEffect(() => { onSelectionChangeRef.current = onSelectionChange; }, [onSelectionChange]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: { openOnClick: false, protocols: ["https", "http", "mailto"] },
      }),
      SemanticBlock,
      AddressableBlockAttributes,
      Placeholder.configure({ placeholder: ({ node }) => node.type.name === "semanticBlock" ? sectionPlaceholdersRef.current?.[node.attrs.semanticType] ?? labels.placeholder : labels.placeholder }),
    ],
    content: normalizeRichTextDocument(value),
    immediatelyRender: false,
    editable: !disabled,
    editorProps: { attributes: editorAttributes(labels.textArea) },
    onCreate: ({ editor: current }) => {
      ensureEditorBlockIds(current, { emitUpdate: false });
      emitSelectionState(current, onSelectionChangeRef.current);
    },
    onUpdate: ({ editor: current, transaction }) => {
      if (transaction.getMeta("intlySkipOnChange")) return;
      ensureEditorBlockIds(current, { emitUpdate: false });
      onChangeRef.current(current.getJSON(), current.getText());
    },
    onBlur: () => onBlurRef.current?.(),
    onSelectionUpdate: ({ editor: current }) => emitSelectionState(current, onSelectionChangeRef.current),
  });

  useImperativeHandle(ref, () => ({
    captureSelection: () => editor ? captureEditorSelection(editor) : null,
    getCurrentBlockId: () => editor ? getCurrentBlockId(editor) : null,
    getTextAtRange: (selection) => {
      if (!editor) return null;
      if (selection.from < 0 || selection.to > editor.state.doc.content.size || selection.from >= selection.to) return null;
      return editor.state.doc.textBetween(selection.from, selection.to, "\n", "\n").trim();
    },
    replaceRangeWithText: (selection, replacement) => {
      if (!editor) return false;
      if (selection.from < 0 || selection.to > editor.state.doc.content.size || selection.from >= selection.to) return false;
      const content = replacementTextToInlineContent(replacement);
      return editor.chain().focus().insertContentAt({ from: selection.from, to: selection.to }, content).run();
    },
    getDocument: () => editor?.getJSON() ?? null,
    getHtml: () => editor ? sanitizeEditorHtml(editor.getHTML()) : null,
    getMarkdown: () => editor ? documentToMarkdown(editor.getJSON()) : null,
    applyDocument: (document) => {
      if (!editor) return false;
      const applied = setEditorDocument(editor, document, { emitUpdate: true, addToHistory: true });
      return applied;
    },
    focus: () => { editor?.commands.focus(); },
    focusText: (text) => editor ? focusTextMatch(editor, text) : false,
    focusBlock: (blockId) => editor ? focusEditorBlock(editor, blockId) : false,
  }), [editor]);

  useEffect(() => { editor?.setEditable(!disabled); }, [editor, disabled]);
  useEffect(() => { editor?.setOptions({ editorProps: { attributes: editorAttributes(labels.textArea) } }); }, [editor, labels.textArea]);
  useEffect(() => {
    if (editor && !equivalentRichTextDocuments(editor.getJSON(), value)) {
      setEditorDocument(editor, value, { emitUpdate: false, addToHistory: false });
    }
  }, [editor, value]);

  const state = useEditorState({ editor, selector: ({ editor: current }) => ({
    bold: current?.isActive("bold") ?? false,
    italic: current?.isActive("italic") ?? false,
    h2: current?.isActive("heading", { level: 2 }) ?? false,
    h3: current?.isActive("heading", { level: 3 }) ?? false,
    link: current?.isActive("link") ?? false,
    canUndo: current?.can().undo() ?? false,
    canRedo: current?.can().redo() ?? false,
  }) });
  return <div className="overflow-clip rounded-lg border bg-card">
    <div className="sticky top-16 z-20 flex flex-wrap gap-1 rounded-t-lg border-b bg-card p-2 md:static">
      <Button type="button" variant="ghost" size="icon" disabled={!editor || disabled || !state?.canUndo} aria-label={labels.undo} onClick={() => editor?.chain().focus().undo().run()}><Undo2 className="size-4" /></Button>
      <Button type="button" variant="ghost" size="icon" disabled={!editor || disabled || !state?.canRedo} aria-label={labels.redo} onClick={() => editor?.chain().focus().redo().run()}><Redo2 className="size-4" /></Button>
      <Button type="button" variant={state?.bold ? "secondary" : "ghost"} size="icon" disabled={!editor || disabled} aria-label={labels.bold} onClick={() => editor?.chain().focus().toggleBold().run()}><Bold className="size-4" /></Button>
      <Button type="button" variant={state?.italic ? "secondary" : "ghost"} size="icon" disabled={!editor || disabled} aria-label={labels.italic} onClick={() => editor?.chain().focus().toggleItalic().run()}><Italic className="size-4" /></Button>
      <Button type="button" variant={state?.h2 ? "secondary" : "ghost"} size="icon" disabled={!editor || disabled} aria-label={labels.heading2} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="size-4" /></Button>
      <Button type="button" variant={state?.h3 ? "secondary" : "ghost"} size="icon" disabled={!editor || disabled} aria-label={labels.heading3} onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 className="size-4" /></Button>
      <Button type="button" variant="ghost" size="icon" disabled={!editor || disabled} aria-label={labels.bulletList} onClick={() => editor?.chain().focus().toggleBulletList().run()}><List className="size-4" /></Button>
      <Button type="button" variant="ghost" size="icon" disabled={!editor || disabled} aria-label={labels.orderedList} onClick={() => editor?.chain().focus().toggleOrderedList().run()}><ListOrdered className="size-4" /></Button>
      <Button type="button" variant={state?.link ? "secondary" : "ghost"} size="icon" disabled={!editor || disabled} aria-label={labels.link} onClick={() => { if (editor) toggleLink(editor); }}><Link2 className="size-4" /></Button>
    </div>
    <EditorContent editor={editor} />
  </div>;
});

RichTextEditor.displayName = "RichTextEditor";

function editorAttributes(textAreaLabel: string): Record<string, string> {
  return {
    class: "min-h-64 px-5 py-4 outline-none [&_[data-semantic-node]]:my-2 [&_[data-semantic-node]]:rounded-md [&_[data-semantic-node]]:border-l-2 [&_[data-semantic-node]]:border-muted-foreground/20 [&_[data-semantic-node]]:pl-3 [&_p]:my-2 [&_h2]:mt-4 [&_h2]:text-lg [&_h3]:mt-3 [&_h3]:text-base [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5",
    role: "textbox",
    "aria-label": textAreaLabel,
    "aria-multiline": "true",
  };
}

const SemanticBlock = Node.create({
  name: "semanticBlock",
  group: "block",
  content: "inline*",
  defining: true,
  addAttributes() {
    return {
      blockId: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute("data-block-id") ?? element.getAttribute("id"),
        renderHTML: (attributes: Record<string, unknown>) => typeof attributes.blockId === "string" && attributes.blockId ? { "data-block-id": attributes.blockId } : {},
      },
      semanticType: {
        default: "generic",
        parseHTML: (element: HTMLElement) => semanticBlockType(element.getAttribute("data-semantic-type")),
        renderHTML: (attributes: Record<string, unknown>) => ({ "data-semantic-type": semanticBlockType(attributes.semanticType) }),
      },
      generationMetadata: {
        default: null,
        rendered: false,
      },
    };
  },
  parseHTML() {
    return [{ tag: "section[data-semantic-node]" }];
  },
  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    return ["section", mergeAttributes(HTMLAttributes, { "data-semantic-node": "true" }), 0];
  },
});

const AddressableBlockAttributes = Extension.create({
  name: "addressableBlockAttributes",
  addGlobalAttributes() {
    return [{
      types: ["paragraph", "heading", "bulletList", "orderedList", "blockquote", "codeBlock"],
      attributes: {
        blockId: {
          default: null,
          parseHTML: (element: HTMLElement) => element.getAttribute("data-block-id") ?? element.getAttribute("id"),
          renderHTML: (attributes: Record<string, unknown>) => typeof attributes.blockId === "string" && attributes.blockId ? { "data-block-id": attributes.blockId } : {},
        },
      },
    }];
  },
});

function setEditorDocument(editor: Editor, document: JSONContent, options: { emitUpdate: boolean; addToHistory: boolean }): boolean {
  const content = normalizeRichTextDocument(document);
  const created = editor.schema.nodeFromJSON(content);
  const transaction = editor.state.tr
    .replaceWith(0, editor.state.doc.content.size, created.content)
    .setMeta("addToHistory", options.addToHistory)
    .setMeta("intlySkipOnChange", !options.emitUpdate);
  if (options.addToHistory) transaction.setMeta(PROSEMIRROR_CLOSE_HISTORY_META, true);
  editor.view.dispatch(transaction);
  if (options.addToHistory) {
    editor.view.dispatch(
      editor.state.tr
        .setMeta(PROSEMIRROR_CLOSE_HISTORY_META, true)
        .setMeta("addToHistory", false)
        .setMeta("intlySkipOnChange", true),
    );
  }
  return true;
}

function ensureEditorBlockIds(editor: Editor, options: { emitUpdate: boolean }): boolean {
  const seen = new Set<string>();
  let transaction = editor.state.tr;
  let changed = false;
  editor.state.doc.descendants((node: { type: { name: string }; attrs: Record<string, unknown> }, pos: number) => {
    if (editor.state.doc.resolve(pos).depth !== 0) return true;
    if (!ADDRESSABLE_BLOCK_NODE_TYPES.has(node.type.name)) return true;
    const blockId = node.attrs.blockId;
    if (typeof blockId === "string" && blockId.trim() && !seen.has(blockId)) {
      seen.add(blockId);
      return false;
    }
    const nextId = createRichTextBlockId();
    seen.add(nextId);
    transaction = transaction.setNodeMarkup(pos, undefined, { ...node.attrs, blockId: nextId });
    changed = true;
    return false;
  });
  if (changed) {
    const finalTransaction = transaction.setMeta("addToHistory", false).setMeta("intlySkipOnChange", !options.emitUpdate);
    editor.view.dispatch(finalTransaction);
  }
  return changed;
}

function getCurrentBlockId(editor: Editor): string | null {
  const { $from } = editor.state.selection;
  const topLevelNode = $from.depth >= 1 ? $from.node(1) as { type: { name: string }; attrs: Record<string, unknown> } : null;
  if (!topLevelNode || !ADDRESSABLE_BLOCK_NODE_TYPES.has(topLevelNode.type.name)) return null;
  const blockId = topLevelNode.attrs.blockId;
  return typeof blockId === "string" && blockId.trim() ? blockId.trim() : null;
}

function focusEditorBlock(editor: Editor, blockId: string): boolean {
  let position: number | null = null;
  editor.state.doc.descendants((node, pos) => {
    if (position !== null) return false;
    if (node.attrs.blockId === blockId && node.isTextblock) { position = pos; return false; }
    return true;
  });
  if (position === null) return false;
  const applied = editor.chain().focus().setTextSelection(position + 1).run();
  if (applied) {
    const dom = editor.view.nodeDOM(position);
    (dom instanceof Element ? dom : dom?.parentElement)?.scrollIntoView({ block: "center" });
  }
  return applied;
}

function focusTextMatch(editor: Editor, searchText: string): boolean {
  const needle = searchText.trim();
  if (!needle) return false;
  const segments: Array<{ start: number; end: number; pos: number }> = [];
  let flatText = "";
  editor.state.doc.descendants((node: { isText?: boolean; text?: string }, pos: number) => {
    if (!node.isText || typeof node.text !== "string") return true;
    const start = flatText.length;
    flatText += node.text;
    segments.push({ start, end: flatText.length, pos });
    return true;
  });
  const index = flatText.indexOf(needle);
  if (index < 0) return false;
  const from = documentPositionFromFlatIndex(segments, index);
  const to = documentPositionFromFlatIndex(segments, index + needle.length);
  if (from === null || to === null || from >= to) return false;
  const applied = editor.chain().focus().setTextSelection({ from, to }).run();
  if (!applied) return false;
  const dom = editor.view.domAtPos(from).node;
  const target = dom instanceof Element ? dom : dom.parentElement;
  target?.scrollIntoView({ block: "center" });
  return true;
}

function documentPositionFromFlatIndex(segments: Array<{ start: number; end: number; pos: number }>, flatIndex: number): number | null {
  const segment = segments.find((item) => flatIndex >= item.start && flatIndex <= item.end);
  if (!segment) return null;
  return segment.pos + flatIndex - segment.start;
}

function emitSelectionState(editor: Editor, callback: ((state: RichTextSelectionState) => void) | undefined) {
  if (!callback) return;
  const selection = captureEditorSelection(editor);
  callback({ selection, blockId: selection?.blockId ?? getCurrentBlockId(editor) });
}

function captureEditorSelection(editor: Editor): RichTextSelection | null {
  const { from, to, empty } = editor.state.selection;
  if (empty || from === to) return null;
  const text = editor.state.doc.textBetween(from, to, "\n", "\n").trim();
  if (!text) return null;
  const surroundingText = editor.state.doc.textBetween(0, editor.state.doc.content.size, "\n", "\n").trim().slice(0, 20000);
  return { from, to, text, surroundingText, blockId: getSingleSelectedBlockId(editor, from, to) ?? undefined };
}

function getSingleSelectedBlockId(editor: Editor, from: number, to: number): string | null {
  const selectedBlockIds = new Set<string>();
  editor.state.doc.nodesBetween(from, to, (node: { type: { name: string }; attrs: Record<string, unknown> }, _pos: number, parent: unknown) => {
    if (parent !== editor.state.doc) return true;
    if (!ADDRESSABLE_BLOCK_NODE_TYPES.has(node.type.name)) return true;
    const blockId = node.attrs.blockId;
    if (typeof blockId === "string" && blockId.trim()) selectedBlockIds.add(blockId.trim());
    return false;
  });
  if (selectedBlockIds.size !== 1) return null;
  return Array.from(selectedBlockIds)[0] ?? null;
}

function toggleLink(editor: Editor) {
  if (editor.isActive("link")) {
    editor.chain().focus().unsetLink().run();
    return;
  }
  const existing = editor.getAttributes("link").href;
  const input = globalThis.prompt?.("URL", typeof existing === "string" ? existing : "https://");
  const href = sanitizeLinkHref(input);
  if (!href) return;
  editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
}

function sanitizeEditorHtml(html: string): string {
  const template = globalThis.document?.createElement("template");
  if (!template) return html;
  template.innerHTML = html;
  template.content.querySelectorAll("a").forEach((link) => {
    const href = sanitizeLinkHref(link.getAttribute("href"));
    if (!href) {
      link.replaceWith(...Array.from(link.childNodes));
      return;
    }
    link.setAttribute("href", href);
    link.setAttribute("rel", "noopener noreferrer");
  });
  template.content.querySelectorAll("script,style,iframe,object,embed").forEach((node) => node.remove());
  return template.innerHTML;
}
