"use client";

import { Activity, ArrowDownRight, Crosshair, Sparkles } from "lucide-react";
import type { DiscoveryLane } from "@/lib/feed/discovery-mix";
import type { FeedSource } from "@/lib/feed/types";
import { TrackedDetailLink } from "./tracked-detail-link";
import { SignalField } from "./signal-field";

type HeroSignal = {
  id: string;
  title: string;
  source: FeedSource;
  score: number | null;
  lane: DiscoveryLane;
};

const SOURCE_SHORT: Record<FeedSource, string> = {
  github: "GH",
  huggingface: "HF",
  arxiv: "AX",
  hackernews: "HN",
  producthunt: "PH",
};

const SIGNAL_POSITIONS = [
  "left-[8%] top-[24%]",
  "left-[21%] bottom-[16%]",
  "right-[9%] top-[20%]",
  "right-[17%] bottom-[18%]",
  "left-[49%] top-[13%]",
  "left-[58%] bottom-[11%]",
  "right-[33%] top-[34%]",
];

function laneTone(lane: DiscoveryLane) {
  if (lane === "wildcard") return "border-fuchsia-300/35 bg-fuchsia-400/10 text-fuchsia-100 shadow-[0_0_30px_rgba(217,70,239,0.17)]";
  if (lane === "adjacent") return "border-amber-300/35 bg-amber-300/10 text-amber-100 shadow-[0_0_30px_rgba(251,191,36,0.14)]";
  return "border-cyan-200/25 bg-cyan-300/[0.075] text-cyan-50 shadow-[0_0_30px_rgba(34,211,238,0.12)]";
}

export function SignalHero({
  date,
  signals,
  personalizationApplied,
  personalizationSignals,
  personalizationMode,
}: {
  date: string;
  signals: HeroSignal[];
  personalizationApplied: boolean;
  personalizationSignals: number;
  personalizationMode: "vector" | "rules" | null;
}) {
  return (
    <header className="signal-hero relative min-h-[38rem] overflow-hidden rounded-[2rem] border border-white/[0.09] md:min-h-[43rem]">
      <SignalField />
      <div aria-hidden className="signal-hero-noise absolute inset-0" />
      <div aria-hidden className="signal-hero-grid absolute inset-0" />
      <div aria-hidden className="signal-radar-rings absolute left-1/2 top-1/2 h-[46rem] w-[46rem] -translate-x-1/2 -translate-y-1/2 rounded-full" />
      <div aria-hidden className="signal-sweep absolute left-1/2 top-1/2 h-[42rem] w-[42rem] -translate-x-1/2 -translate-y-1/2 rounded-full" />

      <div className="relative z-10 flex min-h-[38rem] flex-col justify-between p-5 sm:p-7 md:min-h-[43rem] md:p-9">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1.5 backdrop-blur-xl">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" />
            </span>
            <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-emerald-100">Live signal field</span>
          </div>
          <div className="text-right font-mono text-[9px] uppercase tracking-[0.16em] text-white/45">
            <p>FR / {date}</p>
            <p className="mt-1">Discovery mix · 5 / 1 / 1</p>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-0 hidden md:block">
          {signals.slice(0, 7).map((signal, index) => (
            <TrackedDetailLink
              key={signal.id}
              itemId={signal.id}
              href={`/project/${signal.id}`}
              metadata={{
                rank: index + 1,
                lane: signal.lane,
                surface: "today",
                algorithm_variant: "daily-radar-mix-v1",
                source: signal.source,
              }}
              className={`signal-node pointer-events-auto absolute max-w-[12rem] rounded-xl border px-3 py-2 backdrop-blur-xl ${SIGNAL_POSITIONS[index] ?? "left-1/2 top-1/2"} ${laneTone(signal.lane)}`}
            >
              <span className="flex items-center gap-2">
                <span className="font-mono text-[9px] font-bold tracking-[0.16em] opacity-70">{SOURCE_SHORT[signal.source]}</span>
                <span className="h-px flex-1 bg-current opacity-20" />
                <span className="font-mono text-[10px] font-semibold tabular-nums">{signal.score ?? "--"}</span>
              </span>
              <span className="mt-1 block truncate text-[10px] font-medium text-white/80">{signal.title}</span>
            </TrackedDetailLink>
          ))}
        </div>

        <div className="relative mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center py-20 text-center md:py-24">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-200/15 bg-cyan-200/[0.045] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-100 backdrop-blur-md">
            <Crosshair className="h-3.5 w-3.5" />
            {String(signals.length).padStart(2, "0")} signals detected
          </div>

          <div className="relative">
            <div aria-hidden className="absolute -inset-x-16 inset-y-0 -z-10 bg-cyan-300/10 blur-[70px]" />
            <p className="signal-wordmark text-[clamp(3.2rem,10vw,8.2rem)] font-black leading-[0.76] tracking-[-0.075em] text-white">
              FRONTIER
            </p>
            <p className="signal-wordmark signal-wordmark-accent mt-2 text-[clamp(3.2rem,10vw,8.2rem)] font-black leading-[0.76] tracking-[-0.075em]">
              RADAR
            </p>
          </div>

          <p className="mt-8 max-w-xl text-balance text-sm leading-7 text-white/60 md:text-base">
            Discover what is being built before it becomes obvious.
            <span className="mt-1 block text-white/38">从噪声里找出正在形成的下一波技术信号。</span>
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-2 text-[10px] text-white/52">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/20 px-3 py-1.5 backdrop-blur-md">
              <Activity className="h-3.5 w-3.5 text-cyan-200" /> 5 Core
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/15 bg-amber-300/[0.055] px-3 py-1.5 backdrop-blur-md">1 Adjacent</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-fuchsia-300/15 bg-fuchsia-300/[0.055] px-3 py-1.5 backdrop-blur-md">1 Wildcard</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-300/15 bg-violet-300/[0.055] px-3 py-1.5 backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 text-violet-200" />
              {personalizationApplied
                ? `${personalizationMode === "vector" ? "Vector" : "Rules"} · ${personalizationSignals} learned`
                : "Profile learning"}
            </span>
          </div>
        </div>

        <div className="flex items-end justify-between gap-4 border-t border-white/[0.08] pt-4">
          <p className="max-w-lg font-mono text-[9px] uppercase leading-5 tracking-[0.13em] text-white/34">
            Signals are ranked by quality first. Personal Match is applied before project clustering. Cross-source evidence confirms; it does not dominate.
          </p>
          <a href="#today-signals" className="group inline-flex shrink-0 items-center gap-2 rounded-full border border-white/12 bg-white/[0.045] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/70 backdrop-blur-md transition hover:border-cyan-200/30 hover:bg-cyan-200/[0.07] hover:text-white">
            Enter field
            <ArrowDownRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:translate-y-0.5" />
          </a>
        </div>
      </div>
    </header>
  );
}
