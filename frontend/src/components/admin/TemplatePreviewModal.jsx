import { X, Target, BookOpen, Clock } from 'lucide-react'
import { SkillIcon } from '../IconPicker'

export default function TemplatePreviewModal({ template, onClose }) {
  const totalSessions = template.nodes?.reduce((sum, n) => sum + (n.sessions?.length || 0), 0) || 0

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-site-surface rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-site-border">
          <h2 className="text-xl font-bold text-site-ink">Template Preview</h2>
          <button
            onClick={onClose}
            className="p-2 text-site-muted hover:text-site-ink rounded-lg hover:bg-site-bg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {/* Template Header */}
          <div className="flex items-start gap-4 mb-6">
            <div className="w-16 h-16 rounded-xl bg-site-soft border border-site-border flex items-center justify-center flex-shrink-0">
              <SkillIcon name={template.icon} size={32} className="text-site-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-bold text-site-ink mb-1 break-words">{template.title}</h3>
              <p className="text-sm text-site-muted mb-2 break-words">{template.description}</p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-site-muted">
                <span className="flex items-center gap-1">
                  <Target className="w-3.5 h-3.5" />
                  <span className="break-words">{template.goal}</span>
                </span>
                <span className="flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5" />
                  {template.nodes?.length || 0} nodes
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {totalSessions} sessions
                </span>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {template.isBuiltIn && (
                  <span className="inline-block px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded-full border border-purple-200">
                    Built-in Template
                  </span>
                )}
                {template.isPublished && (
                  <span className="inline-block px-2 py-1 bg-green-50 text-green-700 text-xs rounded-full border border-green-200">
                    Published
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Nodes */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-site-ink">Learning Path</h4>
            {template.nodes?.map((node, nodeIdx) => (
              <div key={nodeIdx} className="bg-site-bg rounded-xl border border-site-border p-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-site-accent/10 border border-site-accent/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-site-accent">{nodeIdx + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className="font-semibold text-site-ink mb-1 break-words">{node.title}</h5>
                    {node.description && (
                      <p className="text-xs text-site-muted mb-3 break-words whitespace-pre-wrap">{node.description}</p>
                    )}
                    
                    {/* Sessions */}
                    {node.sessions && node.sessions.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-site-muted">Sessions:</p>
                        {node.sessions.map((session, sessionIdx) => (
                          <div key={sessionIdx} className="bg-white rounded-lg border border-site-border p-3">
                            <div className="flex items-start gap-2">
                              <div className="w-5 h-5 rounded bg-site-soft flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span className="text-xs font-medium text-site-accent">{sessionIdx + 1}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-site-ink mb-1 break-words">{session.title}</p>
                                {session.description && (
                                  <p className="text-xs text-site-muted break-words whitespace-pre-wrap">{session.description}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Stats */}
          {template.usageCount !== undefined && (
            <div className="mt-6 pt-6 border-t border-site-border">
              <div className="flex items-center justify-between text-sm">
                <span className="text-site-muted">Unique users:</span>
                <span className="font-semibold text-site-ink">{template.usageCount}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-site-border bg-site-bg">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-site-accent text-white rounded-lg font-medium hover:bg-site-accent-hover transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
