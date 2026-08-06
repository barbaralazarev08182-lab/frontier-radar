/**
 * Frontier Radar · 初始兴趣画像
 *
 * 独立、可修改的配置文件，禁止写死在组件中。
 * 用于评分模型 relevance 维度（见 docs/SCORING.md 第 6 节）。
 * 权重 0–1，越高越相关；命中屏蔽词的条目不进入 Today（屏蔽词后续补充）。
 */

/** 兴趣领域 key */
export type InterestKey =
  | "ai_agents"
  | "machine_learning"
  | "speech_audio"
  | "speaker_recognition"
  | "multimodal"
  | "education_ai"
  | "vibe_coding"
  | "developer_tools"
  | "quant_finance"
  | "product_design"
  | "computer_vision"
  | "nlp_llm"
  | "reinforcement_learning"
  | "mlops"
  | "general_tech_news";

/** 兴趣项定义：权重 + 用于命中的关键词（小写） */
export interface InterestEntry {
  weight: number;
  keywords: string[];
}

/** 默认兴趣画像（用户确认权重，2026-08-05） */
export const INTEREST_PROFILE: Record<InterestKey, InterestEntry> = {
  ai_agents: {
    weight: 1.0,
    keywords: ["agent", "agentic", "tool use", "function calling", "autonomous"],
  },
  machine_learning: {
    weight: 1.0,
    keywords: ["machine learning", "ml", "training", "fine-tune", "finetune"],
  },
  speech_audio: {
    weight: 1.0,
    keywords: ["speech", "asr", "tts", "voice", "audio"],
  },
  speaker_recognition: {
    weight: 1.0,
    keywords: ["speaker recognition", "speaker verification", "voiceprint", "声纹"],
  },
  multimodal: {
    weight: 0.95,
    keywords: ["multimodal", "vision-language", "vlm", "image-text"],
  },
  education_ai: {
    weight: 0.95,
    keywords: ["education", "tutor", "learning", "edtech", "教学"],
  },
  vibe_coding: {
    weight: 0.9,
    keywords: ["vibe coding", "ai coding", "code assistant", "copilot", "cursor"],
  },
  developer_tools: {
    weight: 0.9,
    keywords: ["developer tools", "devtools", "cli", "sdk", "framework"],
  },
  quant_finance: {
    weight: 0.8,
    keywords: ["quant", "finance", "trading", "backtest", "factor", "量化"],
  },
  product_design: {
    weight: 0.8,
    keywords: ["product design", "ux", "ui", "design system", "prototype"],
  },
  computer_vision: {
    weight: 0.8,
    keywords: ["computer vision", "cv", "detection", "segmentation", "ocr"],
  },
  nlp_llm: {
    weight: 0.85,
    keywords: ["llm", "nlp", "transformer", "rag", "embedding"],
  },
  reinforcement_learning: {
    weight: 0.75,
    keywords: ["reinforcement learning", "rl", "rlhf", "policy gradient"],
  },
  mlops: {
    weight: 0.7,
    keywords: ["mlops", "inference", "serving", "pipeline", "observability"],
  },
  general_tech_news: {
    weight: 0.4,
    keywords: ["news", "release", "announce", "launch"],
  },
};

/** 屏蔽词：命中即排除出 Today（阶段 1 暂为空，后续补充） */
export const INTEREST_BLOCKLIST: string[] = [];
