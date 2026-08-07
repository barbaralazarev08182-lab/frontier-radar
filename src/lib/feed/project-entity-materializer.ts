import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapFeedRow, type FeedViewRow } from "./supabase-provider";
import {
  canonicalProjectUrl,
  clusterProjectFeed,
  type ProjectEntity,
  type ProjectMatchReason,
} from "./project-entities";
import type { FeedResult, FrontierFeedItem } from "./types";

interface ItemEntityRow {
  id: string;
  source_id: string;
  source_url: string;
  external_url: string | null;
  homepage: string | null;
  first_seen_at: string | null;
  last_updated_at: string | null;
}

interface ProjectMembershipRow {
  project_id: string;
  item_id: string;
}

interface ExistingProjectRow {
  id: string;
  canonical_name: string;
  canonical_key: string | null;
  primary_item_id: string | null;
  canonical_homepage: string | null;
  canonical_repo_url: string | null;
  entity_confidence: number | null;
}

export interface ProjectEntityMaterializationResult {
  candidates: number;
  clusters: number;
  projectsCreated: number;
  projectsUpdated: number;
  sourcesUpserted: number;
  conflictsSkipped: number;
}

function asFeed(items: FrontierFeedItem[]): FeedResult {
  return {
    items,
    total: items.length,
    page: 1,
    pageSize: items.length,
    query: { q: null, source: null, type: null, tag: null, sort: "updated", page: 1 },
  };
}

function matchConfidence(reason: ProjectMatchReason): number {
  switch (reason) {
    case "exact_url":
      return 1;
    case "title_match":
      return 0.86;
    case "primary":
    default:
      return 1;
  }
}

function entityConfidence(entity: ProjectEntity): number {
  switch (entity.matchConfidence) {
    case "url":
      return 1;
    case "title":
      return 0.86;
    case "single":
    default:
      return 1;
  }
}

function firstMatchingUrl(
  rows: ItemEntityRow[],
  predicate: (canonical: string) => boolean
): string | null {
  for (const row of rows) {
    for (const value of [row.external_url, row.homepage, row.source_url]) {
      if (!value) continue;
      const canonical = canonicalProjectUrl(value);
      if (canonical && predicate(canonical)) return value;
    }
  }
  return null;
}

function canonicalMetadata(entity: ProjectEntity, rows: ItemEntityRow[]) {
  const repoUrl = firstMatchingUrl(rows, (canonical) => canonical.startsWith("github.com/"));
  const spaceUrl = firstMatchingUrl(rows, (canonical) => canonical.startsWith("huggingface.co/spaces/"));
  const homepage =
    rows.map((row) => row.homepage).find((value): value is string => Boolean(value)) ?? null;
  const canonicalKey =
    canonicalProjectUrl(repoUrl ?? "") ??
    canonicalProjectUrl(spaceUrl ?? "") ??
    canonicalProjectUrl(homepage ?? "") ??
    canonicalProjectUrl(entity.primary.canonicalUrl) ??
    `item:${entity.evidence.map((entry) => entry.itemId).sort()[0]}`;

  return { repoUrl, homepage, canonicalKey };
}

function sourceMatchMethod(reason: ProjectMatchReason): string {
  return reason === "primary" ? "seed" : reason;
}

export async function materializeRecentProjectEntities(
  limit = 180
): Promise<ProjectEntityMaterializationResult> {
  const supabase = createAdminClient();
  const boundedLimit = Math.max(40, Math.min(300, Math.floor(limit)));

  const { data: feedRows, error: feedError } = await supabase
    .from("frontier_feed_v1")
    .select("*")
    .order("updated_at", { ascending: false, nullsFirst: false })
    .limit(boundedLimit);
  if (feedError) throw new Error(`读取实体候选失败: ${feedError.message}`);

  const items = ((feedRows ?? []) as unknown as FeedViewRow[]).map(mapFeedRow);
  if (items.length === 0) {
    return {
      candidates: 0,
      clusters: 0,
      projectsCreated: 0,
      projectsUpdated: 0,
      sourcesUpserted: 0,
      conflictsSkipped: 0,
    };
  }

  const itemIds = items.map((item) => item.id);
  const [{ data: itemRowsRaw, error: itemRowsError }, { data: membershipsRaw, error: membershipsError }] =
    await Promise.all([
      supabase
        .from("items")
        .select("id,source_id,source_url,external_url,homepage,first_seen_at,last_updated_at")
        .in("id", itemIds),
      supabase
        .from("project_sources")
        .select("project_id,item_id")
        .in("item_id", itemIds),
    ]);

  if (itemRowsError) throw new Error(`读取实体来源信息失败: ${itemRowsError.message}`);
  if (membershipsError) {
    throw new Error(`读取持久化实体关系失败: ${membershipsError.message}`);
  }

  const itemRows = (itemRowsRaw ?? []) as ItemEntityRow[];
  const itemRowById = new Map(itemRows.map((row) => [row.id, row]));
  const memberships = (membershipsRaw ?? []) as ProjectMembershipRow[];
  const projectByItem = new Map(memberships.map((row) => [row.item_id, row.project_id]));
  const existingProjectIds = [...new Set(memberships.map((row) => row.project_id))];

  const existingProjects = new Map<string, ExistingProjectRow>();
  if (existingProjectIds.length > 0) {
    const { data, error } = await supabase
      .from("projects")
      .select(
        "id,canonical_name,canonical_key,primary_item_id,canonical_homepage,canonical_repo_url,entity_confidence"
      )
      .in("id", existingProjectIds);
    if (error) throw new Error(`读取现有项目实体失败: ${error.message}`);
    for (const row of (data ?? []) as ExistingProjectRow[]) existingProjects.set(row.id, row);
  }

  const clustered = clusterProjectFeed(asFeed(items));
  let projectsCreated = 0;
  let projectsUpdated = 0;
  let sourcesUpserted = 0;
  let conflictsSkipped = 0;

  for (const entity of clustered.entities.values()) {
    const evidenceIds = entity.evidence.map((entry) => entry.itemId);
    const existingIds = [
      ...new Set(
        evidenceIds
          .map((itemId) => projectByItem.get(itemId))
          .filter((value): value is string => Boolean(value))
      ),
    ];

    // Conservative rule: if a runtime cluster would join two already-materialized
    // entities, do not auto-merge them. A later resolver can inspect the conflict.
    if (existingIds.length > 1) {
      conflictsSkipped++;
      continue;
    }

    const projectId = existingIds[0] ?? randomUUID();
    const rows = evidenceIds
      .map((itemId) => itemRowById.get(itemId))
      .filter((row): row is ItemEntityRow => Boolean(row));
    const metadata = canonicalMetadata(entity, rows);
    const confidence = entityConfidence(entity);
    const existing = existingProjects.get(projectId);

    if (existing) {
      const { error } = await supabase
        .from("projects")
        .update({
          canonical_key: existing.canonical_key ?? metadata.canonicalKey,
          canonical_homepage: existing.canonical_homepage ?? metadata.homepage,
          canonical_repo_url: existing.canonical_repo_url ?? metadata.repoUrl,
          entity_confidence: Math.max(Number(existing.entity_confidence ?? 0), confidence),
          resolution_version: "runtime-cluster-v1",
          updated_at: new Date().toISOString(),
        })
        .eq("id", projectId);
      if (error) throw new Error(`更新项目实体失败: ${error.message}`);
      projectsUpdated++;
    } else {
      const { error } = await supabase.from("projects").insert({
        id: projectId,
        canonical_name: entity.primary.title,
        canonical_key: metadata.canonicalKey,
        primary_item_id: entity.primary.id,
        canonical_homepage: metadata.homepage,
        canonical_repo_url: metadata.repoUrl,
        first_seen_at: null,
        latest_seen_at: null,
        source_count: 0,
        entity_confidence: confidence,
        resolution_version: "runtime-cluster-v1",
      });
      if (error) throw new Error(`创建项目实体失败: ${error.message}`);
      projectsCreated++;
      existingProjects.set(projectId, {
        id: projectId,
        canonical_name: entity.primary.title,
        canonical_key: metadata.canonicalKey,
        primary_item_id: entity.primary.id,
        canonical_homepage: metadata.homepage,
        canonical_repo_url: metadata.repoUrl,
        entity_confidence: confidence,
      });
    }

    const evidenceById = new Map(entity.evidence.map((entry) => [entry.itemId, entry]));
    const sourceRows = rows.map((row) => {
      const evidence = evidenceById.get(row.id)!;
      return {
        project_id: projectId,
        item_id: row.id,
        source_id: row.source_id,
        source_url: row.source_url,
        match_method: sourceMatchMethod(evidence.matchReason),
        match_confidence: matchConfidence(evidence.matchReason),
        first_seen_at: row.first_seen_at,
        latest_seen_at: row.last_updated_at,
        updated_at: new Date().toISOString(),
      };
    });

    if (sourceRows.length > 0) {
      const { error } = await supabase
        .from("project_sources")
        .upsert(sourceRows, { onConflict: "item_id" });
      if (error) throw new Error(`写入项目来源证据失败: ${error.message}`);
      sourcesUpserted += sourceRows.length;
      for (const row of sourceRows) projectByItem.set(row.item_id, projectId);
    }
  }

  return {
    candidates: items.length,
    clusters: clustered.entities.size,
    projectsCreated,
    projectsUpdated,
    sourcesUpserted,
    conflictsSkipped,
  };
}
