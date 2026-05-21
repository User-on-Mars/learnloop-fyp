import { useState, useEffect, useMemo } from 'react'
import { Plus, Edit2, Trash2, Eye, Send, Loader2, AlertCircle, CheckCircle, Layers, Users, User, Archive, Search, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react'
import { auth } from '../../firebase'
import { SkillIcon } from '../../components/IconPicker'
import TemplateEditor from '../../components/admin/TemplateEditor'
import TemplatePreviewModal from '../../components/admin/TemplatePreviewModal'
import PageTransition from '../../components/admin/PageTransition'
import ErrorState from '../../components/admin/ErrorState'
import AnimatedList from '../../components/admin/AnimatedList'
import { SkeletonCard } from '../../components/admin/Skeleton'
import Modal, { ModalButton } from '../../components/Modal'
import { motion } from 'framer-motion'
import { staggerItem } from '../../components/admin/animations'
import FilterDropdown from '../../components/FilterDropdown'

const PUBLISHED_PER_PAGE = 4
const DRAFT_PER_PAGE = 4

export default function AdminTemplates() {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  const [showEditor, setShowEditor] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState(null)
  const [showPreview, setShowPreview] = useState(false)
  const [previewTemplate, setPreviewTemplate] = useState(null)
  
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [sortFilter, setSortFilter] = useState('newest')
  const [publishedPage, setPublishedPage] = useState(1)
  const [draftPage, setDraftPage] = useState(1)

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      setError('')
      const token = await auth.currentUser.getIdToken()
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000/api'}/templates/admin/all`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch templates')
      }
      
      const data = await response.json()
      setTemplates(data.templates || [])
    } catch (err) {
      console.error('Error fetching templates:', err)
      setError('Failed to load templates')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingTemplate(null)
    setShowEditor(true)
  }

  const handleEdit = (template) => {
    setEditingTemplate(template)
    setShowEditor(true)
  }

  const handlePreview = (template) => {
    setPreviewTemplate(template)
    setShowPreview(true)
  }

  const handleSave = async (templateData) => {
    try {
      const token = await auth.currentUser.getIdToken()
      const url = editingTemplate
        ? `${import.meta.env.VITE_API_URL || 'http://localhost:4000/api'}/templates/${editingTemplate._id}`
        : `${import.meta.env.VITE_API_URL || 'http://localhost:4000/api'}/templates`
      
      const response = await fetch(url, {
        method: editingTemplate ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(templateData)
      })
      
      if (!response.ok) {
        const error = await response.json()
        console.error('Backend validation error:', error)
        
        // Show detailed validation errors if available
        if (error.errors && Array.isArray(error.errors)) {
          const errorMessages = error.errors.map(e => `${e.field}: ${e.message}`).join(', ')
          throw new Error(errorMessages)
        }
        
        throw new Error(error.message || 'Failed to save template')
      }
      
      setSuccess(editingTemplate ? 'Template updated successfully' : 'Template created successfully')
      setTimeout(() => setSuccess(''), 3000)
      setShowEditor(false)
      setEditingTemplate(null)
      fetchTemplates()
    } catch (err) {
      console.error('Error saving template:', err)
      setError(err.message)
      setTimeout(() => setError(''), 5000)
    }
  }

  const handleTogglePublish = async (template) => {
    try {
      const token = await auth.currentUser.getIdToken()
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000/api'}/templates/${template._id}/publish`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isPublished: !template.isPublished })
      })
      
      if (!response.ok) {
        throw new Error('Failed to update template')
      }
      
      setSuccess(template.isPublished ? 'Template unpublished' : 'Template published')
      setTimeout(() => setSuccess(''), 3000)
      fetchTemplates()
    } catch (err) {
      console.error('Error toggling publish:', err)
      setError('Failed to update template')
      setTimeout(() => setError(''), 5000)
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    
    try {
      setDeleting(true)
      const token = await auth.currentUser.getIdToken()
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000/api'}/templates/${deleteConfirm._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to delete template')
      }
      
      setSuccess('Template deleted successfully')
      setTimeout(() => setSuccess(''), 3000)
      setDeleteConfirm(null)
      fetchTemplates()
    } catch (err) {
      console.error('Error deleting template:', err)
      setError('Failed to delete template')
      setTimeout(() => setError(''), 5000)
    } finally {
      setDeleting(false)
    }
  }

  const publishedTemplates = templates.filter(t => t.isPublished)
  const draftTemplates = templates.filter(t => !t.isPublished)
  const totalUsage = templates.reduce((sum, t) => sum + (t.usageCount || 0), 0)

  const filteredTemplates = useMemo(() => {
    const query = search.trim().toLowerCase()

    return templates
      .filter(template => {
        const title = String(template.title || '').toLowerCase()
        const description = String(template.description || '').toLowerCase()
        const author = String(template.authorCredit || template.createdByName || '').toLowerCase()

        const matchesSearch = !query || title.includes(query) || description.includes(query) || author.includes(query)
        const matchesStatus =
          statusFilter === 'all' ||
          (statusFilter === 'published' && template.isPublished) ||
          (statusFilter === 'draft' && !template.isPublished)
        const matchesSource =
          sourceFilter === 'all' ||
          (sourceFilter === 'built-in' && template.isBuiltIn) ||
          (sourceFilter === 'custom' && !template.isBuiltIn)

        return matchesSearch && matchesStatus && matchesSource
      })
      .sort((a, b) => {
        if (sortFilter === 'usage') return (b.usageCount || 0) - (a.usageCount || 0)
        if (sortFilter === 'nodes') return (b.nodes?.length || 0) - (a.nodes?.length || 0)
        if (sortFilter === 'title') return String(a.title || '').localeCompare(String(b.title || ''))
        return new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0)
      })
  }, [templates, search, statusFilter, sourceFilter, sortFilter])

  const filteredPublishedTemplates = filteredTemplates.filter(template => template.isPublished)
  const filteredDraftTemplates = filteredTemplates.filter(template => !template.isPublished)
  const publishedTotalPages = Math.max(1, Math.ceil(filteredPublishedTemplates.length / PUBLISHED_PER_PAGE))
  const draftTotalPages = Math.max(1, Math.ceil(filteredDraftTemplates.length / DRAFT_PER_PAGE))
  const publishedStartIndex = (publishedPage - 1) * PUBLISHED_PER_PAGE
  const draftStartIndex = (draftPage - 1) * DRAFT_PER_PAGE
  const paginatedPublishedTemplates = filteredPublishedTemplates.slice(publishedStartIndex, publishedStartIndex + PUBLISHED_PER_PAGE)
  const paginatedDraftTemplates = filteredDraftTemplates.slice(draftStartIndex, draftStartIndex + DRAFT_PER_PAGE)
  const hasFilters = search || statusFilter !== 'all' || sourceFilter !== 'all' || sortFilter !== 'newest'

  const resetFilters = () => {
    setSearch('')
    setStatusFilter('all')
    setSourceFilter('all')
    setSortFilter('newest')
    setPublishedPage(1)
    setDraftPage(1)
  }

  useEffect(() => {
    setPublishedPage(1)
    setDraftPage(1)
  }, [search, statusFilter, sourceFilter, sortFilter])

  const renderPagination = (currentPage, totalPages, totalItems, startIndex, pageSize, setCurrentPage, label) => {
    if (totalPages <= 1) return null

    return (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-5 pt-4 border-t border-site-border">
        <p className="text-sm text-site-faint">
          Showing {startIndex + 1} to {Math.min(startIndex + pageSize, totalItems)} of {totalItems} {label}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
            disabled={currentPage === 1}
            className="p-2 border border-site-border rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-site-bg transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-site-ink font-medium">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
            disabled={currentPage === totalPages}
            className="p-2 border border-site-border rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-site-bg transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  const renderTemplateCard = (template) => {
    const isDraft = !template.isPublished

    return (
      <motion.div
        key={template._id}
        variants={staggerItem}
        className={`bg-site-surface rounded-xl border shadow-sm hover:shadow-md transition-all overflow-hidden ${
          isDraft ? 'border-amber-200' : 'border-green-200'
        }`}
      >
        <div className="p-5 h-full flex flex-col">
          <div className="flex items-start gap-3 mb-3">
            <div className={`w-12 h-12 rounded-xl border flex items-center justify-center flex-shrink-0 ${
              isDraft ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'
            }`}>
              <SkillIcon name={template.icon || 'Code'} size={24} className={isDraft ? 'text-amber-600' : 'text-green-600'} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2">
                <h3 className="font-bold text-site-ink text-base break-words flex-1">{template.title}</h3>
                <span className={`px-2 py-0.5 rounded-full border text-xs font-medium flex-shrink-0 ${
                  isDraft ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-green-50 text-green-700 border-green-200'
                }`}>
                  {isDraft ? 'Draft' : 'Published'}
                </span>
              </div>
              <p className="text-xs text-site-muted line-clamp-2 mt-1 break-words">{template.description || 'No description'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-3 text-xs text-site-muted">
            <div className="flex items-center gap-1">
              <Layers className="w-3.5 h-3.5" />
              <span>{template.nodes?.length || 0} nodes</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              <span>{template.usageCount || 0} {template.usageCount === 1 ? 'user' : 'users'}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs mb-4 min-h-[24px]">
            {template.isBuiltIn ? (
              <div className="flex items-center gap-1.5 text-purple-700 bg-purple-50 px-2 py-1 rounded-lg border border-purple-200">
                <CheckCircle className="w-3.5 h-3.5" />
                <span className="font-medium">Built-in Template</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-site-muted">
                <User className="w-3.5 h-3.5" />
                <span>Created by <span className="font-medium text-site-ink">{template.authorCredit || template.createdByName || 'Admin'}</span></span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 pt-3 border-t border-site-border mt-auto">
            {isDraft && !template.isBuiltIn ? (
              <button
                onClick={() => handleTogglePublish(template)}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                title="Publish"
              >
                <Send className="w-4 h-4" />
                Publish
              </button>
            ) : (
              <button
                onClick={() => handlePreview(template)}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-site-accent bg-site-soft hover:bg-site-accent hover:text-white rounded-lg transition-colors"
                title="Preview"
              >
                <Eye className="w-4 h-4" />
                Preview
              </button>
            )}

            {isDraft && (
              <button
                onClick={() => handlePreview(template)}
                className="min-w-[40px] h-10 p-2 text-site-accent hover:bg-site-soft rounded-lg transition-colors"
                title="Preview"
              >
                <Eye className="w-4 h-4" />
              </button>
            )}

            {!template.isBuiltIn && (
              <>
                <button
                  onClick={() => handleEdit(template)}
                  className="min-w-[40px] h-10 p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Edit"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                {!isDraft && (
                  <button
                    onClick={() => handleTogglePublish(template)}
                    className="min-w-[40px] h-10 p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                    title="Unpublish"
                  >
                    <Archive className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setDeleteConfirm(template)}
                  className="min-w-[40px] h-10 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </motion.div>
    )
  }

  if (loading) {
    return (
      <PageTransition>
        <div className="p-6 lg:p-8 max-w-7xl">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-site-ink">Skill Map Templates</h1>
            <p className="text-site-muted mt-1">Create and manage templates that users can apply to start learning</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <SkeletonCard lines={2} />
            <SkeletonCard lines={2} />
            <SkeletonCard lines={2} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <SkeletonCard lines={4} />
            <SkeletonCard lines={4} />
            <SkeletonCard lines={4} />
          </div>
        </div>
      </PageTransition>
    )
  }

  if (error && templates.length === 0) {
    return (
      <PageTransition>
        <div className="p-6 lg:p-8 max-w-7xl">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-site-ink">Skill Map Templates</h1>
            <p className="text-site-muted mt-1">Create and manage templates that users can apply to start learning</p>
          </div>
          <ErrorState message={error} onRetry={fetchTemplates} />
        </div>
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      <div className="p-6 lg:p-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-site-ink">Skill Map Templates</h1>
        <p className="text-site-muted mt-1">Create and manage templates that users can apply to start learning</p>
      </div>

      {success && (
        <div className="mb-6 p-4 rounded-lg border bg-green-50 border-green-200 text-green-700 flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          {success}
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 rounded-lg border bg-red-50 border-red-200 text-red-700 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-site-surface rounded-xl border border-site-border p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-green-50">
              <Eye className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-site-muted">Published</p>
              <p className="text-2xl font-bold text-site-ink">{publishedTemplates.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-site-surface rounded-xl border border-site-border p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-amber-50">
              <Layers className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-site-muted">Drafts</p>
              <p className="text-2xl font-bold text-site-ink">{draftTemplates.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-site-surface rounded-xl border border-site-border p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-blue-50">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-site-muted">Total usage</p>
              <p className="text-2xl font-bold text-site-ink">{totalUsage}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-site-surface rounded-xl border border-site-border p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between mb-5">
          <div>
            <h2 className="font-semibold text-site-ink">Template library</h2>
            <p className="text-xs text-site-faint mt-1">
              {filteredTemplates.length} of {templates.length} templates shown
            </p>
          </div>
          <button
            onClick={handleCreate}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-site-accent text-white rounded-lg font-semibold hover:bg-site-accent-hover transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Create New Template
          </button>
        </div>

        <div className="rounded-xl border border-site-border bg-site-bg/40 p-4 mb-5">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[minmax(260px,1.5fr)_170px_170px_170px_auto] gap-3 items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-site-faint" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search title, description, or author"
                className="w-full pl-10 pr-3 py-2 border border-site-border rounded-xl bg-white text-sm text-site-ink outline-none focus:border-[#4f7942] focus:ring-2 focus:ring-[#4f7942]/15"
              />
            </div>
            <FilterDropdown
              value={statusFilter}
              onChange={setStatusFilter}
              minWidth={160}
              options={[
                { value: 'all', label: 'All status' },
                { value: 'published', label: 'Published' },
                { value: 'draft', label: 'Drafts' }
              ]}
            />
            <FilterDropdown
              value={sourceFilter}
              onChange={setSourceFilter}
              minWidth={160}
              options={[
                { value: 'all', label: 'All sources' },
                { value: 'built-in', label: 'Built-in' },
                { value: 'custom', label: 'Custom' }
              ]}
            />
            <FilterDropdown
              value={sortFilter}
              onChange={setSortFilter}
              minWidth={160}
              options={[
                { value: 'newest', label: 'Newest first' },
                { value: 'usage', label: 'Most used' },
                { value: 'nodes', label: 'Most nodes' },
                { value: 'title', label: 'Title A-Z' }
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

        {templates.length === 0 ? (
          <div className="text-center py-12 rounded-xl border border-site-border bg-site-bg/40">
            <Layers className="w-12 h-12 text-site-faint mx-auto mb-4" />
            <h3 className="text-lg font-medium text-site-ink mb-2">No templates yet</h3>
            <p className="text-site-muted mb-4">Create your first template to get started</p>
            <button
              onClick={handleCreate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-site-accent text-white rounded-lg font-medium hover:bg-site-accent-hover transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Template
            </button>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="text-center py-12 rounded-xl border border-site-border bg-site-bg/40">
            <Search className="w-10 h-10 text-site-faint mx-auto mb-3" />
            <h3 className="font-semibold text-site-ink">No matching templates</h3>
            <p className="text-sm text-site-muted mt-1">Try adjusting the filters or search term.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {statusFilter !== 'draft' && filteredPublishedTemplates.length > 0 && (
              <section className="rounded-xl border border-green-200 bg-green-50/25 p-4">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Eye className="w-5 h-5 text-green-600" />
                    <div>
                      <h3 className="font-semibold text-site-ink">Published templates</h3>
                      <p className="text-xs text-site-faint">{filteredPublishedTemplates.length} ready for users</p>
                    </div>
                  </div>
                </div>
                <AnimatedList className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
                  {paginatedPublishedTemplates.map(renderTemplateCard)}
                </AnimatedList>
                {renderPagination(
                  publishedPage,
                  publishedTotalPages,
                  filteredPublishedTemplates.length,
                  publishedStartIndex,
                  PUBLISHED_PER_PAGE,
                  setPublishedPage,
                  'published templates'
                )}
              </section>
            )}

            {statusFilter !== 'published' && filteredDraftTemplates.length > 0 && (
              <section className="rounded-xl border border-amber-200 bg-amber-50/35 p-4">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Layers className="w-5 h-5 text-amber-600" />
                    <div>
                      <h3 className="font-semibold text-site-ink">Draft templates</h3>
                      <p className="text-xs text-site-faint">{filteredDraftTemplates.length} waiting to publish</p>
                    </div>
                  </div>
                </div>
                <AnimatedList className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
                  {paginatedDraftTemplates.map(renderTemplateCard)}
                </AnimatedList>
                {renderPagination(
                  draftPage,
                  draftTotalPages,
                  filteredDraftTemplates.length,
                  draftStartIndex,
                  DRAFT_PER_PAGE,
                  setDraftPage,
                  'draft templates'
                )}
              </section>
            )}
          </div>
        )}
      </div>

      {/* Template Editor Modal */}
      {showEditor && (
        <TemplateEditor
          template={editingTemplate}
          onSave={handleSave}
          onClose={() => {
            setShowEditor(false)
            setEditingTemplate(null)
          }}
        />
      )}

      {/* Template Preview Modal */}
      {showPreview && previewTemplate && (
        <TemplatePreviewModal
          template={previewTemplate}
          onClose={() => {
            setShowPreview(false)
            setPreviewTemplate(null)
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        maxWidth="max-w-sm"
        showCloseButton={false}
        preventBackdropClose={deleting}
        footer={
          <>
            <ModalButton
              variant="secondary"
              onClick={() => setDeleteConfirm(null)}
              disabled={deleting}
            >
              Cancel
            </ModalButton>
            <ModalButton
              variant="danger"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </ModalButton>
          </>
        }
      >
        {/* Icon */}
        <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
          <AlertCircle className="w-6 h-6 text-red-600" />
        </div>
        
        {/* Title and Message */}
        <h2 className="text-lg font-bold text-[#1c1f1a] text-center mb-2">Delete Template</h2>
        <p className="text-sm text-[#565c52] text-center">
          Are you sure you want to delete "{deleteConfirm?.title}"? This action cannot be undone.
        </p>
      </Modal>
      </div>
    </PageTransition>
  )
}
