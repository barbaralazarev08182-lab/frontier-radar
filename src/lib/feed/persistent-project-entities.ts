import { createAdminClient } from "@/lib/supabase/admin";
import { mapFeedRow, type FeedViewRow } from "./supabase-provider";
import {
  clusterProjectFeed,
  type ProjectEntity,
  type ProjectEntityFeed,
  type ProjectEvidence,
  type ProjectMatchReason,
} from "./project-entities";
import type { FeedResult, FrontierFeedItem } from "./types";

interface PersistentSourceRow {
  project_id: string;
  item_id: string;
  match_method: string;
  match_confidence: number | null;
  first_seen_at: string | null;
  latest_seen_at: string | null;
}

interface PersistentEntityData {
  projectByInputItem: Map<string, string>;
  sourcesByProject: Map<string, PersistentSourceRow[]>;
  itemById: Map<string, FrontierFeedItem>;
}

function matchReason(method: string): ProjectMatchReason {
  if (method === "exact_url") return "exact_url";
  if (method === "title_match") return "title_match";
  return "primary";
}

function isoExtrema(values: Array<string | null>, mode: "min" | "max"): string | null {
  const timestamps = values
    .filter((value): value is string => Boolean(value))
    .map((value) => Date.parse(value))
    .filter(Number.isFinite);
  if (timestamps.length === 0) return null;
  const value = mode === "min" ? Math.min(...timestamps) : Math.max(...timestamps);
  return new Date(value).toISOString();
}

function projectEvidence(item: FrontierFeedItem, reason: ProjectMatchReason): ProjectEvidence {
  return {
    itemId: item.id,
    source: item.source,
    contentType: item.contentType,
    title: item.title,
    url: item.canonicalUrl,
    score: item.score,
    publishedAt: item.publishedAt,
    updatedAt: item.updatedAt,
    hasCode: item.hasCode,
    hasDemo: item.hasDemo,
    matchReason: reason,
  };
}

function buildPersistentEntity(
  primary: FrontierFeedItem,
  projectId: string,
  data: PersistentEntityData
): ProjectEntity | null {
  const sourceRows = data.sourcesByProject.get(projectId) ?? [];
  if (sourceRows.length === 0) return null;

  const orderedRows = [
    ...sourceRows.filter((row) => row.item_id === primary.id),
    ...sourceRows.filter((row) => row.item_id !== primary.id),
  ];
  const evidence: ProjectEvidence[] = [];
  for (const [index, row] of orderedRows.entries()) {
    const item = row.item_id === primary.id ? primary : data.itemById.get(row.item_id);
    if (!item) continue;
    evidence.push(projectEvidence(item, index === 0 ? "primary" : matchReason(row.match_method)));
  }
  if (evidence.length === 0) return null;

  const sources = [...new Set(evidence.map((entry) => entry.source))];
  const matchedByUrl = sourceRows.some((row) => row.match_method === "exact_url");
  const matchedByTitle = sourceRows.some((row) => row.match_method === "title_match");

  return {
    id: primary.id,
    primary,
    evidence,
    sources,
    firstSeenAt: isoExtrema(sourceRows.map((row) => row.first_seen_at), "min"),
    latestSeenAt: isoExtrema(sourceRows.map((row) => row.latest_seen_at), "max"),
    crossSource: sources.length > 1,
    hasCodeAnywhere: evidence.some(
      (entry) => entry.hasCode === "yes" || entry.contentType === "repo"
    ),
    hasDemoAnywhere: evidence.some(
      (entry) => entry.hasDemo === "yes" || entry.contentType === "space"
    ),
    matchConfidence:
      sources.length <= 1 ? "single" : matchedByUrl ? "url" : matchedByTitle ? "title" : "single",
  };
}

async function tryLoadPersistentData(
  inputItems: FrontierFeedItem[]
): Promise<PersistentEntityData | null> {
  if (inputItems.length === 0) return null;
  const supabase = createAdminClient();
  const inputIds = inputItems.map((item) => item.id);

  const { data: membershipsRaw, error: membershipsError } = await supabase
    .from("project_sources")
    .select("project_id,item_id,match_method,match_confidence,first_seen_at,latest_seen_at")
    .in("item_id", inputIds);

  // The persistent layer is deliberately optional during rollout. Missing tables,
  // an unapplied migration, or an empty materialization must not break Today.
  if (membershipsError) return null;
  const memberships = (membershipsRaw ?? []) as PersistentSourceRow[];
  if (memberships.length === 0) return null;

  const projectIds = [...new Set(memberships.map((row) => row.project_id))];
  const { data: allSourcesRaw, error: allSourcesError } = await supabase
    .from("project_sources")
    .select("project_id,item_id,match_method,match_confidence,first_seen_at,latest_seen_at")
    .in("project_id", projectIds);
  if (allSourcesError) return null;

  const allSources = (allSourcesRaw ?? []) as PersistentSourceRow[];
  const evidenceIds = [...new Set(allSources.map((row) => row.item_id))];
  const { data: evidenceRowsRaw, error: evidenceError } = await supabase
    .from("frontier_feed_v1")
    .select("*")
    .in("item_id", evidenceIds);
  if (evidenceError) return null;

  const itemById = new Map<string, FrontierFeedItem>();
  for (const row of (evidenceRowsRaw ?? []) as unknown as FeedViewRow[]) {
    const item = mapFeedRow(row);
    itemById.set(item.id, item);
  }
  // Keep the already-personalized in-memory object for input items so persistent
  // entity resolution can never overwrite upstream ranking semantics.
  for (const item of inputItems) itemById.set(item.id, item);

  const sourcesByProject = new Map<string, PersistentSourceRow[]>();
  for (const row of allSources) {
    const rows = sourcesByProject.get(row.project_id) ?? [];
    rows.push(row);
    sourcesByProject.set(row.project_id, rows);
  }

  return {
    projectByInputItem: new Map(memberships.map((row) => [row.item_id, row.project_id])),
    sourcesByProject,
    itemById,
  };
}

/**
 * Prefer materialized entity membership where available. Items that have not yet
 * been materialized still use the existing runtime heuristic, preserving rollout
 * safety and discovery coverage for brand-new projects.
 */
export async function tryLoadPersistentProjectFeed(
  feed: FeedResult
): Promise<ProjectEntityFeed | null> {
  const data = await tryLoadPersistentData(feed.items);
  if (!data) return null;

  const unmappedItems = feed.items.filter((item) => !data.projectByInputItem.has(item.id));
  const runtimeUnmapped = clusterProjectFeed({
    ...feed,
    items: unmappedItems,
    total: unmappedItems.length,
    pageSize: unmappedItems.length,
  });
  const runtimePrimaryByItem = new Map<string, string>();
  for (const entity of runtimeUnmapped.entities.values()) {
    for (const evidence of entity.evidence) runtimePrimaryByItem.set(evidence.itemId, entity.primary.id);
  }

  const outputItems: FrontierFeedItem[] = [];
  const entities = new Map<string, ProjectEntity>();
  const seenGroups = new Set<string>();

  for (const item of feed.items) {
    const projectId = data.projectByInputItem.get(item.id);
    if (projectId) {
      const groupKey = `project:${projectId}`;
      if (seenGroups.has(groupKey)) continue;
      const entity = buildPersistentEntity(item, projectId, data);
      if (!entity) continue;
      seenGroups.add(groupKey);
      outputItems.push(item);
      entities.set(item.id, entity);
      continue;
    }

    const runtimePrimary = runtimePrimaryByItem.get(item.id) ?? item.id;
    const groupKey = `runtime:${runtimePrimary}`;
    if (seenGroups.has(groupKey)) continue;
    const entity = runtimeUnmapped.entities.get(runtimePrimary);
    if (!entity) continue;
    seenGroups.add(groupKey);
    outputItems.push(entity.primary);
    entities.set(entity.primary.id, entity);
  }

  return {
    feed: {
      ...feed,
      items: outputItems,
      total: outputItems.length,
      pageSize: outputItems.length,
    },
    entities,
  };
}

export async function tryLoadPersistentProjectEntity(
  item: FrontierFeedItem
): Promise<ProjectEntity | null> {
  const data = await tryLoadPersistentData([item]);
  if (!data) return null;
  const projectId = data.projectByInputItem.get(item.id);
  if (!projectId) return null;
  return buildPersistentEntity(item, projectId, data);
}
