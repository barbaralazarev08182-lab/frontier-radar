# Frontier Radar

**A personalized discovery engine for things being built at the frontier of technology.**

Frontier Radar 不是普通 AI 新闻聚合器，也不是简单的 GitHub 热榜。它每天从多个技术来源发现正在变得值得关注的项目、Demo、模型、论文和工具，再通过评分、个性化和跨来源证据筛出 **Today’s 7**，最后把这 7 条信号综合成更高层的趋势与方向。

核心产品链路：

```text
Discover → Understand → Get Inspired → Build
```

> **新协作者请先读：[`docs/START-HERE.md`](docs/START-HERE.md)**
>
> AI coding agent / Codex 还应阅读 [`AGENTS.md`](AGENTS.md)。

## 当前产品形态

### 数据发现

当前候选来源包括：

- GitHub
- Hugging Face（Spaces-first）
- Show HN
- Product Hunt
- arXiv

推荐不只看绝对热度，重点关注：

- Freshness
- Domain Relevance
- Momentum
- Project Health
- Novelty
- Idea Spark
- Tryability

Today 默认保持探索结构：

```text
5 × Core + 1 × Adjacent + 1 × Wildcard
```

### `/today`

当前 Today 正在从普通 Feed 演进成一个滚动驱动的 editorial / motion experience：

```text
Hero
  ↓ continuous
Compression
  ↓ one gesture
Today’s 7
  ↓ one gesture
Signal Weave
  ↓ continuous
```

其中：

- Adjacent 保留蓝色身份
- Wildcard 保留橙色身份
- Signal Weave 将 7 条 Daily Signals 综合成 3 个更高层 pattern

当前 Today 的主要视觉 / motion 实验整合分支是：

```text
proto/today-foil-candy-v4
```

`main` 仍作为仓库入口与相对稳定基线。开始修改前请先确认任务应该落在哪个分支。

## 技术栈

Next.js (App Router) · TypeScript (strict) · Tailwind CSS · shadcn/ui · Supabase PostgreSQL · Vercel · AI Provider 抽象层

## 环境要求

- Node.js ≥ 20
- npm
- 本仓库使用 `package-lock.json`

## 安装与启动

```bash
npm install
npm run dev
```

常用页面：

```text
http://localhost:3000/today
http://localhost:3000/qa/motion-lab
```

## 工程检查

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

Build / tests 通过不等于视觉通过。涉及 Today motion / UI 的改动必须尽量在真实浏览器验证。

## 环境变量

复制 `.env.example` 为 `.env.local` 并填写。

- 构建本身不应依赖真实密钥。
- Supabase / AI / 外部 API 在实际调用时校验对应变量。
- 仅 `NEXT_PUBLIC_*` 前缀变量可暴露给浏览器。
- service role、AI key、GitHub token 等真实 secret **禁止入库**。

## 主要命令

```bash
npm run dev
npm run build
npm run start
npm run typecheck
npm run lint
npm run test

npm run collect:github
npm run collect:github:dry
npm run collect:huggingface
npm run collect:huggingface:dry
npm run collect:arxiv
npm run collect:arxiv:dry
npm run analyze:items
```

具体可用脚本以 `package.json` 为准。

## 主要路由

| 路径 | 说明 |
| --- | --- |
| `/` | 重定向到 `/today` |
| `/today` | Daily Radar / Today’s 7 / Signal Weave |
| `/explore` | 历史发现浏览 |
| `/saved` | 收藏与笔记 |
| `/idea-lab` | 灵感工作区 |
| `/project/[id]` | Project Intelligence 详情 |
| `/qa/motion-lab` | Today motion / interaction QA |
| `/api/health` | 健康检查 |

## 目录概览

```text
frontier-radar/
├── docs/                     产品、数据、评分、风险、阶段和 handoff 文档
├── supabase/migrations/      数据库迁移
├── scripts/                  collector / doctor / analysis 脚本
└── src/
    ├── app/                  App Router 页面与 API
    ├── components/frontier/  Today / Motion Lab / Signal Weave 等前端核心
    ├── config/               兴趣画像 / discovery 配置
    └── lib/
        ├── collectors/       多来源采集器
        ├── scoring/          Discovery Score
        ├── feed/             Daily mix / ranking
        ├── ai/               AI analysis / daily synthesis
        ├── db/repositories/  数据访问层
        └── supabase/         Supabase client/server/admin
```

## 文档阅读顺序

第一次接触项目建议按这个顺序：

1. [`docs/START-HERE.md`](docs/START-HERE.md)
2. [`AGENTS.md`](AGENTS.md)（如果你是 coding agent 或使用 Codex）
3. [`docs/checkpoints/2026-08-08-frontier-radar-checkpoint.md`](docs/checkpoints/2026-08-08-frontier-radar-checkpoint.md)
4. `docs/DATA-SOURCES.md`
5. `docs/SCORING.md`
6. `docs/RISKS.md`

`docs/PRD.md` 和 `docs/PHASES.md` 是项目最早期规划，仍有历史价值，但**不代表 2026-08-10 的全部现状**。

## 协作原则

- 修改前先确认 branch / HEAD。
- 不把机器 PASS 当成视觉 PASS。
- 不用不断增加高 specificity / `!important` 掩盖 CSS 架构冲突。
- 不在视觉任务里顺手改推荐/数据逻辑。
- 不在滚动任务里顺手重做视觉。
- 不暴露 secret。
- 不 force push，除非仓库 owner 明确要求。
- 无法验证的部分要明确说明，不伪造验收结果。
