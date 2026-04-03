import { useState, useEffect } from 'react'
import { MessageSquare, Trash2 } from 'lucide-react'
import { adminApi } from '../../api/adminApi'
import DataTable from '../../components/admin/DataTable'
import ConfirmAction from '../../components/admin/ConfirmAction'

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
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    loadReflections()
  }, [])

  const loadReflections = async () => {
    try {
      setLoading(true)
      const result = await adminApi.getReflections(100)
      setReflections(result.reflections || [])
    } catch (error) {
      console.error('Failed to load reflections:', error)
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
    <div className="p-6 lg:p-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-site-ink">Reflections</h1>
        <p className="text-site-muted mt-1">Recent reflections — flagged or worth reviewing</p>
      </div>

      <DataTable
        columns={columns}
        data={reflections}
        loading={loading}
        empty="No reflections"
      />

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
  )
}
