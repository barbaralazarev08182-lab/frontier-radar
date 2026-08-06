/**
 * ai_analyses 数据访问层 + 分析候选查询（阶段 1.5）。
 *
 * 幂等策略（Schema 无唯一约束，优先在 repository 查询去重）：
 *  - hasSuccessfulAnalysis：同一 item + model + prompt_version + input_hash
 *    已有 success 记录时跳过重复调用；
 *  - 输入变化 / Prompt 变化 / 模型变化会生成不同 input_hash 或 version，允许新记录。
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AnalysisItemRow, AnalysisDocument, AnalysisSnapshot, ItemAnalysisResult } from "@/lib/ai/types";

export interface NewAiAnalysis {
  item_id: string;
  analysis_type: "summary" | "deep" | "idea";
  provider: string;
  model: string;
  prompt_version: string;
  schema_version: string;
  input_hash: string;
  /** success 时保存校验通过的分析结果；failed 时为 null（迁移 0007 允许） */
  result: ItemAnalysisResult | null;
  status: "success" | "failed";
  error_message: string | null;
  token_usage: number | null;
  estimated_cost: number | null;
  latency_ms: number;
}

/** 同一 item + model + prompt_version + input_hash 已有成功分析则返回 true。 */
export async function hasSuccessfulAnalysis(
  supabase: SupabaseClient,
  args: { itemId: string; model: string; promptVersion: string; inputHash: string }
): Promise<boolean> {
  const { data, error } = await supabase
    .from("ai_analyses")
    .select("id")
    .eq("item_id", args.itemId)
    .eq("model", args.model)
    .eq("prompt_version", args.promptVersion)
    .eq("input_hash", args.inputHash)
    .eq("status", "success")
    .maybeSingle();
  if (error) {
    throw new Error(`查询 ai_analyses 失败: ${error.message}`);
  }
  return data !== null;
}

/** 写入一条分析记录。 */
export async function insertAiAnalysis(
  supabase: SupabaseClient,
  a: NewAiAnalysis
): Promise<string> {
  const { data, error } = await supabase
    .from("ai_analyses")
    .insert({
      item_id: a.item_id,
      analysis_type: a.analysis_type,
      provider: a.provider,
      model: a.model,
      prompt_version: a.prompt_version,
      schema_version: a.schema_version,
      input_hash: a.input_hash,
      result: a.result,
      status: a.status,
      error_message: a.error_message,
      token_usage: a.token_usage,
      estimated_cost: a.estimated_cost,
      latency_ms: a.latency_ms,
    })
    .select("id")
    .single();
  if (error || !data) {
    throw new Error(`写入 ai_analyses 失败: ${error?.message ?? "未知错误"}`);
  }
  return data.id as string;
}

export interface SelectCandidatesOptions {
  sources?: string[];
  itemId?: string;
  /** 拉取候选池上限 */
  poolLimit: number;
  /** 当前模型 / Prompt 版本（用于优先未分析项） */
  model: string;
  promptVersion: string;
}

/**
 * 拉取分析候选池（items + source slug），按优先级排序：
 * 尚无当前版本成功分析 > 有文档 > 最近发现。
 * 精确去重（input_hash）在 analyze-item.ts 中完成。
 */
export async function selectItemsForAnalysis(
  supabase: SupabaseClient,
  opts: SelectCandidatesOptions
): Promise<AnalysisItemRow[]> {
  let query = supabase.from("items").select(
    `id, source_item_id, item_type, title, description, owner, full_name, language, license,
     source_url, topics, created_at_source, pushed_at_source, first_seen_at, last_updated_at,
     sources(slug)`
  );

  if (opts.itemId) {
    query = query.eq("id", opts.itemId);
  } else if (opts.sources && opts.sources.length > 0) {
    query = query.in("sources.slug", opts.sources);
  }

  const { data, error } = await query
    .order("first_seen_at", { ascending: false })
    .limit(Math.max(1, opts.poolLimit));
  if (error) {
    throw new Error(`查询 items 失败: ${error.message}`);
  }

  const rows = (data ?? []) as unknown as Array<
    Record<string, unknown> & { sources?: { slug?: string } | { slug?: string }[] }
  >;
  const items: AnalysisItemRow[] = rows.map((r) => ({
    id: r.id as string,
    source_slug: normalizeSourceSlug(r.sources),
    source_item_id: r.source_item_id as string,
    item_type: r.item_type as string,
    title: r.title as string,
    description: (r.description as string | null) ?? null,
    owner: (r.owner as string | null) ?? null,
    full_name: (r.full_name as string | null) ?? null,
    language: (r.language as string | null) ?? null,
    license: (r.license as string | null) ?? null,
    source_url: r.source_url as string,
    topics: Array.isArray(r.topics) ? (r.topics as string[]) : [],
    created_at_source: (r.created_at_source as string | null) ?? null,
    pushed_at_source: (r.pushed_at_source as string | null) ?? null,
    first_seen_at: r.first_seen_at as string,
    last_updated_at: r.last_updated_at as string,
  }));

  // 优先未分析项：一次性查询当前版本成功集合
  const analyzedSet = await getAnalyzedItemIds(supabase, {
    itemIds: items.map((i) => i.id),
    model: opts.model,
    promptVersion: opts.promptVersion,
  });

  return items.sort((a, b) => {
    const aAnalyzed = analyzedSet.has(a.id) ? 1 : 0;
    const bAnalyzed = analyzedSet.has(b.id) ? 1 : 0;
    if (aAnalyzed !== bAnalyzed) return aAnalyzed - bAnalyzed;
    return 0;
  });
}

function normalizeSourceSlug(sources: unknown): string {
  if (Array.isArray(sources)) {
    const s = sources[0];
    if (s && typeof s === "object" && "slug" in s) return (s as { slug?: unknown }).slug as string;
    return "";
  }
  if (sources && typeof sources === "object" && "slug" in sources) {
    return (sources as { slug?: unknown }).slug as string;
  }
  return "";
}

/** 批量查询某 item 集合中已存在"当前版本成功分析"的 item_id 集合。 */
async function getAnalyzedItemIds(
  supabase: SupabaseClient,
  args: { itemIds: string[]; model: string; promptVersion: string }
): Promise<Set<string>> {
  if (args.itemIds.length === 0) return new Set();
  const { data, error } = await supabase
    .from("ai_analyses")
    .select("item_id")
    .in("item_id", args.itemIds)
    .eq("model", args.model)
    .eq("prompt_version", args.promptVersion)
    .eq("status", "success");
  if (error) {
    throw new Error(`查询 ai_analyses 失败: ${error.message}`);
  }
  const set = new Set<string>();
  for (const row of data ?? []) {
    const id = (row as { item_id?: unknown }).item_id;
    if (typeof id === "string") set.add(id);
  }
  return set;
}

/** 获取条目的附属文档（用于输入准备）。 */
export async function getAnalysisDocuments(
  supabase: SupabaseClient,
  itemId: string
): Promise<AnalysisDocument[]> {
  const { data, error } = await supabase
    .from("item_documents")
    .select("document_type, content_text, source_revision")
    .eq("item_id", itemId)
    .order("fetched_at", { ascending: true });
  if (error) {
    throw new Error(`查询 item_documents 失败: ${error.message}`);
  }
  return (data ?? []).map((d) => ({
    document_type: (d as { document_type?: unknown }).document_type as string,
    content_text: (d as { content_text?: unknown }).content_text as string | null,
    source_revision: (d as { source_revision?: unknown }).source_revision as string | null,
  }));
}

/** 获取条目最新指标快照（用于输入准备与评分）。 */
export async function getLatestSnapshot(
  supabase: SupabaseClient,
  itemId: string
): Promise<AnalysisSnapshot | null> {
  const { data, error } = await supabase
    .from("item_metrics_snapshot")
    .select("stars, forks, downloads, likes")
    .eq("item_id", itemId)
    .order("captured_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    throw new Error(`查询 item_metrics_snapshot 失败: ${error.message}`);
  }
  if (!data) return null;
  const d = data as { stars?: unknown; forks?: unknown; downloads?: unknown; likes?: unknown };
  return {
    stars: toNullableNumber(d.stars),
    forks: toNullableNumber(d.forks),
    downloads: toNullableNumber(d.downloads),
    likes: toNullableNumber(d.likes),
  };
}

function toNullableNumber(value: unknown): number | null {
  if (typeof value === "number") return value;
  return null;
}
