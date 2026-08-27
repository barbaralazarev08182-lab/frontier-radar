# Frontier Radar — Start Here

This document is the current contributor orientation for Frontier Radar.

For a product overview and local setup, begin with the repository [README](../README.md).

## 1. Product mental model

Frontier Radar is a personalized frontier-intelligence system built around this loop:

```text
Discover → Understand → Get Inspired → Build
```

The live product currently organizes that loop into:

```text
Candidate pool
    ↓
Today's 7
    ↓
Signal Weave
    ↓
Project Intelligence
    ↓
Saved / Build
```

Primary navigation:

```text
TODAY / EXPLORE / RADAR / SAVED
```

The interface is intentionally closer to a research instrument / physical archive than a conventional SaaS dashboard.

## 2. Current product surfaces

### Today

Daily editorial selection and signal inspection.

- `01–05` are core signals.
- `06 Adjacent` deliberately broadens the search neighborhood.
- `07 Wildcard` introduces higher-variance exploration.
- Gesture handling and transition ownership are part of the information architecture, not decoration.

### Signal Weave

Synthesizes relationships across the daily set:

```text
7 signals → 3 patterns → Final Take
```

### Project Intelligence

Deep-reading flow for a selected signal/project:

```text
01 CAPTURE
02 EVIDENCE
03 INTERROGATION
04 RESOLUTION
05 BUILD
```

The central principle is traceability: synthesis should remain connected to source evidence.

### Explore

Broader discovery field with filtering, source context, and personalization feedback.

### Radar

Personalized emerging-theme view based on candidate signals and interaction history.

### Saved

Browser-local research shelf in the current v1 implementation.

## 3. Repository map

```text
src/app/
  today/                 Today experience
  explore/               Discovery surfaces
  project/[id]/          Project Intelligence
  radar/                 Personalized radar
  saved/                 Research shelf
  api/cron/              Scheduled ingestion / analysis jobs

src/components/frontier/ Frontier-specific UI and interaction components

src/lib/
  collectors/            Source ingestion and normalization
  scoring/               Frontier / momentum scoring
  ai/                    Structured analysis and synthesis
  feed/                  Feed and project materialization
  personalization/       Feedback and ranking profiles
  env/                   Environment/runtime boundaries
  supabase/              Database clients

supabase/migrations/      Schema and security migrations
scripts/                  Collector and diagnostic utilities
e2e/                      Browser integration QA
```

## 4. Data and analysis pipeline

The high-level path is:

```text
External source
    ↓
Collector
    ↓
Raw payload
    ↓
Normalized item
    ↓
Metric snapshots
    ↓
Frontier / momentum score
    ↓
Structured AI analysis
    ↓
Synthesis / project materialization
    ↓
Personalized product surfaces
```

Source URLs and provenance should be preserved throughout the pipeline.

## 5. Environment and safety boundary

Use `.env.example` as the configuration reference and keep real values in `.env.local` or the deployment platform's secret store.

Rules:

- never commit API keys, service-role keys, cron secrets, or private keys;
- only explicitly public `NEXT_PUBLIC_*` values may reach browser code;
- privileged database clients remain server-only;
- preview/development environments must not be allowed to write production runtime data;
- collectors and cron routes must fail safely rather than silently bypassing authorization or environment boundaries.

For UI-only development, fixture mode avoids requiring production data:

```bash
FRONTIER_DATA_MODE=fixture npm run dev
```

## 6. Development workflow

Create a focused branch from current `main`, keep the change narrow, and verify it before review.

```bash
npm ci
npm run typecheck
npm run lint
npm run test
npm run build
```

For visual changes, a successful build is necessary but not sufficient. Include browser evidence showing the changed surface at the intended viewport/state.

For data or runtime changes, distinguish clearly between:

- static/code verification;
- runtime verification;
- production verification.

Do not treat one as proof of another.

## 7. Change discipline

Frontier Radar couples data, ranking, synthesis, and interaction design, but patches should still have a clear owner.

Prefer:

- one coherent problem per pull request;
- explicit source/evidence preservation;
- transforms/opacity for frequent animation work;
- server-side boundaries for privileged operations;
- tests for ranking, handoff, authorization, and persistence behavior when those contracts change.

Avoid:

- mixing unrelated data and visual refactors in one patch;
- committing generated secrets or local runtime state;
- replacing traceable evidence with opaque AI output;
- introducing motion that has no information/state meaning.

## 8. Historical documents

Files in `docs/checkpoints/` and some older planning documents record previous product states, experiments, release gates, and architecture decisions. They are retained as development history.

They are **not** current setup instructions. When historical notes conflict with the current codebase, current `main`, the README, and this document take precedence.

## 9. Maintainer notes

`AGENTS.md` contains additional maintainer / coding-agent continuity notes. It is useful when working on established interaction contracts, but it is not required to understand or run the project.

For contribution expectations, see [CONTRIBUTING.md](../CONTRIBUTING.md).
