import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

const qualifiedDwell = source("./qualified-dwell.ts");
const recommendationObserver = source("../../components/frontier/recommendation-observer.tsx");
const todayMotion = source("../../components/frontier/today-motion-production.tsx");
const exploreField = source("../../app/explore/explore-field.tsx");

test("Gate 13B contract: qualified dwell remains 60% visible for 8 accumulated seconds", () => {
  assert.match(qualifiedDwell, /QUALIFIED_DWELL_MS = 8_000/);
  assert.match(qualifiedDwell, /QUALIFIED_DWELL_RATIO = 0\.6/);
  assert.match(qualifiedDwell, /QUALIFIED_DWELL_MEASUREMENT = "visible_60pct_8s"/);
  assert.match(qualifiedDwell, /document\.visibilityState === "visible"/);
  assert.match(qualifiedDwell, /entry\.intersectionRatio >= QUALIFIED_DWELL_RATIO/);
});

test("Gate 13B contract: legacy RecommendationObserver delegates to the shared dwell contract", () => {
  assert.match(
    recommendationObserver,
    /observeQualifiedDwell\(node, itemId, metadata\)/
  );
  assert.doesNotMatch(recommendationObserver, /QUALIFIED_DWELL_MS\s*=/);
});

test("Gate 13B contract: Production Today records detail opens and qualified dwell without changing handoff id", () => {
  assert.match(
    todayMotion,
    /trackFeedback\(signal\.id, "open_detail", undefined, signal\.metadata\);\s*window\.location\.assign\(`\/project\/\$\{encodeURIComponent\(signal\.id\)\}`\);/s
  );
  assert.match(
    todayMotion,
    /observeQualifiedDwell\(card, signal\.id, signal\.metadata\)/
  );
  assert.match(todayMotion, /card\.dataset\.itemId = signal\.id;/);
});

test("Gate 13B contract: Explore uses the shared qualified dwell contract and rejects legacy focus dwell", () => {
  assert.match(
    exploreField,
    /observeQualifiedDwell\(node, focus\.itemId, \{[\s\S]*surface: "explore"[\s\S]*\}\);/
  );
  assert.doesNotMatch(exploreField, /dwellMs < 1200/);
  assert.doesNotMatch(exploreField, /measurement: "focus_dwell"/);
});
