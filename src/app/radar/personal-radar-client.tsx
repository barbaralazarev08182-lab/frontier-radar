"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getVisitorId } from "@/lib/personalization/browser";
import type {
  PersonalRadarDimension,
  PersonalRadarProfile,
  PersonalRadarStatus,
} from "@/lib/personalization/personal-radar";
import styles from "./personal-radar.module.css";

const STATUS_COPY: Record<
  PersonalRadarStatus,
  { label: string; title: string; note: string }
> = {
  cold_start: {
    label: "STARTING PROFILE",
    title: "NO LEARNED FRONTIER YET.",
    note: "The system has a cold-start prior, but it does not yet have behavioral evidence from this browser.",
  },
  forming: {
    label: "RADAR FORMING",
    title: "YOUR INTEREST FRONTIER IS FORMING.",
    note: "Evidence exists, but the profile is still young. Read strength together with evidence and confidence.",
  },
  evidence_qualified: {
    label: "EVIDENCE-QUALIFIED",
    title: "YOUR CURRENT INTEREST FRONTIER.",
    note: "Enough independent evidence exists to compare learned interests without pretending this is a long-term personality model.",
  },
};

function percentage(value: number): string {
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
}

function signal(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return `${rounded > 0 ? "+" : ""}${rounded.toFixed(1)}`;
}

function timeAgo(value: string | null): string {
  if (!value) return "NO EVIDENCE";
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return "UNKNOWN";
  const delta = Math.max(0, Date.now() - timestamp);
  const minutes = Math.floor(delta / 60_000);
  if (minutes < 1) return "JUST NOW";
  if (minutes < 60) return `${minutes}M AGO`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}H AGO`;
  const days = Math.floor(hours / 24);
  return `${days}D AGO`;
}

function evidenceDimensions(profile: PersonalRadarProfile): PersonalRadarDimension[] {
  return [...profile.dimensions]
    .filter((dimension) => dimension.evidenceCount > 0)
    .sort(
      (a, b) =>
        b.behaviorSignal - a.behaviorSignal ||
        b.evidenceCount - a.evidenceCount ||
        b.confidence - a.confidence
    );
}

function PriorField({ profile }: { profile: PersonalRadarProfile }) {
  const prior = [...profile.dimensions]
    .sort((a, b) => b.priorWeight - a.priorWeight)
    .slice(0, 8);

  return (
    <div className={styles.priorField}>
      <div className={styles.sectionHead}>
        <div>
          <span>STARTING PRIOR</span>
          <h2>WHAT THE SYSTEM STARTS WITH</h2>
        </div>
        <p>These are product defaults, not learned preferences. They disappear in authority as real evidence arrives.</p>
      </div>
      <div className={styles.priorRows}>
        {prior.map((dimension, index) => (
          <div className={styles.priorRow} key={dimension.key}>
            <span className={styles.rowIndex}>{String(index + 1).padStart(2, "0")}</span>
            <strong>{dimension.label}</strong>
            <span className={styles.priorRule} aria-hidden />
            <b>{dimension.priorWeight.toFixed(2)}</b>
          </div>
        ))}
      </div>
      <div className={styles.chartSource}>COLD-START PRIOR · NOT LEARNED BEHAVIOR</div>
    </div>
  );
}

function TickRows({ dimensions }: { dimensions: PersonalRadarDimension[] }) {
  const rows = dimensions.slice(0, 8);
  const maxEvidence = Math.max(1, ...rows.map((row) => row.evidenceCount));
  const x0 = 260;
  const x1 = 790;
  const span = x1 - x0;
  const px = span / maxEvidence;

  return (
    <svg
      className={styles.tickChart}
      viewBox="0 0 960 430"
      role="img"
      aria-label="Current interest evidence. One tick equals one contributing feedback event."
    >
      {rows.map((row, index) => {
        const y = 48 + index * 48;
        return (
          <g key={row.key} className={styles.tickRow}>
            <text className={styles.tickLabel} x="236" y={y + 4} textAnchor="end">
              {row.label}
            </text>
            <line className={styles.tickFloor} x1={x0} x2={x1} y1={y + 10} y2={y + 10} />
            {Array.from({ length: row.evidenceCount }, (_, tick) => {
              const x = x0 + tick * px + Math.min(px / 2, 5);
              const height = 10 + ((tick * 7 + index * 3) % 6);
              return (
                <g key={tick}>
                  <line
                    className={`${styles.evidenceTick}${index === 0 ? ` ${styles.heroTick}` : ""}`}
                    x1={x}
                    x2={x}
                    y1={y + 10}
                    y2={y + 10 - height}
                    style={{ animationDelay: `${index * 65 + tick * 11}ms` }}
                  />
                  {(tick + 1) % 5 === 0 ? (
                    <circle className={styles.fifthDot} cx={x} cy={y + 15} r="1.2" />
                  ) : null}
                </g>
              );
            })}
            <text className={styles.tickValue} x="812" y={y + 3}>
              E {row.evidenceCount}
            </text>
            <text className={styles.tickMeta} x="864" y={y + 3}>
              S {signal(row.behaviorSignal)} · C {percentage(row.confidence)}
            </text>
            <title>{`${row.label}: ${row.evidenceCount} contributing events · signal ${signal(row.behaviorSignal)} · confidence ${percentage(row.confidence)}`}</title>
          </g>
        );
      })}
      <text className={styles.chartNote} x="480" y="420" textAnchor="middle">
        ONE TICK = ONE CONTRIBUTING EVENT · DOT MARKS EVERY FIFTH · ORDER = CURRENT BEHAVIOR SIGNAL
      </text>
    </svg>
  );
}

function EvidenceScatter({ dimensions }: { dimensions: PersonalRadarDimension[] }) {
  const points = dimensions.slice(0, 20);
  if (points.length < 3) return null;

  const minSignal = Math.min(0, ...points.map((point) => point.behaviorSignal));
  const maxSignal = Math.max(0.001, ...points.map((point) => point.behaviorSignal));
  const x0 = 84;
  const x1 = 888;
  const floor = 330;
  const top = 58;
  const mapX = (value: number) =>
    x0 + ((value - minSignal) / Math.max(0.001, maxSignal - minSignal)) * (x1 - x0);
  const mapY = (confidence: number) => floor - confidence * (floor - top);
  const hero = points.reduce((best, point) =>
    point.behaviorSignal > best.behaviorSignal ? point : best
  );

  return (
    <svg
      className={styles.scatterChart}
      viewBox="0 0 960 390"
      role="img"
      aria-label="Interest dimensions plotted by behavior signal and confidence."
    >
      <line className={styles.scatterFloor} x1={x0} x2={x1} y1={floor} y2={floor} />
      {Array.from({ length: 21 }, (_, index) => {
        const x = x0 + (index / 20) * (x1 - x0);
        const tall = index % 5 === 0;
        return (
          <line
            key={index}
            className={styles.scatterRuler}
            x1={x}
            x2={x}
            y1={floor}
            y2={floor - (tall ? 9 : 5)}
          />
        );
      })}
      {points.map((point, index) => {
        const x = mapX(point.behaviorSignal);
        const y = mapY(point.confidence);
        const isHero = point.key === hero.key;
        return (
          <g key={point.key}>
            <line
              className={styles.plumbLine}
              x1={x}
              x2={x}
              y1={floor}
              y2={y}
              style={{ animationDelay: `${index * 45}ms` }}
            />
            <circle
              className={`${styles.scatterDot}${isHero ? ` ${styles.heroDot}` : ""}`}
              cx={x}
              cy={y}
              r={isHero ? 6 : 3.5}
              style={{ animationDelay: `${100 + index * 45}ms` }}
            >
              <title>{`${point.label}: signal ${signal(point.behaviorSignal)} · confidence ${percentage(point.confidence)} · evidence ${point.evidenceCount}`}</title>
            </circle>
            {isHero ? (
              <text className={styles.scatterHeroLabel} x={x} y={Math.max(28, y - 14)} textAnchor="middle">
                {point.label}
              </text>
            ) : null}
          </g>
        );
      })}
      <text className={styles.axisLabel} x={x1} y={floor + 27} textAnchor="end">
        BEHAVIOR SIGNAL →
      </text>
      <text className={styles.axisLabel} x="30" y="72" transform="rotate(-90 30 72)" textAnchor="end">
        CONFIDENCE ↑
      </text>
      <text className={styles.chartNote} x="480" y="382" textAnchor="middle">
        DOT = INTEREST DIMENSION · X = SIGNED LIVE SIGNAL · Y = EVIDENCE CONFIDENCE · DISTANCE ≠ SEMANTIC SIMILARITY
      </text>
    </svg>
  );
}

export function PersonalRadarClient() {
  const [profile, setProfile] = useState<PersonalRadarProfile | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const visitorId = getVisitorId();
      const response = await fetch("/api/personal-radar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorId }),
        cache: "no-store",
      });
      if (!response.ok) throw new Error("personal_radar_read_failed");
      setProfile((await response.json()) as PersonalRadarProfile);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const learned = useMemo(() => (profile ? evidenceDimensions(profile) : []), [profile]);

  if (loading) {
    return (
      <section className={styles.loading} aria-live="polite">
        <span>06 PERSONAL RADAR · INTEREST FRONTIER</span>
        <strong>READING YOUR LOCAL EVIDENCE…</strong>
      </section>
    );
  }

  if (error || !profile) {
    return (
      <section className={styles.loading}>
        <span>06 PERSONAL RADAR · INTEREST FRONTIER</span>
        <strong>THE RADAR COULD NOT READ THIS PROFILE.</strong>
        <button type="button" onClick={() => void load()}>RETRY</button>
      </section>
    );
  }

  const state = STATUS_COPY[profile.status];

  return (
    <article className={styles.radar} data-radar-state={profile.status}>
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <div className={styles.kicker}>
            <span>06 PERSONAL RADAR · INTEREST FRONTIER</span>
            <span>{state.label}</span>
          </div>
          <h1>{state.title}</h1>
          <p>{state.note}</p>
        </div>
        <div className={styles.confidenceReadout}>
          <span>PROFILE CONFIDENCE</span>
          <strong>{percentage(profile.globalConfidence)}</strong>
          <i aria-hidden style={{ "--radar-confidence": profile.globalConfidence } as React.CSSProperties} />
          <small>{profile.eventCount} EVENTS · {profile.distinctItemCount} ITEMS · {profile.evidenceDimensionCount} DIMENSIONS</small>
        </div>
      </header>

      <section className={styles.instrumentStrip} aria-label="Personal Radar model status">
        <div><span>MODEL</span><strong>{profile.modelVersion.toUpperCase()}</strong></div>
        <div><span>LAST SIGNAL</span><strong>{timeAgo(profile.lastEventAt)}</strong></div>
        <div><span>EVIDENCE</span><strong>{profile.eventCount}</strong></div>
        <div><span>PROFILE MODE</span><strong>{state.label}</strong></div>
      </section>

      {profile.status === "cold_start" ? (
        <PriorField profile={profile} />
      ) : (
        <>
          <section className={styles.chartSection}>
            <div className={styles.sectionHead}>
              <div>
                <span>F5 · CURRENT INTEREST EVIDENCE</span>
                <h2>WHAT HAS ACTUALLY PULLED YOUR ATTENTION</h2>
              </div>
              <p>Rows are ordered by the live signed behavior signal. The marks themselves stay countable: one tick is one contributing event.</p>
            </div>
            <TickRows dimensions={learned} />
            <div className={styles.chartSource}>TICK ROWS · LIEFLAT BASICS F5 · LIVE USER EVENTS</div>
          </section>

          {profile.status === "evidence_qualified" ? (
            <section className={styles.chartSection}>
              <div className={styles.sectionHead}>
                <div>
                  <span>F8 · STRENGTH × CONFIDENCE</span>
                  <h2>STRONG IS NOT THE SAME AS CERTAIN</h2>
                </div>
                <p>The same learned interests are re-read against evidence confidence. Position is measurement, not semantic proximity.</p>
              </div>
              <EvidenceScatter dimensions={learned} />
              <div className={styles.chartSource}>PLUMB SCATTER · LIEFLAT BASICS F8 · NO SEMANTIC COORDINATES</div>
            </section>
          ) : null}
        </>
      )}

      <section className={styles.ledger}>
        <div className={styles.sectionHead}>
          <div>
            <span>MODEL TRUTH</span>
            <h2>WHY THE RADAR THINKS THIS</h2>
          </div>
          <p>The profile is rebuilt from this browser&apos;s feedback evidence. Cold-start prior and learned evidence are kept separate.</p>
        </div>
        <div className={styles.ledgerGrid}>
          {(learned.length > 0 ? learned.slice(0, 8) : profile.dimensions.slice(0, 8)).map((dimension) => (
            <div className={styles.ledgerRow} key={dimension.key}>
              <strong>{dimension.label}</strong>
              <span>EVIDENCE {dimension.evidenceCount}</span>
              <span>SIGNAL {signal(dimension.behaviorSignal)}</span>
              <span>CONF {percentage(dimension.confidence)}</span>
              <span>{dimension.lastEvidenceAt ? timeAgo(dimension.lastEvidenceAt) : `PRIOR ${dimension.priorWeight.toFixed(2)}`}</span>
            </div>
          ))}
        </div>
      </section>

      <footer className={styles.footer}>
        <span>INTERPRETABLE PROFILE · NOT A SEMANTIC EMBEDDING MAP</span>
        <span>BEHAVIOR SIGNAL ≠ GLOBAL DISCOVERY SCORE · NO LONG-TERM HISTORY CLAIM</span>
      </footer>
    </article>
  );
}
