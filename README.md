# Frontier Radar

> A personalized frontier-intelligence system for discovering what is becoming worth attention — and turning those signals into research and product directions.

**Live product:** https://www.xrduly.cn

Frontier Radar is not a generic AI-news feed and not a popularity leaderboard. It continuously collects emerging technical signals, measures momentum, enriches them with structured AI analysis, personalizes what matters, and turns the result into an exploratory research interface.

```text
Discover → Understand → Get Inspired → Build
```

## Why Frontier Radar

Most technical discovery tools optimize for what is already popular. Frontier Radar is designed around a different question:

> What is becoming important before it becomes obvious?

The system combines recency, momentum, source evidence, structured analysis, cross-signal synthesis, and personal feedback to surface projects, papers, models, tools, and products that may be worth investigating early.

## Product loop

```text
Multi-source signals
        ↓
Candidate discovery + normalization
        ↓
Momentum / frontier scoring
        ↓
AI analysis + evidence enrichment
        ↓
Personalization
        ↓
Today's 7
        ↓
Signal Weave
        ↓
Project Intelligence
        ↓
Saved / Build
```

### Today

A daily editorial selection of seven signals rather than an infinite feed.

- `01–05` — core signals
- `06 Adjacent` — a deliberately nearby but non-obvious direction
- `07 Wildcard` — a higher-variance exploratory signal

The current Today experience uses a spatial, instrument-like interface rather than a conventional dashboard, with gesture-driven transitions and an active-card inspection layout.

### Signal Weave

Turns the seven daily signals into relationships instead of treating every item independently:

```text
7 signals → 3 higher-level patterns → Final Take
```

The goal is to expose convergence, shared enabling technologies, and recurring product/research directions.

### Project Intelligence

A deeper reading mode for a selected project or signal:

```text
01 CAPTURE
02 EVIDENCE
03 INTERROGATION
04 RESOLUTION
05 BUILD
```

It keeps source traceability while moving from “what is this?” toward “is this worth pursuing?” and “what could be built from it?”.

### Explore

A field-first discovery surface for the broader candidate pool, including filtering, source context, and explicit personalization feedback such as `MORE LIKE THIS` and `LESS LIKE THIS`.

### Radar

A personalized view of emerging themes and directions derived from observed signals and interaction history.

### Saved

A private research shelf for keeping useful findings. The current v1 Saved state is browser-local and supports local backup/export behavior.

## Data sources

The repository currently contains ingestion paths for:

- GitHub
- Hugging Face
- arXiv
- Hacker News
- Product Hunt

Collectors are designed around normalization, retries, rate-limit awareness, source traceability, and metric snapshots rather than simply copying source feeds into the UI.

## System architecture

```text
External sources
    ↓
Collectors
    ↓
Raw source records
    ↓
Normalization / deduplication
    ↓
Metric snapshots + momentum history
    ↓
Frontier scoring
    ↓
Structured AI analysis / synthesis
    ↓
Feed + project materialization
    ↓
Personalization layer
    ↓
Next.js product surfaces
```

Key areas of the repository:

```text
src/app/                  Product routes and visual surfaces
src/components/frontier/  Frontier-specific interaction components
src/lib/collectors/       Source collectors and normalization
src/lib/scoring/          Frontier / momentum scoring
src/lib/ai/               Provider abstraction, analysis and synthesis
src/lib/feed/             Feed, discovery and project materialization
src/lib/personalization/  Feedback, profiles and ranking logic
src/lib/supabase/         Database clients and boundaries
supabase/migrations/      Database schema and security migrations
scripts/                  Collector, diagnostics and analysis utilities
e2e/                      Browser integration checks
```

## Technology

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS + custom CSS interaction systems
- Supabase / PostgreSQL
- Vercel
- OpenAI-compatible AI provider abstraction
- GitHub Actions

The AI layer is provider-abstracted; application code is not intended to depend directly on one model vendor.

## Local development

Requirements:

- Node.js 22+
- npm

Clone and install:

```bash
git clone https://github.com/barbaralazarev08182-lab/frontier-radar.git
cd frontier-radar
npm ci
cp .env.example .env.local
```

For UI development without a production database, use fixture mode:

```bash
FRONTIER_DATA_MODE=fixture npm run dev
```

Then open:

```text
http://localhost:3000
```

The `.env.example` file documents optional server-side integrations. Do not place real credentials in committed files.

## Verification

Before opening a pull request:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

CI runs the same core verification path without production credentials or external writes.

## Security model

The repository is designed around a few explicit boundaries:

- secrets remain server-side and are loaded from environment variables;
- non-production Vercel environments are prevented from persisting production runtime writes;
- public application reads are separated from privileged database access;
- cron endpoints require server-side authorization;
- `.env`, `.env.local`, `.env.*.local`, `.vercel`, PEM files, logs, and local data outputs are ignored by Git.

See [SECURITY.md](SECURITY.md) for vulnerability reporting and credential-handling guidance.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

This project intentionally treats interaction design, information architecture, ranking logic, and data integrity as parts of the same product system. For UI changes, visual evidence matters in addition to a successful build.

## Project status

Frontier Radar is an actively developed personal research/product experiment. Some internal historical documents under `docs/` record earlier product states and should be read as development history rather than current setup instructions.

For the current contributor orientation, start with [docs/START-HERE.md](docs/START-HERE.md).

## License

A public-release license has not been selected yet. Until a `LICENSE` file is added, no additional reuse rights are granted beyond those provided by applicable law.
