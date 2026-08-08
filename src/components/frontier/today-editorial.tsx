"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { ArrowDown, ArrowUpRight, Heart, ThumbsDown } from "lucide-react";
import type { FeedbackMetadata } from "@/lib/personalization/browser";
import { trackFeedback } from "@/lib/personalization/browser";
import { RecommendationObserver } from "./recommendation-observer";
import styles from "./today-editorial.module.css";
import scrollStyles from "./today-scroll-effects.module.css";
import kineticStyles from "./today-kinetic-effects.module.css";
import boardStyles from "./today-signal-board.module.css";

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

const TILE_CLASSES = [
  boardStyles.tile01,
  boardStyles.tile02,
  boardStyles.tile03,
  boardStyles.tile04,
  boardStyles.tile05,
  boardStyles.tile06,
  boardStyles.tile07,
];

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
      const count = Math.round(Math.min(110, Math.max(54, width / 18)));
      particles = Array.from({ length: count }, (_, index) => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.19,
        vy: (Math.random() - 0.5) * 0.16,
        size: index % 13 === 0 ? 2.35 : Math.random() * 1.2 + 0.5,
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
      const inside =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;
      pointer.active = inside;
      if (inside) {
        pointer.x = event.clientX - rect.left;
        pointer.y = event.clientY - rect.top;
      }
    };

    const onScroll = () => {
      const delta = window.scrollY - lastScrollY;
      lastScrollY = window.scrollY;
      scrollImpulse = clamp(scrollImpulse + delta * 0.08, -22, 22);
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

        if (pointer.active && distance > 0 && distance < 240) {
          const force = (1 - distance / 240) * 0.024;
          particle.vx += (dx / distance) * force;
          particle.vy += (dy / distance) * force;

          context.beginPath();
          context.moveTo(particle.x, particle.y);
          context.lineTo(pointer.x, pointer.y);
          context.strokeStyle = `rgba(49, 80, 255, ${0.08 * (1 - distance / 240)})`;
          context.lineWidth = 0.65;
          context.stroke();
        }

        particle.vx *= 0.985;
        particle.vy *= 0.985;
        particle.x += particle.vx + Math.sin(time * 0.00036 + particle.phase) * 0.055;
        particle.y += particle.vy - scrollImpulse * 0.03 + Math.cos(time * 0.0003 + particle.phase) * 0.04;

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
  const [choices, setChoices] = useState<Record<string, "interested" | "not_interested">>({});
  const experienceRef = useRef<HTMLDivElement | null>(null);
  const heroRef = useRef<HTMLElement | null>(null);
  const boardRef = useRef<HTMLElement | null>(null);
  const cursorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = experienceRef.current;
    const hero = heroRef.current;
    const board = boardRef.current;
    if (!root || !hero || !board) return;

    let frame = 0;
    let lastY = window.scrollY;

    const update = () => {
      frame = 0;
      const rootRect = root.getBoundingClientRect();
      const heroRect = hero.getBoundingClientRect();
      const boardRect = board.getBoundingClientRect();
      const scrollY = window.scrollY;
      const delta = scrollY - lastY;
      lastY = scrollY;

      const pageStart = scrollY + rootRect.top;
      const scrollable = Math.max(1, root.offsetHeight - window.innerHeight);
      const pageProgress = clamp((scrollY - pageStart) / scrollable);
      const heroProgress = clamp(-heroRect.top / Math.max(1, hero.offsetHeight * 0.8));
      const boardEntrance = clamp(
        (window.innerHeight - boardRect.top) / Math.max(1, window.innerHeight * 0.86)
      );
      const boardTravel = Math.max(1, board.offsetHeight - window.innerHeight);
      const boardProgress = clamp(-boardRect.top / boardTravel);
      const velocity = clamp(delta / 70, -1, 1);

      root.style.setProperty("--page-progress", pageProgress.toFixed(4));

      root.style.setProperty("--hero-x-1", `${(-heroProgress * 82 - velocity * 5).toFixed(2)}vw`);
      root.style.setProperty("--hero-x-2", `${(heroProgress * 88 + velocity * 6).toFixed(2)}vw`);
      root.style.setProperty("--hero-x-3", `${(-heroProgress * 68 - velocity * 4).toFixed(2)}vw`);
      root.style.setProperty("--hero-y-1", `${(-heroProgress * 3.5).toFixed(2)}vh`);
      root.style.setProperty("--hero-y-2", `${(heroProgress * 2.5).toFixed(2)}vh`);
      root.style.setProperty("--hero-y-3", `${(-heroProgress * 1.5).toFixed(2)}vh`);
      root.style.setProperty("--hero-r-1", `${(-heroProgress * 2.2).toFixed(2)}deg`);
      root.style.setProperty("--hero-r-2", `${(heroProgress * 2.6).toFixed(2)}deg`);
      root.style.setProperty("--hero-r-3", `${(-heroProgress * 3.1).toFixed(2)}deg`);
      root.style.setProperty("--hero-s-1", `${(1 + heroProgress * 0.08).toFixed(3)}`);
      root.style.setProperty("--hero-s-2", `${(1 - heroProgress * 0.06).toFixed(3)}`);
      root.style.setProperty("--hero-s-3", `${(1 + heroProgress * 0.12).toFixed(3)}`);
      root.style.setProperty("--hero-ls-1", `${(-0.075 + heroProgress * 0.055).toFixed(4)}em`);
      root.style.setProperty("--hero-ls-2", `${(-0.075 + heroProgress * 0.08).toFixed(4)}em`);
      root.style.setProperty("--hero-ls-3", `${(-0.075 + heroProgress * 0.11).toFixed(4)}em`);

      root.style.setProperty("--board-scale", `${(0.84 + boardEntrance * 0.16).toFixed(3)}`);
      root.style.setProperty("--board-y", `${((1 - boardEntrance) * 14).toFixed(2)}vh`);
      root.style.setProperty("--board-rotation", `${((1 - boardEntrance) * 3.5).toFixed(2)}deg`);
      root.style.setProperty("--board-opacity", `${(0.18 + boardEntrance * 0.82).toFixed(3)}`);

      const spread = boardProgress * 2.4;
      root.style.setProperty("--board-shift-pos", `${spread.toFixed(2)}vw`);
      root.style.setProperty("--board-shift-neg", `${(-spread).toFixed(2)}vw`);
      root.style.setProperty("--board-shift-up", `${(-boardProgress * 1.6).toFixed(2)}vh`);
      root.style.setProperty("--board-shift-down", `${(boardProgress * 1.4).toFixed(2)}vh`);
      root.style.setProperty(
        "--board-marquee-a",
        `${(-boardProgress * 24 - velocity * 7).toFixed(2)}vw`
      );
      root.style.setProperty(
        "--board-marquee-b",
        `${(boardProgress * 20 + velocity * 7).toFixed(2)}vw`
      );
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
      cursor.dataset.mode = target?.closest("[data-signal-tile]")
        ? "signal"
        : target?.closest("a, button")
          ? "action"
          : "default";

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

  const visibleSignals = signals.slice(0, 7);
  const active = visibleSignals[Math.min(activeIndex, visibleSignals.length - 1)]!;
  const activeRank = String(activeIndex + 1).padStart(2, "0");
  const ticker =
    topTags.length > 0
      ? topTags
      : ["AI AGENTS", "DEV TOOLS", "CREATIVE AI", "INFRA", "RESEARCH"];

  function choose(signal: EditorialSignal, choice: "interested" | "not_interested") {
    setChoices((current) => ({ ...current, [signal.id]: choice }));
    trackFeedback(signal.id, choice, undefined, signal.metadata);
  }

  function tiltTile(event: ReactPointerEvent<HTMLElement>) {
    if (event.pointerType === "touch") return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = clamp((event.clientX - rect.left) / Math.max(1, rect.width), 0, 1) - 0.5;
    const y = clamp((event.clientY - rect.top) / Math.max(1, rect.height), 0, 1) - 0.5;
    event.currentTarget.style.setProperty("--tile-ry", `${(x * 7.5).toFixed(2)}deg`);
    event.currentTarget.style.setProperty("--tile-rx", `${(-y * 5.4).toFixed(2)}deg`);
    event.currentTarget.style.setProperty("--tile-cx", `${((x + 0.5) * 100).toFixed(1)}%`);
    event.currentTarget.style.setProperty("--tile-cy", `${((y + 0.5) * 100).toFixed(1)}%`);
  }

  function releaseTile(event: ReactPointerEvent<HTMLElement>) {
    event.currentTarget.style.setProperty("--tile-ry", "0deg");
    event.currentTarget.style.setProperty("--tile-rx", "0deg");
  }

  return (
    <div
      ref={experienceRef}
      className={`${styles.experience} ${scrollStyles.experience} ${kineticStyles.kineticRoot}`}
    >
      <div
        ref={cursorRef}
        className={kineticStyles.cursorLens}
        data-visible="false"
        data-mode="default"
        aria-hidden="true"
      >
        <span />
        <em>SCAN</em>
      </div>

      <div className={scrollStyles.pageProgress} aria-hidden="true">
        <span />
      </div>

      <section
        ref={heroRef}
        className={`${styles.hero} ${scrollStyles.hero}`}
        aria-labelledby="today-editorial-title"
      >
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
          <h1
            id="today-editorial-title"
            className={`${styles.heroTitle} ${scrollStyles.heroTitle} ${kineticStyles.heroTitle}`}
          >
            <span className={styles.titleMask}>
              <span>FIND WHAT&apos;S NEXT</span>
            </span>
            <span className={styles.titleMask}>
              <span>BEFORE IT HAS</span>
            </span>
            <span className={`${styles.titleMask} ${styles.titleAccent}`}>
              <span>A NAME.</span>
            </span>
          </h1>
          <div className={`${styles.heroLeadRow} ${scrollStyles.heroLeadRow}`}>
            <p className={styles.heroLead}>
              {visibleSignals.length} signals distilled from {totalDiscoveries} frontier
              discoveries. Not more news — a compressed view of what is gaining shape before it
              becomes obvious.
            </p>
            <p className={styles.heroProfile}>{personalizationLabel}</p>
          </div>
        </div>

        <div className={`${styles.heroBottom} ${scrollStyles.heroBottom}`}>
          <a className={styles.scrollCue} href="#signals">
            <span>OPEN TODAY&apos;S BOARD</span>
            <ArrowDown className="h-4 w-4" />
          </a>
          <div
            className={`${styles.heroCount} ${scrollStyles.heroCount}`}
            aria-hidden="true"
          >
            {String(visibleSignals.length).padStart(2, "0")}
          </div>
          <div className={styles.heroMix}>
            <span>05 CORE</span>
            <span>01 ADJACENT</span>
            <span>01 WILD</span>
          </div>
        </div>
      </section>

      <div
        className={`${styles.ticker} ${scrollStyles.ticker}`}
        aria-label="Today topic signals"
      >
        <div className={styles.tickerTrack}>
          {[...ticker, ...ticker].map((tag, index) => (
            <span key={`${tag}-${index}`}>
              {tag}
              <i aria-hidden="true">✦</i>
            </span>
          ))}
        </div>
      </div>

      <section ref={boardRef} id="signals" className={boardStyles.stage}>
        <div className={boardStyles.pin}>
          <div className={boardStyles.marqueeField} aria-hidden="true">
            <div className={boardStyles.marqueeA}>
              TODAY&apos;S FRONTIER — TODAY&apos;S FRONTIER — TODAY&apos;S FRONTIER —
            </div>
            <div className={boardStyles.marqueeB}>
              SIGNALS / BUILD / DISCOVER / SIGNALS / BUILD / DISCOVER /
            </div>
          </div>

          <div className={boardStyles.chrome}>
            <span>FR / SIGNAL BOARD</span>
            <span>{dateLabel}</span>
            <span>HOVER TO FOCUS · CLICK TO OPEN</span>
          </div>

          <header className={boardStyles.boardHeader}>
            <div>
              <p>OVERVIEW FIRST</p>
              <h2>
                YOUR FRONTIER,
                <br />
                ALL AT ONCE.
              </h2>
            </div>
            <p className={boardStyles.boardLead}>
              Seven recommendations on one surface. Read the hierarchy in seconds, then interrogate
              the one that catches you.
            </p>
            <div className={boardStyles.boardStats}>
              <div>
                <strong>{String(visibleSignals.length).padStart(2, "0")}</strong>
                <span>SIGNALS</span>
              </div>
              <div>
                <strong>{totalDiscoveries}</strong>
                <span>SCANNED</span>
              </div>
              <div>
                <strong>{activeRank}</strong>
                <span>IN FOCUS</span>
              </div>
            </div>
          </header>

          <div className={boardStyles.matrix}>
            {visibleSignals.map((signal, index) => {
              const rank = String(index + 1).padStart(2, "0");
              const tileStyle = {
                "--tile-order": index,
              } as CSSProperties;

              return (
                <article
                  key={signal.id}
                  data-signal-tile="true"
                  data-lane={signal.lane}
                  data-active={activeIndex === index ? "true" : "false"}
                  className={`${boardStyles.tile} ${TILE_CLASSES[index] ?? ""}`}
                  style={tileStyle}
                  onMouseEnter={() => setActiveIndex(index)}
                  onFocus={() => setActiveIndex(index)}
                  onPointerMove={tiltTile}
                  onPointerLeave={releaseTile}
                >
                  {activeIndex === index ? (
                    <RecommendationObserver itemId={signal.id} metadata={signal.metadata} />
                  ) : null}
                  <Link
                    href={`/project/${signal.id}`}
                    className={boardStyles.tileLink}
                    onClick={() =>
                      trackFeedback(signal.id, "open_detail", undefined, signal.metadata)
                    }
                  >
                    <div className={boardStyles.tileTop}>
                      <span className={boardStyles.tileRank}>{rank}</span>
                      <span className={boardStyles.tileLane}>{LANE_LABEL[signal.lane]}</span>
                      <span className={boardStyles.tileScore}>
                        {signal.score == null ? "—" : Math.round(signal.score)}
                        <small>FR</small>
                      </span>
                    </div>

                    <div className={boardStyles.tileBody}>
                      <h3>{signal.title}</h3>
                      <p>{signal.summary}</p>
                    </div>

                    <div className={boardStyles.tileBottom}>
                      <span>{SOURCE_LABEL[signal.source] ?? signal.source}</span>
                      {signal.metricsLabel ? <span>{signal.metricsLabel}</span> : null}
                      {signal.hasCode ? <span>CODE</span> : null}
                      {signal.hasDemo ? <span>DEMO</span> : null}
                      <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                    </div>
                  </Link>
                </article>
              );
            })}

            <aside
              key={active.id}
              className={boardStyles.activePanel}
              data-lane={active.lane}
              aria-live="polite"
            >
              <div className={boardStyles.activeTop}>
                <span>IN FOCUS / {activeRank}</span>
                <strong>{active.score == null ? "—" : Math.round(active.score)} FR</strong>
              </div>
              <h3>{active.title}</h3>
              <div className={boardStyles.activeCopy}>
                <div>
                  <span>WHY NOW</span>
                  <p>{active.whyNow ?? active.summary}</p>
                </div>
                <div>
                  <span>WHY YOU</span>
                  <p>{active.whyYou ?? "A deliberate stretch beyond your default feed."}</p>
                </div>
              </div>
              <div className={boardStyles.activeActions}>
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
                  onClick={() =>
                    trackFeedback(active.id, "open_source", undefined, active.metadata)
                  }
                >
                  SOURCE <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              </div>
            </aside>
          </div>

          <div className={boardStyles.boardFooter}>
            <span>01–05 CORE / 06 ADJACENT / 07 WILDCARD</span>
            <span>SCROLL — THE BOARD WILL OPEN UP</span>
          </div>
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
