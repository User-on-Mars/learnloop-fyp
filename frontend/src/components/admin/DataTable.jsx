import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function DataTable({ 
  columns, 
  data, 
  loading = false, 
  empty = 'No data',
  page = 1,
  pages = 1,
  onPageChange = () => {}
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

  return (
    <div className="bg-site-surface rounded-xl border border-site-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-site-border bg-site-soft">
              {columns.map((col) => (
                <th key={col.key} className="px-4 py-3 text-left text-xs font-semibold text-site-muted uppercase tracking-wider">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr key={idx} className="border-b border-site-border hover:bg-site-soft transition-colors">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-sm text-site-ink">
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="px-4 py-3 border-t border-site-border flex items-center justify-between">
          <p className="text-xs text-site-muted">Page {page} of {pages}</p>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
              className="p-2 rounded-lg border border-site-border text-site-muted hover:bg-site-soft disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page === pages}
              className="p-2 rounded-lg border border-site-border text-site-muted hover:bg-site-soft disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
