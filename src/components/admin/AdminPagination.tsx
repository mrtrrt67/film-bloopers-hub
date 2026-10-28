"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface AdminPaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  itemName?: string;
}

export default function AdminPagination({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50],
  itemName = "elementi",
}: AdminPaginationProps) {
  if (totalItems === 0) return null;

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const startItem = (safePage - 1) * pageSize + 1;
  const endItem = Math.min(totalItems, safePage * pageSize);

  // Calcolo pagine visibili
  const getPageNumbers = (): (number | string)[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (safePage <= 4) {
      return [1, 2, 3, 4, 5, "...", totalPages];
    }

    if (safePage >= totalPages - 3) {
      return [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }

    return [1, "...", safePage - 1, safePage, safePage + 1, "...", totalPages];
  };

  const pages = getPageNumbers();

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-zinc-950/70 border-t border-zinc-800/80 text-xs select-none">
      {/* Indicatore Conteggio */}
      <div className="flex items-center gap-3 text-zinc-400">
        <span>
          Mostrati <strong className="text-white font-semibold">{startItem}-{endItem}</strong> di{" "}
          <strong className="text-white font-semibold">{totalItems}</strong> {itemName}
        </span>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 pl-3 border-l border-zinc-800 text-[11px]">
            <span className="text-zinc-500">Per pagina:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                const newSize = Number(e.target.value);
                onPageSizeChange(newSize);
                onPageChange(1);
              }}
              className="rounded-lg bg-zinc-900 border border-zinc-800 px-2 py-1 text-zinc-300 font-semibold focus:outline-none focus:border-amber-500 transition"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Navigazione Pagine */}
      <div className="flex items-center gap-1">
        {/* Prima pagina */}
        <button
          onClick={() => onPageChange(1)}
          disabled={safePage === 1}
          title="Prima pagina"
          className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition"
        >
          <ChevronsLeft className="h-3.5 w-3.5" />
        </button>

        {/* Precedente */}
        <button
          onClick={() => onPageChange(safePage - 1)}
          disabled={safePage === 1}
          title="Pagina precedente"
          className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>

        {/* Numeri pagina */}
        <div className="flex items-center gap-1 px-1">
          {pages.map((p, idx) => {
            if (p === "...") {
              return (
                <span key={`dots-${idx}`} className="px-1 text-zinc-600 font-bold text-[11px]">
                  ...
                </span>
              );
            }

            const pageNum = p as number;
            const isActive = pageNum === safePage;

            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={`min-w-[28px] h-7 px-2 rounded-lg text-xs font-semibold transition ${
                  isActive
                    ? "bg-amber-500 text-zinc-950 font-bold shadow-md shadow-amber-500/20"
                    : "border border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-white hover:bg-zinc-800"
                }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        {/* Successiva */}
        <button
          onClick={() => onPageChange(safePage + 1)}
          disabled={safePage === totalPages}
          title="Pagina successiva"
          className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>

        {/* Ultima pagina */}
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={safePage === totalPages}
          title="Ultima pagina"
          className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition"
        >
          <ChevronsRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
