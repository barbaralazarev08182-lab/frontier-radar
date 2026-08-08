/** 基础 Frontier Score 徽标（Server Component）。 */
export function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) {
    return (
      <span className="inline-flex items-center rounded-full border border-white/[0.07] bg-white/[0.025] px-2 py-1 font-mono text-[10px] font-medium text-muted-foreground">
        --
      </span>
    );
  }

  const tone =
    score >= 75
      ? "border-emerald-300/20 bg-emerald-300/[0.065] text-emerald-200"
      : score >= 50
        ? "border-cyan-300/15 bg-cyan-300/[0.045] text-cyan-100"
        : "border-white/[0.07] bg-white/[0.025] text-muted-foreground";

  return (
    <span
      className={`inline-flex items-baseline gap-1 rounded-full border px-2 py-1 font-mono text-[10px] font-semibold tabular-nums ${tone}`}
      title="基础 Frontier Score（basic-frontier-v1）"
    >
      <span className="text-[8px] font-medium uppercase tracking-[0.12em] opacity-60">FR</span>
      {Math.round(score)}
    </span>
  );
}
