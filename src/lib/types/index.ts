/**
 * Frontier Radar · 统一数据类型
 *
 * 与 supabase/migrations/0001_init.sql + 0002_phase1_1_adjustments.sql 一一对应。
 * 仅类型声明，不含任何运行时业务代码（阶段 0/1.1）。
 */

// ---------------------------------------------------------------------------
// 枚举与字面量类型
// ---------------------------------------------------------------------------

/** 已接入数据源 slug（阶段 1：3 个） */
export type SourceSlug = "github" | "huggingface" | "arxiv";

/** 条目类型 */
export type ItemType =
  | "repo"
  | "repo_readme"
  | "model"
  | "dataset"
  | "space"
  | "paper"
  | "tool"
  | "demo"
  | "product";

/** 采集运行状态 */
export type RunStatus = "running" | "success" | "partial" | "failed";

/** AI 分析状态 */
export type AnalysisStatus = "success" | "failed";

/** AI 分析类型 */
export type AnalysisType = "summary" | "deep" | "idea";

/** 灵感来源 */
export type IdeaOrigin = "user" | "ai_suggested" | "hybrid";

/** 灵感状态 */
export type IdeaStatus = "draft" | "exploring" | "archived" | "done";

/** 评分维度（七维） */
export type ScoreDimension =
  | "momentum"
  | "velocity"
  | "novelty"
  | "relevance"
  | "engagement"
  | "accessibility"
  | "quality";

// ---------------------------------------------------------------------------
// 数据库实体接口（对应表行）
// ---------------------------------------------------------------------------

/** sources */
export interface Source {
  id: string;
  slug: SourceSlug;
  name: string;
  description: string | null;
  base_url: string | null;
  docs_url: string | null;
  rate_limit_per_hour: number | null;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

/** collection_runs */
export interface CollectionRun {
  id: string;
  source_id: string;
  started_at: string;
  finished_at: string | null;
  status: RunStatus;
  items_fetched: number;
  items_new: number;
  items_updated: number;
  error_count: number;
  error_message: string | null;
  rate_limit_remaining: number | null;
  rate_limit_reset_at: string | null;
  metadata: Record<string, unknown>;
  /** 阶段 1.2 运行统计 */
  discovered_count: number;
  deduplicated_count: number;
  inserted_count: number;
  updated_count: number;
  unchanged_count: number;
  snapshot_count: number;
  request_count: number;
}

/** collector_state —— 采集器增量状态 */
export interface CollectorState {
  id: string;
  source_id: string;
  state_key: string;
  state_value: Record<string, unknown>;
  etag: string | null;
  last_modified: string | null;
  last_success_at: string | null;
  created_at: string;
  updated_at: string;
}

/** raw_items —— 原始不可变 payload */
export interface RawItem {
  id: string;
  source_id: string;
  source_item_id: string;
  item_type: ItemType;
  source_url: string;
  /** 原始 API 响应，结构因源而异，统一以 unknown 保存 */
  raw_payload: Record<string, unknown>;
  /** 原始 payload 指纹（用于判断是否变化） */
  payload_hash: string | null;
  fetched_at: string;
  collection_run_id: string | null;
}

/** items —— 归一化去重条目 */
export interface Item {
  id: string;
  source_id: string;
  source_item_id: string;
  dedupe_key: string;
  item_type: ItemType;
  title: string;
  summary: string | null;
  description: string | null;
  owner: string | null;
  full_name: string | null;
  language: string | null;
  license: string | null;
  homepage: string | null;
  source_url: string;
  external_url: string | null;
  topics: string[];
  has_code: boolean;
  has_demo: boolean;
  has_dataset: boolean;
  created_at_source: string | null;
  pushed_at_source: string | null;
  /** GitHub 仓库专属归一化字段（阶段 1.2） */
  owner_login: string | null;
  repository_name: string | null;
  default_branch: string | null;
  visibility: string | null;
  archived: boolean | null;
  fork: boolean | null;
  has_issues: boolean | null;
  has_discussions: boolean | null;
  has_wiki: boolean | null;
  has_pages: boolean | null;
  repository_size: number | null;
  first_seen_at: string;
  last_updated_at: string;
  latest_score: number | null;
  is_active: boolean;
}

/** item_metrics_snapshot —— 指标快照（每次采集运行独立一份） */
export interface ItemMetricsSnapshot {
  id: string;
  item_id: string;
  /** 关联的采集运行（阶段 1.2.1 新增） */
  collection_run_id: string | null;
  /** 业务日（Asia/Shanghai），ISO date (YYYY-MM-DD) — 保留用于聚合，不再作为唯一键 */
  snapshot_date: string;
  stars: number | null;
  forks: number | null;
  watchers: number | null;
  open_issues: number | null;
  subscribers: number | null;
  downloads: number | null;
  views: number | null;
  citations: number | null;
  likes: number | null;
  score_raw: number | null;
  raw_extra: Record<string, unknown>;
  /** 实际抓取时间戳 */
  captured_at: string;
  created_at: string;
}

/** 附属文档类型（item_documents.document_type） */
export type DocumentType =
  | "readme"
  | "model_card"
  | "dataset_card"
  | "space_readme"
  | "paper_abstract"
  | "documentation"
  | "release_notes";

/** item_documents —— 条目附属文档（README / model_card 等） */
export interface ItemDocument {
  id: string;
  item_id: string;
  document_type: DocumentType;
  source_url: string | null;
  source_revision: string | null;
  content_text: string | null;
  content_hash: string;
  etag: string | null;
  last_modified: string | null;
  original_size: number;
  stored_size: number;
  is_truncated: boolean;
  encoding: string;
  metadata: Record<string, unknown>;
  fetched_at: string;
  created_at: string;
  updated_at: string;
}

/** score_components —— 单维度评分拆解 */
export interface ScoreComponent {
  id: string;
  item_id: string;
  snapshot_date: string; // ISO date
  dimension: ScoreDimension;
  raw_value: number | null;
  normalized_score: number;
  weight: number;
  rationale: string | null;
  created_at: string;
}

/** tags */
export interface Tag {
  id: string;
  slug: string;
  name: string;
  category: string | null;
  created_at: string;
}

/** ai_analyses —— 结构化 AI 分析结果 */
export interface AiAnalysis {
  id: string;
  item_id: string;
  analysis_type: AnalysisType;
  /** AI Provider 标识（与业务解耦，见 src/lib/ai/provider.ts） */
  provider: string | null;
  model: string;
  prompt_version: string | null;
  /** 结构化输出契约版本 */
  schema_version: string | null;
  /** 输入指纹（用于命中缓存、避免重复分析） */
  input_hash: string | null;
  /** 必须符合 ItemAnalysisResult 契约 */
  result: ItemAnalysisResult;
  score_contribution: number | null;
  token_usage: number | null;
  estimated_cost: number | null;
  latency_ms: number | null;
  status: AnalysisStatus;
  error_message: string | null;
  created_at: string;
}

/** saved_items */
export interface SavedItem {
  id: string;
  item_id: string;
  note: string | null;
  folder: string | null;
  saved_at: string;
}

/** ideas */
export interface Idea {
  id: string;
  title: string;
  description: string | null;
  origin: IdeaOrigin;
  status: IdeaStatus;
  ai_result: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// AI 结构化输出契约（对应 PRD 七点解释）
// ---------------------------------------------------------------------------

/**
 * AI 分析输出契约（阶段 1.5 起定义于 src/lib/ai/types.ts）。
 * 所有 AI 分析必须输出此结构，字段一一对应 PRD 的分析要求。
 * 由 src/lib/ai/schema.ts 负责校验（schema_version = item-analysis-v1）。
 */
import type {
  AvailabilityStatus,
  ItemAnalysisResult,
  ReproductionDifficulty,
  RiskLevel,
} from "@/lib/ai/types";
export type {
  AvailabilityStatus,
  ItemAnalysisResult,
  ReproductionDifficulty,
  RiskLevel,
} from "@/lib/ai/types";

// ---------------------------------------------------------------------------
// 采集器接口契约
// ---------------------------------------------------------------------------

/** 单次采集结果（写入 collection_runs 的依据） */
export interface CollectorResult {
  source: SourceSlug;
  status: RunStatus;
  itemsFetched: number;
  itemsNew: number;
  itemsUpdated: number;
  errorCount: number;
  errors: string[];
  rateLimitRemaining?: number;
  rateLimitResetAt?: string; // ISO datetime
  durationMs?: number;
  /** 阶段 1.2 GitHub 采集器扩展统计 */
  discovered?: number;
  deduplicated?: number;
  inserted?: number;
  updated?: number;
  unchanged?: number;
  snapshots?: number;
  requests?: number;
}

/** 统一采集器接口（所有源必须实现） */
export interface Collector {
  readonly source: SourceSlug;
  collect(): Promise<CollectorResult>;
}

// ---------------------------------------------------------------------------
// 评分相关类型
// ---------------------------------------------------------------------------

/** 单维度计算中间结果 */
export interface DimensionScore {
  dimension: ScoreDimension;
  raw_value: number | null;
  normalized_score: number; // 0–100
  weight: number;
  rationale: string;
}

/** 评分维度权重配置 */
export type ScoreWeights = Record<ScoreDimension, number>;

/** 完整评分结果 */
export interface ScoreResult {
  item_id: string;
  snapshot_date: string;
  total: number; // 0–100，两位小数
  components: DimensionScore[];
  cold_start: boolean;
}

// ---------------------------------------------------------------------------
// 通用工具类型
// ---------------------------------------------------------------------------

/** 新建实体（去掉服务端生成的字段） */
export type New<T, K extends keyof T> = Omit<T, K>;

/** 分页请求 */
export interface PaginationParams {
  page: number; // 从 1 开始
  pageSize: number;
}

/** 分页响应 */
export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
