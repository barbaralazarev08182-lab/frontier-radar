# Gate 17A R2 — Today Intelligence Expression Rethink

Status: DESIGN AUDIT / NO UI IMPLEMENTATION

## Why this R2 exists

Gate 17B v1 was visually rejected by the owner and fully rolled back.

Rejected direction:
- shared floating Signal Dossier;
- translucent/card-like inspection surface;
- duplicated title / score / metadata outside the primary signal object;
- boxed `WHY NOW / WHY YOU / EVIDENCE / BUILD` matrix;
- hover-driven secondary overlay competing with the existing seven-signal composition.

PR #41 is closed as REJECTED and must not be revived.

This R2 supersedes only Gate 17A's implementation recommendation. The Gate 17A data audit remains useful: Today already has enough real intelligence; the failure was presentation strategy.

## Re-read product constitution

Standing product language:

> **Frontier Intelligence × Physical Archive × Research Instrument**

Standing visual authorization:

> **Product contracts conservative. Visual expression aggressive.**

Relevant permanent prohibitions from README / baseline:
- no generic SaaS dashboard composition;
- no floating-card walls;
- no permanent sidebar when interaction can reveal the same information;
- no duplicated text list beside an existing visual object;
- no decorative radar/scanning effects merely because the product is named Radar;
- no motion without information/state meaning;
- no fake metric / coordinate / evidence semantics;
- Lieflat is strict for real data visualization but not mandatory decoration everywhere.

Lieflat upstream was re-read again for this R2.

Important Lieflat constraints relevant here:
- Lupi is record-first, hairline, editorial, slow-read;
- Glance is explicitly a dashboard / fast-scan fallback and is not the default;
- every actual chart must preserve a real data-shape contract;
- if no honest chart fits, do not force one;
- motion is subordinate to structure;
- one underlying record should keep identity when the viewpoint changes.

## What v1 got wrong

### 1. It added a second authority instead of deepening the first

The seven signals are already the physical objects of Today.

The Dossier introduced a large eighth rectangle with its own header, score, title, matrix, footer and hierarchy. The user now had to decide whether the signal or the Dossier was the real object.

That violated the page thesis.

### 2. It converted an editorial composition into product UI

`WHY NOW / WHY YOU / EVIDENCE / BUILD` were arranged as a conventional 2×2 information matrix. Even with Frontier typography, that is structurally a details card.

The result read as a component inserted into an art-directed page instead of the page itself becoming more intelligent.

### 3. It duplicated the signal instead of transforming it

Rank, score, title and source already existed on the signal. Repeating them in a floating inspector wasted visual authority and made the composition feel cheap.

### 4. It hid missing intelligence with filler copy

Examples such as “No personalized explanation is available...” exposed implementation absence as UI content. Missing evidence should produce designed absence, not low-value placeholder sentences.

### 5. It used visual effects that were not earned

Gradient, translucency, scanning/highlight effects and shadow were used to make the Dossier feel special. This conflicts with the current Lieflat / Frontier material language: solid surface, typography, geometry, hairlines, record density and meaningful motion.

### 6. It was conservative in the wrong place

The implementation protected the seven-signal composition so literally that it refused to recompose the selected signal. As a result all new intelligence was forced into an overlay.

The correct interpretation of the frozen contract is:
- preserve the seven-signal selection;
- preserve Hero → Compression → Today → Signal Weave stage choreography;
- preserve exact Today → Project handoff;
- **but allow a bold temporary inspection state inside the Today stage.**

## R2 thesis

> **Do not add an inspector to a signal. Make the signal become the inspector.**

Working name:

# SIGNAL CUTAWAY

The selected signal must remain the same physical record and visibly transform into its deeper intelligence state.

```text
TODAY / 7 records
    ↓ pointer focus
selected record becomes dominant
    ↓ same object, new geometry
SIGNAL CUTAWAY
    ↓ pointer moves / exits
record returns to the 7-record field
    ↓ scroll continues
SIGNAL WEAVE
```

No new dashboard panel. No separate dossier card. No eighth visual object.

## Three concept families reviewed

### A — Floating / fixed dossier

Status: REJECTED / banned.

Reason:
- duplicates object identity;
- becomes a card/sidebar;
- blocks the composition;
- hierarchy collision;
- structurally conservative.

### B — Signal Ribbon Decomposition

Idea:
selected signal physically splits into four horizontal strips for WHY NOW / WHY YOU / EVIDENCE / BUILD.

Strength:
- bold;
- native to Today's tear language;
- no secondary card.

Risk:
- visually competes with the already accepted tear/compression choreography;
- can become theatrical decoration rather than readable intelligence;
- four equal strips imply equal semantic weight when the data does not guarantee it.

Decision: keep as secondary motion vocabulary only, not the primary composition.

### C — Signal Cutaway / Full-sheet transformation

Status: SELECTED.

Idea:
The selected `.motion-lab-signal` itself expands and recomposes into an editorial research sheet. The other six remain spatial context as reduced peripheral records.

Why selected:
- preserves object identity;
- materially changes the page instead of inserting UI;
- can use real record fields without inventing chart semantics;
- fits Physical Archive and Research Instrument language;
- supports aggressive typography and unusual composition;
- can be implemented with the same FLIP/object-continuity grammar already present in Motion Lab.

## Selected visual contract — SIGNAL CUTAWAY

### 1. Default Today stage remains the accepted seven-signal composition

No permanent new UI is visible.

The seven records stay primary.

### 2. Pointer/focus arms one record

Desktop interaction:
- pointer enter / keyboard focus gives a very small arming cue only;
- after a short deliberate dwell, that same signal enters Cutaway;
- clicking the signal still opens `/project/<signal.id>` exactly as before;
- `Escape` or leaving the inspection field returns to normal Today.

Do not turn click into a new modal workflow.

### 3. Same DOM record becomes the intelligence sheet

Preferred implementation:
- use the existing signal node as the transformed object;
- use GSAP FLIP or equivalent object-identity transition;
- do not crossfade into an unrelated `<aside>` or overlay panel.

Target desktop composition:
- selected signal occupies roughly 60–70% of the useful viewport;
- paper remains solid `#F0EFEB` for core records;
- no radius, no drop shadow, no glass, no gradient;
- rank becomes a large structural typographic element, not decoration behind a card;
- score remains on the same object and is not duplicated elsewhere;
- title is the dominant editorial statement;
- source / content type / lane stay as record metadata.

### 4. Intelligence is typeset into the record, not placed into boxes

No 2×2 matrix.

Use an asymmetric editorial grid.

Suggested hierarchy:

```text
[ giant rank / source ]        [ FR score ]

TITLE — dominant, 2–4 lines
SUMMARY — short supporting line

WHY NOW
one strong paragraph / sentence

WHY YOU                    EVIDENCE TRACE
only when real             source / metric / source count
                           CODE / DEMO only when true

BUILD DIRECTION
one strong line spanning the lower field
```

Hairlines may align the reading grid, but sections should not become four equal boxed cells.

### 5. Missing data disappears; it does not apologize

If `whyYou == null`, omit WHY YOU and let adjacent content claim the space.

If code/demo are false, do not show disabled gray chips.

If no source-native metric exists, do not invent a placeholder metric row.

Designed absence > filler copy.

### 6. Evidence should feel like evidence, not badges

Use real facts only:
- source;
- source-native metric label;
- source count;
- cross-source confirmation;
- CODE when `hasCode`;
- DEMO when `hasDemo`.

Representation may use:
- monospaced evidence line;
- hairline brackets;
- small stamped words;
- count marks only when each mark maps to a real source/count.

Do not use disabled chip sets or invented progress bars.

### 7. The other six records remain context

During Cutaway they do not disappear completely.

They recompose toward the perimeter as reduced physical records / indexed spines:
- rank remains visible;
- enough title remains to identify the record;
- Adjacent cobalt and Wildcard orange remain semantic anchors;
- they stay available as the next inspection targets.

This keeps Today as a seven-record field even while one record becomes dominant.

### 8. Moving to another signal must feel like changing specimen, not opening another modal

When pointer/focus moves to another record:
- current record collapses / hands geometry to the next record;
- next record expands from its actual position;
- no screen blanking;
- no unrelated panel replacement;
- no full re-layout flash.

The user should perceive:

```text
same instrument
→ different specimen
```

### 9. Motion contract

Allowed:
- FLIP geometry transition;
- title / evidence lines revealing by clipping or baseline stagger;
- perimeter records repositioning with the same transition family;
- a restrained physical seam / rule movement if it explains unfolding.

Banned:
- blur entrance;
- glass fade;
- scan beam;
- decorative glow;
- gratuitous spring/bounce;
- particle/radar effects.

Timing target:
- object recompose: ~380–520ms, fast-in / fast-stop;
- text reveal after geometry is legible, not before;
- exit slightly faster than entry;
- reduced-motion path switches state without travel animation.

### 10. Semantic color contract

Core:
- paper / ink only.

Adjacent:
- cobalt remains a semantic signal, not a general blue theme.

Wildcard:
- orange remains a semantic signal, not a general orange theme.

Do not introduce a new palette for Cutaway.

## Lieflat decision for R2

No new quantitative chart is justified by the record-level intelligence fields.

The data shape is a heterogeneous single record:
- text reasons;
- categorical source/type/lane;
- optional binary evidence;
- optional source-native heterogeneous metric;
- optional cross-source count.

Forcing L2 / F5 / F8 / G9 would invent common numeric encoding or imply comparability that does not exist.

Therefore:
- Signal Weave remains the one honest relational/synthesis visualization;
- Signal Cutaway uses Lieflat's editorial material language and object-identity motion principles, but is product composition rather than a fake chart.

Relevant upstream R2 re-check:
- Lupi Editorial = record-first, hairline, slow-read;
- G9 Scatter Morph validates the broader principle of preserving entity identity while viewpoint changes, but its scatter data contract is **not** copied here;
- no gallery chart is selected because no chart data shape honestly fits this inspection problem.

## Guardrails added after the failed v1

The next implementation must fail review immediately if any of these appear:

- a new floating rectangle over Today;
- a permanent left/right inspector column;
- a separate panel repeating rank/title/score;
- four equal boxed information cells;
- filler sentences describing missing data;
- gradients / blur / glass / shadows added for “premium” feel;
- generic disabled chips;
- a chart whose axes/units are not real;
- a new visual that makes the seven original records secondary;
- any change to Signal Weave;
- any change to seven-signal selection semantics;
- click no longer handing exact signal id to Project.

## Safer delivery process

The previous process let a machine-correct but visually weak idea reach `/today` too early.

R2 changes the order:

```text
17B-R2.1  visual prototype only
          → dedicated QA surface
          → fixture records
          → no live Today route changes
          → owner visual review

17B-R2.2  interaction prototype
          → object-identity morph between multiple signals
          → keyboard / reduced-motion
          → still isolated from production Today
          → owner review

17B-R2.3  live integration
          → real Today data
          → preserve exact click handoff
          → full CI / browser QA
          → owner final visual acceptance
```

One subgate at a time. Do not skip directly to live integration.

## First prototype target

Next Gate if approved:

# Gate 17B-R2.1 — Signal Cutaway Visual Prototype

Scope:
- desktop only;
- fixture data only;
- dedicated QA route / isolated Motion Lab prototype;
- one selected signal Cutaway state + normal Today comparison;
- no Production Today modification;
- no Signal Weave modification;
- no ranking/personalization/data changes.

The prototype must show at least:
1. Core signal Cutaway;
2. Adjacent signal Cutaway to prove cobalt semantics stay controlled;
3. Wildcard signal Cutaway to prove orange semantics stay controlled;
4. one missing-data case where layout closes the gap instead of showing filler copy.

Owner visual PASS is required before any live Today integration starts.
