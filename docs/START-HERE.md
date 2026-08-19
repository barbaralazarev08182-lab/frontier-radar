# Frontier Radar — START HERE

> 更新时间：**2026-08-19**  
> 当前状态：**本阶段进入 closure。Today / Explore / Project / Radar / Saved 为接受并保护的核心面；Idea Lab 已作为产品面退役；Gate 11 Production Integrity Hardening 与 restoration protocol 已完成。**

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

Phase-closure base（Idea Lab retirement PR 建立前）：

```text
b76472560008ce85ab70f2d0776dd900287b7697
Document restoration recovery protocol (#64)
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

旧 `proto/*` 只用于设计考古，不是新任务默认基线。2026-08-12 checkpoint 中的 Idea Lab 内容是当时状态的历史记录，不应被当作当前产品入口。

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
→ Saved / Build
```

Global nav：

```text
TODAY / EXPLORE / RADAR / SAVED
```

Idea Lab 已在 phase closure 中退役：没有 `/idea-lab` 产品路由、没有全局导航入口，也没有 Project → Idea Lab handoff。

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

Project 继续保留 traceable source links 与 Build directions；旧的 `SEND TO IDEA LAB` / `IDEA LAB ↗` 已退役，不应在未重新开 scope 的情况下恢复。

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

### Radar — FROZEN

Radar 是已接受面。固定视口与 sticky navigation 几何均属于当前保护状态。

### Saved — VISUAL PASS + INTERACTION PASS + FROZEN

```text
PRIVATE RESEARCH SHELF
browser localStorage
frontier_radar_saved_items_v1
src/lib/saved/browser.ts
```

Saved 保留本地 export / import backup controls。

### Idea Lab — RETIRED

```text
/idea-lab                         REMOVED
Project → Idea Lab handoff        REMOVED
Idea Lab global-nav entry         REMOVED
Idea Lab route UI/styles          REMOVED
Gate 10 active handoff coverage   RETIRED
```

旧 `frontier_radar_ideas_v1` 本地记录不再作为产品面暴露。为避免退役动作静默销毁用户本地数据，personal-memory v1 的兼容层可以继续携带已有 legacy records。

---

## 4. Handoff contract after phase closure

Gate 9 Today → Project 仍是当前合同：

```text
signal.id → /project/<same-id>
```

该 exact-ID contract 继续由 `src/lib/feed/handoff-regression.test.ts` 保护并运行在现有 `npm test` 中。

Gate 10 Project → Idea Lab 是**历史合同**，随 Idea Lab 产品面退役而停止作为 active CI contract。历史 checkpoint / PR 记录保留用于考古，不代表当前 route。

Do not convert structural/machine evidence into visual PASS without browser evidence.

---

## 5. Gate 11 — Production Integrity Hardening — CLOSED

Gate 11 did not redesign product surfaces. It hardened runtime/data boundaries and made critical handoffs regression-safe at the time it closed.

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

### 11D — Historical Gate 9 / Gate 10 Regression Coverage — CLOSED

```text
src/lib/feed/handoff-regression.test.ts
PR #25
merge: 3fe4977b72084b0dca9232e69b84151ae7a1e205
CI #354 PASS
```

At Gate 11 closure this protected four contracts, including Project → Idea Lab behavior. After Idea Lab retirement, only the still-live Today → Project exact-ID contract remains active; the retired Gate 10 assertions were removed rather than preserving tests for a route that no longer exists.

### Gate 11 security end state

Security Advisor after the hardening migrations：

```text
ERROR: 0
WARN: 0
INFO: RLS Enabled No Policy on intentionally locked tables
```

The INFO findings are not a Gate 11 failure; they describe tables with RLS enabled and no browser policies by design.

---

## 6. Remaining future-phase decisions

These are deferred future work, not incomplete acceptance items for this phase.

### Personal Memory Durability

Saved is browser-local v1, not cross-device durable memory.

Before changing the frozen contract, explicitly choose：

```text
A. browser-local + export / backup / import
B. Supabase-synced personal state
```

### Personalization Integrity

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
- restoration follows README restoration/recovery protocol; code equality is not visual equality
