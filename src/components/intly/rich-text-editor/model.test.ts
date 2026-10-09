import { describe, expect, it } from "vitest";
import { documentToMarkdown, equivalentRichTextDocuments, markdownToDocument, normalizeRichTextDocument, replacementTextToInlineContent, sanitizeLinkHref, semanticBlockType } from "./model";
import type { JSONContent } from "@tiptap/react";

describe("rich text editor document model", () => {
  it("preserves existing block ids and assigns stable ids only where missing", () => {
    const ids = ["new-a", "new-b"];
    const document: JSONContent = {
      type: "doc",
      content: [
        { type: "paragraph", attrs: { blockId: "intro-1" }, content: [{ type: "text", text: "Intro" }] },
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Details" }] },
      ],
    };

    const normalized = normalizeRichTextDocument(document, { createId: () => ids.shift() ?? "fallback" });

    expect(normalized.content?.[0]?.attrs?.blockId).toBe("intro-1");
    expect(normalized.content?.[1]?.attrs?.blockId).toBe("new-a");
  });

  it("deduplicates copied or split block ids without index-derived fallbacks", () => {
    const ids = ["split-copy"];
    const document: JSONContent = {
      type: "doc",
      content: [
        { type: "paragraph", attrs: { blockId: "same-id" }, content: [{ type: "text", text: "First" }] },
        { type: "paragraph", attrs: { blockId: "same-id" }, content: [{ type: "text", text: "Second" }] },
      ],
    };

    const normalized = normalizeRichTextDocument(document, { createId: () => ids.shift() ?? "fallback" });

    expect(normalized.content?.map((node) => node.attrs?.blockId)).toEqual(["same-id", "split-copy"]);
  });

  it("strips schema-incompatible technical id attrs while preserving canonical block ids", () => {
    const document: JSONContent = {
      type: "doc",
      content: [
        { type: "paragraph", attrs: { id: "backend-id", "data-block-id": "dom-id" }, content: [{ type: "text", text: "First" }] },
        { type: "paragraph", attrs: { blockId: "second", id: "legacy-id" }, content: [{ type: "text", text: "Second" }] },
      ],
    };

    const normalized = normalizeRichTextDocument(document);

    expect(normalized.content?.[0]?.attrs).toEqual({ blockId: "backend-id" });
    expect(normalized.content?.[1]?.attrs).toEqual({ blockId: "second" });
    expect(equivalentRichTextDocuments(document, normalized)).toBe(true);
  });

  it("keeps known and safe unknown semantic block types but normalizes unsafe metadata", () => {
    const document: JSONContent = {
      type: "doc",
      content: [
        { type: "semanticBlock", attrs: { semanticType: "technical-fit" }, content: [{ type: "text", text: "Stack" }] },
        { type: "semanticBlock", attrs: { semanticType: "custom-safe" }, content: [{ type: "text", text: "Custom" }] },
        { type: "semanticBlock", attrs: { semanticType: "bad value <script>" }, content: [{ type: "text", text: "Bad" }] },
      ],
    };

    const normalized = normalizeRichTextDocument(document, { createId: (() => {
      let index = 0;
      return () => `id-${index += 1}`;
    })() });

    expect(normalized.content?.map((node) => node.attrs?.semanticType)).toEqual(["technical-fit", "custom-safe", "generic"]);
    expect(semanticBlockType("documents-checklist")).toBe("documents-checklist");
  });

  it("normalizes backend semantic node names and unknown node types safely", () => {
    const ids = ["intro-id", "unknown-id"];
    const document: JSONContent = {
      type: "doc",
      content: [
        { type: "intro", content: [{ type: "text", text: "Hello" }] },
        { type: "madeUpNode", content: [{ type: "text", text: "Kept text" }] },
      ],
    };

    const normalized = normalizeRichTextDocument(document, { createId: () => ids.shift() ?? "fallback" });

    expect(normalized.content?.[0]).toMatchObject({ type: "semanticBlock", attrs: { blockId: "intro-id", semanticType: "intro" } });
    expect(normalized.content?.[1]).toMatchObject({ type: "paragraph", attrs: { blockId: "unknown-id" }, content: [{ type: "text", text: "Kept text" }] });
  });

  it("assigns stable ids to top-level portable formatting blocks without marking nested list items", () => {
    const ids = ["list-id", "quote-id", "code-id"];
    const document: JSONContent = {
      type: "doc",
      content: [
        { type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "One" }] }] }] },
        { type: "blockquote", content: [{ type: "paragraph", content: [{ type: "text", text: "Quote" }] }] },
        { type: "codeBlock", content: [{ type: "text", text: "const x = 1;" }] },
      ],
    };

    const normalized = normalizeRichTextDocument(document, { createId: () => ids.shift() ?? "fallback" });

    expect(normalized.content?.map((node) => node.attrs?.blockId)).toEqual(["list-id", "quote-id", "code-id"]);
    expect(normalized.content?.[0]?.content?.[0]?.attrs?.blockId).toBeUndefined();
    expect(normalized.content?.[0]?.content?.[0]?.content?.[0]?.attrs?.blockId).toBeUndefined();
  });

  it("removes unsafe link marks and keeps only safe href protocols", () => {
    const document: JSONContent = {
      type: "doc",
      content: [{
        type: "paragraph",
        content: [
          { type: "text", text: "Safe", marks: [{ type: "link", attrs: { href: " https://example.com/a " } }] },
          { type: "text", text: "Unsafe", marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }] },
        ],
      }],
    };

    const normalized = normalizeRichTextDocument(document, { createId: () => "id-1" });
    const marks = normalized.content?.[0]?.content?.map((node) => node.marks);

    expect(marks?.[0]?.[0]?.attrs?.href).toBe("https://example.com/a");
    expect(marks?.[1]).toBeUndefined();
    expect(sanitizeLinkHref("mailto:test@example.com")).toBe("mailto:test@example.com");
    expect(sanitizeLinkHref("data:text/html,evil")).toBeNull();
  });

  it("serializes restrained portable markdown from supported rich text nodes", () => {
    const document: JSONContent = {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 2, blockId: "h" }, content: [{ type: "text", text: "Proposal" }] },
        { type: "semanticBlock", attrs: { semanticType: "intro", blockId: "s" }, content: [
          { type: "text", text: "Strong", marks: [{ type: "bold" }] },
          { type: "text", text: " and " },
          { type: "text", text: "safe", marks: [{ type: "link", attrs: { href: "https://example.com" } }] },
          { type: "hardBreak" },
          { type: "text", text: "next line" },
        ] },
        { type: "bulletList", attrs: { blockId: "l" }, content: [
          { type: "listItem", content: [
            { type: "paragraph", content: [{ type: "text", text: "First" }] },
            { type: "orderedList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Nested" }] }] }] },
          ] },
        ] },
        { type: "blockquote", attrs: { blockId: "q" }, content: [{ type: "paragraph", content: [{ type: "text", text: "Quoted" }] }] },
        { type: "codeBlock", attrs: { blockId: "c" }, content: [{ type: "text", text: "const x = 1;" }] },
      ],
    };

    expect(documentToMarkdown(document)).toBe([
      "## Proposal",
      "**Strong** and [safe](https://example.com)\nnext line",
      "- First\n  1. Nested",
      "> Quoted",
      "```\nconst x = 1;\n```",
    ].join("\n\n"));
  });

  it("parses supported markdown into safe normalized document JSON", () => {
    const ids = ["h", "p", "list", "quote", "code"];
    const document = markdownToDocument([
      "## Title",
      "",
      "Hello **bold** *italic* ~~gone~~ `code` [ok](https://example.com) [bad](javascript:alert(1))",
      "",
      "- First",
      "  1. Nested",
      "",
      "> Quote",
      "",
      "```",
      "const x = 1;",
      "```",
    ].join("\n"), { createId: () => ids.shift() ?? "fallback" });

    expect(document.content?.map((node) => node.type)).toEqual(["heading", "paragraph", "bulletList", "blockquote", "codeBlock"]);
    expect(document.content?.map((node) => node.attrs?.blockId)).toEqual(["h", "p", "list", "quote", "code"]);
    expect(documentToMarkdown(document)).toContain("[ok](https://example.com)");
    expect(documentToMarkdown(document)).toContain("bad");
    expect(documentToMarkdown(document)).not.toContain("javascript:");
  });

  it("roundtrips the supported markdown subset without unsafe protocol leakage", () => {
    const markdown = [
      "### Fit",
      "",
      "Line with **bold** and [link](mailto:test@example.com)",
      "",
      "1. One",
      "2. Two",
    ].join("\n");

    const first = documentToMarkdown(markdownToDocument(markdown, { createId: (() => {
      let index = 0;
      return () => `id-${index += 1}`;
    })() }));
    const second = documentToMarkdown(markdownToDocument(first));

    expect(second).toBe(first);
  });

  it("keeps escaped markdown markers and escaped links as plain text", () => {
    const document = markdownToDocument(String.raw`\*literal\* \[x\]\(y\)`);

    expect(document.content?.[0]?.content).toEqual([{ type: "text", text: "*literal* [x](y)" }]);
    expect(documentToMarkdown(document)).toBe(String.raw`\*literal\* \[x\]\(y\)`);
  });

  it("roundtrips combined bold italic marks and marked safe link labels", () => {
    const document: JSONContent = {
      type: "doc",
      content: [{
        type: "paragraph",
        attrs: { blockId: "p" },
        content: [
          { type: "text", text: "combo", marks: [{ type: "bold" }, { type: "italic" }] },
          { type: "text", text: " " },
          { type: "text", text: "label", marks: [{ type: "bold" }, { type: "link", attrs: { href: "https://example.com" } }] },
        ],
      }],
    };

    const markdown = documentToMarkdown(document);
    const parsed = markdownToDocument(markdown);

    expect(markdown).toBe("***combo*** [**label**](https://example.com)");
    expect(parsed.content?.[0]?.content?.[0]?.marks?.map((mark) => mark.type)).toEqual(["bold", "italic"]);
    expect(parsed.content?.[0]?.content?.[2]?.marks).toEqual([{ type: "link", attrs: { href: "https://example.com" } }, { type: "bold" }]);
  });

  it("roundtrips inline code with backticks and backslashes without dropping text", () => {
    const document: JSONContent = {
      type: "doc",
      content: [{
        type: "paragraph",
        attrs: { blockId: "p" },
        content: [
          { type: "text", text: "run " },
          { type: "text", text: "a`b\\c", marks: [{ type: "code" }] },
          { type: "text", text: " now" },
        ],
      }],
    };

    const markdown = documentToMarkdown(document);
    const parsed = markdownToDocument(markdown);

    expect(markdown).toBe("run `a\\`b\\\\c` now");
    expect(parsed.content?.[0]?.content?.map((node) => node.text).join("")).toBe("run a`b\\c now");
    expect(parsed.content?.[0]?.content?.[1]?.marks).toEqual([{ type: "code" }]);
  });

  it("builds inline replacement content without block nodes for selection rewrites", () => {
    expect(replacementTextToInlineContent(" Python\nPostgreSQL ")).toEqual([
      { type: "text", text: "Python" },
      { type: "hardBreak" },
      { type: "text", text: "PostgreSQL" },
    ]);
    expect(replacementTextToInlineContent("\n")).toEqual([]);
  });

  it("preserves ordered list start and mixed nested list types", () => {
    const document: JSONContent = {
      type: "doc",
      content: [{
        type: "orderedList",
        attrs: { start: 5, blockId: "list" },
        content: [
          { type: "listItem", content: [
            { type: "paragraph", content: [{ type: "text", text: "Five" }] },
            { type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Nested bullet" }] }] }] },
          ] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Six" }] }] },
        ],
      }],
    };

    const markdown = documentToMarkdown(document);
    const parsed = markdownToDocument(markdown);

    expect(markdown).toBe("5. Five\n  - Nested bullet\n6. Six");
    expect(parsed.content?.[0]?.attrs?.start).toBe(5);
    expect(parsed.content?.[0]?.content?.[0]?.content?.[1]?.type).toBe("bulletList");
    expect(documentToMarkdown(parsed)).toBe(markdown);
  });

  it("treats schema default null attrs as equivalent to absent attrs", () => {
    const source: JSONContent = {
      type: "doc",
      content: [{ type: "orderedList", attrs: { start: 1, blockId: "list" }, content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "One" }] }] }] }],
    };
    const schemaJson: JSONContent = {
      type: "doc",
      content: [{ type: "orderedList", attrs: { start: 1, type: null, blockId: "list" }, content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "One" }] }] }] }],
    };

    expect(equivalentRichTextDocuments(source, schemaJson)).toBe(true);
  });
});
