# Frontier Radar — Production Checkpoint — 2026-08-12

> 这是 2026-08-12 的最新生产状态记录。
>
> 若本文件与 2026-08-10 或更早 checkpoint 冲突，以 **live `main` + Production + 本 checkpoint** 为准。
>
> 历史 checkpoint 不删除，只用于保留当时的设计与整合背景。

## 1. 当前 source of truth

优先级：

```text
1. live GitHub main
2. live Vercel Production
3. live Supabase Production
4. recent CI / browser QA evidence
5. this checkpoint / docs/START-HERE.md
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

Supabase Production：

```text
project: frontier-radar
ref: grnorpdbdrmfrdjeorvz
region: ap-southeast-1
```

---

## 2. 产品核心

Frontier Radar 是个人 Frontier Intelligence 系统：

```text
Discover frontier signals
  ↓
Understand them
  ↓
Save worthwhile intelligence
  ↓
Turn it into personal research / product directions
```

核心循环：

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

设计语言：

```text
Frontier Intelligence × Physical Archive × Research Instrument
```

避免重新滑向 generic SaaS dashboard、bento grid、PPT hero、重玻璃拟态、无语义 motion。

---

## 3. FROZEN / accepted product surfaces

### Explore — FROZEN

正式方向：

```text
B Version / Field-first Explore / CURRENT FRONTIER FIELD
```

核心：中央 kraft-paper dossier、外围 frontier signals、radar/spatial field、Radar Lens、morph search。

交互语义：

```text
MORE LIKE THIS
LESS LIKE THIS
ARCHIVE · SAVE / SAVED
OPEN INTELLIGENCE
```

`MORE LIKE THIS` 是 personalization signal，不等于 `SAVE`。

### Saved — VISUAL PASS + INTERACTION PASS + FROZEN

Metaphor：

```text
PRIVATE RESEARCH SHELF
```

当前 v1 是浏览器本地状态：

```text
localStorage key: frontier_radar_saved_items_v1
file: src/lib/saved/browser.ts
```

这是当前明确接受的 v1 合同，不要未经 scope reopening 改成 Supabase storage。

### Idea Lab — VISUAL PASS + INTERACTION PASS + FROZEN

Metaphor：

```text
Signal-to-Direction Workbench
```

Flow：

```text
Saved Signal → Pinned Signal → Working Note → Personal Direction
```

状态只允许：

```text
SEED / SHAPING / BUILDING
```

当前 v1 同样是浏览器本地状态：

```text
localStorage key: frontier_radar_ideas_v1
file: src/lib/ideas/browser.ts
```

关键绑定：

```text
activeIdea.sourceItemId === selectedSource.id
```

Project Intelligence → Idea Lab 通过：

```text
/idea-lab?from=<source-item-id>
```

必须 honor exact source；不得偷偷 fallback 到另一个 Saved signal。

### Orphan contract — accepted

若 Saved source 在 Idea 已存在后被移除：

- Idea 保留。
- Pinned source 显示 `SOURCE NO LONGER SAVED`。
- 用户工作不能因 source removal 被删除。

---

## 4. Today / Signal Weave frozen contracts

Today stage state machine：

```text
Hero continuous
  ↓
Compression locked
  ↓
Today’s 7 locked
  ↓
Signal Weave continuous
```

必须保持：

- one physical gesture max one intermediate stage
- inertia cannot jump stages
- transition locks input
- reverse symmetric
- Signal Weave 内部恢复 continuous scroll
- synthesis 数据准备中时 synthesis scene 仍可进入
- `06 Adjacent` = cobalt blue
- `07 Wildcard` = saturated orange
- LAB-03–06 是 production visual owner

不要复活 foil / spectral / standalone compression artifact renderers。

Signal Weave：

```text
7 Daily Signals → 3 higher-level patterns → Final Take
```

保持一个统一 synthesis field；hover/pin 只强调关系，不删除整体上下文。

---

## 5. Project Intelligence frozen contract

五阶段：

```text
01 CAPTURE
02 EVIDENCE
03 INTERROGATION
04 RESOLUTION
05 BUILD
```

不要无目的重做 03 Interrogation 或其他已验收视觉。

Gate 9 / Gate 10 已建立并完成结构/功能修复：

- Today → Project Intelligence 保持 exact ID handoff。
- Project Intelligence → Idea Lab 保持 exact `from=<id>` source handoff。
- 当前 `main` commit `c8a4628a...` 即包含 Gate 10 修复。

Production exact chain 曾验证目标：

```text
Supply-Wizard; Start Selling Data with an Easy Vendor Checklist
id = e71d7eb5-f29e-4eeb-b17a-1c55ae21f033
```

完整 ID 链路结构 PASS。

注：最新正式 production click visual closure 仍不要在没有新浏览器证据时伪称 PASS。

---

## 6. Current browser integration protection

`e2e/integration-qa.spec.ts` 当前永久保护：

```text
Explore → Saved → Idea Lab
```

包括：

- save
- Saved reload persistence
- Idea create/edit/status
- Direction → source binding
- Saved removal
- orphan preservation
- reload persistence

Gate 9/10 的 deterministic cross-surface handoff 仍建议后续正式进入 main CI，而不是只留在 QA branch 历史。

---

## 7. Gate 11A — Preview / Production Data Isolation

当前工作分支：

```text
fix/gate11a-production-data-isolation
PR #18 — Draft / not merged
```

目标：

```text
Preview / Development may read realistic production data,
but must not persist runtime state into Production Supabase.
```

当前实现覆盖三类 runtime write ingress：

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

阻塞原因：Vercel Free plan 当日 deployment quota 超过 100 次；不是代码失败。

最新 Gate 11A head 在本 checkpoint 创建前为：

```text
b9a65ef335b6c510075e3243204577b3b0cdf32f
```

CI #329：

```text
Typecheck PASS
ESLint PASS
Tests PASS
Next Build PASS
```

Do not merge PR #18 until latest Preview runtime verification completes and owner explicitly approves.

---

## 8. Production Supabase security audit

当前实际访问模型：

```text
locked base tables + intentionally public frontier_feed_v1 read view
```

已验证：

- 当前 public base tables 均启用 RLS。
- anon/authenticated 没有 application base tables 的 SELECT/INSERT/UPDATE/DELETE。
- anon 可以 SELECT `frontier_feed_v1`。
- anon 直接 SELECT `public.items` 被拒绝。
- admin client secret 只走 server-side env。

后续 hardening backlog（不是 Gate 11A runtime leak）：

1. `frontier_feed_v1` 被 Security Advisor 标为 Security Definer View ERROR。
2. `public.rls_auto_enable()` 是 SECURITY DEFINER，anon/authenticated 仍可 EXECUTE。
3. legacy/default ACL 比当前实际需要更宽，应改成 explicit opt-in。
4. `touch_updated_at()` / `touch_items_last_updated_at()` 应固定 search_path。

不要在未设计 public read boundary 前直接把 `frontier_feed_v1` 粗暴改成 `security_invoker=true`，否则 Today / Explore 可能失去底层读取能力。

---

## 9. Personal state / personalization reality

### Saved / Ideas

Production DB 中的 `saved_items / ideas / idea_items` 当前不是 v1 的用户状态 source of truth。

v1 实际状态仍是 browser localStorage。

战略含义：

- 换设备/浏览器不会自动同步。
- 清 localStorage 会丢失。
- 这是 v1 限制，不是当前 bug。

后续需要 owner 明确选择：

```text
A. browser-local + export / backup / import
B. Supabase synced personal state
```

### Personalization

当前 feedback 是真实 production 能力，但身份以 browser visitor UUID 为主，不是 durable person identity。

因此跨浏览器/设备会产生 profile fragmentation。

不要在 identity / QA isolation 未解决前优先投入 semantic embedding 扩张。

---

## 10. Collection observability debt

Production 曾观察到历史 `collection_runs` 有长时间停留在 `running` 的旧记录，而后续同 source 新 run 已成功。

后续需要 stale-run reconciliation / timeout terminalization。

不要在修复生命周期前直接删除历史记录。

---

## 11. 开发 / 发布纪律

默认：

```text
latest main
  ↓
short-lived feature/fix/docs branch
  ↓
Preview
  ↓
PR + CI
  ↓
explicit owner approval
  ↓
main
  ↓
Production
```

红线：

- 一次一个 Gate。
- 不 force-push。
- 不把 machine PASS 说成 visual PASS。
- 不自动 merge。
- 不无目的 reopen FROZEN surfaces。
- 不做 destructive cleanup，除非 owner 明确批准。
- 无法验证的状态必须明确写“未验证 / blocked”。

---

## 12. 下一步优先级

当前仍然先关闭 Gate 11A：

```text
Vercel quota restores
  ↓
record Production DB baseline
  ↓
run latest Preview Today / feedback / cron checks
  ↓
Production DB must have zero new Preview writes
  ↓
Gate 11A CLOSED
```

之后再进入 schema hardening / collector lifecycle / permanent Gate 9–10 regression / personal memory durability 等后续工作。
