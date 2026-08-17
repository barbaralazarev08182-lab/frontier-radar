export default function ProjectLoading() {
  return (
    <div className="relative min-h-[78vh] overflow-hidden bg-[#f5f1e8] px-6 pb-16 pt-20 text-[#111214] sm:px-10 lg:px-14" aria-live="polite" aria-label="Opening project intelligence">
      <style>{`
        @keyframes fr-project-load-trace {
          0% { transform: translateX(-105%); opacity: .35; }
          35% { opacity: 1; }
          100% { transform: translateX(325%); opacity: .2; }
        }
        .fr-project-load-trace { animation: fr-project-load-trace 1.05s cubic-bezier(.2,.7,.2,1) infinite; }
      `}</style>

      <div className="mx-auto w-full max-w-[1320px]">
        <div className="flex items-center justify-between border-y border-black/15 py-3 font-mono text-[9px] font-black uppercase tracking-[0.16em]">
          <span>03 PROJECT · RESOLVING SIGNAL</span>
          <span className="text-[#3150ff]">RESEARCH MODE</span>
        </div>

        <div className="relative mt-7 h-[3px] overflow-hidden bg-black/10">
          <span className="fr-project-load-trace absolute inset-y-0 left-0 w-[34%] bg-[#3150ff]" />
          <span className="absolute right-0 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-[#f5572f]" />
        </div>

        <div className="mt-5 flex items-center justify-between font-mono text-[8px] font-extrabold uppercase tracking-[0.13em] text-black/45">
          <span>CAPTURE</span>
          <span>EVIDENCE</span>
          <span>INTERROGATION</span>
          <span>RESOLUTION</span>
          <span>BUILD</span>
        </div>

        <div className="mt-14 grid gap-10 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div>
            <div className="mb-5 h-2 w-56 bg-black/10" />
            <div className="h-12 w-[88%] bg-black/[0.075]" />
            <div className="mt-3 h-12 w-[68%] bg-black/[0.075]" />
            <div className="mt-8 h-3 w-[92%] bg-black/[0.055]" />
            <div className="mt-2 h-3 w-[78%] bg-black/[0.055]" />
            <div className="mt-2 h-3 w-[61%] bg-black/[0.055]" />
          </div>
          <aside className="border-l-2 border-[#3150ff] bg-white/35 p-6 shadow-[8px_8px_0_rgba(49,80,255,.08)]">
            <div className="h-2 w-28 bg-black/10" />
            <div className="mt-6 h-16 w-20 bg-[#3150ff]/12" />
            <div className="mt-5 h-3 w-full bg-black/[0.06]" />
            <div className="mt-2 h-3 w-3/4 bg-black/[0.06]" />
          </aside>
        </div>

        <div className="mt-16 grid gap-3 border-t border-black/15 pt-5 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-20 border-b border-black/10 bg-white/20" />
          ))}
        </div>
      </div>
    </div>
  );
}
