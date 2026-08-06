/**
 * SupabaseCollectorSink 测试（阶段 1.2.1）。
 *
 * 覆盖：README 写入 item_documents（不再写入 raw_items）
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { SupabaseCollectorSink } from "@/lib/collectors/github/sink";
import type { PersistRepoInput } from "@/lib/collectors/github/collector";

// ---------------------------------------------------------------------------
// Mock SupabaseClient（支持完整的 Supabase 链式调用）
// ---------------------------------------------------------------------------

interface MockUpsertCall {
  table: string;
  data: Record<string, unknown>;
  options: Record<string, unknown>;
}

function createMockSupabase() {
  const calls: MockUpsertCall[] = [];

  // 通用 select 结果
  const selectResult = {
    eq: () => ({
      eq: () => ({
        maybeSingle: () => Promise.resolve({ data: null, error: null }),
      }),
    }),
    single: () => Promise.resolve({ data: { id: "mock-item-id" }, error: null }),
    maybeSingle: () => Promise.resolve({ data: { id: "mock-id" }, error: null }),
  };

  const supabase = {
    from: (table: string) => ({
      upsert: (data: Record<string, unknown>, options: Record<string, unknown>) => {
        calls.push({ table, data, options });
        return {
          select: () => selectResult,
          // insertDocument / insertSnapshot 需要直接解构 status
          error: null,
          status: 201,
        };
      },
      select: () => selectResult,
    }),
  } as never;
  return { supabase, calls };
}

function makeBaseInput(overrides?: Record<string, unknown>): PersistRepoInput {
  return {
    sourceId: "github",
    collectionRunId: "run-001",
    snapshotDate: "2026-08-06",
    normalized: {
      sourceItemId: "12345",
      name: "test/repo",
      canonicalUrl: "https://github.com/test/repo",
      description: "Test repo",
      stars: 100,
      forks: 20,
      watchers: 30,
      openIssues: 5,
      subscribers: 10,
      language: "TypeScript",
      license: "MIT",
      defaultBranch: "main",
      createdAt: "2026-01-01T00:00:00Z",
      pushedAt: "2026-08-05T00:00:00Z",
      rawPayload: {} as Record<string, unknown>,
      payloadHash: "hash001",
      topics: [],
    } as never,
    readme: {
      readme: {
        source_item_id: "12345",
        full_name: "test/repo",
        content: "# Hello World\nThis is a README.",
        encoding: "utf-8",
        size: 30,
        truncated: false,
        original_size: 30,
        etag: 'W/"abc123"',
        fetched_at: new Date().toISOString(),
      },
    } as never,
    readmeEtag: 'W/"abc123"',
    readmeTruncated: false,
    ...overrides,
  } as unknown as PersistRepoInput;
}

// ===========================================================================
// persistRepo — README 写入 item_documents 表
// ===========================================================================

test("persistRepo 有 README 时调用 insertDocument 写入 item_documents", async () => {
  const { supabase, calls } = createMockSupabase();
  const sink = new SupabaseCollectorSink(supabase, "github");

  const input = makeBaseInput();
  const result = await sink.persistRepo(input);

  // 应返回 readmeWritten = true
  assert.equal(result.readmeWritten, true);

  // 检查是否有对 item_documents 的 upsert 调用
  const docCall = calls.find((c) => c.table === "item_documents");
  assert.ok(docCall, "应有对 item_documents 表的 upsert 调用");
  assert.equal(docCall!.data.document_type, "readme");
  assert.equal(docCall!.data.content_text, "# Hello World\nThis is a README.");
  assert.equal(docCall!.data.is_truncated, false);
  assert.ok(docCall!.data.content_hash);
});

test("persistRepo 无 README 时不调用 insertDocument", async () => {
  const { supabase, calls } = createMockSupabase();
  const sink = new SupabaseCollectorSink(supabase, "github");

  const input = makeBaseInput({ readme: undefined, readmeEtag: null, readmeTruncated: false });
  const result = await sink.persistRepo(input);

  assert.equal(result.readmeWritten, false);

  // 不应有对 item_documents 的调用
  const docCall = calls.find((c) => c.table === "item_documents");
  assert.equal(docCall, undefined);
});
