import type { FeedQuery, FeedSource } from "@/lib/feed/types";

const SOURCE_OPTIONS: Array<{ value: FeedSource; label: string }> = [
  { value: "github", label: "GitHub" },
  { value: "huggingface", label: "Hugging Face" },
  { value: "arxiv", label: "arXiv" },
];

const TYPE_OPTIONS = [
  { value: "repo", label: "仓库" },
  { value: "model", label: "模型" },
  { value: "dataset", label: "数据集" },
  { value: "space", label: "Space" },
  { value: "paper", label: "论文" },
];

const SORT_OPTIONS = [
  { value: "score", label: "评分" },
  { value: "newest", label: "最新发布" },
  { value: "updated", label: "最近更新" },
];

const selectClass =
  "h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring";

/**
 * Explore 筛选栏（Server Component）。
 * 使用 GET 表单提交，无浏览器状态依赖；URL 可复制可刷新保持。
 */
export function FilterBar({ query, total }: { query: FeedQuery; total: number }) {
  return (
    <form method="get" action="/explore" className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          name="q"
          defaultValue={query.q ?? ""}
          placeholder="搜索标题 / 描述 / 中文摘要 / 标签"
          className="h-9 min-w-52 flex-1 rounded-md border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-ring"
          maxLength={100}
        />
        <select name="source" defaultValue={query.source ?? ""} className={selectClass}>
          <option value="">全部来源</option>
          {SOURCE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select name="type" defaultValue={query.type ?? ""} className={selectClass}>
          <option value="">全部类型</option>
          {TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select name="sort" defaultValue={query.sort} className={selectClass}>
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          应用筛选
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          name="tag"
          defaultValue={query.tag ?? ""}
          placeholder="按标签筛选（如 llm、agent）"
          className="h-8 w-56 rounded-md border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-ring"
          maxLength={50}
        />
        <span className="text-xs text-muted-foreground">共 {total} 条</span>
      </div>
    </form>
  );
}
