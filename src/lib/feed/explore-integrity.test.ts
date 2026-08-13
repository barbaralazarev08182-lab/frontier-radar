import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const fieldSource = readFileSync("src/app/explore/explore-field.tsx", "utf8");
const pageSource = readFileSync("src/app/explore/page.tsx", "utf8");
const integrityCss = readFileSync("src/app/explore/explore-integrity.css", "utf8");

test("118. Explore does not present editorial positions as quantitative axes", () => {
  assert.equal(fieldSource.includes("SEMANTIC DISTANCE"), false);
  assert.equal(fieldSource.includes("SIGNAL PRESSURE"), false);
  assert.equal(fieldSource.includes("explore-field-axis"), false);
  assert.match(fieldSource, /EDITORIAL_POSITIONS/);
  assert.match(fieldSource, /these are not metric coordinates/);
});

test("119. Explore visibly discloses exploratory layout and the real ranking driver", () => {
  assert.match(fieldSource, /EXPLORATORY LAYOUT · RANKED BY \{activeLens\.label\}/);
  assert.match(fieldSource, /ranking follows \$\{activeLens\.label\} lens scores/);
});

test("120. Explore search copy is scoped to the current candidate scan", () => {
  assert.match(fieldSource, /SEARCH THIS SCAN/);
  assert.match(fieldSource, /CURRENT CANDIDATES/);
  assert.equal(fieldSource.includes("SEARCH FRONTIER"), false);
});

test("121. Explore integrity CSS removes chart-like crosshairs after accepted visual layers", () => {
  const v2Index = pageSource.indexOf('import "./explore-v2.css"');
  const savedIndex = pageSource.indexOf('import "./explore-saved-integration.css"');
  const integrityIndex = pageSource.indexOf('import "./explore-integrity.css"');

  assert.ok(v2Index >= 0);
  assert.ok(savedIndex > v2Index);
  assert.ok(integrityIndex > savedIndex);
  assert.match(integrityCss, /editorial discovery layout, not a quantitative x\/y plot/);
  assert.equal(integrityCss.includes("linear-gradient(90deg"), false);
  assert.equal(integrityCss.includes("linear-gradient(0deg"), false);
});
