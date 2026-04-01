import { useState, useEffect, useCallback } from 'react'
import { Clock, MessageSquare, Trash2, ChevronLeft, ChevronRight, User } from 'lucide-react'
import { adminApi } from '../../api/adminApi'

export default function AdminActivity() {
  const [activity, setActivity] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [total, setTotal] = useState(0)

  const fetchActivity = useCallback(() => {
    setLoading(true)
    adminApi.getActivity(page)
      .then(data => {
        setActivity(data.activity)
        setTotal(data.total)
        setPages(data.pages)
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [page])

  useEffect(() => { fetchActivity() }, [fetchActivity])

  const handleDelete = async (type, id) => {
    if (!confirm(`Delete this ${type}?`)) return
    try {
      await adminApi.deleteContent(type, id)
      setActivity(prev => prev.filter(a => a._id !== id))
      setTotal(t => t - 1)
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-site-ink">Recent Activity</h1>
        <p className="text-site-muted mt-1">{total} total activities across the platform</p>
      </div>

      {loading ? (
        <p className="text-site-faint text-center py-8">Loading activity...</p>
      ) : activity.length === 0 ? (
        <p className="text-site-faint text-center py-8">No activity found</p>
      ) : (
        <>
          <div className="space-y-3">
            {activity.map(item => (
              <div key={item._id} className="bg-site-surface rounded-xl border border-site-border p-4 flex items-start gap-3">
                <div className={`p-2 rounded-lg ${item.type === 'practice' ? 'bg-site-soft text-site-accent' : 'bg-emerald-50 text-emerald-600'}`}>
                  {item.type === 'practice' ? <Clock className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${item.type === 'practice' ? 'bg-site-soft text-site-accent' : 'bg-emerald-50 text-emerald-700'}`}>
                      {item.type}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-site-muted">
                      <User className="w-3 h-3" />
                      {item.userName}
                      <span className="text-site-faint">({item.userEmail})</span>
                    </span>
                    <span className="text-xs text-site-faint ml-auto">{new Date(item.sortDate).toLocaleString()}</span>
                  </div>
                  {item.type === 'practice' ? (
                    <p className="text-sm text-site-ink">{item.skillName} — {item.minutesPracticed} min{item.notes ? ` · ${item.notes}` : ''}</p>
                  ) : (
                    <div>
                      <p className="text-sm font-medium text-site-ink">{item.title || 'Untitled reflection'}</p>
                      <p className="text-xs text-site-muted line-clamp-2 mt-0.5">{item.content}</p>
                    </div>
                  )}
                </div>
                <button onClick={() => handleDelete(item.type, item._id)} className="p-1.5 text-site-faint hover:text-red-500 hover:bg-red-50 rounded-lg flex-shrink-0" title="Delete">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-site-border">
              <p className="text-sm text-site-faint">Page {page} of {pages} · {total} items</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 border border-site-border rounded-lg disabled:opacity-40 hover:bg-site-bg text-site-muted transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(pages, p + 1))}
                  disabled={page === pages}
                  className="p-2 border border-site-border rounded-lg disabled:opacity-40 hover:bg-site-bg text-site-muted transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
