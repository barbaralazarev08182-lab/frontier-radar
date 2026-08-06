/**
 * arXiv 采集器最小测试（阶段 1.4）。
 *
 * 覆盖（不重复测试已有通用数据库行为）：
 *  1. 新式 arXiv ID 标准化（2401.12345v3 → arxiv:2401.12345, version=3）
 *  2. 旧式 arXiv ID 标准化（cs/9901001 → arxiv:cs/9901001）
 *  3. 版本号解析（无版本 → null；多版本号 → 取末尾）
 *  4. Atom entry 标准化（标题/摘要/作者/分类/链接）
 *  5. title 和 abstract 空白清理
 *  6. 多查询同一论文去重
 *  7. abstract 写入 paper_abstract
 *  8. dry-run 不写数据库
 */
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

// ---------------------------------------------------------------------------
// 1/2/3. arXiv ID 与版本号
// ---------------------------------------------------------------------------

test("新式 arXiv ID 标准化：2401.12345v3 → base + version", () => {
  const { baseId, version } = parseArxivId("http://arxiv.org/abs/2401.12345v3");
  assert.equal(baseId, "2401.12345");
  assert.equal(version, 3);
});

test("旧式 arXiv ID 标准化：cs/9901001 无版本 → 原样", () => {
  const { baseId, version } = parseArxivId("http://arxiv.org/abs/cs/9901001");
  assert.equal(baseId, "cs/9901001");
  assert.equal(version, null);
});

test("版本号解析：无版本为 null，多版本位取末尾", () => {
  assert.equal(parseArxivId("2401.12345").version, null);
  assert.equal(parseArxivId("hep-th/9901001v2").baseId, "hep-th/9901001");
  assert.equal(parseArxivId("hep-th/9901001v2").version, 2);
  assert.equal(parseArxivId("math/9901v100").baseId, "math/9901");
  assert.equal(parseArxivId("math/9901v100").version, 100);
});

// ---------------------------------------------------------------------------
// 4. Atom entry 标准化
// ---------------------------------------------------------------------------

const SAMPLE_ENTRY: ArxivAtomEntry = {
  id: "http://arxiv.org/abs/2401.12345v3",
  title: "Attention Is All You Need",
  summary:
    "We propose a new simple network architecture.   It is based on attention.\nMulti-line abstract text.",
  updated: "2026-07-20T10:00:00Z",
  published: "2026-07-01T08:00:00Z",
  author: [
    { name: "Alice Zhang" },
    { name: "Bob Li" },
  ],
  link: [
    { href: "https://arxiv.org/abs/2401.12345v3", rel: "alternate", type: "text/html" },
    { href: "https://arxiv.org/pdf/2401.12345v3", rel: "related", type: "application/pdf", title: "pdf" },
  ],
  category: [{ term: "cs.CL" }, { term: "cs.LG" }],
  "arxiv:primary_category": { term: "cs.CL" },
  "arxiv:comment": "  Comments: 12 pages, 4 figures  ",
  "arxiv:journal_ref": undefined,
  "arxiv:doi": undefined,
};

test("Atom entry 标准化：字段映射完整", () => {
  const n = normalizeArxivEntry(SAMPLE_ENTRY);
  assert.equal(n.sourceItemId, "arxiv:2401.12345");
  assert.equal(n.itemType, "paper");
  assert.equal(n.title, "Attention Is All You Need");
  assert.equal(n.canonicalUrl, "https://arxiv.org/abs/2401.12345");
  assert.equal(n.pdfUrl, "https://arxiv.org/pdf/2401.12345");
  assert.deepEqual(n.authors, ["Alice Zhang", "Bob Li"]);
  assert.equal(n.primaryCategory, "cs.CL");
  assert.deepEqual(n.categories, ["cs.CL", "cs.LG"]);
  assert.equal(n.publishedAt, "2026-07-01T08:00:00Z");
  assert.equal(n.updatedAt, "2026-07-20T10:00:00Z");
  assert.equal(n.version, 3);
  assert.equal(n.comment, "Comments: 12 pages, 4 figures");
  assert.equal(n.journalReference, null);
  assert.equal(n.doi, null);
  assert.ok(String(n.rawPayload.id).includes("2401.12345v3"));
  assert.ok(typeof n.payloadHash === "string" && n.payloadHash.length > 0);
});

// ---------------------------------------------------------------------------
// 5. 空白清理
// ---------------------------------------------------------------------------

test("title 和 abstract 空白清理：合并换行与连续空格", () => {
  assert.equal(cleanWhitespace("  Hello   World\nSecond line\t here  "), "Hello World Second line here");
  assert.equal(cleanWhitespace(undefined), null);
  assert.equal(cleanWhitespace("   "), null);

  const n = normalizeArxivEntry({
    ...SAMPLE_ENTRY,
    title: "  Multi\nline   Title  ",
    summary: "  Line1\nLine2\n\n  Line3  ",
  });
  assert.equal(n.title, "Multi line Title");
  assert.equal(n.description, "Line1 Line2 Line3");
});

// ---------------------------------------------------------------------------
// 6. 多查询同一论文去重
// ---------------------------------------------------------------------------

test("多个查询组返回同一论文时去重并合并 queryIds", async () => {
  const entry = () => ({ ...SAMPLE_ENTRY, published: new Date().toISOString() });
  const fetchFn = (async (url: string) => {
    const xml = buildTestFeed([entry(), { ...entry(), id: "http://arxiv.org/abs/2401.99999v1" }]);
    return new Response(xml, { status: 200, headers: { "Content-Type": "application/atom+xml" } });
  }) as typeof fetch;

  const client = new ArxivClient({ fetchFn, requestIntervalMs: 0, maxRetries: 0 });
  const result = await discoverArxivPapers(client, {
    maxResultsPerQuery: 10,
    maxGroups: 2,
    discoveryDays: 7,
  });

  assert.equal(result.groupsRun, 2);
  assert.equal(result.fetched, 4); // 2 组 × 2 条
  assert.equal(result.papers.length, 2); // 去重后
  const dup = result.papers.find((p) => p.normalized.sourceItemId === "arxiv:2401.12345");
  assert.ok(dup);
  assert.deepEqual(dup.queryIds.sort(), ["general-machine-learning", "llm-nlp"]);
});

// ---------------------------------------------------------------------------
// 7. abstract 写入 paper_abstract
// ---------------------------------------------------------------------------

test("persistPaper 将摘要写入 paper_abstract（含 source_revision）", async () => {
  const calls: { table: string; data: Record<string, unknown> }[] = [];
  const selectResult = {
    eq: () => ({
      eq: () => ({
        maybeSingle: () => Promise.resolve({ data: null, error: null }),
      }),
    }),
    single: () => Promise.resolve({ data: { id: "mock-item-id" }, error: null }),
    maybeSingle: () => Promise.resolve({ data: null, error: null }),
  };
  const supabase = {
    from: (table: string) => {
      const call = (data: Record<string, unknown>) => {
        calls.push({ table, data });
        return {
          select: () => selectResult,
          error: null,
          status: 201,
        };
      };
      return {
        upsert: (data: Record<string, unknown>) => call(data),
        select: () => selectResult,
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

  const docCall = calls.find((c) => c.table === "item_documents");
  assert.ok(docCall, "应有 item_documents 写入");
  assert.equal(docCall!.data.document_type, "paper_abstract");
  assert.equal(docCall!.data.content_text, n.description);
  assert.equal(docCall!.data.source_revision, "v3");
  assert.equal(docCall!.data.is_truncated, false);
  assert.ok(typeof docCall!.data.content_hash === "string");

  // 论文不写指标快照
  const snapshotCall = calls.find((c) => c.table === "item_metrics_snapshot");
  assert.equal(snapshotCall, undefined);
});

// ---------------------------------------------------------------------------
// 8. dry-run 不写数据库
// ---------------------------------------------------------------------------

test("collectArxiv dry-run 不写数据库并返回论文数", async () => {
  const entry = () => ({ ...SAMPLE_ENTRY, published: new Date().toISOString() });
  const fetchFn = (async () => {
    return new Response(buildTestFeed([entry()]), {
      status: 200,
      headers: { "Content-Type": "application/atom+xml" },
    });
  }) as typeof fetch;

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
  assert.equal(result.discovery.papers.length, 1);
  assert.equal(result.stats.papers_found, 1);
  assert.equal(result.stats.papers_inserted, 1);
  assert.equal(result.stats.abstracts_written, 1);
});

// ---------------------------------------------------------------------------
// 辅助：构造 Atom feed XML
// ---------------------------------------------------------------------------

function buildTestFeed(entries: ArxivAtomEntry[]): string {
  const entryXml = entries
    .map((e) => {
      const authors = (Array.isArray(e.author) ? e.author : [e.author])
        .map((a) => `<author><name>${a?.name ?? ""}</name></author>`)
        .join("");
      const cats = (Array.isArray(e.category) ? e.category : [e.category])
        .map((c) => `<category term="${c?.term ?? ""}"/>`)
        .join("");
      return [
        "<entry>",
        `<id>${e.id}</id>`,
        `<title>${e.title ?? ""}</title>`,
        `<summary>${e.summary ?? ""}</summary>`,
        `<published>${e.published ?? ""}</published>`,
        `<updated>${e.updated ?? ""}</updated>`,
        `<link href="https://arxiv.org/abs/2401.12345v3" rel="alternate" type="text/html"/>`,
        `<link href="https://arxiv.org/pdf/2401.12345v3" rel="related" type="application/pdf" title="pdf"/>`,
        cats,
        authors,
        "</entry>",
      ].join("");
    })
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:arxiv="http://arxiv.org/schemas/atom">
  <id>https://arxiv.org/api/test</id>
  <title>test</title>
  <opensearch:totalResults xmlns:opensearch="http://a9.com/-/spec/opensearch/1.1/">${entries.length}</opensearch:totalResults>
   ${entryXml}
</feed>`;
}

