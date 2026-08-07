"use client";

import type { ReactNode } from "react";
import { trackFeedback } from "@/lib/personalization/browser";

export function TrackedSourceLink({
  itemId,
  href,
  className,
  children,
}: {
  itemId: string;
  href: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={() => trackFeedback(itemId, "open_source")}
    >
      {children}
    </a>
  );
}
