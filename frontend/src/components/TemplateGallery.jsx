import { useState, useEffect } from 'react';
import { X, Loader2, Crown } from 'lucide-react';
import { skillMapAPI } from '../api/client';
import { SkillIcon } from './IconPicker';
import TemplatePreview from './TemplatePreview';
import { auth } from '../firebase';
import { useSubscription } from '../context/SubscriptionContext';
import { useSkillMap } from '../context/SkillMapContext';

export default function TemplateGallery({ isOpen, onClose, onCreated, onSwitchToWizard }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState('');
  const { limits, isFree } = useSubscription();
  const { skills } = useSkillMap();

  const maxSkillMaps = limits?.maxSkillMaps === -1 ? Infinity : (limits?.maxSkillMaps ?? 3);
  const hasReachedLimit = isFree && skills.length >= maxSkillMaps;

  useEffect(() => {
    if (isOpen) fetchTemplates();
  }, [isOpen]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const token = await auth.currentUser.getIdToken();
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000/api'}/templates`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch templates');
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (err) {
      console.error('Error fetching templates:', err);
      setError('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => { setSelectedTemplate(null); setIsApplying(false); setError(''); };

  const handleClose = () => { if (isApplying) return; reset(); onClose(); };

  const handleApply = async (template) => {
    if (hasReachedLimit) return;
    setIsApplying(true);
    setError('');
    try {
      const { data } = await skillMapAPI.createSkillMapFromTemplate({
        templateId: template._id || template.id,
        template: { title: template.title, description: template.description, icon: template.icon, goal: template.goal, nodes: template.nodes }
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[92vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {selectedTemplate ? 'Template preview' : 'Choose a template'}
          </h2>
          <button type="button" onClick={handleClose} disabled={isApplying} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-50" aria-label="Close">
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
              hasReachedLimit={hasReachedLimit}
            />
          </div>
        ) : (
          <>
            {/* Limit banner */}
            {hasReachedLimit && (
              <div className="mx-4 mt-3 flex items-center gap-2.5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
                <Crown className="w-4 h-4 text-amber-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-amber-800">Skill map limit reached ({limits?.maxSkillMaps})</p>
                  <p className="text-[11px] text-amber-600 mt-0.5">You can still browse templates. Upgrade to Pro to use them.</p>
                </div>
                <a href="/subscription" className="text-xs font-bold text-amber-700 hover:text-amber-900 whitespace-nowrap">Upgrade</a>
              </div>
            )}

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
                  {templates.map((t) => {
                    const tColor = t.color || '#4f46e5';
                    return (
                      <button
                        key={t._id || t.id}
                        type="button"
                        onClick={() => setSelectedTemplate(t)}
                        className="text-left rounded-xl border border-gray-100 bg-white p-4 hover:shadow-md transition-all group overflow-hidden relative"
                      >
                        {/* Top color accent */}
                        <div className="absolute top-0 left-0 right-0 h-1 rounded-t-xl" style={{ backgroundColor: tColor }} />

                        <div className="flex items-center gap-2.5 mb-2.5 mt-1">
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 shadow-sm" style={{ backgroundColor: tColor }}>
                            <SkillIcon name={t.icon} size={18} className="text-white" />
                          </div>
                          <span className="text-sm font-semibold text-gray-900 group-hover:text-gray-700 transition-colors truncate">
                            {t.title}
                          </span>
                        </div>
                        {t.description && <p className="text-xs text-gray-400 line-clamp-2 mb-2.5">{t.description}</p>}
                        <div className="flex items-center justify-between text-[11px] text-gray-400">
                          <span className="font-medium">{t.nodes?.length || 0} nodes</span>
                          {t.authorCredit && (
                            <span>by <span className="font-medium text-gray-500">{t.authorCredit}</span></span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-100 px-4 py-3 bg-gray-50 text-center">
              <button type="button" onClick={() => { reset(); onSwitchToWizard(); }}
                disabled={hasReachedLimit}
                className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium border-2 rounded-lg transition-colors ${
                  hasReachedLimit ? 'text-gray-300 border-gray-200 cursor-not-allowed' : 'text-site-ink border-site-border hover:border-site-accent hover:text-site-accent'
                }`}>
                Or create from scratch
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
