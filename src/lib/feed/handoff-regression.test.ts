import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

const todayMotion = source("../../components/frontier/today-motion-production.tsx");
const projectPage = source("../../app/project/[id]/page.tsx");
const ideaLabPage = source("../../app/idea-lab/page.tsx");
const ideaLabWorkbench = source("../../app/idea-lab/idea-lab-workbench.tsx");

test("Gate 9 contract: Today hands the exact signal id to Project Intelligence", () => {
  assert.match(todayMotion, /card\.dataset\.itemId = signal\.id;/);
  assert.match(
    todayMotion,
    /window\.location\.assign\(`\/project\/\$\{encodeURIComponent\(signal\.id\)\}`\)/
  );

  assert.match(projectPage, /const \{ id \} = await params;/);
  assert.match(projectPage, /const detail = await loadProjectDetail\(id\);/);
  assert.match(projectPage, /<h1(?:\s+className="[^"]+")?>\{item\.title\}<\/h1>/);
});

test("Gate 10 contract: Project hands the exact item id to Idea Lab via from", () => {
  assert.match(
    projectPage,
    /href=\{`\/idea-lab\?from=\$\{encodeURIComponent\(item\.id\)\}`\}/
  );

  assert.match(
    ideaLabPage,
    /const rawFrom = Array\.isArray\(params\.from\) \? params\.from\[0\] : params\.from;/
  );
  assert.match(ideaLabPage, /const initialSourceId = rawFrom\?\.trim\(\) \|\| null;/);
  assert.match(ideaLabPage, /<IdeaLabWorkbench initialSourceId=\{initialSourceId\} \/>/);
});

test("Gate 10 contract: requested Idea Lab source never silently falls back", () => {
  assert.match(
    ideaLabWorkbench,
    /if \(!initialSourceAppliedRef\.current && initialSourceId\) \{\s*initialSourceAppliedRef\.current = true;\s*return initialSourceId;\s*\}/s
  );

  assert.match(
    ideaLabWorkbench,
    /ideas\.find\(\(idea\) => idea\.sourceItemId === selectedSourceId\) \?\? null/
  );
  assert.match(
    ideaLabWorkbench,
    /initialSourceId && current === initialSourceId\) return current;/
  );

  assert.match(
    ideaLabWorkbench,
    /initialSourceId &&\s*selectedSourceId === initialSourceId &&\s*!selectedSource &&\s*!activeIdea/s
  );
  assert.match(ideaLabWorkbench, /SOURCE NOT IN SAVED/);
  assert.match(
    ideaLabWorkbench,
    /No other saved signal was substituted\./
  );
});

test("Gate 10 contract: orphan directions remain bound to their original source id", () => {
  assert.match(
    ideaLabWorkbench,
    /selectedIdea\?\.sourceItemId === selectedSourceId\s*\? selectedIdea\s*:\s*ideas\.find\(\(idea\) => idea\.sourceItemId === selectedSourceId\) \?\? null/s
  );
  assert.match(ideaLabWorkbench, /data-orphan="true"/);
  assert.match(ideaLabWorkbench, /SOURCE NO LONGER SAVED/);
  assert.match(
    ideaLabWorkbench,
    /This direction is kept because it is your work\./
  );
});
