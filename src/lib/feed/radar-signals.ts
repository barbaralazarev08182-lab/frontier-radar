import type { FrontierFeedItem } from "./types";

export type RadarSignal =
  | "NEW"
  | "RISING"
  | "PLAYABLE"
  | "OPEN SOURCE"
  | "IDEA SPARK";

const IDEA_GROUPS: RegExp[] = [
  /\b(agent|agentic|mcp|computer use)\b/i,
  /\b(ui|ux|interface|frontend|interaction)\b/i,
  /\b(game|npc|unity|unreal|godot)\b/i,
  /\b(3d|blender|webgl|webgpu|scene)\b/i,
  /\b(audio|voice|speech|music|tts|asr)\b/i,
  /\b(video|animation|world model)\b/i,
  /\b(browser|extension|chrome|firefox)\b/i,
  /\b(automation|workflow|plugin|tool use)\b/i,
  /\b(creative|generative|design|canvas|art)\b/i,
];

function ageDays(item: FrontierFeedItem): number | null {
  const raw = item.publishedAt ?? item.updatedAt;
  if (!raw) return null;
  const t = Date.parse(raw);
  if (!Number.isFinite(t)) return null;
  return Math.max(0, (Date.now() - t) / 86_400_000);
}

function combinedText(item: FrontierFeedItem): string {
  return [
    item.title,
    item.description ?? "",
    item.summaryZh ?? "",
    item.novelty ?? "",
    item.whyItMatters ?? "",
    ...item.tags,
  ].join(" ");
}

function ideaCombinationCount(item: FrontierFeedItem): number {
  const text = combinedText(item);
  return IDEA_GROUPS.reduce((count, pattern) => count + (pattern.test(text) ? 1 : 0), 0);
}

function isRising(item: FrontierFeedItem, age: number | null): boolean {
  if (age === null || age > 14) return false;
  const days = Math.max(0.5, age);

  if (item.source === "github") {
    const starsPerDay = Math.max(0, item.metrics.stars ?? 0) / days;
    return starsPerDay >= 8;
  }

  if (item.source === "huggingface") {
    const likesPerDay = Math.max(0, item.metrics.likes ?? 0) / days;
    const downloadsPerDay = Math.max(0, item.metrics.downloads ?? 0) / days;
    return likesPerDay >= 12 || downloadsPerDay >= 1_500;
  }

  // Show HN / Product Hunt 本身就是近实时发布流；非常新的条目可视为正在起势，
  // 但只在 48 小时内使用该标记，避免把“上过榜”永久当成 momentum。
  return (item.source === "hackernews" || item.source === "producthunt") && age <= 2;
}

/**
 * 只使用页面已有的可验证信号生成解释标签，不调用模型、不虚构能力。
 */
export function getRadarSignals(item: FrontierFeedItem, limit = 3): RadarSignal[] {
  const signals: RadarSignal[] = [];
  const age = ageDays(item);

  if (age !== null && age <= 3) signals.push("NEW");
  if (isRising(item, age)) signals.push("RISING");

  const playable =
    item.hasDemo === "yes" ||
    item.contentType === "space" ||
    item.source === "producthunt" ||
    (item.source === "hackernews" && !item.canonicalUrl.includes("news.ycombinator.com"));
  if (playable) signals.push("PLAYABLE");

  if (item.hasCode === "yes" || item.contentType === "repo") signals.push("OPEN SOURCE");

  const combinations = ideaCombinationCount(item);
  if (combinations >= 2 && (item.score ?? 0) >= 55) signals.push("IDEA SPARK");

  return [...new Set(signals)].slice(0, limit);
}
