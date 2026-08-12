# Frontier Radar — START HERE

> 更新时间：**2026-08-12**  
> 当前状态：**核心产品链已形成；Explore / Saved / Idea Lab 等接受面保持冻结；Gate 11 — Production Integrity Hardening 已完成全部实现、Production 验证与 main CI 固化，本次只同步最终 closure 文档。**

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

当前 `main`（最终文档 PR 建立前）：

```text
3fe4977b72084b0dca9232e69b84151ae7a1e205
Gate 11D: lock Today Project Idea Lab handoffs in CI
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
status: ACTIVE_HEALTHY
Postgres: 17.6.1
```

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

## 3. Protected product contracts

### Today / Signal Weave

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

### Project Intelligence

```text
01 CAPTURE
02 EVIDENCE
03 INTERROGATION
04 RESOLUTION
05 BUILD
```

不要随手重做已接受的 visual / transition，尤其 03 Interrogation。

### Explore — FROZEN

```text
B Version / Field-first Explore / CURRENT FRONTIER FIELD
```

```text
MORE LIKE THIS
LESS LIKE THIS
ARCHIVE · SAVE / SAVED
OPEN INTELLIGENCE
```

`MORE LIKE THIS` 是 personalization signal，不等于 SAVE。

### Saved — VISUAL PASS + INTERACTION PASS + FROZEN

```text
PRIVATE RESEARCH SHELF
browser localStorage
frontier_radar_saved_items_v1
src/lib/saved/browser.ts
```

### Idea Lab — VISUAL PASS + INTERACTION PASS + FROZEN

```text
Signal-to-Direction Workbench
Saved Signal → Pinned Signal → Working Note → Personal Direction
SEED / SHAPING / BUILDING
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

## 4. Gate 9 / Gate 10 handoff contract

Gate 9 Today → Project：

```text
signal.id → /project/<same-id>
```

Gate 10 Project → Idea Lab：

```text
item.id → /idea-lab?from=<same-id>
```

These exact-ID contracts are now protected by `src/lib/feed/handoff-regression.test.ts` and run inside the existing `npm test` main-CI step.

Do not convert structural/machine evidence into visual PASS without browser evidence.

---

## 5. Gate 11 — Production Integrity Hardening — CLOSED

Gate 11 did not redesign product surfaces. It hardened runtime/data boundaries and made critical handoffs regression-safe.

### 11A — Preview / Production Data Isolation — CLOSED

```text
PR #18
merge: 4293e5e9d1cf297651c624b266dbca2fcfedc038
```

Policy：

```text
VERCEL_ENV=production → runtime writes allowed
VERCEL_ENV=preview/development/other non-empty → Production runtime writes blocked
no VERCEL_ENV → local/operator historical behavior preserved
```

Covered write umbrellas：Today synthesis persistence, `/api/feedback` + profile rebuild, and `/api/cron/*` ingestion/analysis/scoring/materialization.

Accepted evidence included real Vercel Preview execution, `canWriteRuntimeData() = false`, feedback `persisted=false`, cron `403 non_production_write_blocked`, forced Today failure branch with no persistence, and exact Production DB zero delta.

### 11B-A — Function Privilege Hardening — CLOSED

```text
migration: 20260812091807_gate11b_function_privilege_hardening
PR #20
```

- removed browser-role execution of `rls_auto_enable()`
- fixed trigger helper `search_path` to `pg_catalog`
- four prior Security Advisor WARN findings removed

### 11B-B — Public Feed Boundary — CLOSED

```text
migration: 20260812095600_gate11b_public_feed_boundary
PR #21 + PR #22
```

Current feed architecture：

```text
Browser
→ Server Component
→ server-only service-role client
→ security-invoker frontier_feed_v1
→ locked base tables
```

- view `security_invoker=true`
- anon/authenticated SELECT on view revoked
- service_role SELECT preserved
- browser-role base-table access remains denied
- prior Security Definer View ERROR removed

### 11B-C1 — Application Role ACL Hardening — CLOSED

```text
migration: 20260812121709_gate11b_application_role_acl_hardening
PR #23
merge: d68e96c991e2da597ff3a009f0d52ec743d85fe3
```

After validation：

- anon public relation objects with any privilege = 0
- authenticated = 0
- anon/authenticated public sequence privileges = 0
- public-function direct EXECUTE removed for browser roles
- service-role trigger-helper access preserved where required
- future `postgres`-owned public objects no longer regain browser-facing default grants
- controlled future-object probe passed and was deleted

`supabase_admin` default ACL was intentionally non-scope; do not silently reopen it.

### 11C — Stale Collection Run Terminalization — CLOSED

```text
migration: 20260812134208_gate11c_stale_collection_run_terminalization
PR #24
merge: 636a174b46fd3b04bd1c1f0c4ba77ed491a63459
```

- eight Aug-07 orphan `running` rows repaired to terminal `failed`
- new `collection_runs` inserts globally sweep prior `running` rows older than one hour
- helper is `SECURITY INVOKER` with `search_path=pg_catalog`
- controlled service-role stale/fresh probe passed
- probe rows removed
- current fix requires no new `pg_cron` infrastructure

### 11D — Permanent Gate 9 / Gate 10 Regression Coverage — CLOSED

```text
src/lib/feed/handoff-regression.test.ts
PR #25
merge: 3fe4977b72084b0dca9232e69b84151ae7a1e205
CI #354 PASS
```

Protected contracts：

1. Today exact `signal.id` → Project
2. Project exact `item.id` → Idea Lab `from`
3. requested source cannot silently fallback
4. orphan Idea remains bound to original `sourceItemId`

The tests run inside existing `npm test`; no Playwright dependency, external API, Supabase secret, or Production write is required.

### Gate 11 security end state

Security Advisor after the hardening migrations：

```text
ERROR: 0
WARN: 0
INFO: RLS Enabled No Policy on intentionally locked tables
```

The INFO findings are not a Gate 11 failure; they describe tables with RLS enabled and no browser policies by design.

---

## 6. Remaining product / data decisions

These are deferred follow-on work, not incomplete Gate 11 acceptance items.

### Gate 12 candidate — Personal Memory Durability

Saved / Ideas are browser-local v1, not cross-device durable memory.

Before changing the frozen contract, explicitly choose：

```text
A. browser-local + export / backup / import
B. Supabase-synced personal state
```

### Gate 13 candidate — Personalization Integrity

Current identity is browser visitor UUID, so profiles can fragment across browsers/devices. Future scope may cover durable identity, QA/test event quarantine, feedback abuse/rate integrity, and proof that More/Less meaningfully changes ranking.

### Semantic layer

`item_semantic_embeddings` / `user_semantic_profiles` are not yet populated in the audited state; current feature-vector / rules fallback remains valid.

---

## 7. Development discipline

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
