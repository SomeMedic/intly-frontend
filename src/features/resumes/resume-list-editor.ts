import type { ResumeListItem } from "./contracts";

export function resumeItemText(value: unknown): string {
  if (typeof value === "string") return value;
  if (isResumeListObject(value)) return String(value.text ?? value.title ?? value.description ?? "");
  return String(value ?? "");
}

export function isResumeListObject(value: unknown): value is Extract<ResumeListItem, { id: string }> {
  return typeof value === "object" && value !== null && !Array.isArray(value) && typeof (value as { id?: unknown }).id === "string";
}

export function resumeListText(value: unknown): string {
  return Array.isArray(value) ? value.map(resumeItemText).join("\n") : "";
}

/** Keep unchanged items attached to their ids even when a preceding row is removed. */
export function parseResumeList(text: string, previous: unknown, createId = () => crypto.randomUUID()): ResumeListItem[] {
  const before: ResumeListItem[] = Array.isArray(previous) ? previous : [];
  const lines = text.split("\n").map(line => line.trim()).filter(Boolean);
  const used = new Set<number>();
  const matches = lines.map(line => {
    const index = before.findIndex((item, index) => !used.has(index) && resumeItemText(item).trim() === line);
    if (index >= 0) used.add(index);
    return index;
  });
  return lines.map((line, index) => {
    let previousIndex = matches[index];
    if (previousIndex < 0 && index < before.length && !used.has(index)) {
      previousIndex = index;
      used.add(index);
    }
    const item = before[previousIndex];
    return isResumeListObject(item) ? { ...item, text: line } : { id: createId(), text: line };
  });
}
