"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Search, Trash2, X } from "lucide-react";
import {
  SAVED_CHANGED_EVENT,
  readSavedItems,
  removeSavedItem,
  type SavedItemSnapshot,
} from "@/lib/saved/browser";
import styles from "./saved-library.module.css";

type SortMode = "recent" | "score" | "title";

function formattedDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "UNKNOWN DATE";
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date).toUpperCase();
}

export function SavedLibrary({ previewItems }: { previewItems?: SavedItemSnapshot[] }) {
  const previewMode = Array.isArray(previewItems);
  const [items, setItems] = useState<SavedItemSnapshot[]>(() => previewItems ?? []);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("recent");

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

  function remove(itemId: string) {
    if (previewMode) {
      setItems((current) => current.filter((item) => item.id !== itemId));
      return;
    }
    removeSavedItem(itemId);
    setItems(readSavedItems());
  }

  return (
    <section className={styles.shell}>
      <header className={styles.hero}>
        <div>
          <p className={styles.kicker}>FR / PRIVATE INDEX · SAVED{previewMode ? " · QA PREVIEW" : ""}</p>
          <h1 className={styles.title}>KEEP THE SIGNAL.</h1>
          <p className={styles.subtitle}>
            A quiet research shelf for the projects worth returning to. Saving is explicit and local to this browser in v1; it does not train your Radar preferences.
          </p>
        </div>
        <div className={styles.counter} aria-label={`${items.length} saved items`}>
          <strong>{String(items.length).padStart(2, "0")}</strong>
          <span>SAVED SIGNALS</span>
        </div>
      </header>

      {items.length > 0 ? (
        <>
          <div className={styles.toolbar}>
            <label className={styles.search}>
              <Search aria-hidden />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search your saved research"
                aria-label="Search saved research"
              />
              {query ? (
                <button className={styles.clear} type="button" onClick={() => setQuery("")} aria-label="Clear search">
                  <X aria-hidden />
                </button>
              ) : null}
            </label>
            <select
              className={styles.sort}
              value={sort}
              onChange={(event) => setSort(event.target.value as SortMode)}
              aria-label="Sort saved research"
            >
              <option value="recent">RECENTLY SAVED</option>
              <option value="score">FRONTIER SCORE</option>
              <option value="title">TITLE A–Z</option>
            </select>
          </div>

          <div className={styles.grid} aria-live="polite">
            {visible.map((item, index) => (
              <article className={styles.card} key={item.id}>
                <div className={styles.cardTop}>
                  <span className={styles.cardIndex}>{String(index + 1).padStart(2, "0")}</span>
                  <button
                    className={styles.remove}
                    type="button"
                    onClick={() => remove(item.id)}
                    aria-label={`Remove ${item.title} from Saved`}
                    title="Remove from Saved"
                  >
                    <Trash2 aria-hidden />
                  </button>
                </div>

                <div className={styles.meta}>
                  {item.source} · {item.contentType} · SAVED {formattedDate(item.savedAt)}
                  {item.score == null ? "" : ` · SCORE ${Math.round(item.score)}`}
                </div>

                <h2 className={styles.cardTitle}>{item.title}</h2>
                {item.summary ? <p className={styles.summary}>{item.summary}</p> : null}

                <div className={styles.cardBottom}>
                  <div className={styles.tags}>
                    {item.tags.slice(0, 4).map((tag) => <span key={tag}>{tag}</span>)}
                  </div>
                  <Link className={styles.open} href={`/project/${item.id}`}>
                    OPEN INTELLIGENCE <ArrowUpRight aria-hidden />
                  </Link>
                </div>
              </article>
            ))}
          </div>

          {visible.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyInner}>
                <div className={styles.emptyMark} aria-hidden />
                <span className={styles.emptyLabel}>NO LOCAL MATCH</span>
                <h2>Nothing on this shelf matches.</h2>
                <p>Clear the search or try a broader term.</p>
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <div className={styles.empty}>
          <div className={styles.emptyInner}>
            <div className={styles.emptyMark} aria-hidden />
            <span className={styles.emptyLabel}>ARCHIVE EMPTY</span>
            <h2>Your shelf starts with one signal.</h2>
            <p>
              Saved v1 keeps explicit bookmarks in this browser. The reusable save control is ready; entry points can be attached without changing recommendation semantics.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
