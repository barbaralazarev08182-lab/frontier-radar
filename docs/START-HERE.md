# Frontier Radar — START HERE

> 给第一次接触这个仓库的协作者。
>
> 更新时间：2026-08-10  
> 当前状态：**Today + Signal Weave + Project Intelligence 已整合进 `main`。**

## 1. 先记住这一条

```text
main = 当前正式代码基线 / 新任务默认起点
```

不要看到 `proto/*` 分支提交更多就默认它更新。那些分支主要保留设计实验和历史过程。

2026-08-10 主干整合通过 PR #3 完成，squash merge commit：

```text
225cf8dd5c412f9fbf45bd9cbfdbb4a249fe225a
```

整合没有把约 181 个 prototype 历史提交硬 merge 到主干，而是只搬入最终认可代码。

---

## 2. 一句话理解产品

**Frontier Radar 是一个个人化前沿技术发现引擎。**

它不是普通 AI 新闻聚合器，也不是热门项目榜单。核心循环：

```text
Discover → Understand → Get Inspired → Build
```

当前主体验：

```text
大量候选
  ↓
Today’s 7
  ↓
Signal Weave
  ↓
Project Intelligence
  ↓
Build / Idea Lab
```

产品原则：

- Discovery > Search
- Rising > Popular
- Idea Spark > 纯热度
- Projects / demos > 被动内容（质量相近时）
- 保留 Adjacent / Wildcard，避免推荐越学越窄
- AI 用于解释、综合和判断，不用于堆“聪明文案”
- 动画必须表达信息状态或阶段语义

---

## 3. 数据与推荐链路

当前来源：

- GitHub
- Hugging Face（Spaces-first）
- Show HN
- Product Hunt
- arXiv

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

公共 Discovery Score：

1. Freshness
2. Domain Relevance
3. Momentum
4. Project Health
5. Novelty
6. Idea Spark
7. Tryability

Today 默认：

```text
5 Core + 1 Adjacent + 1 Wildcard
```

Personal Match 属于用户级重排，不等于公共 Discovery Score。

---

## 4. `/today` 当前合同

章节状态机：

```text
Hero                 continuous
  ↓
Compression          locked stable stage
  ↓ one physical gesture
Today’s 7            locked stable stage
  ↓ one physical gesture
Signal Weave         continuous synthesis scene
```

必须保持：

- Hero 可以连续 scrub。
- Compression / Today’s 7 是稳定终点。
- 一个真实 wheel / trackpad gesture 最多推进一个中间 stage。
- 惯性不能跳 stage。
- transition 期间锁输入。
- 正反向对称。
- Signal Weave 进入后恢复连续内部滚动。
- synthesis 数据加载中时，最终 synthesis chapter 仍然存在并可进入。

### Today 视觉基线

- editorial asymmetric composition
- `06 / Adjacent` = cobalt blue
- `07 / Wildcard` = saturated orange
- LAB-03–06 是 production 视觉 owner

不要重新引入：

- foil renderer
- spectral renderer
- standalone compression artifact renderer
- 用来对抗这些实验的 restore / override CSS

历史上这些层同时加载会造成透明 card、06/07 颜色丢失、反向滚动 ghost 和 specificity 冲突。

核心文件：

```text
src/app/today/
src/components/frontier/today-motion-production.tsx
src/components/frontier/today-stage-scroll-controller.tsx
src/components/frontier/today-signal-weave.tsx
src/components/frontier/motion-lab/
src/app/qa/motion-lab/
```

---

## 5. Signal Weave 当前合同

Signal Weave 的作用是让用户看到：

```text
7 Daily Signals → 3 higher-level patterns → Final Take
```

保留：

- 一个统一 synthesis field
- signal ribbon/thread 的关系可读性
- hover / pin 后强调关系但不完全删除上下文
- Final Take 在同一 scene 内收束

不要回到：

- 三张普通 pattern card
- Pattern 01/02/03 分页
- 黑色 cyberpunk dashboard
- 用巨大 typography 代替关系结构

---

## 6. `/project/[id]` 当前合同

五阶段：

```text
01 CAPTURE
02 EVIDENCE
03 INTERROGATION
04 RESOLUTION
05 BUILD
```

### 01 Capture

目标：第一眼就让用户想继续调查。

当前认可：

- 大型 editorial headline
- dossier / evidence stack
- foil / paper / cobalt / orange material language
- cursor / parallax / scanning response
- 用户完全不动时也持续 idle motion
- 顶部 nav 透明融入页面

### 02 Evidence

目标：回答“Radar 为什么相信这个项目”。

- 强调 source / evidence traceability
- 可检视，而不是文章列表或 dashboard

### 03 Interrogation

保护级视觉锚点：

- saturated orange field
- giant background typography
- 连续 analysis sheets
- 黑片约 `rgba(8,8,8,.65)`
- 背景应透过黑片可见
- 内部连续 scrub
- idle motion 持续

不要随手重做这一幕。

### 04 Resolution

目标：把 Evidence + Interrogation 压缩成决策。

- 7 个 score dimension
- central Frontier Verdict
- score label 当前已放大，保持可读
- attraction / pulse / convergence idle motion

它不是“再看一遍分数”的 dashboard，而是落锤页。

### 05 Build

目标：从理解进入行动。

- action direction
- Idea Lab path
- idle directional energy

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

## 7. 已明确放弃的视觉方向

这些分支可以研究，但不是当前 baseline：

```text
proto/project-intelligence-spatial-v1
proto/project-intelligence-kinetic-v1
```

### Spatial / full R3F world

放弃原因：

- 变成 3D technical demo
- 浮动几何体取代了产品的 editorial identity
- 技术复杂度增加，但信息意义没有同步增加

### Kinetic / transition bridge

放弃原因：

- fake transition object 变成肉眼可见的“中间页”
- 大色块破坏连续性
- 继续修补会重新形成 CSS patch stack

当前偏好：

```text
real content + shared continuity + restrained 2.5D + meaningful idle motion
```

---

## 8. Supabase / Daily Synthesis

Production 已存在 migration：

```text
20260808144951_daily_synthesis_snapshots
```

仓库 migration history 已在主干整合前与 production 对齐。

不要重新创建另一个 `0016_daily_synthesis_snapshots` 版本造成 migration drift。

---

## 9. 开发流程

新任务：

```text
git checkout main
git pull
# create a short-lived feature/fix/docs branch
```

建议发布：

```text
feature branch
  ↓
Vercel Preview
  ↓
PR + CI
  ↓
main
  ↓
Production
```

不要长期把某个手动 Promote 的 Preview 当正式 source of truth。

### 提交前

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

对于 motion / visual 工作：

**机器 PASS ≠ Visual PASS。**

必须在真实浏览器检查对应路径、正反向滚动、慢滚和快速触控板惯性。

---

## 10. Scope discipline

- 先找状态 owner，再加代码。
- 优先删除冲突 owner，不要继续叠高 specificity CSS。
- 视觉任务不要顺手重写推荐逻辑。
- 滚动任务不要顺手重画视觉。
- 不复活已冻结的实验 renderer。
- 不 force-push，除非 owner 明确要求。
- 无法验证的场景明确写“未验证”。

---

## 11. 主要路由

| 路径 | 用途 |
| --- | --- |
| `/` | 重定向 `/today` |
| `/today` | Daily Radar / Today’s 7 / Signal Weave |
| `/explore` | 历史发现 |
| `/saved` | 收藏与笔记 |
| `/idea-lab` | Build / 灵感工作区 |
| `/project/[id]` | Project Intelligence |
| `/qa/motion-lab` | Today motion QA fixture |
| `/api/health` | 健康检查 |

---

## 12. 文档优先级

如果旧文档与当前状态冲突：

```text
main 当前代码
+ docs/START-HERE.md
+ 最新 checkpoint
  > README.md / AGENTS.md
  > 历史 PRD / PHASES / prototype branch notes
```

历史文档不会因为过时就全部删除，它们用于保留设计和架构决策背景。
