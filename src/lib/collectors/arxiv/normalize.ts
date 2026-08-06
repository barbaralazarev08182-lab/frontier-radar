/**
 * arXiv 论文标准化（阶段 1.4）。
 *
 * 关键约定：
 *  - 稳定来源 ID 使用不带版本号的论文 ID：`arxiv:2401.12345` / `arxiv:cs/9901001`，
 *    论文发布新版本时 source_item_id 不变。
 *  - 版本号单独保存（version），如 id 为 2401.12345v3 → version = 3。
 *  - description 使用摘要（abstract）；title / abstract 清理多余空白。
 *  - 不推断论文质量、不编造是否有代码、不按标题判断"突破"。
 *  - DOI / journal reference / comment 缺失时用 null。
 */
import type { SourceSlug } from "@/lib/types";
import type { ArxivAtomEntry } from "@/lib/arxiv/types";
import { asArray } from "@/lib/arxiv/client";
import { computePayloadHash } from "@/lib/hash";

export const ARXIV_SOURCE: SourceSlug = "arxiv";

export interface NormalizedArxivPaper {
  sourceItemId: string; // "arxiv:2401.12345"
  dedupeKey: string; // "arxiv:arxiv:2401.12345"
  itemType: "paper";
  title: string;
  canonicalUrl: string; // https://arxiv.org/abs/{baseId}
  pdfUrl: string | null; // https://arxiv.org/pdf/{baseId}
  description: string | null; // 清洗后的 abstract
  authors: string[];
  primaryCategory: string | null;
  categories: string[];
  publishedAt: string | null;
  updatedAt: string | null;
  version: number | null;
  comment: string | null;
  journalReference: string | null;
  doi: string | null;
  rawPayload: Record<string, unknown>;
  payloadHash: string;
}

/** 解析 arXiv ID（含版本号）→ 稳定 baseId + 版本号。 */
export function parseArxivId(rawId: string): {
  baseId: string;
  version: number | null;
} {
  // 去掉 URL 前缀（形如 http://arxiv.org/abs/hep-th/9901001v2），
  // 旧式 ID 的 "category/number" 必须整体保留，不能用 "/" 切分。
  const m = /\/abs\/(.+)$/.exec(rawId.trim());
  const id = (m?.[1] ?? rawId.trim()).trim();
  // 显式匹配结尾版本号（贪婪前缀确保命中最后一个 vN）
  const vm = /^(.*)v(\d+)$/.exec(id);
  if (vm && vm[1]) {
    return { baseId: vm[1], version: Number(vm[2]) };
  }
  return { baseId: id, version: null };
}

/** 清理多余空白：合并连续空白为单空格并 trim。 */
export function cleanWhitespace(value: string | undefined | null): string | null {
  if (value === undefined || value === null) return null;
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned.length > 0 ? cleaned : null;
}

/** 提取文本元素：字符串直接取；带属性元素取 "#text"。 */
function extractText(value: unknown): string | null {
  if (typeof value === "string") return cleanWhitespace(value);
  if (value && typeof value === "object" && "#text" in value) {
    const t = (value as { "#text"?: unknown })["#text"];
    if (typeof t === "string") return cleanWhitespace(t);
  }
  return null;
}

/** 将单个 Atom entry 标准化为规范论文结构。 */
export function normalizeArxivEntry(entry: ArxivAtomEntry): NormalizedArxivPaper {
  const { baseId, version } = parseArxivId(entry.id ?? "");
  const sourceItemId = `arxiv:${baseId}`;
  const rawPayload = entry as unknown as Record<string, unknown>;

  // 作者（单作者时 fast-xml-parser 返回对象而非数组）
  const authors = asArray(entry.author)
    .map((a) => a.name?.trim())
    .filter((n): n is string => !!n);

  // 分类：primary 优先取 arxiv:primary_category，回退到第一个 category
  const categories = asArray(entry.category)
    .map((c) => c.term?.trim())
    .filter((t): t is string => !!t);
  const primary = entry["arxiv:primary_category"]?.term?.trim() ?? categories[0] ?? null;

  return {
    sourceItemId,
    dedupeKey: `${ARXIV_SOURCE}:${sourceItemId}`,
    itemType: "paper",
    title: cleanWhitespace(entry.title) ?? sourceItemId,
    canonicalUrl: `https://arxiv.org/abs/${baseId}`,
    // pdf_url 使用稳定 baseId（不带版本号），与 canonicalUrl / 去重语义一致
    pdfUrl: `https://arxiv.org/pdf/${baseId}`,
    description: cleanWhitespace(entry.summary),
    authors,
    primaryCategory: primary,
    categories,
    publishedAt: entry.published ?? null,
    updatedAt: entry.updated ?? null,
    version,
    comment: extractText(entry["arxiv:comment"]),
    journalReference: extractText(entry["arxiv:journal_ref"]),
    doi: extractText(entry["arxiv:doi"]),
    rawPayload,
    payloadHash: computePayloadHash(rawPayload),
  };
}
