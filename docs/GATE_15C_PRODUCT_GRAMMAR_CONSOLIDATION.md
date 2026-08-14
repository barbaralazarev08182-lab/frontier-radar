# Gate 15C — Product Grammar / Visual System Consolidation

Status: CURRENT / DRAFT

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

Gate 15C must learn from them, not re-style them.

## Current implementation problem

The product currently reaches the accepted visual result through several historical CSS layers:

```text
product-grammar.css
product-grammar-layer2.css
site-nav-transparent-light.css
surface-pass-5.css
micro-polish-pass.css
```

Several of these layers redefine or override the same concepts such as:

- light paper tone
- light navigation background / translucency
- shared semantic accents
- interaction timing
- route identity grammar

The browser result is currently correct, but the source of truth is fragmented.

## Gate thesis

> **Consolidate the grammar, not the layouts.**

The product should share one system for:

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

## Subgates

### 15C-A — Canonical primitives — CURRENT

Create a single system layer that records the owner-accepted primitives without changing current rendered output.

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

Header:

```text
48px
```

Motion personality:

```text
fast-in / fast-stop
no gratuitous bounce
cubicOut / quarticOut family
~160ms micro interaction
~340ms focus / object-identity transition
prefers-reduced-motion fallback required
```

15C-A must be a **visual no-op** on accepted pages.

### 15C-B — Override consolidation — PLANNED

After 15C-A CI/runtime proof, reduce duplicate historical overrides where they can be replaced by the canonical primitives with computed-style parity.

No deletion or cleanup is allowed merely because a file looks old. Remove a legacy rule only after its replacement is verified.

### 15C-C — Shared grammar audit — PLANNED

Audit Today, Saved and Idea Lab against the shared grammar **without automatically redesigning them**.

Output should classify each difference as one of:

```text
SYSTEM DRIFT     -> should eventually converge
ROUTE PERSONALITY -> intentionally different
FROZEN CONTRACT  -> do not touch
FUTURE GATE      -> valid issue, out of this Gate
```

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

Gate 15C itself does **not** add charts simply to express the visual system.

## Non-goals

- no Explore redesign
- no Project redesign
- no Today / Signal Weave redesign
- no Saved redesign
- no Idea Lab redesign
- no mobile work
- no ranking / personalization changes
- no schema / database changes
- no new product capability claims
- no Production deployment without explicit owner approval

## Delivery / safety

Stacked branch:

```text
agent/gate-15c-product-grammar-consolidation
```

Base:

```text
agent/gate-15b-project-research-mode
```

Workflow:

```text
narrow subgate
→ CI
→ Preview/runtime parity where relevant
→ owner review when visual output changes
→ freeze subgate
```

Machine PASS != Runtime PASS != Visual PASS.

No auto-merge. No force-push. No destructive cleanup.
