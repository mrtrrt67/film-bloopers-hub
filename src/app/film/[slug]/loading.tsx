export default function FilmDetailLoading() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-20 animate-in fade-in duration-150">
      {/* Top Breadcrumb Bar */}
      <div className="border-b border-zinc-800/80 bg-zinc-900/30">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <div className="h-4 w-32 rounded bg-zinc-800 animate-pulse" />
        </div>
      </div>

      {/* Hero Section Skeleton */}
      <section className="relative overflow-hidden border-b border-zinc-800/80 bg-gradient-to-b from-zinc-900/40 via-zinc-950 to-zinc-950 py-8 sm:py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-12 lg:gap-12">
            {/* Poster Skeleton */}
            <div className="md:col-span-4 lg:col-span-3">
              <div className="relative aspect-[2/3] w-full max-w-[280px] mx-auto md:max-w-none rounded-2xl border border-zinc-800 bg-zinc-900 animate-pulse shadow-2xl overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-900/40 to-transparent" />
              </div>
            </div>

            {/* Info Skeleton */}
            <div className="flex flex-col justify-between md:col-span-8 lg:col-span-9 space-y-4">
              <div className="space-y-3">
                {/* Badges line */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="h-6 w-16 rounded-md bg-zinc-800 animate-pulse" />
                  <div className="h-6 w-20 rounded-md bg-zinc-800 animate-pulse" />
                  <div className="h-6 w-24 rounded-md bg-zinc-800 animate-pulse" />
                </div>

                {/* Title */}
                <div className="h-9 w-3/4 max-w-md rounded-xl bg-zinc-800 animate-pulse" />
                <div className="h-4 w-1/3 rounded-lg bg-zinc-800/80 animate-pulse" />

                {/* Genre badges */}
                <div className="flex gap-1.5 pt-2">
                  <div className="h-5 w-16 rounded bg-zinc-800/60 animate-pulse" />
                  <div className="h-5 w-20 rounded bg-zinc-800/60 animate-pulse" />
                </div>
              </div>

              {/* Plot skeleton */}
              <div className="mt-6 rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-5 space-y-2.5">
                <div className="h-3.5 w-20 rounded bg-amber-500/20 animate-pulse" />
                <div className="h-3.5 w-full rounded bg-zinc-800/60 animate-pulse" />
                <div className="h-3.5 w-5/6 rounded bg-zinc-800/60 animate-pulse" />
                <div className="h-3.5 w-2/3 rounded bg-zinc-800/60 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Content Tabs & Cards Skeleton */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {/* Tabs skeleton */}
        <div className="flex gap-3 border-b border-zinc-800 pb-4">
          <div className="h-10 w-36 rounded-xl bg-amber-500/20 border border-amber-500/30 animate-pulse" />
          <div className="h-10 w-36 rounded-xl bg-zinc-800/60 animate-pulse" />
        </div>

        {/* 2 Blooper Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="h-5 w-24 rounded-lg bg-amber-500/20 animate-pulse" />
                <div className="h-5 w-16 rounded bg-zinc-800 animate-pulse" />
              </div>
              <div className="space-y-2 pt-1">
                <div className="h-3.5 w-full rounded bg-zinc-800 animate-pulse" />
                <div className="h-3.5 w-4/5 rounded bg-zinc-800 animate-pulse" />
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-zinc-800/60">
                <div className="h-7 w-28 rounded-lg bg-zinc-800 animate-pulse" />
                <div className="h-7 w-16 rounded-lg bg-zinc-800 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
