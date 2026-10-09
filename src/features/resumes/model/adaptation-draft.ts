import { emptyResumeDocument, type ResumeAdaptation, type ResumeAdaptationStatus, type ResumeDocumentJson } from "../contracts";

export type AdaptationDraftSnapshot = {
  documentJson: ResumeDocumentJson;
  markdownCache: string;
  status: ResumeAdaptationStatus;
};

export type AdaptationDraftState = AdaptationDraftSnapshot & {
  revision: number;
  editVersion: number;
  dirty: boolean;
  saving: boolean;
  storageAvailable: boolean;
  localPersisted: boolean;
  error: AdaptationDraftError | null;
  conflict: AdaptationDraftConflict | null;
  recovered: AdaptationDraftRecovery | null;
};

export type AdaptationDraftError = {
  kind: "network" | "server";
  message: string;
};

export type AdaptationDraftConflict = {
  kind: "revision";
  message: string;
  localRevision: number;
  serverRevision?: number;
};

export type AdaptationDraftRecovery = {
  storageKey: string;
  baseRevision: number;
  updatedAt: number;
  stale: boolean;
};

export type AdaptationDraftSaveInput = {
  revision: number;
  documentJson: ResumeDocumentJson;
  markdownCache: string;
  status: ResumeAdaptationStatus;
};

export type AdaptationDraftPersisted = AdaptationDraftSnapshot & {
  ownerId: string;
  adaptationId: string;
  baseRevision: number;
  updatedAt: number;
  token: string;
};

type SaveOptions = { automatic?: boolean };
type Listener = () => void;
type UpdateAdaptation = (input: AdaptationDraftSaveInput) => Promise<ResumeAdaptation>;

const storagePrefix = "intly:resume-adaptation-draft";
const maxPersistedDraftBytes = 1024 * 1024;
const statuses: ReadonlySet<ResumeAdaptationStatus> = new Set(["generating", "review", "editing", "ready", "exported", "failed"]);

export function normalizeAdaptationDocument(value?: ResumeDocumentJson): ResumeDocumentJson {
  return { ...emptyResumeDocument, ...(isPlainRecord(value) ? value : {}) };
}

export function adaptationDraftSnapshot(documentJson: ResumeDocumentJson, markdownCache: string, status: ResumeAdaptationStatus): AdaptationDraftSnapshot {
  return { documentJson: normalizeAdaptationDocument(documentJson), markdownCache, status };
}

export function serializeAdaptationDraftSnapshot(snapshot: AdaptationDraftSnapshot): string {
  return stableStringify({
    documentJson: normalizeAdaptationDocument(snapshot.documentJson),
    markdownCache: snapshot.markdownCache,
    status: snapshot.status
  });
}

export function adaptationDraftStorageKey(ownerId: string, adaptationId: string): string {
  return `${storagePrefix}:${encodeURIComponent(ownerId)}:${encodeURIComponent(adaptationId)}`;
}

export function readAdaptationDraftRecovery(storage: Storage | null | undefined, ownerId: string, adaptationId: string): AdaptationDraftPersisted | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(adaptationDraftStorageKey(ownerId, adaptationId));
    if (!raw || raw.length > maxPersistedDraftBytes) return null;
    return parsePersistedDraft(JSON.parse(raw), ownerId, adaptationId);
  } catch {
    return null;
  }
}

export function writeAdaptationDraftRecovery(storage: Storage | null | undefined, draft: AdaptationDraftPersisted): boolean {
  if (!storage) return false;
  try {
    const serialized = JSON.stringify(draft);
    if (serialized.length > maxPersistedDraftBytes || !parsePersistedDraft(draft, draft.ownerId, draft.adaptationId)) return false;
    storage.setItem(adaptationDraftStorageKey(draft.ownerId, draft.adaptationId), serialized);
    return true;
  } catch {
    return false;
  }
}

export function clearAdaptationDraftRecovery(storage: Storage | null | undefined, ownerId: string, adaptationId: string, updatedAt: number, token: string): boolean {
  if (!storage) return false;
  try {
    const current = readAdaptationDraftRecovery(storage, ownerId, adaptationId);
    if (!current || current.updatedAt !== updatedAt || current.token !== token) return false;
    storage.removeItem(adaptationDraftStorageKey(ownerId, adaptationId));
    return true;
  } catch {
    return false;
  }
}

export class AdaptationDraftController {
  private readonly ownerId: string;
  private readonly adaptationId: string;
  private storage: Storage | null | undefined;
  private readonly listener: Listener;
  private baseline: AdaptationDraftSnapshot;
  private baselineSerialized: string;
  private stateValue: AdaptationDraftState;
  private persistedUpdatedAt: number | null = null;
  private persistedToken: string | null = null;
  private activeSave: Promise<ResumeAdaptation | null> | null = null;

  constructor(input: { adaptation: ResumeAdaptation; ownerId: string; storage?: Storage | null; listener?: Listener }) {
    this.ownerId = input.ownerId;
    this.adaptationId = input.adaptation.id;
    this.storage = input.storage;
    this.listener = input.listener ?? (() => {});
    this.baseline = snapshotFromAdaptation(input.adaptation);
    this.baselineSerialized = serializeAdaptationDraftSnapshot(this.baseline);
    const recovered = readAdaptationDraftRecovery(this.storage, this.ownerId, this.adaptationId);
    const recoveredSerialized = recovered ? serializeAdaptationDraftSnapshot(recovered) : null;
    const hasRecoveredDraft = recovered !== null && recoveredSerialized !== this.baselineSerialized;
    this.persistedUpdatedAt = recovered?.updatedAt ?? null;
    this.persistedToken = recovered?.token ?? null;
    this.stateValue = {
      ...(hasRecoveredDraft ? recovered : this.baseline),
      revision: input.adaptation.revision,
      editVersion: 0,
      dirty: hasRecoveredDraft,
      saving: false,
      storageAvailable: !!this.storage,
      localPersisted: hasRecoveredDraft,
      error: null,
      conflict: hasRecoveredDraft && recovered.baseRevision !== input.adaptation.revision ? revisionConflict(input.adaptation.revision, recovered.baseRevision) : null,
      recovered: recovered ? {
        storageKey: adaptationDraftStorageKey(this.ownerId, this.adaptationId),
        baseRevision: recovered.baseRevision,
        updatedAt: recovered.updatedAt,
        stale: recovered.baseRevision !== input.adaptation.revision
      } : null
    };
  }

  get state(): AdaptationDraftState {
    return this.stateValue;
  }

  setDocument(documentJson: ResumeDocumentJson) {
    this.setSnapshot({ ...this.stateValue, documentJson: normalizeAdaptationDocument(documentJson) });
  }

  setMarkdown(markdownCache: string) {
    this.setSnapshot({ ...this.stateValue, markdownCache });
  }

  setStatus(status: ResumeAdaptationStatus) {
    this.setSnapshot({ ...this.stateValue, status });
  }

  attachStorage(storage: Storage | null | undefined) {
    if (!storage || this.storage === storage) return;
    this.storage = storage;
    if (this.stateValue.dirty) {
      const persisted = this.persistCurrentSnapshot(this.stateValue.revision);
      this.stateValue = { ...this.stateValue, storageAvailable: true, localPersisted: persisted };
      this.listener();
      return;
    }

    const recovered = readAdaptationDraftRecovery(this.storage, this.ownerId, this.adaptationId);
    const recoveredSerialized = recovered ? serializeAdaptationDraftSnapshot(recovered) : null;
    if (recovered && recoveredSerialized !== this.baselineSerialized) {
      this.persistedUpdatedAt = recovered.updatedAt;
      this.persistedToken = recovered.token;
      this.stateValue = {
        ...recovered,
        revision: this.stateValue.revision,
        editVersion: this.stateValue.editVersion + 1,
        dirty: true,
        saving: false,
        storageAvailable: true,
        localPersisted: true,
        error: null,
        conflict: recovered.baseRevision !== this.stateValue.revision ? revisionConflict(this.stateValue.revision, recovered.baseRevision) : null,
        recovered: {
          storageKey: adaptationDraftStorageKey(this.ownerId, this.adaptationId),
          baseRevision: recovered.baseRevision,
          updatedAt: recovered.updatedAt,
          stale: recovered.baseRevision !== this.stateValue.revision
        }
      };
      this.listener();
      return;
    }

    this.stateValue = { ...this.stateValue, storageAvailable: true };
    this.listener();
  }

  async save(update: UpdateAdaptation, onSaved?: (adaptation: ResumeAdaptation) => void, options: SaveOptions = {}): Promise<ResumeAdaptation | null> {
    if (this.activeSave) return this.activeSave;
    if (!this.stateValue.dirty || this.stateValue.conflict || (options.automatic && this.stateValue.error)) return null;

    const frozen = currentSnapshot(this.stateValue);
    const frozenSerialized = serializeAdaptationDraftSnapshot(frozen);
    const sentRevision = this.stateValue.revision;
    this.stateValue = { ...this.stateValue, saving: true, error: null };
    this.listener();
    this.activeSave = update({ revision: sentRevision, ...frozen })
      .then((saved) => {
        if (this.acceptSavedSnapshot(saved, frozenSerialized)) onSaved?.(saved);
        return saved;
      })
      .catch((error: unknown) => {
        this.stateValue = { ...this.stateValue, saving: false, error: normalizeSaveError(error), conflict: conflictFromError(error, sentRevision) };
        this.listener();
        return null;
      })
      .finally(() => {
        this.activeSave = null;
      });
    return this.activeSave;
  }

  acceptServer(saved: ResumeAdaptation): boolean {
    if (saved.id !== this.adaptationId || saved.userId !== this.ownerId || saved.revision < this.stateValue.revision) return false;
    const savedSnapshot = snapshotFromAdaptation(saved);
    if (this.stateValue.dirty || this.stateValue.saving) {
      if (saved.revision > this.stateValue.revision) {
        this.stateValue = { ...this.stateValue, revision: saved.revision, conflict: revisionConflict(saved.revision, this.stateValue.revision) };
        this.listener();
      }
      return false;
    }
    this.baseline = savedSnapshot;
    this.baselineSerialized = serializeAdaptationDraftSnapshot(savedSnapshot);
    this.stateValue = { ...savedSnapshot, revision: saved.revision, editVersion: this.stateValue.editVersion + 1, dirty: false, saving: false, storageAvailable: this.stateValue.storageAvailable, error: null, conflict: null, recovered: null, localPersisted: false };
    this.clearPersistedCurrent();
    this.listener();
    return true;
  }

  reloadServer(adaptation: ResumeAdaptation): boolean {
    if (adaptation.id !== this.adaptationId || adaptation.userId !== this.ownerId || adaptation.revision < this.stateValue.revision) return false;
    this.baseline = snapshotFromAdaptation(adaptation);
    this.baselineSerialized = serializeAdaptationDraftSnapshot(this.baseline);
    this.stateValue = { ...this.baseline, revision: adaptation.revision, editVersion: this.stateValue.editVersion + 1, dirty: false, saving: false, storageAvailable: this.stateValue.storageAvailable, error: null, conflict: null, recovered: null, localPersisted: false };
    this.clearPersistedCurrent();
    this.listener();
    return true;
  }

  private setSnapshot(next: AdaptationDraftSnapshot) {
    const normalized = adaptationDraftSnapshot(next.documentJson, next.markdownCache, next.status);
    const serialized = serializeAdaptationDraftSnapshot(normalized);
    const dirty = serialized !== this.baselineSerialized;
    let persistedUpdatedAt = this.persistedUpdatedAt;
    let localPersisted = this.stateValue.localPersisted;
    if (dirty) {
      persistedUpdatedAt = Date.now();
      const token = nextPersistedToken();
      if (writeAdaptationDraftRecovery(this.storage, {
        ownerId: this.ownerId,
        adaptationId: this.adaptationId,
        baseRevision: this.stateValue.revision,
        updatedAt: persistedUpdatedAt,
        token,
        ...normalized
      })) {
        this.persistedUpdatedAt = persistedUpdatedAt;
        this.persistedToken = token;
        localPersisted = true;
      } else {
        localPersisted = false;
      }
    }
    this.stateValue = { ...this.stateValue, ...normalized, editVersion: this.stateValue.editVersion + 1, dirty, error: dirty ? null : this.stateValue.error, localPersisted: dirty ? localPersisted : false };
    if (!dirty && persistedUpdatedAt !== null) this.clearPersistedCurrent();
    this.listener();
  }

  private acceptSavedSnapshot(saved: ResumeAdaptation, sentSerialized: string): boolean {
    if (saved.id !== this.adaptationId || saved.userId !== this.ownerId || saved.revision < this.stateValue.revision) {
      this.stateValue = { ...this.stateValue, saving: false };
      this.listener();
      return false;
    }
    const savedSnapshot = snapshotFromAdaptation(saved);
    this.baseline = savedSnapshot;
    this.baselineSerialized = serializeAdaptationDraftSnapshot(savedSnapshot);
    const currentSerialized = serializeAdaptationDraftSnapshot(currentSnapshot(this.stateValue));
    if (currentSerialized === sentSerialized) {
      this.stateValue = { ...savedSnapshot, revision: saved.revision, editVersion: this.stateValue.editVersion + 1, dirty: false, saving: false, storageAvailable: this.stateValue.storageAvailable, error: null, conflict: null, recovered: null, localPersisted: false };
      this.clearPersistedCurrent();
    } else {
      this.stateValue = { ...this.stateValue, revision: saved.revision, dirty: true, saving: false, error: null, conflict: null };
      this.rebasePersistedCurrent(saved.revision);
    }
    this.listener();
    return true;
  }

  private clearPersistedCurrent() {
    if (this.persistedUpdatedAt !== null && this.persistedToken !== null) {
      clearAdaptationDraftRecovery(this.storage, this.ownerId, this.adaptationId, this.persistedUpdatedAt, this.persistedToken);
      this.persistedUpdatedAt = null;
      this.persistedToken = null;
    }
  }

  private rebasePersistedCurrent(baseRevision: number) {
    if (this.persistedToken === null) return;
    const current = readAdaptationDraftRecovery(this.storage, this.ownerId, this.adaptationId);
    if (!current || current.token !== this.persistedToken) return;
    this.persistCurrentSnapshot(baseRevision);
  }

  private persistCurrentSnapshot(baseRevision: number): boolean {
    const updatedAt = Date.now();
    const token = nextPersistedToken();
    const persisted = {
      ownerId: this.ownerId,
      adaptationId: this.adaptationId,
      baseRevision,
      updatedAt,
      token,
      ...currentSnapshot(this.stateValue)
    };
    if (writeAdaptationDraftRecovery(this.storage, persisted)) {
      this.persistedUpdatedAt = updatedAt;
      this.persistedToken = token;
      this.stateValue = { ...this.stateValue, localPersisted: true };
      return true;
    }
    return false;
  }
}

function snapshotFromAdaptation(adaptation: ResumeAdaptation): AdaptationDraftSnapshot {
  return adaptationDraftSnapshot(adaptation.documentJson, adaptation.markdownCache ?? "", adaptation.status);
}

function currentSnapshot(state: AdaptationDraftState): AdaptationDraftSnapshot {
  return adaptationDraftSnapshot(state.documentJson, state.markdownCache, state.status);
}

function revisionConflict(serverRevision: number | undefined, localRevision: number): AdaptationDraftConflict {
  return {
    kind: "revision",
    message: "Resume adaptation changed on the server. Review the newer version before saving this draft.",
    localRevision,
    serverRevision
  };
}

function conflictFromError(error: unknown, localRevision: number): AdaptationDraftConflict | null {
  if (!isPlainRecord(error)) return null;
  const status = error.status;
  const code = error.code;
  if (status === 409 || code === "REVISION_CONFLICT" || code === "CONFLICT") return revisionConflict(undefined, localRevision);
  return null;
}

function normalizeSaveError(error: unknown): AdaptationDraftError {
  const message = isPlainRecord(error) && typeof error.message === "string" ? error.message : "Could not save resume adaptation.";
  const status = isPlainRecord(error) ? error.status : undefined;
  return { kind: typeof status === "number" && status >= 500 ? "server" : "network", message };
}

function parsePersistedDraft(value: unknown, ownerId: string, adaptationId: string): AdaptationDraftPersisted | null {
  if (!isPlainRecord(value) || value.ownerId !== ownerId || value.adaptationId !== adaptationId) return null;
  const baseRevision = value.baseRevision;
  const updatedAt = value.updatedAt;
  if (!Number.isInteger(baseRevision) || typeof baseRevision !== "number" || baseRevision < 1 || typeof updatedAt !== "number" || !Number.isFinite(updatedAt)) return null;
  const token = typeof value.token === "string" ? value.token : `legacy:${updatedAt}`;
  if (!isPlainRecord(value.documentJson) || typeof value.markdownCache !== "string" || !statuses.has(value.status as ResumeAdaptationStatus)) return null;
  return {
    ownerId,
    adaptationId,
    baseRevision,
    updatedAt,
    token,
    documentJson: normalizeAdaptationDocument(value.documentJson),
    markdownCache: value.markdownCache,
    status: value.status as ResumeAdaptationStatus
  };
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (!isPlainRecord(value)) return JSON.stringify(value);
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

let persistedSequence = 0;

function nextPersistedToken(): string {
  persistedSequence += 1;
  return `${Date.now().toString(36)}:${persistedSequence.toString(36)}`;
}
