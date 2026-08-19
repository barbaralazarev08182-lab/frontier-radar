/**
 * 模型输入准备（阶段 1.5）。
 *
 * 将数据库条目 + 附属文档 + 指标快照整理为统一文本输入：
 *  - 高价值字段（元数据、标题、描述）优先保留；
 *  - 文档内容（README / Card / Abstract）保留前段，超长时截断而非从结尾丢；
 *  - 不把 README / 摘要拼接进指令，只作为数据文本交给 prompts.buildUserPrompt 放入边界；
 *  - inputHash 是稳定的语义内容指纹：保留实际模型输入中的热度指标，但计算指纹时排除
 *    Stars / Forks / Downloads / Likes，避免纯指标变化触发重复付费分析。
 */

import { sha256Hex } from "@/lib/hash";
import type {
  AnalysisDocument,
  AnalysisItemRow,
  AnalysisSnapshot,
  PreparedAnalysisInput,
} from "./types";

export interface PrepareInputOptions {
  /** 输入最大字符数，默认 12000 */
  maxInputChars?: number;
}

const DEFAULT_MAX_INPUT_CHARS = 12_000;

/** 构建节行（key: value，value 为空时跳过）。 */
function sectionLine(key: string, value: string | number | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).replace(/\s+/g, " ").trim();
  return s ? `[${key}] ${s}` : null;
}

function buildHeader(row: AnalysisItemRow, extra: (string | null)[]): string[] {
  return [
    sectionLine("来源", row.source_slug),
    sectionLine("类型", row.item_type),
    sectionLine("标题", row.title),
    sectionLine("URL", row.source_url),
    sectionLine("描述", row.description),
    ...extra,
    "",
  ].filter((l): l is string => l !== null);
}

/** GitHub 输入（README 前段 + 指标）。 */
function buildGitHubText(row: AnalysisItemRow, doc: AnalysisDocument | null, snapshot: AnalysisSnapshot | null, maxChars: number): { text: string; truncated: boolean } {
  const header = buildHeader(row, [
    sectionLine("Topics", row.topics.join(", ")),
    sectionLine("语言", row.language),
    sectionLine("License", row.license),
    sectionLine("Stars", snapshot?.stars ?? null),
    sectionLine("Forks", snapshot?.forks ?? null),
    sectionLine("创建时间", row.created_at_source),
    sectionLine("最后更新", row.pushed_at_source),
  ]);
  const content = doc?.content_text?.replace(/\s+/g, " ") ?? "";
  return assemble(header, "README 内容（前段）", content, maxChars);
}

/** Hugging Face 输入（Card / README + 指标）。 */
function buildHFText(row: AnalysisItemRow, doc: AnalysisDocument | null, snapshot: AnalysisSnapshot | null, maxChars: number): { text: string; truncated: boolean } {
  const contentKey =
    row.item_type === "space" ? "Space README（前段）"
    : row.item_type === "dataset" ? "Dataset Card（前段）"
    : "Model Card（前段）";
  const header = buildHeader(row, [
    sectionLine("repo ID", row.full_name),
    sectionLine("Tags", row.topics.join(", ")),
    sectionLine("Language/Pipeline", row.language),
    sectionLine("Downloads", snapshot?.downloads ?? null),
    sectionLine("Likes", snapshot?.likes ?? null),
    sectionLine("创建时间", row.created_at_source),
    sectionLine("最后更新", row.pushed_at_source),
  ]);
  const content = doc?.content_text?.replace(/\s+/g, " ") ?? "";
  return assemble(header, contentKey, content, maxChars);
}

/** arXiv 输入（Abstract，不下载/分析 PDF）。 */
function buildArxivText(row: AnalysisItemRow, doc: AnalysisDocument | null, _snapshot: AnalysisSnapshot | null, maxChars: number): { text: string; truncated: boolean } {
  const header = buildHeader(row, [
    sectionLine("作者", row.owner),
    sectionLine("主分类", row.language),
    sectionLine("分类", row.topics.join(", ")),
    sectionLine("发布时间", row.created_at_source),
    sectionLine("版本", doc?.source_revision),
    sectionLine("说明", "内容为 arXiv 摘要（Abstract），未下载或分析 PDF"),
  ]);
  const content = doc?.content_text?.replace(/\s+/g, " ") ?? "";
  return assemble(header, "摘要（Abstract）", content, maxChars);
}

/**
 * 组装文本：元数据（header）优先完整保留，文档内容保留前段。
 * 若 header 本身超限，则整体截断并标记。
 */
function assemble(header: string[], contentKey: string, content: string, maxChars: number): { text: string; truncated: boolean } {
  const head = header.join("\n");
  if (!content) {
    return head.length > maxChars
      ? { text: head.slice(0, maxChars), truncated: true }
      : { text: head, truncated: false };
  }
  const separator = `\n\n[${contentKey}]\n`;
  const headerLen = head.length + separator.length;
  if (headerLen > maxChars) {
    return { text: head.slice(0, maxChars), truncated: true };
  }
  const budget = maxChars - headerLen;
  const truncated = content.length > budget;
  return { text: head + separator + content.slice(0, budget), truncated };
}

function buildSourceText(
  row: AnalysisItemRow,
  doc: AnalysisDocument | null,
  snapshot: AnalysisSnapshot | null,
  maxChars: number
): { text: string; truncated: boolean } {
  switch (row.source_slug) {
    case "github":
      return buildGitHubText(row, doc, snapshot, maxChars);
    case "huggingface":
      return buildHFText(row, doc, snapshot, maxChars);
    case "arxiv":
      return buildArxivText(row, doc, snapshot, maxChars);
    default: {
      const header = buildHeader(row, [sectionLine("Topics", row.topics.join(", "))]);
      return assemble(header, "内容（前段）", doc?.content_text?.replace(/\s+/g, " ") ?? "", maxChars);
    }
  }
}

/**
 * 准备统一模型输入。
 * 按 source 分发；未识别来源退回通用输入。
 */
export function prepareAnalysisInput(
  row: AnalysisItemRow,
  documents: AnalysisDocument[],
  snapshot: AnalysisSnapshot | null,
  opts: PrepareInputOptions = {}
): PreparedAnalysisInput {
  const maxChars = Math.max(100, opts.maxInputChars ?? DEFAULT_MAX_INPUT_CHARS);
  const doc = documents[0] ?? null;
  const prepared = buildSourceText(row, doc, snapshot, maxChars);

  // 幂等缓存只跟随语义内容变化。热度指标仍进入模型输入和评分，
  // 但 Stars / Forks / Downloads / Likes 的日常波动不会改变 inputHash。
  const stableSemanticText = buildSourceText(row, doc, null, maxChars).text;

  return {
    source: row.source_slug,
    itemType: row.item_type,
    title: row.title,
    sourceUrl: row.source_url,
    text: prepared.text,
    charCount: prepared.text.length,
    inputHash: sha256Hex(stableSemanticText),
    truncated: prepared.truncated,
  };
}
