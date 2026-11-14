export default function ClassificaLoading() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-20 animate-in fade-in duration-150">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* Header Skeleton */}
        <div className="text-center space-y-3">
          <div className="h-8 w-64 mx-auto rounded-xl bg-amber-500/20 border border-amber-500/30 animate-pulse" />
          <div className="h-4 w-96 max-w-full mx-auto rounded-lg bg-zinc-800 animate-pulse" />
        </div>

        {/* Banner how points work skeleton */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-3">
          <div className="h-5 w-48 rounded bg-amber-400/20 animate-pulse" />
          <div className="h-4 w-full rounded bg-zinc-800/60 animate-pulse" />
        </div>

        {/* Podium Skeleton (Top 3) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
          {[2, 1, 3].map((pos) => (
            <div
              key={pos}
              className={`rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-6 flex flex-col items-center justify-center text-center space-y-3 ${
                pos === 1 ? "sm:-translate-y-2 border-amber-500/30 bg-amber-500/5 shadow-xl" : ""
              }`}
            >
              <div className="h-14 w-14 rounded-full bg-zinc-800 animate-pulse" />
              <div className="h-4 w-28 rounded bg-zinc-800 animate-pulse" />
              <div className="h-6 w-16 rounded-full bg-amber-500/20 animate-pulse" />
            </div>
          ))}
        </div>

        {/* Table Rows Skeleton */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 divide-y divide-zinc-800/60 overflow-hidden">
          {[4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="flex items-center justify-between p-4 px-6">
              <div className="flex items-center gap-3">
                <div className="h-6 w-6 rounded bg-zinc-800/60 animate-pulse" />
                <div className="h-8 w-8 rounded-full bg-zinc-800 animate-pulse" />
                <div className="h-4 w-32 rounded bg-zinc-800 animate-pulse" />
              </div>
              <div className="h-5 w-20 rounded bg-zinc-800 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
