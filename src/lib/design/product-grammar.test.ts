import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const nav = readFileSync("src/components/site-nav.tsx", "utf8");
const layout = readFileSync("src/app/layout.tsx", "utf8");
const grammar = readFileSync("src/app/product-grammar.css", "utf8");
const layer2 = readFileSync("src/app/product-grammar-layer2.css", "utf8");
const projectCss = readFileSync("src/app/project/[id]/project-intelligence.css", "utf8");

test("global layout loads both shared Frontier Radar product grammar layers", () => {
  assert.match(layout, /import "\.\/product-grammar\.css"/);
  assert.match(layout, /import "\.\/product-grammar-layer2\.css"/);
});

test("primary navigation uses one shared structural grammar across routes", () => {
  assert.match(nav, /className="fr-site-nav"/);
  assert.match(nav, /className="fr-site-nav__inner"/);
  assert.match(nav, /className="fr-primary-nav"/);
  assert.match(nav, /className="fr-primary-nav__link"/);
  assert.doesNotMatch(nav, /mix-blend-difference/);
  assert.doesNotMatch(nav, /shadow-\[/);
});

test("route differences are limited to tone and positioning rather than separate nav designs", () => {
  assert.match(nav, /const tone = today \? "overlay" : memorySurface \? "dark" : "light"/);
  assert.match(nav, /const position = today \|\| project \? "fixed" : "sticky"/);
});

test("shared grammar defines stable semantic design tokens", () => {
  for (const token of [
    "--fr-paper",
    "--fr-ink",
    "--fr-muted",
    "--fr-cobalt",
    "--fr-wildcard",
    "--fr-page-x",
    "--fr-header-h",
    "--fr-control-h",
    "--fr-text-title",
    "--fr-text-body",
    "--fr-text-meta",
  ]) {
    assert.ok(grammar.includes(token), `missing ${token}`);
  }
});

test("shared header height stays aligned with the protected Project shell", () => {
  assert.match(grammar, /--fr-header-h:\s*3rem;/);
  assert.match(grammar, /height:\s*var\(--fr-header-h\);/);
  assert.match(projectCss, /\.project-intelligence-shell\s*\{[\s\S]*?inset:\s*3rem 0 0;/);
});

test("shared action grammar has primary, secondary, and tertiary roles", () => {
  assert.match(grammar, /\.fr-action-primary/);
  assert.match(grammar, /\.fr-action-secondary/);
  assert.match(grammar, /\.fr-action-tertiary/);
});

test("layer 2 keeps repeated product roles visually consistent without changing route composition", () => {
  assert.match(layer2, /\.explore-open-intelligence/);
  assert.match(layer2, /\.fr-featured-book a\[href\^="\/project\/"\]/);
  assert.match(layer2, /\.fr-idea-blank-sheet>button/);
  assert.match(layer2, /\.pi-cta:not\(\.secondary\)/);
  assert.match(layer2, /\.explore-field-shell \.explore-lens-options>button\.is-active/);
  assert.match(layer2, /var\(--fr-cobalt\)/);
  assert.match(layer2, /var\(--fr-wildcard\)/);
});
