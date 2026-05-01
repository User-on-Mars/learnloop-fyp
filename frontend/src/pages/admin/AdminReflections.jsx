import { useState, useEffect } from 'react'
import { MessageSquare, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { adminApi } from '../../api/adminApi'
import DataTable from '../../components/admin/DataTable'
import ConfirmAction from '../../components/admin/ConfirmAction'
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

export default function AdminReflections() {
  const [reflections, setReflections] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [page, setPage] = useState(1)
  const itemsPerPage = 20

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

  const handleDelete = async (reflectionId) => {
    try {
      setActionLoading(true)
      await adminApi.deleteContent('reflection', reflectionId)
      setReflections(reflections.filter(r => r._id !== reflectionId))
      setConfirmDelete(null)
    } catch (error) {
      console.error('Failed to delete reflection:', error)
    } finally {
      setActionLoading(false)
    }
  }

  // Pagination logic
  const totalPages = Math.ceil(reflections.length / itemsPerPage)
  const startIndex = (page - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedReflections = reflections.slice(startIndex, endIndex)

  const columns = [
    { key: 'userName', label: 'User' },
    { key: 'title', label: 'Node', render: (val) => val || 'Untitled' },
    { 
      key: 'mood', 
      label: 'Mood',
      render: (val) => <span className="text-lg">{MOOD_EMOJIS[val] || '—'}</span>
    },
    { 
      key: 'content', 
      label: 'What practiced',
      render: (val) => <span className="text-xs line-clamp-2">{val}</span>
    },
    { 
      key: 'createdAt', 
      label: 'Date',
      render: (val) => {
        const hours = Math.floor((new Date() - new Date(val)) / (1000 * 60 * 60))
        if (hours < 24) return `${hours}h ago`
        return new Date(val).toLocaleDateString()
      }
    },
    { 
      key: 'actions', 
      label: 'Actions',
      render: (_, row) => (
        <button
          onClick={() => setConfirmDelete(row._id)}
          className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
          title="Delete reflection"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )
    }
  ]

  return (
    <PageTransition>
      <div className="p-6 lg:p-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-site-ink">Reflections</h1>
          <p className="text-site-muted mt-1">Recent reflections — flagged or worth reviewing</p>
        </div>

        {error ? (
          <ErrorState message={error} onRetry={loadReflections} />
        ) : loading ? (
          <SkeletonTable rows={20} columns={6} />
        ) : (
          <div className="bg-site-surface rounded-xl border border-site-border">
            <DataTable
              columns={columns}
              data={paginatedReflections}
              loading={loading}
              empty="No reflections"
            />

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-site-border">
                <p className="text-sm text-site-faint">
                  Showing {startIndex + 1} to {Math.min(endIndex, reflections.length)} of {reflections.length} reflections
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-2 border border-site-border rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-site-bg transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-site-ink font-medium">
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-2 border border-site-border rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-site-bg transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <ConfirmAction
          isOpen={!!confirmDelete}
          title="Delete Reflection"
          message="This reflection will be permanently deleted. This action cannot be undone."
          confirmText="Delete"
          isDangerous
          onConfirm={() => handleDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
          loading={actionLoading}
        />
      </div>
    </PageTransition>
  )
}
