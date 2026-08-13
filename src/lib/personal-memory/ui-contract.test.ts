import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

const siteNav = source("../../components/site-nav.tsx");
const memoryTools = source("../../components/personal-memory-nav-tools.tsx");

test("Gate 12B UI: memory tools are visible only on Saved and Idea Lab surfaces", () => {
  assert.match(
    siteNav,
    /const memorySurface = pathname === "\/saved" \|\| pathname\.startsWith\("\/idea-lab"\);/
  );
  assert.match(siteNav, /\{memorySurface \? <PersonalMemoryNavTools \/> : null\}/);
});

test("Gate 12B UI: export and import actions use the Gate 12A backup contract", () => {
  assert.match(memoryTools, /buildPersonalMemoryBackupJson\(\)/);
  assert.match(memoryTools, /parsePersonalMemoryBackup\(raw\)/);
  assert.match(memoryTools, /anchor\.download = backupFileName\(\);/);
  assert.match(memoryTools, /accept="application\/json,\.json"/);
});

test("Gate 12B UI: import requires a validated preview before merge or replace", () => {
  assert.match(memoryTools, /const backup = parsePersonalMemoryBackup\(raw\);/);
  assert.match(memoryTools, /setPending\(\{ raw, backup, fileName: file\.name \}\);/);
  assert.match(memoryTools, /MERGE BACKUP/);
  assert.match(memoryTools, /REPLACE LOCAL/);
  assert.match(memoryTools, /CONFIRM REPLACE/);
});

test("Gate 12B UI: merge and replace dispatch through the atomic import function", () => {
  assert.match(memoryTools, /importPersonalMemoryBackupJson\(pending\.raw, mode\)/);
  assert.match(memoryTools, /commitImport\("merge"\)/);
  assert.match(memoryTools, /commitImport\("replace"\)/);
  assert.match(memoryTools, /if \(mode === "replace" && !replaceArmed\)/);
});
