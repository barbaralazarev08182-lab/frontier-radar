# Frontier Radar — START HERE

> 给第一次接触这个仓库的协作者。
>
> 更新时间：**2026-08-12**  
> 当前状态：**Today / Signal Weave / Project Intelligence / Explore / Saved / Idea Lab 已形成完整产品链；Explore、Saved、Idea Lab 已冻结。Gate 11A 正在做 Production data isolation，代码与 CI 已过，最新 Preview runtime check 被 Vercel 当日部署配额阻塞。**

---

## 1. 先记住 source of truth

优先级：

```text
1. live GitHub main
2. live Vercel Production
3. live Supabase Production
4. recent CI / browser QA evidence
5. docs/START-HERE.md + latest checkpoint
6. older checkpoints / historical PR notes
```

当前 `main`：

```text
c8a4628a715e83ff97f2e7754288a2811a0d6dc4
Honor Project Intelligence source handoff in Idea Lab
```

Production：

```text
https://frontier-radar-eosin.vercel.app
```

最新 checkpoint：

```text
docs/checkpoints/2026-08-12-production-checkpoint.md
```

不要看到 `proto/*` 分支提交更多就默认它更新。那些分支主要保留设计实验和历史过程。

---

## 2. 一句话理解产品

**Frontier Radar 是一个个人 Frontier Intelligence 系统。**

它不是普通 AI 新闻聚合器，也不是热门项目榜单。核心循环：

```text
Discover → Understand → Get Inspired → Build
```

当前主体验：

```text
candidate pool
  ↓
Today’s 7
  ↓
Signal Weave
  ↓
Project Intelligence
  ↓
Saved / Idea Lab / Build
```

Global nav：

```text
TODAY / EXPLORE / SAVED / IDEA LAB
```

产品原则：

- Discovery > Search
- Rising > Popular
- Idea Spark > 纯热度
- Projects / demos > 被动内容（质量相近时）
- 保留 Adjacent / Wildcard，避免推荐越学越窄
- AI 用于解释、综合和判断，不用于堆“聪明文案”
- motion 必须表达信息状态或阶段语义

设计语言：

```text
Frontier Intelligence × Physical Archive × Research Instrument
```

避免 generic SaaS dashboard、bento grid、PPT hero、重玻璃拟态、无信息语义的动效。

---

## 3. 数据与推荐链路

当前来源：

- GitHub
- Hugging Face（Spaces-first）
- Show HN
- Product Hunt
- arXiv

数据流：

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

## 4. `/today` 当前合同 — FROZEN behavior

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

---

## 5. Signal Weave 当前合同

作用：

```text
7 Daily Signals → 3 higher-level patterns → Final Take
```

保留：

- 一个统一 synthesis field
- signal ribbon/thread 的关系可读性
- hover / pin 后强调关系但不完全删除上下文
- Final Take 在同一 scene 内收束

不要回到普通三张 pattern card、Pattern 分页、黑色 cyberpunk dashboard 或只靠大字代替关系结构。

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

### 02 Evidence

目标：回答“Radar 为什么相信这个项目”。

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

把 Evidence + Interrogation 压缩成决策，而不是再做一张 dashboard。

### 05 Build

把理解转成下一步行动 / Idea Lab。

Project Intelligence → Idea Lab handoff：

```text
/idea-lab?from=<source-item-id>
```

当前 `main` 已要求 honor exact source；不得 silently substitute 另一个 Saved signal。

---

## 7. `/explore` — FROZEN

正式方向：

```text
B Version / Field-first Explore / CURRENT FRONTIER FIELD
```

核心表达：中央 kraft-paper dossier + peripheral frontier signals + radar/spatial field + Radar Lens + morph search。

交互语义：

```text
MORE LIKE THIS
LESS LIKE THIS
ARCHIVE · SAVE / SAVED
OPEN INTELLIGENCE
```

`MORE LIKE THIS` 是 personalization signal，**不等于 SAVE**。

除非用户明确 reopen scope 或出现 integration bug，不要重新设计 Explore。

---

## 8. `/saved` — VISUAL PASS + INTERACTION PASS + FROZEN

Metaphor：

```text
PRIVATE RESEARCH SHELF
```

当前 v1 存储：

```text
browser localStorage
key = frontier_radar_saved_items_v1
file = src/lib/saved/browser.ts
```

这是接受的 v1 合同。

不要未经明确 scope reopening 把 Saved 改成 Supabase 同步。

---

## 9. `/idea-lab` — VISUAL PASS + INTERACTION PASS + FROZEN

Metaphor：

```text
Signal-to-Direction Workbench
```

Flow：

```text
Saved Signal → Pinned Signal → Working Note → Personal Direction
```

状态严格为：

```text
SEED / SHAPING / BUILDING
```

当前 v1 存储：

```text
browser localStorage
key = frontier_radar_ideas_v1
file = src/lib/ideas/browser.ts
```

关键 binding：

```text
activeIdea.sourceItemId === selectedSource.id
```

### Exact source handoff

`/idea-lab?from=<id>` 必须选中请求的 exact source。

- source 在 Saved：选中它。
- source 已从 Saved 移除但已有 Idea：保留 orphan Idea。
- source 不在 Saved 且没有 Idea：显示 `SOURCE NOT IN SAVED`。
- 不自动 save。
- 不 fallback 到其他 Saved signal。

### Orphan behavior

Saved source 被移除后：

- Idea 持续存在。
- Pinned source 显示 `SOURCE NO LONGER SAVED`。
- 用户工作不能因 source removal 被删除。

---

## 10. Gate 9 / Gate 10 handoff 状态

### Gate 9

Today → Project Intelligence exact ID handoff：结构/功能已完成。

### Gate 10

Project Intelligence → Idea Lab `from=<id>` exact source handoff：已进入 `main`。

当前 `main`：

```text
c8a4628a715e83ff97f2e7754288a2811a0d6dc4
```

不要在没有新浏览器证据时把“结构 PASS”写成“最新 production visual PASS”。

---

## 11. Gate 11A — Preview / Production Data Isolation

当前 branch：

```text
fix/gate11a-production-data-isolation
```

PR：

```text
#18 — Draft / not merged
```

目标：

```text
Preview / Development may read realistic Production data
but must not persist runtime state into Production Supabase.
```

当前已覆盖三类 runtime write ingress：

1. Today synthesis success/failure persistence
2. `/api/feedback` + personalization rebuild
3. `/api/cron/*` ingestion / analysis / scoring / materialization

当前状态：

```text
WRITE-PATH AUDIT PASS
IMPLEMENTATION PASS
CI PASS
LATEST PREVIEW RUNTIME CHECK BLOCKED
```

最新 Preview runtime check 被 Vercel Free plan 当日 deployment quota 阻塞，不是代码失败。

PR #18 在以下条件满足前不要 merge：

```text
latest Preview deploy succeeds
  ↓
record Production DB baseline
  ↓
exercise Today / feedback / cron on Preview
  ↓
Production DB = zero new Preview writes
  ↓
owner explicitly approves merge
```

---

## 12. Production Supabase 当前访问模型

当前实际模型：

```text
locked base tables + intentionally public frontier_feed_v1 read view
```

已验证：

- 当前 public base tables 均启用 RLS。
- anon/authenticated 没有 application base tables 的 SELECT/INSERT/UPDATE/DELETE。
- anon 可以 SELECT `frontier_feed_v1`。
- anon 直接 SELECT `public.items` 被拒绝。
- admin Supabase client secret 只走 server-side env。

### Security hardening backlog

以下是后续 defense-in-depth，不是当前 Gate 11A runtime leak：

1. `frontier_feed_v1` Security Definer View ERROR。
2. `public.rls_auto_enable()` SECURITY DEFINER 且 anon/authenticated 可 EXECUTE。
3. legacy/default ACL 比实际需要更宽。
4. `touch_updated_at()` / `touch_items_last_updated_at()` search_path 未固定。

不要直接把 `frontier_feed_v1` 粗暴改为 `security_invoker=true`；当前底表本身不给 anon SELECT，这样可能直接打断 Today / Explore。

---

## 13. Personal state reality

### Saved / Ideas

当前 v1 是 localStorage，不是 durable cross-device personal memory。

这意味着：

- 换浏览器/设备不会自动同步。
- 清 localStorage 会丢失。

这是当前 v1 限制，不是 bug。

未来必须明确选择：

```text
A. browser-local + export / backup / import
B. Supabase synced personal state
```

### Personalization

feedback / reranking 是真实 production 能力，但 identity 当前主要是 browser visitor UUID。

不同浏览器/设备会产生 profile fragmentation。

---

## 14. Integration QA

当前永久 e2e：

```text
e2e/integration-qa.spec.ts
```

保护：

```text
Explore → Saved → Idea Lab
```

包括：

- save
- Saved persistence
- Idea create/edit/status persistence
- Direction → source binding
- Saved removal
- orphan preservation
- reload persistence

Gate 9 / Gate 10 deterministic cross-surface handoff 仍建议后续进入 main CI，而不是只留在 QA branch 历史。

---

## 15. Collection observability debt

Production 曾存在旧 `collection_runs` 长时间停留 `running`，而后续同 source 新 run 已成功。

后续需要：

```text
stale-run timeout / reconciliation / terminalization
```

不要先删历史记录再修生命周期。

---

## 16. 开发流程

新任务：

```text
git checkout main
git pull
# create a short-lived feature/fix/docs branch
```

建议发布：

```text
feature/fix branch
  ↓
Vercel Preview
  ↓
PR + CI
  ↓
explicit owner approval
  ↓
main
  ↓
Production
```

不要长期把某个手动 Promote 的 Preview 当正式 source of truth。

提交前：

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

对于 motion / visual 工作：

**机器 PASS ≠ Visual PASS。**

必须在真实浏览器检查对应路径与交互。

---

## 17. Scope discipline / 红线

- 一次一个 Gate。
- 先找状态 owner，再加代码。
- 优先删除冲突 owner，不要继续叠高 specificity CSS。
- 视觉任务不要顺手重写推荐逻辑。
- 滚动任务不要顺手重画视觉。
- 不复活已冻结的实验 renderer。
- 不无目的 reopen FROZEN Explore / Saved / Idea Lab / accepted Project Intelligence visuals。
- 不 force-push，除非 owner 明确要求。
- 不自动 merge。
- destructive cleanup 必须先获得 owner 明确批准。
- machine PASS、runtime PASS、production PASS、visual PASS 必须分开写。
- 无法验证的场景明确写“未验证 / blocked”。

---

## 18. 主要路由

| 路径 | 用途 |
| --- | --- |
| `/` | 重定向 `/today` |
| `/today` | Daily Radar / Today’s 7 / Signal Weave |
| `/explore` | CURRENT FRONTIER FIELD |
| `/saved` | PRIVATE RESEARCH SHELF |
| `/idea-lab` | Signal-to-Direction Workbench |
| `/project/[id]` | Project Intelligence |
| `/qa/motion-lab` | Today motion QA fixture |
| `/api/health` | 健康检查 |

---

## 19. 文档优先级

如果旧文档与当前状态冲突：

```text
live main / Production
+ docs/START-HERE.md
+ latest checkpoint
  > README.md / AGENTS.md
  > older checkpoints
  > historical PRD / PHASES / prototype branch notes
```

历史文档不会因为过时就全部删除，它们用于保留设计和架构决策背景。
