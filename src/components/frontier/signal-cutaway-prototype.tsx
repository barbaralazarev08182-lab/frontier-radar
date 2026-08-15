"use client";

import { useState } from "react";
import styles from "./signal-cutaway-prototype.module.css";

type Lane = "core" | "adjacent" | "wildcard";

type CutawaySignal = {
  rank: string;
  title: string;
  topic: string;
  lane: Lane;
  source: string;
  contentType: string;
  score: number;
  summary: string;
  whyNow: string;
  whyYou: string | null;
  build: string;
  sourceCount: number;
  crossSource: boolean;
  metric: string | null;
  hasCode: boolean;
  hasDemo: boolean;
};

const SIGNALS: CutawaySignal[] = [
  {
    rank: "01",
    title: "Weyna — Local-first runtime dashboard for Node.js back ends",
    topic: "LOCAL-FIRST",
    lane: "core",
    source: "SHOW HN",
    contentType: "PRODUCT",
    score: 75,
    summary: "把服务运行状态、日志与本地调试收回到一个无需云端控制面的运行时工作台。",
    whyNow: "Local-first tooling 正从“离线可用”推进到真正承担开发基础设施；这类项目开始从理念变成可直接替代 SaaS 的工作流。",
    whyYou: "与你近期持续关注的 developer tools / local-first / agent infrastructure 重合，同时保留足够强的产品形态。",
    build: "把 local runtime + agent memory + project telemetry 组合成一个完全本地的 AI 开发运行台。",
    sourceCount: 3,
    crossSource: true,
    metric: "3 SOURCES / EARLY SIGNAL",
    hasCode: true,
    hasDemo: true,
  },
  {
    rank: "02",
    title: "A deliberately narrow business search tool",
    topic: "LICENSE-SEARCH",
    lane: "core",
    source: "SHOW HN",
    contentType: "TOOL",
    score: 76,
    summary: "A narrow retrieval utility built around one concrete business workflow.",
    whyNow: "Vertical search is becoming useful again when the workflow itself is narrow enough to make precision more valuable than breadth.",
    whyYou: null,
    build: "Treat one research workflow as a complete searchable instrument instead of another general assistant.",
    sourceCount: 1,
    crossSource: false,
    metric: null,
    hasCode: false,
    hasDemo: true,
  },
  {
    rank: "03",
    title: "LymeScribe — one computer on your network transcribes for the rest",
    topic: "LOCAL AUDIO",
    lane: "core",
    source: "SHOW HN",
    contentType: "PRODUCT",
    score: 80,
    summary: "Network-local transcription that turns one stronger machine into shared speech infrastructure.",
    whyNow: "Local speech models are now fast enough that one machine can serve an entire personal network without turning the workflow into a cloud service.",
    whyYou: "与你的 speech / speaker-recognition 研究方向直接相邻。",
    build: "A local speech bus for meetings, media, voice notes and speaker-aware memory.",
    sourceCount: 2,
    crossSource: true,
    metric: "2 SOURCES",
    hasCode: true,
    hasDemo: false,
  },
  {
    rank: "04",
    title: "Mocktail — Free, open-source mock API server with a built-in dashboard",
    topic: "MOCK-API",
    lane: "core",
    source: "SHOW HN",
    contentType: "PRODUCT",
    score: 81,
    summary: "约 25MB 的单二进制 mock API 服务，把内置仪表盘、数据库和 MCP 支持放进同一个本地工具。",
    whyNow: "刚发布或刚更新，仍处在最值得早期发现的窗口；它把 MCP 从“AI 功能”压缩成开发工具的一项普通能力。",
    whyYou: null,
    build: "在前后端解耦时模拟后端接口，并让 agent 直接读写同一套 mock state。",
    sourceCount: 1,
    crossSource: false,
    metric: "1 SOURCE / SHOW HN",
    hasCode: true,
    hasDemo: false,
  },
  {
    rank: "05",
    title: "TasmoShelf — local-first iOS / Android app for Tasmota devices",
    topic: "LOCAL-FIRST",
    lane: "core",
    source: "SHOW HN",
    contentType: "PRODUCT",
    score: 75,
    summary: "A local-first control surface for hardware already sitting on the same network.",
    whyNow: "The useful edge of local-first is moving from documents into real devices and ambient infrastructure.",
    whyYou: null,
    build: "A household device graph that stays local but can expose safe actions to agents.",
    sourceCount: 1,
    crossSource: false,
    metric: null,
    hasCode: true,
    hasDemo: false,
  },
  {
    rank: "06",
    title: "Hacker News minus the slop",
    topic: "OUTSIDE YOUR BUBBLE",
    lane: "adjacent",
    source: "SHOW HN",
    contentType: "FILTER",
    score: 75,
    summary: "把同一个公开信息流重新编辑成更少、更硬、更值得停留的阅读层。",
    whyNow: "信息过滤本身正在重新成为产品：生成式内容越多，谁能更有品味地删掉东西，谁就更有价值。",
    whyYou: "它不属于你的核心技术栈，但与 Frontier Radar 自己的“candidate quality before sophistication”原则高度相邻。",
    build: "把“删掉什么”显式化：让个人情报系统不仅解释为什么推荐，也解释为什么大部分东西没有进入视野。",
    sourceCount: 4,
    crossSource: true,
    metric: "4 SOURCES / ADJACENT",
    hasCode: true,
    hasDemo: true,
  },
  {
    rank: "07",
    title: "Procedural Generated Graffiti Wall",
    topic: "WILDCARD",
    lane: "wildcard",
    source: "SHOW HN",
    contentType: "EXPERIMENT",
    score: 76,
    summary: "一个把程序化生成直接变成可玩的视觉空间的浏览器实验。",
    whyNow: "它并不解决一个传统效率问题，但证明网页仍然可以是一件“行为中的作品”，而不是信息容器。",
    whyYou: "与你正在追求的 experimental editorial / motion-as-interface 视觉方向形成直接刺激。",
    build: "把生成规则本身做成界面：不是让 AI 生成一张页面，而是让用户操纵页面生成的物理法则。",
    sourceCount: 1,
    crossSource: false,
    metric: "1 SOURCE / VISUAL EXPERIMENT",
    hasCode: false,
    hasDemo: true,
  },
];

const PROTOTYPE_IDS = ["01", "04", "06", "07"] as const;

const CONTROL_LABEL: Record<(typeof PROTOTYPE_IDS)[number], string> = {
  "01": "CORE / FULL",
  "04": "CORE / GAP",
  "06": "ADJACENT",
  "07": "WILDCARD",
};

function laneLabel(lane: Lane) {
  if (lane === "adjacent") return "ADJACENT SIGNAL";
  if (lane === "wildcard") return "WILDCARD SIGNAL";
  return "CORE SIGNAL";
}

function PerimeterRecord({
  signal,
  onSelect,
}: {
  signal: CutawaySignal;
  onSelect: (rank: string) => void;
}) {
  const selectable = PROTOTYPE_IDS.includes(signal.rank as (typeof PROTOTYPE_IDS)[number]);
  const content = (
    <>
      <span className={styles.spineRank}>{signal.rank}</span>
      <span className={styles.spineTopic}>{signal.topic}</span>
      <strong>{signal.title}</strong>
      <i>{signal.score} FR</i>
    </>
  );

  if (selectable) {
    return (
      <button
        type="button"
        className={`${styles.spine} ${styles[`spine${signal.lane}`]}`}
        onClick={() => onSelect(signal.rank)}
        aria-label={`Inspect fixture signal ${signal.rank}`}
      >
        {content}
      </button>
    );
  }

  return <div className={`${styles.spine} ${styles[`spine${signal.lane}`]}`}>{content}</div>;
}

export function SignalCutawayPrototype() {
  const [selectedRank, setSelectedRank] = useState<(typeof PROTOTYPE_IDS)[number]>("01");
  const selected = SIGNALS.find((signal) => signal.rank === selectedRank) ?? SIGNALS[0]!;
  const context = SIGNALS.filter((signal) => signal.rank !== selected.rank);
  const topContext = context.slice(0, 3);
  const bottomContext = context.slice(3, 6);
  const sourceMarks = Array.from({ length: Math.max(1, selected.sourceCount) });

  return (
    <section
      className={styles.prototypeShell}
      data-lane={selected.lane}
      data-selected-rank={selected.rank}
      data-cutaway-prototype="true"
    >
      <div className={styles.qaMeta}>
        <span>GATE 17B-R2.1 / SIGNAL CUTAWAY</span>
        <b>VISUAL PROTOTYPE · FIXTURE DATA</b>
      </div>

      <nav className={styles.qaControls} aria-label="Signal Cutaway fixture states">
        {PROTOTYPE_IDS.map((rank) => (
          <button
            key={rank}
            type="button"
            data-active={selectedRank === rank ? "true" : "false"}
            onClick={() => setSelectedRank(rank)}
          >
            <span>{rank}</span>
            {CONTROL_LABEL[rank]}
          </button>
        ))}
      </nav>

      <div className={styles.stage}>
        <div className={styles.perimeterTop} aria-label="Other Today records">
          {topContext.map((signal) => (
            <PerimeterRecord key={signal.rank} signal={signal} onSelect={(rank) => setSelectedRank(rank as (typeof PROTOTYPE_IDS)[number])} />
          ))}
        </div>

        <article className={`${styles.cutaway} ${styles[selected.lane]}`} aria-label={`Signal Cutaway ${selected.rank}`}>
          <span className={styles.giantRank} aria-hidden="true">{selected.rank}</span>

          <header className={styles.identity}>
            <div className={styles.identityLeft}>
              <span>FR / TODAY · SIGNAL CUTAWAY</span>
              <b>{laneLabel(selected.lane)}</b>
            </div>
            <div className={styles.identityCenter}>
              <span>{selected.source}</span>
              <span>{selected.contentType}</span>
              <span>FIXTURE QA</span>
            </div>
            <div className={styles.score}>
              <span>FR SCORE</span>
              <strong>{selected.score}</strong>
            </div>
          </header>

          <div className={styles.titleBlock}>
            <span>{selected.topic}</span>
            <h1>{selected.title}</h1>
            <p>{selected.summary}</p>
          </div>

          <div className={styles.readingGrid} data-has-why-you={selected.whyYou ? "true" : "false"}>
            <section className={styles.whyNow}>
              <span>WHY NOW</span>
              <strong>{selected.whyNow}</strong>
            </section>

            {selected.whyYou ? (
              <section className={styles.whyYou}>
                <span>WHY YOU</span>
                <p>{selected.whyYou}</p>
              </section>
            ) : null}

            <section className={styles.evidence}>
              <div className={styles.evidenceHead}>
                <span>EVIDENCE TRACE</span>
                <b>{selected.crossSource ? "CROSS-SOURCE" : "SINGLE-SOURCE"}</b>
              </div>
              <div className={styles.sourceMarks} aria-label={`${selected.sourceCount} source${selected.sourceCount === 1 ? "" : "s"}`}>
                {sourceMarks.map((_, index) => <i key={index} />)}
                <em>{selected.sourceCount} {selected.sourceCount === 1 ? "SOURCE" : "SOURCES"}</em>
              </div>
              {selected.metric ? <strong className={styles.metric}>{selected.metric}</strong> : null}
              <div className={styles.evidenceWords}>
                <span>{selected.source}</span>
                {selected.hasCode ? <span>CODE</span> : null}
                {selected.hasDemo ? <span>DEMO</span> : null}
              </div>
            </section>
          </div>

          <footer className={styles.buildDirection}>
            <span>BUILD DIRECTION</span>
            <strong>{selected.build}</strong>
            <i>CLICK INTEGRATION IS OUT OF SCOPE / R2.1 VISUAL ONLY</i>
          </footer>
        </article>

        <div className={styles.perimeterBottom} aria-label="Other Today records continued">
          {bottomContext.map((signal) => (
            <PerimeterRecord key={signal.rank} signal={signal} onSelect={(rank) => setSelectedRank(rank as (typeof PROTOTYPE_IDS)[number])} />
          ))}
        </div>
      </div>
    </section>
  );
}
