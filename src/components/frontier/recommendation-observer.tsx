"use client";

import { useEffect, useRef } from "react";
import type { FeedbackMetadata } from "@/lib/personalization/browser";
import { observeQualifiedDwell } from "@/lib/personalization/qualified-dwell";

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
    if (!node) return;
    return observeQualifiedDwell(node, itemId, metadata);
  }, [itemId, metadata]);

  return (
    <span
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
    />
  );
}
