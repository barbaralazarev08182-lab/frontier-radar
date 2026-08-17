import { createAdminClient } from "@/lib/supabase/admin";
import { mapFeedRow, type FeedViewRow } from "./supabase-provider";
import { clusterProjectFeed, type ProjectEntity } from "./project-entities";
import { tryLoadPersistentProjectEntity } from "./persistent-project-entities";
import { loadMomentumHistory, type MomentumHistory } from "@/lib/scoring/momentum-history";
import { getDiscoveryExplanations } from "./discovery-explanations";
import type { FeedResult, FrontierFeedItem } from "./types";

interface ItemLinkRow {
  id: string;
  external_url: string | null;
  homepage: string | null;
  source_url: string | null;
}

interface MetricSnapshotRow {
  snapshot_date: string;
  captured_at: string;
  stars: number | null;
  forks: number | null;
  downloads: number | null;
  likes: number | null;
  score_raw: number | null;
  raw_extra: Record<string, unknown> | null;
}

export interface ProjectMetricPoint {
  date: string;
  value: number;
}

export interface ProjectEvidenceDetail {
  itemId: string;
  source: FrontierFeedItem["source"];
  contentType: FrontierFeedItem["contentType"];
  title: string;
  url: string;
  externalUrl: string | null;
  homepage: string | null;
  publishedAt: string | null;
  updatedAt: string | null;
  momentum: MomentumHistory | null;
  metricLabel: string | null;
  metricHistory: ProjectMetricPoint[];
}

export interface ProjectScoreDetail {
  dimension: string;
  score: number;
  rationale: string | null;
}

export interface ProjectDetailData {
  item: FrontierFeedItem;
  entity: ProjectEntity;
  evidence: ProjectEvidenceDetail[];
  scores: ProjectScoreDetail[];
  analysis: Record<string, unknown> | null;
  whyNow: string | null;
}

function feed(items: FrontierFeedItem[]): FeedResult {
  return {
    items,
    total: items.length,
    page: 1,
    pageSize: items.length,
    query: { q: null, source: null, type: null, tag: null, sort: "score", page: 1 },
  };
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function finite(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function metricForSource(
  source: FrontierFeedItem["source"],
  rows: MetricSnapshotRow[]
): { label: string | null; points: ProjectMetricPoint[] } {
  const selectors: Array<{ label: string; pick: (row: MetricSnapshotRow) => number | null }> =
    source === "github"
      ? [
          { label: "STARS", pick: (row) => finite(row.stars) },
          { label: "FORKS", pick: (row) => finite(row.forks) },
        ]
      : source === "huggingface"
        ? [
            { label: "DOWNLOADS", pick: (row) => finite(row.downloads) },
            { label: "LIKES", pick: (row) => finite(row.likes) },
          ]
        : source === "hackernews"
          ? [
              { label: "HN POINTS", pick: (row) => finite(row.raw_extra?.engagements) ?? finite(row.score_raw) },
              { label: "COMMENTS", pick: (row) => finite(row.raw_extra?.comments) },
            ]
          : source === "producthunt"
            ? [
                { label: "VOTES / LIKES", pick: (row) => finite(row.likes) ?? finite(row.score_raw) },
              ]
            : [];

  for (const selector of selectors) {
    const byDay = new Map<string, ProjectMetricPoint>();
    for (const row of rows) {
      const value = selector.pick(row);
      if (value === null || !row.snapshot_date) continue;
      // Rows arrive newest-first; keep the first observation for a calendar date.
      if (!byDay.has(row.snapshot_date)) {
        byDay.set(row.snapshot_date, { date: row.snapshot_date, value });
      }
    }
    const points = [...byDay.values()]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30);
    if (points.length > 0) return { label: selector.label, points };
  }

  return { label: null, points: [] };
}

async function loadMetricHistory(
  supabase: ReturnType<typeof createAdminClient>,
  itemId: string,
  source: FrontierFeedItem["source"]
): Promise<{ label: string | null; points: ProjectMetricPoint[] }> {
  const { data, error } = await supabase
    .from("item_metrics_snapshot")
    .select("snapshot_date,captured_at,stars,forks,downloads,likes,score_raw,raw_extra")
    .eq("item_id", itemId)
    .order("captured_at", { ascending: false })
    .limit(40);
  if (error) throw new Error(`读取 Project 指标历史失败: ${error.message}`);
  return metricForSource(source, (data ?? []) as MetricSnapshotRow[]);
}

export async function loadProjectDetail(itemId: string): Promise<ProjectDetailData | null> {
  if (!isUuid(itemId)) return null;
  const supabase = createAdminClient();

  const { data: targetRaw, error: targetError } = await supabase
    .from("frontier_feed_v1")
    .select("*")
    .eq("item_id", itemId)
    .maybeSingle();
  if (targetError) throw new Error(`读取项目详情失败: ${targetError.message}`);
  if (!targetRaw) return null;

  const targetRow = targetRaw as unknown as FeedViewRow;
  const target = mapFeedRow(targetRow);

  let entity: ProjectEntity | null = null;
  try {
    entity = await tryLoadPersistentProjectEntity(target);
  } catch {
    entity = null;
  }

  if (!entity) {
    const { data: recentRaw, error: recentError } = await supabase
      .from("frontier_feed_v1")
      .select("*")
      .neq("item_id", itemId)
      .order("updated_at", { ascending: false, nullsFirst: false })
      .limit(120);
    if (recentError) throw new Error(`读取跨来源候选失败: ${recentError.message}`);

    const recent = ((recentRaw ?? []) as unknown as FeedViewRow[]).map(mapFeedRow);
    const clustered = clusterProjectFeed(feed([target, ...recent]));
    entity = clustered.entities.get(target.id) ?? null;
  }
  if (!entity) return null;

  const evidenceIds = entity.evidence.map((entry) => entry.itemId);
  const [{ data: linkRows }, scoreResponse, explanations] = await Promise.all([
    supabase
      .from("items")
      .select("id,external_url,homepage,source_url")
      .in("id", evidenceIds),
    supabase
      .from("score_components")
      .select("dimension,normalized_score,rationale,created_at")
      .eq("item_id", target.id)
      .order("created_at", { ascending: false })
      .limit(40),
    getDiscoveryExplanations([target], []),
  ]);

  const links = new Map(
    ((linkRows ?? []) as ItemLinkRow[]).map((row) => [row.id, row])
  );

  const evidence: ProjectEvidenceDetail[] = await Promise.all(
    entity.evidence.map(async (entry) => {
      let momentum: MomentumHistory | null = null;
      let metricLabel: string | null = null;
      let metricHistory: ProjectMetricPoint[] = [];
      try {
        [momentum, { label: metricLabel, points: metricHistory }] = await Promise.all([
          loadMomentumHistory(supabase, entry.itemId),
          loadMetricHistory(supabase, entry.itemId, entry.source),
        ]);
      } catch {
        momentum = null;
        metricLabel = null;
        metricHistory = [];
      }
      const link = links.get(entry.itemId);
      return {
        itemId: entry.itemId,
        source: entry.source,
        contentType: entry.contentType,
        title: entry.title,
        url: entry.url,
        externalUrl: link?.external_url ?? null,
        homepage: link?.homepage ?? null,
        publishedAt: entry.publishedAt,
        updatedAt: entry.updatedAt,
        momentum,
        metricLabel,
        metricHistory,
      };
    })
  );

  const seenDimensions = new Set<string>();
  const scores: ProjectScoreDetail[] = [];
  for (const row of (scoreResponse.data ?? []) as Array<{
    dimension: string;
    normalized_score: number;
    rationale: string | null;
  }>) {
    if (seenDimensions.has(row.dimension)) continue;
    seenDimensions.add(row.dimension);
    scores.push({
      dimension: row.dimension,
      score: Number(row.normalized_score),
      rationale: row.rationale,
    });
  }

  return {
    item: target,
    entity,
    evidence,
    scores,
    analysis: targetRow.analysis_result,
    whyNow: explanations.get(target.id)?.whyNow ?? null,
  };
}
