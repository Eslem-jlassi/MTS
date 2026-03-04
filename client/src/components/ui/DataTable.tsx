/**
 * DataTable - Table réutilisable avec tri, pagination
 * Phase 7 – UI/UX pro
 */

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
  emptyMessage = "Aucune donnée",
  compact = false,
}: DataTableProps<T>) {
  const paddingY = compact ? "py-2" : "py-3";

  return (
    <div className="overflow-x-auto rounded-xl border border-ds-border bg-ds-card shadow-card">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-ds-border bg-ds-elevated/50">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 ${paddingY} font-semibold text-ds-primary ${col.className || ""}`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-ds-muted">
                Chargement...
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-ds-muted">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={keyExtractor(row)}
                className="border-b border-ds-border last:border-b-0 hover:bg-ds-elevated/30 transition-colors"
              >
                {columns.map((col) => (
                  <td key={col.key} className={`px-4 ${paddingY} text-ds-primary ${col.className || ""}`}>
                    {col.render
                      ? col.render(row)
                      : (row as Record<string, unknown>)[col.key] != null
                      ? String((row as Record<string, unknown>)[col.key])
                      : "—"}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
      {totalPages > 1 && onPageChange && (
        <div className="flex items-center justify-between px-4 py-2 border-t border-ds-border bg-ds-elevated/30">
          <span className="text-xs text-ds-muted">
            {totalElements} élément(s)
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 0}
              className="p-2 rounded-xl border border-ds-border text-ds-primary hover:bg-ds-elevated disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              aria-label="Page précédente"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm text-ds-secondary">
              Page {page + 1} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages - 1}
              className="p-2 rounded-xl border border-ds-border text-ds-primary hover:bg-ds-elevated disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
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
