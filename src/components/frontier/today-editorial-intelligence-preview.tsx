"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { EditorialLane, EditorialSignal } from "@/components/frontier/today-editorial";
import { trackFeedback } from "@/lib/personalization/browser";
import { observeQualifiedDwell } from "@/lib/personalization/qualified-dwell";
import styles from "./today-editorial-intelligence-preview.module.css";

interface TodayEditorialIntelligencePreviewProps {
  dateLabel: string;
  dataLabel: string;
  totalDiscoveries: number;
  signals: EditorialSignal[];
}

const SOURCE_LABEL: Record<string, string> = {
  github: "GITHUB",
  huggingface: "HUGGING FACE",
  hackernews: "SHOW HN",
  producthunt: "PRODUCT HUNT",
  arxiv: "ARXIV",
};

const LANE_LABEL: Record<EditorialLane, string> = {
  core: "CORE",
  adjacent: "ADJACENT",
  wildcard: "WILDCARD",
};

const LANE_ORDER: Record<EditorialLane, number> = {
  core: 0,
  adjacent: 1,
  wildcard: 2,
};

function sourceLabel(source: string) {
  return SOURCE_LABEL[source] ?? source.toUpperCase();
}

function scoreLabel(score: number | null) {
  return score == null ? "--" : String(Math.round(score));
}

function averageScore(signals: EditorialSignal[]) {
  const scores = signals.map((signal) => signal.score).filter((value): value is number => typeof value === "number");
  if (scores.length === 0) return "--";
  return String(Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length));
}

function projectPath(signal: EditorialSignal) {
  return `/project/${encodeURIComponent(signal.id)}`;
}

function shortTitle(title: string) {
  return title.length > 78 ? `${title.slice(0, 75).trimEnd()}…` : title;
}

export function TodayEditorialIntelligencePreview({
  dateLabel,
  dataLabel,
  totalDiscoveries,
  signals,
}: TodayEditorialIntelligencePreviewProps) {
  const router = useRouter();
  const activeRef = useRef<HTMLElement | null>(null);
  const visibleSignals = useMemo(
    () => signals.slice(0, 7).sort((a, b) => LANE_ORDER[a.lane] - LANE_ORDER[b.lane]),
    [signals],
  );
  const [selectedIndex, setSelectedIndex] = useState(() => Math.min(2, Math.max(0, visibleSignals.length - 1)));
  const selectedSignal = visibleSignals[selectedIndex] ?? visibleSignals[0];

  useEffect(() => {
    if (!selectedSignal) return;
    router.prefetch(projectPath(selectedSignal));
  }, [router, selectedSignal]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (visibleSignals.length === 0) return;
      const key = event.key.toLowerCase();
      if (key === "j" || event.key === "ArrowDown" || event.key === "ArrowRight") {
        event.preventDefault();
        setSelectedIndex((current) => Math.min(visibleSignals.length - 1, current + 1));
      }
      if (key === "k" || event.key === "ArrowUp" || event.key === "ArrowLeft") {
        event.preventDefault();
        setSelectedIndex((current) => Math.max(0, current - 1));
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [visibleSignals.length]);

  useEffect(() => {
    const element = activeRef.current;
    if (!element || !selectedSignal) return;
    return observeQualifiedDwell(element, selectedSignal.id, {
      ...selectedSignal.metadata,
      rank: selectedIndex + 1,
    });
  }, [selectedIndex, selectedSignal]);

  if (!selectedSignal) return null;
  const activeSignal = selectedSignal;

  const rank = String(selectedIndex + 1).padStart(2, "0");
  const lane = LANE_LABEL[activeSignal.lane];
  const tags = activeSignal.tags.slice(0, 4);

  function openProject() {
    trackFeedback(activeSignal.id, "open_detail", undefined, {
      ...activeSignal.metadata,
      rank: selectedIndex + 1,
    });
    router.push(projectPath(activeSignal));
  }

  function trackSource() {
    trackFeedback(activeSignal.id, "open_source", undefined, {
      ...activeSignal.metadata,
      rank: selectedIndex + 1,
    });
  }

  return (
    <div className={styles.viewport} data-lane={activeSignal.lane}>
      <div className={styles.paperGrid} aria-hidden="true" />
      <header className={styles.commandBar}>
        <div className={styles.commandLead}>
          <span className={styles.liveDot} />
          <strong>FRONTIER RADAR / TODAY FIELD REPORT</strong>
          <span>{dateLabel}</span>
        </div>
        <div className={styles.commandStats}>
          <span>{dataLabel}</span>
          <span>{String(visibleSignals.length).padStart(2, "0")} SIGNALS</span>
          <span>{totalDiscoveries} SCANNED</span>
          <span>AVG {averageScore(visibleSignals)}</span>
          <span className={styles.keys}>J / K TO MOVE</span>
        </div>
      </header>

      <div className={styles.mainGrid}>
        <aside className={styles.manifesto}>
          <div>
            <span className={styles.eyebrow}>DAILY INTELLIGENCE / 01</span>
            <h1>
              FIND WHAT&apos;S <em>NEXT</em><br />
              BEFORE IT HAS<br />
              A NAME.
            </h1>
            <p>Seven signals. One edited field of things worth noticing before they become obvious.</p>
          </div>

          <div className={styles.manifestoFooter}>
            <div><span>FIELD</span><strong>07 / DAILY</strong></div>
            <div><span>MODE</span><strong>EDITORIAL</strong></div>
            <div><span>FOCUS</span><strong>{lane}</strong></div>
          </div>
        </aside>

        <main className={styles.activeStage}>
          <section className={styles.activeCard} ref={activeRef}>
            <div className={styles.activeMeta}>
              <div>
                <span className={styles.rank}>{rank}</span>
                <span className={styles.lane}>{lane}</span>
                <span>{sourceLabel(activeSignal.source)}</span>
                <span>{activeSignal.contentType.toUpperCase()}</span>
              </div>
              <div className={styles.scoreBlock}>
                <span>DISCOVERY SCORE</span>
                <strong>{scoreLabel(activeSignal.score)}</strong>
              </div>
            </div>

            <div className={styles.titleBlock}>
              <span className={styles.sectionLabel}>ACTIVE SIGNAL</span>
              <h2>{activeSignal.title}</h2>
              <p>{activeSignal.summary}</p>
            </div>

            <div className={styles.intelligenceGrid}>
              <article>
                <span className={styles.sectionLabel}>THE SIGNAL</span>
                <p>{activeSignal.summary}</p>
              </article>
              <article className={styles.whyNow}>
                <span className={styles.sectionLabel}>WHY NOW / {rank}</span>
                <p>{activeSignal.whyNow ?? "This signal is fresh, relevant to the current field, and still early enough to be useful before it becomes obvious."}</p>
              </article>
            </div>

            <div className={styles.actionRow}>
              <button type="button" className={styles.primaryAction} onClick={openProject}>
                OPEN INTELLIGENCE <span>↗</span>
              </button>
              <a
                className={styles.secondaryAction}
                href={activeSignal.canonicalUrl}
                target="_blank"
                rel="noreferrer"
                onClick={trackSource}
              >
                SOURCE ↗
              </a>
              <div className={styles.actionEvidence}>
                <span>{activeSignal.hasCode ? "CODE" : "NO CODE"}</span>
                <span>{activeSignal.hasDemo ? "DEMO" : "NO DEMO"}</span>
                <span>{activeSignal.sourceCount} SOURCE{activeSignal.sourceCount === 1 ? "" : "S"}</span>
              </div>
            </div>
          </section>
        </main>

        <aside className={styles.contextRail}>
          <div className={styles.railHeader}>
            <span>CONTEXT RAIL</span>
            <strong>{rank} / {String(visibleSignals.length).padStart(2, "0")}</strong>
          </div>

          <section className={styles.railSection}>
            <span className={styles.sectionLabel}>WHY YOU</span>
            <p>{activeSignal.whyYou ?? "This signal sits close to the themes you have been exploring, with enough practical surface area to be worth opening."}</p>
          </section>

          <section className={styles.railSection}>
            <span className={styles.sectionLabel}>BUILD DIRECTION</span>
            <p className={styles.buildDirection}>{activeSignal.buildIdea ?? "Study the interaction pattern, identify the smallest reusable primitive, and test whether it can become a sharper tool or workflow."}</p>
          </section>

          <section className={styles.railSection}>
            <span className={styles.sectionLabel}>SIGNAL PROFILE</span>
            <div className={styles.profileRows}>
              <div><span>LANE</span><strong>{lane}</strong></div>
              <div><span>SOURCE</span><strong>{sourceLabel(activeSignal.source)}</strong></div>
              <div><span>AUTHOR</span><strong>{activeSignal.author ?? "—"}</strong></div>
              <div><span>METRIC</span><strong>{activeSignal.metricsLabel?.toUpperCase() ?? "—"}</strong></div>
            </div>
            {tags.length > 0 ? (
              <div className={styles.tags}>
                {tags.map((tag) => <span key={tag}>{tag}</span>)}
              </div>
            ) : null}
          </section>
        </aside>
      </div>

      <nav className={styles.queue} aria-label="Today signal queue">
        <div className={styles.queueLabel}>
          <span>SIGNAL QUEUE</span>
          <strong>01—{String(visibleSignals.length).padStart(2, "0")}</strong>
        </div>
        <div className={styles.queueItems}>
          {visibleSignals.map((signal, index) => {
            const queueRank = String(index + 1).padStart(2, "0");
            const active = index === selectedIndex;
            return (
              <button
                type="button"
                key={signal.id}
                className={styles.queueItem}
                data-active={active ? "true" : "false"}
                data-lane={signal.lane}
                onMouseEnter={() => router.prefetch(projectPath(signal))}
                onFocus={() => router.prefetch(projectPath(signal))}
                onClick={() => setSelectedIndex(index)}
                aria-current={active ? "true" : undefined}
              >
                <div className={styles.queueTop}>
                  <span>{queueRank}</span>
                  <span>{LANE_LABEL[signal.lane]}</span>
                  <strong>{scoreLabel(signal.score)}</strong>
                </div>
                <p>{shortTitle(signal.title)}</p>
                <div className={styles.queueBottom}>
                  <span>{sourceLabel(signal.source)}</span>
                  <span>{active ? "VIEWING" : "OPEN"} →</span>
                </div>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
