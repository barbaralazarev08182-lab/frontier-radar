# Frontier Radar

**A personalized frontier intelligence system for discovering what is becoming worth attention — and turning it into research or product directions.**

Frontier Radar 不是普通 AI 新闻聚合器，也不是 GitHub 热榜。它把多来源 frontier signals 经过评分、个性化、跨来源证据与 synthesis，串成一条完整产品链：

```text
Discover → Understand → Get Inspired → Build
```

> 新协作者先读 [`docs/START-HERE.md`](docs/START-HERE.md)。  
> 2026-08-12 Production / Gate 11 完整状态见 [`docs/checkpoints/2026-08-12-production-checkpoint.md`](docs/checkpoints/2026-08-12-production-checkpoint.md)。  
> `AGENTS.md` 保存 coding-agent 协作规则。

---

## Current baseline — 2026-08-12

Current GitHub `main` before this documentation closure record is merged:

```text
3fe4977b72084b0dca9232e69b84151ae7a1e205
Gate 11D: lock Today Project Idea Lab handoffs in CI
```

Production:

```text
https://frontier-radar-eosin.vercel.app
Supabase: grnorpdbdrmfrdjeorvz / ap-southeast-1 / ACTIVE_HEALTHY
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

## Gate 11 — Production Integrity Hardening — CLOSED

Gate 11 established the Production integrity boundary without reopening frozen product surfaces.

```text
Gate 11A    Preview / Production runtime write isolation       CLOSED
Gate 11B-A  Function privilege hardening                       CLOSED
Gate 11B-B  Public feed boundary hardening                     CLOSED
Gate 11B-C1 Application-role ACL hardening                     CLOSED
Gate 11C    Stale collection-run terminalization               CLOSED
Gate 11D    Gate 9 / Gate 10 deterministic CI regressions      CLOSED
```

Current integrity invariants:

- Vercel Production may persist runtime data; Preview / Development / unexpected Vercel environments are blocked before Production Supabase writes.
- Public feed reads are server-side through the service-role client and a `security_invoker` feed view.
- `anon` / `authenticated` have no direct privileges on current public relations or sequences and no direct public-function EXECUTE path.
- Security Advisor has no Gate-11 ERROR/WARN findings; remaining `RLS Enabled No Policy` findings are INFO on intentionally locked tables.
- Any new `collection_runs` insert sweeps prior `running` rows older than one hour to terminal `failed`; the eight historical Aug-07 orphan runs were repaired.
- Gate 9 Today → Project exact-ID and Gate 10 Project → Idea Lab exact-`from` contracts now run permanently inside the existing `npm test` CI step.
- No Gate 11 integrity subgate changed frozen visuals.

Key merged PRs:

```text
#18  Gate 11A
#20  Gate 11B-A
#21  Gate 11B-B application boundary
#22  Gate 11B-B migration record
#23  Gate 11B-C1
#24  Gate 11C
#25  Gate 11D
```

See the checkpoint for exact migrations, CI runs, runtime probes, Production validations, and non-scope decisions.

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

```text
PRIVATE RESEARCH SHELF
frontier_radar_saved_items_v1
src/lib/saved/browser.ts
```

Current v1 persistence is browser-local.

### Idea Lab — VISUAL PASS + INTERACTION PASS + FROZEN

```text
Signal-to-Direction Workbench
Saved Signal → Pinned Signal → Working Note → Personal Direction
SEED / SHAPING / BUILDING
frontier_radar_ideas_v1
```

If a Saved source is later removed, an existing Idea remains and shows `SOURCE NO LONGER SAVED`.

---

## Remaining product-integrity decisions

These were explicitly deferred from Gate 11 rather than left accidentally unfinished.

### Gate 12 candidate — Personal Memory Durability

Saved and Idea Lab remain intentionally browser-local in v1. Before changing this frozen contract, explicitly choose:

```text
A. browser-local + export / backup / import
B. Supabase-synced personal state
```

### Gate 13 candidate — Personalization Integrity

Current identity is browser visitor UUID, so profiles can fragment across browsers/devices. Future work may address durable identity, QA/test-event quarantine, and ranking-effect proof.

Semantic embeddings are not yet populated; current feature-vector / rules fallback remains valid.

`supabase_admin` default ACL was intentionally outside Gate 11B-C1 because current Frontier Radar public objects are `postgres`-owned and changing Supabase internal-role defaults carries platform-compatibility risk.

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

### Restoration / recovery protocol

When a previously owner-approved surface regresses, treat restoration as recovery of an accepted state, not as a new design task.

```text
STOP
→ leave main untouched
→ identify the owner-approved deployment / commit
→ reproduce the same route, viewport, data and interaction stage
→ find the first divergence
→ apply one narrow fix
→ re-check parity in a real browser
→ merge only after parity
```

Restoration invariants:

- The latest owner-approved deployment or commit is the source of truth. A later branch, screenshot memory, or visually similar reconstruction is not equivalent evidence.
- Restoration ≠ redesign. Do not replace an accepted composition with a new approximation just because it is easier to reproduce.
- Code equality ≠ visual equality. CSS cascade, route boundaries, Suspense/loading state, data timing, animation lifecycle and runtime dependencies can change the rendered result without an obvious component diff.
- Validate the full runtime dependency closure around the accepted surface, including route-level files, layout/loading boundaries, controllers, CSS import order and transition infrastructure.
- Final parity requires real-browser A/B at the same viewport and the same interaction stage. Machine tests and Vercel `READY` may support the check but cannot replace visual acceptance.
- The owner should not become the first visual test runner when a browser environment is available. If automated browser access is blocked, an owner-provided screenshot / explicit visual confirmation is the accepted exception.
- The first mismatch stops the patch chain. Diagnose that divergence before stacking more visual patches.
- No parity, no merge. Frozen surfaces must not regress while restoring another surface.

Project-specific failure record:

- During Project Gate15B restoration, restoring `src/app/project/[id]/loading.tsx` also restored a route-level Suspense/loading lifecycle that appeared before the real `.pr-shell`.
- That lifecycle interfered with `ProjectReadingController` and changed the accepted Project motion even though the restored route looked structurally correct in code.
- The fix was not to keep patching Project visuals. The accepted Project route stayed free of that route-level `loading.tsx`, and the historical `RESOLVING PROJECT SIGNAL` scene was moved to a root-persistent entry overlay.
- The overlay now waits for the real `.pr-shell`, satisfies its minimum display time, then waits two consecutive `requestAnimationFrame` ticks before clearing. A long safety timer is exception-only, not part of normal transition timing.

<!-- deploy-trigger: 2026-08-17T22:16+08:00 -->
