/**
 * AI 分析统一类型（阶段 1.5）。
 *
 * ItemAnalysisResult 是 AI 结构化输出的契约（schema_version = item-analysis-v1），
 * 与 ai_analyses.result 对应。所有字段在写入前必须通过 schema.ts 校验。
 */

/** 复现难度 */
export type ReproductionDifficulty = "easy" | "medium" | "hard" | "unknown";

/** 是否有代码 / Demo（AI 评估，不确定时 unknown，不编造） */
export type AvailabilityStatus = "yes" | "no" | "unknown";

/** 炒作 / 风险等级 */
export type RiskLevel = "low" | "medium" | "high" | "unknown";

/** 单条内容的结构化中文分析（阶段 1.5 契约） */
export interface ItemAnalysisResult {
  /** 1. 一句话中文摘要 */
  summaryZh: string;
  /** 2. 它解决的问题 */
  problem: string;
  /** 3. 真正的新内容 */
  novelty: string;
  /** 4. 为什么值得关注 */
  whyItMatters: string;
  /** 5. 适合哪些人 */
  targetUsers: string[];
  /** 6. 可以基于它做什么 */
  possibleUses: string[];
  /** 是否有代码 */
  hasCode: AvailabilityStatus;
  /** 是否有 Demo */
  hasDemo: AvailabilityStatus;
  /** 复现难度 */
  reproductionDifficulty: ReproductionDifficulty;
  /** 风险、限制或炒作可能 */
  limitations: string[];
  /** 炒作风险等级 */
  hypeRisk: RiskLevel;
  /** 相关性标签（小写、去重） */
  tags: string[];
  /** 新颖性 0–100 */
  noveltyScore: number;
  /** 实用价值 0–100 */
  practicalValueScore: number;
  /** 研究价值 0–100 */
  researchValueScore: number;
  /** 置信度 0–1 */
  confidence: number;
}

// ---------------------------------------------------------------------------
// 模型输入准备
// ---------------------------------------------------------------------------

/** 分析候选条目（items 行 + source slug，供输入准备使用） */
export interface AnalysisItemRow {
  id: string;
  source_slug: string;
  source_item_id: string;
  item_type: string;
  title: string;
  description: string | null;
  owner: string | null;
  full_name: string | null;
  language: string | null;
  license: string | null;
  source_url: string;
  topics: string[];
  created_at_source: string | null;
  pushed_at_source: string | null;
  first_seen_at: string;
  last_updated_at: string;
}

/** 条目附属文档（用于输入准备） */
export interface AnalysisDocument {
  document_type: string;
  content_text: string | null;
  source_revision: string | null;
}

/** 最新指标快照（GitHub / HF 用于输入与评分） */
export interface AnalysisSnapshot {
  stars: number | null;
  forks: number | null;
  downloads: number | null;
  likes: number | null;
}

/** 准备完成的模型输入（已截断、已放入数据边界前的纯文本） */
export interface PreparedAnalysisInput {
  source: string;
  itemType: string;
  title: string;
  sourceUrl: string;
  /** 已按 AI_MAX_INPUT_CHARS 截断的文本（仅含元数据 + 内容前段） */
  text: string;
  charCount: number;
  inputHash: string;
  truncated: boolean;
}

// ---------------------------------------------------------------------------
// TokenHub / Chat Completions
// ---------------------------------------------------------------------------

/** Chat 消息 */
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** Token 用量（来自 API usage 字段） */
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/** Chat Completions 成功响应（已提取） */
export interface ChatCompletionResult {
  content: string;
  model: string;
  tokenUsage: TokenUsage | null;
}
