"use client";

export const SAVED_STORAGE_KEY = "frontier_radar_saved_items_v1";
export const SAVED_CHANGED_EVENT = "frontier-radar:saved-changed";

export interface SavedItemSnapshot {
  id: string;
  title: string;
  source: string;
  contentType: string;
  summary: string | null;
  score: number | null;
  tags: string[];
  savedAt: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function sanitize(value: unknown): SavedItemSnapshot | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== "string" || typeof value.title !== "string") return null;

  return {
    id: value.id,
    title: value.title,
    source: typeof value.source === "string" ? value.source : "unknown",
    contentType: typeof value.contentType === "string" ? value.contentType : "unknown",
    summary: typeof value.summary === "string" ? value.summary : null,
    score: typeof value.score === "number" && Number.isFinite(value.score) ? value.score : null,
    tags: Array.isArray(value.tags)
      ? value.tags.filter((tag): tag is string => typeof tag === "string").slice(0, 12)
      : [],
    savedAt: typeof value.savedAt === "string" ? value.savedAt : new Date(0).toISOString(),
  };
}

export function readSavedItems(): SavedItemSnapshot[] {
  try {
    const raw = window.localStorage.getItem(SAVED_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(sanitize)
      .filter((item): item is SavedItemSnapshot => item !== null)
      .sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  } catch {
    return [];
  }
}

function writeSavedItems(items: SavedItemSnapshot[]): void {
  window.localStorage.setItem(SAVED_STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(SAVED_CHANGED_EVENT));
}

export function isItemSaved(itemId: string): boolean {
  return readSavedItems().some((item) => item.id === itemId);
}

export function saveItem(
  snapshot: Omit<SavedItemSnapshot, "savedAt"> & { savedAt?: string }
): SavedItemSnapshot {
  const next: SavedItemSnapshot = {
    ...snapshot,
    tags: snapshot.tags.slice(0, 12),
    savedAt: snapshot.savedAt ?? new Date().toISOString(),
  };
  const current = readSavedItems().filter((item) => item.id !== next.id);
  writeSavedItems([next, ...current]);
  return next;
}

export function removeSavedItem(itemId: string): void {
  writeSavedItems(readSavedItems().filter((item) => item.id !== itemId));
}

export function toggleSavedItem(
  snapshot: Omit<SavedItemSnapshot, "savedAt"> & { savedAt?: string }
): boolean {
  if (isItemSaved(snapshot.id)) {
    removeSavedItem(snapshot.id);
    return false;
  }
  saveItem(snapshot);
  return true;
}
