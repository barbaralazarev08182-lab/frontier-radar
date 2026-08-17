export default function TodayLoading() {
  const rows = [
    { width: "72%", accent: "core", delay: "0ms" },
    { width: "61%", accent: "core", delay: "70ms" },
    { width: "78%", accent: "core", delay: "140ms" },
    { width: "66%", accent: "core", delay: "210ms" },
    { width: "71%", accent: "core", delay: "280ms" },
    { width: "78%", accent: "adjacent", delay: "350ms" },
    { width: "62%", accent: "wildcard", delay: "420ms" },
  ];

  return (
    <div className="fixed inset-x-0 bottom-0 top-12 z-[90] overflow-hidden bg-[#f1eee5] text-[#111214]">
      <style>{`
        @keyframes fr-today-field-scan {
          0% { transform: translate3d(-18vw, 0, 0); opacity: 0; }
          18% { opacity: .68; }
          72% { opacity: .42; }
          100% { transform: translate3d(118vw, 0, 0); opacity: 0; }
        }
        @keyframes fr-today-row-resolve {
          0% { transform: translateX(14px); opacity: .18; filter: blur(2px); }
          45% { opacity: .82; filter: blur(0); }
          100% { transform: translateX(0); opacity: 1; filter: blur(0); }
        }
        @keyframes fr-today-aperture-pulse {
          0%, 100% { opacity: .14; transform: scaleX(.82); }
          50% { opacity: .72; transform: scaleX(1); }
        }
        @keyframes fr-today-orbit-drift {
          0%, 100% { transform: translate3d(0, 0, 0) rotate(0deg); }
          50% { transform: translate3d(-18px, 9px, 0) rotate(.7deg); }
        }
        .fr-today-field-scan {
          animation: fr-today-field-scan 1.55s cubic-bezier(.2,.72,.18,1) infinite;
        }
        .fr-today-loading-row {
          animation: fr-today-row-resolve .58s cubic-bezier(.16,1,.3,1) both;
        }
        .fr-today-aperture {
          animation: fr-today-aperture-pulse 1.35s ease-in-out infinite;
        }
        .fr-today-loading-orbit {
          animation: fr-today-orbit-drift 7s ease-in-out infinite;
          transform-origin: 72% 38%;
        }
        @media (prefers-reduced-motion: reduce) {
          .fr-today-field-scan,
          .fr-today-loading-row,
          .fr-today-aperture,
          .fr-today-loading-orbit { animation: none !important; }
        }
      `}</style>

      <div
        className="pointer-events-none absolute inset-0 opacity-[0.42]"
        aria-hidden
        style={{
          backgroundImage:
            "linear-gradient(rgba(17,18,20,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(17,18,20,.045) 1px, transparent 1px)",
          backgroundSize: "84px 84px",
        }}
      />

      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute left-[8%] top-[15%] h-[58%] w-[44%] rounded-full bg-[radial-gradient(circle,rgba(49,80,255,.075)_0%,rgba(49,80,255,.025)_38%,transparent_72%)] blur-2xl" />
        <div className="absolute right-[4%] top-[6%] h-[64%] w-[54%] rounded-full bg-[radial-gradient(circle,rgba(17,18,20,.038)_0%,transparent_68%)]" />
      </div>

      <svg className="fr-today-loading-orbit pointer-events-none absolute inset-0 h-full w-full opacity-[0.34]" viewBox="0 0 1600 900" preserveAspectRatio="none" aria-hidden>
        <ellipse cx="1228" cy="258" rx="390" ry="176" fill="none" stroke="rgba(28,28,26,.16)" strokeWidth="1" />
        <ellipse cx="1228" cy="258" rx="298" ry="129" fill="none" stroke="rgba(28,28,26,.11)" strokeWidth="1" />
        <ellipse cx="1228" cy="258" rx="210" ry="87" fill="none" stroke="rgba(49,80,255,.15)" strokeWidth="1" />
        <path d="M70 692 C 230 420, 390 390, 565 430 C 720 464, 816 606, 892 810" fill="none" stroke="rgba(28,28,26,.105)" strokeWidth="1" />
        <circle cx="1388" cy="292" r="3.5" fill="rgba(49,80,255,.72)" />
        <circle cx="1102" cy="166" r="2.5" fill="rgba(28,28,26,.32)" />
      </svg>

      <div className="relative grid h-full grid-cols-1 lg:grid-cols-[minmax(0,.76fr)_minmax(620px,1.24fr)]">
        <section className="flex min-h-0 flex-col justify-between border-r border-black/[0.08] px-8 py-8 sm:px-12 lg:px-[clamp(42px,5vw,86px)] lg:py-[clamp(44px,7vh,78px)]">
          <div>
            <div className="flex items-center gap-3 font-mono text-[8px] font-black uppercase tracking-[0.16em] text-black/48">
              <span className="h-1.5 w-1.5 rounded-full bg-[#3150ff]" />
              <span>FRONTIER RADAR / TODAY</span>
              <span className="text-[#3150ff]">FIELD RESOLVING</span>
            </div>

            <div className="mt-[clamp(40px,8vh,90px)] max-w-[700px]">
              <div className="overflow-hidden">
                <span className="block text-[clamp(54px,7vw,112px)] font-black leading-[.79] tracking-[-.075em] text-black/[0.17]">FIND</span>
              </div>
              <div className="overflow-hidden">
                <span className="block text-[clamp(54px,7vw,112px)] font-black leading-[.79] tracking-[-.075em] text-black/[0.12]">WHAT&apos;S</span>
              </div>
              <div className="overflow-hidden">
                <span className="block text-[clamp(54px,7vw,112px)] font-black leading-[.79] tracking-[-.075em] text-[#3150ff]/25">NEXT</span>
              </div>
            </div>
          </div>

          <div className="max-w-md pb-2">
            <div className="mb-4 flex items-center gap-3">
              <span className="fr-today-aperture h-[2px] w-20 origin-left bg-[#3150ff]" />
              <span className="h-px flex-1 bg-black/10" />
            </div>
            <p className="font-mono text-[8px] font-extrabold uppercase tracking-[0.13em] text-black/42">
              RESOLVING TODAY&apos;S SIGNAL FIELD · 07 CANDIDATES
            </p>
          </div>
        </section>

        <section className="relative flex min-h-0 flex-col justify-center px-8 py-8 sm:px-12 lg:px-[clamp(46px,5.2vw,92px)]">
          <div className="absolute inset-y-0 left-0 w-px bg-black/[0.04]" aria-hidden />
          <div className="relative overflow-hidden border-y border-black/20 bg-[#f5f2e9]/55 shadow-[0_24px_70px_rgba(17,18,20,.045)] backdrop-blur-[2px]">
            <div className="fr-today-field-scan pointer-events-none absolute inset-y-0 left-0 z-20 w-[18%] bg-gradient-to-r from-transparent via-white/55 to-transparent blur-[1px]" aria-hidden />

            <div className="flex h-9 items-center justify-between border-b border-black/10 px-4 font-mono text-[7px] font-black uppercase tracking-[0.14em] text-black/38">
              <span>07 SIGNALS / DAILY DISCOVERY</span>
              <span>CORE · CORE · CORE · CORE · CORE · ADJ · WILD</span>
            </div>

            {rows.map((row, index) => {
              const adjacent = row.accent === "adjacent";
              const wildcard = row.accent === "wildcard";
              const accent = adjacent ? "#3150ff" : wildcard ? "#f15424" : "#6f8f8a";
              const wash = adjacent ? "rgba(49,80,255,.095)" : wildcard ? "rgba(241,84,36,.085)" : "rgba(71,92,88,.045)";

              return (
                <div
                  key={index}
                  className="fr-today-loading-row grid h-[clamp(56px,8.1vh,78px)] grid-cols-[48px_1fr_70px] items-center border-b border-black/[0.085] px-4 last:border-b-0"
                  style={{ animationDelay: row.delay, background: wash }}
                >
                  <span className="font-mono text-[9px] font-black tracking-[0.04em]" style={{ color: accent }}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0">
                    <div className="h-[11px] max-w-[560px]" style={{ width: row.width, background: adjacent || wildcard ? `${accent}22` : "rgba(17,18,20,.075)" }} />
                    <div className="mt-2 h-[5px] w-[34%] bg-black/[0.045]" />
                  </div>
                  <div className="justify-self-end">
                    <span className="block h-[2px] w-8" style={{ background: accent, opacity: adjacent || wildcard ? .55 : .18 }} />
                    <span className="mt-2 block h-[5px] w-6 bg-black/[0.06]" />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 flex items-center justify-between font-mono text-[7px] font-extrabold uppercase tracking-[0.13em] text-black/34">
            <span>APERTURE / LIVE FIELD</span>
            <span>PREPARING TODAY</span>
          </div>
        </section>
      </div>
    </div>
  );
}
