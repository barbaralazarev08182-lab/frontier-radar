export default function ExploreLoading() {
  return (
    <div className="min-h-[calc(100vh-3.5rem)] overflow-hidden bg-[#f3f0e7] px-6 pb-10 pt-12 text-[#17181a] sm:px-10">
      <style>{`
        @keyframes fr-explore-loading-thread {
          0% { stroke-dashoffset: 1; opacity: .22; }
          45% { opacity: .68; }
          100% { stroke-dashoffset: 0; opacity: .18; }
        }
        .fr-explore-loading-thread { stroke-dasharray: 1; stroke-dashoffset: 1; animation: fr-explore-loading-thread 1.2s ease-in-out infinite; }
      `}</style>

      <div className="mx-auto w-full max-w-[1480px]">
        <div className="flex items-center justify-between border-y border-black/15 py-3 font-mono text-[8px] font-black uppercase tracking-[0.16em] text-black/50">
          <span>02 EXPLORE · FRONTIER FIELD</span>
          <span className="text-[#3150ff]">L12 TYPE COLONNADE</span>
          <span>RESOLVING LIVE DATA</span>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <div className="h-9 w-[56%] bg-black/[0.075]" />
            <div className="mt-3 h-3 w-[38%] bg-black/[0.05]" />
          </div>
          <div className="flex gap-3 font-mono text-[8px] font-extrabold uppercase tracking-[0.12em] text-black/32">
            <span>FOR YOU</span><span>ADJACENT</span><span>RISING</span><span>NEW</span><span>WILDCARD</span>
          </div>
        </div>

        <div className="relative mt-10 h-[560px] border-y border-black/15">
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1280 560" preserveAspectRatio="none" aria-hidden="true">
            <line x1="500" y1="24" x2="500" y2="536" stroke="rgba(0,0,0,.14)" />
            <line x1="1010" y1="36" x2="1010" y2="524" stroke="rgba(0,0,0,.1)" />
            {Array.from({ length: 13 }).map((_, index) => {
              const y = 42 + index * 38;
              const endY = 80 + (index % 5) * 92;
              return (
                <g key={index}>
                  <line x1="42" y1={y} x2={420 - (index % 3) * 34} y2={y} stroke="rgba(0,0,0,.075)" strokeWidth="8" />
                  <path className="fr-explore-loading-thread" pathLength="1" d={`M 506 ${y} C 700 ${y} 830 ${endY} 997 ${endY}`} fill="none" stroke="rgba(49,80,255,.34)" strokeWidth="1.2" style={{ animationDelay: `${index * 45}ms` }} />
                </g>
              );
            })}
            {[80, 172, 264, 356, 448].map((y, index) => (
              <g key={y}>
                <circle cx="1010" cy={y} r={10 + index * 1.4} fill="rgba(49,80,255,.08)" stroke="rgba(49,80,255,.18)" />
                <line x1="1030" y1={y} x2="1100" y2={y} stroke="rgba(0,0,0,.1)" strokeWidth="5" />
              </g>
            ))}
          </svg>
        </div>

        <div className="mt-4 flex justify-between font-mono text-[8px] font-extrabold uppercase tracking-[0.13em] text-black/35">
          <span>RANK · GLOBAL / LENS</span>
          <span>BUILDING SHARED TAG FAMILIES</span>
        </div>
      </div>
    </div>
  );
}
