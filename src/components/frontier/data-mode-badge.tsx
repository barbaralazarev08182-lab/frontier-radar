import type { FeedDataMode } from "@/lib/feed/provider";

/** 数据模式标记（Server Component）。fixture 模式显示"演示数据"。 */
export function DataModeBadge({ mode }: { mode: FeedDataMode }) {
  if (mode === "fixture") {
    return (
      <span
        className="inline-flex items-center rounded border border-dashed border-amber-700/60 bg-amber-950/40 px-2 py-0.5 text-[11px] text-amber-200"
        title="当前使用内置演示数据，未连接数据库"
      >
        演示数据
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded border border-zinc-700 bg-zinc-800/60 px-2 py-0.5 text-[11px] text-zinc-300">
      Supabase 数据
    </span>
  );
}
