import {
  trackFeedback,
  type FeedbackMetadata,
} from "./browser";

export const QUALIFIED_DWELL_MS = 8_000;
export const QUALIFIED_DWELL_RATIO = 0.6;
export const QUALIFIED_DWELL_MEASUREMENT = "visible_60pct_8s";

/**
 * Records one weak-positive dwell event after the target has accumulated
 * 8 seconds at >=60% visibility while the document is visible.
 *
 * The observer is intentionally DOM-only and non-visual so frozen surfaces can
 * share one dwell contract without adding wrapper elements or changing layout.
 */
export function observeQualifiedDwell(
  node: Element,
  itemId: string,
  metadata: FeedbackMetadata
): () => void {
  if (typeof IntersectionObserver === "undefined") return () => {};

  let intersecting = false;
  let activeStart: number | null = null;
  let accumulatedMs = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let sent = false;

  const clearTimer = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };

  const commitActiveTime = () => {
    if (activeStart === null) return;
    accumulatedMs += Date.now() - activeStart;
    activeStart = null;
  };

  const send = () => {
    if (sent || accumulatedMs < QUALIFIED_DWELL_MS) return;
    sent = true;
    clearTimer();
    trackFeedback(itemId, "dwell", Math.round(accumulatedMs), {
      ...metadata,
      measurement: QUALIFIED_DWELL_MEASUREMENT,
    });
  };

  const stop = () => {
    commitActiveTime();
    clearTimer();
    send();
  };

  const start = () => {
    if (sent || activeStart !== null) return;
    activeStart = Date.now();
    const remaining = Math.max(0, QUALIFIED_DWELL_MS - accumulatedMs);
    timer = setTimeout(() => {
      commitActiveTime();
      send();
    }, remaining);
  };

  const sync = () => {
    if (intersecting && document.visibilityState === "visible") start();
    else stop();
  };

  const observer = new IntersectionObserver(
    ([entry]) => {
      intersecting = Boolean(
        entry?.isIntersecting && entry.intersectionRatio >= QUALIFIED_DWELL_RATIO
      );
      sync();
    },
    { threshold: [0, QUALIFIED_DWELL_RATIO, 1] }
  );

  const onVisibility = () => sync();
  observer.observe(node);
  document.addEventListener("visibilitychange", onVisibility);

  return () => {
    stop();
    observer.disconnect();
    document.removeEventListener("visibilitychange", onVisibility);
  };
}
