const DAY_MS = 86_400_000;

/**
 * Personalization should become more assertive only after repeated evidence.
 * A count of 12 means evidence confidence reaches 0.5; it approaches 1 gradually.
 */
export const PERSONALIZATION_EVIDENCE_SCALE = 12;

/**
 * Inactivity half-life for the absolute strength of Personal Match.
 * This is separate from per-event recency inside the profile vector/rules layer.
 */
export const PERSONALIZATION_ACTIVITY_HALF_LIFE_DAYS = 30;

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function evidenceConfidence(eventCount: number): number {
  if (!Number.isFinite(eventCount) || eventCount <= 0) return 0;
  const count = Math.max(0, eventCount);
  return clamp01(count / (count + PERSONALIZATION_EVIDENCE_SCALE));
}

export function activityFreshness(
  lastEventAt: string | null | undefined,
  nowMs = Date.now()
): number {
  if (!lastEventAt) return 0;
  const timestamp = Date.parse(lastEventAt);
  if (!Number.isFinite(timestamp) || !Number.isFinite(nowMs)) return 0;
  const ageDays = Math.max(0, (nowMs - timestamp) / DAY_MS);
  return Math.pow(0.5, ageDays / PERSONALIZATION_ACTIVITY_HALF_LIFE_DAYS);
}

/**
 * 0..1 confidence applied to Personal Match boost only.
 * Global Discovery Score is never changed by this value.
 */
export function personalizationConfidence(
  eventCount: number,
  lastEventAt: string | null | undefined,
  nowMs = Date.now()
): number {
  return clamp01(evidenceConfidence(eventCount) * activityFreshness(lastEventAt, nowMs));
}

/**
 * Stored vectors are snapshots. Any newer feedback event (including dwell)
 * makes the snapshot stale, so the request must use the live rules path instead.
 */
export function storedProfileIsFresh(
  profileUpdatedAt: string | null | undefined,
  latestEventAt: string | null | undefined
): boolean {
  if (!profileUpdatedAt || !latestEventAt) return false;
  const profileTimestamp = Date.parse(profileUpdatedAt);
  const eventTimestamp = Date.parse(latestEventAt);
  if (!Number.isFinite(profileTimestamp) || !Number.isFinite(eventTimestamp)) return false;
  return profileTimestamp >= eventTimestamp;
}
