import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DAILY_SYNTHESIS_SCHEMA_VERSION,
  computeDailySelectionHash,
  isDailySynthesisSnapshot,
  type DailySynthesisSnapshot,
} from "@/lib/ai/daily-synthesis";

const IDS = ["a", "b", "c", "d", "e", "f", "g"];

function validSnapshot(): DailySynthesisSnapshot {
  return {
    schemaVersion: DAILY_SYNTHESIS_SCHEMA_VERSION,
    editionDate: "2026-08-08",
    selectionHash: computeDailySelectionHash(IDS),
    signalIds: IDS,
    patterns: [
      {
        id: "p1",
        index: "01",
        formation: "strong",
        title: "AGENTS ARE MOVING DOWN THE STACK",
        short: "AGENT INFRASTRUCTURE",
        summary: "Memory and runtime signals are converging beneath visible agent features.",
        why: "The agent layer is becoming reusable infrastructure rather than another isolated feature.",
        signalIds: ["a", "b", "e"],
        confidence: 0.86,
      },
      {
        id: "p2",
        index: "02",
        formation: "emerging",
        title: "LOCAL IS BECOMING NATIVE",
        short: "LOCAL / NATIVE",
        summary: "Local multimodal latency is approaching immediate product behavior.",
        why: "Lower latency changes trust, privacy, and product form at the same time.",
        signalIds: ["c"],
        confidence: 0.62,
      },
      {
        id: "p3",
        index: "03",
        formation: "novel",
        title: "INTERFACES ARE BECOMING INSTRUMENTS",
        short: "INTERFACE / INSTRUMENT",
        summary: "Motion and playable primitives are becoming product structure rather than decoration.",
        why: "Interaction itself is becoming a medium users manipulate and learn through.",
        signalIds: ["d", "f", "g"],
        confidence: 0.8,
      },
    ],
  };
}

test("daily selection hash is stable and order-sensitive", () => {
  assert.equal(computeDailySelectionHash(IDS), computeDailySelectionHash([...IDS]));
  assert.notEqual(computeDailySelectionHash(IDS), computeDailySelectionHash([...IDS].reverse()));
});

test("daily synthesis accepts exact 7-to-pattern coverage", () => {
  assert.equal(isDailySynthesisSnapshot(validSnapshot()), true);
});

test("daily synthesis rejects duplicated or missing evidence", () => {
  const duplicate = validSnapshot();
  duplicate.patterns[2] = { ...duplicate.patterns[2]!, signalIds: ["d", "f", "a"] };
  assert.equal(isDailySynthesisSnapshot(duplicate), false);

  const missing = validSnapshot();
  missing.patterns[2] = { ...missing.patterns[2]!, signalIds: ["d", "f"] };
  assert.equal(isDailySynthesisSnapshot(missing), false);
});
