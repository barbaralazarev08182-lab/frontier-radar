# Contributing to Frontier Radar

Thanks for taking an interest in Frontier Radar.

This repository combines data collection, ranking, AI synthesis, personalization, and interaction design. Contributions are welcome, but changes should stay focused and preserve the boundaries between those systems.

## Getting started

```bash
git clone https://github.com/barbaralazarev08182-lab/frontier-radar.git
cd frontier-radar
npm ci
cp .env.example .env.local
FRONTIER_DATA_MODE=fixture npm run dev
```

Fixture mode is the recommended starting point for UI work because it does not require production credentials or database access.

## Before opening a pull request

Run:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

A pull request should explain:

- what problem it solves;
- which product/data boundary it changes;
- how it was verified;
- any behavior that was intentionally left unchanged.

For visual changes, include browser screenshots or recordings of the relevant state. A machine build passing is not evidence that a visual interaction is correct.

## Scope changes narrowly

Prefer one coherent concern per pull request.

Good examples:

- improve one collector's rate-limit handling;
- add a regression test for one ranking contract;
- refine one Today interaction without changing its data source;
- fix one database boundary with a matching migration/test.

Avoid combining broad data, architecture, and visual redesigns in one patch unless the root cause genuinely crosses all of them.

## Data and source integrity

When working on ingestion, ranking, or AI analysis:

- preserve the original source URL and provenance;
- keep raw source data separate from generated analysis;
- do not silently convert AI inference into source-backed fact;
- keep ranking behavior deterministic/testable where practical;
- respect source API rate limits and retry guidance.

## Secrets and production safety

Never commit credentials.

Use `.env.example` as documentation and keep real values in `.env.local` or deployment secrets.

Do not expose server-only variables through browser code. Do not weaken preview/development write isolation or cron authorization as part of an unrelated change.

See [SECURITY.md](SECURITY.md) for security reporting guidance.

## Interaction and motion

Frontier Radar uses motion to communicate state and continuity. New motion should have an information or navigation purpose.

Prefer transform/opacity for frequent animation work and avoid expensive full-screen effects unless they materially improve the interaction.

## Historical docs

Some files under `docs/` document earlier phases and accepted experiments. Use [docs/START-HERE.md](docs/START-HERE.md) for current contributor orientation before relying on older checkpoints.
