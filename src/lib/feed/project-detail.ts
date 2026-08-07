import { createAdminClient } from "@/lib/supabase/admin";
import { mapFeedRow, type FeedViewRow } from "./supabase-provider";
import { clusterProjectFeed, type ProjectEntity } from "./project-entities";
import { loadMomentumHistory, type MomentumHistory } from "@/lib/scoring/momentum-history";
import { getDiscoveryExplanations } from "./discovery-explanations";
import type { FeedResult, FrontierFeedItem } from "./types";

interface ItemLinkRow {
  id: string;
  external_url: string | null;
  homepage: string | null;
  source_url: string | null;
}

export interface ProjectEvidenceDetail {
  itemId: string;
  source: FrontierFeedItem["source"];
  contentType: FrontierFeedItem["contentType"];
  title: string;
  url: string;
  externalUrl: string | null;
  homepage: string | null;
  momentum: MomentumHistory | null;
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

  // 详情页以目标 item 为第一个候选，确保聚类后的主条目就是用户点开的项目。
  const { data: recentRaw, error: recentError } = await supabase
    .from("frontier_feed_v1")
    .select("*")
    .neq("item_id", itemId)
    .order("updated_at", { ascending: false, nullsFirst: false })
    .limit(120);
  if (recentError) throw new Error(`读取跨来源候选失败: ${recentError.message}`);

  const targetRow = targetRaw as unknown as FeedViewRow;
  const target = mapFeedRow(targetRow);
  const recent = ((recentRaw ?? []) as unknown as FeedViewRow[]).map(mapFeedRow);
  const clustered = clusterProjectFeed(feed([target, ...recent]));
  const entity = clustered.entities.get(target.id);
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
      try {
        momentum = await loadMomentumHistory(supabase, entry.itemId);
      } catch {
        momentum = null;
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
        momentum,
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
