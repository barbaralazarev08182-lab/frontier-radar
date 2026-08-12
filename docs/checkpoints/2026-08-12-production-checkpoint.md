# Frontier Radar — Production Checkpoint — 2026-08-12

> Final 2026-08-12 Production-integrity checkpoint.  
> This record closes **Gate 11 — Production Integrity Hardening** once the documentation PR containing it is merged to `main`.  
> If this conflicts with older notes, prefer **live `main` + live Production + live Supabase + this checkpoint**.

---

## 1. Source of truth

```text
1. live GitHub main
2. live Vercel Production
3. live Supabase Production
4. recent CI / runtime / browser QA evidence
5. this checkpoint
6. docs/START-HERE.md / README.md
7. older checkpoints / historical PR notes
```

GitHub `main` immediately before this documentation closure branch:

```text
3fe4977b72084b0dca9232e69b84151ae7a1e205
Gate 11D: lock Today Project Idea Lab handoffs in CI
```

Production:

```text
https://frontier-radar-eosin.vercel.app
```

Supabase Production:

```text
project: frontier-radar
ref: grnorpdbdrmfrdjeorvz
region: ap-southeast-1
status: ACTIVE_HEALTHY
Postgres: 17.6.1
```

The earlier 16:58 SGT observation gap for Gate 11A's first merge commit is historical only. Later Gate 11 Production runtime verification used the subsequently merged application boundary and confirmed Today / Explore remained live. It is no longer an unresolved Gate 11 blocker.

---

## 2. Product baseline / protected surfaces

Core loop:

```text
Discover → Understand → Get Inspired → Build
```

Current experience:

```text
candidate pool
→ Today’s 7
→ Signal Weave
→ Project Intelligence
→ Saved / Idea Lab / Build
```

Global nav:

```text
TODAY / EXPLORE / SAVED / IDEA LAB
```

Design language:

```text
Frontier Intelligence × Physical Archive × Research Instrument
```

Protected surfaces throughout Gate 11:

- Explore — FROZEN
- Saved — VISUAL PASS + INTERACTION PASS + FROZEN
- Idea Lab — VISUAL PASS + INTERACTION PASS + FROZEN
- Today accepted production visual / stage behavior — protected
- Signal Weave synthesis architecture — protected
- Project Intelligence accepted stages / visuals — protected

Gate 11 made no intentional visual redesign. No Gate 11 subgate required a new visual screenshot acceptance because the implemented changes were runtime policy, database boundary, database lifecycle, tests, or documentation only.

---

## 3. Gate 9 / Gate 10 product handoffs

Gate 9:

```text
Today signal.id
→ /project/<same-id>
→ Project Intelligence loads that id
```

Gate 10:

```text
Project item.id
→ /idea-lab?from=<same-id>
→ exact Saved source / exact orphan Idea / explicit missing state
```

Exact-source rules remain frozen:

- requested source in Saved → select that exact source
- source removed but Idea exists → preserve orphan Idea
- requested source missing and no Idea → `SOURCE NOT IN SAVED`
- no auto-save
- no silent fallback to another Saved signal

Production exact-chain verification earlier on 2026-08-12 used:

```text
id: e71d7eb5-f29e-4eeb-b17a-1c55ae21f033
title: Supply-Wizard; Start Selling Data with an Easy Vendor Checklist
```

Gate 11D later made these handoff contracts permanent in main CI.

---

## 4. Gate 11 acceptance criteria

Gate 11 acceptance was defined as:

1. Preview / QA cannot write Production Supabase runtime state.
2. Security Advisor critical database-boundary findings are addressed.
3. stale collection runs cannot remain `running` forever.
4. Gate 9 / Gate 10 deterministic regressions run in main CI without Production writes.
5. 2026-08-12 docs / checkpoint are synchronized.
6. no frozen visual changes.
7. machine PASS and Production validation remain separately evidenced.

Final status after this checkpoint PR is merged:

```text
1 PASS
2 PASS
3 PASS
4 PASS
5 PASS
6 PASS
7 PASS
GATE 11 CLOSED
```

---

## 5. Gate 11A — Preview / Production Data Isolation — CLOSED

PR / merge:

```text
PR #18 — MERGED / CLOSED
merge commit: 4293e5e9d1cf297651c624b266dbca2fcfedc038
```

Goal:

```text
Preview / Development may read realistic Production data,
but must not persist runtime state into Production Supabase.
```

### Runtime write surface audited

Current Vercel runtime write ingress collapsed to three umbrellas:

1. Today daily-synthesis persistence
2. `/api/feedback` + personalization profile rebuild
3. `/api/cron/*` ingestion / analysis / scoring / materialization

### Implementation

`src/lib/env/runtime-write-policy.ts`:

```text
VERCEL_ENV=production → writes allowed
non-empty Preview / Development / unexpected Vercel env → writes blocked
no VERCEL_ENV → local/operator historical behavior preserved
```

Applied to:

- Today synthesis success/failure persistence
- feedback persistence / profile rebuild
- cron ingestion / analysis / scoring / materialization

### Real Vercel Preview verification

Accepted Preview execution produced:

```text
VERCEL_ENV = preview
canWriteRuntimeData() = false
feedback = { ok: true, persisted: false }
cron = 403 non_production_write_blocked
Today missing-AI failure branch = no persisted failure snapshot
```

The Today verification deliberately reached the missing-AI failure persistence path without making a model call. Preview skipped persistence.

### Production DB zero-delta check

Before / after the Preview execution:

| Table | Before | After |
| --- | ---: | ---: |
| `daily_synthesis_snapshots` | 9 | 9 |
| `user_events` | 180 | 180 |
| `collection_runs` | 66 | 66 |
| `item_feature_vectors` | 12 | 12 |
| `user_interest_vectors` | 4 | 4 |
| `user_semantic_profiles` | 0 | 0 |

Temporary QA probes were removed immediately after verification.

### CI

Final PR #18 pre-merge CI:

```text
TypeCheck PASS
ESLint PASS
Tests PASS
Next Build PASS
```

### Tooling caveat

Vercel SSO prevented a connector-level request fetch of the protected Preview URL. This was not mislabeled as HTTP/browser PASS. The actual write policy and guarded runtime paths were executed inside Vercel Preview with exact Production DB zero delta.

### Result

```text
WRITE-PATH AUDIT PASS
IMPLEMENTATION PASS
CI PASS
VERCEL PREVIEW ENVIRONMENT EXECUTION PASS
PRODUCTION DB ZERO-DELTA PASS
GATE 11A CLOSED
```

---

## 6. Gate 11B-A — Function Privilege Hardening — CLOSED

Production migration:

```text
20260812091807_gate11b_function_privilege_hardening
```

Merged record:

```text
PR #20
main commit: 160d7487...
CI #344 PASS
```

Migration intent:

```sql
revoke execute on function public.rls_auto_enable() from public;
revoke execute on function public.rls_auto_enable() from anon, authenticated;

alter function public.touch_updated_at()
  set search_path to pg_catalog;

alter function public.touch_items_last_updated_at()
  set search_path to pg_catalog;
```

Post-validation:

- `rls_auto_enable`: anon/auth/service direct execution false
- `touch_updated_at`: fixed `search_path=pg_catalog`
- `touch_items_last_updated_at`: fixed `search_path=pg_catalog`
- event trigger behavior remained functional
- base tables remained locked
- four prior Security Advisor WARN findings disappeared

```text
GATE 11B-A CLOSED
```

---

## 7. Gate 11B-B — Public Feed Boundary — CLOSED

Goal: remove anonymous Security Definer View access and keep public-feed rendering server-side.

Application architecture after PR #21:

```text
Browser
→ Today / Explore Server Component
→ getFeedProvider()
→ server-only createAdminClient()
→ frontier_feed_v1
```

PR #21 switched the Supabase feed provider from an anonymous browser-facing feed client to the server-only admin/service-role client without changing query/filter/sort/map semantics.

```text
PR #21 merged
application merge: aea80ad8445f96a2e623a3d11a7325c667cf6192
CI #346 PASS
```

Production migration:

```text
20260812095600_gate11b_public_feed_boundary
```

```sql
alter view public.frontier_feed_v1 set (security_invoker = true);

revoke select on public.frontier_feed_v1
from anon, authenticated;

grant select on public.frontier_feed_v1
to service_role;
```

Post-validation:

- `security_invoker=true`
- anon/authenticated SELECT on `frontier_feed_v1` false
- service_role SELECT true
- anon/authenticated base-table access remained false
- service-role feed count = 621 during verification
- Today / Explore returned HTTP 200, `LIVE DATA`, total discoveries 621 during verification
- exact baseline signal `e71d7eb5-f29e-4eeb-b17a-1c55ae21f033` remained present
- prior Security Definer View ERROR disappeared

Migration-record PR:

```text
PR #22 merged
main: d951ecacc5b6184b82e99aa81ecbfbdaae087d96
CI #348 PASS
```

```text
GATE 11B-B CLOSED
```

---

## 8. Gate 11B-C1 — Application Role ACL Hardening — CLOSED

Production migration:

```text
20260812121709_gate11b_application_role_acl_hardening
```

Purpose:

- make browser-facing database access explicit and opt-in
- remove legacy non-CRUD relation privileges from anon/authenticated
- remove browser-role sequence privileges
- remove public/browser function EXECUTE defaults
- preserve required service-role trigger-helper access
- prevent future `postgres`-owned public objects from regaining browser grants by default

Post-validation:

```text
anon public relation objects with ANY privilege = 0
authenticated public relation objects with ANY privilege = 0
anon public sequences with SELECT/UPDATE/USAGE = 0
authenticated public sequences with SELECT/UPDATE/USAGE = 0
```

Function effective privileges after migration:

```text
refresh_project_rollup          anon false / auth false / service true
refresh_project_rollup_trigger  anon false / auth false / service true
rls_auto_enable                 anon false / auth false / service false
touch_updated_at                anon false / auth false / service true
touch_items_last_updated_at     anon false / auth false / service true
```

Future-object probe:

- temporary `postgres`-owned public table created
- RLS auto-enabled
- anon/authenticated privileges false
- service-role CRUD true
- probe immediately dropped
- follow-up confirmed removal

Production runtime regression after C1:

```text
/today   HTTP 200 / LIVE DATA / 621 / exact baseline signal present
/explore HTTP 200 / LIVE DATA / 621 / exact baseline signal present
```

Security Advisor after C1:

```text
ERROR 0
WARN 0
INFO only: RLS Enabled No Policy
```

PR / merge:

```text
PR #23
head: a9ee89845d47eadeb7a2612889ce5d306b90a69f
CI #350 PASS
squash merge: d68e96c991e2da597ff3a009f0d52ec743d85fe3
```

### Explicit non-scope

`supabase_admin` default ACL was intentionally not changed. Current Frontier Radar public objects were `postgres`-owned; `supabase_admin` is a Supabase internal role used for platform operations/upgrades. Modifying its defaults was not necessary for the current application boundary and carried avoidable compatibility risk.

Do not reopen this automatically under Gate 11.

```text
GATE 11B-C1 CLOSED
```

---

## 9. Gate 11C — Stale Collection Run Terminalization — CLOSED

Audit finding before repair:

- exactly eight `collection_runs.status='running'` rows were stale
- all were GitHub rows from 2026-08-07
- all had 0 requests / 0 fetched / no error / no `finished_at`
- recent normal collectors completed in roughly 3–32 seconds
- GitHub route max duration = 180 seconds
- `pg_cron` was not installed

Important architecture finding:

- GitHub / HuggingFace / arXiv used the shared collection-run repository
- Product Hunt / Hacker News created `collection_runs` directly

Therefore a TypeScript-repository-only fix would not cover all current writers. A database lifecycle trigger was selected as the narrowest complete solution.

Production migration:

```text
20260812134208_gate11c_stale_collection_run_terminalization
```

Behavior:

```text
before any new collection_runs INSERT:
  sweep all prior status='running' rows older than 1 hour
  → status='failed'
  → finished_at populated
  → error_count at least 1
  → explicit stale_running_timeout metadata
```

The migration also performed a one-time repair of already orphaned rows.

Post-validation:

```text
pre stale >1h = 8
post running = 0
repaired = 8/8
all failed = true
all finished = true
all error-marked = true
```

Helper / trigger:

```text
trg_terminalize_stale_collection_runs
terminalize_stale_collection_runs()
SECURITY INVOKER
search_path=pg_catalog
```

Direct helper execution:

```text
anon false
authenticated false
service_role false
```

Controlled service-role probe:

- inserted a two-hour stale run and then a fresh run
- fresh insert activated trigger
- stale row became terminal `failed`
- fresh row remained `running`
- probe rows were immediately removed
- final test-data follow-up: `running=0`

Security Advisor after migration remained:

```text
ERROR 0
WARN 0
INFO only: RLS Enabled No Policy
```

PR / merge:

```text
PR #24
CI #352 PASS
squash merge: 636a174b46fd3b04bd1c1f0c4ba77ed491a63459
```

No collector ranking/discovery logic, scheduler infrastructure, or visuals changed.

```text
GATE 11C CLOSED
```

---

## 10. Gate 11D — Deterministic Gate 9 / Gate 10 Main-CI Regression — CLOSED

Initial audit found:

- `e2e/integration-qa.spec.ts` already covered Explore → Saved → Idea Lab persistence/orphan behavior
- main CI did **not** run Playwright
- main CI ran `npm test`
- `package.json` already included `src/lib/feed/**/*.test.ts` in that test glob

To keep the Gate narrow, no Playwright dependency or CI infrastructure was added.

Added:

```text
src/lib/feed/handoff-regression.test.ts
```

Four permanent architecture-contract tests:

1. Today hands the exact `signal.id` to Project Intelligence.
2. Project hands the exact `item.id` to Idea Lab through `from`.
3. requested Idea Lab source cannot silently fallback to another Saved signal.
4. orphan direction remains bound to its original `sourceItemId`.

The tests inspect the real production call sites and are executed by the existing `npm test` CI step.

CI properties:

- no browser runtime
- no external API
- no Supabase/AI secret
- no Production write
- no workflow change
- no Production source-code behavior change

PR / CI / merge:

```text
PR #25
head: b4c95a16321f837bcdf6b8ecc4ae6b9f73978a2c
CI #354:
  TypeCheck PASS
  Lint PASS
  Test PASS
  Build PASS
squash merge: 3fe4977b72084b0dca9232e69b84151ae7a1e205
```

The `Test PASS` is important evidence that the new handoff contracts actually entered the existing main-CI test command.

```text
GATE 11D CLOSED
```

---

## 11. Final Production security / integrity state

### Runtime writes

```text
Vercel Production      → allowed
Vercel Preview         → blocked
Vercel Development     → blocked
unexpected VERCEL_ENV  → blocked
local/no VERCEL_ENV    → historical local/operator behavior
```

### Public feed

```text
Browser
→ Server Component
→ server-only service-role Supabase client
→ security-invoker frontier_feed_v1
→ RLS-locked base tables
```

### Browser database roles

At Gate 11B-C1 verification:

```text
anon/authenticated direct public relation privileges = 0
anon/authenticated public sequence privileges = 0
browser/public function EXECUTE boundary explicitly revoked
```

### Security Advisor

After Gate 11B/C migrations:

```text
ERROR = 0
WARN = 0
INFO = RLS Enabled No Policy on intentionally locked tables
```

The INFO notices are expected under the current server-only access design; no browser policies exist because browser roles are intentionally denied.

### Collection lifecycle

A hard-killed collector can still fail to execute its own `finally`, but the database no longer depends on that process surviving forever: the next collection-run insert globally terminalizes `running` rows older than one hour.

### Cross-surface handoff

Gate 9 / Gate 10 exact-ID behavior is now part of permanent main CI.

---

## 12. Deferred work — not Gate 11 failures

### Personal-state durability — proposed Gate 12

Saved / Ideas remain browser-local v1. Production DB had no active Saved/Idea user-state dependency in the audited v1 contract.

Any future change must explicitly choose:

```text
A. browser-local + export / backup / import
B. Supabase-synced personal state
```

Do not silently migrate the frozen Saved / Idea Lab contract.

### Personalization integrity — proposed Gate 13

Current user identity is browser visitor UUID. Known follow-on concerns:

- cross-browser/device identity fragmentation
- QA/test event quarantine
- feedback write abuse/rate integrity
- stronger proof that More/Less changes ranking as intended

### Semantic layer

Audited state:

```text
item_semantic_embeddings = 0
user_semantic_profiles = 0
item_feature_vectors = 12
user_interest_vectors = 4
```

Feature-vector / rules fallback remains functional. Semantic embedding rollout is later scope, not Gate 11 acceptance.

### Supabase internal defaults

`supabase_admin` default ACL remains intentionally untouched for the reasons documented in Gate 11B-C1. Revisit only as a separate explicit Gate if evidence requires it.

---

## 13. Gate 11 closure record

Merged implementation / migration / regression sequence:

```text
PR #18  Gate 11A   Preview/Production write isolation
PR #20  Gate 11B-A function privilege hardening
PR #21  Gate 11B-B server-only feed application boundary
PR #22  Gate 11B-B Production migration record
PR #23  Gate 11B-C1 application-role ACL hardening
PR #24  Gate 11C   stale collection-run terminalization
PR #25  Gate 11D   permanent Gate9/10 main-CI regressions
```

Final implementation `main` before this docs-only closure PR:

```text
3fe4977b72084b0dca9232e69b84151ae7a1e205
```

Formal state once this checkpoint update is merged:

```text
GATE 11A CLOSED
GATE 11B-A CLOSED
GATE 11B-B CLOSED
GATE 11B-C1 CLOSED
GATE 11C CLOSED
GATE 11D CLOSED
DOCS / CHECKPOINT SYNC PASS
NO FROZEN VISUAL CHANGES
GATE 11 — PRODUCTION INTEGRITY HARDENING — CLOSED
```

---

## 14. Next-Gate discipline

This checkpoint does not automatically start Gate 12 or Gate 13.

After Gate 11 closure:

1. stop and obtain explicit owner direction
2. do not reopen frozen visual surfaces
3. do not silently change browser-local Saved / Idea Lab persistence
4. do not fold `supabase_admin` internal-role ACL work into another Gate without explicit scope
5. keep machine / runtime / Production / visual PASS as separate claims
6. no automatic merge, destructive cleanup, force-push, or deployment
