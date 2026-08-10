# Frontier Radar

**A personalized discovery engine for things being built at the frontier of technology.**

Frontier Radar 不是普通 AI 新闻聚合器，也不是简单的 GitHub 热榜。它每天从多个技术来源发现正在变得值得关注的项目、Demo、模型、论文和工具，再通过评分、个性化和跨来源证据筛出 **Today’s 7**，最后把信号综合成更高层的趋势、判断和可行动方向。

核心产品链路：

```text
Discover → Understand → Get Inspired → Build
```

> 新协作者请先读 [`docs/START-HERE.md`](docs/START-HERE.md)。
>
> Codex / coding agent 还应阅读 [`AGENTS.md`](AGENTS.md)。
>
> 当前阶段快照见 [`docs/checkpoints/2026-08-10-experience-freeze.md`](docs/checkpoints/2026-08-10-experience-freeze.md)。

---

## 当前产品形态

### 1. Discovery / Ranking

当前候选来源包括：

- GitHub
- Hugging Face（Spaces-first）
- Show HN
- Product Hunt（公开 Feed）
- arXiv

公共 Discovery Score 的核心维度：

1. Freshness
2. Domain Relevance
3. Momentum
4. Project Health
5. Novelty
6. Idea Spark
7. Tryability

Today 默认保持探索结构：

```text
5 × Core + 1 × Adjacent + 1 × Wildcard
```

Adjacent / Wildcard 是防止推荐越学越窄的产品机制，不是装饰标签。

### 2. `/today` — Daily Radar

Today 已经从普通 Feed 演进成滚动驱动的 editorial / motion experience：

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

- `06 / Adjacent` 保留 cobalt blue 身份。
- `07 / Wildcard` 保留 saturated orange 身份。
- Production 视觉基线由原始 LAB-03–06 系统拥有。
- 旧 foil / spectral / standalone compression artifact 实验层不得重新叠回 production。
- Signal Weave 保持 7 条 signal → 3 个 pattern → Final Take 的统一场景结构。
- 最后一章不能因为 Daily Synthesis 仍在加载而从滚动结构中消失。

当前 Today 主整合历史分支：

```text
proto/today-foil-candy-v4
```

它是已完成阶段的历史/冻结基线，不应继续作为无限实验场。

### 3. `/project/[id]` — Project Intelligence

Project Intelligence 已完成一轮独立视觉与交互重构，当前认可的五阶段结构：

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

语义：

- **Capture**：用强 hero + dossier / capture language 把项目“抓进雷达”。
- **Evidence**：呈现为什么 Radar 相信它，强调来源与证据。
- **Interrogation**：连续审问关键信号；橙色场 + 半透明黑 analysis sheets 是当前视觉核心。
- **Resolution**：把前面的证据和判断收束成最终 verdict；7 个评分维度围绕结论形成决策场。
- **Build**：把“理解”转成下一步行动方向 / Idea Lab 入口。

当前冻结分支：

```text
proto/project-intelligence-rebuild-v1
```

当前视觉代码基线（docs-only commit 之前）：

```text
e423b0b0f105b7daa5cc00935e236ea250d6d30e
```

重要原则：

- 当前 01–05 的版式和转场已经通过用户视觉验收，不做无目的重构。
- 五幕在用户停止滚动、鼠标不动时也应有各自独立的 idle motion。
- 第三幕黑色 analysis sheet 约 65% 黑色不透明度，让橙色场透出。
- 第四幕 score label 已提高可读性；Resolution 的功能是“落锤”，不是重复展示数字。
- 顶部站点导航在 Project Intelligence 中保持透明整合，不应重新压回黑色条。
- 动效优先服务阶段语义，不再为了“高级”直接上完整 3D 世界。

---

## 当前分支策略

`main` 仍是仓库默认分支，但当前最终体验尚未完成一次干净整合。

截至 2026-08-10：

- `main`：相对稳定的仓库入口 / 文档基线。
- `proto/today-foil-candy-v4`：Today 完成阶段的历史整合分支。
- `proto/project-intelligence-rebuild-v1`：Project Intelligence 当前冻结视觉分支。
- `proto/project-intelligence-spatial-v1` / `kinetic-v1` 等：失败或已放弃的实验，不是当前产品方向。

不要把大量历史实验提交直接硬 merge 到 `main`。

后续应从最新 `main` 建立干净 integration/release branch，只带入确认需要的最终代码。详见：

[`docs/INTEGRATION-PLAN-2026-08-10.md`](docs/INTEGRATION-PLAN-2026-08-10.md)

---

## 技术栈

- Next.js 16 / App Router
- React 19
- TypeScript strict
- Tailwind CSS
- Supabase PostgreSQL
- Vercel
- OpenAI-compatible AI Provider abstraction
- npm + `package-lock.json`

---

## 本地启动

要求：

- Node.js ≥ 20
- npm

```bash
npm install
npm run dev
```

常用页面：

```text
http://localhost:3000/today
http://localhost:3000/explore
http://localhost:3000/project/<project-id>
http://localhost:3000/idea-lab
http://localhost:3000/qa/motion-lab
```

工程检查：

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

**Build PASS ≠ Visual PASS。** 所有 motion / scroll / layout 修改必须尽量在真实浏览器验证。

---

## 环境变量

复制 `.env.example` 为 `.env.local` 并填写。

- 构建本身不应依赖真实 secret。
- 仅 `NEXT_PUBLIC_*` 可暴露给浏览器。
- service role、AI key、GitHub token 等真实 secret 禁止入库。
- Vercel Production / Preview 环境变量范围要明确区分。

常见变量：

| 变量 | 用途 | 范围 |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL | browser-safe |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | browser-safe |
| `SUPABASE_SERVICE_ROLE_KEY` | server admin | server only |
| `GITHUB_TOKEN` | GitHub collector | server only |
| `AI_PROVIDER` | AI provider selector | server only |
| `AI_BASE_URL` / `AI_API_KEY` / `AI_MODEL` | AI provider config | server only |

---

## 主要路由

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

## 关键目录

```text
frontier-radar/
├── docs/
│   ├── START-HERE.md
│   ├── INTEGRATION-PLAN-2026-08-10.md
│   └── checkpoints/
├── supabase/migrations/
├── scripts/
└── src/
    ├── app/
    │   ├── today/
    │   ├── project/[id]/
    │   ├── qa/motion-lab/
    │   ├── explore/
    │   ├── saved/
    │   └── idea-lab/
    ├── components/frontier/
    ├── config/
    └── lib/
        ├── collectors/
        ├── scoring/
        ├── feed/
        ├── ai/
        ├── db/repositories/
        └── supabase/
```

---

## 协作红线

1. 修改前先确认 branch / HEAD。
2. 不把机器 PASS 当视觉 PASS。
3. 不用不断追加高 specificity / `!important` 掩盖 CSS 架构问题。
4. 不重新接回明确废弃的 renderer / visual experiment。
5. 不为了修视觉顺手改推荐/数据，不为了修滚动顺手重做视觉。
6. 不 force push，除非仓库 owner 明确要求。
7. 无法验证的场景明确写“未验证”。
8. 最终体验冻结后，优先增量修 bug，不随意重构已验收页面。

---

## 文档优先级

项目演进很快。如果文档冲突，优先级：

```text
当前代码 + docs/START-HERE.md + 最新 checkpoint
  > README.md / AGENTS.md
  > 早期 PRD.md / PHASES.md
```

`docs/PRD.md` / `docs/PHASES.md` 保留历史价值，但不代表 2026-08-10 的完整现状。
