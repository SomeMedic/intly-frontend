"use client";

import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import type { PublicSource } from "@/features/profiles";
import type { OpportunityType } from "@/types";
import { stagesForPipeline } from "@/lib/pipeline-model";
import { selectClass, stageLabelsByLocale } from "./contracts";
import { filterKeys, type OpportunityLocale } from "./view-state";

type ControlsProps = {
  params: URLSearchParams;
  sources: PublicSource[];
  change: (key: string, value: string) => void;
  reset: () => void;
  locale: OpportunityLocale;
};
type SortRule = { field: string; direction: "asc" | "desc" };

const sortFields = {
  ru: {
    matchScore: "Соответствие",
    highestAI: "Оценка AI",
    publishedAt: "Дата публикации",
    firstSeenAt: "Добавлено",
    deadlineAt: "Дедлайн",
    moneyMax: "Оплата",
    updatedAt: "Дата обновления",
    title: "Название",
    sourceStatus: "Статус источника"
  },
  en: {
    matchScore: "Fit",
    highestAI: "AI rating",
    publishedAt: "Published date",
    firstSeenAt: "Added",
    deadlineAt: "Deadline",
    moneyMax: "Pay",
    updatedAt: "Updated date",
    title: "Title",
    sourceStatus: "Source status"
  }
} as const;

const controlsCopy = {
  ru: {
    advancedSortHint: "Правила применяются сверху вниз. Записи без значения идут в конец.",
    sortField: (index: number) => `Поле сортировки ${index + 1}`,
    sortDirection: (index: number) => `Порядок сортировки ${index + 1}`,
    descending: "По убыванию",
    ascending: "По возрастанию",
    moveUp: (index: number) => `Поднять правило ${index + 1}`,
    moveDown: (index: number) => `Опустить правило ${index + 1}`,
    removeRule: (index: number) => `Удалить правило ${index + 1}`,
    addRule: "Добавить правило",
    resetRules: "Сбросить правила",
    any: "Любой",
    manualImport: "Ручной импорт",
    filtersTitle: "Фильтры",
    filtersDescription:
      "Выберите условия, список обновится сразу. Значения внутри одного поля объединяются через «или».",
    sections: {
      types: "Типы возможностей",
      personal: "Соответствие и личный статус",
      work: "Работа, навыки и география",
      money: "Оплата",
      sources: "Источники",
      dates: "Сроки и обновления",
      availability: "Доступность"
    },
    typeOptions: { vacancy: "Вакансии", freelance: "Проекты", tender: "Тендеры" },
    fields: {
      minMatch: "Соответствие от",
      minAiScore: "Оценка AI от",
      analyzed: "AI-оценка",
      hidden: "Видимость",
      favorite: "Только избранные",
      latestAI: "Только актуальная AI-оценка",
      archived: "Только личный архив",
      pipeline: "Этап отклика",
      tags: "Личные метки",
      remoteType: "Формат работы",
      seniority: "Уровень",
      skills: "Навыки через запятую",
      technologies: "Технологии через запятую",
      employmentTypes: "Занятость через запятую",
      locations: "Местоположение через запятую",
      countriesAllowed: "Доступные страны через запятую",
      language: "Язык описания",
      descriptionContains: "Описание содержит",
      moneyMin: "Сумма от",
      moneyMax: "Сумма до",
      currency: "Валюта",
      includeMissingMoney: "Включать записи без указанной суммы",
      sourceGroups: "Группы площадок",
      sourceIds: "Источники",
      excludeSourceIds: "Исключить источники",
      manualOnly: "Только созданные вручную",
      importedOnly: "Только импортированные",
      multipleSources: "Найдено на нескольких площадках",
      hasDeadline: "Только с дедлайном",
      status: "Статус источника",
      archive: "Закрытые записи"
    },
    options: {
      analyzed: { true: "Выполнен", false: "Ещё не выполнен" },
      hidden: { false: "Видимые", true: "Скрытые" },
      remoteType: { remote: "Удалённо", hybrid: "Гибрид", office: "Офис" },
      seniority: { junior: "Junior", middle: "Middle", senior: "Senior", lead: "Lead" },
      language: { ru: "Русский", en: "Английский" },
      status: {
        Active: "Активна",
        Unknown: "Неизвестен",
        Closed: "Закрыта",
        Expired: "Истекла",
        Removed: "Удалена"
      },
      sourceGroups: { web: "Сайты", telegram: "Telegram", vk: "VK" }
    },
    placeholders: {
      tags: "Приоритет, На этой неделе",
      skills: "Python, PostgreSQL",
      technologies: "Django, Docker",
      employmentTypes: "full-time, contract",
      locations: "Москва, Россия",
      countriesAllowed: "RU, KZ"
    },
    moneyNote:
      "В фильтре используются суммы источника. Период оплаты и условия налогообложения смотрите в самой записи.",
    sourceSelectHint: "Выберите несколько с Ctrl или ⌘. На телефоне откроется системный выбор.",
    defaultStatusNote: "По умолчанию показаны активные записи и записи с неизвестным статусом.",
    from: "С",
    to: "По",
    dateLabels: {
      published: "Опубликована",
      firstSeen: "Добавлена в INTLY",
      deadline: "Дедлайн",
      updated: "Обновлена"
    },
    reset: "Сбросить",
    showResults: "Показать результаты"
  },
  en: {
    advancedSortHint: "Rules are applied from top to bottom. Records without a value go last.",
    sortField: (index: number) => `Sort field ${index + 1}`,
    sortDirection: (index: number) => `Sort order ${index + 1}`,
    descending: "Descending",
    ascending: "Ascending",
    moveUp: (index: number) => `Move rule ${index + 1} up`,
    moveDown: (index: number) => `Move rule ${index + 1} down`,
    removeRule: (index: number) => `Remove rule ${index + 1}`,
    addRule: "Add rule",
    resetRules: "Reset rules",
    any: "Any",
    manualImport: "Manual import",
    filtersTitle: "Filters",
    filtersDescription:
      "Choose conditions and the list updates immediately. Values inside one field are combined with OR.",
    sections: {
      types: "Opportunity types",
      personal: "Fit and personal status",
      work: "Work, skills and geography",
      money: "Pay",
      sources: "Sources",
      dates: "Dates and updates",
      availability: "Availability"
    },
    typeOptions: { vacancy: "Vacancies", freelance: "Projects", tender: "Tenders" },
    fields: {
      minMatch: "Fit from",
      minAiScore: "AI rating from",
      analyzed: "AI analysis",
      hidden: "Visibility",
      favorite: "Favorites only",
      latestAI: "Latest AI analysis only",
      archived: "Personal archive only",
      pipeline: "Response step",
      tags: "Personal tags",
      remoteType: "Work format",
      seniority: "Seniority",
      skills: "Skills, comma-separated",
      technologies: "Technologies, comma-separated",
      employmentTypes: "Employment, comma-separated",
      locations: "Locations, comma-separated",
      countriesAllowed: "Allowed countries, comma-separated",
      language: "Description language",
      descriptionContains: "Description contains",
      moneyMin: "Amount from",
      moneyMax: "Amount to",
      currency: "Currency",
      includeMissingMoney: "Include records without stated pay",
      sourceGroups: "Platform groups",
      sourceIds: "Sources",
      excludeSourceIds: "Exclude sources",
      manualOnly: "Manual records only",
      importedOnly: "Imported only",
      multipleSources: "Found on multiple platforms",
      hasDeadline: "Has deadline only",
      status: "Source status",
      archive: "Closed records"
    },
    options: {
      analyzed: { true: "Completed", false: "Not completed yet" },
      hidden: { false: "Visible", true: "Hidden" },
      remoteType: { remote: "Remote", hybrid: "Hybrid", office: "Office" },
      seniority: { junior: "Junior", middle: "Middle", senior: "Senior", lead: "Lead" },
      language: { ru: "Russian", en: "English" },
      status: {
        Active: "Active",
        Unknown: "Unknown",
        Closed: "Closed",
        Expired: "Expired",
        Removed: "Removed"
      },
      sourceGroups: { web: "Websites", telegram: "Telegram", vk: "VK" }
    },
    placeholders: {
      tags: "Priority, This week",
      skills: "Python, PostgreSQL",
      technologies: "Django, Docker",
      employmentTypes: "full-time, contract",
      locations: "New York, USA",
      countriesAllowed: "US, UK"
    },
    moneyNote: "The filter uses source amounts. Check pay period and tax terms inside the record.",
    sourceSelectHint: "Select several with Ctrl or ⌘. On mobile, the system picker opens.",
    defaultStatusNote: "By default, active records and records with unknown status are shown.",
    from: "From",
    to: "To",
    dateLabels: {
      published: "Published",
      firstSeen: "Added to INTLY",
      deadline: "Deadline",
      updated: "Updated"
    },
    reset: "Reset",
    showResults: "Show results"
  }
} as const;

const localizedStageLabels: Record<OpportunityLocale, Record<string, string>> = stageLabelsByLocale;

export function AdvancedSort({
  params,
  change,
  locale
}: Pick<ControlsProps, "params" | "change" | "locale">) {
  const text = controlsCopy[locale];
  const fields = sortFields[locale];
  let rules: SortRule[] = [];
  try {
    const parsed: unknown = JSON.parse(params.get("advancedSort") ?? "[]");
    if (Array.isArray(parsed))
      rules = parsed.filter(
        (item): item is SortRule =>
          !!item && item.field in fields && ["asc", "desc"].includes(item.direction)
      );
  } catch {
    /* Ignore malformed URL input; the API still validates it. */
  }
  const set = (value: SortRule[]) =>
    change("advancedSort", value.length ? JSON.stringify(value) : "");
  return (
    <section className="space-y-3">
      <p className="text-sm text-muted-foreground">{text.advancedSortHint}</p>
      {rules.map((rule, index) => (
        <div
          key={index}
          className="flex flex-wrap items-center gap-2 rounded-lg border border-border/70 bg-card/60 p-2"
        >
          <span className="w-5 text-center text-xs text-muted-foreground">{index + 1}</span>
          <select
            aria-label={text.sortField(index)}
            className={`${selectClass} min-w-40 flex-1`}
            value={rule.field}
            onChange={(event) =>
              set(
                rules.map((item, i) =>
                  i === index ? { ...item, field: event.target.value } : item
                )
              )
            }
          >
            {Object.entries(fields).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            aria-label={text.sortDirection(index)}
            className={selectClass}
            value={rule.direction}
            onChange={(event) =>
              set(
                rules.map((item, i) =>
                  i === index
                    ? { ...item, direction: event.target.value as SortRule["direction"] }
                    : item
                )
              )
            }
          >
            <option value="desc">{text.descending}</option>
            <option value="asc">{text.ascending}</option>
          </select>
          <Button
            size="icon"
            variant="ghost"
            aria-label={text.moveUp(index)}
            disabled={index === 0}
            onClick={() => {
              const next = [...rules];
              [next[index - 1], next[index]] = [next[index], next[index - 1]];
              set(next);
            }}
          >
            <ArrowUp className="size-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label={text.moveDown(index)}
            disabled={index === rules.length - 1}
            onClick={() => {
              const next = [...rules];
              [next[index + 1], next[index]] = [next[index], next[index + 1]];
              set(next);
            }}
          >
            <ArrowDown className="size-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label={text.removeRule(index)}
            onClick={() => set(rules.filter((_, i) => i !== index))}
          >
            <X className="size-4" />
          </Button>
        </div>
      ))}
      <Button
        variant="outline"
        disabled={rules.length >= Object.keys(fields).length}
        onClick={() =>
          set([
            ...rules,
            {
              field:
                Object.keys(fields).find((field) => !rules.some((rule) => rule.field === field)) ??
                "title",
              direction: "desc"
            }
          ])
        }
      >
        <Plus className="size-4" />
        {text.addRule}
      </Button>
      {rules.length > 0 && (
        <Button variant="ghost" onClick={() => set([])}>
          {text.resetRules}
        </Button>
      )}
    </section>
  );
}

export function OpportunityFilters({
  open,
  onOpenChange,
  params,
  sources,
  change,
  reset,
  fixedType,
  locale
}: ControlsProps & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fixedType?: OpportunityType;
}) {
  const text = controlsCopy[locale];
  const field = (
    key: string,
    label: string,
    kind = "text",
    placeholder?: string,
    accessibleLabel = label
  ) => (
    <label className="block text-sm" key={key}>
      {label}
      <Input
        className="mt-1"
        aria-label={accessibleLabel}
        type={kind}
        value={params.get(key) ?? ""}
        onChange={(event) => change(key, event.target.value)}
        placeholder={placeholder}
        min={kind === "number" ? 0 : undefined}
        max={key === "minMatch" || key === "minAiScore" ? 100 : undefined}
      />
    </label>
  );
  const choice = (key: string, label: string, options: Record<string, string>) => (
    <label className="block text-sm" key={key}>
      {label}
      <select
        className={`${selectClass} mt-1 w-full`}
        value={params.get(key) ?? ""}
        onChange={(event) => change(key, event.target.value)}
      >
        <option value="">{text.any}</option>
        {Object.entries(options).map(([value, option]) => (
          <option key={value} value={value}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
  const check = (key: string, label: string) => (
    <label key={key} className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={params.get(key) === "true"}
        onChange={(event) => change(key, event.target.checked ? "true" : "")}
      />
      {label}
    </label>
  );
  const multiple = (key: string, options: Record<string, string>) => (
    <div className="flex flex-wrap gap-2">
      {Object.entries(options).map(([value, label]) => {
        const selected = (params.get(key) ?? "").split(",").filter(Boolean);
        return (
          <label
            key={value}
            className="flex items-center gap-2 rounded-md border border-border/70 bg-muted/25 px-2.5 py-2 text-sm"
          >
            <input
              type="checkbox"
              checked={selected.includes(value)}
              onChange={(event) =>
                change(
                  key,
                  (event.target.checked
                    ? [...selected, value]
                    : selected.filter((item) => item !== value)
                  ).join(",")
                )
              }
            />
            {label}
          </label>
        );
      })}
    </div>
  );
  const sourcePicker = (key: string, label: string) => (
    <label className="block text-sm">
      {label}
      <select
        multiple
        aria-label={label}
        className={`${selectClass} mt-1 h-44 w-full`}
        value={(params.get(key) ?? "").split(",").filter(Boolean)}
        onChange={(event) =>
          change(
            key,
            Array.from(event.target.selectedOptions)
              .map((option) => option.value)
              .join(",")
          )
        }
      >
        <option value="manual">{text.manualImport}</option>
        {sources.map((source) => (
          <option key={source.id} value={source.id}>
            {source.name}
          </option>
        ))}
      </select>
    </label>
  );
  const section = (title: string, children: React.ReactNode, expanded = false) => (
    <details open={expanded} className="rounded-lg border border-border/70 bg-card/60">
      <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">{title}</summary>
      <div className="space-y-4 border-t border-border/70 px-4 py-4">{children}</div>
    </details>
  );
  const pipelineStatusOptions = fixedType
    ? Object.fromEntries(
        stagesForPipeline(fixedType).map((stage) => [
          stage,
          localizedStageLabels[locale][stage] ?? stage
        ])
      )
    : localizedStageLabels[locale];
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={text.filtersTitle}
      description={text.filtersDescription}
      placement="drawer"
    >
      <div className="mx-auto max-w-3xl space-y-3">
        {!fixedType && section(text.sections.types, multiple("types", text.typeOptions))}
        {section(
          text.sections.personal,
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              {field("minMatch", text.fields.minMatch, "number")}
              {field("minAiScore", text.fields.minAiScore, "number")}
              {choice("analyzed", text.fields.analyzed, text.options.analyzed)}
              {choice("hidden", text.fields.hidden, text.options.hidden)}
            </div>
            {check("favorite", text.fields.favorite)}
            {check("latestAI", text.fields.latestAI)}
            {check("archived", text.fields.archived)}
            <div>
              <p className="mb-2 text-sm">{text.fields.pipeline}</p>
              {multiple("pipelineStatuses", pipelineStatusOptions)}
            </div>
            {field("tags", text.fields.tags, "text", text.placeholders.tags)}
          </>,
          true
        )}
        {section(
          text.sections.work,
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              {choice("remoteType", text.fields.remoteType, text.options.remoteType)}
              {choice("seniority", text.fields.seniority, text.options.seniority)}
            </div>
            {field("skills", text.fields.skills, "text", text.placeholders.skills)}
            {field(
              "technologies",
              text.fields.technologies,
              "text",
              text.placeholders.technologies
            )}
            {field(
              "employmentTypes",
              text.fields.employmentTypes,
              "text",
              text.placeholders.employmentTypes
            )}
            {field("locations", text.fields.locations, "text", text.placeholders.locations)}
            {field(
              "countriesAllowed",
              text.fields.countriesAllowed,
              "text",
              text.placeholders.countriesAllowed
            )}
            {choice("language", text.fields.language, text.options.language)}
            {field("descriptionContains", text.fields.descriptionContains)}
          </>
        )}
        {section(
          text.sections.money,
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              {field("moneyMin", text.fields.moneyMin, "number")}
              {field("moneyMax", text.fields.moneyMax, "number")}
              {choice("currency", text.fields.currency, {
                RUB: "₽ RUB",
                USD: "$ USD",
                EUR: "€ EUR",
                GBP: "£ GBP",
                KZT: "₸ KZT"
              })}
            </div>
            {check("includeMissingMoney", text.fields.includeMissingMoney)}
            <p className="text-xs text-muted-foreground">{text.moneyNote}</p>
          </>
        )}
        {section(
          text.sections.sources,
          <>
            <p className="text-sm">{text.fields.sourceGroups}</p>
            {multiple("sourceGroups", text.options.sourceGroups)}
            {sourcePicker("sourceIds", text.fields.sourceIds)}
            {sourcePicker("excludeSourceIds", text.fields.excludeSourceIds)}
            <p className="text-xs text-muted-foreground">{text.sourceSelectHint}</p>
            {check("manualOnly", text.fields.manualOnly)}
            {check("importedOnly", text.fields.importedOnly)}
            {check("multipleSources", text.fields.multipleSources)}
          </>
        )}
        {section(
          text.sections.dates,
          <>
            {Object.entries(text.dateLabels).map(([key, label]) => (
              <div key={key}>
                <p className="mb-2 text-sm">{label}</p>
                <div className="grid grid-cols-2 gap-3">
                  {field(
                    `${key}From`,
                    text.from,
                    "date",
                    undefined,
                    `${label}: ${text.from.toLocaleLowerCase()}`
                  )}
                  {field(
                    `${key}To`,
                    text.to,
                    "date",
                    undefined,
                    `${label}: ${text.to.toLocaleLowerCase()}`
                  )}
                </div>
              </div>
            ))}
            {check("hasDeadline", text.fields.hasDeadline)}
          </>
        )}
        {section(
          text.sections.availability,
          <>
            {multiple("status", text.options.status)}
            {check("archive", text.fields.archive)}
            <p className="text-xs text-muted-foreground">{text.defaultStatusNote}</p>
          </>
        )}
        <footer className="sticky bottom-0 grid grid-cols-2 gap-3 border-t border-border/70 bg-card/95 py-3 backdrop-blur">
          <Button
            className="h-auto min-h-11 whitespace-normal py-2 leading-5"
            variant="outline"
            onClick={reset}
            disabled={!filterKeys.some((key) => params.has(key))}
          >
            {text.reset}
          </Button>
          <Button
            className="h-auto min-h-11 whitespace-normal py-2 leading-5"
            onClick={() => onOpenChange(false)}
          >
            {text.showResults}
          </Button>
        </footer>
      </div>
    </Modal>
  );
}
