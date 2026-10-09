import type { OpportunityRecord } from "./contracts";
import type { OpportunityLocale } from "./opportunity-workspace-labels";

export type OpportunityEditorEntryType = OpportunityRecord["type"];
export type OpportunityEditorTargetTab = "response" | "application";

export function editorTargetTabForOpportunity(type: OpportunityEditorEntryType): OpportunityEditorTargetTab {
  return type === "tender" ? "application" : "response";
}

export function editorEntryCtaLabel(type: OpportunityEditorEntryType, locale: OpportunityLocale): string {
  if (locale === "ru") {
    if (type === "freelance") return "Подготовить предложение";
    if (type === "tender") return "Подготовить заявку";
    return "Подготовить отклик";
  }
  if (type === "freelance") return "Prepare proposal";
  if (type === "tender") return "Prepare application";
  return "Prepare response";
}
