# Frontier Radar — Production Checkpoint — 2026-08-12

> Latest project checkpoint for 2026-08-12.  
> If this conflicts with 2026-08-10 or earlier notes, prefer **live `main` + live Production + this checkpoint**.

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

Current `main` at this checkpoint:

```text
4293e5e9d1cf297651c624b266dbca2fcfedc038
Gate 11A: isolate Preview runtime writes from production data
```

Production:

```text
https://frontier-radar-eosin.vercel.app
```

As of **2026-08-12 16:58 SGT**, the Vercel deployment list had **not yet shown a Production deployment for merge commit `4293e5e9...`**. This is an observation gap, not a deployment-failure claim and not evidence that Production already contains Gate 11A.

Supabase Production:

```text
project: frontier-radar
ref: grnorpdbdrmfrdjeorvz
region: ap-southeast-1
status: ACTIVE_HEALTHY
Postgres: 17.6.1
```

---

## 2. Product baseline

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

Frozen/protected surfaces:

- Explore — FROZEN
- Saved — VISUAL PASS + INTERACTION PASS + FROZEN
- Idea Lab — VISUAL PASS + INTERACTION PASS + FROZEN
- Today stage behavior / accepted production visual baseline — protected
- Signal Weave synthesis architecture — protected
- Project Intelligence accepted stages and visuals — protected

Do not reopen these surfaces without explicit scope reopening or a concrete integration defect.

---

## 3. Today / Signal Weave contract

```text
Hero continuous
→ Compression locked
→ Today’s 7 locked
→ Signal Weave continuous
```

- one physical gesture max one intermediate stage
- inertia cannot skip stages
- reverse behavior symmetric
- `06 Adjacent` cobalt blue
- `07 Wildcard` saturated orange
- LAB-03–06 owns production visual baseline
- Signal Weave remains `7 signals → 3 patterns → Final Take`
- do not resurrect foil / spectral / standalone compression artifact renderers

---

## 4. Explore / Saved / Idea Lab

### Explore

```text
B Version / Field-first Explore / CURRENT FRONTIER FIELD
```

### Saved

```text
PRIVATE RESEARCH SHELF
frontier_radar_saved_items_v1
```

Browser-local v1.

### Idea Lab

```text
Signal-to-Direction Workbench
SEED / SHAPING / BUILDING
frontier_radar_ideas_v1
```

Exact-source binding is mandatory. Orphan Ideas persist after source removal.

---

## 5. Gate 9 / Gate 10

- Gate 9 Today → Project exact ID handoff: structurally/functionally closed.
- Gate 10 Project → Idea Lab exact source handoff: merged to `main` in `c8a4628a...`.

Do not confuse structural/machine PASS with a new visual PASS unless browser evidence exists.

---

## 6. Gate 11A — CLOSED / MERGED

Original branch:

```text
fix/gate11a-production-data-isolation
```

PR / merge:

```text
PR #18 — MERGED / CLOSED
merged_at: 2026-08-12 16:57:47 SGT
merge commit: 4293e5e9d1cf297651c624b266dbca2fcfedc038
```

Goal:

```text
Preview / Development may read realistic Production data,
but must not persist runtime state into Production Supabase.
```

### Runtime write surface audited

All current Vercel runtime write ingress collapses to three umbrellas:

1. Today daily-synthesis persistence
2. `/api/feedback` + personalization profile rebuild
3. `/api/cron/*` ingestion / analysis / scoring / materialization

No fourth current runtime ingress was found.

### Implementation

- `src/lib/env/runtime-write-policy.ts`
  - `VERCEL_ENV=production` → runtime writes allowed
  - any non-empty non-production Vercel env → runtime writes blocked
  - no `VERCEL_ENV` → historical local behavior preserved
- Today synthesis success/failure upserts are gated.
- Preview feedback returns `{ ok: true, persisted: false }` before admin-client creation.
- Preview cron requests return `403 non_production_write_blocked` before secret validation.

### Verification evidence

Vercel Preview execution on verification commit `f779d2f415f08b442105352fb42972aa7f440cf0` logged:

```json
{
  "vercelEnv": "preview",
  "writeAllowed": false,
  "feedback": {
    "status": 200,
    "body": { "ok": true, "persisted": false }
  },
  "cron": {
    "authorized": false,
    "status": 403,
    "body": { "error": "non_production_write_blocked" }
  },
  "today": {
    "returnedSnapshot": false,
    "forcedBranch": "missing_ai_env"
  }
}
```

The Today probe deliberately removed AI env values only inside the Preview verification execution so `resolveTodaySynthesis()` reached the missing-AI failure persistence branch without making a model call. Preview skipped the failure upsert.

### Production DB zero-delta check

Before and after the Preview execution, all tracked tables were exactly unchanged:

| Table | Before | After | Max timestamp changed? |
| --- | ---: | ---: | --- |
| `daily_synthesis_snapshots` | 9 | 9 | No |
| `user_events` | 180 | 180 | No |
| `collection_runs` | 66 | 66 | No |
| `item_feature_vectors` | 12 | 12 | No |
| `user_interest_vectors` | 4 | 4 | No |
| `user_semantic_profiles` | 0 | 0 | No |

### QA cleanup

Temporary Preview/build probes were deleted immediately after verification.

Comparison from verification commit `f779d2f...` to cleanup head `4d305fba...` contained only removal of:

```text
src/app/api/qa/gate11a-runtime/route.ts
src/app/qa/gate11a-build/page.tsx
```

No business/runtime implementation changed in cleanup.

### Final pre-merge CI

GitHub CI run **#340** on final PR head `e30d44b7c09f82174b75c6589d12486a8d31893d` passed:

```text
TypeCheck PASS
ESLint PASS
Tests PASS
Next Build PASS
```

### Tooling caveat

Vercel SSO prevented the available connector from completing a request-level HTTP fetch of the protected Preview deployment. Do not claim that specific protected HTTP/browser request as verified.

The write decision itself is pure `VERCEL_ENV` logic and the exact guard paths were executed inside the real Vercel Preview environment with Production DB zero delta. This evidence is accepted for Gate 11A closure.

### Gate result

```text
WRITE-PATH AUDIT PASS
IMPLEMENTATION PASS
CI PASS
VERCEL PREVIEW ENVIRONMENT EXECUTION PASS
PRODUCTION DB ZERO-DELTA PASS
GATE 11A CLOSED
PR #18 MERGED TO MAIN
```

---

## 7. Production Supabase access model

Current effective model:

```text
locked base tables + intentionally public frontier_feed_v1 read view
```

Verified:

- application base tables have RLS enabled
- anon/authenticated have no base-table SELECT/INSERT/UPDATE/DELETE
- anon can SELECT `frontier_feed_v1`
- anon direct SELECT `public.items` is denied
- admin Supabase secret remains server-side

Later security-hardening backlog:

1. `frontier_feed_v1` — Security Definer View
2. `public.rls_auto_enable()` — SECURITY DEFINER executable by anon/authenticated
3. legacy/default ACLs broader than necessary
4. mutable `search_path` on trigger functions

These are defense-in-depth findings, not evidence of a current anonymous base-table read/write leak.

---

## 8. Remaining operational debt

### Collection runs

Historical stale `collection_runs` can remain `running` indefinitely. Later work should add timeout/reconciliation/terminalization; do not delete history first.

### Regression coverage

Permanent CI still needs deterministic Gate 9 / Gate 10 cross-surface handoff coverage.

### Personal-state durability

Saved / Ideas remain browser-local v1. Future scope must explicitly choose browser-local backup/export or Supabase-synced personal state.

### Personalization identity

Current identity is browser visitor UUID, so profiles can fragment across browsers/devices.

### Supabase security hardening

The next proposed Gate is a dedicated Supabase access-boundary hardening Gate based on the already-audited backlog. It must remain separate from Gate 11A and must not alter frozen visuals.

---

## 9. Next Gate discipline

Gate 11A is merged and closed. This post-merge documentation correction does **not** start Gate 11B.

Before opening Gate 11B, keep the unresolved Production deployment observation explicit: the merge commit exists on GitHub `main`, while its corresponding Production deployment has not yet been observed in the Vercel deployment list as of 2026-08-12 16:58 SGT.

No automatic merge.
No destructive cleanup.
No frozen visual reopening.
