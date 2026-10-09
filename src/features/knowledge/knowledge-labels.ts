import type { KnowledgeDocument, KnowledgeMode, KnowledgeStatus } from "./contracts";

export type KnowledgeLocale = "ru" | "en";

export function resolveKnowledgeLocale(locale?: string | null): KnowledgeLocale {
  return locale === "en" ? "en" : "ru";
}

export const knowledgeStatusLabels: Record<KnowledgeLocale, Record<KnowledgeStatus, string>> = {
  ru: {
    Uploading: "Загружается",
    Parsing: "Читаем файл",
    Chunking: "Готовим фрагменты",
    Embedding: "Готовим смысловой поиск",
    Indexing: "Добавляем в поиск",
    Indexed: "Готов",
    Failed: "Ошибка"
  },
  en: {
    Uploading: "Uploading",
    Parsing: "Reading file",
    Chunking: "Preparing fragments",
    Embedding: "Building semantic index",
    Indexing: "Adding to search",
    Indexed: "Ready",
    Failed: "Failed"
  }
};

export const knowledgeStatusDescriptions: Record<
  KnowledgeLocale,
  Record<KnowledgeStatus, string>
> = {
  ru: {
    Uploading: "Файл сохраняется и скоро попадёт в очередь обработки.",
    Parsing: "Извлекаем текст из файла или изображения.",
    Chunking: "Разбиваем текст на удобные для поиска фрагменты.",
    Embedding: "Готовим документ для поиска по смыслу.",
    Indexing: "Обновляем поисковый индекс базы знаний.",
    Indexed: "Документ готов для поиска и AI-контекста.",
    Failed: "Обработка остановилась с ошибкой. Можно запустить повторно."
  },
  en: {
    Uploading: "The file is being saved and will enter processing shortly.",
    Parsing: "Extracting text from the file or image.",
    Chunking: "Splitting text into searchable fragments.",
    Embedding: "Creating semantic vectors for search.",
    Indexing: "Updating the knowledge search index.",
    Indexed: "The document is ready for search and AI context.",
    Failed: "Processing stopped with an error. You can run it again."
  }
};

export const knowledgeModeDescriptions: Record<KnowledgeLocale, Record<KnowledgeMode, string>> = {
  ru: {
    always_include: "Документ можно сразу учитывать в ответах AI, когда он подходит профилю.",
    rag_only: "Документ участвует в поиске и попадает в AI только как найденное подтверждение.",
    disabled: "Документ хранится в базе, но не участвует в поиске и ответах AI."
  },
  en: {
    always_include: "The document can be used in AI answers whenever it matches the profile.",
    rag_only: "The document participates in search and reaches AI only as retrieved evidence.",
    disabled: "The document is stored, but does not participate in search or AI answers."
  }
};

export const knowledgeTypeLabels = {
  ru: {
    resume: "Резюме",
    portfolio: "Портфолио",
    certificate: "Сертификат",
    article: "Статья",
    work_sample: "Рабочий пример",
    note: "Заметка",
    other: "Другое"
  },
  en: {
    resume: "Resume",
    portfolio: "Portfolio",
    certificate: "Certificate",
    article: "Article",
    work_sample: "Work sample",
    note: "Note",
    other: "Other"
  }
} satisfies Record<KnowledgeLocale, Record<string, string>>;

export const knowledgeModeLabels: Record<KnowledgeLocale, Record<KnowledgeMode, string>> = {
  ru: {
    always_include: "Всегда учитывать",
    rag_only: "Только при поиске",
    disabled: "Отключено"
  },
  en: {
    always_include: "Always in context",
    rag_only: "Search on demand",
    disabled: "Disabled"
  }
};

const processingStatuses = new Set<KnowledgeStatus>([
  "Uploading",
  "Parsing",
  "Chunking",
  "Embedding",
  "Indexing"
]);

export function isKnowledgeProcessing(document?: Pick<KnowledgeDocument, "status"> | null) {
  return !!document && processingStatuses.has(document.status);
}

export function knowledgeChunkLabel(count: number, locale: KnowledgeLocale = "ru") {
  const normalized = Math.max(0, Number.isFinite(count) ? Math.trunc(count) : 0);
  if (locale === "en")
    return `${formatKnowledgeNumber(normalized, locale)} ${normalized === 1 ? "fragment" : "fragments"}`;
  const lastTwo = normalized % 100;
  const last = normalized % 10;
  const form =
    lastTwo >= 11 && lastTwo <= 14
      ? "фрагментов"
      : last === 1
        ? "фрагмент"
        : last >= 2 && last <= 4
          ? "фрагмента"
          : "фрагментов";
  return `${formatKnowledgeNumber(normalized, locale)} ${form}`;
}

function formatKnowledgeNumber(value: number, locale: KnowledgeLocale) {
  return new Intl.NumberFormat(locale === "en" ? "en-US" : "ru-RU", {
    maximumFractionDigits: 1
  }).format(value);
}
