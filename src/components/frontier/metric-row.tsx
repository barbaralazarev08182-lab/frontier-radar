import { Download, GitFork, Heart, Star } from "lucide-react";
import type { FrontierFeedItem } from "@/lib/feed/types";

function compact(n: number | null | undefined): string | null {
  if (n === null || n === undefined) return null;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function Metric({ icon, value }: { icon: React.ReactNode; value: string | null }) {
  if (value === null) return null;
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
      {icon}
      <span className="tabular-nums">{value}</span>
    </span>
  );
}

/** 关键指标行（stars / forks / downloads / likes，Server Component）。 */
export function MetricRow({ item }: { item: FrontierFeedItem }) {
  const m = item.metrics;
  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <Metric icon={<Star className="h-3 w-3" />} value={compact(m.stars)} />
      <Metric icon={<GitFork className="h-3 w-3" />} value={compact(m.forks)} />
      <Metric icon={<Download className="h-3 w-3" />} value={compact(m.downloads)} />
      <Metric icon={<Heart className="h-3 w-3" />} value={compact(m.likes)} />
    </span>
  );
}
