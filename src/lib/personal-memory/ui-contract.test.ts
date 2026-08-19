import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

const siteNav = source("../../components/site-nav.tsx");
const memoryTools = source("../../components/personal-memory-nav-tools.tsx");

test("Phase closure UI: global nav exposes no personal-memory backup controls", () => {
  assert.doesNotMatch(siteNav, /PersonalMemoryNavTools/);
  assert.doesNotMatch(siteNav, /memorySurface/);
  assert.doesNotMatch(siteNav, /\/idea-lab/);
});

test("Global nav uses one Explore-style shell across product surfaces", () => {
  assert.doesNotMatch(siteNav, /if \(today\)/);
  assert.doesNotMatch(siteNav, /pointer-events-none fixed/);
  assert.match(siteNav, /sticky inset-x-0 top-0 z-\[120\] border-b border-black\/10 bg-\[#f3f0e7\]/);
  assert.match(siteNav, /border-y border-black\/20 bg-white\/30/);
});

test("Gate 12B compatibility: export and import actions still use the Gate 12A backup contract", () => {
  assert.match(memoryTools, /buildPersonalMemoryBackupJson\(\)/);
  assert.match(memoryTools, /parsePersonalMemoryBackup\(raw\)/);
  assert.match(memoryTools, /anchor\.download = backupFileName\(\);/);
  assert.match(memoryTools, /accept="application\/json,\.json"/);
});

test("Gate 12B compatibility: import requires a validated preview before merge or replace", () => {
  assert.match(memoryTools, /const backup = parsePersonalMemoryBackup\(raw\);/);
  assert.match(memoryTools, /setPending\(\{ raw, backup, fileName: file\.name \}\);/);
  assert.match(memoryTools, /MERGE BACKUP/);
  assert.match(memoryTools, /REPLACE LOCAL/);
  assert.match(memoryTools, /CONFIRM REPLACE/);
});

test("Gate 12B compatibility: merge and replace dispatch through the atomic import function", () => {
  assert.match(memoryTools, /importPersonalMemoryBackupJson\(pending\.raw, mode\)/);
  assert.match(memoryTools, /commitImport\("merge"\)/);
  assert.match(memoryTools, /commitImport\("replace"\)/);
  assert.match(memoryTools, /if \(mode === "replace" && !replaceArmed\)/);
});
