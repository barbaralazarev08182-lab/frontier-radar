/**
 * sources 数据访问层（阶段 1.2）。
 * 采集前确保数据源已注册，返回其 uuid。
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { SourceSlug } from "@/lib/types";

const SOURCE_DEFAULTS: Record<SourceSlug, { name: string; base_url: string }> = {
  github: { name: "GitHub", base_url: "https://api.github.com" },
  huggingface: { name: "Hugging Face", base_url: "https://huggingface.co/api" },
  arxiv: { name: "arXiv", base_url: "http://export.arxiv.org/api/query" },
};

/** 获取或创建数据源，返回其 uuid。 */
export async function ensureSourceId(
  supabase: SupabaseClient,
  slug: SourceSlug
): Promise<string> {
  const { data: existing, error: readError } = await supabase
    .from("sources")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (readError) {
    throw new Error(`查询 sources 失败: ${readError.message}`);
  }
  if (existing) return existing.id as string;

  const def = SOURCE_DEFAULTS[slug];
  const { data, error } = await supabase
    .from("sources")
    .insert({ slug, name: def.name, base_url: def.base_url, enabled: true })
    .select("id")
    .single();
  if (error || !data) {
    throw new Error(`创建 sources 失败: ${error?.message ?? "未知错误"}`);
  }
  return data.id as string;
}
