import { describe, expect, it } from "vitest";
import { applyEditorOperations, applyEditorOperation, listResponseEditorBlocks, normalizeResponseChecklist, parseEditorTransformOperations, parseRewriteSelectionOperations, previewEditorOperation, responseReadinessBlockers, responseReadinessIssues, rewriteSelectionOperationText, shouldAutosaveDraft, shouldHydrateFromServer, shouldInterceptResponseNavigationClick, transformSelectionPayload, withChecklistItem, serializeResponseChecklist } from "./response-panel-state";

describe("ResponsePanel draft hydration", () => {
  it("hydrates from server placeholder replacement only after real load and before user edits", () => {
    expect(shouldHydrateFromServer({ hydrated: false, localVersion: 0, savedVersion: 0, userEdited: false })).toBe(false);
    expect(shouldHydrateFromServer({ hydrated: true, localVersion: 0, savedVersion: 0, userEdited: false })).toBe(true);
    expect(shouldHydrateFromServer({ hydrated: true, localVersion: 1, savedVersion: 0, userEdited: true })).toBe(false);
  });

  it("does not autosave placeholder or programmatic empty content before an explicit edit", () => {
    expect(shouldAutosaveDraft({ hydrated: false, saveState: "dirty", userEdited: true })).toBe(false);
    expect(shouldAutosaveDraft({ hydrated: true, saveState: "dirty", userEdited: false })).toBe(false);
    expect(shouldAutosaveDraft({ hydrated: true, saveState: "dirty", userEdited: true })).toBe(true);
  });


  it("lets browser download anchors bypass the dirty draft navigation guard", () => {
    const dirtyNavigation = {
      allowNavigation: false,
      defaultPrevented: false,
      button: 0,
      modifierKey: false,
      hasPendingJob: false,
      hasUnsavedChanges: true,
    };

    expect(shouldInterceptResponseNavigationClick({
      ...dirtyNavigation,
      target: { actionable: true, insideWrapper: false, download: false },
    })).toBe(true);
    expect(shouldInterceptResponseNavigationClick({
      ...dirtyNavigation,
      target: { actionable: true, insideWrapper: false, download: true },
    })).toBe(false);
    expect(shouldInterceptResponseNavigationClick({
      ...dirtyNavigation,
      hasPendingJob: true,
      hasUnsavedChanges: false,
      target: { actionable: true, insideWrapper: false, download: true },
    })).toBe(false);
  });
});

describe("ResponsePanel readiness", () => {
  it("requires backend checklist keys factsChecked, requirementsCovered, noUnresolvedPlaceholders, and userReviewed", () => {
    const empty = normalizeResponseChecklist({});
    expect(empty.complete).toBe(false);
    expect(empty.items.map((item) => item.id)).toEqual(["factsChecked", "requirementsCovered", "noUnresolvedPlaceholders", "userReviewed"]);

    const checked = empty.items.reduce((checklist, item) => withChecklistItem(checklist, item.id, true), empty);
    expect(checked.complete).toBe(true);
    expect(serializeResponseChecklist(checked)).toMatchObject({
      factsChecked: true,
      requirementsCovered: true,
      noUnresolvedPlaceholders: true,
      userReviewed: true,
      complete: true,
    });
  });

  it("localizes canonical readiness labels by key while preserving saved checked values and custom checks", () => {
    const checklist = normalizeResponseChecklist({
      factsChecked: true,
      items: [
        { id: "factsChecked", label: "Факты проверены", description: "Старое RU описание", checked: true },
        { id: "requirementsCovered", label: "Требования закрыты", description: "Старое RU описание", checked: false },
        { id: "customLegal", label: "Legal approved", description: "Internal custom check", required: false, checked: true },
      ],
    }, "en");

    expect(checklist.items.find((item) => item.id === "factsChecked")).toMatchObject({ label: "Facts checked", checked: true });
    expect(checklist.items.find((item) => item.id === "requirementsCovered")).toMatchObject({ label: "Requirements covered", checked: false });
    expect(checklist.items.find((item) => item.id === "customLegal")).toMatchObject({ label: "Legal approved", description: "Internal custom check", required: false, checked: true });
  });

  it("blocks final actions for empty text, incomplete checklist, placeholders, and unresolved suggestions", () => {
    const checklist = normalizeResponseChecklist({});
    expect(responseReadinessBlockers({ hydrated: true, text: "", checklist, unresolvedPlaceholders: ["{{name}}"], hasUnresolvedSuggestion: true })).toEqual(expect.arrayContaining([
      "Добавьте текст отклика",
      "Подтвердите: факты проверены",
      "Заполните плейсхолдеры: {{name}}",
      "Примените или отклоните AI-правку",
    ]));
  });

  it("exposes typed readiness issue targets for accessible navigation", () => {
    const checklist = normalizeResponseChecklist({ factsChecked: true });
    const issues = responseReadinessIssues({ hydrated: true, text: "", checklist, unresolvedPlaceholders: ["{{name}}", "{{budget}}"], hasUnresolvedSuggestion: true, generationStatus: "stale" });

    expect(issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "empty-text", target: { kind: "editor" } }),
      expect.objectContaining({ id: "checklist:requirementsCovered", target: { kind: "checklist", itemId: "requirementsCovered" } }),
      expect.objectContaining({ target: { kind: "placeholder", value: "{{name}}" } }),
      expect.objectContaining({ id: "unresolved-suggestion", target: { kind: "suggestion" } }),
      expect.objectContaining({ id: "stale-generation", target: { kind: "generation" } }),
    ]));
  });

  it("keeps loading readiness issue as plain status without invented target", () => {
    const checklist = normalizeResponseChecklist({ factsChecked: true, requirementsCovered: true, noUnresolvedPlaceholders: true, userReviewed: true });
    const issues = responseReadinessIssues({ hydrated: false, text: "Ready", checklist, unresolvedPlaceholders: [], hasUnresolvedSuggestion: false });

    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ id: "draft-loading" });
    expect(issues[0]).not.toHaveProperty("target");
  });
});

describe("ResponsePanel typed AI transform operations", () => {
  it("posts backend selection target payload", () => {
    expect(transformSelectionPayload({ from: 2, to: 8, text: "old", surroundingText: "before old after" })).toEqual({
      target: { kind: "selection", selectionText: "old", surroundingText: "before old after" },
    });
  });

  it("accepts typed editor operations with draftId, target, content, and baseRevision", () => {
    const output = {
      draftId: "draft-1",
      baseRevision: 3,
      explanation: "clearer",
      operations: [
        { type: "rewriteSelection", baseRevision: 3, target: { kind: "tiptap_text_range", from: 2, to: 8, text: "old" }, content: { text: "legacy fallback must be ignored" } },
        { tool: "rewriteSelection", baseRevision: 3, target: { kind: "selection", selectionText: "old" }, content: { text: "new" }, explanation: "clearer" },
      ],
    };
    expect(parseRewriteSelectionOperations(output, "draft-1", 3)).toEqual([]);
    output.operations.shift();
    const rewriteOperations = parseRewriteSelectionOperations(output, "draft-1", 3);
    expect(rewriteOperations).toHaveLength(1);
    expect(rewriteSelectionOperationText(rewriteOperations[0])).toBe("new");

    const semanticOutput = {
      draftId: "draft-1",
      baseRevision: 3,
      explanation: "block edits",
      operations: [
        { tool: "replaceBlock", baseRevision: 3, target: { kind: "block", blockId: "intro" }, content: { nodeType: "paragraph", text: "New intro" } },
        { tool: "insertAfter", baseRevision: 3, target: { kind: "block", blockId: "intro" }, content: { text: "Extra detail" } },
        { tool: "removeBlock", baseRevision: 3, target: { kind: "block", blockId: "closing" } },
        { tool: "replaceDocument", baseRevision: 3, target: { kind: "document" }, content: { markdown: "Full replacement" } },
      ],
    };
    expect(parseEditorTransformOperations(semanticOutput, "draft-1", 3).map((operation) => operation.tool)).toEqual(["replaceBlock", "insertAfter", "removeBlock", "replaceDocument"]);
  });

  it("rejects stale baseRevision and wrong draftId operations", () => {
    const output = { draftId: "draft-1", baseRevision: 2, explanation: "stale", operations: [{ tool: "rewriteSelection", baseRevision: 2, target: { kind: "selection", selectionText: "old" }, content: { text: "new" } }] };
    expect(parseRewriteSelectionOperations(output, "draft-1", 3)).toEqual([]);
    expect(parseRewriteSelectionOperations(output, "draft-2", 2)).toEqual([]);
  });

  it("accepts the complete editor tool catalog only with contract-valid targets and content", () => {
    const output = {
      draftId: "draft-1",
      baseRevision: 3,
      explanation: "catalog",
      operations: [
        { tool: "rewriteSelection", baseRevision: 3, target: { kind: "selection", selectionText: "old" }, content: { text: "new" } },
        { tool: "replaceBlock", baseRevision: 3, target: { kind: "block", blockId: "intro" }, content: { nodeType: "bulletList", text: "One\nTwo" } },
        { tool: "regenerateBlock", baseRevision: 3, target: { kind: "block", blockId: "intro" }, content: { text: "Regenerated" } },
        { tool: "shortenBlock", baseRevision: 3, target: { kind: "block", blockId: "intro" }, content: { text: "Short" } },
        { tool: "changeTone", baseRevision: 3, target: { kind: "selection", selectionText: "Formal" }, content: { text: "Warmer" } },
        { tool: "emphasizeFact", baseRevision: 3, target: { kind: "block", blockId: "intro" }, content: { text: "Fact" } },
        { tool: "insertBefore", baseRevision: 3, target: { kind: "block", blockId: "intro" }, content: { nodeType: "blockquote", text: "Quote" } },
        { tool: "insertAfter", baseRevision: 3, target: { kind: "block", blockId: "intro" }, content: { nodeType: "codeBlock", text: "const x = 1;" } },
        { tool: "addParagraph", baseRevision: 3, target: { kind: "block", blockId: "intro" }, content: { text: "Paragraph" } },
        { tool: "removeBlock", baseRevision: 3, target: { kind: "block", blockId: "intro" } },
        { tool: "updateHeading", baseRevision: 3, target: { kind: "block", blockId: "heading" }, content: { text: "Heading" } },
        { tool: "replaceDocument", baseRevision: 3, target: { kind: "document" }, content: { markdown: "Whole replacement" } },
      ],
    };

    expect(parseEditorTransformOperations(output, "draft-1", 3).map(operation => operation.tool)).toEqual([
      "rewriteSelection", "replaceBlock", "regenerateBlock", "shortenBlock", "changeTone", "emphasizeFact",
      "insertBefore", "insertAfter", "addParagraph", "removeBlock", "updateHeading", "replaceDocument",
    ]);
  });

  it("rejects malformed tool scopes and unknown structural node types", () => {
    const base = { draftId: "draft-1", baseRevision: 3, explanation: "bad" };
    const badOperations = [
      { tool: "changeTone", baseRevision: 3, target: { kind: "document" }, content: { text: "No" } },
      { tool: "addParagraph", baseRevision: 3, target: { kind: "selection", selectionText: "No" }, content: { text: "No" } },
      { tool: "updateHeading", baseRevision: 3, target: { kind: "block", blockId: "heading" }, content: { nodeType: "heading", text: "No" } },
      { tool: "replaceBlock", baseRevision: 3, target: { kind: "block", blockId: "intro" }, content: { nodeType: "madeUpNode", text: "No" } },
      { tool: "insertAfter", baseRevision: 3, target: { kind: "block", blockId: "intro" }, content: { nodeType: "madeUpNode", text: "No" } },
      { tool: "replaceDocument", baseRevision: 3, target: { kind: "document" }, content: { documentJson: { type: "doc" } } },
    ];

    for (const operation of badOperations) {
      expect(parseEditorTransformOperations({ ...base, operations: [operation] }, "draft-1", 3)).toEqual([]);
    }
  });
});


describe("ResponsePanel semantic editor document operations", () => {
  const document = {
    type: "doc",
    content: [
      { type: "paragraph", attrs: { id: "intro" }, content: [{ type: "text", text: "Old intro" }] },
      { type: "heading", attrs: { id: "closing", level: 2 }, content: [{ type: "text", text: "Closing" }] },
    ],
  };

  it("lists stable semantic blocks from document attrs or fallback ids", () => {
    expect(listResponseEditorBlocks(document)).toEqual([
      { id: "intro", index: 0, nodeType: "paragraph", text: "Old intro" },
      { id: "closing", index: 1, nodeType: "heading", text: "Closing" },
    ]);
  });

  it("applies replace, insert, heading update, remove, and document replacement operations", () => {
    const replaced = applyEditorOperation(document, { tool: "replaceBlock", baseRevision: 3, target: { kind: "block", blockId: "intro" }, content: { text: "New intro" } });
    expect(listResponseEditorBlocks(replaced!).at(0)?.text).toBe("New intro");

    const inserted = applyEditorOperation(replaced!, { tool: "insertAfter", baseRevision: 3, target: { kind: "block", blockId: "intro" }, content: { text: "Inserted paragraph" } });
    expect(listResponseEditorBlocks(inserted!).map((block) => block.text)).toEqual(["New intro", "Inserted paragraph", "Closing"]);

    const updatedHeading = applyEditorOperation(inserted!, { tool: "updateHeading", baseRevision: 3, target: { kind: "block", blockId: "closing" }, content: { text: "Next steps" } });
    expect(listResponseEditorBlocks(updatedHeading!).at(2)?.text).toBe("Next steps");

    const removed = applyEditorOperation(updatedHeading!, { tool: "removeBlock", baseRevision: 3, target: { kind: "block", blockId: "intro" } });
    expect(listResponseEditorBlocks(removed!).map((block) => block.text)).toEqual(["Inserted paragraph", "Next steps"]);

    const replacedDocument = applyEditorOperation(removed!, { tool: "replaceDocument", baseRevision: 3, target: { kind: "document" }, content: { markdown: "Whole draft" } });
    expect(listResponseEditorBlocks(replacedDocument!).map((block) => block.text)).toEqual(["Whole draft"]);
  });

  it("builds structurally valid list, quote, code, semantic, and heading nodes", () => {
    const source = { type: "doc", content: [
      { type: "paragraph", attrs: { id: "intro" }, content: [{ type: "text", text: "Old intro" }] },
      { type: "heading", attrs: { id: "heading", level: 3 }, content: [{ type: "text", text: "Old heading" }] },
      { type: "semanticBlock", attrs: { blockId: "semantic", semanticType: "price-timeline" }, content: [{ type: "text", text: "Old price" }] },
    ] };

    const listed = applyEditorOperation(source, { tool: "replaceBlock", baseRevision: 3, target: { kind: "block", blockId: "intro" }, content: { nodeType: "bulletList", text: "One\nTwo" } })!;
    expect(listed.content?.[0]).toMatchObject({
      type: "bulletList",
      attrs: { blockId: "intro" },
      content: [
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "One" }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Two" }] }] },
      ],
    });

    const quoted = applyEditorOperation(listed, { tool: "insertAfter", baseRevision: 3, target: { kind: "block", blockId: "intro" }, content: { nodeType: "blockquote", text: "Quote line" } })!;
    const quote = quoted.content?.[1];
    expect(quote).toMatchObject({ type: "blockquote", content: [{ type: "paragraph", content: [{ type: "text", text: "Quote line" }] }] });
    expect(quote?.attrs?.blockId).toBeTruthy();
    expect(quote?.attrs?.blockId).not.toBe("intro");

    const coded = applyEditorOperation(quoted, { tool: "insertAfter", baseRevision: 3, target: { kind: "block", blockId: "intro" }, content: { nodeType: "codeBlock", text: "const x = 1;" } })!;
    expect(coded.content?.[1]).toMatchObject({ type: "codeBlock", content: [{ type: "text", text: "const x = 1;" }] });

    const semantic = applyEditorOperation(coded, { tool: "replaceBlock", baseRevision: 3, target: { kind: "block", blockId: "semantic" }, content: { nodeType: "intro", text: "New semantic" } })!;
    expect(semantic.content?.find(node => node.attrs?.blockId === "semantic")).toMatchObject({ type: "semanticBlock", attrs: { blockId: "semantic", semanticType: "price-timeline" }, content: [{ type: "text", text: "New semantic" }] });

    const insertedSemantic = applyEditorOperation(semantic, { tool: "insertAfter", baseRevision: 3, target: { kind: "block", blockId: "semantic" }, content: { nodeType: "intro", text: "Inserted semantic" } })!;
    expect(insertedSemantic.content?.find(node => node.attrs?.semanticType === "intro")).toMatchObject({ type: "semanticBlock", content: [{ type: "text", text: "Inserted semantic" }] });

    const heading = applyEditorOperation(semantic, { tool: "updateHeading", baseRevision: 3, target: { kind: "block", blockId: "heading" }, content: { text: "New heading" } })!;
    expect(heading.content?.find(node => node.attrs?.blockId === "heading")).toMatchObject({ type: "heading", attrs: { blockId: "heading", level: 3 }, content: [{ type: "text", text: "New heading" }] });
    expect(applyEditorOperation(heading, { tool: "updateHeading", baseRevision: 3, target: { kind: "block", blockId: "intro" }, content: { text: "Not heading" } })).toBeNull();
  });

  it("validates and normalizes full document replacement before acceptance", () => {
    const validDocument = { type: "doc", content: [
      { type: "paragraph", attrs: { id: "legacy" }, content: [{ type: "text", text: "Kept text", marks: [{ type: "bold" }] }, { type: "text", text: " link", marks: [{ type: "link", attrs: { href: "https://example.com" } }] }] },
      { type: "bulletList", content: [{
        type: "listItem",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "Valid item" }] },
          { type: "paragraph", content: [{ type: "text", text: "Continuation" }] },
          { type: "orderedList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Nested" }] }] }] },
        ],
      }] },
      { type: "technical-fit", content: [{ type: "text", text: "Semantic alias" }] },
      { type: "blockquote", content: [
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Quoted heading" }] },
        { type: "codeBlock", content: [{ type: "text", text: "const ok = true;" }] },
        { type: "semanticBlock", attrs: { semanticType: "generic" }, content: [{ type: "text", text: "Quoted semantic" }] },
        { type: "blockquote", content: [{ type: "paragraph", content: [{ type: "text", text: "Nested quote" }] }] },
      ] },
    ] };
    const malformedListDocument = { type: "doc", content: [{ type: "bulletList", content: [{ type: "text", text: "lost" }] }] };
    const unknownNodeDocument = { type: "doc", content: [{ type: "madeUpNode", content: [{ type: "text", text: "lost" }] }] };
    const malformedQuoteDocument = { type: "doc", content: [{ type: "blockquote", content: [null] }] };
    const emptyTextDocument = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "" }] }] };
    const hardBreakWithMarksDocument = { type: "doc", content: [{ type: "paragraph", content: [{ type: "hardBreak", marks: [{ type: "bold" }] }] }] };
    const scalarAttrsDocument = { type: "doc", content: [{ type: "heading", attrs: "bad", content: [{ type: "text", text: "Bad attrs" }] }] };
    const scalarListFirstParagraphAttrsDocument = { type: "doc", content: [{ type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph", attrs: "bad", content: [{ type: "text", text: "Bad attrs" }] }] }] }] };
    const nestedQuote = (depth: number): unknown => depth <= 0
      ? { type: "paragraph", content: [{ type: "text", text: "Bottom" }] }
      : { type: "blockquote", content: [nestedQuote(depth - 1)] };
    const deeplyNestedQuoteDocument = { type: "doc", content: [nestedQuote(30)] };
    const rich = applyEditorOperation(document, { tool: "replaceDocument", baseRevision: 3, target: { kind: "document" }, content: { documentJson: validDocument } })!;

    expect(rich.content?.[0]).toMatchObject({ type: "paragraph", attrs: { blockId: "legacy" }, content: [{ type: "text", text: "Kept text", marks: [{ type: "bold" }] }, { type: "text", text: " link", marks: [{ type: "link", attrs: { href: "https://example.com" } }] }] });
    expect(rich.content?.[1]).toMatchObject({ type: "bulletList", content: [{ type: "listItem", content: [
      { type: "paragraph", content: [{ type: "text", text: "Valid item" }] },
      { type: "paragraph", content: [{ type: "text", text: "Continuation" }] },
      { type: "orderedList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Nested" }] }] }] },
    ] }] });
    expect(rich.content?.[2]).toMatchObject({ type: "semanticBlock", attrs: { semanticType: "technical-fit" } });
    expect(rich.content?.[3]).toMatchObject({ type: "blockquote", content: [
      { type: "heading", content: [{ type: "text", text: "Quoted heading" }] },
      { type: "codeBlock", content: [{ type: "text", text: "const ok = true;" }] },
      { type: "semanticBlock", attrs: { semanticType: "generic" }, content: [{ type: "text", text: "Quoted semantic" }] },
      { type: "blockquote", content: [{ type: "paragraph", content: [{ type: "text", text: "Nested quote" }] }] },
    ] });
    const empty = applyEditorOperation(document, { tool: "replaceDocument", baseRevision: 3, target: { kind: "document" }, content: { documentJson: { type: "doc", content: [] } } })!;
    expect(empty.content?.[0]).toMatchObject({ type: "paragraph", content: [] });
    expect(applyEditorOperation(document, { tool: "replaceDocument", baseRevision: 3, target: { kind: "document" }, content: { documentJson: { type: "doc" } } as never })).toBeNull();
    expect(applyEditorOperation(document, { tool: "replaceDocument", baseRevision: 3, target: { kind: "document" }, content: { documentJson: malformedListDocument } })).toBeNull();
    expect(applyEditorOperation(document, { tool: "replaceDocument", baseRevision: 3, target: { kind: "document" }, content: { documentJson: unknownNodeDocument } })).toBeNull();
    expect(applyEditorOperation(document, { tool: "replaceDocument", baseRevision: 3, target: { kind: "document" }, content: { documentJson: malformedQuoteDocument as never } })).toBeNull();
    expect(applyEditorOperation(document, { tool: "replaceDocument", baseRevision: 3, target: { kind: "document" }, content: { documentJson: emptyTextDocument } })).toBeNull();
    expect(applyEditorOperation(document, { tool: "replaceDocument", baseRevision: 3, target: { kind: "document" }, content: { documentJson: hardBreakWithMarksDocument } })).toBeNull();
    expect(applyEditorOperation(document, { tool: "replaceDocument", baseRevision: 3, target: { kind: "document" }, content: { documentJson: scalarAttrsDocument as never } })).toBeNull();
    expect(applyEditorOperation(document, { tool: "replaceDocument", baseRevision: 3, target: { kind: "document" }, content: { documentJson: scalarListFirstParagraphAttrsDocument as never } })).toBeNull();
    expect(applyEditorOperation(document, { tool: "replaceDocument", baseRevision: 3, target: { kind: "document" }, content: { documentJson: deeplyNestedQuoteDocument as never } })).toBeNull();
    expect(parseEditorTransformOperations({ draftId: "draft-1", baseRevision: 3, explanation: "bad", operations: [{ tool: "replaceDocument", baseRevision: 3, target: { kind: "document" }, content: { documentJson: malformedListDocument } }] }, "draft-1", 3)).toEqual([]);
  });

  it("does not leak semantic or heading attrs across requested replacement node types", () => {
    const source = { type: "doc", content: [
      { type: "heading", attrs: { id: "heading", level: 3 }, content: [{ type: "text", text: "Old heading" }] },
      { type: "semanticBlock", attrs: { blockId: "semantic", semanticType: "experience" }, content: [{ type: "text", text: "Old semantic" }] },
    ] };

    const headingToSemantic = applyEditorOperation(source, { tool: "replaceBlock", baseRevision: 3, target: { kind: "block", blockId: "heading" }, content: { nodeType: "intro", text: "Intro" } })!;
    expect(headingToSemantic.content?.[0]).toMatchObject({ type: "semanticBlock", attrs: { blockId: "heading", semanticType: "intro" } });
    expect(headingToSemantic.content?.[0]?.attrs).not.toHaveProperty("level");

    const semanticToHeading = applyEditorOperation(source, { tool: "replaceBlock", baseRevision: 3, target: { kind: "block", blockId: "semantic" }, content: { nodeType: "heading", text: "Heading" } })!;
    expect(semanticToHeading.content?.[1]).toMatchObject({ type: "heading", attrs: { blockId: "semantic", level: 2 } });
    expect(semanticToHeading.content?.[1]?.attrs).not.toHaveProperty("semanticType");

    const semanticToParagraph = applyEditorOperation(source, { tool: "replaceBlock", baseRevision: 3, target: { kind: "block", blockId: "semantic" }, content: { nodeType: "paragraph", text: "Plain" } })!;
    expect(semanticToParagraph.content?.[1]).toMatchObject({ type: "paragraph", attrs: { blockId: "semantic" } });
    expect(semanticToParagraph.content?.[1]?.attrs).not.toHaveProperty("semanticType");
  });

  it("previews before and after text without mutating the original document", () => {
    const operation = { tool: "replaceBlock" as const, baseRevision: 3, target: { kind: "block" as const, blockId: "intro" }, content: { text: "New intro" } };
    expect(previewEditorOperation(document, operation)).toMatchObject({ before: "Old intro", after: "New intro", changed: true, valid: true });
    expect(listResponseEditorBlocks(document).at(0)?.text).toBe("Old intro");
  });

  it("shows insertion and deletion diffs without pretending the anchor is removed or a notice is inserted", () => {
    for (const tool of ["insertBefore", "insertAfter", "addParagraph"] as const) {
      expect(previewEditorOperation(document, { tool, baseRevision: 3, target: { kind: "block", blockId: "intro" }, content: { text: "Extra detail" } })).toMatchObject({ before: "", after: "Extra detail", changed: true, valid: true });
    }
    expect(previewEditorOperation(document, { tool: "removeBlock", baseRevision: 3, target: { kind: "block", blockId: "intro" } })).toMatchObject({ before: "Old intro", after: "", changed: true, valid: true });
    expect(listResponseEditorBlocks(document).at(0)?.text).toBe("Old intro");
  });
});

describe("ResponsePanel atomic proposal acceptance", () => {
  const document = { type: "doc", content: [
    { type: "paragraph", attrs: { id: "intro" }, content: [{ type: "text", text: "Old intro" }] },
    { type: "paragraph", attrs: { id: "closing" }, content: [{ type: "text", text: "Closing" }] },
  ] };
  it("applies every reviewed operation while preserving the source document", () => {
    const next = applyEditorOperations(document, [
      { tool: "replaceBlock", baseRevision: 3, target: { kind: "block", blockId: "intro" }, content: { text: "New intro" } },
      { tool: "insertAfter", baseRevision: 3, target: { kind: "block", blockId: "intro" }, content: { text: "Detail" } },
      { tool: "removeBlock", baseRevision: 3, target: { kind: "block", blockId: "closing" } },
    ], { kind: "document" });
    expect(listResponseEditorBlocks(next!).map(block => block.text)).toEqual(["New intro", "Detail"]);
    expect(listResponseEditorBlocks(document).map(block => block.text)).toEqual(["Old intro", "Closing"]);
  });
  it("keeps sequential after-anchor inserts in proposal order", () => {
    const next = applyEditorOperations(document, [
      { tool: "insertAfter", baseRevision: 3, target: { kind: "block", blockId: "intro" }, content: { text: "One" } },
      { tool: "insertAfter", baseRevision: 3, target: { kind: "block", blockId: "intro" }, content: { text: "Two" } },
      { tool: "addParagraph", baseRevision: 3, target: { kind: "block", blockId: "intro" }, content: { text: "Three" } },
    ], { kind: "document" });
    expect(listResponseEditorBlocks(next!).map(block => block.text)).toEqual(["Old intro", "One", "Two", "Three", "Closing"]);
  });
  it("rejects the whole proposal when any target fails or an operation exceeds its requested scope", () => {
    expect(applyEditorOperations(document, [
      { tool: "replaceBlock", baseRevision: 3, target: { kind: "block", blockId: "intro" }, content: { text: "New intro" } },
      { tool: "removeBlock", baseRevision: 3, target: { kind: "block", blockId: "missing" } },
    ], { kind: "document" })).toBeNull();
    expect(applyEditorOperations(document, [
      { tool: "replaceDocument", baseRevision: 3, target: { kind: "document" }, content: { markdown: "Escalation" } },
    ], { kind: "block", blockId: "intro" })).toBeNull();
  });
});
