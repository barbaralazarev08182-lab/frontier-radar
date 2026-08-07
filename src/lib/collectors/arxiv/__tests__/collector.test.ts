import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseArxivId,
  cleanWhitespace,
  normalizeArxivEntry,
} from "@/lib/collectors/arxiv/normalize";
import { discoverArxivPapers } from "@/lib/collectors/arxiv/discover";
import { collectArxiv } from "@/lib/collectors/arxiv/collector";
import { ArxivCollectorSink } from "@/lib/collectors/arxiv/sink";
import { ArxivClient } from "@/lib/arxiv/client";
import type { ArxivAtomEntry } from "@/lib/arxiv/types";

const SAMPLE_ENTRY: ArxivAtomEntry = {
  id: "http://arxiv.org/abs/2401.12345v3",
  title: "Attention Is All You Need",
  summary: "We propose a new simple network architecture. It is based on attention.",
  updated: "2026-07-20T10:00:00Z",
  published: "2026-07-01T08:00:00Z",
  author: [{ name: "Alice Zhang" }, { name: "Bob Li" }],
  link: [
    { href: "https://arxiv.org/abs/2401.12345v3", rel: "alternate", type: "text/html" },
    { href: "https://arxiv.org/pdf/2401.12345v3", rel: "related", type: "application/pdf", title: "pdf" },
  ],
  category: [{ term: "cs.CL" }, { term: "cs.LG" }],
  "arxiv:primary_category": { term: "cs.CL" },
  "arxiv:comment": "Comments: 12 pages, 4 figures",
};

test("arXiv ID 与版本号标准化", () => {
  assert.deepEqual(parseArxivId("http://arxiv.org/abs/2401.12345v3"), {
    baseId: "2401.12345",
    version: 3,
  });
  assert.deepEqual(parseArxivId("http://arxiv.org/abs/cs/9901001"), {
    baseId: "cs/9901001",
    version: null,
  });
  assert.equal(parseArxivId("hep-th/9901001v2").version, 2);
});

test("Atom entry 标准化字段完整", () => {
  const n = normalizeArxivEntry(SAMPLE_ENTRY);
  assert.equal(n.sourceItemId, "arxiv:2401.12345");
  assert.equal(n.itemType, "paper");
  assert.equal(n.canonicalUrl, "https://arxiv.org/abs/2401.12345");
  assert.equal(n.pdfUrl, "https://arxiv.org/pdf/2401.12345");
  assert.deepEqual(n.authors, ["Alice Zhang", "Bob Li"]);
  assert.equal(n.primaryCategory, "cs.CL");
  assert.deepEqual(n.categories, ["cs.CL", "cs.LG"]);
  assert.equal(n.version, 3);
});

test("title 和 abstract 空白清理", () => {
  assert.equal(cleanWhitespace("  Hello   World\nSecond line\t here  "), "Hello World Second line here");
  assert.equal(cleanWhitespace(undefined), null);
  const n = normalizeArxivEntry({
    ...SAMPLE_ENTRY,
    title: "  Multi\nline   Title  ",
    summary: "  Line1\nLine2\n\n  Line3  ",
  });
  assert.equal(n.title, "Multi line Title");
  assert.equal(n.description, "Line1 Line2 Line3");
});

test("多个查询组返回同一论文时去重并合并 queryIds", async () => {
  const current = () => ({ ...SAMPLE_ENTRY, published: new Date().toISOString() });
  const fetchFn = (async () =>
    new Response(
      buildTestFeed([current(), { ...current(), id: "http://arxiv.org/abs/2401.99999v1" }]),
      { status: 200, headers: { "Content-Type": "application/atom+xml" } }
    )) as typeof fetch;
  const client = new ArxivClient({ fetchFn, requestIntervalMs: 0, maxRetries: 0 });
  const result = await discoverArxivPapers(client, {
    maxResultsPerQuery: 10,
    maxGroups: 2,
    discoveryDays: 7,
  });
  assert.equal(result.fetched, 4);
  assert.equal(result.papers.length, 2);
  const dup = result.papers.find((p) => p.normalized.sourceItemId === "arxiv:2401.12345");
  assert.ok(dup);
  assert.deepEqual(dup.queryIds.sort(), ["general-machine-learning", "llm-nlp"]);
});

test("persistPaper 将摘要写入 paper_abstract（含 source_revision）", async () => {
  const calls: { table: string; data: Record<string, unknown> }[] = [];
  const empty = () => Promise.resolve({ data: null, error: null });
  const secondEq = { maybeSingle: empty };
  const firstEq = { maybeSingle: empty, eq: () => secondEq };
  const selectResult = {
    eq: () => firstEq,
    maybeSingle: empty,
    single: () => Promise.resolve({ data: { id: "mock-item-id" }, error: null }),
  };
  const supabase = {
    from: (table: string) => {
      const write = (data: Record<string, unknown>) => {
        calls.push({ table, data });
        return { select: () => selectResult, error: null, status: 201 };
      };
      return {
        select: () => selectResult,
        insert: write,
        upsert: write,
      };
    },
  } as never;

  const sink = new ArxivCollectorSink(supabase, "arxiv");
  const n = normalizeArxivEntry(SAMPLE_ENTRY);
  const outcome = await sink.persistPaper({
    sourceId: "arxiv",
    collectionRunId: "run-001",
    normalized: n,
  });

  assert.equal(outcome.abstractWritten, true);
  assert.equal(outcome.inserted, true);
  const docCall = calls.find((call) => call.table === "item_documents");
  assert.ok(docCall);
  assert.equal(docCall.data.document_type, "paper_abstract");
  assert.equal(docCall.data.content_text, n.description);
  assert.equal(docCall.data.source_revision, "v3");
  assert.equal(calls.some((call) => call.table === "item_metrics_snapshot"), false);
});

test("collectArxiv dry-run 不写数据库并返回论文数", async () => {
  const current = () => ({ ...SAMPLE_ENTRY, published: new Date().toISOString() });
  const fetchFn = (async () =>
    new Response(buildTestFeed([current()]), {
      status: 200,
      headers: { "Content-Type": "application/atom+xml" },
    })) as typeof fetch;
  const result = await collectArxiv(null, {
    sourceId: "arxiv",
    maxResultsPerQuery: 5,
    maxGroups: 1,
    discoveryDays: 7,
    dryRun: true,
    arxivClientOpts: { fetchFn, requestIntervalMs: 0, maxRetries: 0 },
  });
  assert.equal(result.status, "success");
  assert.equal(result.runId, null);
  assert.equal(result.stats.papers_found, 1);
  assert.equal(result.stats.abstracts_written, 1);
});

function buildTestFeed(entries: ArxivAtomEntry[]): string {
  const body = entries.map((e) => {
    const authors = (Array.isArray(e.author) ? e.author : [e.author])
      .map((a) => `<author><name>${a?.name ?? ""}</name></author>`)
      .join("");
    const categories = (Array.isArray(e.category) ? e.category : [e.category])
      .map((c) => `<category term="${c?.term ?? ""}"/>`)
      .join("");
    return `<entry><id>${e.id}</id><title>${e.title ?? ""}</title><summary>${e.summary ?? ""}</summary><published>${e.published ?? ""}</published><updated>${e.updated ?? ""}</updated><link href="https://arxiv.org/abs/2401.12345v3" rel="alternate" type="text/html"/><link href="https://arxiv.org/pdf/2401.12345v3" rel="related" type="application/pdf" title="pdf"/>${categories}${authors}</entry>`;
  }).join("");
  return `<?xml version="1.0" encoding="UTF-8"?><feed xmlns="http://www.w3.org/2005/Atom" xmlns:arxiv="http://arxiv.org/schemas/atom"><id>https://arxiv.org/api/test</id><title>test</title><opensearch:totalResults xmlns:opensearch="http://a9.com/-/spec/opensearch/1.1/">${entries.length}</opensearch:totalResults>${body}</feed>`;
}
