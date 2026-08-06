/**
 * HuggingFace Hub API 类型定义（阶段 1.3）。
 *
 * 基于 https://huggingface.co/api/models /datasets/spaces 实际响应。
 */
// ---------------------------------------------------------------------------
// Models
// ---------------------------------------------------------------------------

export interface HFModel {
  _id: string;
  id: string; // "owner/repo"
  modelId: string; // 同 id
  author: string | null;
  sha?: string | null;
  pipeline_tag?: string | null;
  library_name?: string | null;
  tags: string[];
  downloads: number;
  likes: number;
  private: boolean;
  gated: boolean;
  disabled?: boolean;
  lastModified?: string; // ISO date
  createdAt?: string;
  cardData?: Record<string, unknown> | null;
}

// ---------------------------------------------------------------------------
// Datasets
// ---------------------------------------------------------------------------

export interface HFDataset {
  _id: string;
  id: string; // "owner/dataset"
  author: string | null;
  sha?: string | null;
  tags: string[];
  downloads: number;
  likes: number;
  private: boolean;
  gated: boolean;
  disabled?: boolean;
  lastModified?: string;
  description?: string | null;
  createdAt?: string;
  cardData?: Record<string, unknown> | null;
}

// ---------------------------------------------------------------------------
// Spaces
// ---------------------------------------------------------------------------

export interface HFSpace {
  _id: string;
  id: string; // "owner/space"
  author?: string | null;
  sdk?: string | null;
  tags: string[];
  likes: number;
  private: boolean;
  disabled?: boolean;
  createdAt?: string;
  runtime_stage?: string | null;
  hardware?: Record<string, unknown> | null;
}

// ---------------------------------------------------------------------------
// Card / README 响应
// ---------------------------------------------------------------------------

export interface HFCardResponse {
  content: string; // Markdown 文本
  etag?: string;
  lastModified?: string;
  sha?: string;
  /** 实际用于获取 Card 的 revision（如 "main" 或提交 SHA） */
  revision?: string | null;
}

// ---------------------------------------------------------------------------
// 统一列表响应（API 返回数组）
// ---------------------------------------------------------------------------

export type HFModelList = HFModel[];
export type HFDatasetList = HFDataset[];
export type HFSpaceList = HFSpace[];

// ---------------------------------------------------------------------------
// 内容类型枚举
// ---------------------------------------------------------------------------

export type HFContentType = "model" | "dataset" | "space";

/** source_item_id 前缀映射 */
export const HF_TYPE_PREFIXES: Record<HFContentType, string> = {
  model: "model:",
  dataset: "dataset:",
  space: "space:",
};
