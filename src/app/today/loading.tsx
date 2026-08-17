export default function TodayLoading() {
  return (
    <div className="min-h-[calc(100vh-3rem)] overflow-hidden bg-[#f1eee5] px-8 pb-8 pt-20 text-[#111214]">
      <style>{`
        @keyframes fr-today-loading-scan {
          0% { transform: translateX(-110%); opacity: .25; }
          35% { opacity: 1; }
          100% { transform: translateX(430%); opacity: .15; }
        }
        .fr-today-loading-scan { animation: fr-today-loading-scan 1.1s cubic-bezier(.2,.7,.2,1) infinite; }
      `}</style>

      <div className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-[1500px] flex-col justify-between">
        <div className="grid flex-1 items-center gap-14 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <span className="font-mono text-[9px] font-black uppercase tracking-[0.17em] text-black/48">FRONTIER RADAR / TODAY</span>
            <div className="mt-7 h-10 w-[82%] bg-black/[0.075]" />
            <div className="mt-3 h-10 w-[68%] bg-black/[0.075]" />
            <div className="mt-3 h-10 w-[51%] bg-black/[0.075]" />
            <div className="relative mt-9 h-[2px] w-52 overflow-hidden bg-black/10">
              <span className="fr-today-loading-scan absolute inset-y-0 left-0 w-16 bg-[#3150ff]" />
            </div>
            <p className="mt-3 font-mono text-[8px] font-extrabold uppercase tracking-[0.13em] text-black/38">RESOLVING TODAY&apos;S SIGNAL FIELD</p>
          </div>

          <div className="border-y border-black/18">
            {Array.from({ length: 7 }).map((_, index) => (
              <div key={index} className="grid h-[62px] grid-cols-[48px_1fr_56px] items-center border-b border-black/10 last:border-b-0">
                <span className="font-mono text-[9px] font-black text-black/35">{String(index + 1).padStart(2, "0")}</span>
                <span className="h-3" style={{ width: `${64 + (index % 3) * 9}%`, background: index === 5 ? "rgba(49,80,255,.12)" : index === 6 ? "rgba(245,87,47,.12)" : "rgba(17,18,20,.07)" }} />
                <span className="justify-self-end h-2 w-8 bg-black/[0.08]" />
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-between border-t border-black/15 pt-4 font-mono text-[8px] font-extrabold uppercase tracking-[0.13em] text-black/38">
          <span>07 SIGNALS / DAILY DISCOVERY</span>
          <span>LOADING LIVE FIELD</span>
        </div>
      </div>
    </div>
  );
}
