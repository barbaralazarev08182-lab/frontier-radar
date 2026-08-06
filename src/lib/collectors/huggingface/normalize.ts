/**
 * HuggingFace Hub 内容标准化（阶段 1.3）。
 *
 * 将 Models / Datasets / Spaces API 响应统一为内部规范结构。
 *
 * 关键约定：
 *  - source_item_id 必须包含类型前缀（model:/dataset:/space:），避免三类冲突。
 *  - 缺失字段使用真正的 null，禁止编造，禁止把 null/undefined 转为 "null"/"undefined" 字符串。
 *  - tags 小写、去重、去空。
 */
import type { SourceSlug } from "@/lib/types";
import { computePayloadHash } from "@/lib/hash";
import type {
  HFDataset,
  HFModel,
  HFSpace,
  HFContentType,
} from "@/lib/huggingface/types";
import { HF_TYPE_PREFIXES } from "@/lib/huggingface/types";

export const HF_SOURCE: SourceSlug = "huggingface";

// ---------------------------------------------------------------------------
// 统一标准化输出
// ---------------------------------------------------------------------------

export interface NormalizedHFItem {
  /** 含类型前缀的 source_item_id，如 "model:meta-llama/Llama-3-8B" */
  sourceItemId: string;
  /** 去重键：`${slug}:${sourceItemId}` */
  dedupeKey: string;
  /** 内容类型（对应 source_item_id 前缀） */
  contentType: HFContentType;
  itemType: string; // "model" | "dataset" | "space"
  /** 显示标题（repo id 的 name 部分，或 cardData 中的 title） */
  title: string;
  /** 规范 URL：https://huggingface.co/{type}/{owner/name} */
  canonicalUrl: string;
  description: string | null;
  /** 作者/组织名 */
  author: string | null;
  /** 最新提交 SHA（作为 Card 的 revision 来源） */
  sha: string | null;
  /** 完整 repo id：owner/name */
  fullName: string;
  /** 标签（已规范化） */
  tags: string[];
  /** 创建时间 */
  createdAt: string | null;
  /** 最后更新时间 */
  updatedAt: string | null;

  // ---- 指标字段 ----
  downloads: number | null;
  likes: number | null;

  // ---- 特有字段（按类型可能为 null）----
  pipelineTag: string | null; // 仅 model
  libraryName: string | null; // 仅 model
  sdk: string | null;          // 仅 space
  runtimeStage: string | null; // 仅 space，如 "running"
  hardware: Record<string, unknown> | null; // 仅 space
  private: boolean;
  gated: boolean;

  rawPayload: Record<string, unknown>;
  payloadHash: string;
}

// ---------------------------------------------------------------------------
// 工具函数
// ---------------------------------------------------------------------------

/**
 * 可空字符串标准化：null/undefined/空串/纯空白 → null；
 * 数字、布尔 → String()；对象/数组 → null（禁止盲目 String()）。
 */
export function nullableString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "string") {
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return null;
}

/** 可空对象标准化：null/undefined/非纯对象 → null；对象原样保留。 */
export function nullableRecord(value: unknown): Record<string, unknown> | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

/** 规范化 tags：小写、trim、去重、去空；非字符串元素直接丢弃（禁止 String(null)→"null"）。 */
export function normalizeHFTags(tags: string[] | undefined): string[] {
  if (!Array.isArray(tags)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tags) {
    if (typeof t !== "string") continue;
    const norm = t.trim().toLowerCase();
    if (!norm) continue;
    if (seen.has(norm)) continue;
    seen.add(norm);
    out.push(norm);
  }
  return out;
}

/** 从 "owner/name" 提取标题（name 部分）。 */
function extractTitle(id: string): string {
  const parts = id.split("/");
  return parts.length > 1 ? (parts[parts.length - 1] ?? id) : id;
}

function buildSourceId(contentType: HFContentType, repoId: string): string {
  return `${HF_TYPE_PREFIXES[contentType]}${repoId}`;
}

// ---------------------------------------------------------------------------
// Model 标准化
// ---------------------------------------------------------------------------

export function normalizeModel(model: HFModel): NormalizedHFItem {
  const rawPayload = model as unknown as Record<string, unknown>;
  const sourceItemId = buildSourceId("model", model.id);
  return {
    sourceItemId,
    dedupeKey: `${HF_SOURCE}:${sourceItemId}`,
    contentType: "model",
    itemType: "model",
    title: extractTitle(model.id),
    canonicalUrl: `https://huggingface.co/${model.id}`,
    description: null, // Models API 通常不返回 description 字段（在 Card 中）
    author: nullableString(model.author),
    sha: nullableString(model.sha),
    fullName: model.id,
    tags: normalizeHFTags(model.tags),
    createdAt: model.createdAt ?? null,
    updatedAt: model.lastModified ?? null,

    downloads: model.downloads ?? null,
    likes: model.likes ?? null,

    pipelineTag: nullableString(model.pipeline_tag),
    libraryName: nullableString(model.library_name),
    sdk: null,
    runtimeStage: null,
    hardware: null,
    private: model.private ?? false,
    gated: model.gated ?? false,

    rawPayload,
    payloadHash: computePayloadHash(rawPayload),
  };
}

// ---------------------------------------------------------------------------
// Dataset 标准化
// ---------------------------------------------------------------------------

export function normalizeDataset(dataset: HFDataset): NormalizedHFItem {
  const rawPayload = dataset as unknown as Record<string, unknown>;
  const sourceItemId = buildSourceId("dataset", dataset.id);
  return {
    sourceItemId,
    dedupeKey: `${HF_SOURCE}:${sourceItemId}`,
    contentType: "dataset",
    itemType: "dataset",
    title: extractTitle(dataset.id),
    canonicalUrl: `https://huggingface.co/datasets/${dataset.id}`,
    description: nullableString(dataset.description)?.replace(/\s+/g, " ").slice(0, 2000) ?? null,
    author: nullableString(dataset.author),
    sha: nullableString(dataset.sha),
    fullName: dataset.id,
    tags: normalizeHFTags(dataset.tags),
    createdAt: dataset.createdAt ?? null,
    updatedAt: dataset.lastModified ?? null,

    downloads: dataset.downloads ?? null,
    likes: dataset.likes ?? null,

    pipelineTag: null,
    libraryName: null,
    sdk: null,
    runtimeStage: null,
    hardware: null,
    private: dataset.private ?? false,
    gated: dataset.gated ?? false,

    rawPayload,
    payloadHash: computePayloadHash(rawPayload),
  };
}

// ---------------------------------------------------------------------------
// Space 标准化
// ---------------------------------------------------------------------------

export function normalizeSpace(space: HFSpace): NormalizedHFItem {
  const rawPayload = space as unknown as Record<string, unknown>;
  const sourceItemId = buildSourceId("space", space.id);
  return {
    sourceItemId,
    dedupeKey: `${HF_SOURCE}:${sourceItemId}`,
    contentType: "space",
    itemType: "space",
    title: extractTitle(space.id),
    canonicalUrl: `https://huggingface.co/spaces/${space.id}`,
    description: null, // Spaces API 不返回 description
    author: nullableString(space.author),
    sha: null, // Spaces API 不返回 sha
    fullName: space.id,
    tags: normalizeHFTags(space.tags),
    createdAt: space.createdAt ?? null,
    updatedAt: null, // Spaces 无 lastModified

    downloads: null, // Spaces 无 downloads
    likes: space.likes ?? null,

    pipelineTag: null,
    libraryName: null,
    sdk: nullableString(space.sdk),
    runtimeStage: nullableString(space.runtime_stage),
    hardware: nullableRecord(space.hardware),
    private: space.private ?? false,
    gated: false,

    rawPayload,
    payloadHash: computePayloadHash(rawPayload),
  };
}

// ---------------------------------------------------------------------------
// 统一入口
// ---------------------------------------------------------------------------

export function normalizeHFItem(
  contentType: HFContentType,
  raw: HFModel | HFDataset | HFSpace
): NormalizedHFItem {
  switch (contentType) {
    case "model":
      return normalizeModel(raw as HFModel);
    case "dataset":
      return normalizeDataset(raw as HFDataset);
    case "space":
      return normalizeSpace(raw as HFSpace);
  }
}
