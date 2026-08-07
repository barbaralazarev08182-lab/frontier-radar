import { NextResponse } from "next/server";
import { checkCronAuth } from "@/lib/cron/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { insertSnapshot } from "@/lib/db/repositories/metric-snapshots";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 180;

interface SourceRow {
  id: string;
  slug: string;
}

interface ItemRow {
  id: string;
  source_item_id: string;
  full_name: string | null;
  item_type: string;
}

interface SourceStats {
  source: string;
  candidates: number;
  snapshots: number;
  requests: number;
  errors: number;
}

function businessDate(): string {
  return new Date().toISOString().slice(0, 10);
}

async function fetchJson<T>(
  url: string,
  headers: Record<string, string> = {},
  timeoutMs = 12_000
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json", ...headers },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`HTTP ${response.status} ${url}`);
    return (await response.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

async function startRun(
  supabase: ReturnType<typeof createAdminClient>,
  sourceId: string
): Promise<string> {
  const { data, error } = await supabase
    .from("collection_runs")
    .insert({ source_id: sourceId, status: "running", started_at: new Date().toISOString() })
    .select("id")
    .single();
  if (error || !data) throw new Error(`创建 momentum collection_run 失败: ${error?.message ?? "unknown"}`);
  return data.id as string;
}

async function finishRun(
  supabase: ReturnType<typeof createAdminClient>,
  runId: string,
  stats: SourceStats
): Promise<void> {
  const { error } = await supabase
    .from("collection_runs")
    .update({
      status: stats.errors > 0 ? "partial" : "success",
      finished_at: new Date().toISOString(),
      discovered_count: stats.candidates,
      deduplicated_count: 0,
      inserted_count: 0,
      updated_count: 0,
      unchanged_count: 0,
      snapshot_count: stats.snapshots,
      error_count: stats.errors,
      request_count: stats.requests,
      items_fetched: stats.candidates,
      items_new: 0,
      items_updated: 0,
      metadata: { job: "momentum-refresh", snapshots: stats.snapshots },
    })
    .eq("id", runId);
  if (error) throw new Error(`结束 momentum collection_run 失败: ${error.message}`);
}

async function recentItems(
  supabase: ReturnType<typeof createAdminClient>,
  sourceId: string,
  limit: number
): Promise<ItemRow[]> {
  const cutoff = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const { data, error } = await supabase
    .from("items")
    .select("id,source_item_id,full_name,item_type")
    .eq("source_id", sourceId)
    .eq("is_active", true)
    .gte("created_at_source", cutoff)
    .order("latest_score", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) throw new Error(`读取近期项目失败: ${error.message}`);
  return (data ?? []) as ItemRow[];
}

function hfIdentity(item: ItemRow): { kind: "models" | "datasets" | "spaces"; id: string } | null {
  const raw = item.source_item_id;
  if (raw.startsWith("model:")) return { kind: "models", id: raw.slice(6) };
  if (raw.startsWith("dataset:")) return { kind: "datasets", id: raw.slice(8) };
  if (raw.startsWith("space:")) return { kind: "spaces", id: raw.slice(6) };
  if (item.full_name) {
    if (item.item_type === "space") return { kind: "spaces", id: item.full_name };
    if (item.item_type === "dataset") return { kind: "datasets", id: item.full_name };
    if (item.item_type === "model") return { kind: "models", id: item.full_name };
  }
  return null;
}

async function refreshGithub(
  supabase: ReturnType<typeof createAdminClient>,
  source: SourceRow,
  limit: number
): Promise<SourceStats> {
  const stats: SourceStats = { source: source.slug, candidates: 0, snapshots: 0, requests: 0, errors: 0 };
  const token = process.env.GITHUB_TOKEN;
  if (!token) return { ...stats, errors: 1 };
  const items = await recentItems(supabase, source.id, limit);
  stats.candidates = items.length;
  if (items.length === 0) return stats;
  const runId = await startRun(supabase, source.id);

  for (const item of items) {
    if (!item.full_name) continue;
    try {
      const repo = await fetchJson<Record<string, unknown>>(
        `https://api.github.com/repos/${item.full_name}`,
        {
          Authorization: `Bearer ${token}`,
          "X-GitHub-Api-Version": process.env.GITHUB_API_VERSION ?? "2022-11-28",
        }
      );
      stats.requests++;
      await insertSnapshot(supabase, {
        item_id: item.id,
        collection_run_id: runId,
        snapshot_date: businessDate(),
        stars: typeof repo.stargazers_count === "number" ? repo.stargazers_count : null,
        forks: typeof repo.forks_count === "number" ? repo.forks_count : null,
        watchers: typeof repo.watchers_count === "number" ? repo.watchers_count : null,
        open_issues: typeof repo.open_issues_count === "number" ? repo.open_issues_count : null,
        subscribers: typeof repo.subscribers_count === "number" ? repo.subscribers_count : null,
      });
      stats.snapshots++;
    } catch {
      stats.errors++;
    }
  }
  await finishRun(supabase, runId, stats);
  return stats;
}

async function refreshHuggingFace(
  supabase: ReturnType<typeof createAdminClient>,
  source: SourceRow,
  limit: number
): Promise<SourceStats> {
  const stats: SourceStats = { source: source.slug, candidates: 0, snapshots: 0, requests: 0, errors: 0 };
  const items = await recentItems(supabase, source.id, limit);
  stats.candidates = items.length;
  if (items.length === 0) return stats;
  const runId = await startRun(supabase, source.id);
  const token = process.env.HF_TOKEN;
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  for (const item of items) {
    const identity = hfIdentity(item);
    if (!identity) continue;
    try {
      const payload = await fetchJson<Record<string, unknown>>(
        `https://huggingface.co/api/${identity.kind}/${identity.id}`,
        headers
      );
      stats.requests++;
      await insertSnapshot(supabase, {
        item_id: item.id,
        collection_run_id: runId,
        snapshot_date: businessDate(),
        stars: null,
        forks: null,
        watchers: null,
        open_issues: null,
        subscribers: null,
        downloads: typeof payload.downloads === "number" ? payload.downloads : null,
        likes: typeof payload.likes === "number" ? payload.likes : null,
      });
      stats.snapshots++;
    } catch {
      stats.errors++;
    }
  }
  await finishRun(supabase, runId, stats);
  return stats;
}

async function refreshHackerNews(
  supabase: ReturnType<typeof createAdminClient>,
  source: SourceRow,
  limit: number
): Promise<SourceStats> {
  const stats: SourceStats = { source: source.slug, candidates: 0, snapshots: 0, requests: 0, errors: 0 };
  const items = await recentItems(supabase, source.id, limit);
  stats.candidates = items.length;
  if (items.length === 0) return stats;
  const runId = await startRun(supabase, source.id);

  for (const item of items) {
    if (!/^\d+$/.test(item.source_item_id)) continue;
    try {
      const story = await fetchJson<Record<string, unknown>>(
        `https://hacker-news.firebaseio.com/v0/item/${item.source_item_id}.json`
      );
      stats.requests++;
      const points = typeof story.score === "number" ? story.score : null;
      const comments = typeof story.descendants === "number" ? story.descendants : null;
      await insertSnapshot(supabase, {
        item_id: item.id,
        collection_run_id: runId,
        snapshot_date: businessDate(),
        stars: null,
        forks: null,
        watchers: null,
        open_issues: null,
        subscribers: null,
        score_raw: points,
        raw_extra: { engagements: points, comments },
      });
      stats.snapshots++;
    } catch {
      stats.errors++;
    }
  }
  await finishRun(supabase, runId, stats);
  return stats;
}

export async function GET(request: Request) {
  const auth = checkCronAuth(request);
  if (!auth.authorized) return auth.response;

  const startedAt = Date.now();
  const configured = Number(process.env.MOMENTUM_REFRESH_PER_SOURCE);
  const limit = Number.isFinite(configured) ? Math.max(3, Math.min(15, Math.floor(configured))) : 8;

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("sources")
      .select("id,slug")
      .in("slug", ["github", "huggingface", "hackernews"]);
    if (error) throw new Error(`读取 sources 失败: ${error.message}`);

    const sources = (data ?? []) as SourceRow[];
    const bySlug = new Map(sources.map((source) => [source.slug, source]));
    const results: SourceStats[] = [];

    const github = bySlug.get("github");
    if (github) results.push(await refreshGithub(supabase, github, limit));

    const hf = bySlug.get("huggingface");
    if (hf) results.push(await refreshHuggingFace(supabase, hf, limit));

    const hn = bySlug.get("hackernews");
    if (hn) results.push(await refreshHackerNews(supabase, hn, limit));

    const snapshots = results.reduce((sum, row) => sum + row.snapshots, 0);
    const errors = results.reduce((sum, row) => sum + row.errors, 0);

    return NextResponse.json({
      job: "momentum-refresh",
      status: errors > 0 ? "partial" : "succeeded",
      snapshots,
      errors,
      sources: results,
      duration_ms: Date.now() - startedAt,
    });
  } catch (error) {
    return NextResponse.json(
      {
        job: "momentum-refresh",
        status: "failed",
        snapshots: 0,
        errors: 1,
        message: error instanceof Error ? error.message : String(error),
        duration_ms: Date.now() - startedAt,
      },
      { status: 500 }
    );
  }
}
