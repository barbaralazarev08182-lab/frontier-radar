import type { FeedSource } from "@/lib/feed/types";

const SOURCE_LABEL: Record<FeedSource, string> = {
  github: "GitHub",
  huggingface: "Hugging Face",
  arxiv: "arXiv",
};

const SOURCE_STYLE: Record<FeedSource, string> = {
  github: "bg-zinc-800 text-zinc-200 border-zinc-700",
  huggingface: "bg-amber-950/60 text-amber-200 border-amber-800/60",
  arxiv: "bg-sky-950/60 text-sky-200 border-sky-800/60",
};

/** 来源徽标（Server Component，静态样式）。 */
export function SourceBadge({ source }: { source: FeedSource }) {
  return (
    <span
      className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] font-medium leading-none ${SOURCE_STYLE[source]}`}
    >
      {SOURCE_LABEL[source]}
    </span>
  );
}
