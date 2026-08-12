# Frontier Radar — START HERE

> 更新时间：**2026-08-12**  
> 当前状态：**核心产品链已形成；Explore / Saved / Idea Lab 已冻结；Gate 11A 已完成 Preview→Production runtime write isolation 验收并通过 PR #18 合并到 `main`。**

---

## 1. Source of truth

优先级：

```text
1. live GitHub main
2. live Vercel Production
3. live Supabase Production
4. recent CI / runtime / browser QA evidence
5. docs/checkpoints/2026-08-12-production-checkpoint.md
6. this file / README
7. older checkpoints and historical PR notes
```

当前 `main`（本 checkpoint）：

```text
4293e5e9d1cf297651c624b266dbca2fcfedc038
Gate 11A: isolate Preview runtime writes from production data
```

Production：

```text
https://frontier-radar-eosin.vercel.app
```

截至 **2026-08-12 16:58 SGT**，Vercel deployment list 尚未观察到 merge commit `4293e5e9...` 对应的新 Production deployment。该状态只能写作“尚未观察到”，不能写成 deployment failure，也不能写成 Production 已完成更新。

旧 `proto/*` 只用于设计考古，不是新任务默认基线。

---

## 2. 产品一句话

**Frontier Radar 是一个个人 Frontier Intelligence 系统。**

```text
Discover → Understand → Get Inspired → Build
```

当前体验：

```text
candidate pool
→ Today’s 7
→ Signal Weave
→ Project Intelligence
→ Saved / Idea Lab / Build
```

Global nav：

```text
TODAY / EXPLORE / SAVED / IDEA LAB
```

设计语言：

```text
Frontier Intelligence × Physical Archive × Research Instrument
```

避免 generic SaaS dashboard、bento grid、PPT hero、重玻璃拟态和没有信息语义的 motion。

---

## 3. Discovery / ranking

Sources：

- GitHub
- Hugging Face（Spaces-first）
- Show HN
- Product Hunt
- arXiv

Today 默认：

```text
5 Core + 1 Adjacent + 1 Wildcard
```

Personal Match 是用户级重排，不等于公共 Discovery Score。

---

## 4. Today / Signal Weave — protected contract

```text
Hero continuous
→ Compression locked
→ Today’s 7 locked
→ Signal Weave continuous
```

必须保持：

- one physical gesture max one intermediate stage
- inertia cannot jump stages
- transition locks input
- reverse behavior symmetric
- Signal Weave restores continuous internal scroll
- synthesis scene remains enterable while synthesis prepares
- `06 Adjacent` cobalt blue
- `07 Wildcard` saturated orange
- LAB-03–06 owns production visual baseline
- do not resurrect foil / spectral / standalone compression artifact renderers

Signal Weave：

```text
7 Daily Signals → 3 higher-level patterns → Final Take
```

---

## 5. Project Intelligence — protected contract

```text
01 CAPTURE
02 EVIDENCE
03 INTERROGATION
04 RESOLUTION
05 BUILD
```

不要随手重做已接受的 visual / transition，尤其 03 Interrogation。

Project → Idea Lab：

```text
/idea-lab?from=<source-item-id>
```

必须 honor exact source；不得 silently fallback 到其他 Saved signal。

---

## 6. Explore — FROZEN

Formal direction：

```text
B Version / Field-first Explore / CURRENT FRONTIER FIELD
```

Actions：

```text
MORE LIKE THIS
LESS LIKE THIS
ARCHIVE · SAVE / SAVED
OPEN INTELLIGENCE
```

`MORE LIKE THIS` 是 personalization signal，不等于 SAVE。

---

## 7. Saved — VISUAL PASS + INTERACTION PASS + FROZEN

Metaphor：

```text
PRIVATE RESEARCH SHELF
```

Current v1 persistence：

```text
browser localStorage
frontier_radar_saved_items_v1
src/lib/saved/browser.ts
```

不要未经 scope reopening 改为 Supabase sync。

---

## 8. Idea Lab — VISUAL PASS + INTERACTION PASS + FROZEN

Metaphor：

```text
Signal-to-Direction Workbench
```

Flow：

```text
Saved Signal → Pinned Signal → Working Note → Personal Direction
```

Statuses：

```text
SEED / SHAPING / BUILDING
```

Current persistence：

```text
browser localStorage
frontier_radar_ideas_v1
src/lib/ideas/browser.ts
```

Binding：

```text
activeIdea.sourceItemId === selectedSource.id
```

Exact-source behavior：

- source in Saved → select exact source
- removed from Saved but Idea exists → preserve orphan Idea
- missing and no Idea → `SOURCE NOT IN SAVED`
- no auto-save
- no fallback

---

## 9. Gate 9 / Gate 10

- Gate 9: Today → Project exact ID handoff structurally/functionally closed.
- Gate 10: Project → Idea Lab exact source handoff merged to `main` in `c8a4628a...`.

Do not convert structural/machine evidence into visual PASS without browser evidence.

---

## 10. Gate 11A — CLOSED / MERGED

Merged PR：

```text
PR #18 — MERGED / CLOSED
merge commit = 4293e5e9d1cf297651c624b266dbca2fcfedc038
```

Goal：

```text
Preview / Development may read realistic Production data,
but must not persist runtime state into Production Supabase.
```

Covered write umbrellas：

1. Today synthesis persistence
2. `/api/feedback` + personalization rebuild
3. `/api/cron/*` ingestion / analysis / scoring / materialization

Verification result：

```text
WRITE-PATH AUDIT PASS
IMPLEMENTATION PASS
CI PASS
VERCEL PREVIEW ENVIRONMENT EXECUTION PASS
PRODUCTION DB ZERO-DELTA PASS
GATE 11A CLOSED
PR #18 MERGED TO MAIN
```

Real Vercel Preview execution produced：

```text
VERCEL_ENV = preview
canWriteRuntimeData() = false
feedback = { ok: true, persisted: false }
cron = 403 non_production_write_blocked
Today missing-AI failure branch = no persistence
```

Production DB before / after remained exactly unchanged：

```text
daily_synthesis_snapshots = 9
user_events = 180
collection_runs = 66
item_feature_vectors = 12
user_interest_vectors = 4
user_semantic_profiles = 0
```

Temporary QA probes were removed after verification; the cleanup diff contained only those QA file deletions.

Tooling caveat：Vercel SSO prevented the connector from completing a request-level HTTP fetch of the protected Preview. Do **not** describe that specific HTTP/browser request as verified. The write policy itself is pure `VERCEL_ENV` logic and was executed inside the real Preview environment with Production DB zero delta.

---

## 11. Production Supabase access model

Effective model：

```text
locked base tables + intentionally public frontier_feed_v1 read view
```

Verified：

- application base tables have RLS enabled
- anon/authenticated have no base-table SELECT/INSERT/UPDATE/DELETE
- anon can SELECT `frontier_feed_v1`
- anon direct SELECT `public.items` is denied
- admin Supabase secret stays server-side

Later hardening backlog：

1. `frontier_feed_v1` Security Definer View
2. `rls_auto_enable()` public execute privilege
3. legacy/default ACL broader than necessary
4. mutable search_path on trigger functions

These are defense-in-depth items, not evidence of a current anonymous base-table leak.

---

## 12. Personal-state reality

Saved / Ideas are browser-local v1, not cross-device durable memory.

Future scope must explicitly choose：

```text
A. browser-local + export / backup / import
B. Supabase-synced personal state
```

Personalization identity is currently browser visitor UUID, so profiles can fragment across browsers/devices.

---

## 13. Known operational debt

- stale `collection_runs` can remain `running` indefinitely; later Gate should add timeout/reconciliation/terminalization
- Gate 9 / Gate 10 deterministic handoffs should live permanently in main CI
- Supabase security hardening is the proposed next Gate after this post-merge documentation correction

---

## 14. Development discipline

```text
latest main
→ short-lived feature/fix branch
→ Preview
→ PR + CI
→ explicit owner approval
→ main
→ Production
```

Before code submission：

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

Red lines：

- one Gate at a time
- do not reopen FROZEN surfaces without explicit scope reopening
- do not force-push unless explicitly requested
- do not auto-merge
- destructive cleanup requires explicit approval
- machine / runtime / production / visual PASS must remain separate claims
- clearly label anything unverified or tool-blocked
