# Frontier Radar

**A personalized frontier intelligence system for discovering what is becoming worth attention — and turning it into research or product directions.**

Frontier Radar 不是普通 AI 新闻聚合器，也不是 GitHub 热榜。它把多来源 frontier signals 经过评分、个性化、跨来源证据与 synthesis，串成一条完整产品链：

```text
Discover → Understand → Get Inspired → Build
```

> 新协作者先读 [`docs/START-HERE.md`](docs/START-HERE.md)。  
> 最新生产状态见 [`docs/checkpoints/2026-08-12-production-checkpoint.md`](docs/checkpoints/2026-08-12-production-checkpoint.md)。  
> `AGENTS.md` 保存 coding-agent 协作规则。

---

## Current baseline — 2026-08-12

Production source of truth:

```text
GitHub main
c8a4628a715e83ff97f2e7754288a2811a0d6dc4
Honor Project Intelligence source handoff in Idea Lab
```

Production URL:

```text
https://frontier-radar-eosin.vercel.app
```

Current product loop:

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

Global nav:

```text
TODAY / EXPLORE / SAVED / IDEA LAB
```

Design language:

```text
Frontier Intelligence × Physical Archive × Research Instrument
```

Avoid generic SaaS dashboards, bento-grid defaults, PPT-style heroes, heavy glassmorphism, or motion without information/state meaning.

---

## Frozen / protected product contracts

### Today + Signal Weave

```text
Hero continuous
→ Compression locked
→ Today’s 7 locked
→ Signal Weave continuous
```

- one physical gesture max one intermediate stage
- inertia cannot jump stages
- reverse behavior is symmetric
- `06 Adjacent` = cobalt blue
- `07 Wildcard` = saturated orange
- LAB-03–06 owns the production visual baseline
- Signal Weave remains `7 signals → 3 patterns → Final Take`
- do not resurrect foil / spectral / standalone compression artifact renderers

### Project Intelligence

```text
01 CAPTURE
02 EVIDENCE
03 INTERROGATION
04 RESOLUTION
05 BUILD
```

Accepted visual and transition contracts are protected. In particular, do not casually redesign 03 Interrogation.

Project → Idea Lab handoff:

```text
/idea-lab?from=<source-item-id>
```

The exact requested source must be honored; no silent fallback to another Saved signal.

### Explore — FROZEN

Formal direction:

```text
B Version / Field-first Explore / CURRENT FRONTIER FIELD
```

Actions:

```text
MORE LIKE THIS
LESS LIKE THIS
ARCHIVE · SAVE / SAVED
OPEN INTELLIGENCE
```

`MORE LIKE THIS` is a personalization signal, not SAVE.

### Saved — VISUAL PASS + INTERACTION PASS + FROZEN

Metaphor:

```text
PRIVATE RESEARCH SHELF
```

Current v1 persistence is browser-local:

```text
frontier_radar_saved_items_v1
src/lib/saved/browser.ts
```

### Idea Lab — VISUAL PASS + INTERACTION PASS + FROZEN

Metaphor:

```text
Signal-to-Direction Workbench
```

Flow:

```text
Saved Signal → Pinned Signal → Working Note → Personal Direction
```

Statuses:

```text
SEED / SHAPING / BUILDING
```

Current v1 persistence:

```text
frontier_radar_ideas_v1
src/lib/ideas/browser.ts
```

If a Saved source is later removed, an existing Idea remains and shows `SOURCE NO LONGER SAVED`.

---

## Gate 11A — Preview / Production Data Isolation

Branch / PR:

```text
fix/gate11a-production-data-isolation
PR #18 — Draft / not merged
```

Goal:

```text
Preview / Development may read realistic Production data,
but must not persist runtime state into Production Supabase.
```

Covered runtime write umbrellas:

1. Today synthesis success/failure persistence
2. `/api/feedback` + personalization rebuild
3. `/api/cron/*` ingestion / analysis / scoring / materialization

### Status

```text
WRITE-PATH AUDIT PASS
IMPLEMENTATION PASS
CI PASS
VERCEL PREVIEW ENVIRONMENT EXECUTION PASS
PRODUCTION DB ZERO-DELTA PASS
GATE 11A CLOSED
PR #18 NOT MERGED
```

Final verification evidence:

- Vercel Preview executed with `VERCEL_ENV="preview"`.
- `canWriteRuntimeData()` returned `false`.
- feedback returned `{ ok: true, persisted: false }`.
- cron returned `403 non_production_write_blocked` before secret validation.
- Today was forced through the missing-AI failure persistence branch and returned no snapshot without writing a failure row.
- Production DB before/after was exactly unchanged for:
  - `daily_synthesis_snapshots` = 9
  - `user_events` = 180
  - `collection_runs` = 66
  - `item_feature_vectors` = 12
  - `user_interest_vectors` = 4
  - `user_semantic_profiles` = 0
- temporary QA probes were deleted immediately after verification; cleanup changed only those QA files.

The connector could not complete a request-level fetch of the protected Preview because Vercel SSO intercepted it. This is recorded as a tooling limitation, not hidden as an HTTP runtime PASS. The write decision itself is a pure `VERCEL_ENV` boundary and was executed inside the real Vercel Preview environment with zero Production DB delta.

**Do not merge PR #18 until the owner explicitly approves the merge.**

---

## Production Supabase access model

Current effective model:

```text
locked base tables + intentionally public frontier_feed_v1 read view
```

Verified:

- current application base tables have RLS enabled
- anon/authenticated do not have base-table SELECT/INSERT/UPDATE/DELETE
- anon can read `frontier_feed_v1`
- anon direct `public.items` SELECT is denied
- admin Supabase secrets stay server-side

Security hardening backlog for a later Gate:

- `frontier_feed_v1` Security Definer View
- `public.rls_auto_enable()` public EXECUTE privilege
- legacy/default ACLs broader than needed
- mutable `search_path` on trigger functions

These are defense-in-depth items, not evidence of a current anonymous base-table read/write leak.

---

## Personal-state reality

Saved and Idea Lab are intentionally browser-local in v1. They are not cross-device durable memory yet.

Future scope must explicitly choose between:

```text
A. browser-local + export / backup / import
B. Supabase-synced personal state
```

Personalization is real, but identity is currently browser visitor UUID, so profiles can fragment across browsers/devices.

---

## Development / release discipline

```text
latest main
→ short-lived feature/fix branch
→ Vercel Preview
→ PR + CI
→ explicit owner approval
→ main
→ Production
```

Before code submission:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

**Machine PASS ≠ runtime PASS ≠ production PASS ≠ visual PASS.** Keep these claims separate.

Rules:

1. one Gate at a time
2. do not reopen FROZEN surfaces without explicit scope reopening
3. do not force-push unless explicitly requested
4. do not auto-merge
5. do not perform destructive cleanup without explicit approval
6. clearly label anything unverified or tool-blocked
