# Frontier Radar — START HERE

> 给第一次接触这个仓库的协作者。请先读完这一页，再开始改代码。
>
> 更新时间：2026-08-10

## 1. 一句话理解这个项目

**Frontier Radar 是一个个人化的前沿技术发现引擎。**

它不是普通 AI 新闻聚合器，也不是“把热门 GitHub 项目排个榜”。它每天从多个技术来源里发现一批候选项目，判断哪些正在变得值得关注，再为用户选出 **Today’s 7**，最后把这 7 条信号综合成更高层的趋势/方向。

长期产品主链路：

`Discover → Understand → Get Inspired → Build`

当前最核心的产品体验：

`大量候选 → 7 个 Daily Signals → 关系/模式综合 → 可行动的 Frontier Intelligence`

---

## 2. 产品原则

这些原则比单个 UI 细节更重要：

- **Discovery > Search**：重点是发现用户不会主动搜索到的东西。
- **Rising > Popular**：增长、动量和“正在发生”比绝对 Star 数更重要。
- **Idea Spark > 纯 Research Value**：看完最好会产生“我也想拿它做点东西”的冲动。
- **Projects > Articles**：可运行、可试玩、可复现、可延展的项目优先。
- **不要越推荐越窄**：推荐固定保留 Adjacent / Wildcard 探索位。
- **AI 的作用是解释和综合，不是制造看似聪明的文案。**
- **动画用于组织信息，不用于装饰。**

---

## 3. 当前数据与推荐链路

当前候选来源已经超过最初 PRD 中的 3 个源：

- GitHub
- Hugging Face（Spaces-first，优先可试玩 Demo）
- Show HN
- Product Hunt（公开 Atom Feed）
- arXiv（保留，但权重和数量较低）

大致数据流：

```text
Collectors
  ↓
raw_items / items
  ↓
metrics snapshots + AI analysis
  ↓
Discovery Score
  ↓
Project Entity / cross-source evidence
  ↓
Personalized Daily Mix
  ↓
Today’s 7
  ↓
Daily Synthesis / Signal Weave
```

### Discovery Score

当前公共 Discovery Score 的核心维度：

1. Freshness
2. Domain Relevance
3. Momentum
4. Project Health
5. Novelty
6. Idea Spark
7. Tryability

Personal Match 不直接写入公共 `latest_score`，而是在用户级重排时叠加。

### Today’s 7

默认探索结构：

- 5 × Core
- 1 × Adjacent
- 1 × Wildcard

Adjacent 和 Wildcard 不是装饰标签，而是防止推荐收缩的重要产品机制。

---

## 4. 当前 `/today` 产品体验

当前 Today 不是普通卡片 Feed，而是一个滚动驱动的 editorial / motion experience。

目标章节结构：

```text
Hero
  ↓  continuous scroll
Compression
  ↓  one physical gesture → smooth transition
Today’s 7
  ↓  one physical gesture → smooth transition
Signal Weave
  ↓  continuous internal scroll
```

反向滚动应该严格对称。

### Hero

- 第一屏允许用户连续滚动多次。
- Hero 的 tear / motion / exit 跟随连续 scroll progress。
- 不应该“一滚就翻页”。

### Compression

- 中间压缩态是稳定画面，不是任意 raw progress 的偶然截图。
- 当前视觉以原始 LAB-03–06 系统为准。
- 7 张 signal/deck 收拢成压缩态。

### Today’s 7

- 7 条今日信号以 editorial composition 展开。
- 06 / Adjacent：蓝色视觉身份。
- 07 / Wildcard：橙色视觉身份。
- 当前用户明确要求保留这一套 LAB-06 蓝/橙视觉。

### Signal Weave

- 7 个 signal ribbon/thread 汇入 3 个 patterns。
- 是当前认可的分析方向，不是 dashboard，也不是三张 pattern card。
- 最后的 `Final Take` 在同一场景里完成收束。

---

## 5. Today 当前视觉基线：非常重要

当前 production `/today` 已经做过一次关键清理。

**不要重新加载/恢复以下已经退出 production 链的实验层：**

- foil experimental renderer
- spectral renderer
- standalone compression artifact renderer
- 为修补上述实验而叠加的 restore/override CSS

此前这些实验同时存在时，高权重 CSS 互相覆盖，造成：

- compression 牌面透明
- 06 / 07 蓝橙消失
- 反向滚动出现 03 / 05 foil ghost
- production 视觉与 LAB-06 不一致

当前正确策略是：

> **Production 只做数据/交互适配，视觉重新交给原始 LAB-03–06。**

不要再用“再加一个更高 specificity 的 CSS 文件”解决视觉冲突。

---

## 6. 当前滚动状态机

最近一次滚动逻辑的目标是：

- Hero = continuous
- Compression = locked
- Today’s 7 = locked
- Weave = continuous

中间章节采用 gesture intent gating：

- 一个真实 wheel/trackpad 手势最多推进一个 stage
- 不能被惯性连续消费
- transition 期间锁输入
- 正反向对称
- 精密触控板快速甩动不能跨过章节

相关核心文件：

- `src/components/frontier/today-stage-scroll-controller.tsx`
- `src/components/frontier/today-motion-production.tsx`
- `src/components/frontier/motion-lab/motion-lab-direct-handoff.tsx`

**不要为了修视觉顺手改滚动，也不要为了修滚动顺手改 LAB CSS。**

---

## 7. 当前已知问题 / 未完成事项

### Production Signal Weave 进入问题（待处理）

当前真实 production 环境存在一个待确认问题：如果 Daily Synthesis `snapshot` 没有成功取得，production 代码会把 Weave 的挂载和 `canEnterWeave` 一起 gate 掉，导致最后一面可能不存在。

本地曾同时观察到 Supabase 查询错误，因此目前需要区分：

1. `snapshot === null` 导致 Weave 根本未挂载；
2. snapshot 存在但 scroll/handoff 没进入；
3. 两者同时存在。

**暂时不要通过伪造 snapshot、硬写 `canEnterWeave=true` 或改 Signal Weave 视觉来掩盖问题。**

### Vercel Preview / Hobby private repo

如果 Vercel 页面显示 `Deployment Blocked`，且提示 commit author 没有项目访问权限，这属于 Vercel Hobby + private repository 的协作/身份限制，不等于 Next.js build failure。

先检查 Git commit author / Vercel Git provider 身份，不要看到 Blocked 就开始改代码。

---

## 8. 当前工作分支与代码基线

当前 Today 实验/整合分支：

```text
proto/today-foil-candy-v4
```

关键历史点：

- `c634cd47fc00ea10fad586f6660e3194badf072f`
  - 清除 foil/spectral/compression artifact 对 production 的污染
  - 恢复 LAB-06 蓝/橙视觉
  - TypeScript / ESLint / Tests / build 通过
- `e2e036825b2dd0a555cde7d83c180fa5c4d86069`
  - 新的中间章节滚动 gesture 状态机
- `d28960ea8a2fa9b478495a15a8399d526edd3f54`
  - 空提交，仅用于重新触发 Vercel Preview；没有代码 diff

本文档之后可能继续出现 docs-only commit；判断功能基线时请看代码 diff，不要只看 HEAD 数字。

---

## 9. Signal Weave 视觉语义

当前分析层的三组 pattern 概念（最早来自 Motion Lab fixture，真实 production 内容可由 Daily Synthesis 替换）：

### Pattern 01 — Agent Infrastructure

多个 agent 相关信号向 memory / orchestration / runtime / infrastructure 下沉。

### Pattern 02 — Local / Native

本地多模态/推理能力逐步接近原生产品体验。这个 pattern 应保持更稀疏、早期形成的视觉状态。

### Pattern 03 — Interface / Instrument

交互本身正在变成产品结构，而不仅仅是展示层。

其中：

- Adjacent 应保留冷蓝行为/身份
- Wildcard 应保留橙色/异常行为身份

当前 Final Take 的设计目标不是“再开一页”，而是在同一 weave 场景里形成结论。

---

## 10. 主要路由

| 路径 | 用途 |
| --- | --- |
| `/` | 重定向到 `/today` |
| `/today` | Daily Radar / Today’s 7 / Signal Weave |
| `/explore` | 浏览历史发现 |
| `/saved` | 收藏与笔记 |
| `/idea-lab` | 灵感工作区（仍在演进） |
| `/project/[id]` | Project Intelligence 详情 |
| `/qa/motion-lab` | Today motion / interaction QA fixture |
| `/api/health` | 健康检查 |

QA route 不是 production 数据真相，但非常适合验证视觉和 motion 状态。

---

## 11. 关键目录

```text
src/
├── app/
│   ├── today/                 production Today 页面与 production adapter CSS
│   ├── qa/motion-lab/         Motion Lab / LAB-03–06 / handoff / Signal Weave QA 样式
│   ├── explore/
│   ├── saved/
│   ├── idea-lab/
│   └── project/[id]/
├── components/frontier/
│   ├── motion-lab/            Motion Lab shell / handoff
│   ├── today-motion-production.tsx
│   ├── today-stage-scroll-controller.tsx
│   └── today-signal-weave.tsx
└── lib/
    ├── collectors/            多来源采集器
    ├── scoring/               Discovery Score
    ├── feed/                  Daily mix / ranking
    ├── ai/                    AI analysis / daily synthesis
    ├── db/repositories/       数据访问
    └── supabase/              Supabase client/server/admin
```

---

## 12. 本地启动

本仓库当前使用 **npm + `package-lock.json`**。

```bash
npm install
npm run dev
```

常用页面：

```text
http://localhost:3000/today
http://localhost:3000/qa/motion-lab
```

完整工程检查：

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

不要提交 `.env.local` 或任何 secret。

环境变量模板见：`.env.example`。

---

## 13. 协作开发规则

### 开始任务前

1. 先确认当前目标 branch / commit。
2. 先看实际浏览器状态，再判断问题属于数据、滚动、handoff 还是视觉。
3. 读相关现有实现，不要凭截图直接新建一套 renderer。

### 修改时

- 一次只解决一个明确层级的问题。
- 不把 build PASS 当作 visual PASS。
- 不用不断追加 `!important` 掩盖架构冲突。
- 不擅自重做已经确认的视觉语言。
- 不修改与当前任务无关的数据/推荐逻辑。
- 不 force push，除非仓库 owner 明确要求。

### 完成前

至少说明：

- 根因
- 修改文件
- 浏览器验证路径
- TypeScript / lint / tests / build 状态
- commit SHA
- 哪些环境问题导致无法完整验证

不能验证的部分要明确写“未验证”，不要把机器 PASS 说成用户视觉 PASS。

---

## 14. 设计红线

Today / Signal Weave 当前已经经过大量视觉实验。以下方向通常不要重新引入：

- generic glassmorphism
- 大面积 blur / bloom / fog glow
- 普通 SaaS dashboard
- 卡片网格作为主要视觉语言
- 黑色 cyberpunk dashboard
- 蓝/橙大块之外再叠无语义彩色卡
- 巨型 typography 代替结构设计
- 纯装饰粒子
- 为了“高级”而加 WebGL，但没有信息语义

当前更重要的是：**结构、层级、可读性、动效语义和状态连续性。**

---

## 15. 其他文档怎么读

- `README.md`：仓库入口、安装、总体架构。
- `AGENTS.md`：给 Codex/AI coding agent 的约束和当前 Today 方向。
- `docs/PRD.md`：最初 Stage-0 产品 PRD，属于历史基线，不等于全部现状。
- `docs/PHASES.md`：早期分阶段规划，很多阶段实际上已经向前演进。
- `docs/DATA-SOURCES.md`：数据源细节。
- `docs/SCORING.md`：评分设计。
- `docs/RISKS.md`：工程风险。
- `docs/checkpoints/2026-08-08-frontier-radar-checkpoint.md`：2026-08-08 产品/数据侧阶段快照。

如果文档之间冲突，优先级建议：

```text
当前代码 + 最新 checkpoint / START-HERE
    > README / AGENTS
    > 早期 PRD / PHASES
```

---

## 16. 新协作者第一天推荐顺序

1. 读完本文件。
2. 打开 `/today`，走完整滚动路径。
3. 打开 `/qa/motion-lab`，理解 LAB-03–06 和 Signal Weave 的来源。
4. 阅读 `today-motion-production.tsx` 与 `today-stage-scroll-controller.tsx`。
5. 再根据具体任务进入 collector / scoring / synthesis / UI 子系统。

**不要第一天就重构。先理解为什么现在的代码会长成这样。**
