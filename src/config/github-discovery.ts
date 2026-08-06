/**
 * GitHub 仓库发现配置（阶段 1.2）。
 *
 * 设计原则：
 *  - 查询词集中在此文件，采集器实现不写死查询。
 *  - 每个查询模板使用 {since} 占位符，由采集器在运行时替换为明确时间窗口
 *    （默认最近 GITHUB_DISCOVERY_DAYS 天），保证发现结果可复现、可审计。
 *  - 不依赖 GitHub Trending（不抓取/解析其 HTML），仅使用官方 REST 搜索接口。
 *  - 不用单一宽泛查询抓全部 AI 项目；按领域拆组，每组独立优先级。
 *
 * 注意：模板不含 archived:false / fork:false，由采集器在拼接最终查询时统一追加，
 * 以保证各查询行为一致且不易遗漏。
 */

export interface DiscoveryGroup {
  id: string;
  label: string;
  /** 查询模板，{since} 在运行时被 YYYY-MM-DD 替换 */
  queries: string[];
  enabled: boolean;
  /** 数值越大越优先执行（用于预算分配） */
  priority: number;
}

export const DISCOVERY_GROUPS: DiscoveryGroup[] = [
  {
    id: "ai-agent",
    label: "AI Agent",
    priority: 100,
    enabled: true,
    queries: [
      "topic:ai-agent created:>{since}",
      "topic:ai-agents created:>{since}",
      '"ai agent" in:name,description,readme created:>{since}',
    ],
  },
  {
    id: "agent-skills",
    label: "Agent Skills",
    priority: 98,
    enabled: true,
    queries: [
      "topic:agent-skills created:>{since}",
      '"agent skills" in:name,description created:>{since}',
    ],
  },
  {
    id: "mcp",
    label: "MCP",
    priority: 97,
    enabled: true,
    queries: [
      "topic:mcp created:>{since}",
      "topic:model-context-protocol created:>{since}",
      '"model context protocol" in:name,description created:>{since}',
    ],
  },
  {
    id: "machine-learning",
    label: "Machine Learning",
    priority: 90,
    enabled: true,
    queries: [
      "topic:machine-learning created:>{since}",
      "topic:ml created:>{since}",
    ],
  },
  {
    id: "deep-learning",
    label: "Deep Learning",
    priority: 88,
    enabled: true,
    queries: [
      "topic:deep-learning created:>{since}",
      '"deep learning" in:name,description stars:>10 created:>{since}',
    ],
  },
  {
    id: "llm-nlp",
    label: "LLM / NLP",
    priority: 95,
    enabled: true,
    queries: [
      "topic:llm created:>{since}",
      "topic:large-language-models created:>{since}",
      "topic:nlp created:>{since}",
    ],
  },
  {
    id: "computer-vision",
    label: "Computer Vision",
    priority: 82,
    enabled: true,
    queries: [
      "topic:computer-vision created:>{since}",
      "topic:cv created:>{since}",
    ],
  },
  {
    id: "speech-audio",
    label: "Speech / Audio",
    priority: 85,
    enabled: true,
    queries: [
      "topic:speech-recognition created:>{since}",
      "topic:audio created:>{since}",
    ],
  },
  {
    id: "speaker-recognition",
    label: "Speaker Recognition",
    priority: 86,
    enabled: true,
    queries: [
      "topic:speaker-recognition created:>{since}",
      '"speaker recognition" in:name,description created:>{since}',
    ],
  },
  {
    id: "multimodal",
    label: "Multimodal",
    priority: 92,
    enabled: true,
    queries: [
      "topic:multimodal created:>{since}",
      "topic:multimodal-learning created:>{since}",
    ],
  },
  {
    id: "reinforcement-learning",
    label: "Reinforcement Learning",
    priority: 80,
    enabled: true,
    queries: [
      "topic:reinforcement-learning created:>{since}",
      "topic:rl created:>{since}",
    ],
  },
  {
    id: "education-ai",
    label: "Education AI",
    priority: 78,
    enabled: true,
    queries: [
      "topic:education created:>{since}",
      '"education ai" in:name,description created:>{since}',
    ],
  },
  {
    id: "developer-tools",
    label: "Developer Tools",
    priority: 84,
    enabled: true,
    queries: [
      "topic:developer-tools created:>{since}",
      '"developer tool" in:name,description created:>{since}',
    ],
  },
  {
    id: "vibe-coding",
    label: "Vibe Coding",
    priority: 96,
    enabled: true,
    queries: [
      '"vibe coding" in:name,description,readme created:>{since}',
      "topic:ai-coding created:>{since}",
    ],
  },
  {
    id: "quant-finance",
    label: "Quantitative Finance",
    priority: 76,
    enabled: true,
    queries: [
      "topic:quantitative-finance created:>{since}",
      "topic:quant created:>{since}",
      '"quant finance" in:name,description created:>{since}',
    ],
  },
  {
    id: "mlops",
    label: "MLOps",
    priority: 74,
    enabled: true,
    queries: [
      "topic:mlops created:>{since}",
      "topic:ml-ops created:>{since}",
    ],
  },
  {
    id: "model-inference",
    label: "Model Inference",
    priority: 83,
    enabled: true,
    queries: [
      "topic:inference created:>{since}",
      "topic:model-inference created:>{since}",
    ],
  },
  {
    id: "ai-product-ui",
    label: "AI Product / UI",
    priority: 81,
    enabled: true,
    queries: [
      '"ai product" in:name,description created:>{since}',
      '"ai ui" in:name,description created:>{since}',
    ],
  },
];

/** 计算时间窗口起点（YYYY-MM-DD），默认按 discoveryDays 天回溯。 */
export function computeSinceDate(
  discoveryDays: number,
  now: Date = new Date()
): string {
  const d = new Date(now);
  d.setUTCDate(d.getUTCDate() - Math.max(1, Math.floor(discoveryDays)));
  return d.toISOString().slice(0, 10);
}

/** 将查询模板中的 {since} 替换为时间窗口起点。 */
export function renderQuery(template: string, since: string): string {
  return template.replace(/\{since\}/g, since);
}

/** 仅返回启用的查询组，按优先级降序。 */
export function enabledGroups(): DiscoveryGroup[] {
  return DISCOVERY_GROUPS.filter((g) => g.enabled).sort(
    (a, b) => b.priority - a.priority
  );
}
