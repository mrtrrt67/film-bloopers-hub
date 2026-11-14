export default function EsploraLoading() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-20 animate-in fade-in duration-150">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* Header & Search Bar Skeleton */}
        <div className="space-y-4 max-w-2xl mx-auto text-center">
          <div className="h-8 w-60 mx-auto rounded-xl bg-amber-500/20 border border-amber-500/30 animate-pulse" />
          <div className="h-4 w-80 max-w-full mx-auto rounded-lg bg-zinc-800 animate-pulse" />
          <div className="h-12 w-full rounded-2xl border border-zinc-800 bg-zinc-900/60 animate-pulse mt-4" />
        </div>

        {/* Tab switchers skeleton */}
        <div className="flex justify-center gap-3 pt-2">
          <div className="h-9 w-32 rounded-xl bg-amber-500/20 border border-amber-500/30 animate-pulse" />
          <div className="h-9 w-36 rounded-xl bg-zinc-800/60 animate-pulse" />
        </div>

        {/* Grid of movie card skeletons */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6 pt-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
            <div
              key={i}
              className="flex flex-col overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-900/40"
            >
              <div className="relative aspect-[2/3] w-full bg-zinc-900 animate-pulse" />
              <div className="p-3 space-y-2">
                <div className="h-4 w-3/4 rounded bg-zinc-800 animate-pulse" />
                <div className="h-3 w-1/2 rounded bg-zinc-800/60 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
