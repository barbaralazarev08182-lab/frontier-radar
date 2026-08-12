export default function ExploreLoading() {
  return (
    <div className="min-h-[70vh] animate-pulse rounded-[2rem] border border-black/10 bg-[#f1efe8] p-6 text-[#17181a] sm:p-10">
      <div className="mb-8 h-2 w-44 rounded bg-black/10" />
      <div className="mb-4 h-16 max-w-3xl rounded bg-black/[0.07] sm:h-24" />
      <div className="mb-10 h-4 max-w-xl rounded bg-black/[0.06]" />
      <div className="relative h-[28rem] overflow-hidden border-y border-black/10">
        <div className="absolute left-[8%] top-[18%] h-16 w-40 rounded border border-black/10 bg-white/30" />
        <div className="absolute left-1/2 top-1/2 h-56 w-[42%] -translate-x-1/2 -translate-y-1/2 rounded border border-black/10 bg-white/55" />
        <div className="absolute right-[9%] top-[28%] h-16 w-40 rounded border border-black/10 bg-white/30" />
      </div>
    </div>
  );
}
