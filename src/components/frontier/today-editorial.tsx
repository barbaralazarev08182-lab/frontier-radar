"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { ArrowDown, ArrowUpRight, Heart, ThumbsDown } from "lucide-react";
import type { FeedbackMetadata } from "@/lib/personalization/browser";
import { trackFeedback } from "@/lib/personalization/browser";
import { RecommendationObserver } from "./recommendation-observer";
import styles from "./today-editorial.module.css";
import scrollStyles from "./today-scroll-effects.module.css";
import kineticStyles from "./today-kinetic-effects.module.css";

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

interface DustParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  phase: number;
  tone: string;
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

const LANE_BACKGROUND: Record<EditorialLane, string> = {
  core: "#f1eee5",
  adjacent: "#e3e7ff",
  wildcard: "#ffe0d1",
};

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function SignalDust() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    if (!canvas || !host) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const pointer = { x: -999, y: -999, active: false };
    const palette = [
      "rgba(11, 11, 11, 0.42)",
      "rgba(11, 11, 11, 0.28)",
      "rgba(49, 80, 255, 0.48)",
      "rgba(255, 75, 0, 0.4)",
    ];

    let particles: DustParticle[] = [];
    let width = 1;
    let height = 1;
    let animationFrame = 0;
    let visible = true;
    let lastScrollY = window.scrollY;
    let scrollImpulse = 0;

    const seedParticles = () => {
      const count = Math.round(Math.min(92, Math.max(42, width / 23)));
      particles = Array.from({ length: count }, (_, index) => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.16,
        vy: (Math.random() - 0.5) * 0.13,
        size: index % 11 === 0 ? 2.2 : Math.random() * 1.15 + 0.45,
        phase: Math.random() * Math.PI * 2,
        tone: palette[index % palette.length]!,
      }));
    };

    const resize = () => {
      const rect = host.getBoundingClientRect();
      width = Math.max(1, Math.round(rect.width));
      height = Math.max(1, Math.round(rect.height));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      seedParticles();
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
      pointer.active = inside;
      if (inside) {
        pointer.x = event.clientX - rect.left;
        pointer.y = event.clientY - rect.top;
      }
    };

    const onScroll = () => {
      const delta = window.scrollY - lastScrollY;
      lastScrollY = window.scrollY;
      scrollImpulse = clamp(scrollImpulse + delta * 0.07, -18, 18);
    };

    const draw = (time: number) => {
      animationFrame = window.requestAnimationFrame(draw);
      if (!visible) return;

      context.clearRect(0, 0, width, height);
      scrollImpulse *= 0.9;

      for (const particle of particles) {
        const dx = pointer.x - particle.x;
        const dy = pointer.y - particle.y;
        const distance = Math.hypot(dx, dy);

        if (pointer.active && distance > 0 && distance < 210) {
          const force = (1 - distance / 210) * 0.018;
          particle.vx += (dx / distance) * force;
          particle.vy += (dy / distance) * force;

          context.beginPath();
          context.moveTo(particle.x, particle.y);
          context.lineTo(pointer.x, pointer.y);
          context.strokeStyle = `rgba(49, 80, 255, ${0.055 * (1 - distance / 210)})`;
          context.lineWidth = 0.6;
          context.stroke();
        }

        particle.vx *= 0.986;
        particle.vy *= 0.986;
        particle.x += particle.vx + Math.sin(time * 0.00035 + particle.phase) * 0.045;
        particle.y += particle.vy - scrollImpulse * 0.026 + Math.cos(time * 0.00028 + particle.phase) * 0.035;

        if (particle.x < -8) particle.x = width + 8;
        if (particle.x > width + 8) particle.x = -8;
        if (particle.y < -8) particle.y = height + 8;
        if (particle.y > height + 8) particle.y = -8;

        context.beginPath();
        context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        context.fillStyle = particle.tone;
        context.fill();
      }
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);

    const visibilityObserver = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
    });
    visibilityObserver.observe(canvas);

    resize();
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    animationFrame = window.requestAnimationFrame(draw);

    return () => {
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("scroll", onScroll);
      window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  return <canvas ref={canvasRef} className={kineticStyles.signalDust} aria-hidden="true" />;
}

export function TodayEditorial({
  dateLabel,
  dataLabel,
  totalDiscoveries,
  personalizationLabel,
  topTags,
  signals,
}: TodayEditorialProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [feedVisible, setFeedVisible] = useState(false);
  const [choices, setChoices] = useState<Record<string, "interested" | "not_interested">>({});
  const experienceRef = useRef<HTMLDivElement | null>(null);
  const heroRef = useRef<HTMLElement | null>(null);
  const feedRef = useRef<HTMLElement | null>(null);
  const cursorRef = useRef<HTMLDivElement | null>(null);
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

  useEffect(() => {
    const feed = feedRef.current;
    if (!feed || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => setFeedVisible(Boolean(entry?.isIntersecting)),
      { rootMargin: "-12% 0px -12% 0px", threshold: 0.01 }
    );
    observer.observe(feed);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const root = experienceRef.current;
    const hero = heroRef.current;
    if (!root || !hero) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const rootRect = root.getBoundingClientRect();
      const heroRect = hero.getBoundingClientRect();
      const pageStart = window.scrollY + rootRect.top;
      const scrollable = Math.max(1, root.offsetHeight - window.innerHeight);
      const pageProgress = clamp((window.scrollY - pageStart) / scrollable);
      const heroProgress = clamp(-heroRect.top / Math.max(1, hero.offsetHeight * 0.76));

      root.style.setProperty("--page-progress", pageProgress.toFixed(4));
      root.style.setProperty("--hero-progress", heroProgress.toFixed(4));
    };

    const requestUpdate = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    return () => {
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    const root = experienceRef.current;
    const cursor = cursorRef.current;
    if (!root || !cursor || window.matchMedia("(pointer: coarse)").matches) return;

    let frame = 0;
    let cursorX = -100;
    let cursorY = -100;

    const render = () => {
      frame = 0;
      root.style.setProperty("--cursor-x", `${cursorX}px`);
      root.style.setProperty("--cursor-y", `${cursorY}px`);
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(render);
    };

    const onPointerMove = (event: PointerEvent) => {
      cursorX = event.clientX;
      cursorY = event.clientY;
      cursor.dataset.visible = "true";

      const target = event.target instanceof Element ? event.target : null;
      cursor.dataset.mode = target?.closest("[data-signal-row]")
        ? "signal"
        : target?.closest("a, button")
          ? "action"
          : "default";

      const pointerX = (event.clientX / Math.max(1, window.innerWidth) - 0.5) * 18;
      const pointerY = (event.clientY / Math.max(1, window.innerHeight) - 0.5) * 7;
      root.style.setProperty("--pointer-x", `${pointerX.toFixed(2)}px`);
      root.style.setProperty("--pointer-x-reverse", `${(-pointerX).toFixed(2)}px`);
      root.style.setProperty("--pointer-y", `${pointerY.toFixed(2)}px`);
      schedule();
    };

    const onPointerOut = (event: PointerEvent) => {
      if (!event.relatedTarget) cursor.dataset.visible = "false";
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerout", onPointerOut, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerout", onPointerOut);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  if (signals.length === 0) return null;

  const active = signals[Math.min(activeIndex, signals.length - 1)]!;
  const activeRank = String(activeIndex + 1).padStart(2, "0");
  const ticker = topTags.length > 0 ? topTags : ["AI AGENTS", "DEV TOOLS", "CREATIVE AI", "INFRA", "RESEARCH"];
  const progress = (activeIndex + 1) / signals.length;

  function choose(signal: EditorialSignal, choice: "interested" | "not_interested") {
    setChoices((current) => ({ ...current, [signal.id]: choice }));
    trackFeedback(signal.id, choice, undefined, signal.metadata);
  }

  function tiltRow(event: ReactPointerEvent<HTMLElement>) {
    if (event.pointerType === "touch") return;
    const rect = event.currentTarget.getBoundingClientRect();
    const horizontal = clamp((event.clientX - rect.left) / Math.max(1, rect.width), 0, 1) - 0.5;
    const vertical = clamp((event.clientY - rect.top) / Math.max(1, rect.height), 0, 1) - 0.5;
    const tilt = horizontal * 3.4 - vertical * 0.6;
    event.currentTarget.style.setProperty("--row-tilt", `${tilt.toFixed(2)}deg`);
  }

  function releaseRow(event: ReactPointerEvent<HTMLElement>) {
    event.currentTarget.style.setProperty("--row-tilt", "0deg");
  }

  return (
    <div ref={experienceRef} className={`${styles.experience} ${scrollStyles.experience} ${kineticStyles.kineticRoot}`}>
      <div ref={cursorRef} className={kineticStyles.cursorLens} data-visible="false" data-mode="default" aria-hidden="true">
        <span />
        <em>SCAN</em>
      </div>

      <div className={scrollStyles.pageProgress} aria-hidden="true">
        <span />
      </div>

      <div className={scrollStyles.scrollHud} data-visible={feedVisible ? "true" : "false"} aria-hidden="true">
        <span className={scrollStyles.hudLabel}>SIGNAL</span>
        <strong>{activeRank}</strong>
        <div className={scrollStyles.hudTrack}>
          <span style={{ transform: `scaleY(${progress})` }} />
        </div>
        <span className={scrollStyles.hudTotal}>{String(signals.length).padStart(2, "0")}</span>
      </div>

      <section ref={heroRef} className={`${styles.hero} ${scrollStyles.hero}`} aria-labelledby="today-editorial-title">
        <div className={`${styles.field} ${scrollStyles.field}`} aria-hidden="true" />
        <div className={`${styles.fieldCut} ${scrollStyles.fieldCut}`} aria-hidden="true" />
        <div className={styles.grain} aria-hidden="true" />
        <SignalDust />

        <div className={`${styles.heroMeta} ${scrollStyles.heroMeta}`}>
          <span>FR / DAILY EDITION</span>
          <span>{dateLabel}</span>
          <span>{dataLabel}</span>
        </div>

        <div className={`${styles.heroCopy} ${scrollStyles.heroCopy}`}>
          <p className={styles.eyebrow}>PERSONAL FRONTIER INTELLIGENCE</p>
          <h1 id="today-editorial-title" className={`${styles.heroTitle} ${scrollStyles.heroTitle} ${kineticStyles.heroTitle}`}>
            <span className={styles.titleMask}><span>FIND WHAT&apos;S NEXT</span></span>
            <span className={styles.titleMask}><span>BEFORE IT HAS</span></span>
            <span className={`${styles.titleMask} ${styles.titleAccent}`}><span>A NAME.</span></span>
          </h1>
          <div className={`${styles.heroLeadRow} ${scrollStyles.heroLeadRow}`}>
            <p className={styles.heroLead}>
              {signals.length} signals distilled from {totalDiscoveries} frontier discoveries. Not more news — only projects with enough shape, momentum and weirdness to deserve your attention.
            </p>
            <p className={styles.heroProfile}>{personalizationLabel}</p>
          </div>
        </div>

        <div className={`${styles.heroBottom} ${scrollStyles.heroBottom}`}>
          <a className={styles.scrollCue} href="#signals">
            <span>SCROLL TO THE SIGNALS</span>
            <ArrowDown className="h-4 w-4" />
          </a>
          <div className={`${styles.heroCount} ${scrollStyles.heroCount}`} aria-hidden="true">{String(signals.length).padStart(2, "0")}</div>
          <div className={styles.heroMix}>
            <span>05 CORE</span>
            <span>01 ADJACENT</span>
            <span>01 WILD</span>
          </div>
        </div>
      </section>

      <div className={`${styles.ticker} ${scrollStyles.ticker}`} aria-label="Today topic signals">
        <div className={styles.tickerTrack}>
          {[...ticker, ...ticker].map((tag, index) => (
            <span key={`${tag}-${index}`}>
              {tag}<i aria-hidden="true">✦</i>
            </span>
          ))}
        </div>
      </div>

      <section
        ref={feedRef}
        id="signals"
        className={`${styles.feed} ${scrollStyles.feed}`}
        data-active-lane={active.lane}
        style={{ backgroundColor: LANE_BACKGROUND[active.lane] }}
      >
        <div className={`${styles.feedIntro} ${scrollStyles.feedIntro}`}>
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
                data-signal-row="true"
                data-lane={signal.lane}
                data-active={activeIndex === index ? "true" : "false"}
                className={`${styles.rankRow} ${scrollStyles.rankRow} ${kineticStyles.interactiveRow}`}
                onMouseEnter={() => setActiveIndex(index)}
                onFocus={() => setActiveIndex(index)}
                onPointerMove={tiltRow}
                onPointerLeave={releaseRow}
              >
                <span className={scrollStyles.rowProgress} aria-hidden="true" />
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
                    className={`${styles.rankTitle} ${kineticStyles.rankTitle}`}
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

          <aside className={`${styles.previewRail} ${scrollStyles.previewRail} ${kineticStyles.previewRail}`} aria-live="polite">
            <div key={active.id} className={`${styles.previewVisual} ${scrollStyles.previewVisual} ${kineticStyles.previewVisual}`} data-theme={activeIndex % 7}>
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

      <section className={`${styles.outro} ${scrollStyles.outro}`}>
        <p>THE FEED IS THE FILTER.</p>
        <Link href="/explore">
          SEE THE REST <ArrowUpRight className="h-[0.9em] w-[0.9em]" />
        </Link>
      </section>
    </div>
  );
}
