# Frontier Radar — Experience Freeze Checkpoint

**Date:** 2026-08-10  
**Scope:** Today + Project Intelligence core experience  
**Status:** VISUAL / INTERACTION PHASE FROZEN FOR INTEGRATION

This checkpoint records the product state that should be treated as the current accepted experience before the next major phase begins.

---

## 1. Why this checkpoint exists

The repository accumulated many visual experiments across Today and Project Intelligence. Several of those experiments were useful for learning but should not be mistaken for the final direction.

This checkpoint creates a simple rule:

> **The accepted experience is defined by the frozen branches and the behavior documented below, not by the newest-looking experiment branch.**

Do not reopen these stages casually. Future changes should be bug fixes, accessibility/performance improvements, production integration, or explicitly approved new product work.

---

# 2. Product loop at freeze

```text
Discover
  ↓
Today’s 7
  ↓
Signal Weave
  ↓
Project Intelligence
  ↓
Build / Idea Lab
```

Long-term loop:

```text
Discover → Understand → Get Inspired → Build
```

---

# 3. Today freeze

Historical/frozen integration branch:

```text
proto/today-foil-candy-v4
```

## Accepted chapter model

```text
Hero                 continuous
  ↓
Compression          locked stable stage
  ↓ one physical gesture
Today’s 7            locked stable stage
  ↓ one physical gesture
Signal Weave         continuous synthesis scene
```

Reverse navigation must remain symmetric.

## Accepted visual identity

- editorial asymmetric composition
- `06 / Adjacent` = cobalt blue
- `07 / Wildcard` = saturated orange
- original LAB-03–06 visual ownership
- no generic SaaS card grid
- no black cyberpunk analysis dashboard

## Accepted synthesis behavior

Signal Weave represents:

```text
7 signals → 3 patterns → Final Take
```

The last synthesis chapter must remain structurally reachable even while synthesis data is loading. Data readiness can affect content state, but should not make the chapter disappear from navigation.

## Retired Today experiments

Do not reconnect these to production:

- foil experimental renderer
- spectral renderer
- standalone compression artifact renderer
- high-specificity restore CSS created to fight those layers

Historical failure modes included:

- transparent compression cards
- lost blue/orange identity
- reverse-scroll foil ghosts
- competing visual owners
- patch-on-patch CSS escalation

---

# 4. Project Intelligence freeze

Frozen branch:

```text
proto/project-intelligence-rebuild-v1
```

Accepted visual code baseline before documentation-only commits:

```text
e423b0b0f105b7daa5cc00935e236ea250d6d30e
```

Documentation commits after this baseline do not intentionally change visual behavior.

## Five-stage model

```text
01 CAPTURE
02 EVIDENCE
03 INTERROGATION
04 RESOLUTION
05 BUILD
```

### 01 Capture

Purpose:

> Make the user immediately feel that this project is worth investigating.

Accepted language:

- oversized editorial headline
- evidence dossier stack
- paper / foil / cobalt / orange material hints
- strong cursor/parallax response
- continuous idle motion
- transparent top navigation integration

Rejected alternative: full 3D world as the primary hero language.

### 02 Evidence

Purpose:

> Show why Frontier Radar believes the project.

Accepted principles:

- traceable source/evidence structure
- source objects rather than article-feed treatment
- motion supports inspection and evidence hierarchy

### 03 Interrogation

Purpose:

> Challenge the signal before trusting it.

Accepted identity:

- saturated orange environment
- oversized background words
- black analysis sheets
- internal continuous scrub across multiple questions
- black sheet opacity approximately 65% (`rgba(8,8,8,.65)`)
- orange/background structure remains visible through sheets
- scene remains alive during idle

This stage is protected from casual redesign.

### 04 Resolution

Purpose:

> Resolve evidence + interrogation into a single decision.

Accepted identity:

- seven score dimensions distributed around the scene
- central `FRONTIER VERDICT`
- example verdict: `WATCH / EARLY SIGNAL`
- score labels are deliberately enlarged for readability
- convergence / attraction / pressure-wave idle motion

Important semantic rule:

> Resolution is the decision layer, not a score dashboard.

### 05 Build

Purpose:

> Convert understanding into a next action.

Accepted role:

- action directions
- Idea Lab / build handoff
- does not repeat project explanation
- maintains idle energy when the user stops

---

# 5. Project Intelligence implementation boundary

Current route files:

```text
src/app/project/[id]/page.tsx
src/app/project/[id]/layout.tsx
src/app/project/[id]/project-intelligence.css
src/app/project/[id]/project-intelligence-effects.css
src/app/project/[id]/project-intelligence-capture.css
src/app/project/[id]/project-intelligence-refinements.css
```

Motion owner:

```text
src/components/frontier/project-intelligence-motion.tsx
```

The current implementation intentionally returned to a small ownership model after multiple failed experiments.

Do not introduce a second motion controller or full-page renderer without first proving that the current owner cannot support the required behavior.

---

# 6. Motion rules frozen across Project Intelligence

Every stage should remain visibly alive while idle.

Idle language by stage:

| Stage | Idle semantic |
| --- | --- |
| Capture | scan / foil / layered paper tension |
| Evidence | source inspection / evidence drift |
| Interrogation | orange field flow / sheet tension |
| Resolution | attraction / convergence / verdict pressure |
| Build | directional energy / action readiness |

Performance rules:

- idle effects pause/reduce during transitions
- avoid full-screen blur + clip-path + pointer gradient redraw + WebGL all running together
- pointer motion is additive, not the only animation source
- prefer transform/opacity for high-frequency motion
- no WebGL just for prestige

---

# 7. Rejected Project Intelligence experiments

## Spatial V1

Branch:

```text
proto/project-intelligence-spatial-v1
```

Rejected because:

- looked like a 3D technology demo
- floating geometry weakened editorial identity
- complexity rose faster than visual/product value

## Kinetic V1

Branch:

```text
proto/project-intelligence-kinetic-v1
```

Rejected because:

- fake transition bridges could become visible intermediate pages
- giant color blocks appeared as accidental scenes
- layering created new CSS ownership problems

## Earlier V1

Branch:

```text
proto/project-intelligence-v1
```

Historical reference only.

Lesson:

> Prefer real content continuity and controlled 2.5D motion over fake full-screen transition objects or a total 3D rewrite.

---

# 8. GitHub state observed at freeze

Default branch:

```text
main
```

Observed `main` HEAD before this checkpoint work:

```text
1ac876facc67ccff203a52fd2d2b7623ebf631d1
```

Observed Project Intelligence branch relationship to main:

- ahead by 176 commits
- behind by 5 commits
- status: diverged

This is why direct historical merge is not recommended.

Open historical draft PRs observed:

- PR #1 — Motion Lab: LAB-01 static composition + LAB-02 typography tear
- PR #2 — Today production integration: synthesis + Signal Weave

Both predate the current frozen product state and should be reviewed/closed during repository cleanup rather than merged automatically.

Observed experimental branches include:

```text
codex/motion-lab-polish-1fbe2a2
codex/today-ui-polish-e121beef
feat/today-motion-lab
feat/today-production-integration
proto/project-intelligence-kinetic-v1
proto/project-intelligence-rebuild-v1
proto/project-intelligence-spatial-v1
proto/project-intelligence-v1
proto/today-foil-candy-v4
proto/today-optical-material-v1
proto/today-presence-field-v2
proto/today-spectral-specimens-v3
```

Do not delete these until integration is complete and final checkpoints/tags exist.

---

# 9. Vercel state observed at freeze

GitHub commit status for both the then-current `main` and frozen Project Intelligence baseline reported:

```text
Vercel: success
```

Known operational issue:

- Vercel Hobby + private GitHub repository may block deployments authored by a collaborator who does not have corresponding Vercel project access.
- This is not equivalent to a Next.js build error.

Long-term desired deployment model:

```text
main → Production
feature/integration branches → Preview
```

Avoid using manually promoted Preview deployments as a permanent source of truth.

---

# 10. What is frozen vs what is still allowed

## Frozen unless explicitly reopened

- Today chapter visual identity
- Today middle-stage gesture model
- Signal Weave overall visual/semantic structure
- Project Intelligence five-stage structure
- Project Intelligence Interrogation identity
- Project Intelligence Resolution role
- Project Intelligence accepted layout/motion language

## Still allowed

- production integration
- bug fixes
- loading/error states
- accessibility
- reduced motion
- performance tuning
- responsive fixes
- copy/data correctness
- source traceability
- Idea Lab / next product phase
- documentation / repository cleanup

---

# 11. Next action

Do not continue visual experimentation on these frozen branches.

Next engineering step:

[`../INTEGRATION-PLAN-2026-08-10.md`](../INTEGRATION-PLAN-2026-08-10.md)

The goal is to bring the accepted final product into a clean mainline without importing the full experiment history.
