import { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle } from 'lucide-react';
import { skillMapAPI } from '../api/client';
import { SkillIcon } from './IconPicker';
import TemplatePreview from './TemplatePreview';
import { auth } from '../firebase';

export default function TemplateGallery({ isOpen, onClose, onCreated, onSwitchToWizard }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
    }
  }, [isOpen]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const token = await auth.currentUser.getIdToken();
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000/api'}/templates`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch templates');
      }
      
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (err) {
      console.error('Error fetching templates:', err);
      setError('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

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
      const { data } = await skillMapAPI.createSkillMapFromTemplate({
        templateId: template._id || template.id, // Pass template ID to track usage
        template: {
          title: template.title,
          description: template.description,
          icon: template.icon,
          goal: template.goal,
          nodes: template.nodes,
        }
      });
      const skill = data.skill;
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
              {loading ? (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-site-accent mx-auto mb-4" />
                  <p className="text-site-muted">Loading templates...</p>
                </div>
              ) : templates.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-site-muted">No templates available yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {templates.map((t) => (
                    <button
                      key={t._id || t.id}
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
                      <span className="text-xs text-site-muted">{t.nodes?.length || 0} nodes</span>
                    </button>
                  ))}
                </div>
              )}
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
