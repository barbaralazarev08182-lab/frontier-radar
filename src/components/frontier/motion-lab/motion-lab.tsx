"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";

interface LabSignal {
  rank: string;
  title: string;
  topic: string;
  score: number;
  age: string;
  lane: "core" | "adjacent" | "wildcard";
}

type LabMode = "run" | "hero" | "deck" | "overview" | "topic";

interface GsapTweenLike {
  progress(value: number): GsapTweenLike;
  kill(): void;
}

interface GsapLike {
  registerPlugin(...plugins: unknown[]): void;
}

interface FlipLike {
  getState(targets: Element[]): unknown;
  from(state: unknown, vars: Record<string, unknown>): GsapTweenLike;
}

declare global {
  interface Window {
    gsap?: GsapLike;
    Flip?: FlipLike;
  }
}

const SIGNALS: LabSignal[] = [
  {
    rank: "01",
    title: "A memory layer for agents that refuses to become another database",
    topic: "AGENT SYSTEMS",
    score: 96,
    age: "2H",
    lane: "core",
  },
  {
    rank: "02",
    title: "Browser-native tool orchestration",
    topic: "DEV TOOLS",
    score: 92,
    age: "4H",
    lane: "core",
  },
  {
    rank: "03",
    title: "Local multimodal models finally get fast enough to feel native",
    topic: "LOCAL AI",
    score: 89,
    age: "6H",
    lane: "core",
  },
  {
    rank: "04",
    title: "Interfaces generated as motion, not screens",
    topic: "CREATIVE AI",
    score: 86,
    age: "8H",
    lane: "core",
  },
  {
    rank: "05",
    title: "Tiny inference runtimes move closer to the edge",
    topic: "INFRA",
    score: 83,
    age: "11H",
    lane: "core",
  },
  {
    rank: "06",
    title: "A research tool that behaves more like a playable instrument",
    topic: "OUTSIDE YOUR BUBBLE",
    score: 79,
    age: "1D",
    lane: "adjacent",
  },
  {
    rank: "07",
    title: "An absurdly specific interface primitive that might become a category",
    topic: "WILDCARD",
    score: 77,
    age: "1D",
    lane: "wildcard",
  },
];

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function lerp(current: number, target: number, amount: number) {
  return current + (target - current) * amount;
}

function deckMorphForProgress(progress: number) {
  if (progress < 0.4) return 1;
  if (progress < 0.52) return 1 - clamp((progress - 0.4) / 0.12);
  if (progress < 0.58) return 0;
  if (progress < 0.82) return clamp((progress - 0.58) / 0.24);
  return 1;
}

function labelForProgress(progress: number) {
  if (progress < 0.06) return "LIVE";
  if (progress < 0.4) return "TEAR";
  if (progress < 0.52) return "COMPRESSION";
  if (progress < 0.58) return "DECK";
  if (progress < 0.82) return "EXPAND";
  return "OVERVIEW";
}

export function MotionLab() {
  const [mode, setMode] = useState<LabMode>("run");
  const shellRef = useRef<HTMLDivElement | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const progressRef = useRef<HTMLSpanElement | null>(null);
  const velocityRef = useRef<HTMLSpanElement | null>(null);
  const stateRef = useRef<HTMLSpanElement | null>(null);
  const engineRef = useRef<HTMLSpanElement | null>(null);
  const resetPhysicsRef = useRef<(() => void) | null>(null);
  const rebuildFlipRef = useRef<(() => boolean) | null>(null);
  const flipTweenRef = useRef<GsapTweenLike | null>(null);
  const flipProgressRef = useRef(1);

  useEffect(() => {
    const root = shellRef.current;
    if (!root) return;

    let attempts = 0;
    let timer = 0;
    let resizeTimer = 0;

    const setupFlip = () => {
      const gsap = window.gsap;
      const Flip = window.Flip;
      if (!gsap || !Flip) return false;

      const signals = Array.from(root.querySelectorAll<HTMLElement>(".motion-lab-signal"));
      if (signals.length !== SIGNALS.length) return false;

      flipTweenRef.current?.kill();
      gsap.registerPlugin(Flip);
      root.dataset.gsap = "booting";

      // Capture two real CSS layouts. These elements are already absolutely positioned,
      // so forcing Flip's `absolute` mode creates a second positioning system and breaks
      // right/bottom anchored cards. Keep Flip transform-only here.
      root.dataset.layout = "deck";
      void signals[0]?.offsetWidth;
      const deckState = Flip.getState(signals);

      root.dataset.layout = "overview";
      void signals[0]?.offsetWidth;

      const tween = Flip.from(deckState, {
        duration: 1,
        paused: true,
        scale: true,
        ease: "power4.inOut",
        stagger: { each: 0.045, from: "start" },
      });

      const desiredProgress = root.dataset.mode === "deck" ? 1 : flipProgressRef.current;
      tween.progress(desiredProgress);
      flipTweenRef.current = tween;

      if (root.dataset.mode === "deck") {
        root.dataset.layout = "deck";
        // At a static endpoint, use the actual deck layout rather than a cached inverse transform.
        signals.forEach((signal) => signal.style.removeProperty("transform"));
      }

      root.dataset.gsap = "ready";
      if (engineRef.current) engineRef.current.textContent = "GSAP / FLIP READY";
      return true;
    };

    rebuildFlipRef.current = setupFlip;

    if (!setupFlip()) {
      if (engineRef.current) engineRef.current.textContent = "GSAP / FLIP LOADING";
      timer = window.setInterval(() => {
        attempts += 1;
        if (setupFlip() || attempts > 80) {
          window.clearInterval(timer);
          if (attempts > 80 && engineRef.current) engineRef.current.textContent = "FLIP FALLBACK";
        }
      }, 75);
    }

    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        if (root.dataset.mode === "run" || root.dataset.mode === "overview" || root.dataset.mode === "topic") {
          setupFlip();
        }
      }, 140);
    };

    window.addEventListener("resize", onResize);

    return () => {
      if (timer) window.clearInterval(timer);
      if (resizeTimer) window.clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
      rebuildFlipRef.current = null;
      flipTweenRef.current?.kill();
      flipTweenRef.current = null;
    };
  }, []);

  useEffect(() => {
    const root = shellRef.current;
    const scroller = scrollerRef.current;
    if (!root || !scroller) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mobile = window.matchMedia("(max-width: 760px)").matches;
    root.dataset.reduced = reduced ? "true" : "false";

    let animationFrame = 0;
    let lastScrollTop = scroller.scrollTop;
    let lastTime = performance.now();
    let impulse = 0;
    let current = {
      x1: 0,
      x2: 0,
      x3: 0,
      y1: 0,
      y2: 0,
      y3: 0,
      r1: 0,
      r2: 0,
      r3: 0,
      s1: 1,
      s2: 1,
      s3: 1,
      hero: 1,
      signals: 0.18,
      signalScale: 0.96,
      deckness: 0,
      progress: 0,
    };

    const write = () => {
      root.style.setProperty("--tear-x-1", `${current.x1.toFixed(3)}vw`);
      root.style.setProperty("--tear-x-2", `${current.x2.toFixed(3)}vw`);
      root.style.setProperty("--tear-x-3", `${current.x3.toFixed(3)}vw`);
      root.style.setProperty("--tear-y-1", `${current.y1.toFixed(3)}vh`);
      root.style.setProperty("--tear-y-2", `${current.y2.toFixed(3)}vh`);
      root.style.setProperty("--tear-y-3", `${current.y3.toFixed(3)}vh`);
      root.style.setProperty("--tear-r-1", `${current.r1.toFixed(3)}deg`);
      root.style.setProperty("--tear-r-2", `${current.r2.toFixed(3)}deg`);
      root.style.setProperty("--tear-r-3", `${current.r3.toFixed(3)}deg`);
      root.style.setProperty("--tear-s-1", current.s1.toFixed(4));
      root.style.setProperty("--tear-s-2", current.s2.toFixed(4));
      root.style.setProperty("--tear-s-3", current.s3.toFixed(4));
      root.style.setProperty("--hero-alpha", current.hero.toFixed(4));
      root.style.setProperty("--signal-alpha", current.signals.toFixed(4));
      root.style.setProperty("--signal-scale", current.signalScale.toFixed(4));
      root.style.setProperty("--deckness", current.deckness.toFixed(4));
      root.style.setProperty("--overviewness", (1 - current.deckness).toFixed(4));
      root.style.setProperty("--lab-progress", current.progress.toFixed(4));
    };

    const applyFlipProgress = (value: number) => {
      const next = clamp(value);
      flipProgressRef.current = next;
      if (reduced || mobile) {
        flipTweenRef.current?.progress(1);
        return;
      }
      flipTweenRef.current?.progress(next);
    };

    const render = () => {
      animationFrame = 0;
      if (root.dataset.mode !== "run") return;

      const travel = Math.max(1, scroller.scrollHeight - scroller.clientHeight);
      const progress = clamp(scroller.scrollTop / travel);
      const tear = clamp((progress - 0.025) / 0.39);
      const reveal = clamp((progress - 0.15) / 0.28);
      const flipProgress = reduced || mobile ? 1 : deckMorphForProgress(progress);
      const deckness = 1 - flipProgress;
      const velocityEnergy = clamp(impulse, -1.6, 1.6);

      const target = reduced
        ? {
            x1: 0,
            x2: 0,
            x3: 0,
            y1: 0,
            y2: 0,
            y3: 0,
            r1: 0,
            r2: 0,
            r3: 0,
            s1: 1,
            s2: 1,
            s3: 1,
            hero: progress < 0.32 ? 1 : 0,
            signals: progress < 0.24 ? 0.18 : 1,
            signalScale: progress < 0.24 ? 0.96 : 1,
            deckness: 0,
            progress,
          }
        : {
            x1: -tear * 101 - velocityEnergy * 8.5,
            x2: tear * 108 + velocityEnergy * 9.5,
            x3: -tear * 88 - velocityEnergy * 6.8,
            y1: -tear * 4.8,
            y2: tear * 3.2,
            y3: -tear * 2.4,
            r1: -tear * 2.15 - velocityEnergy * 0.25,
            r2: tear * 2.7 + velocityEnergy * 0.28,
            r3: -tear * 3.35 - velocityEnergy * 0.32,
            s1: 1 + tear * 0.075,
            s2: 1 - tear * 0.055,
            s3: 1 + tear * 0.11,
            hero: 1 - clamp((progress - 0.24) / 0.2),
            signals: 0.18 + reveal * 0.82,
            signalScale: 0.96 + reveal * 0.04,
            deckness,
            progress,
          };

      const smoothing = reduced ? 1 : 0.135;
      current.x1 = lerp(current.x1, target.x1, smoothing);
      current.x2 = lerp(current.x2, target.x2, smoothing);
      current.x3 = lerp(current.x3, target.x3, smoothing);
      current.y1 = lerp(current.y1, target.y1, smoothing);
      current.y2 = lerp(current.y2, target.y2, smoothing);
      current.y3 = lerp(current.y3, target.y3, smoothing);
      current.r1 = lerp(current.r1, target.r1, smoothing);
      current.r2 = lerp(current.r2, target.r2, smoothing);
      current.r3 = lerp(current.r3, target.r3, smoothing);
      current.s1 = lerp(current.s1, target.s1, smoothing);
      current.s2 = lerp(current.s2, target.s2, smoothing);
      current.s3 = lerp(current.s3, target.s3, smoothing);
      current.hero = lerp(current.hero, target.hero, 0.16);
      current.signals = lerp(current.signals, target.signals, 0.16);
      current.signalScale = lerp(current.signalScale, target.signalScale, 0.16);
      current.deckness = lerp(current.deckness, target.deckness, 0.2);
      current.progress = lerp(current.progress, target.progress, 0.22);
      impulse *= 0.88;
      applyFlipProgress(flipProgress);
      write();

      if (progressRef.current) progressRef.current.textContent = progress.toFixed(3);
      if (velocityRef.current) velocityRef.current.textContent = `${Math.round(velocityEnergy * 1050)} px/s`;
      if (stateRef.current) stateRef.current.textContent = labelForProgress(progress);

      const unsettled =
        Math.abs(current.x1 - target.x1) > 0.02 ||
        Math.abs(current.x2 - target.x2) > 0.02 ||
        Math.abs(current.x3 - target.x3) > 0.02 ||
        Math.abs(current.deckness - target.deckness) > 0.004 ||
        Math.abs(impulse) > 0.008;

      if (unsettled) animationFrame = window.requestAnimationFrame(render);
    };

    const requestRender = () => {
      if (!animationFrame) animationFrame = window.requestAnimationFrame(render);
    };

    const onScroll = () => {
      if (root.dataset.mode !== "run") return;
      const now = performance.now();
      const delta = scroller.scrollTop - lastScrollTop;
      const elapsed = Math.max(8, now - lastTime);
      const pxPerMs = delta / elapsed;
      lastScrollTop = scroller.scrollTop;
      lastTime = now;
      impulse = clamp(impulse + pxPerMs * 0.58, -1.6, 1.6);
      requestRender();
    };

    resetPhysicsRef.current = () => {
      current = {
        x1: 0,
        x2: 0,
        x3: 0,
        y1: 0,
        y2: 0,
        y3: 0,
        r1: 0,
        r2: 0,
        r3: 0,
        s1: 1,
        s2: 1,
        s3: 1,
        hero: 1,
        signals: 0.18,
        signalScale: 0.96,
        deckness: 0,
        progress: 0,
      };
      impulse = 0;
      lastScrollTop = scroller.scrollTop;
      lastTime = performance.now();
      applyFlipProgress(1);
      write();
      requestRender();
    };

    write();
    scroller.addEventListener("scroll", onScroll, { passive: true });
    requestRender();

    return () => {
      scroller.removeEventListener("scroll", onScroll);
      resetPhysicsRef.current = null;
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  useEffect(() => {
    const root = shellRef.current;
    const scroller = scrollerRef.current;
    if (!root || !scroller) return;

    root.dataset.mode = mode;
    scroller.style.overflowY = mode === "run" ? "auto" : "hidden";

    const setFrame = (flipProgress: number, deckness: number, hero: number, signals: number) => {
      flipProgressRef.current = flipProgress;
      flipTweenRef.current?.progress(flipProgress);
      root.style.setProperty("--deckness", deckness.toString());
      root.style.setProperty("--overviewness", (1 - deckness).toString());
      root.style.setProperty("--hero-alpha", hero.toString());
      root.style.setProperty("--signal-alpha", signals.toString());
      root.style.setProperty("--signal-scale", signals < 1 ? "0.96" : "1");
    };

    if (mode === "run") {
      scroller.scrollTop = 0;
      root.dataset.layout = "overview";
      rebuildFlipRef.current?.();
      resetPhysicsRef.current?.();
      root.style.setProperty("--tear-x-1", "0vw");
      root.style.setProperty("--tear-x-2", "0vw");
      root.style.setProperty("--tear-x-3", "0vw");
      root.style.setProperty("--tear-y-1", "0vh");
      root.style.setProperty("--tear-y-2", "0vh");
      root.style.setProperty("--tear-y-3", "0vh");
      root.style.setProperty("--tear-r-1", "0deg");
      root.style.setProperty("--tear-r-2", "0deg");
      root.style.setProperty("--tear-r-3", "0deg");
      root.style.setProperty("--tear-s-1", "1");
      root.style.setProperty("--tear-s-2", "1");
      root.style.setProperty("--tear-s-3", "1");
      root.style.setProperty("--lab-progress", "0");
      return;
    }

    const showHero = mode === "hero";
    root.style.setProperty("--tear-x-1", showHero ? "0vw" : "-112vw");
    root.style.setProperty("--tear-x-2", showHero ? "0vw" : "116vw");
    root.style.setProperty("--tear-x-3", showHero ? "0vw" : "-102vw");
    root.style.setProperty("--tear-y-1", "0vh");
    root.style.setProperty("--tear-y-2", "0vh");
    root.style.setProperty("--tear-y-3", "0vh");
    root.style.setProperty("--tear-r-1", showHero ? "0deg" : "-2deg");
    root.style.setProperty("--tear-r-2", showHero ? "0deg" : "2deg");
    root.style.setProperty("--tear-r-3", showHero ? "0deg" : "-3deg");
    root.style.setProperty("--tear-s-1", "1");
    root.style.setProperty("--tear-s-2", "1");
    root.style.setProperty("--tear-s-3", "1");

    if (mode === "deck") {
      // Static DECK must use the actual CSS deck endpoint, not Flip progress(0).
      // The latter is an inverse transform based on the overview layout and was the
      // source of the giant cards escaping to the right/bottom in the QA screenshot.
      flipTweenRef.current?.progress(1);
      root.dataset.layout = "deck";
      Array.from(root.querySelectorAll<HTMLElement>(".motion-lab-signal")).forEach((signal) => {
        signal.style.removeProperty("transform");
      });
      setFrame(1, 1, 0, 1);
    } else {
      root.dataset.layout = "overview";
      if (mode === "hero") setFrame(1, 0, 1, 0.18);
      if (mode === "overview" || mode === "topic") setFrame(1, 0, 0, 1);
    }

    if (progressRef.current) progressRef.current.textContent = "STATIC";
    if (velocityRef.current) velocityRef.current.textContent = "—";
    if (stateRef.current) stateRef.current.textContent = mode.toUpperCase();
  }, [mode]);

  return (
    <div ref={shellRef} data-mode={mode} data-layout="overview" className="motion-lab-shell">
      <Script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js" strategy="afterInteractive" />
      <Script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/Flip.min.js" strategy="afterInteractive" />

      <div ref={scrollerRef} className="motion-lab-scroller">
        <div className="motion-lab-track">
          <section className="motion-lab-stage" aria-label="Frontier Radar Motion Lab">
            <div className="motion-lab-field" aria-hidden="true" />
            <div className="motion-lab-scanline" aria-hidden="true" />

            <header className="motion-lab-meta">
              <div>
                <strong>FR / MOTION LAB</strong>
                <span>LAB-03 SIGNAL DECK → OVERVIEW / GSAP FLIP PHYSICS</span>
              </div>
              <div>
                <span>PROTOTYPE ONLY</span>
                <span>NO LIVE DATA</span>
              </div>
            </header>

            <div className="motion-lab-deck-readout" aria-hidden="true">
              <span>458 SCANNED</span>
              <strong>07</strong>
              <span>SELECTED SIGNALS</span>
            </div>

            <div className="motion-lab-signal-stage" aria-label="Seven prototype signals">
              {SIGNALS.map((signal) => (
                <article
                  key={signal.rank}
                  className={`motion-lab-signal motion-lab-signal-${signal.rank} motion-lab-signal-${signal.lane}`}
                >
                  <span className="motion-lab-rank">{signal.rank}</span>
                  <div className="motion-lab-signal-copy">
                    <span className="motion-lab-topic">{signal.topic}</span>
                    <h2>{signal.title}</h2>
                  </div>
                  <div className="motion-lab-score">
                    <strong>{signal.score}</strong>
                    <span>FR</span>
                  </div>
                  <span className="motion-lab-age">{signal.age}</span>

                  <div className="motion-lab-deck-face" aria-hidden="true">
                    <div className="motion-lab-deck-face-top">
                      <span>INTEL BRIEF</span>
                      <span>FR / {signal.score}</span>
                    </div>
                    <strong>{signal.rank}</strong>
                    <div className="motion-lab-deck-face-bottom">
                      <span>{signal.topic}</span>
                      <span>{signal.age} / SIGNAL</span>
                    </div>
                  </div>
                </article>
              ))}

              <div className="motion-lab-topic-map" aria-hidden="true">
                <span className="motion-lab-cluster motion-lab-cluster-agents">AGENT SYSTEMS</span>
                <span className="motion-lab-cluster motion-lab-cluster-infra">INFRA / TOOLS</span>
                <span className="motion-lab-cluster motion-lab-cluster-creative">CREATIVE</span>
                <span className="motion-lab-cluster motion-lab-cluster-edge">OUTLIERS</span>
                <span className="motion-lab-orbit motion-lab-orbit-a" />
                <span className="motion-lab-orbit motion-lab-orbit-b" />
                <span className="motion-lab-axis motion-lab-axis-x" />
                <span className="motion-lab-axis motion-lab-axis-y" />
              </div>
            </div>

            <div className="motion-lab-hero" aria-labelledby="motion-lab-title">
              <p>PERSONAL FRONTIER INTELLIGENCE / PROTOTYPE 002</p>
              <h1 id="motion-lab-title">
                <span className="motion-lab-title-line motion-lab-title-line-1"><i>FIND WHAT&apos;S NEXT</i></span>
                <span className="motion-lab-title-line motion-lab-title-line-2"><i>BEFORE IT HAS</i></span>
                <span className="motion-lab-title-line motion-lab-title-line-3"><i>A NAME.</i></span>
              </h1>
              <div className="motion-lab-hero-footer">
                <span>458 FOUND → 07 SELECTED → 01 VIEWPORT</span>
                <span>TEAR · COMPRESS · HOLD · RELEASE</span>
              </div>
            </div>

            <aside className="motion-lab-hud" aria-label="Motion Lab controls">
              <div className="motion-lab-hud-title">
                <strong>MOTION LAB</strong>
                <Link href="/today">EXIT ↗</Link>
              </div>
              <dl>
                <div><dt>STATE</dt><dd><span ref={stateRef}>LIVE</span></dd></div>
                <div><dt>PROGRESS</dt><dd><span ref={progressRef}>0.000</span></dd></div>
                <div><dt>VELOCITY</dt><dd><span ref={velocityRef}>0 px/s</span></dd></div>
                <div><dt>ENGINE</dt><dd><span ref={engineRef}>GSAP / FLIP LOADING</span></dd></div>
              </dl>
              <div className="motion-lab-control-group">
                <span>PLAY</span>
                <button type="button" data-active={mode === "run"} onClick={() => setMode("run")}>RUN</button>
              </div>
              <div className="motion-lab-control-group">
                <span>STATIC FRAMES</span>
                <button type="button" data-active={mode === "hero"} onClick={() => setMode("hero")}>HERO</button>
                <button type="button" data-active={mode === "deck"} onClick={() => setMode("deck")}>DECK</button>
                <button type="button" data-active={mode === "overview"} onClick={() => setMode("overview")}>OVERVIEW</button>
                <button type="button" data-active={mode === "topic"} onClick={() => setMode("topic")}>TOPIC</button>
              </div>
            </aside>

            <div className="motion-lab-progress" aria-hidden="true"><span /></div>
          </section>
        </div>
      </div>
      <style jsx global>{`
        body:has(.motion-lab-shell) { overflow: hidden; }
      `}</style>
    </div>
  );
}
