import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeAnalysisDiscoveryPoolLimit,
  rankAnalysisCandidates,
} from "@/lib/db/repositories/ai-analyses";
import type { AnalysisItemRow } from "@/lib/ai/types";

function item(id: string, firstSeenAt: string): AnalysisItemRow {
  return {
    id,
    source_slug: "fixture",
    source_item_id: id,
    item_type: "product",
    title: id,
    description: null,
    owner: null,
    full_name: null,
    language: null,
    license: null,
    source_url: `https://example.com/${id}`,
    topics: [],
    created_at_source: null,
    pushed_at_source: null,
    first_seen_at: firstSeenAt,
    last_updated_at: firstSeenAt,
  };
}

test("evidence-backed unanalyzed item outranks a newer metadata-only item", () => {
  const newerThin = item("newer-thin", "2026-08-19T10:00:00Z");
  const olderEvidence = item("older-evidence", "2026-08-19T09:00:00Z");

  const ranked = rankAnalysisCandidates(
    [newerThin, olderEvidence],
    new Set(),
    new Set([olderEvidence.id])
  );

  assert.deepEqual(ranked.map((x) => x.id), ["older-evidence", "newer-thin"]);
});

test("unanalyzed item still outranks analyzed evidence", () => {
  const analyzedEvidence = item("analyzed-evidence", "2026-08-19T10:00:00Z");
  const unanalyzedThin = item("unanalyzed-thin", "2026-08-19T09:00:00Z");

  const ranked = rankAnalysisCandidates(
    [analyzedEvidence, unanalyzedThin],
    new Set([analyzedEvidence.id]),
    new Set([analyzedEvidence.id])
  );

  assert.deepEqual(ranked.map((x) => x.id), ["unanalyzed-thin", "analyzed-evidence"]);
});

test("recency remains the tie-breaker inside the same evidence tier", () => {
  const older = item("older", "2026-08-18T10:00:00Z");
  const newer = item("newer", "2026-08-19T10:00:00Z");

  const ranked = rankAnalysisCandidates([older, newer], new Set(), new Set());
  assert.deepEqual(ranked.map((x) => x.id), ["newer", "older"]);
});

test("candidate discovery widens beyond the final pool but stays exact for item lookup", () => {
  assert.equal(computeAnalysisDiscoveryPoolLimit(20), 80);
  assert.equal(computeAnalysisDiscoveryPoolLimit(30), 120);
  assert.equal(computeAnalysisDiscoveryPoolLimit(20, true), 20);
});
