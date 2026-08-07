import type { SupabaseClient } from "@supabase/supabase-js";
import type { BasicScoreResult, ScoreComponentValue } from "./basic-score";

interface SnapshotRow {
  captured_at: string;
  stars: number | null;
  forks: number | null;
  downloads: number | null;
  likes: number | null;
  score_raw: number | null;
  raw_extra: Record<string, unknown> | null;
}

export interface MomentumDelta {
  hours: number;
  stars: number | null;
  forks: number | null;
  downloads: number | null;
  likes: number | null;
  engagements: number | null;
  comments: number | null;
}

export interface MomentumHistory {
  latestAt: string;
  delta24h: MomentumDelta | null;
  delta7d: MomentumDelta | null;
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function extraNum(row: SnapshotRow, key: string): number | null {
  return num(row.raw_extra?.[key]);
}

function metricDelta(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null) return null;
  return Math.max(0, current - previous);
}

function buildDelta(latest: SnapshotRow, previous: SnapshotRow): MomentumDelta | null {
  const latestMs = Date.parse(latest.captured_at);
  const previousMs = Date.parse(previous.captured_at);
  if (!Number.isFinite(latestMs) || !Number.isFinite(previousMs) || latestMs <= previousMs) return null;

  const hours = (latestMs - previousMs) / 3_600_000;
  const delta: MomentumDelta = {
    hours,
    stars: metricDelta(num(latest.stars), num(previous.stars)),
    forks: metricDelta(num(latest.forks), num(previous.forks)),
    downloads: metricDelta(num(latest.downloads), num(previous.downloads)),
    likes: metricDelta(num(latest.likes), num(previous.likes)),
    engagements: metricDelta(
      extraNum(latest, "engagements") ?? num(latest.score_raw),
      extraNum(previous, "engagements") ?? num(previous.score_raw)
    ),
    comments: metricDelta(extraNum(latest, "comments"), extraNum(previous, "comments")),
  };

  return delta;
}

function findBaseline(rows: SnapshotRow[], targetMs: number, toleranceHours: number): SnapshotRow | null {
  let best: SnapshotRow | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const row of rows.slice(1)) {
    const t = Date.parse(row.captured_at);
    if (!Number.isFinite(t)) continue;
    const distance = Math.abs(t - targetMs);
    if (distance < bestDistance) {
      best = row;
      bestDistance = distance;
    }
  }

  return bestDistance <= toleranceHours * 3_600_000 ? best : null;
}

export async function loadMomentumHistory(
  supabase: SupabaseClient,
  itemId: string
): Promise<MomentumHistory | null> {
  const { data, error } = await supabase
    .from("item_metrics_snapshot")
    .select("captured_at,stars,forks,downloads,likes,score_raw,raw_extra")
    .eq("item_id", itemId)
    .order("captured_at", { ascending: false })
    .limit(40);

  if (error) throw new Error(`读取 Momentum 历史失败: ${error.message}`);
  const rows = (data ?? []) as SnapshotRow[];
  if (rows.length < 2) return null;

  const latest = rows[0]!;
  const latestMs = Date.parse(latest.captured_at);
  if (!Number.isFinite(latestMs)) return null;

  const baseline24 = findBaseline(rows, latestMs - 24 * 3_600_000, 14);
  const baseline7d = findBaseline(rows, latestMs - 7 * 24 * 3_600_000, 48);

  return {
    latestAt: latest.captured_at,
    delta24h: baseline24 ? buildDelta(latest, baseline24) : null,
    delta7d: baseline7d ? buildDelta(latest, baseline7d) : null,
  };
}

function clamp100(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function logRateScore(ratePerDay: number, strongRate: number): number {
  if (ratePerDay <= 0) return 0;
  return clamp100((Math.log1p(ratePerDay) / Math.log1p(strongRate)) * 100);
}

function daily(delta: number | null, hours: number): number | null {
  if (delta === null || hours <= 0) return null;
  return delta * (24 / hours);
}

function accelerationScore(rate24: number | null, rate7: number | null): number {
  if (rate24 === null || rate7 === null) return 50;
  const ratio = (rate24 + 1) / (rate7 + 1);
  return clamp100(50 + Math.log2(Math.max(0.125, Math.min(8, ratio))) * 16);
}

function historicalMomentum(
  source: string,
  history: MomentumHistory
): { score: number; raw: number | null; rationale: string } | null {
  const d24 = history.delta24h;
  const d7 = history.delta7d;
  if (!d24 && !d7) return null;

  if (source === "github") {
    const star24 = d24 ? daily(d24.stars, d24.hours) : null;
    const star7 = d7 ? daily(d7.stars, d7.hours) : null;
    const fork24 = d24 ? daily(d24.forks, d24.hours) : null;
    const velocity24 = star24 === null ? 0 : logRateScore(star24, 90);
    const velocity7 = star7 === null ? velocity24 : logRateScore(star7, 55);
    const forkSignal = fork24 === null ? 0 : logRateScore(fork24, 20);
    const accel = accelerationScore(star24, star7);
    const score = clamp100(0.45 * velocity24 + 0.25 * velocity7 + 0.12 * forkSignal + 0.18 * accel);
    return {
      score,
      raw: star24,
      rationale: `真实增长：24h ${star24?.toFixed(1) ?? "?"} stars/day，7d ${star7?.toFixed(1) ?? "?"} stars/day，accel=${accel}`,
    };
  }

  if (source === "huggingface") {
    const downloads24 = d24 ? daily(d24.downloads, d24.hours) : null;
    const downloads7 = d7 ? daily(d7.downloads, d7.hours) : null;
    const likes24 = d24 ? daily(d24.likes, d24.hours) : null;
    const velocity24 = downloads24 === null ? 0 : logRateScore(downloads24, 30_000);
    const velocity7 = downloads7 === null ? velocity24 : logRateScore(downloads7, 18_000);
    const likeSignal = likes24 === null ? 0 : logRateScore(likes24, 140);
    const accel = accelerationScore(downloads24, downloads7);
    const score = clamp100(0.4 * velocity24 + 0.25 * velocity7 + 0.17 * likeSignal + 0.18 * accel);
    return {
      score,
      raw: downloads24,
      rationale: `真实增长：24h ${downloads24?.toFixed(0) ?? "?"} downloads/day，7d ${downloads7?.toFixed(0) ?? "?"}/day，accel=${accel}`,
    };
  }

  if (source === "hackernews") {
    const points24 = d24 ? daily(d24.engagements, d24.hours) : null;
    const points7 = d7 ? daily(d7.engagements, d7.hours) : null;
    const comments24 = d24 ? daily(d24.comments, d24.hours) : null;
    const pointsSignal = points24 === null ? 0 : logRateScore(points24, 100);
    const longSignal = points7 === null ? pointsSignal : logRateScore(points7, 60);
    const commentSignal = comments24 === null ? 0 : logRateScore(comments24, 35);
    const accel = accelerationScore(points24, points7);
    const score = clamp100(0.42 * pointsSignal + 0.22 * longSignal + 0.18 * commentSignal + 0.18 * accel);
    return {
      score,
      raw: points24,
      rationale: `真实增长：24h ${points24?.toFixed(1) ?? "?"} HN points/day，comments ${comments24?.toFixed(1) ?? "?"}/day，accel=${accel}`,
    };
  }

  return null;
}

export function applyHistoricalMomentum(
  base: BasicScoreResult,
  source: string,
  history: MomentumHistory | null
): BasicScoreResult {
  if (!history) return base;
  const replacement = historicalMomentum(source, history);
  if (!replacement) return base;

  let replaced = false;
  const components: ScoreComponentValue[] = base.components.map((component) => {
    if (component.dimension !== "momentum") return component;
    replaced = true;
    return {
      ...component,
      rawValue: replacement.raw,
      normalizedScore: replacement.score,
      rationale: replacement.rationale,
    };
  });
  if (!replaced) return base;

  const total = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        components.reduce((sum, component) => sum + component.normalizedScore * component.weight, 0) * 100
      ) / 100
    )
  );

  return { ...base, components, total };
}
