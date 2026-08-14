# Gate 15C — Product Grammar / Visual System Consolidation

Status: COMPLETE / MACHINE PASS / NOT MERGED

## Objective

Turn the visual language already accepted in Explore and Project into a reusable Frontier Radar product grammar **without redesigning or visually drifting any FROZEN surface**.

Core language:

> **Frontier Intelligence × Physical Archive × Research Instrument**

Standing rule:

> **Product contracts conservative. Visual expression aggressive.**

This Gate is not a new page redesign. It is a consolidation Gate.

## Owner-accepted reference surfaces

The following are the current reference implementations and are FROZEN unless the owner explicitly reopens them:

- Explore — L12 Type Colonnade / Focus Aperture / owner-approved perimeter field / Project-matched paper / focus + wheel transition motion
- Project — Research Mode / five protected stages / ordinary browser scrolling / accepted chart and chapter motion

Gate 15C learns from them; it does not re-style them.

## Gate thesis

> **Consolidate the grammar, not the layouts.**

The product shares one system for:

- workspace identity
- paper / ink / muted / faint / grid vocabulary
- semantic cobalt and Wildcard orange
- 48px global header rhythm
- metadata / kicker rhythm
- CTA / active-state grammar
- hairlines and record separators
- motion timing and easing families
- focus-visible treatment

But each route keeps its own composition and personality.

```text
01 TODAY    · DAILY DISCOVERY
02 EXPLORE  · FRONTIER FIELD
03 PROJECT  · INTELLIGENCE
04 SAVED    · RESEARCH SHELF
05 IDEA LAB · DIRECTION WORKBENCH
```

Same product != same layout.

## Completed subgates

### 15C-A — Canonical primitives — COMPLETE

Created `src/app/frontier-system.css` as the canonical primitive registry and loaded it before historical product-grammar layers.

Canonical light research surface:

```text
PAPER  #F0EFEB
INK    #1C1C1A
MUTED  #8F8E88
FAINT  #C6C5BF
GRID   #DEDDD6
```

Product semantic accents:

```text
Adjacent / primary research accent = cobalt
Wildcard = orange
```

Shared shell / motion:

```text
HEADER 48px
micro interaction ~160ms
focus / object-identity transition ~340ms
fast-in / fast-stop
no gratuitous bounce
prefers-reduced-motion fallback required
```

Also centralized the 01–05 workspace identity contract in `src/lib/frontier-workspaces.ts` and changed `SiteNav` to consume that single source.

### 15C-B — Exact-value override consolidation — COMPLETE

Only values already identical in the accepted browser result were migrated to canonical aliases:

- product cobalt
- Wildcard orange
- 48px header height
- shared UI easing
- accepted Explore / Project `#F0EFEB` paper alias

Deliberately **not** changed:
- older route-local paper/ink values that are not exact matches
- Today production motion layers
- Saved dark archive palette
- Idea Lab dark workbench palette
- any FROZEN route composition

No historical CSS file was deleted merely because it looked old.

### 15C-C — Shared grammar audit — COMPLETE

Recorded in:

```text
docs/GATE_15C_GRAMMAR_AUDIT.md
```

Every cross-route difference is classified as:

```text
SYSTEM DRIFT
ROUTE PERSONALITY
FROZEN CONTRACT
FUTURE GATE
```

Important result:
- Today cinematic Daily Discovery = route personality / frozen behavior
- Saved dark research archive = route personality
- Idea Lab dark direction workbench = route personality
- local accent-token differences and historical CSS layering = system/source drift to handle only in a future explicitly reopened route Gate

## Lieflat rule

Lieflat Charts remains the primary data-visual design dependency.

Every future data-bearing Gate must restart from:

```text
real data shape
→ user question / decision
→ Lieflat SKILL.md + catalog
→ Lupi Editorial audit
→ Lupi Basics audit
→ compare >= 3 real templates when available
→ select the honest upstream contract
```

A successful L12 implementation does not make L12 the default.

Gate 15C itself adds no chart simply to express the visual system.

## Verification

Latest full Integration QA on the completed 15C stack:

```text
run 31784717749
TypeCheck PASS
ESLint PASS
Unit tests PASS
fixture build PASS
application start PASS
browser integration gate PASS
screenshot artifact upload PASS
```

This proves machine/browser regression safety for the existing integration chain. It is **not** a new owner Visual PASS claim because Gate 15C intentionally introduced no new visual composition.

## Non-goals preserved

- no Explore redesign
- no Project redesign
- no Today / Signal Weave redesign
- no Saved redesign
- no Idea Lab redesign
- no mobile work
- no ranking / personalization changes
- no schema / database changes
- no new product capability claims
- no Production deployment

## Delivery / safety

Stacked branch:

```text
agent/gate-15c-product-grammar-consolidation
```

Base:

```text
agent/gate-15b-project-research-mode
```

PR #37 remains Draft / Open / Not merged.

Machine PASS != Runtime PASS != Visual PASS.

No auto-merge. No force-push. No destructive cleanup.
