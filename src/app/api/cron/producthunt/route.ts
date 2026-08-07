import { NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser";
import { checkCronAuth } from "@/lib/cron/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { computePayloadHash, sha256Hex } from "@/lib/hash";
import { insertRawItem } from "@/lib/db/repositories/raw-items";
import { computeBasicScore } from "@/lib/scoring/basic-score";
import {
  upsertBasicScore,
  updateLatestScore,
} from "@/lib/db/repositories/score-components";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const PRODUCT_HUNT_FEED = "https://www.producthunt.com/feed";

interface AtomEntry {
  id?: unknown;
  title?: unknown;
  published?: unknown;
  updated?: unknown;
  summary?: unknown;
  content?: unknown;
  author?: unknown;
  link?: unknown;
}

function scalar(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number") return String(value);
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    for (const key of ["#text", "__cdata", "cdata", "text"]) {
      if (typeof obj[key] === "string" && obj[key].trim()) return obj[key].trim();
    }
  }
  return null;
}

function authorName(value: unknown): string | null {
  if (!value || typeof value !== "object") return scalar(value);
  const obj = value as Record<string, unknown>;
  return scalar(obj.name) ?? scalar(obj["#text"]);
}

function entryLink(value: unknown): string | null {
  const links = Array.isArray(value) ? value : value ? [value] : [];
  const normalized = links
    .map((link) => {
      if (typeof link === "string") return { href: link, rel: "alternate" };
      if (!link || typeof link !== "object") return null;
      const obj = link as Record<string, unknown>;
      return {
        href: scalar(obj["@_href"]) ?? scalar(obj.href) ?? scalar(obj["#text"]),
        rel: scalar(obj["@_rel"]) ?? scalar(obj.rel) ?? "alternate",
      };
    })
    .filter((link): link is { href: string; rel: string } => Boolean(link?.href));

  const alternate = normalized.find((link) => link.rel === "alternate") ?? normalized[0];
  if (!alternate) return null;
  try {
    const url = new URL(alternate.href);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function stripHtml(value: string | null): string | null {
  if (!value) return null;
  const text = value
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
  return text ? text.slice(0, 3_000) : null;
}

function safeIso(value: string | null): string {
  const t = value ? Date.parse(value) : NaN;
  return Number.isFinite(t) ? new Date(t).toISOString() : new Date().toISOString();
}

function inferTopics(title: string, description: string | null): string[] {
  const corpus = `${title} ${description ?? ""}`.toLowerCase();
  const tags = new Set<string>(["product-hunt", "new-product", "launch"]);
  const rules: Array<[string, RegExp]> = [
    ["ai", /\b(ai|artificial intelligence|llm|gpt|generative)\b/],
    ["agent", /\b(agent|agentic|computer use)\b/],
    ["mcp", /\b(mcp|model context protocol)\b/],
    ["developer-tool", /\b(developer|devtool|sdk|api|cli|coding|ide)\b/],
    ["ui", /\b(ui|ux|interface|design|frontend)\b/],
    ["game", /\b(game|gaming|npc|unity|unreal|godot)\b/],
    ["3d", /\b(3d|blender|webgl|webgpu)\b/],
    ["audio", /\b(audio|music|voice|speech|tts|asr)\b/],
    ["video", /\b(video|animation)\b/],
    ["browser", /\b(browser|chrome|firefox|extension)\b/],
    ["automation", /\b(automation|workflow|automate)\b/],
    ["open-source", /\b(open source|open-source|github)\b/],
    ["mobile", /\b(ios|android|mobile|iphone)\b/],
  ];
  for (const [tag, pattern] of rules) if (pattern.test(corpus)) tags.add(tag);
  return [...tags];
}

async function fetchFeed(): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(PRODUCT_HUNT_FEED, {
      signal: controller.signal,
      cache: "no-store",
      headers: {
        Accept: "application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
        "User-Agent": "Frontier-Radar/1.0",
      },
    });
    if (!response.ok) throw new Error(`Product Hunt feed HTTP ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

async function ensureSource() {
  const supabase = createAdminClient();
  const { data: existing, error: readError } = await supabase
    .from("sources")
    .select("id")
    .eq("slug", "producthunt")
    .maybeSingle();
  if (readError) throw new Error(`查询 Product Hunt source 失败: ${readError.message}`);
  if (existing?.id) return { supabase, sourceId: existing.id as string };

  const { data, error } = await supabase
    .from("sources")
    .insert({
      slug: "producthunt",
      name: "Product Hunt",
      description: "Newly launched digital products and maker projects.",
      base_url: "https://www.producthunt.com",
      enabled: true,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(`创建 Product Hunt source 失败: ${error?.message ?? "未知错误"}`);
  return { supabase, sourceId: data.id as string };
}

export async function GET(request: Request) {
  const auth = checkCronAuth(request);
  if (!auth.authorized) return auth.response;

  const startedAt = Date.now();
  let runId: string | null = null;

  try {
    const { supabase, sourceId } = await ensureSource();
    const { data: run, error: runError } = await supabase
      .from("collection_runs")
      .insert({ source_id: sourceId, status: "running", started_at: new Date().toISOString() })
      .select("id")
      .single();
    if (runError || !run) throw new Error(`创建 Product Hunt collection_run 失败: ${runError?.message ?? "未知错误"}`);
    runId = run.id as string;

    const xml = await fetchFeed();
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      processEntities: true,
      trimValues: true,
    });
    const parsed = parser.parse(xml) as Record<string, unknown>;
    const feed = parsed.feed && typeof parsed.feed === "object" ? parsed.feed as Record<string, unknown> : {};
    const rawEntries = Array.isArray(feed.entry) ? feed.entry : feed.entry ? [feed.entry] : [];
    const limit = Math.max(5, Math.min(25, Number(process.env.PRODUCT_HUNT_LIMIT) || 15));
    const entries = rawEntries.slice(0, limit) as AtomEntry[];

    let inserted = 0;
    let updated = 0;
    let unchanged = 0;
    let errors = 0;
    let firstError: string | null = null;

    for (const entry of entries) {
      try {
        const title = scalar(entry.title) ?? "Untitled Product Hunt launch";
        const idRaw = scalar(entry.id) ?? entryLink(entry.link) ?? `${title}:${scalar(entry.published) ?? ""}`;
        const sourceItemId = sha256Hex(idRaw).slice(0, 40);
        const canonicalUrl = entryLink(entry.link) ?? PRODUCT_HUNT_FEED;
        const description = stripHtml(scalar(entry.content) ?? scalar(entry.summary));
        const author = authorName(entry.author);
        const publishedAt = safeIso(scalar(entry.published) ?? scalar(entry.updated));
        const updatedAt = safeIso(scalar(entry.updated) ?? scalar(entry.published));
        const topics = inferTopics(title, description);
        const rawPayload = entry as Record<string, unknown>;

        await insertRawItem(supabase, {
          source_id: sourceId,
          source_item_id: sourceItemId,
          item_type: "product",
          source_url: canonicalUrl,
          raw_payload: rawPayload,
          payload_hash: computePayloadHash(rawPayload),
          collection_run_id: runId,
        });

        const { data: existing, error: existingError } = await supabase
          .from("items")
          .select("id,title,description,source_url,pushed_at_source")
          .eq("source_id", sourceId)
          .eq("source_item_id", sourceItemId)
          .maybeSingle();
        if (existingError) throw existingError;

        const changed = !existing ||
          existing.title !== title ||
          existing.description !== description ||
          existing.source_url !== canonicalUrl ||
          existing.pushed_at_source !== updatedAt;

        const { data: item, error: itemError } = await supabase
          .from("items")
          .upsert({
            source_id: sourceId,
            source_item_id: sourceItemId,
            dedupe_key: `producthunt:${sourceItemId}`,
            item_type: "product",
            title,
            description,
            owner: author,
            full_name: title,
            language: null,
            license: null,
            homepage: canonicalUrl,
            source_url: canonicalUrl,
            external_url: canonicalUrl,
            topics,
            has_code: topics.includes("open-source"),
            has_demo: true,
            has_dataset: false,
            created_at_source: publishedAt,
            pushed_at_source: updatedAt,
            last_updated_at: new Date().toISOString(),
            is_active: true,
          }, { onConflict: "source_id,source_item_id" })
          .select("id")
          .single();
        if (itemError || !item) throw itemError ?? new Error("Product Hunt item upsert 未返回 id");

        if (!existing) inserted++;
        else if (changed) updated++;
        else unchanged++;

        const score = computeBasicScore({
          source: "producthunt",
          itemType: "product",
          title,
          description,
          topics,
          createdAtSource: publishedAt,
          pushedAtSource: updatedAt,
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
    await supabase.from("collection_runs").update({
      status,
      finished_at: new Date().toISOString(),
      discovered_count: entries.length,
      deduplicated_count: 0,
      inserted_count: inserted,
      updated_count: updated,
      unchanged_count: unchanged,
      snapshot_count: 0,
      error_count: errors,
      request_count: 1,
      items_fetched: entries.length,
      items_new: inserted,
      items_updated: updated,
      error_message: firstError,
      metadata: { feed: PRODUCT_HUNT_FEED, parsed_entries: rawEntries.length },
    }).eq("id", runId);

    return NextResponse.json({
      job: "producthunt",
      status: status === "success" ? "succeeded" : status,
      discovered: entries.length,
      persisted: inserted + updated + unchanged,
      errors,
      message: firstError ?? undefined,
      stats: {
        inserted,
        updated,
        unchanged,
        feed_entries: rawEntries.length,
        requests: 1,
        duration_ms: Date.now() - startedAt,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (runId) {
      try {
        await createAdminClient().from("collection_runs").update({
          status: "failed",
          finished_at: new Date().toISOString(),
          error_count: 1,
          error_message: message,
        }).eq("id", runId);
      } catch {
        // 主错误优先。
      }
    }
    return NextResponse.json(
      { job: "producthunt", status: "failed", errors: 1, message },
      { status: 500 }
    );
  }
}
