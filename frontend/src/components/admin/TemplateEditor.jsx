import { useState, useEffect } from 'react'
import { X, Plus, Trash2, GripVertical, Save, AlertCircle } from 'lucide-react'
import { SkillIcon } from '../IconPicker'
import { ALL_ICONS } from '../../utils/iconLibrary'

export default function TemplateEditor({ template, onSave, onClose }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    icon: 'Code',
    goal: '',
    nodes: [
      {
        title: '',
        description: '',
        sessions: [{ title: '', description: '' }]
      },
      {
        title: '',
        description: '',
        sessions: [{ title: '', description: '' }]
      }
    ]
  })
  
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [showIconPicker, setShowIconPicker] = useState(false)

  useEffect(() => {
    if (template) {
      setFormData({
        title: template.title || '',
        description: template.description || '',
        icon: template.icon || 'Code',
        goal: template.goal || '',
        nodes: template.nodes || [
          { title: '', description: '', sessions: [{ title: '', description: '' }] },
          { title: '', description: '', sessions: [{ title: '', description: '' }] }
        ]
      })
    }
  }, [template])

  const validate = () => {
    const newErrors = {}
    
    if (!formData.title.trim()) newErrors.title = 'Title is required'
    else if (formData.title.length > 20) newErrors.title = 'Title must be 20 characters or less'
    
    if (formData.description.length > 150) newErrors.description = 'Description must be 150 characters or less'
    
    if (!formData.goal.trim()) newErrors.goal = 'Goal is required'
    else if (formData.goal.length > 30) newErrors.goal = 'Goal must be 30 characters or less'
    
    if (formData.nodes.length < 2) newErrors.nodes = 'At least 2 nodes required'
    else if (formData.nodes.length > 15) newErrors.nodes = 'At most 15 nodes allowed'
    
    formData.nodes.forEach((node, nodeIdx) => {
      if (!node.title.trim()) newErrors[`node_${nodeIdx}_title`] = 'Node title is required'
      else if (node.title.length > 20) newErrors[`node_${nodeIdx}_title`] = 'Node title must be 20 characters or less'
      
      if (node.description.length > 200) newErrors[`node_${nodeIdx}_description`] = 'Description must be 200 characters or less'
      
      if (node.sessions.length === 0) newErrors[`node_${nodeIdx}_sessions`] = 'At least one session required'
      else if (node.sessions.length > 5) newErrors[`node_${nodeIdx}_sessions`] = 'Maximum 5 sessions per node'
      
      node.sessions.forEach((session, sessionIdx) => {
        if (!session.title.trim()) newErrors[`node_${nodeIdx}_session_${sessionIdx}_title`] = 'Session title is required'
        else if (session.title.length > 20) newErrors[`node_${nodeIdx}_session_${sessionIdx}_title`] = 'Session title must be 20 characters or less'
        
        if (session.description.length > 200) newErrors[`node_${nodeIdx}_session_${sessionIdx}_description`] = 'Description must be 200 characters or less'
      })
    })
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    console.log('📝 Submitting template data:', formData)
    if (!validate()) {
      console.error('❌ Frontend validation failed')
      return
    }
    
    console.log('✅ Frontend validation passed')
    setSaving(true)
    try {
      await onSave(formData)
    } finally {
      setSaving(false)
    }
  }

  const addNode = () => {
    if (formData.nodes.length >= 15) return
    setFormData({
      ...formData,
      nodes: [...formData.nodes, { title: '', description: '', sessions: [{ title: '', description: '' }] }]
    })
  }

  const removeNode = (nodeIdx) => {
    if (formData.nodes.length <= 2) return
    setFormData({
      ...formData,
      nodes: formData.nodes.filter((_, idx) => idx !== nodeIdx)
    })
  }

  const updateNode = (nodeIdx, field, value) => {
    const newNodes = [...formData.nodes]
    newNodes[nodeIdx] = { ...newNodes[nodeIdx], [field]: value }
    setFormData({ ...formData, nodes: newNodes })
  }

  const addSession = (nodeIdx) => {
    const newNodes = [...formData.nodes]
    if (newNodes[nodeIdx].sessions.length >= 5) return
    newNodes[nodeIdx].sessions.push({ title: '', description: '' })
    setFormData({ ...formData, nodes: newNodes })
  }

  const removeSession = (nodeIdx, sessionIdx) => {
    const newNodes = [...formData.nodes]
    if (newNodes[nodeIdx].sessions.length <= 1) return
    newNodes[nodeIdx].sessions = newNodes[nodeIdx].sessions.filter((_, idx) => idx !== sessionIdx)
    setFormData({ ...formData, nodes: newNodes })
  }

  const updateSession = (nodeIdx, sessionIdx, field, value) => {
    const newNodes = [...formData.nodes]
    newNodes[nodeIdx].sessions[sessionIdx] = { ...newNodes[nodeIdx].sessions[sessionIdx], [field]: value }
    setFormData({ ...formData, nodes: newNodes })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-site-surface rounded-2xl shadow-xl w-full max-w-4xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-site-border">
          <h2 className="text-xl font-bold text-site-ink">
            {template ? 'Edit Template' : 'Create New Template'}
          </h2>
          <button
            onClick={onClose}
            disabled={saving}
            className="p-2 text-site-muted hover:text-site-ink rounded-lg hover:bg-site-bg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* Basic Info */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-site-ink mb-1.5">
                Title * <span className="text-xs text-site-faint">({formData.title.length}/20)</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value.slice(0, 20) })}
                maxLength={20}
                className="w-full px-4 py-2.5 border-2 border-transparent rounded-lg outline-none focus:border-site-accent bg-site-bg focus:bg-white text-sm"
                placeholder="e.g. Web Development"
              />
              {errors.title && <p className="text-xs text-red-600 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.title}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-site-ink mb-1.5">
                Description <span className="text-xs text-site-faint">({formData.description.length}/150)</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value.slice(0, 150) })}
                maxLength={150}
                rows={2}
                className="w-full px-4 py-2.5 border-2 border-transparent rounded-lg outline-none focus:border-site-accent bg-site-bg focus:bg-white text-sm resize-none"
                placeholder="Brief description of what this template covers"
              />
              {errors.description && <p className="text-xs text-red-600 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.description}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-site-ink mb-1.5">Icon *</label>
                <button
                  type="button"
                  onClick={() => setShowIconPicker(!showIconPicker)}
                  className="w-full px-4 py-2.5 border-2 border-transparent rounded-lg outline-none focus:border-site-accent bg-site-bg hover:bg-white text-sm flex items-center gap-2"
                >
                  <SkillIcon name={formData.icon} size={20} className="text-site-accent" />
                  <span>{formData.icon}</span>
                </button>
                {showIconPicker && (
                  <div className="mt-2 p-3 bg-white border border-site-border rounded-lg shadow-lg max-h-48 overflow-y-auto grid grid-cols-6 gap-2">
                    {ALL_ICONS.map((iconName) => (
                      <button
                        key={iconName}
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, icon: iconName })
                          setShowIconPicker(false)
                        }}
                        className={`p-2 rounded-lg hover:bg-site-soft transition-colors ${
                          formData.icon === iconName ? 'bg-site-soft ring-2 ring-site-accent' : ''
                        }`}
                      >
                        <SkillIcon name={iconName} size={20} className="text-site-accent" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-site-ink mb-1.5">
                  Goal * <span className="text-xs text-site-faint">({formData.goal.length}/30)</span>
                </label>
                <input
                  type="text"
                  value={formData.goal}
                  onChange={(e) => setFormData({ ...formData, goal: e.target.value.slice(0, 30) })}
                  maxLength={30}
                  className="w-full px-4 py-2.5 border-2 border-transparent rounded-lg outline-none focus:border-site-accent bg-site-bg focus:bg-white text-sm"
                  placeholder="e.g. Build a website"
                />
                {errors.goal && <p className="text-xs text-red-600 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.goal}</p>}
              </div>
            </div>
          </div>

          {/* Nodes */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-site-ink">
                Nodes ({formData.nodes.length}/15)
              </h3>
              <button
                onClick={addNode}
                disabled={formData.nodes.length >= 15}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-site-accent text-white rounded-lg hover:bg-site-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Node
              </button>
            </div>
            {errors.nodes && <p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.nodes}</p>}

            {formData.nodes.map((node, nodeIdx) => (
              <div key={nodeIdx} className="bg-site-bg rounded-xl border border-site-border p-4">
                <div className="flex items-start gap-3 mb-3">
                  <GripVertical className="w-5 h-5 text-site-faint mt-2 flex-shrink-0" />
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start gap-2">
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-site-muted mb-1">
                          Node {nodeIdx + 1} Title * <span className="text-site-faint">({node.title.length}/20)</span>
                        </label>
                        <input
                          type="text"
                          value={node.title}
                          onChange={(e) => updateNode(nodeIdx, 'title', e.target.value.slice(0, 20))}
                          maxLength={20}
                          className="w-full px-3 py-2 border border-site-border rounded-lg outline-none focus:border-site-accent bg-white text-sm"
                          placeholder="e.g. HTML Basics"
                        />
                        {errors[`node_${nodeIdx}_title`] && (
                          <p className="text-xs text-red-600 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors[`node_${nodeIdx}_title`]}</p>
                        )}
                      </div>
                      {formData.nodes.length > 2 && (
                        <button
                          onClick={() => removeNode(nodeIdx)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors mt-6"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-site-muted mb-1">
                        Description <span className="text-site-faint">({node.description.length}/200)</span>
                      </label>
                      <textarea
                        value={node.description}
                        onChange={(e) => updateNode(nodeIdx, 'description', e.target.value.slice(0, 200))}
                        maxLength={200}
                        rows={3}
                        className="w-full px-3 py-2 border border-site-border rounded-lg outline-none focus:border-site-accent bg-white text-sm resize-none"
                        placeholder="What will students learn in this node?"
                      />
                      {errors[`node_${nodeIdx}_description`] && (
                        <p className="text-xs text-red-600 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors[`node_${nodeIdx}_description`]}</p>
                      )}
                    </div>

                    {/* Sessions */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-site-muted">Sessions ({node.sessions.length}/5)</label>
                        <button
                          onClick={() => addSession(nodeIdx)}
                          disabled={node.sessions.length >= 5}
                          className="flex items-center gap-1 px-2 py-1 text-xs text-site-accent hover:bg-site-soft rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Plus className="w-3 h-3" />
                          Add Session
                        </button>
                      </div>
                      {errors[`node_${nodeIdx}_sessions`] && (
                        <p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors[`node_${nodeIdx}_sessions`]}</p>
                      )}

                      {node.sessions.map((session, sessionIdx) => (
                        <div key={sessionIdx} className="bg-white rounded-lg border border-site-border p-3 space-y-2">
                          <div className="flex items-start gap-2">
                            <div className="flex-1">
                              <label className="block text-xs text-site-faint mb-1">
                                Session {sessionIdx + 1} Title * <span>({session.title.length}/20)</span>
                              </label>
                              <input
                                type="text"
                                value={session.title}
                                onChange={(e) => updateSession(nodeIdx, sessionIdx, 'title', e.target.value.slice(0, 20))}
                                maxLength={20}
                                className="w-full px-2 py-1.5 border border-site-border rounded text-xs outline-none focus:border-site-accent"
                                placeholder="e.g. HTML Structure"
                              />
                              {errors[`node_${nodeIdx}_session_${sessionIdx}_title`] && (
                                <p className="text-xs text-red-600 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors[`node_${nodeIdx}_session_${sessionIdx}_title`]}</p>
                              )}
                            </div>
                            {node.sessions.length > 1 && (
                              <button
                                onClick={() => removeSession(nodeIdx, sessionIdx)}
                                className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors mt-5"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          <div>
                            <label className="block text-xs text-site-faint mb-1">
                              Description <span>({session.description.length}/200)</span>
                            </label>
                            <textarea
                              value={session.description}
                              onChange={(e) => updateSession(nodeIdx, sessionIdx, 'description', e.target.value.slice(0, 200))}
                              maxLength={200}
                              rows={3}
                              className="w-full px-2 py-1.5 border border-site-border rounded text-xs outline-none focus:border-site-accent resize-none"
                              placeholder="What will be covered in this session?"
                            />
                            {errors[`node_${nodeIdx}_session_${sessionIdx}_description`] && (
                              <p className="text-xs text-red-600 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors[`node_${nodeIdx}_session_${sessionIdx}_description`]}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-site-border bg-site-bg">
          <div className="flex items-center gap-2 text-xs text-site-muted">
            <AlertCircle className="w-4 h-4" />
            <span>Template will be saved as draft. Publish it to make it available to users.</span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 border border-site-border text-site-ink rounded-lg font-medium hover:bg-site-bg disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-site-accent text-white rounded-lg font-medium hover:bg-site-accent-hover disabled:opacity-50 transition-colors"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Template
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
