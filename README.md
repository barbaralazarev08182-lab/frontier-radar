# Frontier Radar

**A personalized discovery engine for things being built at the frontier of technology.**

Frontier Radar 不是普通 AI 新闻聚合器，也不是简单的 GitHub 热榜。它每天从多个技术来源发现正在变得值得关注的项目、Demo、模型、论文和工具，通过评分、个性化和跨来源证据筛出 **Today’s 7**，再把这些信号综合成趋势、判断和可行动方向。

核心产品链路：

```text
Discover → Understand → Get Inspired → Build
```

> 新协作者先读 [`docs/START-HERE.md`](docs/START-HERE.md)。
>
> Coding agent / Codex 还应阅读 [`AGENTS.md`](AGENTS.md)。
>
> 当前体验冻结记录：[`docs/checkpoints/2026-08-10-experience-freeze.md`](docs/checkpoints/2026-08-10-experience-freeze.md)。
>
> 主干整合记录：[`docs/checkpoints/2026-08-10-main-integration.md`](docs/checkpoints/2026-08-10-main-integration.md)。

---

## 当前正式基线

截至 2026-08-10：

```text
main = 当前正式代码基线 / 后续开发起点
```

Today、Signal Weave、Project Intelligence 已通过一次干净整合进入 `main`。

这次整合没有把约 181 个 prototype 历史提交直接倒入主干，而是从原 `main` 出发，只装配最终认可的代码和必要数据支持，最后通过 PR #3 squash merge。

当前主干整合 commit：

```text
225cf8dd5c412f9fbf45bd9cbfdbb4a249fe225a
```

旧 `proto/*` 分支现在仅用于历史参考 / 设计考古，**不要作为新任务默认开发基线**。

---

## 1. Discovery / Ranking

当前候选来源：

- GitHub
- Hugging Face（Spaces-first）
- Show HN
- Product Hunt
- arXiv

公共 Discovery Score 核心维度：

1. Freshness
2. Domain Relevance
3. Momentum
4. Project Health
5. Novelty
6. Idea Spark
7. Tryability

Today 默认保留探索结构：

```text
5 × Core + 1 × Adjacent + 1 × Wildcard
```

Adjacent / Wildcard 是防止个性化越学越窄的产品机制。

---

## 2. `/today` — Daily Radar

Today 是滚动驱动的 editorial / motion experience：

```text
Hero                 continuous
  ↓
Compression          locked stable stage
  ↓ one physical gesture
Today’s 7            locked stable stage
  ↓ one physical gesture
Signal Weave         continuous synthesis scene
```

关键约束：

- Hero 允许连续滚动。
- Compression / Today’s 7 是稳定章节，不是偶然中间帧。
- 一个真实 wheel / trackpad gesture 最多推进一个中间章节。
- 触控板惯性不能跳过章节。
- 反向滚动严格对称。
- `06 / Adjacent` = cobalt blue。
- `07 / Wildcard` = saturated orange。
- Production 视觉由原始 LAB-03–06 系统拥有。
- Signal Weave 保持 `7 signals → 3 patterns → Final Take` 的统一场景。
- synthesis 数据尚未准备好时，最后 synthesis chapter 仍必须可进入。

已经退出 production 的实验层不要重新加载：

- foil renderer
- spectral renderer
- standalone compression artifact renderer
- 用来对抗上述实验的 restore / override CSS

---

## 3. `/project/[id]` — Project Intelligence

当前认可的五阶段结构：

```text
01 CAPTURE
   ↓
02 EVIDENCE
   ↓
03 INTERROGATION
   ↓
04 RESOLUTION
   ↓
05 BUILD
```

阶段语义：

- **Capture**：让用户产生“这个项目值得继续看”的兴趣；强 hero、dossier、扫描/材质交互。
- **Evidence**：解释 Radar 为什么相信它，强调来源和可验证证据。
- **Interrogation**：连续审问关键判断；橙色场 + 半透明黑 analysis sheets 是视觉锚点。
- **Resolution**：把证据和判断压缩成最终 verdict；不是单纯分数 dashboard。
- **Build**：把理解转成下一步行动 / Idea Lab 入口。

冻结约束：

- 01–05 当前版式和主转场不做无目的重构。
- 五幕在用户不滚动、不移动鼠标时也持续有各自 idle motion。
- Interrogation 黑片约 `rgba(8,8,8,.65)`。
- Resolution score label 保持当前更大的可读尺寸。
- Project Intelligence 顶部站点导航保持透明整合。
- 不要为了“更高级”重新改成完整 3D world。

核心文件：

```text
src/app/project/[id]/page.tsx
src/app/project/[id]/layout.tsx
src/app/project/[id]/project-intelligence.css
src/app/project/[id]/project-intelligence-effects.css
src/app/project/[id]/project-intelligence-capture.css
src/app/project/[id]/project-intelligence-refinements.css
src/components/frontier/project-intelligence-motion.tsx
```

---

## 4. 分支与发布策略

默认规则：

```text
main
  └─ production source of truth

feature/* / fix/* / docs/*
  └─ short-lived PR branches

proto/*
  └─ historical experiments only
```

新任务从最新 `main` 拉分支，不要继续向旧 prototype 分支堆代码。

推荐发布链：

```text
feature branch → Preview → PR + CI → main → Production
```

不要长期依赖手动 Promote 某个 Preview 作为正式版本来源。

---

## 5. 技术栈

- Next.js 16 / App Router
- React 19
- TypeScript strict
- Tailwind CSS
- Supabase PostgreSQL
- Vercel
- OpenAI-compatible AI Provider abstraction
- npm + `package-lock.json`

---

## 6. 本地启动与检查

要求：Node.js ≥ 20。

```bash
npm install
npm run dev
```

常用页面：

```text
http://localhost:3000/today
http://localhost:3000/qa/motion-lab
http://localhost:3000/project/<id>
```

提交前：

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

**Build PASS ≠ Visual PASS。** Motion / visual 改动必须进行真实浏览器验收。

---

## 7. 环境变量

复制 `.env.example` 为 `.env.local`。

- 不提交 `.env.local`。
- 真实 key 不写入 Git、Markdown、issue、测试 fixture 或截图。
- 只有 `NEXT_PUBLIC_*` 可暴露给浏览器。
- Service role / GitHub token / AI key 只能在服务端使用。

主要变量：

| 变量 | 用途 |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase public URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | 服务端数据库权限 |
| `GITHUB_TOKEN` | GitHub collector |
| `AI_PROVIDER` | AI provider 标识 |
| `AI_BASE_URL` / `AI_API_KEY` / `AI_MODEL` | AI provider 配置 |

---

## 8. 主要路由

| 路径 | 说明 |
| --- | --- |
| `/` | 重定向到 `/today` |
| `/today` | Daily Radar / Today’s 7 / Signal Weave |
| `/explore` | 历史发现与筛选 |
| `/saved` | 收藏与笔记 |
| `/idea-lab` | 灵感 / Build 工作区 |
| `/project/[id]` | Project Intelligence |
| `/qa/motion-lab` | Today motion / visual QA fixture |
| `/api/health` | 健康检查 |

---

## 9. 协作红线

1. 先确认 branch / HEAD，再改代码。
2. 不通过不断追加高 specificity / `!important` 解决架构冲突。
3. 不复活已退出 production 的 renderer。
4. 视觉、滚动、数据尽量分层修改。
5. 不把机器 PASS 说成浏览器视觉 PASS。
6. 不 force-push，除非仓库 owner 明确要求。
7. 不从旧 `proto/*` 默认继续开发。
8. 无法验证的状态明确写“未验证”。

更完整规则见 [`docs/START-HERE.md`](docs/START-HERE.md) 和 [`AGENTS.md`](AGENTS.md)。
