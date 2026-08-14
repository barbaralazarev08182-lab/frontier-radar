# Frontier Radar

**A personalized frontier intelligence system for discovering what is becoming worth attention — and turning it into research or product directions.**

Frontier Radar 不是普通 AI 新闻聚合器，也不是 GitHub 热榜。它把多来源 frontier signals 经过评分、个性化、跨来源证据与 synthesis，串成一条完整产品链：

```text
Discover → Understand → Get Inspired → Build
```

> 新协作者 / 新 agent **先读 [`docs/FRONTIER_RADAR_PROJECT_BASELINE.md`](docs/FRONTIER_RADAR_PROJECT_BASELINE.md)**，它负责当前状态、Gate、FROZEN/CURRENT 和恢复基线。  
> [`docs/START-HERE.md`](docs/START-HERE.md) 可作为历史导航入口，但若与最新 baseline 冲突，以最新 baseline 为准。  
> `AGENTS.md` 保存 coding-agent 协作规则。  
> 本 README 的 **Design & Lieflat Standard** 是长期设计标准；状态事实仍服从最新 baseline 与更晚的 owner 明确指令。

---

## Current baseline — historical snapshot

> 本节保留历史项目快照，不作为最新 Gate 状态来源。最新状态请读 `docs/FRONTIER_RADAR_PROJECT_BASELINE.md` 并重新核对 live Git / PR / Vercel。

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

---

# Design & Lieflat Standard — ACTIVE

This section is a standing product/design contract for future Gates unless the owner explicitly overrides it.

## 1. Core visual language

```text
Frontier Intelligence × Physical Archive × Research Instrument
```

The product should feel like a serious frontier-intelligence instrument owned by a researcher, not a component library or a generic AI dashboard.

Default qualities:
- editorial, data-native, instrument-like
- physical/archive presence without fake skeuomorphism
- strong information hierarchy and deliberate whitespace
- restrained but meaningful interaction
- geometry, typography, density, hairlines, dots/ticks and record rhythm as texture
- route-specific personality inside one shared product grammar

Avoid by default:
- generic SaaS dashboards
- bento-grid defaults
- PPT-style heroes
- heavy glassmorphism
- glowing AI galaxies / neon futurism
- decorative radar circles, sonar sweeps or scanning lines just because the product is named Radar
- floating-card walls
- fake semantic coordinates
- permanent sidebars when interaction can reveal the same information
- duplicated text lists beside a visualization that already carries the same labels
- motion without information/state meaning

Suspicion rule:

> If the design looks like a generic AI image generator would naturally produce it, question it.

## 2. Product truth before visual ambition

Standing rule:

> **Product contracts conservative. Visual expression aggressive.**

Protect:
- ranking semantics
- personalization semantics
- source/data truth
- route contracts
- protected Project stages
- Today signal-count contract
- explicit FROZEN contracts

Visuals may be bold only when they remain truthful. Never imply metrics, semantic embeddings, trained recommenders, evidence networks, historical depth, or relationships that the product does not actually have.

One visual should answer one clear question.

If no honest visualization fits the data, do not force one.

## 3. Lieflat Charts is the primary data-visual dependency

Upstream:

```text
larashero3-dotcom/lieflat-charts
```

For data-bearing visualization work, implementation must begin from the upstream Lieflat material, not from memory or visual imitation.

Primary source of truth:

```text
SKILL.md
catalog.md
mono-tokens.js
templates/lupi-gallery.html
templates/basics-gallery.html
templates/glance-gallery.html
templates/big-*.html
templates/color/*
```

The required process is:

```text
real data shape
→ define the user decision / question
→ read Lieflat SKILL.md + catalog
→ audit Lupi Editorial
→ audit Lupi Basics
→ compare at least 3 real candidates when available
→ use Glance only when Editorial/Basics do not honestly fit or rapid dashboard reading is truly the task
→ lock one real upstream template
→ preserve its geometry / encoding / proportional contract / motion rhythm
→ replace with Frontier Radar's real data, copy and product interaction
```

Do **not**:

```text
pick a familiar chart
→ imitate its appearance
→ force the data into it
```

Template-first means preserving the upstream visualization contract, not merely borrowing the aesthetic.

## 4. Do not collapse Lieflat into the templates already used

A successful Explore implementation using `L12 Type Colonnade` does **not** make L12 the default Frontier Radar chart.

For every new data-bearing Gate:
1. Reopen the relevant Lieflat catalog from the real data shape.
2. Review unused or underused template families before reusing an existing Frontier Radar pattern.
3. Prefer a different honest visual grammar when it communicates the question better.
4. Reuse a prior template only because it is the best fit, never because it is already implemented.

Frontier Radar should gradually use Lieflat as a **data-visual language library**, not a one-template house style.

### Lieflat Opportunity Map

When planning future surfaces, actively consider underused Lieflat capabilities where the data supports them:

- **morph / one-dataset-multiple-views** — the same records keep identity while the encoding changes
- **scatter / spatial fields** — when two continuous variables are the real question
- **timeline / temporal motion** — emergence, momentum, metric history, project evolution
- **small multiples / comparative views** — compare multiple frontiers or slices without collapsing them into one score
- **relational / convergence layouts** — only when real source, evidence, topic or project relationships exist
- **dense editorial compositions** — typography + geometry + data as one information surface, not a chart placed inside a dashboard

The purpose of this map is **not** to consume every Lieflat design. It is to prevent the product from becoming visually conservative merely because earlier Gates already succeeded.

## 5. Morph and transition principle

When the same dataset is shown through multiple views, prefer preserving object identity across transitions instead of redrawing unrelated scenes.

Example principle:

```text
same records
→ change viewpoint / coordinate / ordering
→ records visibly travel to their new meaning
```

This is especially relevant to future lens, time, quality, momentum, source and personalization views.

Motion should explain state change:
- fast-in / fast-stop
- cubicOut / quarticOut family
- no gratuitous bounce
- stagger only when it helps reading
- interaction transitions should preserve continuity
- `prefers-reduced-motion` fallback is required

Motion is subordinate to structure.

## 6. Shared visual tokens

Default Lieflat-native mono system:

```text
PAPER  #F0EFEB
INK    #1C1C1A
MUTED  #8F8E88
FAINT  #C6C5BF
GRID   #DEDDD6
```

Hierarchy comes primarily from luminance, typography, scale, geometry and whitespace.

Frontier Radar semantic accents remain meaningful:

```text
Adjacent = cobalt
Wildcard = orange
```

These are semantic signifiers, not general decoration colors. Do not repaint whole visualizations with them unless the data meaning genuinely requires it.

Use one coherent color system per visual delivery. Do not casually mix palettes.

## 7. Same product does not mean same layout

Workspace identities:

```text
01 TODAY · DAILY DISCOVERY
02 EXPLORE · FRONTIER FIELD
03 PROJECT · INTELLIGENCE
04 SAVED · RESEARCH SHELF
05 IDEA LAB · DIRECTION WORKBENCH
```

Unify product grammar:
- header / route identity
- paper / ink / semantic accents
- metadata rhythm
- typography hierarchy
- active-state grammar
- CTA grammar
- hairlines
- spacing logic
- motion rhythm

But preserve route personality.

> **Do not mistake “same product” for “every route uses the same layout.”**

Explore can behave like a frontier field. Project can behave like a research workbench. Saved can behave like an archive. Idea Lab can behave like a direction workbench.

## 8. Lieflat is strict for data visualization, not mandatory decoration everywhere

Lieflat should be the first dependency for genuine data visualization, but not every page needs a chart.

Examples:
- Saved may derive more value from archive typography, ordering, metadata and record grammar than from a forced chart.
- Idea Lab must not visually imply a synthesis engine or hypothesis system it does not yet have.
- Project may use Lieflat geometry / motion / information grammar without forcing every chapter into an upstream chart template.

Use the strongest honest representation, not the maximum number of charts.

## 9. Gate discipline for visual work

```text
one Gate at a time
→ branch / current Gate branch
→ narrow implementation
→ CI / runtime verification
→ real browser visual review
→ explicit owner acceptance
→ freeze
```

Machine PASS ≠ runtime PASS ≠ visual PASS.

Do not reopen FROZEN surfaces without explicit owner scope reopening.
Do not auto-merge, force-push, perform destructive cleanup, or deploy Production without explicit approval.

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

### Explore — historical frozen contract

Formal historical direction:

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

> Current Explore visual/Gate truth may be newer than this historical section. Read the latest project baseline and live PR before acting.

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
