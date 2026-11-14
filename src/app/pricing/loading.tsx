export default function PricingLoading() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-20 animate-in fade-in duration-150">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 space-y-12">
        {/* Header Skeleton */}
        <div className="text-center space-y-3 max-w-xl mx-auto">
          <div className="h-8 w-64 mx-auto rounded-xl bg-amber-500/20 border border-amber-500/30 animate-pulse" />
          <div className="h-4 w-96 max-w-full mx-auto rounded-lg bg-zinc-800 animate-pulse" />
        </div>

        {/* 3 Pricing Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 pt-4">
          {[1, 2, 3].map((card) => (
            <div
              key={card}
              className={`rounded-3xl border border-zinc-800 bg-zinc-900/40 p-8 space-y-6 flex flex-col justify-between ${
                card === 2 ? "border-amber-500/40 bg-zinc-900/70 shadow-2xl shadow-amber-500/10 md:-translate-y-2" : ""
              }`}
            >
              <div className="space-y-4">
                <div className="h-6 w-32 rounded-lg bg-zinc-800 animate-pulse" />
                <div className="h-10 w-28 rounded-xl bg-zinc-800 animate-pulse" />
                <div className="h-4 w-full rounded bg-zinc-800/60 animate-pulse" />
                <div className="space-y-2.5 pt-4 border-t border-zinc-800/80">
                  {[1, 2, 3, 4].map((f) => (
                    <div key={f} className="flex items-center gap-2.5">
                      <div className="h-4 w-4 rounded-full bg-zinc-800 animate-pulse shrink-0" />
                      <div className="h-3.5 w-full rounded bg-zinc-800/60 animate-pulse" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="h-11 w-full rounded-2xl bg-zinc-800 animate-pulse mt-6" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
