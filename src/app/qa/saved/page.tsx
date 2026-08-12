import { SavedLibrary } from "@/app/saved/saved-library";
import { FIXTURES } from "@/lib/feed/fixtures";
import type { SavedItemSnapshot } from "@/lib/saved/browser";

export const metadata = { title: "Saved QA · Frontier Radar" };

const previewItems: SavedItemSnapshot[] = FIXTURES.slice(0, 6).map((item, index) => ({
  id: item.id,
  title: item.title,
  source: item.source,
  contentType: item.contentType,
  summary: item.summaryZh ?? item.description,
  score: item.score,
  tags: item.tags,
  savedAt: new Date(Date.UTC(2026, 7, 11 - index, 2, 0, 0)).toISOString(),
}));

export default function SavedQaPage() {
  return <SavedLibrary previewItems={previewItems} />;
}
