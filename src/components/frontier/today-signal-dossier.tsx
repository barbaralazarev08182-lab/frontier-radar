import type { EditorialSignal } from "@/components/frontier/today-editorial";
import styles from "./today-signal-dossier.module.css";

const SOURCE_LABEL: Record<string, string> = {
  github: "GITHUB",
  huggingface: "HUGGING FACE",
  hackernews: "SHOW HN",
  producthunt: "PRODUCT HUNT",
  arxiv: "ARXIV",
};

const LANE_LABEL: Record<EditorialSignal["lane"], string> = {
  core: "CORE SIGNAL",
  adjacent: "OUTSIDE YOUR BUBBLE",
  wildcard: "WILDCARD",
};

function scoreLabel(value: number | null) {
  return value == null ? "--" : String(Math.round(value));
}

function evidenceLabel(signal: EditorialSignal) {
  const source = SOURCE_LABEL[signal.source] ?? signal.source.toUpperCase();
  const confirmation = signal.crossSource
    ? `${signal.sourceCount} SOURCES CONFIRM`
    : `1 SOURCE · ${source}`;
  return signal.metricsLabel ? `${confirmation} · ${signal.metricsLabel.toUpperCase()}` : confirmation;
}

function fallback(value: string | null, replacement: string) {
  const next = value?.trim();
  return next ? next : replacement;
}

interface TodaySignalDossierProps {
  signal: EditorialSignal;
  index: number;
}

export function TodaySignalDossier({ signal, index }: TodaySignalDossierProps) {
  const source = SOURCE_LABEL[signal.source] ?? signal.source.toUpperCase();
  const side = index === 0 || index === 3 || index === 4 ? "right" : "left";
  const rank = String(index + 1).padStart(2, "0");

  return (
    <aside
      className={`${styles.dossier} ${styles[signal.lane]} ${styles[side]}`}
      data-today-signal-dossier="true"
      data-signal-id={signal.id}
      data-side={side}
      aria-live="polite"
      aria-label={`Signal dossier ${rank}: ${signal.title}`}
    >
      <div className={styles.frame} aria-hidden="true" />
      <div key={signal.id} className={styles.content}>
        <header className={styles.header}>
          <div className={styles.identity}>
            <span>FR / SIGNAL DOSSIER</span>
            <b>{rank}</b>
            <em>{LANE_LABEL[signal.lane]}</em>
          </div>
          <div className={styles.score}>
            <span>FR SCORE</span>
            <strong>{scoreLabel(signal.score)}</strong>
          </div>
        </header>

        <div className={styles.titleBlock}>
          <span>{source} · {signal.contentType.toUpperCase()}</span>
          <h2>{signal.title}</h2>
          <p>{signal.summary}</p>
        </div>

        <div className={styles.matrix}>
          <section>
            <span>WHY NOW</span>
            <p>{fallback(signal.whyNow, "No explicit timing explanation has been generated yet.")}</p>
          </section>
          <section>
            <span>WHY YOU</span>
            <p>{fallback(signal.whyYou, "No personalized explanation is available for this signal yet.")}</p>
          </section>
          <section>
            <span>EVIDENCE</span>
            <strong>{evidenceLabel(signal)}</strong>
            <div className={styles.flags}>
              <i data-on={signal.hasCode ? "true" : "false"}>CODE</i>
              <i data-on={signal.hasDemo ? "true" : "false"}>DEMO</i>
              <i data-on={signal.crossSource ? "true" : "false"}>CROSS-SOURCE</i>
            </div>
          </section>
          <section>
            <span>BUILD</span>
            <p>{fallback(signal.buildIdea, "No build direction has been attached to this signal yet.")}</p>
          </section>
        </div>

        <footer className={styles.footer}>
          <span>MOVE ACROSS TODAY&apos;S 7 TO INSPECT</span>
          <span>CLICK SIGNAL → PROJECT INTELLIGENCE</span>
        </footer>
      </div>
    </aside>
  );
}
