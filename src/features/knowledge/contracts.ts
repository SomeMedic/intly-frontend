export const knowledgeTypes = ["resume", "portfolio", "certificate", "article", "work_sample", "note", "other"] as const;
export type KnowledgeType = (typeof knowledgeTypes)[number];

export const knowledgeModes = ["always_include", "rag_only", "disabled"] as const;
export type KnowledgeMode = (typeof knowledgeModes)[number];

export const knowledgeStatuses = ["Uploading", "Parsing", "Chunking", "Embedding", "Indexing", "Indexed", "Failed"] as const;
export type KnowledgeStatus = (typeof knowledgeStatuses)[number];

export type KnowledgeDocument = {
  id: string;
  userId: string;
  profileIds: string[];
  fileId: string;
  title: string;
  type: KnowledgeType;
  mode: KnowledgeMode;
  status: KnowledgeStatus;
  summary?: string;
  extractedText?: string;
  chunkCount: number;
  lastError?: string;
  processedAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type KnowledgeEvidence = {
  documentId: string;
  documentTitle: string;
  chunkId: string;
  excerpt: string;
  score: number;
  profileScope: string[];
};

export type KnowledgeListResponse = { items: KnowledgeDocument[]; nextCursor: string | null };
export type KnowledgeSearchResponse = { items: KnowledgeEvidence[]; nextCursor: string | null };

export type CreateKnowledgeDocumentInput = {
  title: string;
  type: KnowledgeType;
  mode: KnowledgeMode;
  profileIds: string[];
  filename: string;
  mimeType: string;
  contentBase64: string;
};

export type UpdateKnowledgeDocumentInput = Partial<Pick<KnowledgeDocument, "title" | "type" | "mode" | "profileIds">>;

export const knowledgeTypeLabels: Record<KnowledgeType, string> = {
  resume: "Резюме",
  portfolio: "Портфолио",
  certificate: "Сертификат",
  article: "Статья",
  work_sample: "Рабочий пример",
  note: "Заметка",
  other: "Другое"
};

export const knowledgeModeLabels: Record<KnowledgeMode, string> = {
  always_include: "Всегда в контекст",
  rag_only: "Поиск по запросу",
  disabled: "Отключено"
};
