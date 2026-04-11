import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { SkillIcon } from './IconPicker';

export default function TemplatePreview({ template, onBack, onApply, isApplying, error }) {
  const totalSessions = template.nodes.reduce((sum, n) => sum + n.sessions.length, 0);

  return (
    <div className="flex flex-col min-h-0 h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100">
        <button
          type="button"
          onClick={onBack}
          disabled={isApplying}
          className="flex items-center gap-1 text-sm text-site-muted hover:text-site-accent transition-colors disabled:opacity-50"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to templates
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4">
        {/* Template header */}
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-site-soft border border-site-border flex items-center justify-center shrink-0">
            <SkillIcon name={template.icon} size={24} className="text-site-accent" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold text-site-ink break-words">{template.title}</h3>
            <p className="text-sm text-site-muted mt-0.5 break-words">{template.description}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap gap-4 text-sm">
          <span className="text-site-muted">
            <span className="font-medium text-site-ink">{template.nodes.length}</span> nodes
          </span>
          <span className="text-site-muted">
            <span className="font-medium text-site-ink">{totalSessions}</span> sessions
          </span>
          <span className="text-site-muted break-words">
            Goal: <span className="font-medium text-site-ink">{template.goal}</span>
          </span>
        </div>

        {/* Node list */}
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-site-muted">Learning path</p>
          {template.nodes.map((node, i) => (
            <div key={i} className="rounded-lg border border-site-border bg-site-surface p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-site-accent bg-site-soft rounded-full w-5 h-5 flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <span className="text-sm font-medium text-site-ink break-words flex-1 min-w-0">{node.title}</span>
              </div>
              {node.description && (
                <p className="text-xs text-site-muted ml-7 mb-2 break-words whitespace-pre-wrap">{node.description}</p>
              )}
              {/* Sessions */}
              <div className="ml-7 space-y-1">
                {node.sessions.map((sess, j) => (
                  <div key={j} className="flex items-start gap-1.5 text-xs">
                    <span className="text-site-accent mt-0.5 shrink-0">•</span>
                    <div className="min-w-0 flex-1">
                      <span className="font-medium text-site-ink break-words">{sess.title}</span>
                      {sess.description && (
                        <span className="text-site-muted break-words"> — {sess.description}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 px-4 py-3 bg-gray-50 space-y-2">
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <button
          type="button"
          onClick={() => onApply(template)}
          disabled={isApplying}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-site-accent rounded-lg hover:bg-site-accent-hover disabled:opacity-60 transition-colors"
        >
          {isApplying && <Loader2 className="w-4 h-4 animate-spin" />}
          {isApplying ? 'Creating skill map…' : 'Use this template'}
        </button>
      </div>
    </div>
  );
}
