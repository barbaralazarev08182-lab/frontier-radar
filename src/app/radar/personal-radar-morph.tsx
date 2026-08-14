"use client";

import Script from "next/script";
import { useEffect, useMemo, useRef, useState } from "react";
import type { PersonalRadarDimension } from "@/lib/personalization/personal-radar";
import styles from "./personal-radar.module.css";

type RadarView = "strength" | "evidence" | "freshness";

type EChartsInstance = {
  clear: () => void;
  dispose: () => void;
  resize: () => void;
  setOption: (
    option: Record<string, unknown>,
    options?: { replaceMerge?: string[] }
  ) => void;
};

type EChartsApi = {
  getInstanceByDom: (element: HTMLDivElement) => EChartsInstance | undefined;
  init: (element: HTMLDivElement) => EChartsInstance;
};

declare global {
  interface Window {
    echarts?: EChartsApi;
  }
}

const VIEW_ORDER: RadarView[] = ["strength", "evidence", "freshness"];

const VIEW_COPY: Record<
  RadarView,
  { eyebrow: string; title: string; note: string; axis: string }
> = {
  strength: {
    eyebrow: "01 · STRENGTH",
    title: "WHAT IS PULLING HARDEST NOW",
    note: "X is the signed live behavior signal. Y is evidence confidence. Dot size keeps evidence volume visible.",
    axis: "SIGNAL × CONFIDENCE",
  },
  evidence: {
    eyebrow: "02 · EVIDENCE",
    title: "WHAT THE PROFILE CAN ACTUALLY DEFEND",
    note: "The same interests become countable bars. Height is contributing feedback events; no synthetic percentages are introduced.",
    axis: "CONTRIBUTING EVENTS",
  },
  freshness: {
    eyebrow: "03 · FRESHNESS",
    title: "WHAT IS STILL CLOSE TO THE SURFACE",
    note: "X is recency freshness and Y remains confidence. A fresh point is not automatically a strong preference.",
    axis: "FRESHNESS × CONFIDENCE",
  },
};

const PAPER = "#F0EFEB";
const INK = "#1C1C1A";
const MUTED = "#8F8E88";
const FAINT = "#C6C5BF";
const GRID = "#DEDDD6";
const COBALT = "#315EFB";
const LADDER = [INK, "#4A4944", "#6A6963", MUTED, "#B0AFA9", FAINT];

function percentage(value: number): string {
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
}

function signal(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return `${rounded > 0 ? "+" : ""}${rounded.toFixed(1)}`;
}

function makeAxis(name: string) {
  return {
    axisLine: { lineStyle: { color: GRID, width: 1 } },
    axisTick: { lineStyle: { color: GRID }, length: 5 },
    axisLabel: {
      color: MUTED,
      fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
      fontSize: 9,
      margin: 10,
    },
    splitLine: { lineStyle: { color: GRID, width: 0.7 } },
    name,
    nameGap: 18,
    nameTextStyle: {
      color: FAINT,
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
      fontSize: 8,
      fontWeight: 700,
    },
  };
}

function buildView(
  view: RadarView,
  dimensions: PersonalRadarDimension[]
): Record<string, unknown> {
  const hero = dimensions.reduce((best, point) =>
    point.behaviorSignal > best.behaviorSignal ? point : best
  );
  const identityOrder = new Map(
    dimensions.map((dimension, index) => [dimension.key, index] as const)
  );
  const shade = (dimension: PersonalRadarDimension) => {
    if (dimension.key === hero.key) return COBALT;
    const index = identityOrder.get(dimension.key) ?? 0;
    return LADDER[Math.min(index + 1, LADDER.length - 1)] ?? MUTED;
  };

  if (view === "evidence") {
    const ordered = [...dimensions].sort(
      (a, b) => b.evidenceCount - a.evidenceCount || b.behaviorSignal - a.behaviorSignal
    );
    const maxEvidence = Math.max(1, ...ordered.map((dimension) => dimension.evidenceCount));
    return {
      grid: { left: 48, right: 26, top: 34, bottom: 72 },
      xAxis: {
        ...makeAxis("INTEREST DIMENSION"),
        type: "category",
        data: ordered.map((dimension) => dimension.label),
        axisLabel: {
          ...makeAxis("").axisLabel,
          rotate: 31,
          fontSize: 8.5,
          interval: 0,
        },
        splitLine: { show: false },
      },
      yAxis: {
        ...makeAxis("EVIDENCE EVENTS"),
        type: "value",
        min: 0,
        max: Math.max(4, Math.ceil(maxEvidence * 1.2)),
        minInterval: 1,
      },
      series: [
        {
          id: "personal-radar-profile",
          type: "bar",
          universalTransition: true,
          barCategoryGap: "34%",
          data: ordered.map((dimension) => ({
            name: dimension.label,
            value: dimension.evidenceCount,
            groupId: dimension.key,
            itemStyle: {
              color: shade(dimension),
              borderRadius: [2, 2, 0, 0],
            },
          })),
        },
      ],
    };
  }

  const isFreshness = view === "freshness";
  const xValues = dimensions.map((dimension) =>
    isFreshness ? dimension.freshness * 100 : dimension.behaviorSignal
  );
  const minX = isFreshness
    ? Math.max(0, Math.floor(Math.min(...xValues) - 8))
    : Math.min(0, Math.floor(Math.min(...xValues) - 1));
  const maxX = isFreshness
    ? 100
    : Math.max(1, Math.ceil(Math.max(...xValues) + 1));
  const maxConfidence = Math.max(...dimensions.map((dimension) => dimension.confidence * 100));
  const confidenceCeiling = Math.min(
    100,
    Math.max(20, Math.ceil((maxConfidence + 8) / 10) * 10)
  );

  return {
    grid: { left: 54, right: 28, top: 34, bottom: 54 },
    xAxis: {
      ...makeAxis(isFreshness ? "FRESHNESS %" : "SIGNED LIVE SIGNAL"),
      type: "value",
      min: minX,
      max: maxX,
      axisLabel: {
        ...makeAxis("").axisLabel,
        formatter: isFreshness ? "{value}%" : "{value}",
      },
    },
    yAxis: {
      ...makeAxis("CONFIDENCE %"),
      type: "value",
      min: 0,
      max: confidenceCeiling,
      axisLabel: {
        ...makeAxis("").axisLabel,
        formatter: "{value}%",
      },
    },
    series: [
      {
        id: "personal-radar-profile",
        type: "scatter",
        universalTransition: true,
        symbolSize: (value: number[]) => 9 + Math.sqrt(Number(value[2] ?? 1)) * 5.4,
        data: dimensions.map((dimension) => ({
          name: dimension.label,
          value: [
            isFreshness ? dimension.freshness * 100 : dimension.behaviorSignal,
            dimension.confidence * 100,
            dimension.evidenceCount,
          ],
          groupId: dimension.key,
          itemStyle: { color: shade(dimension) },
        })),
        label: {
          show: true,
          position: "top",
          distance: 7,
          color: MUTED,
          fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
          fontSize: 8.5,
          formatter: "{b}",
        },
        emphasis: {
          focus: "self",
          label: { color: INK, fontWeight: 700 },
        },
      },
    ],
  };
}

export function PersonalRadarMorph({
  dimensions,
}: {
  dimensions: PersonalRadarDimension[];
}) {
  const chartRef = useRef<HTMLDivElement | null>(null);
  const chartInstanceRef = useRef<EChartsInstance | null>(null);
  const manualPauseRef = useRef(false);
  const manualPauseTimerRef = useRef<number | null>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [view, setView] = useState<RadarView>("strength");
  const [reduceMotion, setReduceMotion] = useState(false);

  const points = useMemo(() => dimensions.slice(0, 12), [dimensions]);
  const viewCopy = VIEW_COPY[view];

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!scriptReady || !chartRef.current || !window.echarts || points.length === 0) return;

    const element = chartRef.current;
    const chart = window.echarts.getInstanceByDom(element) ?? window.echarts.init(element);
    chartInstanceRef.current = chart;
    chart.clear();
    chart.setOption({
      animationDurationUpdate: reduceMotion ? 0 : 1100,
      animationEasingUpdate: "cubicInOut",
      tooltip: {
        backgroundColor: INK,
        borderWidth: 0,
        padding: [9, 12],
        textStyle: { color: PAPER, fontSize: 11 },
      },
      ...buildView("strength", points),
    });

    const resize = () => chart.resize();
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      chart.dispose();
      chartInstanceRef.current = null;
    };
  }, [scriptReady, points, reduceMotion]);

  useEffect(() => {
    const chart = chartInstanceRef.current;
    if (!scriptReady || !chart || points.length === 0) return;
    chart.setOption(
      {
        animationDurationUpdate: reduceMotion ? 0 : 1100,
        animationEasingUpdate: "cubicInOut",
        ...buildView(view, points),
      },
      { replaceMerge: ["xAxis", "yAxis", "series"] }
    );
  }, [view, points, reduceMotion, scriptReady]);

  useEffect(() => {
    if (reduceMotion) return;
    const timer = window.setInterval(() => {
      if (manualPauseRef.current) return;
      setView((current) => {
        const index = VIEW_ORDER.indexOf(current);
        return VIEW_ORDER[(index + 1) % VIEW_ORDER.length] ?? "strength";
      });
    }, 3000);
    return () => window.clearInterval(timer);
  }, [reduceMotion]);

  useEffect(() => () => {
    if (manualPauseTimerRef.current !== null) {
      window.clearTimeout(manualPauseTimerRef.current);
    }
  }, []);

  function selectView(next: RadarView) {
    manualPauseRef.current = true;
    if (manualPauseTimerRef.current !== null) {
      window.clearTimeout(manualPauseTimerRef.current);
    }
    manualPauseTimerRef.current = window.setTimeout(() => {
      manualPauseRef.current = false;
      manualPauseTimerRef.current = null;
    }, 7000);
    setView(next);
  }

  return (
    <div className={styles.morphWorkspace}>
      <Script
        src="https://cdn.jsdelivr.net/npm/echarts@6/dist/echarts.min.js"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
        onReady={() => setScriptReady(true)}
      />

      <div className={styles.morphRail} aria-label="Personal Radar views">
        <div className={styles.morphRailHead}>
          <span>G9 · ONE PROFILE, THREE VIEWS</span>
          <strong>{viewCopy.title}</strong>
          <p>{viewCopy.note}</p>
        </div>
        <div className={styles.morphButtons}>
          {VIEW_ORDER.map((candidate) => (
            <button
              type="button"
              key={candidate}
              className={candidate === view ? styles.morphButtonActive : undefined}
              aria-pressed={candidate === view}
              onClick={() => selectView(candidate)}
            >
              <span>{VIEW_COPY[candidate].eyebrow}</span>
              <b>{VIEW_COPY[candidate].axis}</b>
            </button>
          ))}
        </div>
        <div className={styles.morphLegend}>
          <span><i className={styles.legendHero} /> strongest live signal</span>
          <span><i /> same interest identity</span>
          <span>{reduceMotion ? "REDUCED MOTION · MANUAL VIEWS" : "AUTO MORPH 3S · MANUAL SELECTION PAUSES 7S"}</span>
        </div>
      </div>

      <div className={styles.morphPlotWrap}>
        <div
          ref={chartRef}
          className={styles.morphPlot}
          role="img"
          aria-label={`Personal Radar ${view} view. The same interest dimensions transition between strength, evidence, and freshness.`}
        />
        {!scriptReady ? <div className={styles.morphLoading}>LOADING G9 INSTRUMENT…</div> : null}
        <div className={styles.morphSource}>
          LIEFLAT G9 SCATTER MORPH · UNIVERSAL TRANSITION · GROUP ID = INTEREST DIMENSION
        </div>
      </div>

      <aside className={styles.morphReadout}>
        <div className={styles.morphReadoutHead}>
          <span>LIVE EVIDENCE LEDGER</span>
          <strong>{points.length} DIMENSIONS IN VIEW</strong>
        </div>
        <div className={styles.morphReadoutLabels}>
          <span>INTEREST</span><span>S</span><span>E</span><span>F</span>
        </div>
        {points.slice(0, 8).map((dimension, index) => (
          <div className={styles.morphReadoutRow} key={dimension.key}>
            <strong>{String(index + 1).padStart(2, "0")} · {dimension.label}</strong>
            <span>{signal(dimension.behaviorSignal)}</span>
            <span>{dimension.evidenceCount}</span>
            <span>{percentage(dimension.freshness)}</span>
          </div>
        ))}
        <p>
          S = signed live signal · E = contributing events · F = freshness. Confidence remains visible in the plotted geometry.
        </p>
      </aside>
    </div>
  );
}
