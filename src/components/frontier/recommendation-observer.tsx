"use client";

import { useEffect, useRef } from "react";
import {
  trackFeedback,
  type FeedbackMetadata,
} from "@/lib/personalization/browser";

const QUALIFIED_DWELL_MS = 8_000;

/**
 * Today 卡片达到 60% 可见且累计停留 8 秒后记录一次 dwell。
 * 不记录普通页面加载作为负样本，避免位置偏差；只记录“用户确实看到了”的弱正信号。
 */
export function RecommendationObserver({
  itemId,
  metadata,
}: {
  itemId: string;
  metadata: FeedbackMetadata;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") return;

    let intersecting = false;
    let activeStart: number | null = null;
    let accumulatedMs = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let sent = false;

    const clearTimer = () => {
      if (timer) clearTimeout(timer);
      timer = null;
    };

    const send = () => {
      if (sent || accumulatedMs < QUALIFIED_DWELL_MS) return;
      sent = true;
      clearTimer();
      trackFeedback(itemId, "dwell", Math.round(accumulatedMs), {
        ...metadata,
        measurement: "visible_60pct_8s",
      });
    };

    const stop = () => {
      if (activeStart !== null) {
        accumulatedMs += Date.now() - activeStart;
        activeStart = null;
      }
      clearTimer();
      send();
    };

    const start = () => {
      if (sent || activeStart !== null) return;
      activeStart = Date.now();
      const remaining = Math.max(0, QUALIFIED_DWELL_MS - accumulatedMs);
      timer = setTimeout(() => {
        if (activeStart !== null) {
          accumulatedMs += Date.now() - activeStart;
          activeStart = null;
        }
        send();
      }, remaining);
    };

    const sync = () => {
      if (intersecting && document.visibilityState === "visible") start();
      else stop();
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        intersecting = Boolean(entry?.isIntersecting && entry.intersectionRatio >= 0.6);
        sync();
      },
      { threshold: [0, 0.6, 1] }
    );

    const onVisibility = () => sync();
    observer.observe(node);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [itemId, metadata]);

  return (
    <span
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
    />
  );
}
