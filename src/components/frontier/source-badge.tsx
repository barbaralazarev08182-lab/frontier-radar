import type { FeedSource } from "@/lib/feed/types";

const SOURCE_LABEL: Record<FeedSource, string> = {
  github: "GitHub",
  huggingface: "Hugging Face",
  arxiv: "arXiv",
  hackernews: "Show HN",
  producthunt: "Product Hunt",
};

const SOURCE_STYLE: Record<FeedSource, string> = {
  github: "border-zinc-400/15 bg-zinc-300/[0.05] text-zinc-200",
  huggingface: "border-amber-300/15 bg-amber-300/[0.05] text-amber-200",
  arxiv: "border-sky-300/15 bg-sky-300/[0.05] text-sky-200",
  hackernews: "border-orange-300/15 bg-orange-300/[0.05] text-orange-200",
  producthunt: "border-rose-300/15 bg-rose-300/[0.05] text-rose-200",
};

const SOURCE_DOT: Record<FeedSource, string> = {
  github: "bg-zinc-300",
  huggingface: "bg-amber-300",
  arxiv: "bg-sky-300",
  hackernews: "bg-orange-300",
  producthunt: "bg-rose-300",
};

export function SourceBadge({ source }: { source: FeedSource }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-medium leading-none ${SOURCE_STYLE[source]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${SOURCE_DOT[source]}`} />
      {SOURCE_LABEL[source]}
    </span>
  );
}
