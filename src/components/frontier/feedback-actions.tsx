"use client";

import { useState } from "react";
import { Heart, ThumbsDown } from "lucide-react";
import {
  trackFeedback,
  type FeedbackMetadata,
} from "@/lib/personalization/browser";

export function FeedbackActions({
  itemId,
  metadata,
}: {
  itemId: string;
  metadata?: FeedbackMetadata;
}) {
  const [choice, setChoice] = useState<"interested" | "not_interested" | null>(null);

  function choose(next: "interested" | "not_interested") {
    if (choice === next) return;
    setChoice(next);
    trackFeedback(itemId, next, undefined, metadata);
  }

  return (
    <div className="flex items-center gap-1.5" aria-label="个性化推荐反馈">
      <button
        type="button"
        onClick={() => choose("interested")}
        className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] transition-colors ${
          choice === "interested"
            ? "bg-foreground text-background"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
        aria-pressed={choice === "interested"}
      >
        <Heart className="h-3 w-3" />
        感兴趣
      </button>
      <button
        type="button"
        onClick={() => choose("not_interested")}
        className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] transition-colors ${
          choice === "not_interested"
            ? "bg-muted text-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
        aria-pressed={choice === "not_interested"}
      >
        <ThumbsDown className="h-3 w-3" />
        不感兴趣
      </button>
    </div>
  );
}
