---
title: FRONTIER RADAR — Project Baseline
type: project-handoff
project: FRONTIER_RADAR
created: 2026-08-14
updated: 2026-08-14
status: ACTIVE_BASELINE
trust: HIGH
---

# FRONTIER RADAR — Project Baseline

> **READ THIS FIRST**
>
> This is the canonical recovery baseline for Frontier Radar. In a new chat / agent session, read this file before proposing or implementing work.
>
> Trust order:
> 1. Explicit newer owner instruction in the current conversation.
> 2. Newer verified Git / Production / Supabase evidence.
> 3. This baseline.
> 4. Older chat memory, screenshots, or assumptions.
>
> `FROZEN` means do not reopen unless the owner explicitly reopens it. `CURRENT` means it may evolve through the active Gate. `HISTORICAL SNAPSHOT` means re-query before citing exact counts.

---

# 0. CURRENT STATE — START HERE

## Active objective

Frontier Radar is moving from a collection of visually impressive concept pages into one coherent, truthful, high-end discovery product whose visual language is data-native.

Current visual foundation:

> **Lieflat Charts first**
>
> + Frontier Radar product/data logic  
> + Awwwards / experimental editorial spatial composition  
> + Pi / Claude / Hermes-like restraint and product usability

Lieflat Charts is the **primary data-visual design dependency**, not a decorative reference.

## Current Gate

### Gate 15A — Lieflat-native Explore — CURRENT

The existing v3 Explore experiment is useful but not final.

Owner assessment:
- much better than the old floating-card Explore
- still not enough
- current page still reads too much like a dashboard containing a Lieflat chart
- permanent left ranking / center chart / right detail / top control structure is too SaaS-like

### Next action

Build **Gate 15A v4 — Lieflat-native Explore**.

Do not simply polish v3.

The next version should:
1. Treat the entire Explore surface as a data composition, not a three-column dashboard.
2. Select Lieflat template by **actual data shape**, not by attachment to L1 Launch Fan.
3. Compare at least:
   - `L1 Launch Fan`
   - `L5 Radial Convergence`
   - `L12 Type Colonnade`
   - `F5 Tick Rows` when ranked values are the actual question
4. Keep detail / ranking as interaction layers when possible instead of permanent structural sidebars.
5. Use actual upstream Lieflat template geometry / encoding / motion contracts rather than merely imitating the style.
6. Preserve data truth and product contracts.
7. Be visually bold. Large layout changes are allowed.

---

# 1. OWNER DESIGN AUTHORIZATION

The project is no longer operating under “change as little as possible.”

New default:

> **Protect product/data contracts; be bold with visual expression.**

Allowed when the active Gate supports it:
- major layout recomposition
- new information hierarchy
- new interaction model
- viewport-scale SVG
- unusual editorial grids
- large typography changes
- removal of existing card structures
- interaction-driven detail reveal
- data-native motion
- replacement of visual metaphors that no longer work
- substantial page redesign

Still protected:
- ranking semantics
- personalization semantics
- source/data truth
- Saved / Idea Lab / Project route contracts
- protected Project stage structure
- Today signal-count contract
- production safety workflow
- explicit FROZEN contracts

Rule:

> **Product contracts conservative. Visual expression aggressive.**

---

# 2. PRODUCT DOCTRINE — FROZEN

- Discovery > Search
- Rising > Popular
- Idea Spark
- Project > Article
- Tryability
- Serendipity
- Core / Adjacent / Wildcard
- Global Discovery Score != Personal Match
- No click != dislike
- Candidate quality before ML sophistication
- Never claim a semantic recommender / trained ML ranker when production only contains deterministic or rule-based infrastructure.
- Visualizations must not imply metrics that do not exist.

## Today contract — FROZEN

Today returns at most 7 signals:
- 5 Core
- 1 Adjacent
- 1 Wildcard

Semantic colors:
- Adjacent = cobalt
- Wildcard = orange

Today’s visual layout may change in later visual Gates, but this content contract stays protected unless explicitly reopened.

## Signal Weave — FROZEN

Do not redesign / reopen Signal Weave unless the owner explicitly asks.

---

# 3. PRODUCT ROUTE / STATE CONTRACTS — FROZEN

## Saved

Browser-local persistence:

```text
frontier_radar_saved_items_v1
```

Event:

```text
frontier-radar:saved-changed
```

## Idea Lab

Browser-local persistence:

```text
frontier_radar_ideas_v1
```

Event:

```text
frontier-radar:ideas-changed
```

Exact source binding:

```text
activeIdea.sourceItemId === selectedSource.id
```

Orphan ideas must be preserved.

## Project Intelligence

Protected five-stage structure:

```text
01 CAPTURE
02 EVIDENCE
03 INTERROGATION
04 RESOLUTION
05 BUILD
```

Do not rename, remove, merge, or reorder these stages unless explicitly reopened.

Project → Idea exact route:

```text
/idea-lab?from=<id>
```

Today → Project exact route:

```text
/project/<signal.id>
```

## Personal-memory durability

Accepted Route A:
- Saved = browser-local
- Idea Lab = browser-local
- manual backup / restore

Do not reopen Supabase synchronization unless the owner explicitly asks.

---

# 4. INFRA / REPOSITORY

GitHub private repo:

```text
barbaralazarev08182-lab/frontier-radar
```

Production:

```text
https://frontier-radar-eosin.vercel.app
```

Supabase project ref:

```text
grnorpdbdrmfrdjeorvz
```

Region:

```text
ap-southeast-1
```

Last known healthy DB state:

```text
ACTIVE_HEALTHY
Postgres 17.6.1
```

Vercel project ID:

```text
prj_3krf0u7tMQi4xpUli1XWo1EFAUqr
```

Vercel team ID:

```text
team_sJAh84S1Yl4q4IyL8ayNB6O9
```

---

# 5. GIT / PR BASELINE — VERIFY BEFORE ACTION

Last confirmed `main` after Gate 13D:

```text
80cd4bf71c8d0a8a968d831b3029c8154fa29976
```

Always verify current main before new work.

## PR #32 — Gate 14A Explore Integrity

```text
OPEN
DRAFT
NOT MERGED
```

Head:

```text
agent/gate-14a-explore-integrity
a6c5e47b733a1062f898aa51bc4dd7d4b5ab7ae8
```

Status: **SUPERSEDED / DO NOT MERGE**.

It fixed false semantic-axis language in the old Explore design, but the owner rejected the old visual composition itself. Lieflat redesign supersedes it.

## PR #33 — Gate 14C Product Grammar

```text
OPEN
DRAFT
MERGEABLE
NOT MERGED
```

Base:

```text
main
```

Head:

```text
agent/gate-14c-product-grammar
fcdbe4735eb4bab66056ce95f3617c784d217527
```

Purpose:
- shared 48px site header
- workspace identity
- typography / spacing / semantic color tokens
- common active-state / CTA grammar
- no core page relayout

Current interpretation: useful as product-shell baseline, but do not endlessly polish it. It is also the base branch for PR #34. Do not merge without explicit owner approval.

## PR #34 — Gate 15A Lieflat Explore

```text
OPEN
DRAFT
MERGEABLE
NOT MERGED
```

Base:

```text
agent/gate-14c-product-grammar
```

Head branch / last confirmed head:

```text
agent/gate-15a-lieflat-explore
cfaf675fe33feafc831e8ece4d95225052951186
```

Note: PR description may be stale; code moved beyond the earlier fixed-90-day version to v3 with adaptive 7 / 14 / 30 / 90-day windows.

Last known v3 verification:

```text
TypeCheck PASS
Lint PASS
Test PASS
Build PASS
Chromium desktop capture PASS
```

Latest known QA job:

```text
94518600409
```

Latest known visual artifact:

```text
9189470024
```

### v3 assessment

Keep for comparison, not as final.

Improved:
- old floating kraft-paper cards removed
- fake semantic coordinates removed
- real signal data drives the graphic
- Lieflat paper/ink language works
- adaptive time window helps recent signals
- selected signal follows Lens rank

Still wrong:
- permanent three-column dashboard composition
- too much persistent UI chrome
- ranking duplicates chart information
- detail panel takes too much authority
- Launch Fan is being forced onto data whose time spread can be only 1–2 days
- Lieflat is still a chart inside the app rather than the page grammar itself

---

# 6. DELIVERY / SAFETY WORKFLOW — FROZEN

Always use:

```text
branch
→ PR
→ CI
→ owner visual approval
→ squash merge
→ verify PR/main SHA
→ verify Production
```

Never:
- `git reset --hard`
- `git clean`
- blind pull/push
- merge without approval
- deploy production without accepted Gate
- call machine PASS a visual PASS

Distinguish:

```text
Machine PASS
Runtime PASS
Production PASS
Visual PASS
```

For UI work, final visual acceptance requires a **real browser screenshot**.

Desktop is current scope.

## Mobile

**OUT OF SCOPE.**

Do not prioritize, discuss, redesign, or block desktop Gates on mobile unless explicitly reopened.

---

# 7. PERSONALIZATION REALITY — FROZEN BASELINE

Event strengths:

```text
interested      +4
not_interested  -5
open_source     +2
open_detail     +1
dwell           0..2
```

Dwell contribution:

```text
max(0, min(2, dwell_ms / 30000))
```

Recency:

```text
0.5^(ageDays / 30)
```

Stored-vector ranking approximate contract:

```text
global score + cosine * 28
```

Do not mutate `latest_score`.

Rules fallback category adjustment approximately:

```text
signal * 2.5
clamped to ±20
```

Confidence:

```text
evidence = eventCount / (eventCount + 12)
activity = 0.5^(ageDays / 30)
confidence = evidence * activity
```

Freshness:

```text
profileUpdatedAt >= latestEventAt
```

Stale snapshot must fall through to rules.

Important truth rule: production semantic-vector infrastructure was not active at the last audit. Do not describe the current system as a trained ML / semantic recommender unless newer verified evidence changes this.

---

# 8. DATA SHAPE — HISTORICAL SNAPSHOT

Exact counts may change; re-query Supabase before citing them as current.

The system has meaningful historical-data infrastructure:
- `item_metrics_snapshot`: daily metric history
- `score_components`: decomposed scoring dimensions
- raw item payload/version history

Last observed approximate counts:

```text
item_metrics_snapshot ≈ 2,809
score_components      ≈ 3,300
```

This can support genuine:
- short-term momentum
- metric history
- launch / emergence timelines
- project evolution
- score-component evidence

Do not fake these when the database can supply them.

## Cross-source limitation

At the prior Project audit, most Projects had one source:

```text
306 projects → 1 source
2 projects   → 2 sources
```

Therefore do not draw rich multi-source networks for every Project. Sparse evidence is more trustworthy than decorative complexity.

---

# 9. LIEFLAT CHARTS — PRIMARY DESIGN FOUNDATION

Upstream:

```text
larashero3-dotcom/lieflat-charts
```

Use upstream files as implementation source of truth:

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

## Licensing boundary

Previously inspected upstream license:

```text
PolyForm Noncommercial 1.0.0
```

Current experiment is treated as noncommercial research / personal-project work. If Frontier Radar becomes commercial, resolve licensing before shipping copied/adapted upstream implementation. Do not silently remove attribution/license notices.

---

# 10. LIEFLAT-NATIVE DESIGN CONSTITUTION — FROZEN

## Template-first, not style imitation

When a page needs data visualization:
1. Determine the **data shape**.
2. Audit relevant **Lupi Editorial** templates.
3. Audit relevant **Lupi Basics** templates.
4. Compare at least 3 candidates when available.
5. Use Glance only when Lupi/Basics do not honestly fit or the task truly requires fast dashboard reading.
6. Lock one real upstream template.
7. Preserve core:
   - rendering geometry
   - data encoding
   - proportional contract
   - animation rhythm
8. Replace only data, title, annotations, source, and necessary product layout.
9. Do not invent a “similar-looking” substitute when a real template exists.

## One visual = one conclusion

Do not add charts to prove the product is advanced. Each visualization must answer one clear question. If no Lieflat data shape fits honestly, do not force a chart.

---

# 11. LIEFLAT VISUAL TOKENS

## Mono — default

```text
PAPER  #F0EFEB
INK    #1C1C1A
MUTED  #8F8E88
FAINT  #C6C5BF
GRID   #DEDDD6
```

Use luminance as hierarchy. Important = darkest.

Avoid:
- glow
- gradients
- glass
- shadow stacks
- neon AI effects

Texture comes from:
- typography
- geometry
- whitespace
- record density
- hairlines
- dot/tick repetition

## Font

Base Lieflat font:

```text
Inter
```

Do not assume a more exotic display font automatically improves the design.

Upstream chart roles:

```text
chart title ~16.5 / 700
subtitle    ~11.5
source      ~9.5 + tracking
value       800
axis        600
```

These are chart-language defaults, not a requirement that every product-page heading be 16.5px.

## Shape

Typical grammar:

```text
card radius 24px
no border
no shadow
separation by whitespace
hairline geometry
solid materials
```

## Motion

Use Lieflat motion personality:
- fast-in / fast-stop
- quarticOut / cubicOut family
- no gratuitous bounce
- dot stagger roughly 8–15ms
- bar stagger roughly 80–130ms
- reveal when entering viewport
- click replay when useful
- `prefers-reduced-motion` fallback required

Motion is subordinate to structure.

---

# 12. LIEFLAT COLOR SYSTEM

Use one color system per visual delivery. Do not casually mix palettes.

## Mono
Default / safest.

## Porcelain
Single-hue blue luminance ladder. Best for ordered data, time series, rankings, progress/intensity.

## Palm
Low-saturation green/yellow categorical palette. Best for a few unordered groups such as source/team/product categories.

## Wire
Grayscale + **one** fluorescent orange hero accent.

Key rule:

> Accent is a singular focal point, not a general decoration color.

Frontier Radar will likely use **Mono** and **Wire** most often.

## Frontier Radar semantic colors

Product semantics still exist:
- Adjacent = cobalt
- Wildcard = orange

In Lieflat-native surfaces, these should normally remain tiny signifiers / labels / selection indicators. They should not repaint an entire visualization unless data semantics truly require it.

---

# 13. DESIGN ANTI-PATTERNS — FROZEN

```text
NO SaaS dashboard as default
NO bento for the sake of bento
NO glowing AI galaxy
NO floating card wall
NO fake futurism
NO fake semantic coordinates
NO radar circles just because the product is named Radar
NO scanning lines / sonar effects as decorative branding
NO permanent sidebars if hover/click can reveal the information
NO duplicate text list beside a chart that already carries the same labels
NO generic “ImageGen-looking” AI UI
```

Suspicion rule:

> If the design looks like a generic AI image generator would naturally produce it, question it.

---

# 14. PAGE-BY-PAGE VISUAL BASELINE

## TODAY

Purpose:

> tell the user what is worth attention today and why

Potential Lieflat vocabulary:
- `L3 Barcode Lollipop`
- `F2 Hairline Line`
- `F5 Tick Rows`

Do not break:

```text
5 Core + 1 Adjacent + 1 Wildcard
```

Signal Weave remains protected.

## EXPLORE — CURRENT REDESIGN TARGET

Purpose:

> reveal where the frontier is forming and help the user discover outside obvious popularity

### Emergence

Question: What surfaced recently, and when?

Candidate:

```text
L1 Launch Fan
```

Use only when birth-time spread is sufficiently meaningful. Do not stretch a one-day dataset into fake long history.

### Frontier formation / themes

Question: Where are current signals clustering?

Candidate:

```text
L5 Radial Convergence
```

Data contract:

```text
signals → honest topic/theme assignment
```

Every node/line must represent a real record/assignment.

### Frontier directory

Question: Which concrete signals belong to which frontier?

Candidate:

```text
L12 Type Colonnade
```

Especially promising for 20–50 current candidates. It preserves every record and can remove the need for a permanent ranking sidebar.

### Rank / selected Lens

Question: Which current signals lead under this Lens?

Candidate:

```text
F5 Tick Rows
```

Do not use a plain HTML ordered list if ranking itself is the data story.

### Explore v4 structural direction

Prefer:

```text
data canvas
+ light controls
+ hover focus
+ click detail sheet
```

over:

```text
left sidebar
+ chart
+ permanent right sidebar
```

Detail is an interaction layer, not necessarily a permanent column.

## PROJECT

Protected stages:

```text
01 CAPTURE
02 EVIDENCE
03 INTERROGATION
04 RESOLUTION
05 BUILD
```

Potential future Lieflat vocabulary:
- `L11 Trend Lineage` for real project history
- `L3 Barcode Lollipop` for metric history
- `L5 Radial Convergence` for real evidence/source convergence

Do not fake rich evidence networks when only one source exists.

Known UX issue:
- cinematic scroll hijack
- too much screen space for too little evidence

Future principle:

> preserve cinematic personality, remove cinematic control.

User should be able to skim, jump, copy, compare, and scroll normally.

## PERSONAL RADAR — FUTURE

Potentially the strongest signature page.

Purpose:

> show how the user’s interest frontier is being formed

Potential templates:
- `L5 Radial Convergence`
- `L15 Ballot Tally`
- `B3 Threads` only when enough honest history exists

Every visual relationship should trace to real events/categories/strength/recency/confidence.

Do not render a fake radar chart simply because the feature is named Radar.

## SAVED

Do not force charts.

Direction:

> high-end editorial research archive

Known issues:
- empty state needs strong Explore CTA
- shelf model must scale to 50–200 saved items

Lieflat influence comes mainly from typography, whitespace, ordering, metadata rhythm, and record grammar.

## IDEA LAB

Do not overclaim functionality.

Current actual capability is limited to:
- one source binding
- idea title/text
- status
- autosave
- delete
- view source

Do not visually imply multi-signal synthesis, experiment engine, AI research workspace, structured hypothesis system, or export unless those capabilities actually exist.

---

# 15. PRODUCT GRAMMAR BASELINE

Workspace identities:

```text
01 TODAY · DAILY DISCOVERY
02 EXPLORE · FRONTIER FIELD
03 PROJECT · INTELLIGENCE
04 SAVED · RESEARCH SHELF
05 IDEA LAB · DIRECTION WORKBENCH
```

Shared header target:

```text
48px
```

Semantic interaction principle:
- primary/current state uses one consistent grammar
- Wildcard orange retains its meaning
- route personality may differ
- product should still feel related

Do not mistake “same product” for “every route uses the same layout.”

---

# 16. HISTORICAL DESKTOP AUDIT FINDINGS

Before Lieflat redesign, the high-level diagnosis was:

> backend/recommendation logic increasingly felt like a real product, while frontend felt like multiple award-site concept demos assembled together.

Important findings:

### Today
- strong hero
- hero can overshadow actual intelligence

### Old Explore
- visually ambitious but crowded
- misleading pseudo-coordinate semantics
- old paper-card/orbit composition rejected by owner
- do not resurrect it

### Project
- cinematic dossier consumes too much space for evidence
- scroll hijack harms research behavior

### Saved
- weak empty-state CTA
- shelf model may not scale

### Idea Lab
- visual promise exceeds actual functionality

### Global
- inconsistent navigation / grammar
- no onboarding (`/` redirects to `/today`)
- accessibility gaps
- epistemic labels sometimes overstate certainty

---

# 17. CLOSED / CURRENT GATES

```text
Gate 11  Production Integrity Hardening              CLOSED
Gate 12  Personal Memory Durability                 CLOSED
Gate 13A Personalization Reality Audit              CLOSED
Gate 13B Feedback Integrity Repair                  CLOSED
Gate 13C Deterministic Personalization Proof        CLOSED
Gate 13D Personalization Confidence & Freshness     CLOSED
```

Gate 14 history:

```text
14A Explore Integrity
    old implementation PR remains unmerged / superseded

14C Product Grammar
    PR #33
    still Draft / unmerged
```

Current:

```text
15A Lieflat-native Explore
    PR #34
    active
```

---

# 18. ROADMAP — CURRENT INTENT

1. Lieflat-native Explore
2. Project Research Mode
3. Product Grammar / visual-system consolidation
4. Personal Radar
5. Today intelligence density
6. Saved + Idea Lab functional depth
7. Desktop accessibility + language consistency

Sequencing principle:

> Stop deception and obstruction first, improve understanding second, add capability third, polish last.

---

# 19. DESIGN REFERENCES

## Primary

### Lieflat Charts

```text
Lupi Editorial L1–L15
Lupi Basics F1–F13
Glance G1–G18
Interactive B1–B3
```

Always consult real catalog/gallery before choosing a visualization.

## Secondary — spatial/product restraint only

Previously useful references:
- Cosmos / Unseen Studio
- Lusion
- Squarespace Foundations
- AI in Design Report
- Museum Department
- Daylight
- Daily Dispatch
- Interfaces Magazine
- Digital Meadow
- Pi
- Claude
- Hermes

Use them for breathing room, editorial hierarchy, interaction restraint, spatial composition, and product clarity. Do not let them override Lieflat data contracts.

---

# 20. HOW TO START A NEW SESSION

When continuing Frontier Radar in a new chat / agent session:

1. Read this file first.
2. Inspect current Git PR / branch named in `CURRENT STATE`.
3. Verify current main SHA.
4. If design work:
   - inspect latest real browser screenshot
   - read relevant Lieflat catalog entry
   - read exact upstream template implementation
5. Continue **one Gate only**.
6. Do not reopen FROZEN contracts.
7. Do not ask the owner to repeat information documented here.
8. Before merge:
   - CI
   - real browser screenshot
   - owner approval
9. After merge:
   - verify main SHA
   - verify Production
10. Update this file.

Recommended new-chat prompt:

```text
Read docs/FRONTIER_RADAR_PROJECT_BASELINE.md from the Frontier Radar GitHub repo first. Treat it as the highest-trust project handoff except for newer verified Git/Production evidence or instructions I give you now. Then verify current main/PR state and continue the CURRENT Gate one step at a time. Do not reopen anything marked FROZEN.
```

---

# 21. UPDATE PROTOCOL

After a Gate closes, always update:
- `updated` date
- Section 0 CURRENT STATE
- PR / branch / SHA status
- closed/current Gate list
- next action
- changelog

Update only when materially changed:
- product contracts
- design constitution
- data contracts
- route/state contracts
- infrastructure

Never:
- duplicate full chat history
- paste long reasoning logs
- overwrite FROZEN decisions without marking an explicit reopen
- silently change a contract because a new visual concept wants it

---

# 22. CHANGELOG

## 2026-08-14

### Design doctrine change

Owner explicitly authorized substantially bolder visual changes.

New default:

```text
protect data/product contracts
allow large visual redesign
```

### Lieflat Charts elevated to foundation

Mandatory direction:

```text
data shape
→ compare actual Lieflat templates
→ lock real template
→ adapt real data
→ compose product around it
```

Not:

```text
pick a cool chart
→ imitate style
→ force data into it
```

### Explore

v3 Lieflat Launch Fan is useful but not final.

Owner feedback:

```text
“还不错，但是不够”
```

Next:

```text
Gate 15A v4 — Lieflat-native Explore
```

Primary challenge:

> Stop making a dashboard that contains a Lieflat chart. Make Explore itself a Lieflat-native interactive data composition.

---

# END — CURRENT NEXT COMMAND

If no newer owner instruction conflicts with this file:

> **Continue Gate 15A v4 — Lieflat-native Explore.**

Before implementation, compare current Explore data shape against real upstream:

```text
L1 Launch Fan
L5 Radial Convergence
L12 Type Colonnade
F5 Tick Rows
```

Choose the strongest honest composition and implement it on the existing Gate 15A branch / PR without touching main.
