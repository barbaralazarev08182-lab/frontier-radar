/** 基础 Frontier Score 徽标（Server Component）。 */
export function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) {
    return (
      <span className="inline-flex items-center rounded border border-border bg-muted/40 px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
        未评分
      </span>
    );
  }

  const tone =
    score >= 75
      ? "border-emerald-800/60 bg-emerald-950/50 text-emerald-200"
      : score >= 50
        ? "border-zinc-700 bg-zinc-800/70 text-zinc-200"
        : "border-zinc-800 bg-zinc-900 text-zinc-400";

  return (
    <span
      className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${tone}`}
      title="基础 Frontier Score（basic-frontier-v1）"
    >
      {score}
    </span>
  );
}
