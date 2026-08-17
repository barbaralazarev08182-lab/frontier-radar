"use client";

import Script from "next/script";
import { useEffect, useMemo, useRef, useState } from "react";
import type { PersonalRadarDimension } from "@/lib/personalization/personal-radar";
import styles from "./personal-radar.module.css";
import polish from "./personal-radar-polish.module.css";
import delight from "./personal-radar-delight.module.css";

type RadarView = "strength" | "evidence" | "freshness";

type EChartsDatum = {
  groupId?: string;
};

type EChartsEventParams = {
  seriesId?: string;
  name?: string;
  dataIndex?: number;
  data?: EChartsDatum | unknown[] | number | string;
};

type EChartsHandler = (params?: EChartsEventParams) => void;

type EChartsInstance = {
  clear: () => void;
  dispose: () => void;
  resize: () => void;
  setOption: (
    option: Record<string, unknown>,
    options?: { replaceMerge?: string[] }
  ) => void;
  on: (eventName: string, handler: EChartsHandler) => void;
  off: (eventName: string, handler: EChartsHandler) => void;
  dispatchAction: (payload: Record<string, unknown>) => void;
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
    note: "Each horizontal rung runs from zero to current freshness. Endpoint size keeps confidence visible without turning freshness into a second scatter field.",
    axis: "FRESHNESS RUNG",
  },
};

const PAPER = "#F0EFEB";
const INK = "#1C1C1A";
const MUTED = "#6F6D66";
const FAINT = "#9E9C94";
const GRID = "#D1CFC7";
const GRID_MAJOR = "#99978F";
const GRID_ZERO = "#66645D";
const TRACK = "#DAD8D0";
const COBALT = "#315EFB";
const LADDER = [INK, "#474640", "#5E5C56", "#74726B", "#908E86", "#ABA9A1"];
const CHART_GRID = { left: 64, right: 30, top: 34, bottom: 62 };

function percentage(value: number): string {
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
}

function signal(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return `${rounded > 0 ? "+" : ""}${rounded.toFixed(1)}`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return entities[character] ?? character;
  });
}

function groupIdFromParams(params?: EChartsEventParams): string | undefined {
  const data = params?.data;
  if (typeof data !== "object" || data === null || Array.isArray(data)) return undefined;
  const groupId = (data as EChartsDatum).groupId;
  return typeof groupId === "string" ? groupId : undefined;
}

function orderedForView(
  view: RadarView,
  dimensions: PersonalRadarDimension[]
): PersonalRadarDimension[] {
  if (view === "evidence") {
    return [...dimensions].sort(
      (a, b) => b.evidenceCount - a.evidenceCount || b.behaviorSignal - a.behaviorSignal
    );
  }
  if (view === "freshness") {
    return [...dimensions].sort(
      (a, b) => b.freshness - a.freshness || b.confidence - a.confidence
    );
  }
  return dimensions;
}

function tooltipMarkup(
  rawParams: EChartsEventParams | EChartsEventParams[],
  dimensions: PersonalRadarDimension[]
): string {
  const params = Array.isArray(rawParams) ? rawParams[0] : rawParams;
  if (!params || params.seriesId !== "personal-radar-profile") return "";
  const groupId = groupIdFromParams(params);
  const dimension = dimensions.find((item) => item.key === groupId)
    ?? dimensions.find((item) => item.label === params.name);
  if (!dimension) return "";

  return `
    <div style="min-width:176px;padding:2px 1px 1px;font-family:Inter,ui-sans-serif,system-ui,sans-serif">
      <div style="font:700 9px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.11em;color:#9EA8D8;margin-bottom:7px">INTEREST DOSSIER</div>
      <div style="font-size:13px;font-weight:760;line-height:1.15;color:${PAPER};margin-bottom:9px">${escapeHtml(dimension.label)}</div>
      <div style="display:grid;grid-template-columns:1fr auto;gap:5px 14px;font-size:10px;color:#C9C8C2">
        <span>SIGNAL</span><b style="color:${PAPER}">${signal(dimension.behaviorSignal)}</b>
        <span>EVIDENCE</span><b style="color:${PAPER}">${dimension.evidenceCount}</b>
        <span>FRESHNESS</span><b style="color:${PAPER}">${percentage(dimension.freshness)}</b>
        <span>CONFIDENCE</span><b style="color:${PAPER}">${percentage(dimension.confidence)}</b>
      </div>
    </div>`;
}

function makeAxis(name: string) {
  return {
    animation: false,
    animationDurationUpdate: 0,
    axisLine: { lineStyle: { color: GRID_MAJOR, width: 1.3 } },
    axisTick: { lineStyle: { color: GRID_MAJOR, width: 1.1 }, length: 6 },
    axisLabel: {
      color: MUTED,
      fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
      fontSize: 10,
      fontWeight: 560,
      margin: 10,
      hideOverlap: true,
    },
    splitLine: { lineStyle: { color: GRID, width: 0.88 } },
    name,
    nameGap: 19,
    nameTextStyle: {
      color: "#85837B",
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
      fontSize: 8.8,
      fontWeight: 760,
    },
  };
}

function guideSeries(
  id: string,
  data: Array<Record<string, number>>,
  color = GRID_MAJOR,
  width = 1.4
) {
  return {
    id,
    type: "scatter",
    silent: true,
    animation: false,
    z: 0,
    symbolSize: 0,
    data: [],
    tooltip: { show: false },
    markLine: {
      silent: true,
      animation: false,
      symbol: ["none", "none"],
      label: { show: false },
      lineStyle: { color, width, type: "solid" },
      data,
    },
  };
}

function buildView(
  view: RadarView,
  dimensions: PersonalRadarDimension[],
  reduceMotion: boolean
): Record<string, unknown> {
  const seriesDuration = reduceMotion ? 0 : 880;
  const supportDuration = reduceMotion ? 0 : 220;
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
    const ordered = orderedForView(view, dimensions);
    const maxEvidence = Math.max(1, ...ordered.map((dimension) => dimension.evidenceCount));
    return {
      grid: CHART_GRID,
      xAxis: {
        id: "personal-radar-x",
        ...makeAxis("INTEREST DIMENSION"),
        type: "category",
        data: ordered.map((dimension) => dimension.label),
        axisLabel: {
          ...makeAxis("").axisLabel,
          rotate: 24,
          fontSize: 9.2,
          interval: 0,
        },
        splitLine: { show: false },
      },
      yAxis: {
        id: "personal-radar-y",
        ...makeAxis("EVIDENCE EVENTS"),
        type: "value",
        min: 0,
        max: Math.max(4, Math.ceil(maxEvidence * 1.2)),
        minInterval: 1,
        splitNumber: 4,
      },
      series: [
        {
          id: "personal-radar-profile",
          type: "bar",
          universalTransition: true,
          animationDurationUpdate: seriesDuration,
          animationEasingUpdate: "cubicInOut",
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
        guideSeries(
          "personal-radar-guide-primary",
          [{ yAxis: Math.max(1, Math.ceil(maxEvidence / 2)) }]
        ),
      ],
    };
  }

  if (view === "freshness") {
    const ordered = orderedForView(view, dimensions);
    return {
      grid: CHART_GRID,
      xAxis: {
        id: "personal-radar-x",
        ...makeAxis("FRESHNESS %"),
        type: "value",
        min: 0,
        max: 100,
        interval: 25,
        axisLabel: {
          ...makeAxis("").axisLabel,
          formatter: "{value}%",
        },
      },
      yAxis: {
        id: "personal-radar-y",
        ...makeAxis("INTEREST DIMENSION"),
        type: "category",
        inverse: true,
        data: ordered.map((dimension) => dimension.label),
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: {
          ...makeAxis("").axisLabel,
          color: MUTED,
          fontSize: 9.2,
          fontWeight: 620,
          margin: 12,
        },
      },
      series: [
        {
          id: "personal-radar-freshness-track",
          type: "bar",
          silent: true,
          z: 1,
          barWidth: 4,
          animationDurationUpdate: supportDuration,
          animationEasingUpdate: "cubicOut",
          data: ordered.map((dimension) => dimension.freshness * 100),
          itemStyle: { color: GRID_MAJOR },
          showBackground: true,
          backgroundStyle: { color: TRACK },
        },
        {
          id: "personal-radar-profile",
          type: "scatter",
          z: 3,
          universalTransition: true,
          animationDurationUpdate: seriesDuration,
          animationEasingUpdate: "cubicInOut",
          symbolSize: (value: Array<number | string>) =>
            10 + Math.max(0, Number(value[2] ?? 0)) * 0.2,
          data: ordered.map((dimension) => ({
            name: dimension.label,
            value: [
              dimension.freshness * 100,
              dimension.label,
              dimension.confidence * 100,
            ],
            groupId: dimension.key,
            itemStyle: { color: shade(dimension) },
          })),
          label: { show: false },
          emphasis: {
            focus: "self",
            itemStyle: { borderColor: INK, borderWidth: 1.2 },
          },
        },
        guideSeries("personal-radar-guide-primary", [{ xAxis: 50 }]),
      ],
    };
  }

  const xValues = dimensions.map((dimension) => dimension.behaviorSignal);
  const minX = Math.min(0, Math.floor(Math.min(...xValues) - 1));
  const maxX = Math.max(1, Math.ceil(Math.max(...xValues) + 1));
  const maxConfidence = Math.max(...dimensions.map((dimension) => dimension.confidence * 100));
  const confidenceCeiling = Math.min(
    100,
    Math.max(20, Math.ceil((maxConfidence + 8) / 10) * 10)
  );

  return {
    grid: CHART_GRID,
    xAxis: {
      id: "personal-radar-x",
      ...makeAxis("SIGNED LIVE SIGNAL"),
      type: "value",
      min: minX,
      max: maxX,
      splitNumber: 5,
    },
    yAxis: {
      id: "personal-radar-y",
      ...makeAxis("CONFIDENCE %"),
      type: "value",
      min: 0,
      max: confidenceCeiling,
      splitNumber: 5,
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
        animationDurationUpdate: seriesDuration,
        animationEasingUpdate: "cubicInOut",
        symbolSize: (value: number[]) => 10 + Math.sqrt(Number(value[2] ?? 1)) * 5.4,
        data: dimensions.map((dimension) => ({
          name: dimension.label,
          value: [
            dimension.behaviorSignal,
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
          fontSize: 9.2,
          fontWeight: 620,
          formatter: "{b}",
        },
        emphasis: {
          focus: "self",
          label: { color: INK, fontWeight: 760 },
        },
      },
      guideSeries("personal-radar-guide-primary", [{ xAxis: 0 }], GRID_ZERO, 1.7),
      guideSeries(
        "personal-radar-guide-secondary",
        [{ yAxis: Math.round(confidenceCeiling / 2) }]
      ),
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
  const inspectionPauseRef = useRef(false);
  const manualPauseTimerRef = useRef<number | null>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [view, setView] = useState<RadarView>("strength");
  const [reduceMotion, setReduceMotion] = useState(false);
  const [manualHold, setManualHold] = useState(false);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const points = useMemo(() => dimensions.slice(0, 12), [dimensions]);
  const activeOrder = useMemo(() => orderedForView(view, points), [view, points]);
  const viewCopy = VIEW_COPY[view];
  const hoveredDimension = hoveredKey
    ? points.find((dimension) => dimension.key === hoveredKey) ?? null
    : null;

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
    const labelToKey = new Map(points.map((dimension) => [dimension.label, dimension.key] as const));
    const handleChartOver: EChartsHandler = (params) => {
      if (params?.seriesId !== "personal-radar-profile") return;
      const key = groupIdFromParams(params) ?? labelToKey.get(params.name ?? "");
      if (!key) return;
      inspectionPauseRef.current = true;
      setHoveredKey(key);
    };
    const handleChartOut: EChartsHandler = () => {
      inspectionPauseRef.current = false;
      setHoveredKey(null);
    };

    chartInstanceRef.current = chart;
    chart.clear();
    chart.setOption({
      animationDurationUpdate: 0,
      tooltip: {
        trigger: "item",
        backgroundColor: "rgba(28,28,26,.96)",
        borderColor: "rgba(109,210,255,.24)",
        borderWidth: 1,
        padding: [10, 12],
        extraCssText: "box-shadow:0 14px 38px rgba(0,0,0,.18);border-radius:0;",
        textStyle: { color: PAPER, fontSize: 11 },
        formatter: (params: EChartsEventParams | EChartsEventParams[]) => tooltipMarkup(params, points),
      },
      ...buildView("strength", points, reduceMotion),
    });
    chart.on("mouseover", handleChartOver);
    chart.on("globalout", handleChartOut);

    const resize = () => chart.resize();
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      chart.off("mouseover", handleChartOver);
      chart.off("globalout", handleChartOut);
      chart.dispose();
      chartInstanceRef.current = null;
    };
  }, [scriptReady, points, reduceMotion]);

  useEffect(() => {
    const chart = chartInstanceRef.current;
    if (!scriptReady || !chart || points.length === 0) return;
    chart.setOption(
      {
        animationDurationUpdate: 0,
        ...buildView(view, points, reduceMotion),
      },
      { replaceMerge: ["series"] }
    );
  }, [view, points, reduceMotion, scriptReady]);

  useEffect(() => {
    if (reduceMotion) return;
    const timer = window.setInterval(() => {
      if (manualPauseRef.current || inspectionPauseRef.current) return;
      setHoveredKey(null);
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
    setManualHold(true);
    setHoveredKey(null);
    inspectionPauseRef.current = false;
    if (manualPauseTimerRef.current !== null) {
      window.clearTimeout(manualPauseTimerRef.current);
    }
    manualPauseTimerRef.current = window.setTimeout(() => {
      manualPauseRef.current = false;
      setManualHold(false);
      manualPauseTimerRef.current = null;
    }, 7000);
    setView(next);
  }

  function focusDimension(dimension: PersonalRadarDimension) {
    inspectionPauseRef.current = true;
    setHoveredKey(dimension.key);
    const chart = chartInstanceRef.current;
    const dataIndex = activeOrder.findIndex((item) => item.key === dimension.key);
    if (!chart || dataIndex < 0) return;
    chart.dispatchAction({ type: "downplay", seriesId: "personal-radar-profile" });
    chart.dispatchAction({
      type: "highlight",
      seriesId: "personal-radar-profile",
      dataIndex,
    });
    chart.dispatchAction({
      type: "showTip",
      seriesId: "personal-radar-profile",
      dataIndex,
    });
  }

  function clearDimensionFocus() {
    inspectionPauseRef.current = false;
    setHoveredKey(null);
    const chart = chartInstanceRef.current;
    if (!chart) return;
    chart.dispatchAction({ type: "downplay", seriesId: "personal-radar-profile" });
    chart.dispatchAction({ type: "hideTip" });
  }

  const statusCopy = hoveredDimension
    ? `FOCUS · ${hoveredDimension.label}`
    : manualHold
      ? "MANUAL HOLD · AUTO RESUMES IN 7S"
      : reduceMotion
        ? "REDUCED MOTION · MANUAL VIEWS"
        : "AUTO MORPH 3S · HOVER PAUSES INSPECTION";

  return (
    <div
      className={`${styles.morphWorkspace} ${polish.morphWorkspace} ${delight.workspace}`}
      data-radar-workspace
      data-view={view}
      data-manual={manualHold ? "true" : "false"}
      data-focused={hoveredKey ? "true" : "false"}
    >
      <Script
        src="https://cdn.jsdelivr.net/npm/echarts@6/dist/echarts.min.js"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
        onReady={() => setScriptReady(true)}
      />

      <div className={`${styles.morphRail} ${polish.morphRail} ${delight.rail}`} aria-label="Personal Radar views">
        <div key={view} className={`${styles.morphRailHead} ${polish.morphRailHead} ${delight.railHead}`}>
          <span>G9 · ONE PROFILE, THREE VIEWS</span>
          <strong>{viewCopy.title}</strong>
          <p>{viewCopy.note}</p>
        </div>
        <div className={`${styles.morphButtons} ${polish.morphButtons} ${delight.buttons}`}>
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
        <div className={`${styles.morphLegend} ${delight.legend}`}>
          <span><i className={styles.legendHero} /> strongest live signal</span>
          <span><i /> same interest identity</span>
          <span data-radar-focus-status>{statusCopy}</span>
        </div>
      </div>

      <div
        className={`${styles.morphPlotWrap} ${polish.morphPlotWrap} ${delight.plotWrap}`}
        data-view={view}
      >
        <div
          ref={chartRef}
          className={`${styles.morphPlot} ${polish.morphPlot} ${delight.plot}`}
          role="img"
          aria-label={`Personal Radar ${view} view. The same interest dimensions transition between strength, evidence, and freshness.`}
        />
        {!scriptReady ? <div className={styles.morphLoading}>LOADING G9 INSTRUMENT…</div> : null}
        <div className={`${styles.morphSource} ${delight.source}`}>
          LIEFLAT G9 MORPH · F11 TICK GAUGE SMALL MULTIPLES · GROUP ID = INTEREST DIMENSION
        </div>
      </div>

      <aside className={`${styles.morphReadout} ${polish.morphReadout} ${delight.readout}`}>
        <div className={styles.morphReadoutHead}>
          <span>LIVE EVIDENCE LEDGER</span>
          <strong>{points.length} DIMENSIONS IN VIEW</strong>
        </div>
        <div className={styles.morphReadoutLabels}>
          <span>INTEREST</span><span>S</span><span>E</span><span>F</span>
        </div>
        {points.slice(0, 8).map((dimension, index) => (
          <div
            className={`${styles.morphReadoutRow} ${delight.readoutRow}`}
            key={dimension.key}
            data-interest-key={dimension.key}
            data-active={hoveredKey === dimension.key ? "true" : "false"}
            tabIndex={0}
            aria-label={`Trace ${dimension.label} across the active chart`}
            onMouseEnter={() => focusDimension(dimension)}
            onMouseLeave={clearDimensionFocus}
            onFocus={() => focusDimension(dimension)}
            onBlur={clearDimensionFocus}
          >
            <strong>{String(index + 1).padStart(2, "0")} · {dimension.label}</strong>
            <span>{signal(dimension.behaviorSignal)}</span>
            <span>{dimension.evidenceCount}</span>
            <span>{percentage(dimension.freshness)}</span>
          </div>
        ))}
        <p>
          S = signed live signal · E = contributing events · F = freshness. Hover either the chart or ledger to trace one interest across the instrument.
        </p>
      </aside>
    </div>
  );
}
