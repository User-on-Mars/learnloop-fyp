import { ArrowLeft, Loader2, AlertCircle, Target, BookOpen, ChevronRight, X } from 'lucide-react';
import { SkillIcon } from './IconPicker';

export default function TemplatePreview({ template, onBack, onApply, isApplying, error }) {
  const totalSessions = template.nodes.reduce((sum, n) => sum + n.sessions.length, 0);

  return (
    <div className="flex flex-col min-h-0 h-full">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-[#e2e6dc] flex items-center justify-between">
        <button type="button" onClick={onBack} disabled={isApplying}
          className="flex items-center gap-1.5 text-[13px] font-medium text-[#565c52] hover:text-[#2e5023] transition-colors disabled:opacity-50">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-[#9aa094]">{template.nodes.length} nodes</span>
          <button type="button" onClick={onBack} disabled={isApplying} className="text-[#c8cec0] hover:text-[#1c1f1a] transition-colors disabled:opacity-50">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {/* Hero section */}
        <div className="px-5 py-5 bg-[#f4f7f2] border-b border-[#e2e6dc]">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-[#2e5023] flex items-center justify-center shrink-0 shadow-sm">
              <SkillIcon name={template.icon} size={26} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-[#1c1f1a] break-words">{template.title}</h3>
              {template.description && (
                <p className="text-[13px] text-[#565c52] mt-1 break-words leading-relaxed">{template.description}</p>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-3 mt-4">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white text-[#2e5023] text-[11px] font-semibold rounded-lg border border-[#d4e8cc]">
              <Target className="w-3 h-3" /> {template.nodes.length} nodes
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white text-[#565c52] text-[11px] font-semibold rounded-lg border border-[#e2e6dc]">
              <BookOpen className="w-3 h-3" /> {totalSessions} sessions
            </span>
            {template.goal && (
              <span className="text-[11px] text-[#9aa094] ml-auto truncate">Goal: <span className="font-semibold text-[#1c1f1a]">{template.goal}</span></span>
            )}
          </div>
        </div>

        {/* Learning path */}
        <div className="px-5 py-5">
          <p className="text-[11px] font-semibold text-[#9aa094] uppercase tracking-wider mb-4">Learning Path</p>

          <div className="space-y-0">
            {template.nodes.map((node, i) => {
              const isLast = i === template.nodes.length - 1;
              return (
                <div key={i} className="flex gap-3">
                  {/* Timeline */}
                  <div className="flex flex-col items-center shrink-0">
                    <div className="w-7 h-7 rounded-full bg-[#2e5023] text-white text-[11px] font-bold flex items-center justify-center">
                      {i + 1}
                    </div>
                    {!isLast && <div className="w-0.5 flex-1 bg-[#d4e8cc] my-1" />}
                  </div>

                  {/* Node content */}
                  <div className={`flex-1 min-w-0 ${isLast ? 'pb-0' : 'pb-4'}`}>
                    <p className="text-[14px] font-semibold text-[#1c1f1a] break-words">{node.title}</p>
                    {node.description && (
                      <p className="text-[12px] text-[#9aa094] mt-0.5 break-words">{node.description}</p>
                    )}
                    {/* Sessions */}
                    {node.sessions.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {node.sessions.map((sess, j) => (
                          <div key={j} className="flex items-start gap-2 text-[12px]">
                            <ChevronRight className="w-3 h-3 text-[#c8cec0] mt-0.5 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <span className="font-medium text-[#565c52]">{sess.title}</span>
                              {sess.description && <span className="text-[#c8cec0]"> — {sess.description}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-[#e2e6dc] px-5 py-4 bg-[#f8faf6] space-y-2">
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-200">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="text-[12px]">{error}</span>
          </div>
        )}
        <button type="button" onClick={() => onApply(template)} disabled={isApplying}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-white bg-[#2e5023] rounded-xl hover:bg-[#4f7942] disabled:opacity-50 transition-all shadow-sm">
          {isApplying && <Loader2 className="w-4 h-4 animate-spin" />}
          {isApplying ? 'Creating skill map...' : 'Use This Template'}
        </button>
      </div>
    </div>
  );
}
