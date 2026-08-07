import { Activity, ArrowUpRight } from "lucide-react";
import type { ProjectEvidenceDetail } from "@/lib/feed/project-detail";
import { TrackedSourceLink } from "./tracked-source-link";

const SOURCE_LABEL: Record<string, string> = {
  github: "GitHub",
  huggingface: "Hugging Face",
  hackernews: "Show HN",
  producthunt: "Product Hunt",
  arxiv: "arXiv",
};

function eventTime(entry: ProjectEvidenceDetail): number {
  const raw = entry.publishedAt ?? entry.updatedAt;
  if (!raw) return Number.POSITIVE_INFINITY;
  const time = Date.parse(raw);
  return Number.isFinite(time) ? time : Number.POSITIVE_INFINITY;
}

function formatDate(value: string | null): string {
  if (!value) return "时间未知";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "时间未知";
  return date.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
}

function eventLabel(entry: ProjectEvidenceDetail): string {
  if (entry.source === "github") return "代码仓库出现";
  if (entry.source === "hackernews") return "进入 Show HN 社区讨论";
  if (entry.source === "producthunt") return "进入 Product Hunt 发布流";
  if (entry.source === "huggingface" && entry.contentType === "space") return "可试玩 Space 出现";
  if (entry.source === "huggingface") return "Hugging Face 资产出现";
  if (entry.source === "arxiv") return "研究论文发布";
  return "新来源出现";
}

function compact(value: number): string {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function latestMomentum(entry: ProjectEvidenceDetail): string | null {
  const d24 = entry.momentum?.delta24h;
  if (!d24) return null;
  if (entry.source === "github" && d24.stars != null) return `最近窗口 +${compact(d24.stars)} stars`;
  if (entry.source === "huggingface" && d24.downloads != null) return `最近窗口 +${compact(d24.downloads)} downloads`;
  if (entry.source === "hackernews" && d24.engagements != null) return `最近窗口 +${compact(d24.engagements)} HN points`;
  return null;
}

export function ProjectTrajectory({ evidence }: { evidence: ProjectEvidenceDetail[] }) {
  const events = [...evidence].sort((a, b) => eventTime(a) - eventTime(b));
  if (events.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Activity className="h-4 w-4 text-amber-300" />
        <h2 className="text-lg font-semibold">Project Trajectory</h2>
        <span className="text-xs text-muted-foreground">从第一次出现到跨平台扩散</span>
      </div>

      <div className="relative space-y-0 pl-5 before:absolute before:bottom-4 before:left-[5px] before:top-4 before:w-px before:bg-border">
        {events.map((entry, index) => {
          const at = entry.publishedAt ?? entry.updatedAt;
          const momentum = latestMomentum(entry);
          return (
            <div key={entry.itemId} className="relative pb-5 last:pb-0">
              <span className="absolute -left-5 top-2 h-2.5 w-2.5 rounded-full border-2 border-background bg-muted-foreground" />
              <div className="rounded-lg border border-border/70 bg-card/60 p-3">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-mono text-[10px] text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
                  <span className="text-xs font-medium">{SOURCE_LABEL[entry.source] ?? entry.source}</span>
                  <span className="text-[11px] text-muted-foreground">{formatDate(at)}</span>
                  {momentum ? <span className="text-[11px] text-emerald-300">{momentum}</span> : null}
                </div>
                <p className="mt-1 text-sm text-foreground/85">{eventLabel(entry)}</p>
                <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{entry.title}</p>
                <TrackedSourceLink
                  itemId={entry.itemId}
                  href={entry.url}
                  metadata={{ surface: "project_detail", source: entry.source, content_type: entry.contentType }}
                  className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  打开这一节点 <ArrowUpRight className="h-3 w-3" />
                </TrackedSourceLink>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
