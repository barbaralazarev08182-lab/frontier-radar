/**
 * arXiv 论文发现配置（阶段 1.4）。
 *
 * 设计原则：
 *  - 每个查询组 = 1 次 API 请求，不按极小主题生成大量请求。
 *  - 优先使用分类（cat:）组合，关键词仅用于窄化同分类内的高密度主题。
 *  - 查询串在运行时由 buildArxivQuery() 拼接，不在采集器中写死。
 *  - arXiv 无日期过滤参数（API 层），发布时间窗口在 discover 层按
 *    ARXIV_DISCOVERY_DAYS 客户端过滤。
 */

export interface ArxivDiscoveryGroup {
  id: string;
  label: string;
  /** arXiv 分类，如 "cs.LG" / "eess.AS" / "q-fin" */
  categories: string[];
  /** 可选关键词：限定在 abs（摘要）字段，短语用引号 */
  keywords?: string[];
  enabled: boolean;
  /** 数字越大越优先执行 */
  priority: number;
}

export const ARXIV_DISCOVERY_GROUPS: ArxivDiscoveryGroup[] = [
  {
    id: "general-machine-learning",
    label: "机器学习 / 统计学习",
    categories: ["cs.LG", "stat.ML"],
    enabled: true,
    priority: 100,
  },
  {
    id: "llm-nlp",
    label: "LLM / NLP",
    categories: ["cs.CL"],
    enabled: true,
    priority: 98,
  },
  {
    id: "deep-learning",
    label: "深度学习",
    categories: ["cs.LG"],
    keywords: ["deep learning", "deep neural"],
    enabled: true,
    priority: 95,
  },
  {
    id: "robotics-agents",
    label: "机器人 / Agent",
    categories: ["cs.RO"],
    keywords: ["agent", "agentic"],
    enabled: true,
    priority: 94,
  },
  {
    id: "multimodal",
    label: "多模态",
    categories: ["cs.CV", "cs.CL"],
    keywords: ["multimodal", "multi-modal"],
    enabled: true,
    priority: 92,
  },
  {
    id: "computer-vision",
    label: "计算机视觉",
    categories: ["cs.CV"],
    enabled: true,
    priority: 90,
  },
  {
    id: "speech-audio",
    label: "语音 / 音频",
    categories: ["eess.AS", "cs.SD"],
    enabled: true,
    priority: 88,
  },
  {
    id: "speaker-recognition",
    label: "声纹识别",
    categories: ["eess.AS"],
    keywords: ["speaker recognition", "speaker verification", "speaker diarization"],
    enabled: true,
    priority: 86,
  },
  {
    id: "information-retrieval",
    label: "信息检索",
    categories: ["cs.IR"],
    enabled: true,
    priority: 85,
  },
  {
    id: "human-computer-interaction",
    label: "人机交互",
    categories: ["cs.HC"],
    enabled: true,
    priority: 82,
  },
  {
    id: "reinforcement-learning",
    label: "强化学习",
    categories: ["cs.LG"],
    keywords: ["reinforcement learning"],
    enabled: true,
    priority: 80,
  },
  {
    id: "education-ai",
    label: "教育 AI",
    categories: ["cs.AI"],
    keywords: ["education", "educational"],
    enabled: true,
    priority: 78,
  },
  {
    id: "quantitative-finance",
    label: "量化金融",
    // arXiv API 只接受叶子分类（q-fin 父类返回 0 结果），
    // 取与 ML 相关性最高的几个子分类
    categories: ["q-fin.CP", "q-fin.ST", "q-fin.TR", "q-fin.MF", "q-fin.RM"],
    enabled: true,
    priority: 75,
  },
];

/** 按 priority 降序返回启用组。 */
export function enabledArxivGroups(): ArxivDiscoveryGroup[] {
  return [...ARXIV_DISCOVERY_GROUPS]
    .filter((g) => g.enabled)
    .sort((a, b) => b.priority - a.priority);
}

/**
 * 拼接 arXiv search_query。
 * 无关键词："(cat:A OR cat:B)"；
 * 有关键词："(cat:A OR cat:B) AND (abs:"kw1" OR abs:kw2)"。
 */
export function buildArxivQuery(group: ArxivDiscoveryGroup): string {
  const catPart = `(${group.categories.map((c) => `cat:${c}`).join(" OR ")})`;
  if (!group.keywords || group.keywords.length === 0) return catPart;
  const kwPart = group.keywords
    .map((k) => (/\s/.test(k) ? `abs:"${k}"` : `abs:${k}`))
    .join(" OR ");
  return `${catPart} AND (${kwPart})`;
}
