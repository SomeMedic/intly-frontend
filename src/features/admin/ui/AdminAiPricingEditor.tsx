"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminApi } from "../api/admin-api";
import type { AiModelPrice, AiProvider } from "../adminAI/types";
import type { AdminLocale, Localized } from "./admin-locale";

type PricingDraft = {
  modelId: string;
  inputPerMillion: string;
  outputPerMillion: string;
  cachedInputPerMillion: string;
  sourceUrl: string;
};

type PricingCopy = {
  title: string;
  description: string;
  model: string;
  input: string;
  output: string;
  cached: string;
  source: string;
  add: string;
  remove: string;
  save: string;
  saved: string;
  empty: string;
  invalid: string;
  official: string;
  modelPlaceholder: string;
};

const copy: Localized<PricingCopy> = {
  ru: {
    title: "Тарифы моделей",
    description: "USD за 1 млн токенов. Это оценка для будущих вызовов, не счёт от провайдера; неизвестная цена остаётся прочерком.",
    model: "Модель",
    input: "Вход",
    output: "Выход",
    cached: "Кэш входа",
    source: "Источник",
    add: "Добавить модель",
    remove: "Удалить строку",
    save: "Сохранить тарифы",
    saved: "Тарифы сохранены",
    empty: "Цены не заданы.",
    invalid: "Проверьте модели, дубли, числа и HTTPS-ссылки.",
    official: "Официальные цены",
    modelPlaceholder: "Например: {model}",
  },
  en: {
    title: "Model prices",
    description: "USD per 1M tokens. This is an estimate for future calls, not a provider invoice; unknown prices stay blank.",
    model: "Model",
    input: "Input",
    output: "Output",
    cached: "Cached input",
    source: "Source",
    add: "Add model",
    remove: "Remove row",
    save: "Save prices",
    saved: "Prices saved",
    empty: "No prices configured.",
    invalid: "Check models, duplicates, numbers and HTTPS links.",
    official: "Official pricing",
    modelPlaceholder: "For example: {model}",
  },
};

const pricingLinks: Record<AiProvider, string> = {
  openai: "https://openai.com/api/pricing/",
  gemini: "https://ai.google.dev/gemini-api/docs/pricing",
  deepseek: "https://api-docs.deepseek.com/quick_start/pricing",
};

const modelPlaceholders: Record<AiProvider, string> = {
  openai: "gpt-4.1-mini",
  gemini: "gemini-2.5-flash",
  deepseek: "deepseek-chat",
};

export function AdminAiPricingEditor({ provider, pricing = [], locale }: { provider: AiProvider; pricing?: AiModelPrice[]; locale: AdminLocale }) {
  const text = copy[locale];
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<PricingDraft[]>(() => pricing.map(priceToDraft));
  const parsed = useMemo(() => parseRows(rows), [rows]);
  const mutation = useMutation({
    mutationFn: () => adminApi.ai.updateProvider({ provider, pricing: parsed.items }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "ai", "providers"] });
      toast.success(text.saved);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : text.invalid),
  });
  const addRow = () => setRows((current) => [...current, { modelId: "", inputPerMillion: "", outputPerMillion: "", cachedInputPerMillion: "", sourceUrl: "" }]);
  const updateRow = (index: number, patch: Partial<PricingDraft>) => setRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row));
  const removeRow = (index: number) => setRows((current) => current.filter((_row, rowIndex) => rowIndex !== index));
  return (
    <section className="space-y-3 rounded-md border bg-muted/30 p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">{text.title}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{text.description}</p>
        </div>
        <a className="text-xs font-medium text-primary underline-offset-4 hover:underline" href={pricingLinks[provider]} target="_blank" rel="noreferrer">{text.official}</a>
      </div>
      {rows.length ? (
        <div className="space-y-2">
          {rows.map((row, index) => (
            <div key={index} className="min-w-0 space-y-2 rounded-md border bg-card p-2">
              <div className="flex items-start gap-2">
                <Field label={`${text.model} ${index + 1}`} className="flex-1">
                  <Input value={row.modelId} onChange={(event) => updateRow(index, { modelId: event.target.value })} placeholder={text.modelPlaceholder.replace("{model}", modelPlaceholders[provider])} />
                </Field>
                <Button type="button" className="mt-5 shrink-0" variant="outline" size="icon" aria-label={`${text.remove} ${index + 1}`} onClick={() => removeRow(index)}>
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </div>
              <div className="grid min-w-0 grid-cols-3 gap-2 [&_label>span]:block [&_label>span]:min-h-8">
                <Field label={text.input}><Input type="number" min={0} step="0.000001" value={row.inputPerMillion} onChange={(event) => updateRow(index, { inputPerMillion: event.target.value })} /></Field>
                <Field label={text.output}><Input type="number" min={0} step="0.000001" value={row.outputPerMillion} onChange={(event) => updateRow(index, { outputPerMillion: event.target.value })} /></Field>
                <Field label={text.cached}><Input type="number" min={0} step="0.000001" value={row.cachedInputPerMillion} onChange={(event) => updateRow(index, { cachedInputPerMillion: event.target.value })} /></Field>
              </div>
              <Field label={text.source}><Input value={row.sourceUrl} onChange={(event) => updateRow(index, { sourceUrl: event.target.value })} placeholder="https://..." /></Field>
            </div>
          ))}
        </div>
      ) : <p className="rounded-md border border-dashed bg-card p-3 text-sm text-muted-foreground">{text.empty}</p>}
      {parsed.error ? <p className="text-xs text-destructive">{text.invalid}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" disabled={rows.length >= 50} onClick={addRow}><Plus className="size-4" aria-hidden />{text.add}</Button>
        <Button type="button" size="sm" loading={mutation.isPending} disabled={Boolean(parsed.error)} onClick={() => mutation.mutate()}>{text.save}</Button>
      </div>
    </section>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return <label className={`min-w-0 space-y-1 text-xs ${className ?? ""}`}><span className="font-medium text-muted-foreground">{label}</span>{children}</label>;
}

function priceToDraft(price: AiModelPrice): PricingDraft {
  return {
    modelId: price.modelId,
    inputPerMillion: String(price.inputPerMillion),
    outputPerMillion: String(price.outputPerMillion),
    cachedInputPerMillion: price.cachedInputPerMillion === undefined ? "" : String(price.cachedInputPerMillion),
    sourceUrl: price.sourceUrl ?? "",
  };
}

function parseRows(rows: PricingDraft[]): { items: AiModelPrice[]; error?: true } {
  if (rows.length > 50) return { items: [], error: true };
  const seen = new Set<string>();
  const items: AiModelPrice[] = [];
  for (const row of rows) {
    const modelId = row.modelId.trim();
    if (!modelId || modelId.length > 160 || seen.has(modelId)) return { items: [], error: true };
    seen.add(modelId);
    const input = parseRate(row.inputPerMillion);
    const output = parseRate(row.outputPerMillion);
    const cached = row.cachedInputPerMillion.trim() ? parseRate(row.cachedInputPerMillion) : undefined;
    if (input === undefined || output === undefined || (row.cachedInputPerMillion.trim() && cached === undefined)) return { items: [], error: true };
    const sourceUrl = row.sourceUrl.trim();
    if (sourceUrl) {
      try {
        const url = new URL(sourceUrl);
        if (url.protocol !== "https:" || url.username || url.password || sourceUrl.length > 1000) return { items: [], error: true };
      } catch {
        return { items: [], error: true };
      }
    }
    items.push({ modelId, inputPerMillion: input, outputPerMillion: output, ...(cached !== undefined ? { cachedInputPerMillion: cached } : {}), ...(sourceUrl ? { sourceUrl } : {}) });
  }
  return { items };
}

function parseRate(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1_000_000 ? parsed : undefined;
}
