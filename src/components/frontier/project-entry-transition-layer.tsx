"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

const PROJECT_ENTRY_EVENT = "fr:project-entry-transition";
const MIN_VISIBLE_MS = 900;
const SAFETY_TIMEOUT_MS = 2600;

export function startProjectEntryTransition() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(PROJECT_ENTRY_EVENT));
}

function ProjectEntryTransitionScene() {
  const stages = ["CAPTURE", "EVIDENCE", "INTERROGATION", "RESOLUTION", "BUILD"];

  return (
    <div
      className="fixed inset-x-0 bottom-0 top-12 z-[70] overflow-hidden bg-[#f1eee5] text-[#111214]"
      aria-live="polite"
      aria-label="Opening project intelligence"
    >
      <style>{`
        @keyframes fr-project-load-sweep {
          0% { transform: translateX(-118%); opacity: 0; }
          14% { opacity: .9; }
          72% { opacity: .9; }
          100% { transform: translateX(360%); opacity: 0; }
        }
        @keyframes fr-project-load-orbit {
          0%, 100% { transform: rotate(-1.2deg) translate3d(0,0,0); }
          50% { transform: rotate(1.2deg) translate3d(10px,-6px,0); }
        }
        @keyframes fr-project-load-pulse {
          0%, 100% { opacity: .26; transform: scale(1); }
          48% { opacity: .9; transform: scale(1.12); }
        }
        @keyframes fr-project-load-reveal {
          0%, 18% { opacity: .18; transform: translateY(5px); }
          42%, 100% { opacity: 1; transform: translateY(0); }
        }
        .fr-project-load-sweep { animation: fr-project-load-sweep 1.65s cubic-bezier(.24,.72,.22,1) infinite; }
        .fr-project-load-orbit { animation: fr-project-load-orbit 6.8s ease-in-out infinite; transform-origin: center; }
        .fr-project-load-beacon { animation: fr-project-load-pulse 1.35s ease-in-out infinite; }
        .fr-project-load-reveal { animation: fr-project-load-reveal 1.15s cubic-bezier(.2,.7,.2,1) both; }
      `}</style>

      <div
        className="pointer-events-none absolute inset-0 opacity-[0.52]"
        aria-hidden="true"
        style={{
          backgroundImage:
            "linear-gradient(rgba(17,18,20,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(17,18,20,.035) 1px,transparent 1px)",
          backgroundSize: "78px 78px",
        }}
      />

      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="fr-project-load-orbit absolute -right-[7vw] top-[7vh] h-[52vw] w-[52vw] rounded-full border border-black/[0.045]" />
        <div className="fr-project-load-orbit absolute -right-[1vw] top-[13vh] h-[40vw] w-[40vw] rounded-full border border-black/[0.04]" />
        <div className="absolute left-[8vw] top-[18vh] h-[46vh] w-px rotate-[24deg] bg-black/[0.045]" />
        <div className="absolute left-[18vw] top-[10vh] h-[72vh] w-px rotate-[24deg] bg-black/[0.035]" />
        <div className="absolute bottom-[9vh] left-[6vw] h-px w-[26vw] bg-black/[0.055]" />
        <div className="absolute bottom-[9vh] left-[6vw] h-4 w-px bg-[#f15424]/55" />
      </div>

      <div className="relative mx-auto flex h-full w-full max-w-[1540px] flex-col px-8 pb-8 pt-8 sm:px-12 lg:px-16">
        <header className="flex items-center justify-between border-y border-black/[0.15] py-3 font-mono text-[8px] font-black uppercase tracking-[0.16em]">
          <span>03 PROJECT / SIGNAL RESOLUTION</span>
          <div className="flex items-center gap-3">
            <span className="text-black/38">LIVE RESEARCH HANDOFF</span>
            <span className="text-[#3150ff]">RESEARCH MODE</span>
          </div>
        </header>

        <div className="relative mt-5 h-[3px] overflow-hidden bg-black/[0.085]">
          <span className="fr-project-load-sweep absolute inset-y-0 left-0 w-[28%] bg-[#3150ff] shadow-[0_0_18px_rgba(49,80,255,.24)]" />
          <span className="fr-project-load-beacon absolute right-0 top-1/2 h-[7px] w-[7px] -translate-y-1/2 rounded-full bg-[#f15424]" />
        </div>

        <div className="mt-4 grid grid-cols-5 gap-2 font-mono text-[7px] font-black uppercase tracking-[0.14em] text-black/38">
          {stages.map((stage, index) => (
            <div key={stage} className="flex items-center gap-2">
              <span className={index === 0 ? "text-[#3150ff]" : "text-black/22"}>{String(index + 1).padStart(2, "0")}</span>
              <span>{stage}</span>
            </div>
          ))}
        </div>

        <main className="grid min-h-0 flex-1 items-center gap-14 py-8 lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,.55fr)]">
          <section className="fr-project-load-reveal max-w-[980px]">
            <div className="mb-5 flex items-center gap-3 font-mono text-[8px] font-black uppercase tracking-[0.16em] text-black/38">
              <span className="text-[#3150ff]">CAPTURE</span>
              <span className="h-px w-14 bg-black/12" />
              <span>RESOLVING PRIMARY SIGNAL</span>
            </div>

            <h1 className="m-0 max-w-[900px] text-[clamp(54px,6.3vw,104px)] font-black leading-[0.87] tracking-[-0.065em]">
              RESOLVING
              <br />
              PROJECT
              <br />
              SIGNAL<span className="text-[#3150ff]">.</span>
            </h1>

            <div className="mt-9 max-w-[760px] border-t border-black/[0.12] pt-5">
              <div className="h-[10px] w-[92%] bg-black/[0.055]" />
              <div className="mt-3 h-[10px] w-[74%] bg-black/[0.045]" />
              <div className="mt-3 h-[10px] w-[57%] bg-black/[0.035]" />
            </div>
          </section>

          <aside className="relative self-center border-l border-black/[0.14] pl-7 lg:pl-9">
            <div className="absolute -left-[3px] top-0 h-16 w-[5px] bg-[#3150ff]" />
            <div className="font-mono text-[8px] font-black uppercase tracking-[0.15em] text-black/42">EVIDENCE CHANNEL</div>
            <div className="mt-5 text-[clamp(38px,4vw,66px)] font-black leading-none tracking-[-0.055em] text-black/[0.82]">TRACE<br/>→ READ<br/>→ VERIFY</div>
            <div className="mt-8 grid gap-3">
              <div className="flex items-center gap-3"><span className="h-1.5 w-1.5 rounded-full bg-[#3150ff]"/><span className="h-px flex-1 bg-black/10"/></div>
              <div className="flex items-center gap-3"><span className="h-1.5 w-1.5 rounded-full bg-black/15"/><span className="h-px w-[78%] bg-black/[0.075]"/></div>
              <div className="flex items-center gap-3"><span className="fr-project-load-beacon h-1.5 w-1.5 rounded-full bg-[#f15424]"/><span className="h-px w-[58%] bg-black/[0.055]"/></div>
            </div>
          </aside>
        </main>

        <footer className="grid grid-cols-[1fr_auto] items-end gap-6 border-t border-black/[0.14] pt-4">
          <div className="grid grid-cols-3 gap-6">
            {["SOURCE LEDGER", "SCORE FIELD", "BUILD DIRECTION"].map((label, index) => (
              <div key={label} className="border-t border-black/[0.08] pt-3">
                <div className="font-mono text-[7px] font-black uppercase tracking-[0.14em] text-black/30">0{index + 1} / {label}</div>
                <div className="mt-3 h-[7px] bg-black/[0.035]" style={{ width: `${82 - index * 11}%` }} />
              </div>
            ))}
          </div>
          <div className="font-mono text-[7px] font-black uppercase tracking-[0.14em] text-black/32">ASSEMBLING RESEARCH DOCUMENT</div>
        </footer>
      </div>
    </div>
  );
}

export function ProjectEntryTransitionLayer() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const startedAtRef = useRef(0);
  const safetyTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const begin = () => {
      startedAtRef.current = performance.now();
      setActive(true);
      if (safetyTimerRef.current !== null) window.clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = window.setTimeout(() => setActive(false), SAFETY_TIMEOUT_MS);
    };

    const onExploreProjectClick = (event: MouseEvent) => {
      if (!window.location.pathname.startsWith("/explore")) return;
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target : null;
      const anchor = target?.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin || !url.pathname.startsWith("/project/")) return;
      begin();
    };

    window.addEventListener(PROJECT_ENTRY_EVENT, begin);
    document.addEventListener("click", onExploreProjectClick, true);
    return () => {
      window.removeEventListener(PROJECT_ENTRY_EVENT, begin);
      document.removeEventListener("click", onExploreProjectClick, true);
      if (safetyTimerRef.current !== null) window.clearTimeout(safetyTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!active || !pathname.startsWith("/project/")) return;
    const elapsed = performance.now() - startedAtRef.current;
    const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed);
    const timer = window.setTimeout(() => setActive(false), remaining);
    return () => window.clearTimeout(timer);
  }, [active, pathname]);

  return active ? <ProjectEntryTransitionScene /> : null;
}
