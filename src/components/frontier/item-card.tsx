import { ArrowUpRight, Code, Play } from "lucide-react";
import type { FrontierFeedItem } from "@/lib/feed/types";
import { SourceBadge } from "./source-badge";
import { ScoreBadge } from "./score-badge";
import { MetricRow } from "./metric-row";

const TYPE_LABEL: Record<string, string> = {
  repo: "Repository",
  model: "Model",
  dataset: "Dataset",
  space: "Space",
  paper: "Paper",
};

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: "复现：简单",
  medium: "复现：中等",
  hard: "复现：困难",
  unknown: "复现：未知",
};

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
}

/** 单个 Feed 条目卡片（Server Component）。 */
export function ItemCard({ item }: { item: FrontierFeedItem }) {
  const noAnalysis = !item.summaryZh && !item.whyItMatters;
  const displayText = noAnalysis ? item.description : item.summaryZh;
  const date = formatDate(item.updatedAt ?? item.publishedAt);

  return (
    <article className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      {/* 头部：来源 / 类型 / 分数 */}
      <div className="flex flex-wrap items-center gap-2">
        <SourceBadge source={item.source} />
        <span className="text-[11px] text-muted-foreground">
          {TYPE_LABEL[item.contentType] ?? item.contentType}
        </span>
        <span className="ml-auto">
          <ScoreBadge score={item.score} />
        </span>
      </div>

      {/* 标题 + 链接 */}
      <h3 className="text-base font-semibold leading-snug">
        <a
          href={item.canonicalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-primary hover:underline"
        >
          {item.title}
        </a>
      </h3>

      {/* 中文说明（无 AI 分析时回退 description 并标注） */}
      {noAnalysis ? (
        <>
          {item.description ? (
            <p className="line-clamp-3 text-sm text-muted-foreground">{item.description}</p>
          ) : (
            <p className="text-xs text-muted-foreground">（无描述）</p>
          )}
          <p className="text-[11px] text-muted-foreground">尚未生成中文分析</p>
        </>
      ) : (
        <>
          <p className="line-clamp-2 text-sm text-foreground">{displayText}</p>
          {item.whyItMatters ? (
            <p className="line-clamp-2 text-xs text-muted-foreground">
              <span className="text-muted-foreground/80">值得关注：</span>
              {item.whyItMatters}
            </p>
          ) : null}
        </>
      )}

      {/* 元信息 */}
      <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-muted-foreground">
        {item.author ? <span>{item.author}</span> : null}
        {date ? <span>更新 {date}</span> : null}
        {item.hasCode === "yes" ? (
          <span className="inline-flex items-center gap-1">
            <Code className="h-3 w-3" /> 有代码
          </span>
        ) : null}
        {item.hasDemo === "yes" ? (
          <span className="inline-flex items-center gap-1">
            <Play className="h-3 w-3" /> 有 Demo
          </span>
        ) : null}
        <span>{DIFFICULTY_LABEL[item.reproductionDifficulty]}</span>
        <MetricRow item={item} />
      </div>

      {/* 标签 + 原始链接 */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
        <span className="flex flex-wrap gap-1.5">
          {item.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </span>
        <a
          href={item.canonicalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          查看原始内容
          <ArrowUpRight className="h-3 w-3" />
        </a>
      </div>
    </article>
  );
}
