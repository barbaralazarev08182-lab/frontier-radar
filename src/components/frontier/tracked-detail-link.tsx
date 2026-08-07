"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  trackFeedback,
  type FeedbackMetadata,
} from "@/lib/personalization/browser";

export function TrackedDetailLink({
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
    <Link
      href={href}
      className={className}
      onClick={() => trackFeedback(itemId, "open_detail", undefined, metadata)}
    >
      {children}
    </Link>
  );
}
