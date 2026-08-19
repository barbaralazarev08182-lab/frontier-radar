import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

const todayMotion = source("../../components/frontier/today-motion-production.tsx");
const projectPage = source("../../app/project/[id]/page.tsx");

test("Gate 9 contract: Today hands the exact signal id to Project Intelligence", () => {
  assert.match(todayMotion, /card\.dataset\.itemId = signal\.id;/);
  assert.match(
    todayMotion,
    /window\.location\.assign\(`\/project\/\$\{encodeURIComponent\(signal\.id\)\}`\)/
  );

  assert.match(projectPage, /const \{ id \} = await params;/);
  assert.match(projectPage, /const detail = await loadProjectDetail\(id\);/);
  assert.match(projectPage, /<h1>\{item\.title\}<\/h1>/);
});

test("Phase closure contract: Project has no retired Idea Lab handoff", () => {
  assert.doesNotMatch(projectPage, /\/idea-lab/);
  assert.doesNotMatch(projectPage, /SEND TO IDEA LAB/);
  assert.doesNotMatch(projectPage, /IDEA LAB ↗/);
});
