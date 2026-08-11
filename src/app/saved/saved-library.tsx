"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  SAVED_CHANGED_EVENT,
  readSavedItems,
  removeSavedItem,
  type SavedItemSnapshot,
} from "@/lib/saved/browser";
import styles from "./saved-library.module.css";
import "./saved-shelf-depth.css";

type SortMode = "recent" | "score" | "title";
type ShelfStyle = CSSProperties & {
  "--book-x": string;
  "--book-rot": string;
  "--book-z": string;
};

const SORT_LABELS: Record<SortMode, string> = {
  recent: "RECENT",
  score: "HIGH SCORE",
  title: "A–Z",
};

function formattedDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "UNKNOWN DATE";
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date).toUpperCase();
}

function signedShelfOffset(index: number, activeIndex: number, length: number): number {
  if (length <= 1) return 0;
  let offset = index - activeIndex;
  const half = length / 2;
  if (offset > half) offset -= length;
  if (offset < -half) offset += length;
  return offset;
}

function shelfStyle(offset: number): ShelfStyle {
  if (offset === 0) {
    return { "--book-x": "0rem", "--book-rot": "0deg", "--book-z": "1" };
  }

  const distance = Math.abs(offset);
  const direction = Math.sign(offset);
  const x = direction * (12.4 + (distance - 1) * 6.25);
  const rotation = direction * Math.min(3.6, 1.15 + distance * 0.55);
  const z = Math.max(1, 7 - distance);
  return {
    "--book-x": `${x}rem`,
    "--book-rot": `${rotation}deg`,
    "--book-z": String(z),
  };
}

export function SavedLibrary({ previewItems }: { previewItems?: SavedItemSnapshot[] }) {
  const previewMode = Array.isArray(previewItems);
  const [items, setItems] = useState<SavedItemSnapshot[]>(() => previewItems ?? []);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("recent");
  const [selectedId, setSelectedId] = useState<string | null>(previewItems?.[0]?.id ?? null);

  useEffect(() => {
    if (previewMode) return;

    const sync = () => setItems(readSavedItems());
    const frame = window.requestAnimationFrame(sync);
    window.addEventListener(SAVED_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener(SAVED_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [previewMode]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = items.filter((item) => {
      if (!needle) return true;
      return [item.title, item.summary ?? "", item.source, item.contentType, ...item.tags]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });

    return [...filtered].sort((a, b) => {
      if (sort === "score") return (b.score ?? -1) - (a.score ?? -1);
      if (sort === "title") return a.title.localeCompare(b.title);
      return b.savedAt.localeCompare(a.savedAt);
    });
  }, [items, query, sort]);

  const activeIndex = Math.max(0, visible.findIndex((item) => item.id === selectedId));
  const activeItem = visible[activeIndex] ?? visible[0] ?? null;

  function selectOffset(delta: number) {
    if (visible.length === 0) return;
    const currentIndex = activeItem ? visible.findIndex((item) => item.id === activeItem.id) : 0;
    const nextIndex = (currentIndex + delta + visible.length) % visible.length;
    setSelectedId(visible[nextIndex]?.id ?? null);
  }

  function remove(itemId: string) {
    if (previewMode) {
      setItems((current) => current.filter((item) => item.id !== itemId));
    } else {
      removeSavedItem(itemId);
      setItems(readSavedItems());
    }
    if (selectedId === itemId) setSelectedId(null);
  }

  return (
    <section className={`${styles.shell} fr-saved-shell`}>
      <div className={styles.archiveHeader}>
        <div className={styles.archiveIdentity}>
          <span className={styles.eyebrow}>FR / SAVED ARCHIVES{previewMode ? " / QA" : ""}</span>
          <strong>{String(items.length).padStart(2, "0")} SIGNALS</strong>
        </div>

        <div className={styles.archivePanel}>
          <div className={styles.archiveGlyph} aria-hidden>
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
          <div className={styles.archivePanelCopy}>
            <span>PRIVATE RESEARCH SHELF</span>
            <strong>{activeItem?.title ?? "AWAITING FIRST SIGNAL"}</strong>
          </div>
          <span className={styles.archiveDots} aria-hidden>●●●</span>
        </div>
      </div>

      {items.length > 0 ? (
        <>
          <div className={styles.searchDock}>
            <Search aria-hidden />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="SEARCH ARCHIVE"
              aria-label="Search saved research"
            />
            {query ? (
              <button type="button" onClick={() => setQuery("")} aria-label="Clear search">
                <X aria-hidden />
              </button>
            ) : null}
          </div>

          {visible.length > 0 && activeItem ? (
            <div className={`${styles.archiveStage} fr-archive-stage`} aria-live="polite">
              <div className={styles.gridWall} aria-hidden />
              <div className={styles.shelfGlow} aria-hidden />

              <button
                type="button"
                className={`${styles.navArrow} ${styles.navPrev}`}
                onClick={() => selectOffset(-1)}
                aria-label="Previous saved signal"
              >
                <ChevronLeft aria-hidden />
              </button>

              <div className={styles.bookshelf}>
                <div className={`${styles.bookRow} fr-book-row`}>
                  {visible.map((item, index) => {
                    const isActive = item.id === activeItem.id;
                    const offset = signedShelfOffset(index, activeIndex, visible.length);
                    return (
                      <button
                        type="button"
                        key={item.id}
                        className={`${styles.book} fr-shelf-book ${isActive ? `${styles.bookActive} fr-shelf-book-active` : ""}`}
                        style={shelfStyle(offset)}
                        onClick={() => setSelectedId(item.id)}
                        aria-pressed={isActive}
                        aria-label={`Inspect ${item.title}`}
                      >
                        <span className={styles.bookNumber}>{String(index + 1).padStart(2, "0")}</span>
                        <span className={styles.bookSpineTitle}>{item.title}</span>
                        <span className={styles.bookSpineMeta}>{item.source}</span>
                      </button>
                    );
                  })}
                </div>
                <div className={styles.shelfLip} aria-hidden />
              </div>

              <article
                key={activeItem.id}
                className={`${styles.featuredBook} fr-featured-book ${styles[`variant${activeIndex % 5}`]}`}
              >
                <span className="fr-featured-page-edge" aria-hidden />
                <div className={styles.featuredTape}>FR ARCHIVE · {String(activeIndex + 1).padStart(2, "0")}</div>
                <div className={styles.featuredMeta}>
                  <span>{activeItem.source}</span>
                  <span>{activeItem.contentType}</span>
                  <span>{formattedDate(activeItem.savedAt)}</span>
                  {activeItem.score == null ? null : <span>SCORE {Math.round(activeItem.score)}</span>}
                </div>
                <h1>{activeItem.title}</h1>
                {activeItem.summary ? <p>{activeItem.summary}</p> : null}
                <div className={styles.featuredTags}>
                  {activeItem.tags.slice(0, 4).map((tag) => <span key={tag}>{tag}</span>)}
                </div>
                <div className={styles.featuredActions}>
                  <button
                    type="button"
                    onClick={() => remove(activeItem.id)}
                    className={styles.remove}
                  >
                    <Trash2 aria-hidden /> REMOVE
                  </button>
                  <Link href={`/project/${activeItem.id}`} className={styles.open}>
                    OPEN INTELLIGENCE <ArrowUpRight aria-hidden />
                  </Link>
                </div>
              </article>

              <button
                type="button"
                className={`${styles.navArrow} ${styles.navNext}`}
                onClick={() => selectOffset(1)}
                aria-label="Next saved signal"
              >
                <ChevronRight aria-hidden />
              </button>
            </div>
          ) : (
            <div className={styles.noMatch}>
              <span>NO LOCAL MATCH</span>
              <strong>Nothing on this shelf matches.</strong>
              <button type="button" onClick={() => setQuery("")}>CLEAR SEARCH</button>
            </div>
          )}

          <div className={`${styles.archiveRail} fr-archive-rail`} aria-label="Saved archive sorting">
            {(Object.keys(SORT_LABELS) as SortMode[]).map((mode) => (
              <button
                type="button"
                key={mode}
                onClick={() => setSort(mode)}
                className={sort === mode ? styles.railActive : ""}
                aria-pressed={sort === mode}
              >
                {SORT_LABELS[mode]}
              </button>
            ))}
            <span className={styles.railLocked}>FOLDERS · SOON</span>
          </div>
        </>
      ) : (
        <div className={styles.emptyShelf}>
          <div className={styles.gridWall} aria-hidden />
          <div className={styles.emptyBookRow} aria-hidden>
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
          <div className={styles.shelfLip} aria-hidden />
          <div className={styles.emptyMessage}>
            <span>ARCHIVE EMPTY</span>
            <strong>YOUR SHELF STARTS WITH ONE SIGNAL.</strong>
            <p>Save something worth returning to. Your archive stays local to this browser in v1.</p>
          </div>
        </div>
      )}
    </section>
  );
}
