/**
 * GitHub 仓库发现配置（科技项目发现 v2）。
 *
 * 目标从“按学科找 AI 仓库”调整为“发现 AI 被做成了什么新东西”：
 * UI / 游戏 / 软件联动 / Agent / MCP / 3D / 创意工具 / 开发者工具优先。
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
    id: "ai-integrations",
    label: "AI × Software Integrations",
    priority: 120,
    enabled: true,
    queries: [
      'ai integration in:name,description,readme created:>{since}',
      'ai plugin in:name,description,readme created:>{since}',
      'ai extension in:name,description,readme created:>{since}',
    ],
  },
  {
    id: "ai-creative-tools",
    label: "Creative AI Tools",
    priority: 118,
    enabled: true,
    queries: [
      '"ai tool" in:name,description,readme created:>{since}',
      '"creative ai" in:name,description,readme created:>{since}',
      '"generative design" in:name,description,readme created:>{since}',
    ],
  },
  {
    id: "ai-games",
    label: "AI Games / Playable Experiments",
    priority: 116,
    enabled: true,
    queries: [
      'ai game in:name,description,readme created:>{since}',
      'generative game in:name,description,readme created:>{since}',
      'ai npc in:name,description,readme created:>{since}',
    ],
  },
  {
    id: "ai-ui",
    label: "AI UI / New Interaction",
    priority: 114,
    enabled: true,
    queries: [
      '"generative ui" in:name,description,readme created:>{since}',
      '"ai ui" in:name,description,readme created:>{since}',
      '"interactive ai" in:name,description,readme created:>{since}',
    ],
  },
  {
    id: "mcp",
    label: "MCP / Tool Connections",
    priority: 112,
    enabled: true,
    queries: [
      "topic:mcp created:>{since}",
      "topic:model-context-protocol created:>{since}",
      '"model context protocol" in:name,description created:>{since}',
    ],
  },
  {
    id: "browser-desktop-agents",
    label: "Browser / Desktop Agents",
    priority: 110,
    enabled: true,
    queries: [
      '"browser agent" in:name,description,readme created:>{since}',
      '"computer use" in:name,description,readme created:>{since}',
      '"desktop agent" in:name,description,readme created:>{since}',
    ],
  },
  {
    id: "ai-coding",
    label: "AI Coding / Vibe Coding",
    priority: 108,
    enabled: true,
    queries: [
      '"ai coding" in:name,description,readme created:>{since}',
      '"coding agent" in:name,description,readme created:>{since}',
      '"vibe coding" in:name,description,readme created:>{since}',
    ],
  },
  {
    id: "ai-agent",
    label: "AI Agent",
    priority: 106,
    enabled: true,
    queries: [
      "topic:ai-agent created:>{since}",
      '"ai agent" in:name,description,readme created:>{since}',
      "topic:ai-agents created:>{since}",
    ],
  },
  {
    id: "ai-3d",
    label: "AI × 3D / Blender / Game Engines",
    priority: 104,
    enabled: true,
    queries: [
      'ai 3d in:name,description,readme created:>{since}',
      'ai blender in:name,description,readme created:>{since}',
      'ai unity unreal godot in:name,description created:>{since}',
    ],
  },
  {
    id: "multimodal-apps",
    label: "Multimodal Apps",
    priority: 102,
    enabled: true,
    queries: [
      'multimodal app in:name,description,readme created:>{since}',
      'vision agent in:name,description,readme created:>{since}',
      'video ai in:name,description,readme created:>{since}',
    ],
  },
  {
    id: "ai-audio-creative",
    label: "AI Audio / Music / Voice Tools",
    priority: 100,
    enabled: true,
    queries: [
      'ai audio tool in:name,description,readme created:>{since}',
      'ai music in:name,description,readme created:>{since}',
      'voice ai tool in:name,description,readme created:>{since}',
    ],
  },
  {
    id: "developer-tools",
    label: "Developer Tools",
    priority: 98,
    enabled: true,
    queries: [
      'ai developer tool in:name,description,readme created:>{since}',
      "topic:developer-tools created:>{since}",
      '"developer tool" in:name,description created:>{since}',
    ],
  },
  {
    id: "small-ai-projects",
    label: "Small / Experimental AI Projects",
    priority: 96,
    enabled: true,
    queries: [
      'ai prototype in:name,description,readme created:>{since} stars:<500',
      'ai demo in:name,description,readme created:>{since} stars:<500',
      'ai playground in:name,description,readme created:>{since} stars:<500',
    ],
  },
  {
    id: "new-ai-capabilities",
    label: "New AI Capabilities",
    priority: 92,
    enabled: true,
    queries: [
      '"computer use" in:name,description created:>{since}',
      '"tool use" in:name,description created:>{since}',
      '"real-time" ai in:name,description created:>{since}',
    ],
  },

  // 以下传统学科组仍保留配置，暂不进入生产 GitHub 轮换；
  // 对应内容主要由 Hugging Face / arXiv 覆盖。
  {
    id: "llm-nlp",
    label: "LLM / NLP",
    priority: 60,
    enabled: false,
    queries: ["topic:llm created:>{since}", "topic:nlp created:>{since}"],
  },
  {
    id: "machine-learning",
    label: "Machine Learning",
    priority: 50,
    enabled: false,
    queries: ["topic:machine-learning created:>{since}", "topic:ml created:>{since}"],
  },
  {
    id: "computer-vision",
    label: "Computer Vision",
    priority: 48,
    enabled: false,
    queries: ["topic:computer-vision created:>{since}", "topic:cv created:>{since}"],
  },
  {
    id: "speaker-recognition",
    label: "Speaker Recognition",
    priority: 46,
    enabled: false,
    queries: ["topic:speaker-recognition created:>{since}"],
  },
  {
    id: "reinforcement-learning",
    label: "Reinforcement Learning",
    priority: 44,
    enabled: false,
    queries: ["topic:reinforcement-learning created:>{since}"],
  },
  {
    id: "education-ai",
    label: "Education AI",
    priority: 42,
    enabled: false,
    queries: ['"education ai" in:name,description created:>{since}'],
  },
  {
    id: "mlops",
    label: "MLOps",
    priority: 40,
    enabled: false,
    queries: ["topic:mlops created:>{since}"],
  },
  {
    id: "quant-finance",
    label: "Quantitative Finance",
    priority: 38,
    enabled: false,
    queries: ["topic:quantitative-finance created:>{since}"],
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
