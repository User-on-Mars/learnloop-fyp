import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Eye, Send, Loader2, AlertCircle, CheckCircle, Layers, Users, User, Archive } from 'lucide-react'
import { auth } from '../../firebase'
import { SkillIcon } from '../../components/IconPicker'
import TemplateEditor from '../../components/admin/TemplateEditor'
import TemplatePreviewModal from '../../components/admin/TemplatePreviewModal'

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

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      setLoading(true)
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
      setTimeout(() => setError(''), 5000)
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

  return (
    <div className="p-6 lg:p-8 w-full">
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

      {/* Stats */}
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
              <p className="text-sm text-site-muted">Total Usage</p>
              <p className="text-2xl font-bold text-site-ink">{templates.reduce((sum, t) => sum + (t.usageCount || 0), 0)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Create Button */}
      <div className="mb-6">
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-5 py-3 bg-site-accent text-white rounded-lg font-semibold hover:bg-site-accent-hover transition-colors shadow-md"
        >
          <Plus className="w-5 h-5" />
          Create New Template
        </button>
      </div>

      {/* Templates List */}
      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-site-accent mx-auto mb-4" />
          <p className="text-site-muted">Loading templates...</p>
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12 bg-site-surface rounded-xl border border-site-border">
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
      ) : (
        <div className="space-y-8">
          {/* Published Templates */}
          {publishedTemplates.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Eye className="w-5 h-5 text-green-600" />
                <h2 className="text-lg font-semibold text-site-ink">Published Templates</h2>
                <span className="text-sm text-site-faint">({publishedTemplates.length})</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {publishedTemplates.map((template) => (
                  <div key={template._id} className="bg-site-surface rounded-xl border-2 border-green-200 shadow-sm hover:shadow-md transition-all overflow-hidden">
                    <div className="p-5">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-12 h-12 rounded-xl bg-green-50 border border-green-200 flex items-center justify-center flex-shrink-0">
                          <SkillIcon name={template.icon || 'Code'} size={24} className="text-green-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-site-ink text-base break-words">{template.title}</h3>
                          <p className="text-xs text-site-muted line-clamp-2 mt-0.5 break-words">{template.description || 'No description'}</p>
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

                      <div className="flex items-center gap-1.5 text-xs mb-3 min-h-[24px]">
                        {template.isBuiltIn ? (
                          <div className="flex items-center gap-1.5 text-purple-700 bg-purple-50 px-2 py-1 rounded-lg border border-purple-200">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span className="font-medium">Built-in Template</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-site-muted">
                            <User className="w-3.5 h-3.5" />
                            <span>Created by <span className="font-medium text-site-ink">{template.createdByName || 'Admin'}</span></span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 pt-3 border-t border-site-border">
                        <button
                          onClick={() => handlePreview(template)}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-site-accent bg-site-soft hover:bg-site-accent hover:text-white rounded-lg transition-colors"
                          title="Preview"
                        >
                          <Eye className="w-4 h-4" />
                          Preview
                        </button>
                        {!template.isBuiltIn && (
                          <>
                            <button
                              onClick={() => handleEdit(template)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleTogglePublish(template)}
                              className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                              title="Unpublish"
                            >
                              <Archive className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(template)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Draft Templates */}
          {draftTemplates.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Layers className="w-5 h-5 text-amber-600" />
                <h2 className="text-lg font-semibold text-site-ink">Draft Templates</h2>
                <span className="text-sm text-site-faint">({draftTemplates.length})</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {draftTemplates.map((template) => (
                  <div key={template._id} className="bg-site-surface rounded-xl border-2 border-amber-200 shadow-sm hover:shadow-md transition-all overflow-hidden">
                    <div className="p-5">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center flex-shrink-0">
                          <SkillIcon name={template.icon || 'Code'} size={24} className="text-amber-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-site-ink text-base break-words">{template.title}</h3>
                          <p className="text-xs text-site-muted line-clamp-2 mt-0.5 break-words">{template.description || 'No description'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 mb-3 text-xs text-site-muted">
                        <div className="flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5" />
                          <span>{template.nodes?.length || 0} nodes</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                          <span className="text-amber-600 font-medium">Not published</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-site-muted mb-3 min-h-[24px]">
                        <User className="w-3.5 h-3.5" />
                        <span>Created by <span className="font-medium text-site-ink">{template.createdByName || 'Admin'}</span></span>
                      </div>

                      <div className="flex items-center gap-2 pt-3 border-t border-site-border">
                        <button
                          onClick={() => handleTogglePublish(template)}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                          title="Publish"
                        >
                          <Send className="w-4 h-4" />
                          Publish
                        </button>
                        <button
                          onClick={() => handlePreview(template)}
                          className="p-2 text-site-accent hover:bg-site-soft rounded-lg transition-colors"
                          title="Preview"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(template)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(template)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

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
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-site-surface rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <h2 className="text-lg font-bold text-site-ink text-center mb-2">Delete Template</h2>
            <p className="text-sm text-site-muted text-center mb-5">
              Are you sure you want to delete "{deleteConfirm.title}"? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
                className="flex-1 py-2.5 border border-site-border text-site-muted rounded-lg font-medium hover:bg-site-bg disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
