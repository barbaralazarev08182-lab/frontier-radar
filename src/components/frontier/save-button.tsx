"use client";

import { useEffect, useState } from "react";
import { Bookmark } from "lucide-react";
import {
  SAVED_CHANGED_EVENT,
  isItemSaved,
  removeSavedItem,
  saveItem,
  type SavedItemSnapshot,
} from "@/lib/saved/browser";

export function SaveButton({
  item,
  className = "",
}: {
  item: Omit<SavedItemSnapshot, "savedAt">;
  className?: string;
}) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const sync = () => setSaved(isItemSaved(item.id));
    sync();
    window.addEventListener(SAVED_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(SAVED_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [item.id]);

  function toggle() {
    if (saved) {
      removeSavedItem(item.id);
      setSaved(false);
      return;
    }
    saveItem(item);
    setSaved(true);
  }

  return (
    <button
      type="button"
      className={className}
      onClick={toggle}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${item.title} from Saved` : `Save ${item.title}`}
      title={saved ? "Remove from Saved" : "Save for later"}
    >
      <Bookmark aria-hidden fill={saved ? "currentColor" : "none"} />
      <span>{saved ? "SAVED" : "SAVE"}</span>
    </button>
  );
}
