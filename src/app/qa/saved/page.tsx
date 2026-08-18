import { SavedLibrary } from "@/app/saved/saved-library";
import "@/app/saved/saved-editorial-archive-v5.css";
import "@/app/saved/saved-editorial-archive-v6.css";
import "@/app/saved/saved-editorial-archive-v7.css";
import "@/app/saved/saved-editorial-archive-v8.css";
import "@/app/saved/saved-editorial-archive-v9.css";
import "@/app/saved/saved-editorial-archive-v10.css";
import "@/app/saved/saved-editorial-archive-v11.css";
import "@/app/saved/saved-editorial-archive-v11-aperture-fix.css";
import "@/app/saved/saved-editorial-archive-v12.css";
import "@/app/saved/saved-editorial-archive-v13.css";
import "@/app/saved/saved-editorial-archive-v14.css";
import { FIXTURES } from "@/lib/feed/fixtures";
import type { SavedItemSnapshot } from "@/lib/saved/browser";

export const metadata = { title: "Saved QA · Frontier Radar" };

function requestedCount(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(raw ?? "6", 10);
  if (!Number.isFinite(parsed)) return 6;
  return Math.max(1, Math.min(200, parsed));
}

function buildPreviewItems(count: number): SavedItemSnapshot[] {
  return Array.from({ length: count }, (_, index) => {
    const item = FIXTURES[index % FIXTURES.length]!;
    const cycle = Math.floor(index / FIXTURES.length);
    return {
      id: `${item.id}-qa-${index + 1}`,
      title: cycle === 0 ? item.title : `${item.title} · ARCHIVE ${String(index + 1).padStart(3, "0")}`,
      source: item.source,
      contentType: item.contentType,
      summary: item.summaryZh ?? item.description,
      score: item.score,
      tags: item.tags,
      savedAt: new Date(Date.UTC(2026, 7, 11, 2, 0, 0) - index * 3_600_000).toISOString(),
    };
  });
}

export default async function SavedQaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const search = await searchParams;
  const count = requestedCount(search.count);
  return <SavedLibrary previewItems={buildPreviewItems(count)} />;
}
