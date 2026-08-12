# Frontier Radar

**A personalized frontier intelligence system for discovering what is becoming worth attention — and turning it into research or product directions.**

Frontier Radar 不是普通 AI 新闻聚合器，也不是 GitHub 热榜。它从多个技术来源发现正在变得值得关注的项目、Demo、模型、论文和工具，通过评分、个性化、跨来源证据与 synthesis 形成一条完整链路：

```text
Discover → Understand → Get Inspired → Build
```

> 新协作者先读 [`docs/START-HERE.md`](docs/START-HERE.md)。
>
> Coding agent / Codex 还应阅读 [`AGENTS.md`](AGENTS.md)。
>
> 最新 Production 状态：[`docs/checkpoints/2026-08-12-production-checkpoint.md`](docs/checkpoints/2026-08-12-production-checkpoint.md)。
>
> 2026-08-10 体验冻结与主干整合记录仍保留为历史背景，不再代表最新状态。

---

## 当前正式基线

截至 **2026-08-12**：

```text
main = production source of truth / 新任务默认起点
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

当前产品主体验：

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

设计语言：

```text
Frontier Intelligence × Physical Archive × Research Instrument
```

旧 `proto/*` 分支只用于设计考古，**不要作为新任务默认开发基线**。

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

Adjacent / Wildcard 用于避免个性化越学越窄。

---

## 2. `/today` — Daily Radar

Today 的正式状态机：

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

- 一个真实 wheel / trackpad gesture 最多推进一个中间章节。
- 惯性不能跳 stage。
- transition 期间锁输入。
- 正反向对称。
- Signal Weave 进入后恢复连续内部滚动。
- synthesis 数据尚未准备好时，synthesis scene 仍可进入。
- `06 / Adjacent` = cobalt blue。
- `07 / Wildcard` = saturated orange。
- LAB-03–06 是 production 视觉 owner。

已经退出 production 的实验层不要重新加载：

- foil renderer
- spectral renderer
- standalone compression artifact renderer

Signal Weave 保持：

```text
7 Daily Signals → 3 higher-level patterns → Final Take
```

---

## 3. `/project/[id]` — Project Intelligence

五阶段合同：

```text
01 CAPTURE
02 EVIDENCE
03 INTERROGATION
04 RESOLUTION
05 BUILD
```

已认可视觉与转场不要无目的重构，尤其不要随手重做 03 Interrogation。

Project Intelligence → Idea Lab 通过：

```text
/idea-lab?from=<source-item-id>
```

当前 `main` 已修复 exact source handoff：不得偷偷 fallback 到另一个 Saved signal。

---

## 4. `/explore` — FROZEN

正式方向：

```text
B Version / Field-first Explore / CURRENT FRONTIER FIELD
```

核心语义：

```text
MORE LIKE THIS
LESS LIKE THIS
ARCHIVE · SAVE / SAVED
OPEN INTELLIGENCE
```

`MORE LIKE THIS` 是 personalization signal，**不等于 SAVE**。

当前 Explore 已 FROZEN。除非用户明确 reopen scope 或出现 integration bug，不要重新设计。

---

## 5. `/saved` — VISUAL PASS + INTERACTION PASS + FROZEN

Metaphor：

```text
PRIVATE RESEARCH SHELF
```

当前 v1 使用浏览器 localStorage：

```text
key: frontier_radar_saved_items_v1
file: src/lib/saved/browser.ts
```

这是当前明确接受的 v1 存储合同，不要未经 scope reopening 改成 Supabase。

---

## 6. `/idea-lab` — VISUAL PASS + INTERACTION PASS + FROZEN

Metaphor：

```text
Signal-to-Direction Workbench
```

Flow：

```text
Saved Signal → Pinned Signal → Working Note → Personal Direction
```

状态：

```text
SEED / SHAPING / BUILDING
```

当前 v1 同样使用 browser localStorage：

```text
key: frontier_radar_ideas_v1
file: src/lib/ideas/browser.ts
```

关键 binding：

```text
activeIdea.sourceItemId === selectedSource.id
```

若 Saved source 被移除但 Idea 已存在：

- Idea 保留。
- Pinned source 显示 `SOURCE NO LONGER SAVED`。
- 用户工作不能被删除。

---

## 7. Gate 11A — Preview / Production Data Isolation

当前工作：

```text
branch: fix/gate11a-production-data-isolation
PR #18: Draft / not merged
```

目标：Preview / Development 可以读取真实 production 数据用于 QA，但不能把运行时状态写回 Production Supabase。

目前已覆盖三类 runtime write ingress：

1. Today daily synthesis
2. `/api/feedback` + personalization rebuild
3. `/api/cron/*` ingestion / analysis / scoring / materialization

当前状态：

```text
WRITE-PATH AUDIT PASS
IMPLEMENTATION PASS
CI PASS
LATEST PREVIEW RUNTIME CHECK BLOCKED
```

阻塞原因是 Vercel Free plan 当日 deployment quota，**不是代码失败**。

PR #18 在完成 latest Preview runtime verification 且 owner 明确批准之前不得 merge。

---

## 8. Production Supabase access model

当前实际模型：

```text
locked base tables + intentionally public frontier_feed_v1 read view
```

已验证当前 application base tables 对 anon/authenticated 没有 SELECT/INSERT/UPDATE/DELETE；公开读入口是 `frontier_feed_v1`。

后续 hardening backlog：

- `frontier_feed_v1` Security Definer View
- `rls_auto_enable()` public execute privilege
- legacy/default ACL 过宽
- trigger function mutable search_path

这些是防御纵深工作，不等于当前存在匿名底表读写漏洞。

---

## 9. 分支与发布策略

```text
main
  └─ production source of truth

feature/* / fix/* / docs/*
  └─ short-lived PR branches

proto/*
  └─ historical experiments only
```

推荐发布链：

```text
latest main → short-lived branch → Preview → PR + CI → explicit approval → main → Production
```

不要长期依赖手动 Promote 某个 Preview 作为正式版本来源。

---

## 10. 技术栈

- Next.js 16 / App Router
- React 19
- TypeScript strict
- Tailwind CSS
- Supabase PostgreSQL
- Vercel
- OpenAI-compatible AI Provider abstraction
- npm + `package-lock.json`

---

## 11. 本地启动与检查

要求：Node.js ≥ 20。

```bash
npm install
npm run dev
```

常用页面：

```text
http://localhost:3000/today
http://localhost:3000/explore
http://localhost:3000/saved
http://localhost:3000/idea-lab
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

## 12. 环境变量

复制 `.env.example` 为 `.env.local`。

- 不提交 `.env.local`。
- 真实 key 不写入 Git、Markdown、issue、测试 fixture 或截图。
- 只有 `NEXT_PUBLIC_*` 可暴露给浏览器。
- Secret / service role / GitHub token / AI key 只能在服务端使用。

主要变量：

| 变量 | 用途 |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase public URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 浏览器/公开只读 Supabase key |
| `SUPABASE_SECRET_KEY` | 服务端数据库权限 |
| `SUPABASE_SERVICE_ROLE_KEY` | 旧 service-role fallback |
| `GITHUB_TOKEN` | GitHub collector |
| `AI_BASE_URL` / `AI_API_KEY` / `AI_MODEL` | AI provider 配置 |
| `CRON_SECRET` | Cron 鉴权 |

---

## 13. 主要路由

| 路径 | 说明 |
| --- | --- |
| `/` | 重定向到 `/today` |
| `/today` | Daily Radar / Today’s 7 / Signal Weave |
| `/explore` | CURRENT FRONTIER FIELD |
| `/saved` | Private Research Shelf |
| `/idea-lab` | Signal-to-Direction Workbench |
| `/project/[id]` | Project Intelligence |
| `/qa/motion-lab` | Today motion / visual QA fixture |
| `/api/health` | 健康检查 |

---

## 14. 协作红线

1. 一次一个 Gate。
2. 先确认 branch / HEAD，再改代码。
3. 不无目的 reopen FROZEN surfaces。
4. 不复活已退出 production 的 renderer。
5. 视觉、滚动、数据尽量分层修改。
6. 不把机器 PASS 说成浏览器视觉 PASS。
7. 不 force-push，除非 owner 明确要求。
8. 不自动 merge。
9. destructive cleanup 必须先获得 owner 明确批准。
10. 无法验证的状态明确写“未验证 / blocked”。

更完整规则见 [`docs/START-HERE.md`](docs/START-HERE.md)、[`AGENTS.md`](AGENTS.md) 和最新 Production Checkpoint。
