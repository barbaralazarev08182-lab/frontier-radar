"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, BookOpen, FlaskConical, Lightbulb, Plus, Trash2 } from "lucide-react";
import {
  IDEAS_CHANGED_EVENT,
  createIdea,
  readIdeas,
  removeIdea,
  updateIdea,
  type IdeaDraft,
  type IdeaStatus,
} from "@/lib/ideas/browser";
import {
  SAVED_CHANGED_EVENT,
  readSavedItems,
  type SavedItemSnapshot,
} from "@/lib/saved/browser";
import styles from "./idea-lab.module.css";
import "./idea-lab-composition.css";

const STATUS_LABELS: Record<IdeaStatus, { label: string; note: string }> = {
  seed: { label: "SEED", note: "capture the spark" },
  shaping: { label: "SHAPING", note: "turn it into a direction" },
  building: { label: "BUILDING", note: "ready to execute" },
};

function formatSource(source: string): string {
  if (source === "hackernews") return "SHOW HN";
  if (source === "producthunt") return "PRODUCT HUNT";
  if (source === "huggingface") return "HUGGING FACE";
  return source.toUpperCase();
}

function shortDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en", { month: "short", day: "2-digit" }).format(date).toUpperCase();
}

export function IdeaLabWorkbench() {
  const [saved, setSaved] = useState<SavedItemSnapshot[]>([]);
  const [ideas, setIdeas] = useState<IdeaDraft[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [selectedIdeaId, setSelectedIdeaId] = useState<string | null>(null);

  useEffect(() => {
    const syncSaved = () => {
      const next = readSavedItems();
      setSaved(next);
      setSelectedSourceId((current) =>
        current && next.some((item) => item.id === current) ? current : next[0]?.id ?? null
      );
    };
    const syncIdeas = () => {
      setIdeas(readIdeas());
    };

    syncSaved();
    syncIdeas();
    window.addEventListener(SAVED_CHANGED_EVENT, syncSaved);
    window.addEventListener("storage", syncSaved);
    window.addEventListener(IDEAS_CHANGED_EVENT, syncIdeas);
    window.addEventListener("storage", syncIdeas);
    return () => {
      window.removeEventListener(SAVED_CHANGED_EVENT, syncSaved);
      window.removeEventListener("storage", syncSaved);
      window.removeEventListener(IDEAS_CHANGED_EVENT, syncIdeas);
      window.removeEventListener("storage", syncIdeas);
    };
  }, []);

  useEffect(() => {
    if (!selectedSourceId) {
      setSelectedIdeaId(null);
      return;
    }

    setSelectedIdeaId((current) => {
      const currentIdea = ideas.find((idea) => idea.id === current);
      if (currentIdea?.sourceItemId === selectedSourceId) return current;
      return ideas.find((idea) => idea.sourceItemId === selectedSourceId)?.id ?? null;
    });
  }, [ideas, selectedSourceId]);

  const selectedSource = saved.find((item) => item.id === selectedSourceId) ?? saved[0] ?? null;
  const selectedIdea = ideas.find((idea) => idea.id === selectedIdeaId) ?? null;
  const activeIdea =
    selectedIdea && selectedSource && selectedIdea.sourceItemId === selectedSource.id
      ? selectedIdea
      : null;
  const ideasByStatus = useMemo(() => {
    const counts: Record<IdeaStatus, number> = { seed: 0, shaping: 0, building: 0 };
    ideas.forEach((idea) => {
      counts[idea.status] += 1;
    });
    return counts;
  }, [ideas]);

  function selectSource(sourceId: string) {
    setSelectedSourceId(sourceId);
    const sourceIdea = ideas.find((idea) => idea.sourceItemId === sourceId) ?? null;
    setSelectedIdeaId(sourceIdea?.id ?? null);
  }

  function startIdea() {
    if (!selectedSource) return;
    const idea = createIdea({ sourceItemId: selectedSource.id, sourceTitle: selectedSource.title });
    setIdeas(readIdeas());
    setSelectedIdeaId(idea.id);
  }

  function patchIdea(patch: Partial<Pick<IdeaDraft, "title" | "note" | "status">>) {
    if (!activeIdea) return;
    updateIdea(activeIdea.id, patch);
    setIdeas(readIdeas());
  }

  function deleteActiveIdea() {
    if (!activeIdea || !selectedSource) return;
    removeIdea(activeIdea.id);
    const next = readIdeas();
    setIdeas(next);
    const nextForSource = next.find((idea) => idea.sourceItemId === selectedSource.id) ?? null;
    setSelectedIdeaId(nextForSource?.id ?? null);
  }

  return (
    <section className={`${styles.shell} fr-idea-lab-shell`}>
      <div className={styles.scanlines} aria-hidden />

      <header className={`${styles.header} fr-idea-lab-header`}>
        <div className={`${styles.identity} fr-idea-lab-identity`}>
          <span>FR / IDEA LAB</span>
          <strong>TURN SIGNAL INTO DIRECTION.</strong>
        </div>
        <div className={`${styles.counts} fr-idea-lab-counts`} aria-label="Idea status counts">
          {(Object.keys(STATUS_LABELS) as IdeaStatus[]).map((status) => (
            <div key={status}>
              <span>{STATUS_LABELS[status].label}</span>
              <strong>{String(ideasByStatus[status]).padStart(2, "0")}</strong>
            </div>
          ))}
        </div>
      </header>

      <div className={`${styles.workbench} fr-idea-lab-workbench`}>
        <aside className={`${styles.sourceRack} fr-idea-lab-source-rack`}>
          <div className={styles.panelHeading}>
            <BookOpen aria-hidden />
            <span>
              <strong>SOURCE MATERIAL</strong>
              <small>FROM YOUR SAVED SHELF</small>
            </span>
          </div>

          {saved.length > 0 ? (
            <div className={`${styles.sourceList} fr-idea-lab-source-list`}>
              {saved.slice(0, 12).map((item, index) => {
                const active = item.id === selectedSource?.id;
                return (
                  <button
                    type="button"
                    key={item.id}
                    className={`${active ? styles.sourceActive : ""} fr-idea-source-card${active ? " is-active" : ""}`}
                    onClick={() => selectSource(item.id)}
                    aria-pressed={active}
                  >
                    <span className={styles.sourceIndex}>{String(index + 1).padStart(2, "0")}</span>
                    <strong>{item.title}</strong>
                    <span>{formatSource(item.source)} · {item.contentType.toUpperCase()}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className={styles.sourceEmpty}>
              <span>NO SOURCE MATERIAL</span>
              <p>Save one signal first. Idea Lab starts from material worth keeping.</p>
              <Link href="/explore">SCAN FRONTIER <ArrowUpRight aria-hidden /></Link>
            </div>
          )}
        </aside>

        <main className={`${styles.draftingTable} fr-idea-lab-table`}>
          <div className={styles.tableGrid} aria-hidden />
          {selectedSource ? (
            <div className={`${styles.sourceSlip} fr-idea-source-slip`}>
              <div>
                <span>PINNED SIGNAL</span>
                <strong>{selectedSource.title}</strong>
              </div>
              <div className={styles.sourceSlipMeta}>
                <span>{formatSource(selectedSource.source)}</span>
                {selectedSource.score == null ? null : <span>SCORE {Math.round(selectedSource.score)}</span>}
                <Link href={`/project/${selectedSource.id}`} aria-label="Open source intelligence">
                  SOURCE <ArrowUpRight aria-hidden />
                </Link>
              </div>
              {selectedSource.summary ? <p>{selectedSource.summary}</p> : null}
              <div className={styles.sourceTags}>
                {selectedSource.tags.slice(0, 4).map((tag) => <span key={tag}>{tag}</span>)}
              </div>
            </div>
          ) : null}

          {activeIdea ? (
            <article className={`${styles.ideaSheet} fr-idea-sheet`}>
              <div className={styles.sheetTape}>WORKING NOTE / {shortDate(activeIdea.updatedAt)}</div>
              <div className={styles.sheetMeta}>
                <span>DERIVED FROM</span>
                <strong>{activeIdea.sourceTitle}</strong>
              </div>

              <input
                className={styles.titleInput}
                value={activeIdea.title}
                onChange={(event) => patchIdea({ title: event.target.value })}
                aria-label="Idea title"
                placeholder="Name the direction"
              />

              <textarea
                className={styles.noteInput}
                value={activeIdea.note}
                onChange={(event) => patchIdea({ note: event.target.value })}
                aria-label="Idea working note"
                placeholder="What would you actually build, test, combine, or investigate from this signal?"
              />

              <div className={`${styles.statusRail} fr-idea-status-rail`}>
                {(Object.keys(STATUS_LABELS) as IdeaStatus[]).map((status) => (
                  <button
                    type="button"
                    key={status}
                    className={`${activeIdea.status === status ? styles.statusActive : ""}${activeIdea.status === status ? " is-active" : ""}`}
                    onClick={() => patchIdea({ status })}
                    aria-pressed={activeIdea.status === status}
                  >
                    <strong>{STATUS_LABELS[status].label}</strong>
                    <span>{STATUS_LABELS[status].note}</span>
                  </button>
                ))}
              </div>

              <div className={styles.sheetFooter}>
                <span>LOCAL AUTOSAVE · {shortDate(activeIdea.updatedAt)}</span>
                <button type="button" onClick={deleteActiveIdea}>
                  <Trash2 aria-hidden /> DISCARD
                </button>
              </div>
            </article>
          ) : selectedSource ? (
            <div className={`${styles.blankSheet} fr-idea-blank-sheet`}>
              <Lightbulb aria-hidden />
              <span>ONE SIGNAL. ONE DIRECTION.</span>
              <strong>What can this become in your hands?</strong>
              <p>Start with a rough direction. The first version is for thinking, not presentation.</p>
              <button type="button" onClick={startIdea}>
                <Plus aria-hidden /> START IDEA FROM THIS SIGNAL
              </button>
            </div>
          ) : (
            <div className={`${styles.blankSheet} fr-idea-blank-sheet`}>
              <FlaskConical aria-hidden />
              <span>WORKBENCH IDLE</span>
              <strong>Nothing is pinned yet.</strong>
              <p>The lab stays empty until you bring in a saved signal.</p>
            </div>
          )}
        </main>

        <aside className={`${styles.ideaRack} fr-idea-lab-idea-rack`}>
          <div className={styles.panelHeading}>
            <FlaskConical aria-hidden />
            <span>
              <strong>ACTIVE DIRECTIONS</strong>
              <small>{ideas.length} LOCAL NOTES</small>
            </span>
          </div>

          {ideas.length > 0 ? (
            <div className={`${styles.ideaList} fr-idea-lab-idea-list`}>
              {ideas.map((idea, index) => {
                const active = idea.id === activeIdea?.id;
                return (
                  <button
                    type="button"
                    key={idea.id}
                    className={`${active ? styles.ideaActive : ""} fr-idea-card${active ? " is-active" : ""}`}
                    onClick={() => {
                      setSelectedSourceId(idea.sourceItemId);
                      setSelectedIdeaId(idea.id);
                    }}
                    aria-pressed={active}
                  >
                    <span className={styles.ideaCardTop}>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <span>{STATUS_LABELS[idea.status].label}</span>
                    </span>
                    <strong>{idea.title || "Untitled direction"}</strong>
                    <span className={styles.ideaSource}>{idea.sourceTitle}</span>
                    <span className={styles.ideaDate}>{shortDate(idea.updatedAt)}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className={styles.ideaEmpty}>
              <span>NO DIRECTIONS YET</span>
              <p>Pick one saved signal and turn it into a working note.</p>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
