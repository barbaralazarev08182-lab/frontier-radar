import { unstable_cache } from "next/cache";
import { getFeedProvider } from "./provider";
import type { FeedQuery, FeedResult } from "./types";

const readFeedCached = unstable_cache(
  async (query: FeedQuery): Promise<FeedResult> => {
    const provider = getFeedProvider();
    return provider.getFeed(query);
  },
  ["frontier-radar-feed-read-v1"],
  { revalidate: 45 },
);

/**
 * Today and Explore frequently ask for the same first-page feed. Keep the route
 * itself personalized/dynamic, but reuse the expensive shared Supabase feed read
 * for a short window. Request-specific cookies never enter this cache scope.
 */
export async function getCachedFeed(query: FeedQuery): Promise<FeedResult> {
  return readFeedCached(query);
}
