"use client";

import {
  IDEA_STORAGE_KEY,
  IDEAS_CHANGED_EVENT,
  readIdeas,
} from "../ideas/browser";
import {
  SAVED_CHANGED_EVENT,
  SAVED_STORAGE_KEY,
  readSavedItems,
} from "../saved/browser";
import {
  createPersonalMemoryBackup,
  parsePersonalMemoryBackup,
  planPersonalMemoryImport,
  serializePersonalMemoryBackup,
  type PersonalMemoryImportMode,
  type PersonalMemoryState,
} from "./contract";

export interface PersonalMemoryStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function restoreRawValue(
  storage: PersonalMemoryStorage,
  key: string,
  value: string | null
): void {
  if (value === null) storage.removeItem(key);
  else storage.setItem(key, value);
}

export function commitPersonalMemoryState(
  storage: PersonalMemoryStorage,
  state: PersonalMemoryState
): void {
  const previousSaved = storage.getItem(SAVED_STORAGE_KEY);
  const previousIdeas = storage.getItem(IDEA_STORAGE_KEY);

  try {
    storage.setItem(SAVED_STORAGE_KEY, JSON.stringify(state.savedItems));
    storage.setItem(IDEA_STORAGE_KEY, JSON.stringify(state.ideas));
  } catch (error) {
    try {
      restoreRawValue(storage, SAVED_STORAGE_KEY, previousSaved);
      restoreRawValue(storage, IDEA_STORAGE_KEY, previousIdeas);
    } catch {
      // Best-effort rollback. The original storage error remains the primary failure.
    }
    throw error;
  }
}

export function buildPersonalMemoryBackupJson(exportedAt?: string): string {
  const backup = createPersonalMemoryBackup(
    {
      savedItems: readSavedItems(),
      ideas: readIdeas(),
    },
    exportedAt
  );
  return serializePersonalMemoryBackup(backup);
}

export function importPersonalMemoryBackupJson(
  raw: string,
  mode: PersonalMemoryImportMode = "merge"
): PersonalMemoryState {
  const incoming = parsePersonalMemoryBackup(raw);
  const current: PersonalMemoryState = {
    savedItems: readSavedItems(),
    ideas: readIdeas(),
  };
  const next = planPersonalMemoryImport(current, incoming, mode);

  commitPersonalMemoryState(window.localStorage, next);
  window.dispatchEvent(new Event(SAVED_CHANGED_EVENT));
  window.dispatchEvent(new Event(IDEAS_CHANGED_EVENT));
  return next;
}
