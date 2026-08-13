import type { IdeaDraft } from "../ideas/browser";
import type { SavedItemSnapshot } from "../saved/browser";

export const PERSONAL_MEMORY_BACKUP_FORMAT = "frontier-radar-personal-memory";
export const PERSONAL_MEMORY_BACKUP_VERSION = 1;
export const MAX_PERSONAL_MEMORY_BACKUP_CHARS = 5_000_000;
export const MAX_PERSONAL_MEMORY_RECORDS_PER_COLLECTION = 10_000;

export type PersonalMemoryImportMode = "merge" | "replace";

export interface PersonalMemoryState {
  savedItems: SavedItemSnapshot[];
  ideas: IdeaDraft[];
}

export interface PersonalMemoryBackupV1 extends PersonalMemoryState {
  format: typeof PERSONAL_MEMORY_BACKUP_FORMAT;
  version: typeof PERSONAL_MEMORY_BACKUP_VERSION;
  exportedAt: string;
}

export class PersonalMemoryBackupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PersonalMemoryBackupError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isFiniteNumberOrNull(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isFinite(value));
}

function isStringOrNull(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function validateSavedItem(value: unknown, index: number): SavedItemSnapshot {
  if (!isRecord(value)) {
    throw new PersonalMemoryBackupError(`savedItems[${index}] must be an object`);
  }

  if (
    typeof value.id !== "string" ||
    typeof value.title !== "string" ||
    typeof value.source !== "string" ||
    typeof value.contentType !== "string" ||
    !isStringOrNull(value.summary) ||
    !isFiniteNumberOrNull(value.score) ||
    !Array.isArray(value.tags) ||
    !value.tags.every((tag) => typeof tag === "string") ||
    !isIsoDate(value.savedAt)
  ) {
    throw new PersonalMemoryBackupError(`savedItems[${index}] does not match backup v1 schema`);
  }

  return {
    id: value.id,
    title: value.title,
    source: value.source,
    contentType: value.contentType,
    summary: value.summary,
    score: value.score,
    tags: value.tags.slice(0, 12),
    savedAt: value.savedAt,
  };
}

function validateIdea(value: unknown, index: number): IdeaDraft {
  if (!isRecord(value)) {
    throw new PersonalMemoryBackupError(`ideas[${index}] must be an object`);
  }

  const status = value.status;
  if (
    typeof value.id !== "string" ||
    typeof value.sourceItemId !== "string" ||
    typeof value.sourceTitle !== "string" ||
    typeof value.title !== "string" ||
    typeof value.note !== "string" ||
    (status !== "seed" && status !== "shaping" && status !== "building") ||
    !isIsoDate(value.createdAt) ||
    !isIsoDate(value.updatedAt)
  ) {
    throw new PersonalMemoryBackupError(`ideas[${index}] does not match backup v1 schema`);
  }

  return {
    id: value.id,
    sourceItemId: value.sourceItemId,
    sourceTitle: value.sourceTitle,
    title: value.title,
    note: value.note,
    status,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

function assertCollectionBounds(name: string, values: unknown[]): void {
  if (values.length > MAX_PERSONAL_MEMORY_RECORDS_PER_COLLECTION) {
    throw new PersonalMemoryBackupError(
      `${name} exceeds ${MAX_PERSONAL_MEMORY_RECORDS_PER_COLLECTION} records`
    );
  }
}

function assertUniqueIds(name: string, values: Array<{ id: string }>): void {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value.id)) {
      throw new PersonalMemoryBackupError(`${name} contains duplicate id: ${value.id}`);
    }
    seen.add(value.id);
  }
}

function orderState(state: PersonalMemoryState): PersonalMemoryState {
  return {
    savedItems: [...state.savedItems].sort((a, b) => b.savedAt.localeCompare(a.savedAt)),
    ideas: [...state.ideas].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
  };
}

export function createPersonalMemoryBackup(
  state: PersonalMemoryState,
  exportedAt = new Date().toISOString()
): PersonalMemoryBackupV1 {
  if (!isIsoDate(exportedAt)) {
    throw new PersonalMemoryBackupError("exportedAt must be a valid date");
  }

  const ordered = orderState(state);
  return {
    format: PERSONAL_MEMORY_BACKUP_FORMAT,
    version: PERSONAL_MEMORY_BACKUP_VERSION,
    exportedAt,
    savedItems: ordered.savedItems.map((item) => ({ ...item, tags: [...item.tags] })),
    ideas: ordered.ideas.map((idea) => ({ ...idea })),
  };
}

export function serializePersonalMemoryBackup(backup: PersonalMemoryBackupV1): string {
  return `${JSON.stringify(backup, null, 2)}\n`;
}

export function parsePersonalMemoryBackup(raw: string): PersonalMemoryBackupV1 {
  if (typeof raw !== "string" || raw.length === 0) {
    throw new PersonalMemoryBackupError("Backup file is empty");
  }
  if (raw.length > MAX_PERSONAL_MEMORY_BACKUP_CHARS) {
    throw new PersonalMemoryBackupError("Backup file is too large");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new PersonalMemoryBackupError("Backup file is not valid JSON");
  }

  if (!isRecord(parsed)) {
    throw new PersonalMemoryBackupError("Backup root must be an object");
  }
  if (parsed.format !== PERSONAL_MEMORY_BACKUP_FORMAT) {
    throw new PersonalMemoryBackupError("Backup format is not Frontier Radar personal memory");
  }
  if (parsed.version !== PERSONAL_MEMORY_BACKUP_VERSION) {
    throw new PersonalMemoryBackupError(`Unsupported backup version: ${String(parsed.version)}`);
  }
  if (!isIsoDate(parsed.exportedAt)) {
    throw new PersonalMemoryBackupError("Backup exportedAt is invalid");
  }
  if (!Array.isArray(parsed.savedItems) || !Array.isArray(parsed.ideas)) {
    throw new PersonalMemoryBackupError("Backup must contain savedItems and ideas arrays");
  }

  assertCollectionBounds("savedItems", parsed.savedItems);
  assertCollectionBounds("ideas", parsed.ideas);

  const savedItems = parsed.savedItems.map(validateSavedItem);
  const ideas = parsed.ideas.map(validateIdea);
  assertUniqueIds("savedItems", savedItems);
  assertUniqueIds("ideas", ideas);

  return {
    format: PERSONAL_MEMORY_BACKUP_FORMAT,
    version: PERSONAL_MEMORY_BACKUP_VERSION,
    exportedAt: parsed.exportedAt,
    ...orderState({ savedItems, ideas }),
  };
}

function newerBy<T>(
  current: T[],
  incoming: T[],
  getId: (value: T) => string,
  getUpdatedAt: (value: T) => string
): T[] {
  const merged = new Map<string, T>();
  for (const value of incoming) merged.set(getId(value), value);
  for (const value of current) {
    const existing = merged.get(getId(value));
    if (!existing || getUpdatedAt(value) >= getUpdatedAt(existing)) {
      merged.set(getId(value), value);
    }
  }
  return [...merged.values()];
}

export function planPersonalMemoryImport(
  current: PersonalMemoryState,
  incoming: PersonalMemoryBackupV1,
  mode: PersonalMemoryImportMode = "merge"
): PersonalMemoryState {
  if (mode === "replace") {
    return orderState({
      savedItems: incoming.savedItems.map((item) => ({ ...item, tags: [...item.tags] })),
      ideas: incoming.ideas.map((idea) => ({ ...idea })),
    });
  }

  return orderState({
    savedItems: newerBy(
      current.savedItems,
      incoming.savedItems,
      (item) => item.id,
      (item) => item.savedAt
    ),
    ideas: newerBy(
      current.ideas,
      incoming.ideas,
      (idea) => idea.id,
      (idea) => idea.updatedAt
    ),
  });
}
