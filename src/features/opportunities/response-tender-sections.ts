import type { JSONContent } from "@tiptap/react";
import { blockIdFromNode, createRichTextBlockId } from "../../components/intly/rich-text-editor/model";
import type { OpportunityRecord } from "./contracts";
import type { OpportunityLocale } from "./opportunity-workspace-labels";

export const TENDER_APPLICATION_SECTION_TYPES = ["application-summary", "eligibility", "technical-response", "documents-checklist", "commercial-notes", "closing"] as const;
export type TenderApplicationSectionType = (typeof TENDER_APPLICATION_SECTION_TYPES)[number];

const sectionLabels: Record<OpportunityLocale, Record<TenderApplicationSectionType, string>> = {
  ru: { "application-summary": "Суть заявки", eligibility: "Соответствие участника", "technical-response": "Техническое предложение", "documents-checklist": "Документы", "commercial-notes": "Коммерческие условия", closing: "Заключение" },
  en: { "application-summary": "Application summary", eligibility: "Participant eligibility", "technical-response": "Technical response", "documents-checklist": "Documents", "commercial-notes": "Commercial terms", closing: "Closing" },
};

export type TenderApplicationSection = { type: TenderApplicationSectionType; label: string; blockId: string | null; complete: boolean };

export function tenderApplicationSectionLabels(locale: OpportunityLocale): Record<TenderApplicationSectionType, string> {
  return sectionLabels[locale];
}

export function tenderApplicationSections(opportunity: Pick<OpportunityRecord, "type" | "tenderData">, document: JSONContent, locale: OpportunityLocale = "ru"): { valid: boolean; sections: TenderApplicationSection[] } {
  if (opportunity.type !== "tender") return { valid: true, sections: [] };
  const required = opportunity.tenderData?.requiredApplicationSections;
  if (required === undefined) return { valid: true, sections: [] };
  if (!Array.isArray(required)) return { valid: false, sections: [] };
  const normalized = required.map(value => typeof value === "string" ? value.trim() : value);
  if (!normalized.every(isTenderSectionType)) return { valid: false, sections: [] };
  const nodes = sectionNodes(document);
  return { valid: true, sections: [...new Set(normalized)].map(type => {
    const candidates = nodes.filter(node => sectionType(node) === type);
    const node = candidates.find(node => visibleSectionText(node).trim()) ?? candidates[0];
    return { type, label: sectionLabels[locale][type], blockId: blockIdFromNode(node), complete: !!node && !!visibleSectionText(node).trim() };
  }) };
}

// Existing sections and their text remain intact. Adding a section is one ordinary editor transaction.
export function ensureTenderApplicationSection(document: JSONContent, type: TenderApplicationSectionType, createId: () => string = createRichTextBlockId): { document: JSONContent; blockId: string } {
  const candidates = sectionNodes(document).filter(node => sectionType(node) === type);
  const existing = candidates.find(node => visibleSectionText(node).trim()) ?? candidates[0];
  const existingId = blockIdFromNode(existing);
  if (existingId) return { document, blockId: existingId };
  const blockId = createId();
  if (existing) {
    const withId = (node: JSONContent): JSONContent => node === existing
      ? { ...node, attrs: { ...node.attrs, blockId } }
      : node.content ? { ...node, content: node.content.map(withId) } : node;
    return { document: withId(document), blockId };
  }
  return { document: { ...document, content: [...(document.content ?? []), { type: "semanticBlock", attrs: { blockId, semanticType: type }, content: [] }] }, blockId };
}

function isTenderSectionType(value: unknown): value is TenderApplicationSectionType {
  return typeof value === "string" && TENDER_APPLICATION_SECTION_TYPES.includes(value as TenderApplicationSectionType);
}

function sectionType(node: JSONContent): TenderApplicationSectionType | null {
  const semanticType = typeof node.attrs?.semanticType === "string" ? node.attrs.semanticType.trim() : node.attrs?.semanticType;
  if (isTenderSectionType(semanticType)) return semanticType;
  // A different explicit semantic type wins over the legacy node name, as in editor normalization.
  if (typeof semanticType === "string" && /^[a-z][a-z0-9-]{0,63}$/.test(semanticType.trim()) && semanticType.trim() !== "generic") return null;
  return isTenderSectionType(node.type) ? node.type : null;
}

function sectionNodes(document: JSONContent): JSONContent[] {
  const nodes: JSONContent[] = [];
  const visit = (node: JSONContent) => {
    if (sectionType(node)) nodes.push(node);
    node.content?.forEach(visit);
  };
  visit(document);
  return nodes;
}

function visibleSectionText(node: JSONContent): string {
  if (node.type === "text") return node.text ?? "";
  if (node.type === "hardBreak") return "\n";
  return node.content?.map(visibleSectionText).join("") ?? "";
}
