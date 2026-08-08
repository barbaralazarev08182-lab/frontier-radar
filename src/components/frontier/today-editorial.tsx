"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUpRight, Heart, ThumbsDown } from "lucide-react";
import type { FeedbackMetadata } from "@/lib/personalization/browser";
import { trackFeedback } from "@/lib/personalization/browser";
import { RecommendationObserver } from "./recommendation-observer";
import styles from "./today-editorial.module.css";

export type EditorialLane = "core" | "adjacent" | "wildcard";

export interface EditorialSignal {
  id: string;
  title: string;
  summary: string;
  score: number | null;
  source: string;
  contentType: string;
  canonicalUrl: string;
  author: string | null;
  tags: string[];
  lane: EditorialLane;
  whyNow: string | null;
  whyYou: string | null;
  buildIdea: string | null;
  metricsLabel: string | null;
  crossSource: boolean;
  sourceCount: number;
  hasCode: boolean;
  hasDemo: boolean;
  metadata: FeedbackMetadata;
}

interface TodayEditorialProps {
  dateLabel: string;
  dataLabel: string;
  totalDiscoveries: number;
  personalizationLabel: string;
  topTags: string[];
  signals: EditorialSignal[];
}

const SOURCE_LABEL: Record<string, string> = {
  github: "GitHub",
  huggingface: "Hugging Face",
  hackernews: "Show HN",
  producthunt: "Product Hunt",
  arxiv: "arXiv",
};

const LANE_LABEL: Record<EditorialLane, string> = {
  core: "CORE SIGNAL",
  adjacent: "OUTSIDE YOUR BUBBLE",
  wildcard: "WILDCARD",
};

export function TodayEditorial({
  dateLabel,
  dataLabel,
  totalDiscoveries,
  personalizationLabel,
  topTags,
  signals,
}: TodayEditorialProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [choices, setChoices] = useState<Record<string, "interested" | "not_interested">>({});
  const rowRefs = useRef<Array<HTMLElement | null>>([]);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const index = Number((visible.target as HTMLElement).dataset.index);
        if (Number.isFinite(index)) setActiveIndex(index);
      },
      { rootMargin: "-28% 0px -48% 0px", threshold: [0.01, 0.25, 0.5, 0.75] }
    );

    rowRefs.current.forEach((node) => node && observer.observe(node));
    return () => observer.disconnect();
  }, [signals.length]);

  if (signals.length === 0) return null;

  const active = signals[Math.min(activeIndex, signals.length - 1)]!;
  const activeRank = String(activeIndex + 1).padStart(2, "0");
  const ticker = topTags.length > 0 ? topTags : ["AI AGENTS", "DEV TOOLS", "CREATIVE AI", "INFRA", "RESEARCH"];

  function choose(signal: EditorialSignal, choice: "interested" | "not_interested") {
    setChoices((current) => ({ ...current, [signal.id]: choice }));
    trackFeedback(signal.id, choice, undefined, signal.metadata);
  }

  return (
    <div className={styles.experience}>
      <section className={styles.hero} aria-labelledby="today-editorial-title">
        <div className={styles.field} aria-hidden="true" />
        <div className={styles.fieldCut} aria-hidden="true" />
        <div className={styles.grain} aria-hidden="true" />

        <div className={styles.heroMeta}>
          <span>FR / DAILY EDITION</span>
          <span>{dateLabel}</span>
          <span>{dataLabel}</span>
        </div>

        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>PERSONAL FRONTIER INTELLIGENCE</p>
          <h1 id="today-editorial-title" className={styles.heroTitle}>
            <span className={styles.titleMask}><span>FIND WHAT&apos;S NEXT</span></span>
            <span className={styles.titleMask}><span>BEFORE IT HAS</span></span>
            <span className={`${styles.titleMask} ${styles.titleAccent}`}><span>A NAME.</span></span>
          </h1>
          <div className={styles.heroLeadRow}>
            <p className={styles.heroLead}>
              {signals.length} signals distilled from {totalDiscoveries} frontier discoveries. Not more news — only projects with enough shape, momentum and weirdness to deserve your attention.
            </p>
            <p className={styles.heroProfile}>{personalizationLabel}</p>
          </div>
        </div>

        <div className={styles.heroBottom}>
          <a className={styles.scrollCue} href="#signals">
            <span>SCROLL TO THE SIGNALS</span>
            <ArrowDown className="h-4 w-4" />
          </a>
          <div className={styles.heroCount} aria-hidden="true">{String(signals.length).padStart(2, "0")}</div>
          <div className={styles.heroMix}>
            <span>05 CORE</span>
            <span>01 ADJACENT</span>
            <span>01 WILD</span>
          </div>
        </div>
      </section>

      <div className={styles.ticker} aria-label="Today topic signals">
        <div className={styles.tickerTrack}>
          {[...ticker, ...ticker].map((tag, index) => (
            <span key={`${tag}-${index}`}>
              {tag}<i aria-hidden="true">✦</i>
            </span>
          ))}
        </div>
      </div>

      <section id="signals" className={styles.feed}>
        <div className={styles.feedIntro}>
          <div>
            <p className={styles.sectionIndex}>01 — 07 / TODAY</p>
            <h2>SEVEN SIGNALS.<br />TEN MINUTES.</h2>
          </div>
          <p>
            Scan the titles first. Hover or keep scrolling for context. The interface stays quiet until a project earns your attention.
          </p>
        </div>

        <div className={styles.feedGrid}>
          <div className={styles.rankList}>
            {signals.map((signal, index) => (
              <article
                key={signal.id}
                ref={(node) => { rowRefs.current[index] = node; }}
                data-index={index}
                data-lane={signal.lane}
                data-active={activeIndex === index ? "true" : "false"}
                className={styles.rankRow}
                onMouseEnter={() => setActiveIndex(index)}
                onFocus={() => setActiveIndex(index)}
              >
                <RecommendationObserver itemId={signal.id} metadata={signal.metadata} />
                <span className={styles.rankNumber}>{String(index + 1).padStart(2, "0")}</span>
                <div className={styles.rankBody}>
                  <div className={styles.rankMeta}>
                    <span>{SOURCE_LABEL[signal.source] ?? signal.source}</span>
                    <span>{LANE_LABEL[signal.lane]}</span>
                    {signal.metricsLabel ? <span>{signal.metricsLabel}</span> : null}
                  </div>
                  <Link
                    href={`/project/${signal.id}`}
                    className={styles.rankTitle}
                    onClick={() => trackFeedback(signal.id, "open_detail", undefined, signal.metadata)}
                  >
                    {signal.title}
                  </Link>
                  <p className={styles.rankSummary}>{signal.summary}</p>
                </div>
                <div className={styles.rankScore}>
                  <span>{signal.score == null ? "—" : Math.round(signal.score)}</span>
                  <small>FR</small>
                </div>
                <ArrowUpRight className={styles.rankArrow} aria-hidden="true" />
              </article>
            ))}
          </div>

          <aside className={styles.previewRail} aria-live="polite">
            <div key={active.id} className={styles.previewVisual} data-theme={activeIndex % 7}>
              <div className={styles.previewNoise} aria-hidden="true" />
              <div className={styles.previewTopline}>
                <span>{activeRank}</span>
                <span>{LANE_LABEL[active.lane]}</span>
              </div>
              <div className={styles.previewTitle}>{active.title}</div>
              <div className={styles.previewScore}>
                <strong>{active.score == null ? "—" : Math.round(active.score)}</strong>
                <span>FRONTIER SCORE</span>
              </div>
            </div>

            <div className={styles.previewDetails}>
              <div className={styles.previewFacts}>
                <span>{SOURCE_LABEL[active.source] ?? active.source}</span>
                {active.crossSource ? <span>{active.sourceCount} SOURCES</span> : null}
                {active.hasCode ? <span>CODE</span> : null}
                {active.hasDemo ? <span>DEMO</span> : null}
              </div>

              {active.whyNow ? (
                <div className={styles.detailBlock}>
                  <span>WHY NOW</span>
                  <p>{active.whyNow}</p>
                </div>
              ) : null}
              {active.whyYou ? (
                <div className={styles.detailBlock}>
                  <span>WHY YOU</span>
                  <p>{active.whyYou}</p>
                </div>
              ) : null}
              {active.buildIdea ? (
                <div className={styles.detailBlock}>
                  <span>BUILD ON THIS</span>
                  <p>{active.buildIdea}</p>
                </div>
              ) : null}

              <div className={styles.previewActions}>
                <button
                  type="button"
                  data-selected={choices[active.id] === "interested" ? "true" : "false"}
                  onClick={() => choose(active, "interested")}
                >
                  <Heart className="h-3.5 w-3.5" /> Interested
                </button>
                <button
                  type="button"
                  data-selected={choices[active.id] === "not_interested" ? "true" : "false"}
                  onClick={() => choose(active, "not_interested")}
                >
                  <ThumbsDown className="h-3.5 w-3.5" /> Skip
                </button>
                <a
                  href={active.canonicalUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => trackFeedback(active.id, "open_source", undefined, active.metadata)}
                >
                  SOURCE <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className={styles.outro}>
        <p>THE FEED IS THE FILTER.</p>
        <Link href="/explore">
          SEE THE REST <ArrowUpRight className="h-[0.9em] w-[0.9em]" />
        </Link>
      </section>
    </div>
  );
}
