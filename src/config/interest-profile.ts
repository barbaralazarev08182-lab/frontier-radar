/**
 * Frontier Radar · 默认科技兴趣画像（个性化冷启动）。
 *
 * 作用：
 *  - 新用户还没有行为数据时，提供一个“科技项目发现”默认画像；
 *  - 后续 user_events / embedding / ranking model 会逐步覆盖这套静态先验；
 *  - 不把“AI 学术论文”默认等同于“用户最想看”。
 */

/** 兴趣领域 key */
export type InterestKey =
  | "ai_creative_projects"
  | "ai_integrations"
  | "ai_games"
  | "ai_ui_interaction"
  | "small_open_source"
  | "new_ai_capabilities"
  | "ai_agents"
  | "vibe_coding"
  | "developer_tools"
  | "multimodal"
  | "product_design"
  | "speech_audio"
  | "speaker_recognition"
  | "machine_learning"
  | "computer_vision"
  | "nlp_llm"
  | "education_ai"
  | "reinforcement_learning"
  | "mlops"
  | "quant_finance"
  | "general_tech_news";

/** 兴趣项定义：权重 + 用于命中的关键词（小写） */
export interface InterestEntry {
  weight: number;
  keywords: string[];
}

/**
 * 冷启动默认画像 v2：优先“AI 被做成了什么”，而不是“又出了一篇什么论文”。
 * 权重 0–1；真正个性化后由用户行为模型动态学习。
 */
export const INTEREST_PROFILE: Record<InterestKey, InterestEntry> = {
  ai_creative_projects: {
    weight: 1.0,
    keywords: [
      "creative ai",
      "ai tool",
      "generative design",
      "generative media",
      "3d generation",
      "image editor",
      "video generation",
      "music generation",
      "creative tool",
    ],
  },
  ai_integrations: {
    weight: 1.0,
    keywords: [
      "mcp",
      "model context protocol",
      "plugin",
      "extension",
      "integration",
      "connector",
      "blender",
      "figma",
      "vscode",
      "visual studio code",
      "browser",
      "chrome",
      "obsidian",
      "notion",
      "slack",
      "discord",
    ],
  },
  ai_games: {
    weight: 1.0,
    keywords: [
      "ai game",
      "game ai",
      "gameplay",
      "npc",
      "procedural generation",
      "generative game",
      "unity",
      "unreal",
      "godot",
    ],
  },
  ai_ui_interaction: {
    weight: 0.98,
    keywords: [
      "ai ui",
      "generative ui",
      "user interface",
      "interactive ai",
      "interaction",
      "canvas",
      "visual interface",
      "frontend",
      "web app",
    ],
  },
  small_open_source: {
    weight: 0.9,
    keywords: [
      "side project",
      "prototype",
      "demo",
      "open source",
      "experimental",
      "playground",
      "toy project",
      "weekend project",
    ],
  },
  new_ai_capabilities: {
    weight: 0.88,
    keywords: [
      "computer use",
      "tool use",
      "real-time",
      "realtime",
      "long context",
      "context window",
      "reasoning",
      "vision",
      "video",
      "3d",
      "multimodal",
    ],
  },
  ai_agents: {
    weight: 0.95,
    keywords: ["agent", "agentic", "tool use", "function calling", "autonomous", "workflow"],
  },
  vibe_coding: {
    weight: 0.95,
    keywords: ["vibe coding", "ai coding", "code assistant", "copilot", "cursor", "coding agent"],
  },
  developer_tools: {
    weight: 0.9,
    keywords: ["developer tools", "devtools", "cli", "sdk", "framework", "automation"],
  },
  multimodal: {
    weight: 0.82,
    keywords: ["multimodal", "vision-language", "vlm", "image-text", "audio-visual"],
  },
  product_design: {
    weight: 0.8,
    keywords: ["product design", "ux", "ui", "design system", "prototype", "interaction design"],
  },
  speech_audio: {
    weight: 0.55,
    keywords: ["speech", "asr", "tts", "voice", "audio"],
  },
  speaker_recognition: {
    weight: 0.45,
    keywords: ["speaker recognition", "speaker verification", "voiceprint", "声纹"],
  },
  machine_learning: {
    weight: 0.4,
    keywords: ["machine learning", "fine-tune", "finetune", "training method"],
  },
  computer_vision: {
    weight: 0.5,
    keywords: ["computer vision", "detection", "segmentation", "ocr"],
  },
  nlp_llm: {
    weight: 0.5,
    keywords: ["llm", "nlp", "transformer", "rag", "embedding"],
  },
  education_ai: {
    weight: 0.35,
    keywords: ["education", "tutor", "edtech", "教学"],
  },
  reinforcement_learning: {
    weight: 0.3,
    keywords: ["reinforcement learning", "rlhf", "policy gradient"],
  },
  mlops: {
    weight: 0.35,
    keywords: ["mlops", "inference serving", "model serving", "observability"],
  },
  quant_finance: {
    weight: 0.25,
    keywords: ["quant finance", "backtest", "factor investing", "algorithmic trading", "量化"],
  },
  general_tech_news: {
    weight: 0.3,
    keywords: ["release", "announce", "launch", "new feature"],
  },
};

/** 屏蔽词：后续可由用户“不感兴趣”行为自动学习补充。 */
export const INTEREST_BLOCKLIST: string[] = [];
