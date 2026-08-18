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

### Visual restoration / parity recovery protocol — MANDATORY (2026-08-18)

This protocol is binding for any task that restores, merges, ports, or re-integrates an already owner-approved visual/runtime state.

1. **Owner-approved deployment/commit is the sole visual source of truth.** Once the owner confirms a version, do not reinterpret, redesign, imitate, selectively simplify, or substitute another historical version.
2. **Treat restoration as a parity problem, not a design problem.** Recover the exact DOM/runtime/style behavior first. Do not add new motion or aesthetic judgment while parity is unresolved.
3. **Code equality is not visual equality.** Matching file names, blob SHAs, build success, or CSS presence does not constitute a visual PASS.
4. **Validate the full runtime dependency closure.** Include route DOM, nested/root layouts, shared shell/nav, shared CSS, client controllers, hydration, Suspense/loading behavior, data loaders, and stage state.
5. **A real-browser A/B gate is mandatory before merge.** Compare the approved deployment and candidate Preview at the same viewport and the same scroll/stage state. For Project, Evidence must visibly reach its approved active reading state, including stage activation and dynamically injected reading summaries.
6. **Never use the owner as the first visual tester.** An unverified Preview must be labeled diagnostic. Do not present it as restored/final until browser parity has been checked.
7. **First visible mismatch stops the patch chain.** Do not stack speculative fixes. Stop, identify the first runtime/visual divergence, change only that cause, then rerun A/B.
8. **No visual parity, no merge.** `READY`, CI PASS, runtime PASS, and mergeability are insufficient without visual PASS.
9. **Do not regress unrelated frozen surfaces while restoring one route.** Isolate route-specific compatibility glue rather than rolling back Today, Explore, Radar, Saved, or Idea Lab.
10. **If this failure mode repeats:** stop immediately → keep `main` untouched → invalidate the candidate PR/branch as final → return to the last owner-approved deployment → reproduce at an identical stage → locate the first divergence → make one narrow fix → re-run visual parity.

#### 2026-08-18 Project restoration incident — root cause and lesson

The owner-approved Project baseline is Gate 15B (`adab508844483b5bc88ef253e43d9aa3cc22b4d5`). The later Project route added `loading.tsx`. The Gate 15B `ProjectReadingController` originally queried `.pr-shell` once in `useEffect`; when Suspense/loading rendered before the real page, `.pr-shell` did not yet exist, the controller returned permanently, and the approved runtime reading state never initialized. Static Project markup and CSS therefore appeared while Evidence activation, injected `EPISTEMIC MIX` / `READ THIS STAGE AS`, reveal state, and stage-aware behavior were absent.

Mandatory lesson: when introducing route loading/Suspense around an older client controller, verify that initialization waits for the real route DOM instead of assuming it exists on first effect execution.

<!-- deploy-trigger: 2026-08-17T22:16+08:00 -->
