import { useState, useEffect, useMemo } from 'react'
import { BookOpen, Layers, Clock, ChevronLeft, ChevronRight, RotateCcw, Search } from 'lucide-react'
import { adminApi } from '../../api/adminApi'
import MetricCard from '../../components/admin/MetricCard'
import PageTransition from '../../components/admin/PageTransition'
import ErrorState from '../../components/admin/ErrorState'
import { SkeletonCard, SkeletonTable } from '../../components/admin/Skeleton'
import Modal, { ModalButton } from '../../components/Modal'
import FilterDropdown from '../../components/FilterDropdown'

export default function AdminSkillMaps() {
  const [stats, setStats] = useState(null)
  const [skillMaps, setSkillMaps] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [deleteModal, setDeleteModal] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [nodeFilter, setNodeFilter] = useState('all')
  const [completionFilter, setCompletionFilter] = useState('all')
  const itemsPerPage = 10

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await adminApi.getSkillMapStats()
      setStats(result)
      
      // Fetch actual skill maps from backend
      const skillsResult = await adminApi.getSkillMaps()
      setSkillMaps(skillsResult.skillMaps || [])
    } catch (error) {
      console.error('Failed to load skill map stats:', error)
      setError('Failed to load skill map stats')
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

  const filteredSkillMaps = useMemo(() => {
    const query = search.trim().toLowerCase()

    return skillMaps.filter(map => {
      const title = String(map.title || '').toLowerCase()
      const owner = String(map.owner || '').toLowerCase()
      const type = String(map.type || '').toLowerCase()
      const nodes = Number(map.nodes || 0)
      const completion = Number(String(map.completion || '0').replace('%', '')) || 0

      const matchesSearch = !query || title.includes(query) || owner.includes(query)
      const matchesType = typeFilter === 'all' || type === typeFilter.toLowerCase()
      const matchesNodes =
        nodeFilter === 'all' ||
        (nodeFilter === 'small' && nodes <= 5) ||
        (nodeFilter === 'medium' && nodes >= 6 && nodes <= 10) ||
        (nodeFilter === 'large' && nodes > 10)
      const matchesCompletion =
        completionFilter === 'all' ||
        (completionFilter === 'not-started' && completion === 0) ||
        (completionFilter === 'in-progress' && completion > 0 && completion < 100) ||
        (completionFilter === 'complete' && completion === 100)

      return matchesSearch && matchesType && matchesNodes && matchesCompletion
    })
  }, [skillMaps, search, typeFilter, nodeFilter, completionFilter])

  const hasFilters = search || typeFilter !== 'all' || nodeFilter !== 'all' || completionFilter !== 'all'

  const resetFilters = () => {
    setSearch('')
    setTypeFilter('all')
    setNodeFilter('all')
    setCompletionFilter('all')
    setPage(1)
  }

  useEffect(() => {
    setPage(1)
  }, [search, typeFilter, nodeFilter, completionFilter])

  if (loading) {
    return (
      <PageTransition>
        <div className="p-6 lg:p-8 max-w-7xl">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-site-ink">Skill Maps</h1>
            <p className="text-site-muted mt-1">Overview of skill maps and learning content</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <SkeletonCard lines={2} />
            <SkeletonCard lines={2} />
            <SkeletonCard lines={2} />
            <SkeletonCard lines={2} />
          </div>
          <SkeletonTable rows={10} columns={5} />
        </div>
      </PageTransition>
    )
  }

  if (error) {
    return (
      <PageTransition>
        <div className="p-6 lg:p-8 max-w-7xl">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-site-ink">Skill Maps</h1>
            <p className="text-site-muted mt-1">Overview of skill maps and learning content</p>
          </div>
          <ErrorState message={error} onRetry={loadStats} />
        </div>
      </PageTransition>
    )
  }

  if (!stats) return null

  const totalPages = Math.max(1, Math.ceil(filteredSkillMaps.length / itemsPerPage))
  const startIndex = (page - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const displaySkillMaps = filteredSkillMaps.slice(startIndex, endIndex)

  return (
    <PageTransition>
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

        <div className="bg-site-surface rounded-xl border border-site-border p-6">
          <div className="flex flex-col gap-1 mb-5">
            <h3 className="font-semibold text-site-ink">Skill maps - most active</h3>
            <p className="text-xs text-site-faint">
              {filteredSkillMaps.length} of {skillMaps.length} maps shown
            </p>
          </div>

          <div className="rounded-xl border border-site-border bg-site-bg/40 p-4 mb-5">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[minmax(260px,1.5fr)_180px_180px_200px_auto] gap-3 items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-site-faint" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search title or owner"
                  className="w-full pl-10 pr-3 py-2 border border-site-border rounded-xl bg-white text-sm text-site-ink outline-none focus:border-[#4f7942] focus:ring-2 focus:ring-[#4f7942]/15"
                />
              </div>
              <FilterDropdown
                value={typeFilter}
                onChange={setTypeFilter}
                minWidth={150}
                options={[
                  { value: 'all', label: 'All types' },
                  { value: 'template', label: 'Template' },
                  { value: 'custom', label: 'Custom' }
                ]}
              />
              <FilterDropdown
                value={nodeFilter}
                onChange={setNodeFilter}
                minWidth={150}
                options={[
                  { value: 'all', label: 'All nodes' },
                  { value: 'small', label: '1-5 nodes' },
                  { value: 'medium', label: '6-10 nodes' },
                  { value: 'large', label: '10+ nodes' }
                ]}
              />
              <FilterDropdown
                value={completionFilter}
                onChange={setCompletionFilter}
                minWidth={170}
                options={[
                  { value: 'all', label: 'All completion' },
                  { value: 'not-started', label: 'Not started' },
                  { value: 'in-progress', label: 'In progress' },
                  { value: 'complete', label: 'Complete' }
                ]}
              />
              <button
                type="button"
                onClick={resetFilters}
                disabled={!hasFilters}
                className="h-10 px-3 rounded-xl border border-site-border bg-white text-site-muted hover:bg-site-bg disabled:opacity-40 disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center"
                title="Reset filters"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
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
                </tr>
              </thead>
              <tbody>
                {displaySkillMaps.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-4 py-8 text-center text-site-faint">
                      {hasFilters ? 'No skill maps match these filters' : 'No skill maps found'}
                    </td>
                  </tr>
                ) : (
                  displaySkillMaps.map((map, idx) => (
                    <tr key={map._id || idx} className="border-b border-site-border/50 hover:bg-site-bg/50">
                      <td className="px-4 py-3 font-medium text-site-ink break-words min-w-0">{map.title || 'Untitled'}</td>
                      <td className="px-4 py-3 text-site-muted break-words min-w-0">{map.owner}</td>
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
                Showing {startIndex + 1} to {Math.min(endIndex, filteredSkillMaps.length)} of {filteredSkillMaps.length} skill maps
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
        <Modal
          isOpen={!!deleteModal}
          onClose={() => setDeleteModal(null)}
          maxWidth="max-w-md"
          title="Delete Skill Map"
          showCloseButton={false}
          preventBackdropClose={deleteLoading}
          footer={
            <>
              <ModalButton
                variant="secondary"
                onClick={() => setDeleteModal(null)}
                disabled={deleteLoading}
              >
                No, cancel
              </ModalButton>
              <ModalButton
                variant="danger"
                onClick={handleDelete}
                disabled={deleteLoading}
              >
                {deleteLoading ? 'Deleting...' : 'Yes, delete'}
              </ModalButton>
            </>
          }
        >
          <p className="text-sm text-[#565c52] mb-1">
            Are you sure you want to delete <span className="font-semibold text-[#1c1f1a]">"{deleteModal?.title}"</span>?
          </p>
          <p className="text-sm text-red-600">
            This action cannot be undone. All associated nodes and progress will be permanently deleted.
          </p>
        </Modal>
      </div>
    </PageTransition>
  )
}

