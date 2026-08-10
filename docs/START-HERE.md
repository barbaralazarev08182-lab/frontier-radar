# Frontier Radar — START HERE

> 给第一次接触这个仓库的协作者。请先读完这一页，再开始改代码。
>
> 更新时间：2026-08-10

## 1. 这是什么项目

**Frontier Radar 是一个个人化的前沿技术发现引擎。**

它不是普通 AI 新闻聚合器，也不是“把热门 GitHub 项目排个榜”。它每天从多个技术来源发现一批正在发生变化的项目、Demo、模型、论文和工具，判断哪些真正值得关注，再为用户选出 **Today’s 7**，最后把这 7 条信号综合成更高层的趋势与方向。

长期产品主链路：

```text
Discover → Understand → Get Inspired → Build
```

当前核心体验：

```text
大量候选
  ↓
7 个 Daily Signals
  ↓
关系 / Pattern 综合
  ↓
可行动的 Frontier Intelligence
```

## 2. 产品原则

这些原则比单个 UI 细节更重要：

- **Discovery > Search**：重点是发现用户不会主动搜索到的东西。
- **Rising > Popular**：增长、动量和“正在发生”比绝对 Star 数更重要。
- **Idea Spark > 纯 Research Value**：看完最好会产生“我也想拿它做点东西”的冲动。
- **Projects > Articles**：可运行、可试玩、可复现、可延展的项目优先。
- **不要越推荐越窄**：推荐长期保留 Adjacent / Wildcard 探索位。
- **AI 用于解释、筛选和综合，不是制造看似聪明的文案。**
- **动画用于组织信息，不用于装饰。**

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

```text
5 × Core + 1 × Adjacent + 1 × Wildcard
```

Adjacent 和 Wildcard 不是装饰标签，而是防止推荐收缩的重要产品机制。

## 4. 当前最重要的前端：`/today`

Today 已经不是普通 Feed，而是一个滚动驱动的 editorial / motion experience。

当前目标章节结构：

```text
Hero
  ↓ continuous scroll
Compression
  ↓ one physical gesture → smooth transition
Today’s 7
  ↓ one physical gesture → smooth transition
Signal Weave
  ↓ continuous internal scroll
```

反向滚动应严格对称。

### Hero

- 第一屏允许连续滚动多次。
- Hero 的 tear / motion / exit 跟随 scroll progress。
- 不应该“一滚就翻页”。

### Compression

- 是稳定章节，不是任意 raw progress 的偶然截图。
- 7 张 signal/deck 在此被压缩、收拢。
- 当前视觉以原始 Motion Lab / LAB-03–06 系统为准。

### Today’s 7

- 7 条今日信号以不对称 editorial composition 展开。
- Adjacent 保留强蓝色视觉身份。
- Wildcard 保留强橙色视觉身份。
- 这是目前明确要求保留的视觉基线。

### Signal Weave

- 7 个 signal ribbon/thread 汇入 3 个 patterns。
- 它不是 dashboard，不是三张 pattern card，也不是三页详情页。
- Final Take 应在同一场景完成收束。

## 5. Today 视觉基线：不要重新引入已废弃实验

前面做过多轮视觉实验，后来确认 production 同时加载太多 renderer / CSS 会互相污染。

**不要重新把以下实验层接回 production `/today`：**

- foil experimental renderer
- spectral renderer
- standalone compression artifact renderer
- 为了修补这些实验而不断叠加的 restore / override CSS

这些实验曾造成：

- compression 牌面透明
- 06 / 07 蓝橙消失
- 反向滚动出现 foil ghost
- 高 specificity CSS 互相覆盖

当前正确策略：

> **Production 只做数据与交互适配，基础视觉交还给原始 LAB-03–06。**

不要用“再加一个更高 specificity 的 CSS 文件”解决结构性视觉冲突。

## 6. 当前滚动状态机

目标模型：

```text
Hero = continuous
Compression = locked
Today’s 7 = locked
Signal Weave = continuous
```

中间章节使用 gesture intent gating：

- 一个真实 wheel / trackpad 手势最多推进一个 stage
- 惯性 wheel event 不得连续消费多个章节
- transition 期间锁输入
- 正反向对称
- 精密触控板快速甩动不能跨章节

核心文件：

- `src/components/frontier/today-stage-scroll-controller.tsx`
- `src/components/frontier/today-motion-production.tsx`
- `src/components/frontier/motion-lab/motion-lab-direct-handoff.tsx`

不要为了修视觉顺手改滚动，也不要为了修滚动顺手重做 LAB CSS。

## 7. 当前已知问题

### Production Signal Weave 进入问题

当前仍需单独确认一个问题：如果 Daily Synthesis `snapshot` 没有成功取得，production 代码可能会把 Weave 的挂载和 `canEnterWeave` 一起 gate 掉，导致最后一面不存在。

排查时必须区分：

1. `snapshot === null`，Weave 根本没挂载；
2. snapshot 存在，但 scroll / handoff 没进入；
3. 两者同时存在。

不要通过伪造 snapshot、硬写 `canEnterWeave=true` 或重做 Signal Weave 视觉来掩盖问题。

### Vercel Hobby + private repo 协作限制

如果 Vercel 显示 `Deployment Blocked`，并提示 commit author 没有项目访问权限，这属于 Vercel Hobby + private repository 的协作/身份限制，不等于 Next.js build failure。

先检查 Git commit author 与 Vercel Git provider 身份，不要看到 Blocked 就开始改代码。

## 8. 分支与当前工作方式

`main` 是仓库入口与相对稳定基线。

当前 Today motion / visual / scroll 的主要实验整合分支是：

```text
proto/today-foil-candy-v4
```

几个重要历史点：

- `c634cd47fc00ea10fad586f6660e3194badf072f`
  - 清除 foil / spectral / compression artifact 对 production 的污染
  - 恢复 LAB-06 蓝/橙视觉
  - TypeScript / ESLint / Tests / build 通过
- `e2e036825b2dd0a555cde7d83c180fa5c4d86069`
  - 新的中间章节滚动 gesture 状态机

文档可能继续有 docs-only commit，因此判断功能状态时请看实际代码 diff，不要只看 HEAD 数字。

**开始工作前必须先确认当前任务应该落在 `main` 还是 feature branch。**

## 9. Signal Weave 设计语义

当前认可的分析方向是一个统一的 weave 场景：

- 7 条 signal thread / ribbon
- 3 个 higher-level patterns
- hover / pin 用于强调关系
- 非激活信息可以退后，但不能消失到读不出 7 → 3 结构
- Final Take 在同一场景出现

早期 fixture 中的三组语义大致为：

- Agent Infrastructure
- Local / Native
- Interface / Instrument

其中 Adjacent 应保持冷蓝身份，Wildcard 应保持橙色异常身份。

## 10. 主要路由

| 路径 | 用途 |
| --- | --- |
| `/` | 重定向到 `/today` |
| `/today` | Daily Radar / Today’s 7 / Signal Weave |
| `/explore` | 浏览历史发现 |
| `/saved` | 收藏与笔记 |
| `/idea-lab` | 灵感工作区 |
| `/project/[id]` | Project Intelligence 详情 |
| `/qa/motion-lab` | Today motion / interaction QA fixture |
| `/api/health` | 健康检查 |

QA route 很适合验证 motion 和视觉状态，但不能替代 production 数据真相。

## 11. 关键目录

```text
src/
├── app/
│   ├── today/                 production Today 页面与 adapter CSS
│   ├── qa/motion-lab/         Motion Lab / LAB-03–06 / handoff / Weave QA
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

## 12. 本地启动与检查

仓库使用 **npm + `package-lock.json`**。

```bash
npm install
npm run dev
```

常用页面：

```text
http://localhost:3000/today
http://localhost:3000/qa/motion-lab
```

完整检查：

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

不要提交 `.env.local` 或任何 secret。环境变量模板见 `.env.example`。

## 13. 协作规则

开始任务前：

1. 确认 branch / commit。
2. 先看真实浏览器状态。
3. 判断问题属于数据、滚动、handoff 还是视觉。
4. 先读现有实现，不要凭截图直接新建一套 renderer。

修改时：

- 一次只解决一个明确层级的问题。
- Build PASS ≠ Visual PASS。
- 不不断追加 `!important` 掩盖架构冲突。
- 不擅自重做已经确认的视觉语言。
- 不修改与任务无关的数据/推荐逻辑。
- 不 force push，除非仓库 owner 明确要求。

交付时至少说明：

- 根因
- 修改文件
- 浏览器验证路径
- TypeScript / lint / tests / build 状态
- commit SHA
- 哪些环境问题导致无法完整验证

无法验证的部分要明确标注“未验证”。

## 14. 设计红线

Today / Signal Weave 已经经过大量实验。通常不要重新引入：

- generic glassmorphism
- 大面积 blur / bloom / fog glow
- 普通 SaaS dashboard
- 卡片网格作为主要视觉语言
- 黑色 cyberpunk dashboard
- 无语义彩色卡片堆叠
- 巨型 typography 代替结构设计
- 纯装饰粒子
- 为了“高级”而加没有信息语义的 WebGL

当前更重要的是：**结构、层级、可读性、动效语义和状态连续性。**

## 15. 其他文档怎么读

- `README.md`：仓库入口、安装、当前产品概览。
- `AGENTS.md`：给 Codex / AI coding agent 的工作约束。
- `docs/PRD.md`：最初 Stage-0 PRD，属于历史基线，不等于全部现状。
- `docs/PHASES.md`：早期阶段规划，很多阶段已经实际向前演进。
- `docs/DATA-SOURCES.md`：数据源细节。
- `docs/SCORING.md`：评分设计。
- `docs/RISKS.md`：工程风险。
- `docs/checkpoints/2026-08-08-frontier-radar-checkpoint.md`：产品/数据侧阶段快照。

如果文档之间发生冲突，优先级建议：

```text
START-HERE / 最新 checkpoint
  > 当前代码与测试
  > README
  > 早期 PRD / PHASES
```
