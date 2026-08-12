"use client";

export const IDEA_STORAGE_KEY = "frontier_radar_ideas_v1";
export const IDEAS_CHANGED_EVENT = "frontier-radar:ideas-changed";

export type IdeaStatus = "seed" | "shaping" | "building";

export interface IdeaDraft {
  id: string;
  sourceItemId: string;
  sourceTitle: string;
  title: string;
  note: string;
  status: IdeaStatus;
  createdAt: string;
  updatedAt: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isStatus(value: unknown): value is IdeaStatus {
  return value === "seed" || value === "shaping" || value === "building";
}

function sanitize(value: unknown): IdeaDraft | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== "string" || typeof value.sourceItemId !== "string") return null;

  const createdAt = typeof value.createdAt === "string" ? value.createdAt : new Date(0).toISOString();
  return {
    id: value.id,
    sourceItemId: value.sourceItemId,
    sourceTitle: typeof value.sourceTitle === "string" ? value.sourceTitle : "Unknown signal",
    title: typeof value.title === "string" ? value.title : "Untitled direction",
    note: typeof value.note === "string" ? value.note : "",
    status: isStatus(value.status) ? value.status : "seed",
    createdAt,
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : createdAt,
  };
}

export function readIdeas(): IdeaDraft[] {
  try {
    const raw = window.localStorage.getItem(IDEA_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(sanitize)
      .filter((idea): idea is IdeaDraft => idea !== null)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch {
    return [];
  }
}

function writeIdeas(ideas: IdeaDraft[]): IdeaDraft[] {
  const ordered = [...ideas].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  window.localStorage.setItem(IDEA_STORAGE_KEY, JSON.stringify(ordered));
  window.dispatchEvent(new Event(IDEAS_CHANGED_EVENT));
  return ordered;
}

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `idea-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createIdea(input: { sourceItemId: string; sourceTitle: string }): IdeaDraft {
  const now = new Date().toISOString();
  const idea: IdeaDraft = {
    id: makeId(),
    sourceItemId: input.sourceItemId,
    sourceTitle: input.sourceTitle,
    title: "Untitled direction",
    note: "",
    status: "seed",
    createdAt: now,
    updatedAt: now,
  };
  writeIdeas([idea, ...readIdeas()]);
  return idea;
}

export function updateIdea(
  ideaId: string,
  patch: Partial<Pick<IdeaDraft, "title" | "note" | "status">>
): IdeaDraft | null {
  let updated: IdeaDraft | null = null;
  const next = readIdeas().map((idea) => {
    if (idea.id !== ideaId) return idea;
    updated = {
      ...idea,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    return updated;
  });
  writeIdeas(next);
  return updated;
}

export function removeIdea(ideaId: string): void {
  writeIdeas(readIdeas().filter((idea) => idea.id !== ideaId));
}
