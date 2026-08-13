import assert from "node:assert/strict";
import test from "node:test";
import { IDEA_STORAGE_KEY } from "../ideas/browser";
import { SAVED_STORAGE_KEY } from "../saved/browser";
import { commitPersonalMemoryState, type PersonalMemoryStorage } from "./browser";
import {
  PERSONAL_MEMORY_BACKUP_FORMAT,
  PERSONAL_MEMORY_BACKUP_VERSION,
  PersonalMemoryBackupError,
  createPersonalMemoryBackup,
  parsePersonalMemoryBackup,
  planPersonalMemoryImport,
  serializePersonalMemoryBackup,
  type PersonalMemoryState,
} from "./contract";

const older = "2026-08-10T00:00:00.000Z";
const newer = "2026-08-12T00:00:00.000Z";
const newest = "2026-08-13T00:00:00.000Z";

function state(): PersonalMemoryState {
  return {
    savedItems: [
      {
        id: "saved-1",
        title: "Signal One",
        source: "GitHub",
        contentType: "repository",
        summary: "A saved signal",
        score: 91,
        tags: ["agents", "tools"],
        savedAt: newer,
      },
    ],
    ideas: [
      {
        id: "idea-1",
        sourceItemId: "saved-1",
        sourceTitle: "Signal One",
        title: "Direction One",
        note: "Investigate this direction.",
        status: "shaping",
        createdAt: older,
        updatedAt: newer,
      },
    ],
  };
}

test("Gate 12A contract: backup v1 round-trips Saved and Idea Lab state", () => {
  const backup = createPersonalMemoryBackup(state(), newest);
  const raw = serializePersonalMemoryBackup(backup);
  const parsed = parsePersonalMemoryBackup(raw);

  assert.equal(parsed.format, PERSONAL_MEMORY_BACKUP_FORMAT);
  assert.equal(parsed.version, PERSONAL_MEMORY_BACKUP_VERSION);
  assert.equal(parsed.exportedAt, newest);
  assert.deepEqual(parsed.savedItems, state().savedItems);
  assert.deepEqual(parsed.ideas, state().ideas);
});

test("Gate 12A contract: invalid or future backup versions fail before import planning", () => {
  const malformed = JSON.stringify({
    format: PERSONAL_MEMORY_BACKUP_FORMAT,
    version: PERSONAL_MEMORY_BACKUP_VERSION + 1,
    exportedAt: newest,
    savedItems: [],
    ideas: [],
  });

  assert.throws(
    () => parsePersonalMemoryBackup(malformed),
    (error: unknown) =>
      error instanceof PersonalMemoryBackupError && /Unsupported backup version/.test(error.message)
  );

  assert.throws(
    () => parsePersonalMemoryBackup("{not-json"),
    (error: unknown) =>
      error instanceof PersonalMemoryBackupError && /not valid JSON/.test(error.message)
  );
});

test("Gate 12A contract: duplicate ids and malformed records are rejected", () => {
  const valid = createPersonalMemoryBackup(state(), newest);
  const duplicate = {
    ...valid,
    savedItems: [valid.savedItems[0], valid.savedItems[0]],
  };
  assert.throws(
    () => parsePersonalMemoryBackup(JSON.stringify(duplicate)),
    /duplicate id: saved-1/
  );

  const malformed = {
    ...valid,
    ideas: [{ ...valid.ideas[0], status: "done" }],
  };
  assert.throws(
    () => parsePersonalMemoryBackup(JSON.stringify(malformed)),
    /does not match backup v1 schema/
  );
});

test("Gate 12A contract: orphan ideas remain valid backup records", () => {
  const backup = createPersonalMemoryBackup(
    {
      savedItems: [],
      ideas: [{ ...state().ideas[0], sourceItemId: "removed-source" }],
    },
    newest
  );

  const parsed = parsePersonalMemoryBackup(serializePersonalMemoryBackup(backup));
  assert.equal(parsed.savedItems.length, 0);
  assert.equal(parsed.ideas[0]?.sourceItemId, "removed-source");
});

test("Gate 12A merge: newer local records win, newer imported records update, missing records are added", () => {
  const current: PersonalMemoryState = {
    savedItems: [
      { ...state().savedItems[0], title: "Local newer", savedAt: newest },
      { ...state().savedItems[0], id: "local-only", title: "Local only", savedAt: older },
    ],
    ideas: [
      { ...state().ideas[0], title: "Local older idea", updatedAt: older },
    ],
  };
  const incoming = createPersonalMemoryBackup(
    {
      savedItems: [
        { ...state().savedItems[0], title: "Backup older", savedAt: newer },
        { ...state().savedItems[0], id: "backup-only", title: "Backup only", savedAt: newer },
      ],
      ideas: [
        { ...state().ideas[0], title: "Backup newer idea", updatedAt: newest },
      ],
    },
    newest
  );

  const merged = planPersonalMemoryImport(current, incoming, "merge");

  assert.equal(merged.savedItems.find((item) => item.id === "saved-1")?.title, "Local newer");
  assert.equal(merged.savedItems.some((item) => item.id === "local-only"), true);
  assert.equal(merged.savedItems.some((item) => item.id === "backup-only"), true);
  assert.equal(merged.ideas.find((idea) => idea.id === "idea-1")?.title, "Backup newer idea");
});

test("Gate 12A replace: imported backup becomes the exact next personal-memory state", () => {
  const incoming = createPersonalMemoryBackup(state(), newest);
  const replaced = planPersonalMemoryImport(
    {
      savedItems: [{ ...state().savedItems[0], id: "discard-me" }],
      ideas: [{ ...state().ideas[0], id: "discard-me" }],
    },
    incoming,
    "replace"
  );

  assert.deepEqual(replaced.savedItems, incoming.savedItems);
  assert.deepEqual(replaced.ideas, incoming.ideas);
});

class MemoryStorage implements PersonalMemoryStorage {
  readonly values = new Map<string, string>();
  failOnKey: string | null = null;
  failOnce = false;

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.failOnKey === key && this.failOnce) {
      this.failOnce = false;
      throw new Error("simulated storage failure");
    }
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

test("Gate 12A storage: two-key local import rolls back if the second write fails", () => {
  const storage = new MemoryStorage();
  const previousSaved = JSON.stringify([{ id: "previous-saved" }]);
  const previousIdeas = JSON.stringify([{ id: "previous-idea" }]);
  storage.values.set(SAVED_STORAGE_KEY, previousSaved);
  storage.values.set(IDEA_STORAGE_KEY, previousIdeas);
  storage.failOnKey = IDEA_STORAGE_KEY;
  storage.failOnce = true;

  assert.throws(() => commitPersonalMemoryState(storage, state()), /simulated storage failure/);
  assert.equal(storage.getItem(SAVED_STORAGE_KEY), previousSaved);
  assert.equal(storage.getItem(IDEA_STORAGE_KEY), previousIdeas);
});

test("Gate 12A storage: successful commit writes both Saved and Idea Lab collections", () => {
  const storage = new MemoryStorage();
  commitPersonalMemoryState(storage, state());

  assert.deepEqual(JSON.parse(storage.getItem(SAVED_STORAGE_KEY) ?? "null"), state().savedItems);
  assert.deepEqual(JSON.parse(storage.getItem(IDEA_STORAGE_KEY) ?? "null"), state().ideas);
});
