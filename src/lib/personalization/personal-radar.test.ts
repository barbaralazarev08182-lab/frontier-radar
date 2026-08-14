import assert from "node:assert/strict";
import test from "node:test";
import { derivePersonalRadarProfile } from "./personal-radar";

const NOW = Date.parse("2026-08-14T08:00:00.000Z");

function item(item_id: string, title: string) {
  return {
    item_id,
    title,
    description: null,
    summary_zh: null,
    why_it_matters: null,
    source_slug: "test",
    content_type: "repo",
    tags: [],
  };
}

function event(item_id: string, event_type = "interested") {
  return {
    item_id,
    event_type,
    dwell_ms: null,
    created_at: "2026-08-14T08:00:00.000Z",
  };
}

test("Personal Radar keeps cold start separate from learned evidence", () => {
  const profile = derivePersonalRadarProfile([], [], NOW);
  assert.equal(profile.status, "cold_start");
  assert.equal(profile.eventCount, 0);
  assert.equal(profile.evidenceDimensionCount, 0);
  assert.equal(profile.globalConfidence, 0);
  assert.ok(profile.dimensions.every((dimension) => dimension.evidenceCount === 0));
});

test("Personal Radar preserves negative feedback as negative signal", () => {
  const profile = derivePersonalRadarProfile(
    [event("11111111-1111-4111-8111-111111111111", "not_interested")],
    [item("11111111-1111-4111-8111-111111111111", "agent workflow")],
    NOW
  );
  const agents = profile.dimensions.find((dimension) => dimension.key === "ai_agents");
  assert.ok(agents);
  assert.equal(agents.evidenceCount, 1);
  assert.equal(agents.negativeEvidence, 1);
  assert.equal(agents.positiveEvidence, 0);
  assert.equal(agents.behaviorSignal, -5);
  assert.equal(profile.status, "forming");
});

test("Personal Radar unlocks evidence-qualified mode only after enough independent evidence", () => {
  const ids = [
    "11111111-1111-4111-8111-111111111111",
    "22222222-2222-4222-8222-222222222222",
    "33333333-3333-4333-8333-333333333333",
  ];
  const items = [
    item(ids[0]!, "agent workflow"),
    item(ids[1]!, "product design interaction"),
    item(ids[2]!, "speech audio voice"),
  ];
  const events = [
    event(ids[0]!), event(ids[0]!),
    event(ids[1]!), event(ids[1]!),
    event(ids[2]!), event(ids[2]!),
  ];

  const profile = derivePersonalRadarProfile(events, items, NOW);
  assert.equal(profile.eventCount, 6);
  assert.equal(profile.distinctItemCount, 3);
  assert.ok(profile.evidenceDimensionCount >= 3);
  assert.equal(profile.status, "evidence_qualified");
});
