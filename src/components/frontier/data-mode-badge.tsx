import type { FeedDataMode } from "@/lib/feed/provider";

/** 数据模式标记（Server Component）。fixture 模式显示"演示数据"。 */
export function DataModeBadge({ mode }: { mode: FeedDataMode }) {
  if (mode === "fixture") {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-amber-300/20 bg-amber-300/[0.05] px-2.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-amber-200"
        title="当前使用内置演示数据，未连接数据库"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
        Demo data
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/15 bg-emerald-300/[0.045] px-2.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-emerald-200">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.75)]" />
      Live data
    </span>
  );
}
