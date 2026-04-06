import { useState, useEffect } from 'react'
import { BookOpen, Layers, Clock, Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { adminApi } from '../../api/adminApi'
import MetricCard from '../../components/admin/MetricCard'

export default function AdminSkillMaps() {
  const [stats, setStats] = useState(null)
  const [skillMaps, setSkillMaps] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [deleteModal, setDeleteModal] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const itemsPerPage = 10

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      setLoading(true)
      const result = await adminApi.getSkillMapStats()
      setStats(result)
      
      // Fetch actual skill maps from backend
      const skillsResult = await adminApi.getSkillMaps()
      setSkillMaps(skillsResult.skillMaps || [])
    } catch (error) {
      console.error('Failed to load skill map stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteModal) return
    setDeleteLoading(true)
    try {
      await adminApi.deleteSkillMap(deleteModal.id)
      setDeleteModal(null)
      loadStats() // Reload the list
    } catch (error) {
      alert(error.message || 'Failed to delete skill map')
    } finally {
      setDeleteLoading(false)
    }
  }

  if (loading) return <div className="p-8 text-site-muted">Loading skill map stats...</div>
  if (!stats) return null

  // Pagination logic
  const totalPages = Math.ceil(skillMaps.length / itemsPerPage)
  const startIndex = (page - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedSkillMaps = skillMaps.slice(startIndex, endIndex)

  const displaySkillMaps = paginatedSkillMaps.length > 0 ? paginatedSkillMaps : []

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-site-ink">Skill Maps</h1>
        <p className="text-site-muted mt-1">Overview of skill maps and learning content</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard 
          icon={BookOpen} 
          label="Total skill maps" 
          value={stats.totalSkillMaps}
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
        />
        <MetricCard 
          icon={Layers} 
          label="Template maps" 
          value="12"
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
        <MetricCard 
          icon={Clock} 
          label="Avg completion" 
          value="42%"
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />
        <MetricCard 
          icon={Layers} 
          label="Avg nodes per map" 
          value="6.2"
          iconBg="bg-green-50"
          iconColor="text-green-600"
        />
      </div>

      {/* Most Active Skill Maps */}
      <div className="bg-site-surface rounded-xl border border-site-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-site-ink">Skill maps — most active</h3>
          <button disabled className="px-3 py-1.5 text-sm border border-site-border rounded-lg text-site-muted opacity-50 cursor-not-allowed flex items-center gap-1">
            <Plus className="w-4 h-4" />
            Create template
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-site-border">
                <th className="text-left px-4 py-3 font-semibold text-site-muted text-xs">Title</th>
                <th className="text-left px-4 py-3 font-semibold text-site-muted text-xs">Owner</th>
                <th className="text-center px-4 py-3 font-semibold text-site-muted text-xs">Type</th>
                <th className="text-center px-4 py-3 font-semibold text-site-muted text-xs">Nodes</th>
                <th className="text-center px-4 py-3 font-semibold text-site-muted text-xs">Completion</th>
                <th className="text-right px-4 py-3 font-semibold text-site-muted text-xs">Actions</th>
              </tr>
            </thead>
            <tbody>
              {displaySkillMaps.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-site-faint">
                    No skill maps found
                  </td>
                </tr>
              ) : (
                displaySkillMaps.map((map, idx) => (
                  <tr key={map._id || idx} className="border-b border-site-border/50 hover:bg-site-bg/50">
                    <td className="px-4 py-3 font-medium text-site-ink">{map.title || 'Untitled'}</td>
                    <td className="px-4 py-3 text-site-muted">{map.owner}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        map.type === 'Template' 
                          ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                          : 'bg-purple-50 text-purple-700 border border-purple-200'
                      }`}>
                        {map.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-site-muted">{map.nodes}</td>
                    <td className="px-4 py-3 text-center text-site-muted">{map.completion}</td>
                    <td className="px-4 py-3 text-right">
                      {map.type === 'Custom' && (
                        <button
                          onClick={() => setDeleteModal({ id: map._id, title: map.title })}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete skill map"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-site-border">
            <p className="text-sm text-site-faint">
              Showing {startIndex + 1} to {Math.min(endIndex, skillMaps.length)} of {skillMaps.length} skill maps
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

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-site-surface rounded-2xl shadow-xl w-full max-w-md p-6 border border-site-border">
            <h3 className="text-lg font-bold text-site-ink mb-2">Delete Skill Map</h3>
            <p className="text-sm text-site-muted mb-1">
              Are you sure you want to delete <span className="font-semibold text-site-ink">"{deleteModal.title}"</span>?
            </p>
            <p className="text-sm text-red-600 mb-4">
              This action cannot be undone. All associated nodes and progress will be permanently deleted.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModal(null)}
                disabled={deleteLoading}
                className="flex-1 py-2.5 border border-site-border text-site-muted rounded-lg font-medium hover:bg-site-bg transition-colors text-sm"
              >
                No, cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteLoading}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors text-sm disabled:opacity-50"
              >
                {deleteLoading ? 'Deleting...' : 'Yes, delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
