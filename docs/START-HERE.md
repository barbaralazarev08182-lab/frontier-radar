# Frontier Radar — START HERE

> 给第一次接触这个仓库的协作者。
>
> 更新时间：2026-08-10
>
> 当前阶段：**Today + Project Intelligence 两个核心体验已完成一轮视觉冻结，下一步进入干净整合与后续产品阶段。**

## 1. 一句话理解这个项目

**Frontier Radar 是一个个人化的前沿技术发现引擎。**

它不是普通 AI 新闻聚合器，也不是“热门项目排行榜”。它持续从多个技术来源发现正在变化的项目、Demo、模型、论文和工具，判断哪些值得提前关注，再把这些信号组织成用户可理解、可行动的 Frontier Intelligence。

长期产品链路：

```text
Discover → Understand → Get Inspired → Build
```

当前核心产品链：

```text
大量候选
  ↓
Today’s 7
  ↓
Signal Weave / patterns
  ↓
Project Intelligence
  ↓
Build / Idea Lab
```

---

## 2. 产品原则

- **Discovery > Search**：重点是发现用户不会主动搜索到的东西。
- **Rising > Popular**：变化、动量、早期迹象比绝对热度重要。
- **Idea Spark > 纯 Research Value**：理解之后最好能自然走向“我能拿它做什么”。
- **Projects > Articles**：可运行、可试玩、可复现、可延展的东西优先。
- **不要越推荐越窄**：长期保留 Adjacent / Wildcard 探索位。
- **AI 用于解释、筛选和综合，不制造虚假的确定性。**
- **动画用于组织信息和建立连续性，不只是装饰。**

---

## 3. 数据与推荐链路

当前主要来源：

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

公共 Discovery Score 当前核心维度：

1. Freshness
2. Domain Relevance
3. Momentum
4. Project Health
5. Novelty
6. Idea Spark
7. Tryability

Today 默认探索结构：

```text
5 Core + 1 Adjacent + 1 Wildcard
```

Adjacent / Wildcard 是产品机制，不是视觉装饰。

---

# 4. `/today` — 当前冻结体验

Today 不是普通卡片 Feed，而是一个滚动驱动的 editorial / motion experience。

当前章节合同：

```text
Hero                 continuous
  ↓
Compression          locked stable stage
  ↓ one physical gesture
Today’s 7            locked stable stage
  ↓ one physical gesture
Signal Weave         continuous synthesis scene
```

反向滚动需要严格对称。

### Hero

- 用户可以连续滚动，不是一滚就翻页。
- tear / typography / exit 跟随 scroll progress。

### Compression

- 是明确的稳定状态，不是 raw progress 的偶然截图。
- 基础视觉所有权来自原始 LAB-03–06。

### Today’s 7

- 7 条信号使用不对称 editorial composition。
- `06 / Adjacent` 保留 cobalt blue。
- `07 / Wildcard` 保留 saturated orange。

### Signal Weave

- 7 条 signal ribbon/thread → 3 个 pattern。
- Final Take 在同一场景完成收束。
- 不做三张 dashboard card，也不拆成 Pattern 01 / 02 / 03 三页。
- 最终 synthesis 章节应保持可进入，即使 synthesis 数据仍在加载；不要重新把导航能力绑死在 snapshot ready 上。

### Today 已明确废弃的实验

不要重新接回 production：

- foil experimental renderer
- spectral renderer
- standalone compression artifact renderer
- 为修这些 renderer 再叠的 restore / override CSS

这些层曾造成：

- compression 牌面透明
- 06 / 07 蓝橙丢失
- reverse scroll foil ghost
- CSS specificity 冲突

当前原则：

> **Production 做真实数据和交互适配；LAB-03–06 负责基础视觉。**

当前 Today 历史整合分支：

```text
proto/today-foil-candy-v4
```

把它视为已完成阶段的冻结基线，不要继续当作无限实验分支。

---

# 5. `/project/[id]` — Project Intelligence 冻结体验

这一阶段已经完成用户视觉验收。

当前五阶段：

```text
01 CAPTURE
02 EVIDENCE
03 INTERROGATION
04 RESOLUTION
05 BUILD
```

## 01 — Capture

目的：在第一屏制造足够强的兴趣，让用户愿意继续理解项目。

当前语言：

- 巨型 editorial headline
- dossier / evidence stack
- foil / paper / blue / orange material hints
- cursor / parallax / scan / idle motion
- 页面停住时仍持续有生命感

不要把它重做成 generic SaaS hero，也不要用完整 3D scene 替代当前平面/2.5D 设计。

## 02 — Evidence

目的：回答 **“为什么 Radar 相信它？”**

这里强调来源、证据、时间和可验证性。

设计原则：

- 不是文章列表。
- 不是 dashboard。
- source node / evidence object 应有明显层级和运动语义。

## 03 — Interrogation

当前最重要的视觉锚点之一。

- saturated orange field
- oversized background typography
- 多张 analysis sheet 连续 scrub
- 当前黑色 sheet 为约 **65% 黑色不透明度**，让背景橙色和后层结构透出来
- 用户一次连续 gesture 可以在内部自然推进，不要强制每一张都重新“翻页”
- 停止输入时场景仍有 idle motion

这一幕的核心视觉不要擅自推翻。

## 04 — Resolution

目的：**把 Evidence + Interrogation 压缩成最终判断。**

它不是“又看一遍分数”。

当前结构：

- 7 个评分维度在场景外围形成决策场
- 中央 `FRONTIER VERDICT`
- 例如 `WATCH / EARLY SIGNAL`
- score / pressure / convergence idle effects 持续运行

评分名称需要保持清楚可读，目前已经专门放大。

## 05 — Build

目的：把理解转成下一步行动。

- 不再继续解释项目。
- 让用户选择如何使用、延展、组合这个信号。
- 与 Idea Lab / Build workflow 形成产品闭环。

## Project Intelligence 当前实现边界

主要文件：

```text
src/app/project/[id]/page.tsx
src/app/project/[id]/layout.tsx
src/app/project/[id]/project-intelligence.css
src/app/project/[id]/project-intelligence-effects.css
src/app/project/[id]/project-intelligence-capture.css
src/app/project/[id]/project-intelligence-refinements.css
src/components/frontier/project-intelligence-motion.tsx
```

当前冻结分支：

```text
proto/project-intelligence-rebuild-v1
```

视觉代码基线（后续 docs-only commit 之前）：

```text
e423b0b0f105b7daa5cc00935e236ea250d6d30e
```

### 明确失败 / 放弃的 Project Intelligence 实验

以下不是当前方向：

- `proto/project-intelligence-spatial-v1`
  - 完整 R3F / 3D world 方向
  - 结果偏技术 demo、几何体展示，破坏 Frontier Radar 的 editorial identity
- `proto/project-intelligence-kinetic-v1`
  - 多轮 bridge / transition experiment
  - 曾出现 transition bridge 暴露成独立中间页、巨大色块等问题
- 更早 `proto/project-intelligence-v1`
  - 仅作历史参考

不要从这些分支直接复制视觉系统回当前实现。

---

# 6. 动效总原则

Today 和 Project Intelligence 都已经验证一个共同结论：

**不要把“更多特效”当成设计。**

优先级：

1. 章节语义
2. 稳定构图
3. shared continuity / transition
4. idle motion
5. cursor response
6. material / shader embellishment

当前要求：

- 用户不动时，当前 scene 也应保持有生命感。
- transition 期间 idle animation 应暂停或降级，避免抢 GPU。
- 不用 full-screen blur / bloom / fog 作为“高级感”。
- 不用完整 WebGL/3D 世界去替代本来已经清楚的 editorial structure。
- 不用巨型 typography 代替结构设计。

---

# 7. 分支状态与后续整合

`main` 是默认分支，但**当前最终体验还没有完成一次干净 release integration**。

截至 2026-08-10：

```text
main
  └─ 仓库入口 / 相对稳定基线

proto/today-foil-candy-v4
  └─ Today 完成阶段历史基线

proto/project-intelligence-rebuild-v1
  └─ Project Intelligence 当前冻结基线
```

当前 `proto/project-intelligence-rebuild-v1` 和 `main` 已明显 diverged；不要直接把完整实验历史硬 merge 到 main。

下一步请读：

[`docs/INTEGRATION-PLAN-2026-08-10.md`](INTEGRATION-PLAN-2026-08-10.md)

核心策略：

> 从最新 main 建干净 integration branch，只带入最终需要的代码和迁移；历史实验留在历史分支。

---

# 8. Vercel / 部署约束

当前 GitHub commit status 显示最终 Project Intelligence branch 的 Vercel 构建为 Success。

但需要注意：

- Hobby + private repo + collaborator commit author 可能出现 `Deployment Blocked`。
- 这是访问/身份问题，不等于 Next.js build failure。
- 不要长期依赖“某个 Preview 手工 Promote 成 Production”作为正式发布流程。
- 最终目标应是：**main → Production 是唯一明确正式链路。**
- Production / Preview 环境变量要分别检查作用范围。

Vercel 配置整理完成前，不要因为部署身份问题改业务代码。

---

# 9. 主要路由

| 路径 | 用途 |
| --- | --- |
| `/` | 重定向到 `/today` |
| `/today` | Daily Radar / Today’s 7 / Signal Weave |
| `/explore` | 历史发现与筛选 |
| `/saved` | 收藏与笔记 |
| `/idea-lab` | Build / inspiration workflow |
| `/project/[id]` | Project Intelligence |
| `/qa/motion-lab` | Today motion / interaction QA fixture |
| `/api/health` | 健康检查 |

---

# 10. 本地启动与检查

本仓库使用 npm + `package-lock.json`。

```bash
npm install
npm run dev
```

检查：

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

**机器 PASS 不代表视觉 PASS。**

涉及 motion / transition / scroll / layout 的修改必须尽量在真实浏览器检查：

- 正向完整路径
- 反向完整路径
- 慢滚
- 快速触控板 fling
- idle 5–10 秒
- resize / desktop viewport
- production data 与 fixture 差异

---

# 11. 协作开发规则

开始任务前：

1. 确认目标 branch / HEAD。
2. 明确任务属于数据、滚动、visual、transition 还是 deployment。
3. 先读当前 owner 文件，不要凭截图另起一整套 renderer。

修改时：

- 一次只解决一个层级的问题。
- 不擅自重做已经视觉验收的 stage。
- 不用更高 specificity 的 CSS 去遮结构问题。
- 不从失败实验分支复制整套视觉系统。
- 不在视觉任务里顺手改推荐/数据。
- 不 force push，除非 owner 明确要求。

完成时至少说明：

- 根因
- 修改文件
- 浏览器验证
- typecheck / lint / tests / build
- commit SHA
- 未验证项

无法验证就写“未验证”，不要伪造 PASS。

---

# 12. 文档阅读顺序

1. 本文件 `docs/START-HERE.md`
2. `docs/checkpoints/2026-08-10-experience-freeze.md`
3. `AGENTS.md`（coding agent / Codex）
4. `docs/INTEGRATION-PLAN-2026-08-10.md`
5. `docs/checkpoints/2026-08-08-frontier-radar-checkpoint.md`
6. `docs/DATA-SOURCES.md`
7. `docs/SCORING.md`
8. `docs/RISKS.md`

`docs/PRD.md` 和 `docs/PHASES.md` 是早期历史基线，不代表当前全部产品状态。

如果文档冲突，优先级：

```text
当前代码 + START-HERE + 最新 checkpoint
  > README / AGENTS
  > 早期 PRD / PHASES
```
