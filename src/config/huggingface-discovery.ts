/**
 * HuggingFace Hub 发现配置（阶段 1.3）。
 *
 * 覆盖 AI/ML/开源/Vibe Coding/量化金融等兴趣方向。
 * 每个配置项对应一类查询参数，用于 Models / Datasets / Spaces 三种 API。
 */
export interface HFDiscoveryGroup {
  id: string;
  label: string;
  /** 搜索关键词或过滤标签 */
  search?: string;
  /** 标签过滤（HF API 的 filter 参数） */
  filters?: string[];
  /** 是否启用 */
  enabled: boolean;
  /** 优先级（数字越小越优先） */
  priority: number;
}

/**
 * 三种内容类型的发现组。
 *
 * key 是 "models" | "datasets" | "spaces"，
 * value 是该类型下的查询组列表（已按 priority 排序）。
 */
export const HF_DISCOVERY_GROUPS: Record<string, HFDiscoveryGroup[]> = {
  models: [
    { id: "m-agent", label: "AI Agent", search: "agent", filters: [], enabled: true, priority: 1 },
    { id: "m-llm", label: "LLM / Text Generation", search: "text-generation", filters: [], enabled: true, priority: 2 },
    { id: "m-ml", label: "General ML", search: "machine-learning", filters: [], enabled: true, priority: 3 },
    { id: "m-dl", label: "Deep Learning", search: "deep-learning", filters: [], enabled: true, priority: 4 },
    { id: "m-speech", label: "Speech / Audio", search: "automatic-speech-recognition", filters: [], enabled: true, priority: 5 },
    { id: "m-multimodal", label: "Multimodal", search: "multimodal", filters: [], enabled: true, priority: 6 },
    { id: "m-cv", label: "Computer Vision", search: "computer-vision", filters: [], enabled: true, priority: 7 },
    { id: "m-rl", label: "Reinforcement Learning", search: "reinforcement-learning", filters: [], enabled: true, priority: 8 },
    { id: "m-edu", label: "Education", search: "education", filters: [], enabled: true, priority: 9 },
    { id: "m-ts", label: "Time Series", search: "time-series", filters: [], enabled: true, priority: 10 },
    { id: "m-quant", label: "Quantitative Finance", search: "quantitative-finance", filters: [], enabled: true, priority: 11 },
    { id: "m-mlops", label: "MLOps", search: "mlops", filters: [], enabled: true, priority: 12 },
    { id: "m-inference", label: "Inference", search: "inference", filters: [], enabled: true, priority: 13 },
    { id: "m-embeddings", label: "Embeddings", search: "embeddings", filters: [], enabled: true, priority: 14 },
  ],

  datasets: [
    { id: "d-ml", label: "General ML Datasets", search: "machine-learning", filters: [], enabled: true, priority: 1 },
    { id: "d-nlp", label: "NLP Datasets", search: "text-generation", filters: ["modality:text"], enabled: true, priority: 2 },
    { id: "d-cv", label: "CV Datasets", search: "computer-vision", filters: ["modality:image"], enabled: true, priority: 3 },
    { id: "d-audio", label: "Audio Datasets", search: "audio", filters: ["modality:audio"], enabled: true, priority: 4 },
    { id: "d-code", label: "Code Datasets", search: "code", filters: [], enabled: true, priority: 5 },
    { id: "d-quant", label: "Quant Finance Datasets", search: "quantitative-finance", filters: [], enabled: true, priority: 6 },
    { id: "d-education", label: "Education Datasets", search: "education", filters: [], enabled: true, priority: 7 },
  ],

  spaces: [
    { id: "s-demo", label: "Demo Spaces", search: "", filters: [], enabled: true, priority: 1 },
    { id: "s-llm", label: "LLM Spaces", search: "llm", filters: [], enabled: true, priority: 2 },
    { id: "s-agent", label: "Agent Spaces", search: "agent", filters: [], enabled: true, priority: 3 },
    { id: "s-cv", label: "CV Spaces", search: "image-generation", filters: [], enabled: true, priority: 4 },
    { id: "s-audio", label: "Audio Spaces", search: "speech-recognition", filters: [], enabled: true, priority: 5 },
    { id: "s-gradio", label: "Gradio Spaces", search: "", filters: ["sdk:gradio"], enabled: true, priority: 6 },
  ],
};

/** 默认每类最大采集数量 */
export const DEFAULT_HF_LIMIT_PER_TYPE = 50;

/** 默认每类 enrichment 数量 */
export const DEFAULT_HF_ENRICH_LIMIT = 10;
