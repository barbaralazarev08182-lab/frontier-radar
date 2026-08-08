import { createAdminClient } from "@/lib/supabase/admin";
import { computeDailySelectionHash, type DailySynthesisSnapshot } from "@/lib/ai/daily-synthesis";
import { findDailySynthesis } from "@/lib/db/repositories/daily-synthesis";

/**
 * Optional rollout sidecar for /today.
 * Only returns a snapshot generated for this exact ordered signal selection.
 * Missing migration/table/snapshot must never break the daily feed.
 */
export async function tryLoadDailySynthesis(
  editionDate: string,
  signalIds: string[]
): Promise<DailySynthesisSnapshot | null> {
  if (signalIds.length === 0) return null;

  try {
    const supabase = createAdminClient();
    return await findDailySynthesis(supabase, {
      editionDate,
      selectionHash: computeDailySelectionHash(signalIds),
    });
  } catch {
    return null;
  }
}
