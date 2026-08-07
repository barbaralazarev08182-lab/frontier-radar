import {
  VISITOR_COOKIE,
  VISITOR_MAX_AGE_SECONDS,
  VISITOR_STORAGE_KEY,
} from "./constants";

export type FeedbackEventType =
  | "interested"
  | "not_interested"
  | "open_source"
  | "open_detail"
  | "dwell";

export interface FeedbackMetadata {
  rank?: number;
  lane?: "core" | "adjacent" | "wildcard";
  surface?: "today" | "explore" | "project_detail";
  algorithm_variant?: string;
  source?: string;
  content_type?: string;
  measurement?: string;
}

const SESSION_STORAGE_KEY = "frontier_radar_session_id";

function syncVisitorCookie(id: string): void {
  document.cookie = `${VISITOR_COOKIE}=${encodeURIComponent(id)}; Path=/; Max-Age=${VISITOR_MAX_AGE_SECONDS}; SameSite=Lax`;
}

export function getVisitorId(): string {
  const existing = window.localStorage.getItem(VISITOR_STORAGE_KEY);
  if (existing) {
    syncVisitorCookie(existing);
    return existing;
  }
  const id = window.crypto.randomUUID();
  window.localStorage.setItem(VISITOR_STORAGE_KEY, id);
  syncVisitorCookie(id);
  return id;
}

function getSessionId(): string {
  const existing = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (existing) return existing;
  const id = window.crypto.randomUUID();
  window.sessionStorage.setItem(SESSION_STORAGE_KEY, id);
  return id;
}

export function trackFeedback(
  itemId: string,
  eventType: FeedbackEventType,
  dwellMs?: number,
  metadata: FeedbackMetadata = {}
): void {
  try {
    const visitorId = getVisitorId();
    const enrichedMetadata = {
      ...metadata,
      session_id: getSessionId(),
    };
    void fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId,
        itemId,
        eventType,
        dwellMs,
        metadata: enrichedMetadata,
      }),
      keepalive: true,
    });
  } catch {
    // 推荐反馈不能阻断正常浏览。
  }
}
