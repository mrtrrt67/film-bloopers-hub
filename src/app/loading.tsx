import { Film } from "lucide-react";

export default function RootLoading() {
  return (
    <div className="min-h-[55vh] flex flex-col items-center justify-center px-4 py-16 animate-in fade-in duration-150">
      <div className="relative flex items-center justify-center">
        <div className="h-14 w-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shadow-lg shadow-amber-500/10">
          <Film className="h-7 w-7 text-amber-400 animate-pulse" />
        </div>
        <div className="absolute -inset-1 rounded-2xl border-2 border-transparent border-t-amber-400 animate-spin" />
      </div>
      <p className="mt-4 text-[11px] font-bold uppercase tracking-widest text-zinc-400 animate-pulse">
        Caricamento...
      </p>
    </div>
  );
}
