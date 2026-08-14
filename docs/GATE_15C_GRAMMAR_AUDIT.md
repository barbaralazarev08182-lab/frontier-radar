# Gate 15C — Cross-route Grammar Audit

Status: AUDIT COMPLETE / NO VISUAL CHANGES AUTHORIZED BY THIS DOCUMENT

This audit classifies differences across current Frontier Radar surfaces without reopening their visual contracts.

Classification:

```text
SYSTEM DRIFT       -> should converge at the grammar/source level
ROUTE PERSONALITY  -> intentionally different
FROZEN CONTRACT    -> protected, do not touch in this Gate
FUTURE GATE        -> valid work, but not 15C scope
```

---

## Shared shell

### SYSTEM DRIFT

Historical CSS layers still overlap in responsibility:

```text
product-grammar.css
product-grammar-layer2.css
site-nav-transparent-light.css
surface-pass-5.css
micro-polish-pass.css
```

The accepted browser result is valid, but ownership of paper/nav/token rules is fragmented.

15C-A / 15C-B response:
- add `frontier-system.css` as canonical primitive registry
- route exact-value aliases through system tokens
- centralize workspace identities in `src/lib/frontier-workspaces.ts`
- do not delete historical rules until parity is proven

### CANONICAL SHARED GRAMMAR

```text
PAPER  #F0EFEB
INK    #1C1C1A
MUTED  #8F8E88
FAINT  #C6C5BF
GRID   #DEDDD6
HEADER 48px
```

Motion:

```text
micro ~160ms
focus/object continuity ~340ms
fast-in / fast-stop
no gratuitous bounce
reduced-motion fallback required
```

Workspace identities:

```text
01 TODAY    · DAILY DISCOVERY
02 EXPLORE  · FRONTIER FIELD
03 PROJECT  · INTELLIGENCE
04 SAVED    · RESEARCH SHELF
05 IDEA LAB · DIRECTION WORKBENCH
```

---

## Explore

### FROZEN CONTRACT

Owner Visual PASS.

Keep:
- L12 Type Colonnade data geometry
- Lens ranking semantics
- Global Score semantics
- metadata-derived tag families
- Focus Aperture
- click / keyboard / wheel transition motion
- Project-matched `#F0EFEB` paper
- accepted blue perimeter artwork

### ROUTE PERSONALITY

Explore is a **frontier field**, not a generic list page or dashboard.

Its viewport-scale data composition and perimeter research-instrument marks are intentional.

### FUTURE GATE

Do not reuse L12 by default. Future data views must restart from Lieflat SKILL.md + catalog and the real data shape.

---

## Project

### FROZEN CONTRACT

Owner Visual PASS.

Protected stages:

```text
01 CAPTURE
02 EVIDENCE
03 INTERROGATION
04 RESOLUTION
05 BUILD
```

Keep ordinary browser scrolling and accepted Research Mode.

### ROUTE PERSONALITY

Project is a **research document / workbench**. It should not be forced into Explore's full-field composition.

Sparse evidence must stay visibly sparse.

---

## Today

### FROZEN CONTRACT

Keep:
- at most 7 signals
- 5 Core + 1 Adjacent + 1 Wildcard
- Adjacent semantic cobalt
- Wildcard semantic orange
- Signal Weave `7 -> 3 patterns -> Final Take`
- accepted gesture / stage behavior

### ROUTE PERSONALITY

Today is the **Daily Discovery** surface. Its cinematic opening and Signal Weave identity are intentionally different from Explore / Project.

### SYSTEM DRIFT

Production Today still imports a chain of historical QA / Motion Lab style layers:

```text
motion-lab.css
motion-lab-lab03.css
motion-lab-lab04.css
motion-lab-lab05.css
motion-lab-handoff.css
motion-lab-lab06.css
motion-lab-direct-handoff.css
today-motion-production.css
```

This is source-organization debt, not permission to redesign Today.

Do not fold or delete these layers inside 15C unless exact visual/runtime parity can be proven and the owner explicitly reopens Today implementation cleanup.

### FUTURE GATE

Today intelligence density remains a later product Gate after Personal Radar.

---

## Saved

### FROZEN CONTRACT

Keep browser-local persistence and the accepted Saved interaction contract.

### ROUTE PERSONALITY

Saved is a **dark physical research archive / shelf**. Its dark environment is not required to match the light Explore/Project paper.

The archive/book/shelf material language is intentional route personality.

### SYSTEM DRIFT

Current Saved local accent values include blue variants such as `#5366ff` / `#7d8cff`, while the canonical product semantic cobalt is registered separately.

Do not recolor Saved inside 15C because it is FROZEN. Record this as semantic-token drift for a future Saved-specific visual Gate only if the owner reopens it.

### FUTURE GATE

Known future questions:
- empty-state Explore CTA strength
- archive behavior at 50–200 saved records

Do not force a chart merely to make Saved look Lieflat-native.

---

## Idea Lab

### FROZEN CONTRACT

Current actual capability remains limited to:
- exact source binding
- idea title/text
- status
- autosave
- delete
- view source

Do not imply a synthesis engine, hypothesis engine, autonomous researcher, or export system that does not exist.

### ROUTE PERSONALITY

Idea Lab is a **dark direction workbench**. The source rack / working sheet / idea rack composition is intentionally different from Explore and Project.

### SYSTEM DRIFT

Idea Lab also uses local blue variants (`#5366ff`, `#8490ff`, etc.) instead of one canonical semantic accent token.

Do not recolor a FROZEN surface in 15C; record the drift only.

### FUTURE GATE

Functional depth should precede any large visual promise expansion.

---

## Personal Radar — next major surface after 15C

Personal Radar is not implemented by this Gate.

When its data contract is defined, restart from:

```text
real personalization event/history shape
-> user question
-> Lieflat SKILL.md + catalog
-> Lupi Editorial + Basics audit
-> compare >= 3 honest templates
```

Actively consider underused Lieflat capabilities:
- one dataset / multiple view morph
- relational convergence
- temporal change
- small multiples
- spatial/scatter fields when two real continuous variables exist

Do not make a literal radar chart just because the page is called Personal Radar.

---

## Gate 15C conclusion

The shared product identity should converge through **primitives and semantics**, not by flattening route personalities.

```text
same grammar
!=
same layout
```

No visual redesign of Today, Explore, Project, Saved, or Idea Lab is authorized by this audit.
