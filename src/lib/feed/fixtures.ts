/**
 * Feed 演示数据（阶段 1.6）。
 *
 * 用于 FRONTIER_DATA_MODE=fixture 的完整页面展示。
 * 覆盖：GitHub repo ×2、HF model ×2、HF dataset ×1、HF space ×1、arXiv paper ×4。
 *
 * 内容要求：无密钥、无私人数据、无虚假的精确性能数字、无虚构作者结论；
 * 链接使用明确演示命名空间的占位链接（example-org / frontier-demo）。
 * 所有条目标记 isFixture = true，页面显示"演示数据"。
 */

import type { FrontierFeedItem } from "./types";

export const DEMO_FIXTURE_FLAG = "demo-fixture";

export const FIXTURES: FrontierFeedItem[] = [
  // -------------------------------------------------------------------------
  // GitHub
  // -------------------------------------------------------------------------
  {
    id: "demo-github-1",
    source: "github",
    contentType: "repo",
    title: "agent-notes",
    canonicalUrl: "https://github.com/example-org/agent-notes",
    author: "example-org",
    description:
      "一个 AI Agent，自动阅读仓库 README、issue 与提交历史，生成结构化研究笔记与跟进清单。",
    publishedAt: "2026-08-01T08:00:00.000Z",
    updatedAt: "2026-08-05T12:00:00.000Z",
    score: 87,
    summaryZh: "把「读仓库」变成自动化的 AI 笔记 Agent，减少上手新项目的前期成本。",
    novelty: "把笔记组织与跟进闭环直接内建在 Agent 工作流里，而非只做摘要。",
    whyItMatters: "新项目上手与开源贡献者跟进是高频场景，自动化收益直接可见。",
    targetUsers: ["开源维护者", "技术调研者"],
    possibleUses: ["自动生成每日跟进清单", "批量评估候选依赖仓库"],
    hasCode: "yes",
    hasDemo: "no",
    reproductionDifficulty: "easy",
    tags: ["ai-agent", "llm", "developer-tools"],
    metrics: { stars: 12800, forks: 640 },
  },
  {
    id: "demo-github-2",
    source: "github",
    contentType: "repo",
    title: "quant-backtest-lite",
    canonicalUrl: "https://github.com/example-org/quant-backtest-lite",
    author: "example-org",
    description:
      "面向个人量化研究者的轻量因子回测框架：向量化计算、因子 IC 分析、可复现回测报告。",
    publishedAt: "2026-07-22T08:00:00.000Z",
    updatedAt: "2026-08-03T09:30:00.000Z",
    score: 74,
    summaryZh: "一个把因子回测与报告生成做进同一流程的轻量 Python 框架。",
    novelty: "把因子 IC / 换手分析等专业流程包装成几行 API，降低个人回测门槛。",
    whyItMatters: "量化入门通常卡在回测基建，轻量方案能显著缩短验证周期。",
    targetUsers: ["量化研究员", "金融工程学生"],
    possibleUses: ["快速验证交易想法", "教学演示"],
    hasCode: "yes",
    hasDemo: "no",
    reproductionDifficulty: "medium",
    tags: ["quant-finance", "backtest", "python"],
    metrics: { stars: 3420, forks: 480 },
  },

  // -------------------------------------------------------------------------
  // Hugging Face Models
  // -------------------------------------------------------------------------
  {
    id: "demo-hf-model-1",
    source: "huggingface",
    contentType: "model",
    title: "TinyAgentLM",
    canonicalUrl: "https://huggingface.co/frontier-demo/TinyAgentLM",
    author: "frontier-demo",
    description:
      "面向工具调用的小型指令微调模型，定位在个人设备上运行轻量 Agent 任务。",
    publishedAt: "2026-07-25T08:00:00.000Z",
    updatedAt: "2026-08-02T10:00:00.000Z",
    score: 81,
    summaryZh: "一个可以本地跑起来的小型工具调用模型，主打轻量与可私有化部署。",
    novelty: "针对函数调用任务做数据裁剪与训练配方，而非单纯缩小模型。",
    whyItMatters: "本地 Agent 应用对模型体积与延迟敏感，小型工具调用模型是补齐环节。",
    targetUsers: ["嵌入式 AI 开发者", "隐私敏感场景"],
    possibleUses: ["个人语音助手", "本地自动化脚本"],
    hasCode: "yes",
    hasDemo: "yes",
    reproductionDifficulty: "easy",
    tags: ["llm", "tool-use", "edge-ai"],
    metrics: { downloads: 158000, likes: 1200 },
  },
  {
    id: "demo-hf-model-2",
    source: "huggingface",
    contentType: "model",
    title: "Voiceprint-Small",
    canonicalUrl: "https://huggingface.co/frontier-demo/Voiceprint-Small",
    author: "frontier-demo",
    description:
      "轻量声纹识别（说话人验证）模型，面向门禁、日志角色分离等低成本场景。",
    publishedAt: "2026-07-18T08:00:00.000Z",
    updatedAt: "2026-07-30T14:00:00.000Z",
    score: 68,
    summaryZh: "一个把说话人验证压到几十 MB 量级的轻量声纹模型。",
    novelty: "用知识蒸馏把声纹模型压缩到适合边缘设备，同时保留验证流程完整。",
    whyItMatters: "声纹识别在隐私与成本敏感场景需求上升，轻量模型可落地更多设备。",
    targetUsers: ["安全产品团队", "音频工程师"],
    possibleUses: ["通话角色分离", "语音门禁原型"],
    hasCode: "yes",
    hasDemo: "no",
    reproductionDifficulty: "medium",
    tags: ["speaker-recognition", "audio", "edge-ai"],
    metrics: { downloads: 42500, likes: 380 },
  },

  // -------------------------------------------------------------------------
  // Hugging Face Dataset
  // -------------------------------------------------------------------------
  {
    id: "demo-hf-dataset-1",
    source: "huggingface",
    contentType: "dataset",
    title: "agent-tool-calls-zh",
    canonicalUrl: "https://huggingface.co/datasets/frontier-demo/agent-tool-calls-zh",
    author: "frontier-demo",
    description:
      "中文工具调用指令数据集：覆盖多轮对话中的函数调用、参数抽取与结果整理，用于微调中文 Agent 模型。",
    publishedAt: "2026-07-20T08:00:00.000Z",
    updatedAt: "2026-07-28T09:00:00.000Z",
    score: 63,
    summaryZh: "一个面向中文场景整理的工具调用训练数据集。",
    novelty: "把工具调用数据按中文表达习惯重写并补充多轮场景，弥补英文数据集缺口。",
    whyItMatters: "中文 Agent 微调长期受限于高质量数据，此类数据集直接降低入门门槛。",
    targetUsers: ["模型训练工程师", "Agent 研究者"],
    possibleUses: ["微调中文工具调用模型", "评估 Agent 数据质量"],
    hasCode: "no",
    hasDemo: "no",
    reproductionDifficulty: "easy",
    tags: ["dataset", "nlp", "agent"],
    metrics: { downloads: 8900, likes: 210 },
  },

  // -------------------------------------------------------------------------
  // Hugging Face Space
  // -------------------------------------------------------------------------
  {
    id: "demo-hf-space-1",
    source: "huggingface",
    contentType: "space",
    title: "voice-clone-studio",
    canonicalUrl: "https://huggingface.co/spaces/frontier-demo/voice-clone-studio",
    author: "frontier-demo",
    description:
      "上传一段短语音即可体验说话人音色克隆的在线 Demo Space，展示少量样本下的 TTS 音色迁移。",
    publishedAt: "2026-07-28T08:00:00.000Z",
    updatedAt: "2026-08-01T11:00:00.000Z",
    score: 70,
    summaryZh: "一个浏览器里就能试的音色克隆演示，几分钟完成体验闭环。",
    novelty: "把少样本音色克隆包装成即点即用的 Web 界面，降低评估成本。",
    whyItMatters: "语音合成方向更新快，可交互 Demo 是评估与交流的最短路径。",
    targetUsers: ["产品经理", "语音研究者", "内容创作者"],
    possibleUses: ["评估音色效果", "教学演示"],
    hasCode: "no",
    hasDemo: "yes",
    reproductionDifficulty: "easy",
    tags: ["tts", "audio", "demo"],
    metrics: { likes: 640 },
  },

  // -------------------------------------------------------------------------
  // arXiv
  // -------------------------------------------------------------------------
  {
    id: "demo-arxiv-1",
    source: "arxiv",
    contentType: "paper",
    title: "Multimodal Retrieval for Personalized Education",
    canonicalUrl: "https://arxiv.org/abs/2608.00001",
    author: "A. Zhang, B. Li, C. Wang",
    description:
      "提出面向个性化教育的多模态检索框架，用视频、文本与题目数据联合建模，改进学习推荐质量。",
    publishedAt: "2026-08-03T08:00:00.000Z",
    updatedAt: "2026-08-04T09:00:00.000Z",
    score: 79,
    summaryZh: "把多模态检索用于个性化教育场景，探索视频与文本联合的题目推荐。",
    novelty: "教育场景下的多模态联合建模，而非通用检索任务的直接迁移。",
    whyItMatters: "教育 AI 的产品化依赖内容与题目匹配质量，该方向有明确落地场景。",
    targetUsers: ["教育科技研究者", "推荐系统工程师"],
    possibleUses: ["课程内容推荐", "学习路径规划"],
    hasCode: "unknown",
    hasDemo: "no",
    reproductionDifficulty: "hard",
    tags: ["multimodal", "education-ai", "retrieval"],
    metrics: {},
  },
  {
    id: "demo-arxiv-2",
    source: "arxiv",
    contentType: "paper",
    title: "Skill Entropy: Measuring Skill Switching in Long-Horizon Reasoning",
    canonicalUrl: "https://arxiv.org/abs/2608.00002",
    author: "D. Kim, E. Park",
    description:
      "提出技能熵指标量化长链推理中模型在数学、规划、代码等技能间的切换模式，用于评测与训练配方分析。",
    publishedAt: "2026-08-02T08:00:00.000Z",
    updatedAt: "2026-08-02T08:00:00.000Z",
    score: 76,
    summaryZh: "一个描述模型推理时技能切换行为的新指标，帮助理解长链推理瓶颈。",
    novelty: "把「技能切换」定义为可测量信号，连接评测与训练数据配比分析。",
    whyItMatters: "长链推理是当前模型迭代主线，可解释的中间指标有评测价值。",
    targetUsers: ["LLM 研究者", "评测工程师"],
    possibleUses: ["评测长链推理", "分析训练数据配比"],
    hasCode: "unknown",
    hasDemo: "no",
    reproductionDifficulty: "medium",
    tags: ["llm", "reasoning", "evaluation"],
    metrics: {},
  },
  {
    id: "demo-arxiv-3",
    source: "arxiv",
    contentType: "paper",
    title: "Recovering Speaker Identity with Few-Second Reference Audio",
    canonicalUrl: "https://arxiv.org/abs/2608.00003",
    author: "F. Rossi, G. Moreau",
    description:
      "研究在仅数秒参考音频条件下恢复说话人身份的方法，面向实时语音助手与会议角色分离。",
    publishedAt: "2026-07-31T08:00:00.000Z",
    updatedAt: "2026-08-01T08:00:00.000Z",
    score: 65,
    summaryZh: "用几秒钟参考音频恢复说话人身份，推动声纹能力在实时场景落地。",
    novelty: "聚焦极短参考条件下的身份恢复，而非传统长注册样本设定。",
    whyItMatters: "实时交互场景对注册时长敏感，短参考声纹是实用化关键点。",
    targetUsers: ["语音研究者", "音频产品团队"],
    possibleUses: ["会议角色分离", "实时语音助手定制"],
    hasCode: "unknown",
    hasDemo: "no",
    reproductionDifficulty: "hard",
    tags: ["speaker-recognition", "speech", "audio"],
    metrics: {},
  },
  {
    id: "demo-arxiv-4",
    source: "arxiv",
    contentType: "paper",
    title: "The Loss Does Not See the Basis, but Adam Does",
    canonicalUrl: "https://arxiv.org/abs/2608.00004",
    author: "H. Schmidt",
    description:
      "分析低秩分解参数化下梯度下降与 Adam 在隐式偏置上的差异，解释分解训练中的优化行为。",
    publishedAt: "2026-07-30T08:00:00.000Z",
    updatedAt: "2026-07-30T08:00:00.000Z",
    score: 61,
    summaryZh: "一篇解释分解训练中优化器行为差异的理论性工作。",
    novelty: "把优化器隐式偏置与分解参数化联系起来，给出可验证的解释。",
    whyItMatters: "低秩分解是模型压缩常见手段，理解其优化行为有实用价值。",
    targetUsers: ["机器学习研究者", "训练框架开发者"],
    possibleUses: ["改进分解训练配方", "教学案例"],
    hasCode: "unknown",
    hasDemo: "no",
    reproductionDifficulty: "hard",
    tags: ["machine-learning", "optimization", "theory"],
    metrics: {},
  },
];
