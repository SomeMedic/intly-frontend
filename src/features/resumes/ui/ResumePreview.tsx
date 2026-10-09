import type { ResumeDocumentJson } from "../contracts";
import { resumeItemText } from "../resume-list-editor";

const sections = [
  ["skills", "Skills"],
  ["experience", "Experience"],
  ["projects", "Projects"],
  ["education", "Education"],
  ["languages", "Languages"],
  ["links", "Links"],
] as const;

export function ResumePreview({ document, fallbackText, fallbackTitle }: {
  document: ResumeDocumentJson;
  fallbackText: string;
  fallbackTitle: string;
}) {
  const headline = typeof document.headline === "string" ? document.headline.trim() : "";
  const summary = typeof document.summary === "string" ? document.summary.trim() : "";
  const lists = sections.map(([key, label]) => ({
    key, label, items: Array.isArray(document[key]) ? document[key].map(resumeItemText).map(text => text.trim()).filter(Boolean) : [],
  }));
  const hasStructuredContent = !!headline || !!summary || lists.some(section => section.items.length);

  return <article className="min-w-0 rounded-sm border border-slate-200 bg-white p-5 text-slate-900 shadow-sm sm:p-8">
    <h4 className="break-words border-b border-slate-200 pb-4 text-2xl font-semibold leading-tight">{headline || fallbackTitle}</h4>
    {hasStructuredContent ? <div className="mt-5 space-y-5">
      {summary ? <section><h5 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-700">Summary</h5><p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{summary}</p></section> : null}
      {lists.filter(section => section.items.length).map(section => <section key={section.key}>
        <h5 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-700">{section.label}</h5>
        <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed">{section.items.map((text, index) => <li key={index} className="whitespace-pre-wrap break-words">{text}</li>)}</ul>
      </section>)}
    </div> : <p className="mt-5 whitespace-pre-wrap break-words text-sm leading-relaxed">{legacyText(document) || fallbackText}</p>}
  </article>;
}

function legacyText(value: unknown): string {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return "";
  const node = value as { type?: unknown; text?: unknown; content?: unknown };
  if (node.type === "text") return typeof node.text === "string" ? node.text : "";
  if (node.type === "hardBreak") return "\n";
  const children = Array.isArray(node.content) ? node.content : [];
  const separator = ["paragraph", "heading", "listItem"].includes(String(node.type)) ? "" : "\n";
  return children.map(legacyText).join(separator).trim();
}
