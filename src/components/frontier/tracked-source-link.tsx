"use client";

import type { ReactNode } from "react";
import {
  trackFeedback,
  type FeedbackMetadata,
} from "@/lib/personalization/browser";

export function TrackedSourceLink({
  itemId,
  href,
  className,
  children,
  metadata,
}: {
  itemId: string;
  href: string;
  className?: string;
  children: ReactNode;
  metadata?: FeedbackMetadata;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={() => trackFeedback(itemId, "open_source", undefined, metadata)}
    >
      {children}
    </a>
  );
}
