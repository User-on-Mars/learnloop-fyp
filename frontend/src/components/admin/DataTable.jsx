import { ChevronLeft, ChevronRight } from 'lucide-react'

/**
 * Generate an array of page numbers with ellipsis for pagination display.
 * Shows first page, last page, current page, and neighbors with '...' gaps.
 */
function getPageNumbers(current, total) {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }

  const pages = new Set([1, total])

  // Add current page and its neighbors
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
    pages.add(i)
  }

  const sorted = [...pages].sort((a, b) => a - b)
  const result = []

  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) {
      result.push('...')
    }
    result.push(sorted[i])
  }

  return result
}

export default function DataTable({ 
  columns, 
  data, 
  loading = false, 
  empty = 'No data',
  page = 1,
  pages = 1,
  onPageChange = () => {},
  mobileCardRender,
  pageSize,
  total
}) {
  if (loading) {
    return (
      <div className="bg-site-surface rounded-xl border border-site-border overflow-hidden">
        <div className="p-6 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-site-soft rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-site-surface rounded-xl border border-site-border p-8 text-center">
        <p className="text-site-muted">{empty}</p>
      </div>
    )
  }

  // Calculate "Showing X to Y of Z" values
  const showingSummary = total != null && pageSize != null
  const startItem = showingSummary ? (page - 1) * pageSize + 1 : null
  const endItem = showingSummary ? Math.min(page * pageSize, total) : null

  const pageNumbers = getPageNumbers(page, pages)

  return (
    <div className="bg-site-surface rounded-xl border border-site-border overflow-hidden">
      {/* Mobile card layout */}
      {mobileCardRender && (
        <div className="md:hidden divide-y divide-site-border">
          {data.map((row, idx) => (
            <div key={idx} className="bg-site-surface rounded-xl border border-site-border p-4 m-3">
              {mobileCardRender(row)}
            </div>
          ))}
        </div>
      )}

      {/* Desktop table (always shown on md+, hidden on mobile when mobileCardRender is provided) */}
      <div className={mobileCardRender ? 'hidden md:block' : ''}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-site-border bg-site-soft">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`px-4 py-3 text-left text-xs font-semibold text-site-muted uppercase tracking-wider${col.hideOnMobile ? ' hidden md:table-cell' : ''}`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, idx) => (
                <tr key={idx} className="border-b border-site-border hover:bg-site-soft transition-colors">
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 py-3 text-sm text-site-ink${col.hideOnMobile ? ' hidden md:table-cell' : ''}`}
                    >
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="px-4 py-3 border-t border-site-border flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-site-muted">
            {showingSummary
              ? `Showing ${startItem} to ${endItem} of ${total}`
              : `Page ${page} of ${pages}`}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
              className="p-2 rounded-lg border border-site-border text-site-muted hover:bg-site-soft disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {pageNumbers.map((p, idx) =>
              p === '...' ? (
                <span key={`ellipsis-${idx}`} className="px-2 text-xs text-site-muted">
                  …
                </span>
              ) : (
                <button
                  key={p}
                  onClick={() => onPageChange(p)}
                  disabled={p === page}
                  className={`min-w-[32px] h-8 rounded-lg text-xs font-medium transition-colors ${
                    p === page
                      ? 'bg-site-accent text-white'
                      : 'border border-site-border text-site-muted hover:bg-site-soft'
                  }`}
                >
                  {p}
                </button>
              )
            )}

            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page === pages}
              className="p-2 rounded-lg border border-site-border text-site-muted hover:bg-site-soft disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
