# Frontier Radar — Codex Handoff

## Project identity

Frontier Radar is not a generic AI news site. The core product idea is: select 7 AI frontier signals each day, then synthesize those 7 signals into higher-level directions/patterns.

The desired experience is an intelligence/discovery interface with strong editorial taste, experimentation, interaction, and visual identity.

Key design principles:
- Passive clarity. Active spectacle.
- Default state tells the story. Interaction lets the user interrogate it.
- Animation should organize information, not decorate it.
- Visual effects must have semantic/product purpose.
- Avoid generic landing-page/dashboard/card-grid aesthetics.
- The project may later use 3D/WebGL across the whole website, but the current Analysis experiment is intentionally 2D-only.

## Current branch and scope

Work on:
- branch: `feat/today-motion-lab`
- QA route: `/qa/motion-lab`

Do NOT modify production `/today`, production recommendation logic, Supabase data flow, or `main` unless explicitly asked.

The current branch is an experimental Motion Lab. Historical lab CSS/files are intentionally preserved for comparison and rollback.

## Current Analysis direction — APPROVED

The previous Analysis Sheet / black dashboard / multi-page pattern experiments were rejected.

The current approved direction is **Signal Weave**:
- one luminous interactive analysis field
- pearl white / ice silver / mist blue material language
- 7 signal ribbons weave into 3 patterns
- no black background
- no multi-page `Analysis -> Pattern 01 -> Pattern 02 -> Pattern 03`
- no three-card layout
- no huge typography as a substitute for design
- no visible debug/HUD chrome once Analysis is active

The point of the page is to make the user *see relationships forming* between the 7 signals and the 3 synthesized directions.

## Current three patterns

### Pattern 01
**AGENTS ARE MOVING DOWN THE STACK**
Short label: `AGENT INFRASTRUCTURE`
Evidence: 01, 02, 05
Meaning: agent value is moving toward memory, orchestration, runtimes/infrastructure.

### Pattern 02
**LOCAL IS BECOMING NATIVE**
Short label: `LOCAL / NATIVE`
Evidence: 03 only
Meaning: early formation; local multimodal latency is approaching native-feeling product behavior.
This pattern should visually remain sparse / early / less mature than the others.

### Pattern 03
**INTERFACES ARE BECOMING INSTRUMENTS**
Short label: `INTERFACE / INSTRUMENT`
Evidence: 04, 06, 07
06 = `ADJACENT` (cold blue behavior/accent)
07 = `WILDCARD` (orange/anomalous behavior/accent)
Meaning: interaction itself is becoming product structure, not decoration.

Final take:
**THE FRONTIER IS MOVING FROM FEATURES TO SYSTEMS.**

## Current implementation files

Primary files:
- `src/components/frontier/motion-lab/motion-lab-analysis.tsx`
- `src/app/qa/motion-lab/motion-lab-signal-weave.css`
- `src/app/qa/motion-lab/motion-lab-signal-weave-polish.css`
- `src/app/qa/motion-lab/motion-lab-signal-weave-motion.css`
- `src/app/qa/motion-lab/page.tsx`

Transition/handoff context:
- `src/components/frontier/motion-lab/motion-lab-direct-handoff.tsx`
- `src/app/qa/motion-lab/motion-lab-direct-handoff.css`

Existing Motion Lab shell and earlier interactions:
- `src/components/frontier/motion-lab/motion-lab.tsx`
- other `motion-lab-*.css` files are previous experiments and should generally remain intact unless a clear conflict requires a targeted override.

## Current Signal Weave interaction model

- 7 SVG ribbon/thread paths move continuously.
- Hover a signal: that thread becomes more prominent and pulse motion accelerates.
- Hover a pattern: the whole related cluster becomes prominent.
- Click a signal/pattern: pin/unpin that pattern.
- Non-active evidence should recede, but never disappear so much that the 7 -> 3 structure becomes unreadable.
- The Analysis readout opens in the same scene; do not navigate to separate Pattern pages for core understanding.
- The final take appears in the same scene after a small amount of internal scroll.
- Once Analysis is ready, Motion Lab QA chrome should fade away.

## Screenshot-driven fixes already requested

The current concept has been positively received, but these details were identified and addressed/are being polished:
- readout must stay fully inside viewport and never be cropped at bottom
- inactive signals should not become ghosted beyond readability
- selected ribbon should not become a huge heavy “highway”
- ribbon should not visually cut through pattern labels at the destination
- base-state contrast should be strong enough to read the complete weave
- Vercel preview toolbar/popup is external preview UI, not part of the design

## Immediate design task

Continue **motion polish only** unless the user explicitly asks for structural redesign.

Focus on:
- ribbon material quality / liquid-silver sheen
- magnetic cluster pull when hovering/pinning a pattern
- clear pulse rhythm traveling toward hubs
- hub/node reception feedback
- subtle 2–4 px pointer parallax only if it improves depth without harming reading
- transition quality from Today’s 7 into Signal Weave
- preserving strong readability of evidence and readout

Avoid:
- adding decorative particles just for spectacle
- excessive blur/bloom
- making inactive context vanish
- reintroducing black/cyberpunk dashboard styling
- turning the scene into a Sankey diagram/data-viz template
- adding 3D/WebGL in this current task
- adding more pages/chapters for the three patterns
- giant poster typography that dominates interaction

## Visual QA standard

Do not judge success from build passing alone. Inspect actual browser visuals whenever possible.

When adjusting motion, verify:
- the page still has a clear visual protagonist
- movement does not obscure reading
- hover/pin behavior adds understanding, not only decoration
- the 7 -> 3 relationship remains legible at all times
- Pattern 02 still feels sparse / early formation
- 06 Adjacent and 07 Wildcard retain distinct behavior
- final take resolves the scene instead of feeling like another page

## Development notes

Preferred local workflow:
- run from repository root
- `pnpm install`
- `pnpm dev`
- open `http://localhost:3000/qa/motion-lab`

Before finishing a change, run the project’s existing typecheck/lint/test/build checks where practical.

Do not overwrite user environment files or secrets.
