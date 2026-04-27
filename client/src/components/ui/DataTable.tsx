/**
 * DataTable - Table reusable avec pagination et etats de chargement
 */

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Skeleton from "./Skeleton";

export interface DataTableColumn<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  keyExtractor: (row: T) => string | number;
  isLoading?: boolean;
  page?: number;
  totalPages?: number;
  totalElements?: number;
  onPageChange?: (page: number) => void;
  emptyMessage?: string;
  compact?: boolean;
}

function DataTable<T>({
  columns,
  data,
  keyExtractor,
  isLoading,
  page = 0,
  totalPages = 0,
  totalElements = 0,
  onPageChange,
  emptyMessage = "Aucune donnee",
  compact = false,
}: DataTableProps<T>) {
  const paddingY = compact ? "py-2.5" : "py-3.5";
  const loadingRows = Array.from({ length: compact ? 3 : 4 });

  return (
    <div className="ds-table-shell">
      <table className="ds-table-raw w-full text-left text-sm">
        <thead>
          <tr className="ds-table-head border-b border-ds-border">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`ds-table-head-cell px-4 ${paddingY} ${col.className || ""}`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {isLoading
            ? loadingRows.map((_, rowIndex) => (
                <tr
                  key={`loading-${rowIndex}`}
                  className="border-b border-ds-border last:border-b-0"
                >
                  {columns.map((col) => (
                    <td key={`${col.key}-${rowIndex}`} className={`px-4 ${paddingY}`}>
                      <Skeleton
                        variant="text"
                        height={14}
                        width={rowIndex % 2 === 0 ? "72%" : "55%"}
                      />
                    </td>
                  ))}
                </tr>
              ))
            : null}

          {!isLoading && data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center">
                <div className="mx-auto flex max-w-md flex-col items-center gap-2">
                  <div className="ds-icon-shell flex h-11 w-11 items-center justify-center rounded-2xl text-ds-muted">
                    <span className="text-sm font-semibold">0</span>
                  </div>
                  <p className="text-sm font-semibold text-ds-primary">Aucun resultat</p>
                  <p className="text-sm text-ds-secondary">{emptyMessage}</p>
                </div>
              </td>
            </tr>
          ) : null}

          {!isLoading
            ? data.map((row) => (
                <tr
                  key={keyExtractor(row)}
                  className="ds-table-row border-b border-ds-border last:border-b-0"
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 ${paddingY} align-middle text-ds-primary ${col.className || ""}`}
                    >
                      {col.render
                        ? col.render(row)
                        : (row as Record<string, unknown>)[col.key] != null
                          ? String((row as Record<string, unknown>)[col.key])
                          : "--"}
                    </td>
                  ))}
                </tr>
              ))
            : null}
        </tbody>
      </table>

      {totalPages > 1 && onPageChange && (
        <div className="flex items-center justify-between gap-3 border-t border-ds-border bg-ds-card px-4 py-3">
          <span className="text-xs font-medium uppercase tracking-[0.08em] text-ds-muted">
            {totalElements} element(s)
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 0}
              className="rounded-xl border border-ds-border bg-ds-card p-2 text-ds-primary transition-all duration-200 hover:border-slate-300 hover:bg-ds-surface disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Page precedente"
            >
              <ChevronLeft size={18} />
            </button>

            <span className="text-sm font-medium tabular-nums text-ds-secondary">
              Page {page + 1} / {totalPages}
            </span>

            <button
              type="button"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages - 1}
              className="rounded-xl border border-ds-border bg-ds-card p-2 text-ds-primary transition-all duration-200 hover:border-slate-300 hover:bg-ds-surface disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Page suivante"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataTable;
