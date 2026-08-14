"use client";

import { useEffect, useMemo, useState } from "react";
import { getVisitorId } from "@/lib/personalization/browser";
import type {
  PersonalRadarDimension,
  PersonalRadarProfile,
  PersonalRadarStatus,
} from "@/lib/personalization/personal-radar";
import { PersonalRadarMorph } from "./personal-radar-morph";
import styles from "./personal-radar.module.css";
import polish from "./personal-radar-polish.module.css";

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

async function fetchPersonalRadarProfile(): Promise<PersonalRadarProfile> {
  const visitorId = getVisitorId();
  const response = await fetch("/api/personal-radar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ visitorId }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("personal_radar_read_failed");
  return (await response.json()) as PersonalRadarProfile;
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
        <p>These are product defaults, not learned preferences. They lose authority as real evidence arrives.</p>
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

export function PersonalRadarClient({
  initialProfile,
  previewDemo = false,
}: {
  initialProfile?: PersonalRadarProfile;
  previewDemo?: boolean;
}) {
  const [profile, setProfile] = useState<PersonalRadarProfile | null>(initialProfile ?? null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(!initialProfile);

  useEffect(() => {
    if (initialProfile) return;
    let active = true;

    void fetchPersonalRadarProfile()
      .then((nextProfile) => {
        if (!active) return;
        setProfile(nextProfile);
        setError(false);
      })
      .catch(() => {
        if (!active) return;
        setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [initialProfile]);

  async function retry() {
    setLoading(true);
    setError(false);
    try {
      setProfile(await fetchPersonalRadarProfile());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

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
        <button type="button" onClick={() => void retry()}>RETRY</button>
      </section>
    );
  }

  const state = STATUS_COPY[profile.status];

  return (
    <article className={`${styles.radar} ${polish.radar}`} data-radar-state={profile.status}>
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <div className={styles.kicker}>
            <span>06 PERSONAL RADAR · INTEREST FRONTIER</span>
            <span>{previewDemo ? `${state.label} · PREVIEW QA / SYNTHETIC` : state.label}</span>
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
        <div><span>PROFILE MODE</span><strong>{previewDemo ? "SYNTHETIC QA" : state.label}</strong></div>
      </section>

      {profile.status === "cold_start" ? (
        <PriorField profile={profile} />
      ) : (
        <section className={`${styles.morphSection} ${polish.morphSection}`}>
          <PersonalRadarMorph dimensions={learned} />
        </section>
      )}

      <footer className={`${styles.footer} ${polish.footer}`}>
        <span>{previewDemo ? "SYNTHETIC PREVIEW PROFILE · VISUAL QA ONLY" : "INTERPRETABLE PROFILE · NOT A SEMANTIC EMBEDDING MAP"}</span>
        <span>STRENGTH · EVIDENCE · FRESHNESS SHARE ONE IDENTITY FIELD · NO LONG-TERM HISTORY CLAIM</span>
      </footer>
    </article>
  );
}
