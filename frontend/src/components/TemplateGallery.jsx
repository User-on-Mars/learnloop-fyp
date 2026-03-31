import { useState } from 'react';
import { X, Loader2, AlertCircle } from 'lucide-react';
import { TEMPLATES } from '../data/templates';
import { createSkillMapFromTemplate } from '../api/skillMapApi';
import { SkillIcon } from './IconPicker';
import TemplatePreview from './TemplatePreview';

export default function TemplateGallery({ isOpen, onClose, onCreated, onSwitchToWizard }) {
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setSelectedTemplate(null);
    setIsApplying(false);
    setError('');
  };

  const handleClose = () => {
    if (isApplying) return;
    reset();
    onClose();
  };

  const handleApply = async (template) => {
    setIsApplying(true);
    setError('');
    try {
      const { skill } = await createSkillMapFromTemplate({
        title: template.title,
        description: template.description,
        icon: template.icon,
        goal: template.goal,
        nodes: template.nodes,
      });
      const id = skill._id ?? skill.id;
      onCreated?.({ skillId: String(id), title: template.title });
      reset();
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'Failed to create skill map. Please try again.');
    } finally {
      setIsApplying(false);
    }
  };

  const handleSwitchToWizard = () => {
    reset();
    onSwitchToWizard();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[92vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {selectedTemplate ? 'Template preview' : 'Choose a template'}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            disabled={isApplying}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-50"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {selectedTemplate ? (
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            <TemplatePreview
              template={selectedTemplate}
              onBack={() => { setSelectedTemplate(null); setError(''); }}
              onApply={handleApply}
              isApplying={isApplying}
              error={error}
            />
          </div>
        ) : (
          <>
            {/* Gallery grid */}
            <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTemplate(t)}
                    className="text-left rounded-lg border border-site-border bg-site-surface p-4 hover:border-site-accent hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-site-soft border border-site-border flex items-center justify-center shrink-0">
                        <SkillIcon name={t.icon} size={18} className="text-site-accent" />
                      </div>
                      <span className="text-sm font-semibold text-site-ink group-hover:text-site-accent transition-colors truncate">
                        {t.title}
                      </span>
                    </div>
                    <p className="text-xs text-site-muted line-clamp-2 mb-2">{t.description}</p>
                    <span className="text-xs text-site-muted">{t.nodes.length} nodes</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-100 px-4 py-3 bg-gray-50 text-center">
              <button
                type="button"
                onClick={handleSwitchToWizard}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-site-ink border-2 border-site-border rounded-lg hover:border-site-accent hover:text-site-accent transition-colors"
              >
                Or create from scratch
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
