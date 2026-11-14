export default function SuggerimentiLoading() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-20 animate-in fade-in duration-150">
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center space-y-3">
          <div className="h-8 w-60 mx-auto rounded-xl bg-amber-500/20 border border-amber-500/30 animate-pulse" />
          <div className="h-4 w-80 max-w-full mx-auto rounded-lg bg-zinc-800 animate-pulse" />
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-6 sm:p-8 space-y-5">
          <div className="space-y-2">
            <div className="h-4 w-24 rounded bg-zinc-800 animate-pulse" />
            <div className="h-11 w-full rounded-xl bg-zinc-800/80 animate-pulse" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-28 rounded bg-zinc-800 animate-pulse" />
            <div className="h-11 w-full rounded-xl bg-zinc-800/80 animate-pulse" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-32 rounded bg-zinc-800 animate-pulse" />
            <div className="h-28 w-full rounded-xl bg-zinc-800/80 animate-pulse" />
          </div>
          <div className="h-12 w-full rounded-2xl bg-amber-500/20 border border-amber-500/30 animate-pulse mt-4" />
        </div>
      </div>
    </div>
  );
}
