/**
 * metric-snapshots 数据访问层测试（阶段 1.2.1）。
 *
 * 覆盖：insertSnapshot 使用 collection_run_id 作为唯一约束一部分
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { insertSnapshot } from "@/lib/db/repositories/metric-snapshots";

// ---------------------------------------------------------------------------
// Mock SupabaseClient
// ---------------------------------------------------------------------------

function createMockSupabase() {
  const calls: Array<{ table: string; data: Record<string, unknown>; options: Record<string, unknown> }> = [];
  const supabase = {
    from: (table: string) => ({
      upsert: (data: Record<string, unknown>, options: Record<string, unknown>) => {
        calls.push({ table, data, options });
        return Promise.resolve({ error: null });
      },
    }),
  } as never;
  return { supabase, calls };
}

// ===========================================================================
// insertSnapshot — 必须包含 collection_run_id，onConflict 正确
// ===========================================================================

test("insertSnapshot 使用 collection_run_id 并设置正确的 onConflict", async () => {
  const { supabase, calls } = createMockSupabase();

  await insertSnapshot(supabase, {
    item_id: "item-001",
    collection_run_id: "run-2026-0806-001",
    snapshot_date: "2026-08-06",
    stars: 42,
    forks: 10,
    watchers: 5,
    open_issues: 2,
    subscribers: 8,
  });

  assert.equal(calls.length, 1);
  const call = calls[0]!;
  assert.equal(call.table, "item_metrics_snapshot");
  assert.equal(call.data.collection_run_id, "run-2026-0806-001");
  assert.equal(call.data.stars, 42);
  // onConflict 必须是 item_id,collection_run_id（不再是 item_id,snapshot_date）
  assert.equal(call.options.onConflict, "item_id,collection_run_id");
  // captured_at 应自动填充
  assert.ok(call.data.captured_at);
});
