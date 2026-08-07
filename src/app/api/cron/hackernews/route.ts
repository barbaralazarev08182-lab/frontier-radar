import { NextResponse } from "next/server";
import { checkCronAuth } from "@/lib/cron/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { computePayloadHash } from "@/lib/hash";
import { insertRawItem } from "@/lib/db/repositories/raw-items";
import { computeBasicScore } from "@/lib/scoring/basic-score";
import {
  upsertBasicScore,
  updateLatestScore,
} from "@/lib/db/repositories/score-components";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const HN_BASE = "https://hacker-news.firebaseio.com/v0";
const HN_DISCUSSION_BASE = "https://news.ycombinator.com/item?id=";

interface HnStory {
  id: number;
  deleted?: boolean;
  type?: string;
  by?: string;
  time?: number;
  text?: string;
  dead?: boolean;
  url?: string;
  score?: number;
  title?: string;
  descendants?: number;
  kids?: number[];
}

function clampInt(value: string | undefined, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(parsed)));
}

async function fetchJson<T>(url: string, timeoutMs = 10_000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`HN HTTP ${response.status}`);
    return (await response.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

function cleanTitle(value: string | undefined, id: number): string {
  const title = (value ?? "").replace(/^Show HN:\s*/i, "").trim();
  return title || `Show HN #${id}`;
}

function decodeBasicEntities(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function cleanText(value: string | undefined): string | null {
  if (!value) return null;
  const text = decodeBasicEntities(
    value
      .replace(/<a\b[^>]*>(.*?)<\/a>/gi, "$1")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
  return text.length > 0 ? text.slice(0, 3_000) : null;
}

function validUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function inferTopics(story: HnStory): string[] {
  const corpus = `${story.title ?? ""} ${story.text ?? ""} ${story.url ?? ""}`.toLowerCase();
  const tags = new Set<string>(["show-hn", "side-project", "new-build"]);

  const rules: Array<[string, RegExp]> = [
    ["ai", /\b(ai|artificial intelligence|llm|gpt|transformer)\b/],
    ["agent", /\b(agent|agentic|computer use)\b/],
    ["mcp", /\b(mcp|model context protocol)\b/],
    ["developer-tool", /\b(devtool|developer tool|sdk|cli|ide|vscode|coding)\b/],
    ["ui", /\b(ui|ux|interface|frontend|canvas)\b/],
    ["game", /\b(game|gaming|npc|unity|unreal|godot)\b/],
    ["3d", /\b(3d|blender|webgl|webgpu)\b/],
    ["audio", /\b(audio|music|voice|speech|tts|asr)\b/],
    ["video", /\b(video|animation)\b/],
    ["browser", /\b(browser|chrome|firefox|web extension)\b/],
    ["open-source", /\b(open source|open-source|github\.com)\b/],
    ["automation", /\b(automation|workflow|automate)\b/],
    ["local-first", /\b(local-first|local first|offline-first)\b/],
  ];

  for (const [tag, pattern] of rules) {
    if (pattern.test(corpus)) tags.add(tag);
  }
  return [...tags];
}

async function ensureHackerNewsSource(): Promise<{ supabase: ReturnType<typeof createAdminClient>; sourceId: string }> {
  const supabase = createAdminClient();
  const { data: existing, error: readError } = await supabase
    .from("sources")
    .select("id")
    .eq("slug", "hackernews")
    .maybeSingle();
  if (readError) throw new Error(`查询 Hacker News source 失败: ${readError.message}`);
  if (existing?.id) return { supabase, sourceId: existing.id as string };

  const { data, error } = await supabase
    .from("sources")
    .insert({
      slug: "hackernews",
      name: "Hacker News / Show HN",
      description: "New products, demos, developer tools and experiments published on Show HN.",
      base_url: HN_BASE,
      docs_url: "https://github.com/HackerNews/API",
      enabled: true,
    })
    .select("id")
    .single();
  if (error || !data) {
    throw new Error(`创建 Hacker News source 失败: ${error?.message ?? "未知错误"}`);
  }
  return { supabase, sourceId: data.id as string };
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
  if (error || !data) throw new Error(`创建 Show HN collection_run 失败: ${error?.message ?? "未知错误"}`);
  return data.id as string;
}

async function finishRun(
  supabase: ReturnType<typeof createAdminClient>,
  runId: string,
  input: {
    status: "success" | "partial" | "failed";
    discovered: number;
    inserted: number;
    updated: number;
    unchanged: number;
    errors: number;
    requests: number;
    message: string | null;
    scanned: number;
  }
): Promise<void> {
  const { error } = await supabase
    .from("collection_runs")
    .update({
      status: input.status,
      finished_at: new Date().toISOString(),
      discovered_count: input.discovered,
      deduplicated_count: 0,
      inserted_count: input.inserted,
      updated_count: input.updated,
      unchanged_count: input.unchanged,
      snapshot_count: 0,
      error_count: input.errors,
      request_count: input.requests,
      items_fetched: input.discovered,
      items_new: input.inserted,
      items_updated: input.updated,
      error_message: input.message,
      metadata: {
        feed: "showstories",
        scanned: input.scanned,
        persisted: input.inserted + input.updated + input.unchanged,
      },
    })
    .eq("id", runId);
  if (error) throw new Error(`结束 Show HN collection_run 失败: ${error.message}`);
}

export async function GET(request: Request) {
  const auth = checkCronAuth(request);
  if (!auth.authorized) return auth.response;

  const startedAt = Date.now();
  const scanLimit = clampInt(process.env.HN_SHOW_SCAN_LIMIT, 30, 10, 60);
  const persistLimit = clampInt(process.env.HN_SHOW_PERSIST_LIMIT, 12, 5, 25);
  const discoveryDays = clampInt(process.env.HN_SHOW_DISCOVERY_DAYS, 7, 1, 30);
  let requests = 0;
  let runId: string | null = null;

  try {
    const { supabase, sourceId } = await ensureHackerNewsSource();
    runId = await startRun(supabase, sourceId);

    const ids = await fetchJson<number[]>(`${HN_BASE}/showstories.json`);
    requests++;
    const selectedIds = ids.slice(0, scanLimit);

    const fetched = await Promise.all(
      selectedIds.map(async (id) => {
        try {
          const story = await fetchJson<HnStory | null>(`${HN_BASE}/item/${id}.json`);
          return { story, error: null as string | null };
        } catch (error) {
          return {
            story: null,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      })
    );
    requests += selectedIds.length;

    const cutoff = Date.now() - discoveryDays * 86_400_000;
    const stories = fetched
      .map((entry) => entry.story)
      .filter((story): story is HnStory => Boolean(story))
      .filter((story) =>
        story.type === "story" &&
        !story.deleted &&
        !story.dead &&
        typeof story.id === "number" &&
        typeof story.time === "number" &&
        story.time * 1000 >= cutoff
      )
      .sort((a, b) => (b.time ?? 0) - (a.time ?? 0))
      .slice(0, persistLimit);

    let inserted = 0;
    let updated = 0;
    let unchanged = 0;
    let errors = fetched.filter((entry) => entry.error !== null).length;
    let firstError = fetched.find((entry) => entry.error)?.error ?? null;

    for (const story of stories) {
      try {
        const sourceItemId = String(story.id);
        const discussionUrl = `${HN_DISCUSSION_BASE}${story.id}`;
        const projectUrl = validUrl(story.url) ?? discussionUrl;
        const description = cleanText(story.text);
        const title = cleanTitle(story.title, story.id);
        const topics = inferTopics(story);
        const publishedAt = new Date((story.time ?? 0) * 1000).toISOString();
        const rawPayload = {
          ...story,
          hn_discussion_url: discussionUrl,
          discovered_via: "showstories",
        } as Record<string, unknown>;

        await insertRawItem(supabase, {
          source_id: sourceId,
          source_item_id: sourceItemId,
          item_type: "product",
          source_url: projectUrl,
          raw_payload: rawPayload,
          payload_hash: computePayloadHash(rawPayload),
          collection_run_id: runId,
        });

        const { data: existing, error: existingError } = await supabase
          .from("items")
          .select("id, title, description, source_url, pushed_at_source")
          .eq("source_id", sourceId)
          .eq("source_item_id", sourceItemId)
          .maybeSingle();
        if (existingError) throw existingError;

        const changed =
          !existing ||
          existing.title !== title ||
          existing.description !== description ||
          existing.source_url !== projectUrl ||
          existing.pushed_at_source !== publishedAt;

        const { data: item, error: itemError } = await supabase
          .from("items")
          .upsert(
            {
              source_id: sourceId,
              source_item_id: sourceItemId,
              dedupe_key: `hackernews:${sourceItemId}`,
              item_type: "product",
              title,
              description,
              owner: story.by ?? null,
              full_name: `Show HN #${sourceItemId}`,
              language: null,
              license: null,
              homepage: projectUrl === discussionUrl ? null : projectUrl,
              source_url: projectUrl,
              external_url: discussionUrl,
              topics,
              has_code: projectUrl.includes("github.com/"),
              has_demo: projectUrl !== discussionUrl,
              has_dataset: false,
              created_at_source: publishedAt,
              pushed_at_source: publishedAt,
              last_updated_at: new Date().toISOString(),
              is_active: true,
            },
            { onConflict: "source_id,source_item_id" }
          )
          .select("id")
          .single();
        if (itemError || !item) throw itemError ?? new Error("Show HN item upsert 未返回 id");

        if (!existing) inserted++;
        else if (changed) updated++;
        else unchanged++;

        const score = computeBasicScore({
          source: "hackernews",
          itemType: "product",
          title,
          description,
          topics,
          createdAtSource: publishedAt,
          pushedAtSource: publishedAt,
          stars: null,
          forks: null,
          downloads: null,
          likes: null,
          aiResult: null,
        });
        await upsertBasicScore(supabase, item.id as string, score);
        await updateLatestScore(supabase, item.id as string, score.total);
      } catch (error) {
        errors++;
        if (!firstError) firstError = error instanceof Error ? error.message : String(error);
      }
    }

    const status = errors > 0 ? "partial" : "success";
    await finishRun(supabase, runId, {
      status,
      discovered: stories.length,
      inserted,
      updated,
      unchanged,
      errors,
      requests,
      message: firstError,
      scanned: selectedIds.length,
    });

    return NextResponse.json({
      job: "hackernews",
      status: status === "success" ? "succeeded" : status,
      discovered: stories.length,
      persisted: inserted + updated + unchanged,
      errors,
      stats: {
        inserted,
        updated,
        unchanged,
        scanned: selectedIds.length,
        requests,
        duration_ms: Date.now() - startedAt,
      },
      message: firstError ?? undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (runId) {
      try {
        const supabase = createAdminClient();
        await supabase
          .from("collection_runs")
          .update({
            status: "failed",
            finished_at: new Date().toISOString(),
            error_count: 1,
            error_message: message,
            request_count: requests,
          })
          .eq("id", runId);
      } catch {
        // 主错误优先。
      }
    }
    return NextResponse.json(
      { job: "hackernews", status: "failed", errors: 1, message },
      { status: 500 }
    );
  }
}
