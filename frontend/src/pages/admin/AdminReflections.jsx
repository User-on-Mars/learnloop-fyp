import { useState, useEffect, useMemo } from 'react'
import { MessageSquare, Download, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { adminApi } from '../../api/adminApi'
import FilterDropdown from '../../components/FilterDropdown'
import PageTransition from '../../components/admin/PageTransition'
import ErrorState from '../../components/admin/ErrorState'
import { SkeletonTable } from '../../components/admin/Skeleton'

const MOOD_EMOJIS = {
  'Happy': '😄',
  'Neutral': '😐',
  'Sad': '😢',
  'Energized': '⚡',
  'Thoughtful': '🤔'
}

const MOOD_STYLES = {
  Happy: 'from-emerald-50 via-emerald-100 to-emerald-50 border-emerald-200 text-emerald-900',
  Neutral: 'from-slate-50 via-slate-100 to-slate-50 border-slate-200 text-slate-900',
  Sad: 'from-sky-50 via-sky-100 to-sky-50 border-sky-200 text-sky-900',
  Energized: 'from-amber-50 via-amber-100 to-amber-50 border-amber-200 text-amber-900',
  Thoughtful: 'from-violet-50 via-violet-100 to-violet-50 border-violet-200 text-violet-900'
}

const MOOD_BADGE_STYLES = {
  Happy: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Neutral: 'bg-slate-100 text-slate-700 border-slate-200',
  Sad: 'bg-sky-100 text-sky-700 border-sky-200',
  Energized: 'bg-amber-100 text-amber-700 border-amber-200',
  Thoughtful: 'bg-violet-100 text-violet-700 border-violet-200'
}

const MOOD_FILTER_OPTIONS = [
  { value: 'all', label: 'All moods' },
  { value: 'Happy', label: 'Happy' },
  { value: 'Neutral', label: 'Neutral' },
  { value: 'Sad', label: 'Sad' },
  { value: 'Energized', label: 'Energized' },
  { value: 'Thoughtful', label: 'Thoughtful' }
]

export default function AdminReflections() {
  const [reflections, setReflections] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedReflection, setSelectedReflection] = useState(null)
  const [page, setPage] = useState(1)
  const [moodFilter, setMoodFilter] = useState('all')
  const itemsPerPage = 12

  useEffect(() => {
    loadReflections()
  }, [])

  const loadReflections = async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await adminApi.getReflections(100)
      setReflections(result.reflections || [])
    } catch (error) {
      console.error('Failed to load reflections:', error)
      setError('Failed to load reflections')
    } finally {
      setLoading(false)
    }
  }

  const downloadReflection = (reflection) => {
    const downloadText = `Reflection export\n\nTitle: ${reflection.title || 'Untitled node'}\nUser: ${reflection.userName || 'Unknown user'}\nMood: ${reflection.mood || 'No mood'}\nSubmitted: ${new Date(reflection.createdAt).toLocaleString()}\n\n${reflection.content || 'No reflection content available.'}`
    const blob = new Blob([downloadText], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `reflection-${reflection._id || 'export'}.txt`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  }

  const filteredReflections = useMemo(() => {
    if (moodFilter === 'all') return reflections
    return reflections.filter(ref => ref.mood === moodFilter)
  }, [reflections, moodFilter])

  // Pagination logic
  const totalPages = Math.ceil(filteredReflections.length / itemsPerPage)
  const startIndex = (page - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedReflections = filteredReflections.slice(startIndex, endIndex)

  const renderReflectionCard = (reflection) => {
    const preview = reflection.content?.length > 120 ? `${reflection.content.slice(0, 120)}…` : reflection.content
    const createdAt = new Date(reflection.createdAt)
    const hoursAgo = Math.floor((new Date() - createdAt) / (1000 * 60 * 60))
    const moodCardStyle = MOOD_STYLES[reflection.mood] || 'from-white via-slate-50 to-white border-site-border text-site-ink'
    const moodBadgeClass = MOOD_BADGE_STYLES[reflection.mood] || 'bg-site-surface text-site-accent border-site-border'

    return (
      <button
        key={reflection._id}
        type="button"
        onClick={() => setSelectedReflection(reflection)}
        className={`group text-left rounded-3xl border p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-xl bg-gradient-to-br ${moodCardStyle}`}
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-site-accent/10 text-site-accent text-lg font-semibold shadow-sm">
              {MOOD_EMOJIS[reflection.mood] || '📝'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-site-ink truncate">{reflection.userName || 'Unknown user'}</p>
              <p className="text-xs text-site-muted truncate">{reflection.title || 'Untitled node'}</p>
            </div>
          </div>
          <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold ${moodBadgeClass}`}>
            {reflection.mood || 'No mood'}
          </span>
        </div>

        <p className="text-sm text-site-ink mb-5 overflow-hidden whitespace-nowrap text-ellipsis">{preview || 'No reflection content provided.'}</p>

        <div className="flex items-center justify-between text-xs text-site-faint">
          <span>{hoursAgo < 24 ? `${hoursAgo}h ago` : createdAt.toLocaleDateString()}</span>
          <span className="font-semibold text-site-accent">View details</span>
        </div>
      </button>
    )
  }

  return (
    <PageTransition>
      <div className="p-6 lg:p-8 max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-site-ink">Reflections</h1>
            <p className="text-site-muted mt-1">Recent reflections — flagged or worth reviewing</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <FilterDropdown
              value={moodFilter}
              onChange={(value) => { setMoodFilter(value); setPage(1) }}
              options={MOOD_FILTER_OPTIONS}
              minWidth={180}
            />
            <span className="text-sm text-site-faint">
              Showing {filteredReflections.length} reflection{filteredReflections.length === 1 ? '' : 's'}
            </span>
          </div>
        </div>

        {error ? (
          <ErrorState message={error} onRetry={loadReflections} />
        ) : loading ? (
          <SkeletonTable rows={12} columns={1} />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {paginatedReflections.map(renderReflectionCard)}
            </div>

            {filteredReflections.length === 0 && (
              <div className="rounded-3xl border border-site-border bg-site-surface p-12 text-center text-site-muted">
                {reflections.length === 0
                  ? 'No reflections available yet.'
                  : `No reflections match the selected mood (${moodFilter}).`}
              </div>
            )}

            {totalPages > 1 && (
              <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-site-faint">
                  Showing {filteredReflections.length > 0 ? startIndex + 1 : 0} to {Math.min(endIndex, filteredReflections.length)} of {filteredReflections.length} reflections
                </p>
                <div className="inline-flex items-center gap-2 rounded-full border border-site-border bg-site-surface p-1">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="grid h-10 w-10 place-items-center rounded-full text-site-ink enabled:hover:bg-site-bg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-3 text-sm font-semibold text-site-ink">{page} / {totalPages}</span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="grid h-10 w-10 place-items-center rounded-full text-site-ink enabled:hover:bg-site-bg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {selectedReflection && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-start justify-center overflow-auto p-4">
            <div className="relative w-full max-w-3xl rounded-[2rem] bg-white shadow-2xl">
              <button
                type="button"
                onClick={() => setSelectedReflection(null)}
                className="absolute right-5 top-5 rounded-full border border-site-border bg-white p-3 text-site-ink shadow-sm hover:bg-site-bg transition"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="p-8 space-y-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h2 className="text-2xl font-bold text-site-ink break-words">{selectedReflection.title || 'Untitled node'}</h2>
                    <p className="mt-2 text-sm text-site-muted break-words">{selectedReflection.userName || 'Unknown user'}</p>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-site-border bg-site-surface px-4 py-2 text-sm font-semibold text-site-accent">
                    {MOOD_EMOJIS[selectedReflection.mood] || '📝'} {selectedReflection.mood || 'No mood'}
                  </div>
                </div>

                <div className="rounded-3xl border border-site-border bg-site-surface p-6 break-words">
                  <p className="text-sm leading-7 text-site-ink whitespace-pre-line break-words">{selectedReflection.content || 'No reflection content available.'}</p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="rounded-3xl border border-site-border bg-white p-4">
                    <p className="text-xs uppercase tracking-[0.25em] text-site-faint">User</p>
                    <p className="mt-2 text-sm font-semibold text-site-ink">{selectedReflection.userName || 'Unknown'}</p>
                  </div>
                  <div className="rounded-3xl border border-site-border bg-white p-4">
                    <p className="text-xs uppercase tracking-[0.25em] text-site-faint">Node</p>
                    <p className="mt-2 text-sm font-semibold text-site-ink">{selectedReflection.title || 'Untitled'}</p>
                  </div>
                  <div className="rounded-3xl border border-site-border bg-white p-4">
                    <p className="text-xs uppercase tracking-[0.25em] text-site-faint">Submitted</p>
                    <p className="mt-2 text-sm font-semibold text-site-ink">{new Date(selectedReflection.createdAt).toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => downloadReflection(selectedReflection)}
                    className="w-full rounded-3xl border border-site-border bg-white px-5 py-3 text-sm font-semibold text-site-ink hover:bg-site-surface transition sm:w-auto flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedReflection(null)}
                    className="w-full rounded-3xl bg-site-accent px-5 py-3 text-sm font-semibold text-white hover:bg-site-accent-hover transition sm:w-auto"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  )
}
