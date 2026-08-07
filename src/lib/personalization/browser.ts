export type FeedbackEventType =
  | "interested"
  | "not_interested"
  | "open_source"
  | "open_detail"
  | "dwell";

const VISITOR_KEY = "frontier_radar_visitor_id";

export function getVisitorId(): string {
  const existing = window.localStorage.getItem(VISITOR_KEY);
  if (existing) return existing;
  const id = window.crypto.randomUUID();
  window.localStorage.setItem(VISITOR_KEY, id);
  return id;
}

export function trackFeedback(
  itemId: string,
  eventType: FeedbackEventType,
  dwellMs?: number
): void {
  try {
    const visitorId = getVisitorId();
    void fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitorId, itemId, eventType, dwellMs }),
      keepalive: true,
    });
  } catch {
    // 推荐反馈不能阻断正常浏览。
  }
}
