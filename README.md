# Frontier Radar

**A personalized discovery engine for things being built at the frontier of technology.**

Frontier Radar 不是普通 AI 新闻聚合器，也不是简单的 GitHub 热榜。它每天从多个技术来源发现正在变得值得关注的项目、Demo、模型、论文和工具，再通过评分、个性化和跨来源证据筛出 **Today’s 7**，最后把这 7 条信号综合成更高层的趋势与方向。

核心产品链路：

```text
Discover → Understand → Get Inspired → Build
```

> **新协作者请先读：[`docs/START-HERE.md`](docs/START-HERE.md)**
>
> 里面包含当前分支、Today 滚动状态机、LAB-03–06 视觉基线、Signal Weave、已废弃实验层、已知问题和协作规则。

---

## 当前产品形态

### 数据发现

当前候选来源：

- GitHub
- Hugging Face（Spaces-first）
- Show HN
- Product Hunt（公开 Atom Feed）
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

这是为了避免个性化越学越窄。

### Today

当前 `/today` 是滚动驱动的 editorial / motion experience，而不是普通卡片 Feed：

```text
Hero                 continuous scroll
  ↓
Compression          locked stage
  ↓ one gesture
Today’s 7            locked stage
  ↓ one gesture
Signal Weave         continuous internal scroll
```

- `06 / Adjacent` 保留蓝色身份。
- `07 / Wildcard` 保留橙色身份。
- 当前 production 视觉以原始 **LAB-03–06** 为基线。
- 之前试验的 foil / spectral / standalone compression artifact 已退出 production 渲染链，不应重新叠加。

### Signal Weave

Today’s 7 之后不是普通 dashboard，而是一个关系分析场景：7 条信号通过 ribbon/thread 形成 3 个更高层的 pattern，并在同一场景中收束到 Final Take。

---

## 当前工作分支

Today 当前主要整合分支：

```text
proto/today-foil-candy-v4
```

几个重要代码基线：

- `c634cd47fc00ea10fad586f6660e3194badf072f`
  - 清理 foil/spectral/compression artifact 对 production 的覆盖
  - 恢复 LAB-06 蓝/橙视觉
- `e2e036825b2dd0a555cde7d83c180fa5c4d86069`
  - 中间章节 gesture-based scroll state machine
- `d28960ea8a2fa9b478495a15a8399d526edd3f54`
  - 空提交，仅用于重新触发 Vercel Preview

后续 docs-only commit 不代表产品行为变化；判断功能状态请看实际 code diff。

---

## 已知问题

当前真实 production 环境里，Signal Weave 最后一面存在一个待确认的进入问题：Daily Synthesis `snapshot` 如果没有成功取得，Weave 的挂载与 `canEnterWeave` 会一起被 gate 掉；本地同时出现过 Supabase 查询错误。

暂时不要通过伪造 snapshot、强制 `canEnterWeave=true` 或改 Signal Weave 视觉来掩盖这个问题。详见 `docs/START-HERE.md`。

另外，Vercel Hobby + private repository 在 collaborator commit author 场景可能直接显示 `Deployment Blocked`。这种情况是部署权限/身份问题，不等于 Next.js build failure。

---

## 技术栈

- Next.js 16 / App Router
- React 19
- TypeScript strict
- Tailwind CSS
- Supabase PostgreSQL
- Vercel
- OpenAI-compatible AI Provider abstraction（当前可接腾讯云 TokenHub 等）
- GitHub / Hugging Face / Show HN / Product Hunt / arXiv collectors

本仓库当前使用 **npm + `package-lock.json`**。

---

## 环境要求

- Node.js ≥ 20
- npm

安装：

```bash
npm install
```

启动：

```bash
npm run dev
```

生产检查：

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

常用页面：

```text
http://localhost:3000/today
http://localhost:3000/qa/motion-lab
```

---

## 环境变量

复制 `.env.example` 为 `.env.local` 并填写。

- 构建不应该依赖真实密钥。
- Supabase / AI / collector 功能在真正调用时才校验对应变量。
- 仅 `NEXT_PUBLIC_*` 可以暴露给浏览器。
- service role、GitHub token、AI key 等只能在服务端。
- **真实密钥禁止写进 git、Markdown、issue、截图或测试 fixture。**

常用变量：

| 变量 | 说明 | 范围 |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目地址 | 前端可用 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | 前端可用 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role | 仅服务端 |
| `GITHUB_TOKEN` | GitHub collector token | 仅服务端 |
| `AI_PROVIDER` | AI Provider 标识 | 仅服务端 |
| `AI_BASE_URL` / `AI_API_KEY` / `AI_MODEL` | AI Provider 配置 | 仅服务端 |

完整模板见 `.env.example`。

---

## 常用脚本

### GitHub

```bash
npm run collect:github
npm run collect:github:dry
npm run collect:github:smoke
npm run doctor:github
```

### Hugging Face

```bash
npm run collect:huggingface
npm run collect:huggingface:dry
npm run collect:huggingface:smoke
npm run doctor:huggingface
```

### arXiv

```bash
npm run collect:arxiv
npm run collect:arxiv:dry
npm run collect:arxiv:smoke
npm run doctor:arxiv
```

### AI / production diagnostics

```bash
npm run doctor:ai
npm run doctor:supabase
npm run doctor:production
npm run analyze:items:dry
```

健康检查：

```bash
curl http://localhost:3000/api/health
```

---

## 主要路由

| 路径 | 说明 |
| --- | --- |
| `/` | 重定向到 `/today` |
| `/today` | Daily Radar / Today’s 7 / Signal Weave |
| `/explore` | 历史发现与筛选 |
| `/saved` | 收藏与笔记 |
| `/idea-lab` | 灵感工作区（持续演进） |
| `/project/[id]` | Project Intelligence 详情 |
| `/qa/motion-lab` | Today motion / visual QA fixture |
| `/api/health` | 健康检查 |

---

## 当前数据/产品能力

已经存在的主要能力包括：

- 多来源 collectors
- `raw_items` / normalized items
- 指标历史快照
- Discovery Score
- Momentum / growth signals
- 5 Core + 1 Adjacent + 1 Wildcard discovery mix
- 用户行为事件基础
- Personal Match / semantic profile 基础设施
- Project Entity / cross-source evidence
- Project Intelligence detail
- Daily Synthesis / Signal Weave 基础

更完整的 2026-08-08 产品/数据状态见：

[`docs/checkpoints/2026-08-08-frontier-radar-checkpoint.md`](docs/checkpoints/2026-08-08-frontier-radar-checkpoint.md)

---

## 目录结构

```text
frontier-radar/
├── docs/
│   ├── START-HERE.md          新协作者入口 / 当前状态
│   ├── PRD.md                 初始 Stage-0 PRD（历史基线）
│   ├── PHASES.md              早期阶段规划（历史基线）
│   ├── DATA-SOURCES.md
│   ├── SCORING.md
│   ├── RISKS.md
│   └── checkpoints/
├── supabase/migrations/       数据库迁移
├── src/
│   ├── app/
│   │   ├── today/             production Today
│   │   ├── qa/motion-lab/     Motion Lab / LAB-03–06 / Signal Weave QA
│   │   ├── explore/
│   │   ├── saved/
│   │   ├── idea-lab/
│   │   └── project/[id]/
│   ├── components/frontier/   Today / Motion Lab / Signal Weave 组件
│   ├── lib/
│   │   ├── collectors/        数据源采集
│   │   ├── scoring/           Discovery Score
│   │   ├── feed/              Daily mix / ranking
│   │   ├── ai/                AI analysis / daily synthesis
│   │   ├── db/repositories/   数据访问层
│   │   └── supabase/          Supabase client/server/admin
│   └── config/                兴趣画像 / discovery 配置
└── scripts/                   collectors / doctor / analysis scripts
```

---

## 协作约束

在改 Today 之前，强烈建议先读 `docs/START-HERE.md` 和 `AGENTS.md`。

几个最重要的规则：

1. **Build PASS ≠ Visual PASS**：视觉/滚动任务必须看真实浏览器。
2. 不要通过不断追加 `!important` 修复架构冲突。
3. 不要重新加载已经退出 production 的 foil/spectral/compression artifact renderer。
4. 不要为了修滚动顺手改视觉，也不要为了修视觉顺手改数据。
5. 不要 force push，除非仓库 owner 明确要求。
6. 无法验证的状态必须明确写“未验证”，不要伪造 PASS。

---

## 文档说明

这个项目演进很快，早期文档不会被删除，因为它们保留了设计和架构决策的历史背景。

如果文档冲突，建议优先级：

```text
当前代码 + docs/START-HERE.md + 最新 checkpoint
  > README.md / AGENTS.md
  > 早期 PRD.md / PHASES.md
```
