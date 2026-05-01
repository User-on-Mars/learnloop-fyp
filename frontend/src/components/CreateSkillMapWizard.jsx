import { Fragment, useMemo, useState, useEffect } from 'react';
import { X, Loader2, ChevronRight, Check, Plus, Trash2, Target, Map, BookOpen, Sparkles, ArrowRight } from 'lucide-react';
import { useSkillMap } from '../context/SkillMapContext';
import { useSubscription } from '../context/SubscriptionContext';
import { SkillIcon, default as IconPicker } from './IconPicker';
import { COLOR_THEMES } from './ColorPicker';
import { DEFAULT_ICONS } from '../utils/iconLibrary';

const STEPS = [
  { id: 1, label: 'Basics' },
  { id: 2, label: 'Appearance' },
  { id: 3, label: 'Nodes' },
  { id: 4, label: 'Review' },
];

export default function CreateSkillMapWizard({ isOpen, onClose, onCreated, onSwitchToTemplates }) {
  const { skills, createSkillMap } = useSkillMap();
  const { limits } = useSubscription();
  const maxNodes = limits?.maxNodesPerSkillMap === -1 ? 15 : (limits?.maxNodesPerSkillMap ?? 5);
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState(DEFAULT_ICONS[0]);
  const [color, setColor] = useState(COLOR_THEMES[0].value);
  const [goal, setGoal] = useState('');
  const [nodeInputs, setNodeInputs] = useState(['', '', '']);
  const [attemptedNext, setAttemptedNext] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const titleUnique = useMemo(() => {
    const t = title.trim().toLowerCase();
    if (!t) return true;
    return !skills.some(s => (s.name || '').trim().toLowerCase() === t);
  }, [skills, title]);

  const reset = () => {
    setStep(1); setTitle(''); setDescription(''); setIcon(DEFAULT_ICONS[0]);
    setColor(COLOR_THEMES[0].value); setGoal(''); setNodeInputs(['', '', '']);
    setAttemptedNext({}); setSubmitError(''); setIsSubmitting(false);
  };
  const resetAndClose = () => { reset(); onClose(); };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const markAttempt = s => setAttemptedNext(p => ({ ...p, [s]: true }));
  const filledSketchTitles = nodeInputs.map(x => x.trim()).filter(Boolean);

  const canProceed = () => {
    if (step === 1) return title.trim() && titleUnique && goal.trim();
    if (step === 3) {
      const filled = nodeInputs.map(x => x.trim()).filter(Boolean);
      const lower = filled.map(x => x.toLowerCase());
      return filled.length > 0 && lower.length === new Set(lower).size;
    }
    return true;
  };

  const goNext = () => {
    markAttempt(step);
    if (!canProceed()) return;
    setStep(s => Math.min(4, s + 1));
  };

  const goBack = () => { if (step > 1) setStep(s => s - 1); };

  const addNodeRow = () => { if (nodeInputs.length < maxNodes) setNodeInputs(p => [...p, '']); };
  const removeNodeRow = i => { if (nodeInputs.length > 1) setNodeInputs(p => p.filter((_, idx) => idx !== i)); };
  const updateNodeRow = (i, v) => { if (v.length <= 16) setNodeInputs(p => p.map((x, idx) => idx === i ? v : x)); };

  const handleCreate = async () => {
    setSubmitError(''); setIsSubmitting(true);
    try {
      const { skill } = await createSkillMap({
        title: title.trim(), description: description.trim() || null,
        icon, color, goal: goal.trim(), sketchTitles: filledSketchTitles,
      });
      onCreated?.({ skillId: String(skill._id ?? skill.id), title: title.trim() });
      resetAndClose();
    } catch (e) { setSubmitError(e.message || 'Could not create skill map'); }
    finally { setIsSubmitting(false); }
  };

  const totalSteps = STEPS.length;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header with gradient */}
        <div
          className="px-5 sm:px-6 py-4 flex-shrink-0 transition-colors"
          style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <SkillIcon name={icon} size={20} className="text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base sm:text-lg font-bold text-white truncate">{title || 'Create Skill Map'}</h2>
                <p className="text-white/70 text-xs">Step {step} of {totalSteps} — {STEPS[step - 1].label}</p>
              </div>
            </div>
            <button 
              onClick={resetAndClose} 
              className="w-10 h-10 min-w-[44px] min-h-[44px] rounded-lg bg-white/20 hover:bg-white/30 active:bg-white/40 flex items-center justify-center text-white transition-colors flex-shrink-0 ml-2"
              aria-label="Close wizard"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="flex gap-2 mt-3 sm:mt-4">
            {STEPS.map((s) => (
              <div key={s.id} className={`h-1 flex-1 rounded-full transition-all ${s.id <= step ? 'bg-white' : 'bg-white/30'}`} />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 sm:py-6">

          {/* Step 1: Basics */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="text-center mb-6">
                <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <BookOpen className="w-7 h-7 text-indigo-500" />
                </div>
                <h3 className="text-xl font-bold text-[#1c1f1a]">Name Your Skill Map</h3>
                <p className="text-sm text-[#9aa094] mt-1">Give it a title and set a goal</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#1c1f1a] mb-2">
                  Title <span className="text-red-500">*</span>
                </label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value.slice(0, 20))} maxLength={20}
                  placeholder="e.g. Python Basics, Guitar"
                  autoFocus
                  className="w-full px-4 py-3.5 min-h-[44px] border-2 border-[#e2e6dc] rounded-xl focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/15 transition-all text-sm" />
                <div className="flex justify-between mt-1.5">
                  <div>
                    {attemptedNext[1] && !title.trim() && <p className="text-xs text-red-500">Title is required</p>}
                    {attemptedNext[1] && title.trim() && !titleUnique && <p className="text-xs text-red-500">You already have a map with this title</p>}
                  </div>
                  <span className={`text-[11px] ${title.length > 20 ? 'text-red-500' : 'text-[#9aa094]'}`}>{title.length}/20</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#1c1f1a] mb-2">
                  Description <span className="text-[#9aa094] font-normal">(optional)</span>
                </label>
                <textarea value={description} onChange={e => setDescription(e.target.value.slice(0, 120))} rows={2} maxLength={120}
                  placeholder="What will this skill map help you learn?"
                  className="w-full px-4 py-3 min-h-[44px] border-2 border-[#e2e6dc] rounded-xl focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/15 transition-all text-sm resize-none" />
                <div className="flex justify-end mt-1.5">
                  <span className="text-[11px] text-[#9aa094]">{description.length}/120</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#1c1f1a] mb-2">
                  Goal <span className="text-red-500">*</span>
                </label>
                <input type="text" value={goal} onChange={e => setGoal(e.target.value.slice(0, 16))} maxLength={16}
                  placeholder="e.g. Build a web app"
                  className="w-full px-4 py-3.5 min-h-[44px] border-2 border-[#e2e6dc] rounded-xl focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/15 transition-all text-sm" />
                <div className="flex justify-between mt-1.5">
                  {attemptedNext[1] && !goal.trim() ? <p className="text-xs text-red-500">Goal is required</p> : <p className="text-[11px] text-[#9aa094]">Something concrete to keep you motivated</p>}
                  <span className="text-[11px] text-[#9aa094]">{goal.length}/16</span>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Appearance */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Sparkles className="w-7 h-7 text-indigo-500" />
                </div>
                <h3 className="text-xl font-bold text-[#1c1f1a]">Customize Appearance</h3>
                <p className="text-sm text-[#9aa094] mt-1">Choose an icon and color theme</p>
              </div>

              {/* Preview */}
              <div className="flex items-center gap-4 p-4 bg-[#f4f7f2] rounded-xl border border-[#e2e6dc]">
                <div className="w-14 h-14 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0" style={{ backgroundColor: color }}>
                  <SkillIcon name={icon} size={28} />
                </div>
                <div>
                  <p className="text-[15px] font-bold text-[#1c1f1a]">{title.trim() || 'Your Skill Map'}</p>
                  <p className="text-[12px] text-[#9aa094]">This is how your skill map will look</p>
                </div>
              </div>

              {/* Icon picker */}
              <div>
                <label className="block text-sm font-semibold text-[#1c1f1a] mb-3">Choose Icon</label>
                <IconPicker value={icon} onChange={setIcon} />
              </div>

              {/* Color picker */}
              <div>
                <label className="block text-sm font-semibold text-[#1c1f1a] mb-3">Theme Color</label>
                <div className="grid grid-cols-6 gap-3">
                  {COLOR_THEMES.map(theme => (
                    <button key={theme.value} type="button" onClick={() => setColor(theme.value)} title={theme.name}
                      className="relative">
                      <div className={`w-full aspect-square rounded-xl transition-all ${
                        color === theme.value ? 'ring-2 ring-offset-2 ring-[#1c1f1a] scale-110' : 'hover:scale-105 border-2 border-black/5'
                      }`} style={{ backgroundColor: theme.value }}>
                        {color === theme.value && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Check className="w-5 h-5 text-white drop-shadow-lg" strokeWidth={3} />
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Nodes */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Target className="w-7 h-7 text-indigo-500" />
                </div>
                <h3 className="text-xl font-bold text-[#1c1f1a]">Add Learning Nodes</h3>
                <p className="text-sm text-[#9aa094] mt-1">Up to {maxNodes} nodes for your path</p>
              </div>

              <div className="space-y-2">
                {nodeInputs.map((val, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-7 h-7 min-w-[28px] rounded-full text-white text-[10px] font-bold flex items-center justify-center shrink-0" style={{ backgroundColor: color }}>{i + 1}</div>
                    <input type="text" value={val} onChange={e => updateNodeRow(i, e.target.value)} maxLength={16}
                      placeholder={`Node ${i + 1} title`}
                      className="flex-1 px-3 py-2.5 min-h-[44px] border-2 border-[#e2e6dc] rounded-xl outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/15 bg-white text-sm transition-all" />
                    <span className="text-[10px] text-[#c8cec0] w-8 text-right shrink-0">{val.length}/16</span>
                    <button type="button" onClick={() => removeNodeRow(i)} disabled={nodeInputs.length <= 1}
                      className="w-9 h-9 min-w-[44px] min-h-[44px] rounded-lg flex items-center justify-center text-[#c8cec0] hover:text-red-500 hover:bg-red-50 active:bg-red-100 disabled:opacity-30 transition-all shrink-0"
                      aria-label={`Remove node ${i + 1}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <button type="button" onClick={addNodeRow} disabled={nodeInputs.length >= maxNodes}
                className="flex items-center justify-center gap-1.5 min-h-[44px] px-4 py-2.5 text-[12px] font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 active:bg-indigo-100 disabled:text-[#c8cec0] disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors rounded-lg">
                <Plus className="w-3.5 h-3.5" /> Add node ({nodeInputs.length}/{maxNodes})
              </button>

              {attemptedNext[3] && nodeInputs.map(x => x.trim()).filter(Boolean).length === 0 && (
                <p className="text-xs text-red-500">Add at least 1 node with a title</p>
              )}
              {attemptedNext[3] && (() => {
                const filled = nodeInputs.map(x => x.trim()).filter(Boolean);
                const lower = filled.map(x => x.toLowerCase());
                return lower.length !== new Set(lower).size;
              })() && <p className="text-xs text-red-500">Node titles must be unique</p>}

              {/* Path preview */}
              {filledSketchTitles.length > 0 && (
                <div className="bg-[#f4f7f2] rounded-xl p-4 border border-[#e2e6dc]">
                  <p className="text-[10px] font-semibold text-[#9aa094] uppercase tracking-wider mb-3">Path Preview</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {filledSketchTitles.map((t, i) => (
                      <Fragment key={i}>
                        {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-[#c8cec0] shrink-0" />}
                        <span className="px-2.5 py-1 bg-white border border-indigo-200 rounded-lg text-[12px] font-medium text-indigo-700">{t}</span>
                      </Fragment>
                    ))}
                    {goal.trim() && (
                      <>
                        <ChevronRight className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-lg text-[12px] font-semibold text-amber-700 flex items-center gap-1">
                          <Target className="w-3 h-3" /> {goal.trim()}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <div className="space-y-5">
              <div className="text-center mb-6">
                <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Check className="w-7 h-7 text-indigo-500" />
                </div>
                <h3 className="text-xl font-bold text-[#1c1f1a]">Review & Create</h3>
                <p className="text-sm text-[#9aa094] mt-1">Everything looks good?</p>
              </div>

              {/* Preview Card */}
              <div className="bg-[#f8faf6] rounded-2xl border border-[#e2e6dc] p-5">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0 text-white"
                    style={{ backgroundColor: color, boxShadow: `0 8px 16px -4px ${color}40` }}>
                    <SkillIcon name={icon} size={28} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-lg font-bold text-[#1c1f1a] mb-1">{title.trim()}</h4>
                    <p className="text-sm text-[#9aa094] leading-relaxed">{description.trim() || 'No description provided'}</p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-[#e2e6dc] grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-lg p-3 border border-[#e2e6dc]">
                    <p className="text-[10px] font-semibold text-[#9aa094] uppercase tracking-wider mb-1">Goal</p>
                    <p className="text-[13px] font-semibold text-indigo-700">{goal.trim()}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-[#e2e6dc]">
                    <p className="text-[10px] font-semibold text-[#9aa094] uppercase tracking-wider mb-1">Nodes</p>
                    <p className="text-[13px] font-semibold text-[#1c1f1a]">{filledSketchTitles.length} node{filledSketchTitles.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              </div>

              {/* Node list */}
              {filledSketchTitles.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-[#9aa094] uppercase tracking-wider mb-2">Learning Path</p>
                  <div className="space-y-0">
                    {filledSketchTitles.map((t, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="flex flex-col items-center">
                          <div className="w-6 h-6 rounded-full text-white text-[10px] font-bold flex items-center justify-center" style={{ backgroundColor: color }}>{i + 1}</div>
                          {i < filledSketchTitles.length - 1 && <div className="w-0.5 h-4" style={{ backgroundColor: color + '40' }} />}
                        </div>
                        <p className="text-[13px] font-medium text-[#1c1f1a] py-1.5">{t}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ready message */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-emerald-800">Ready to start learning!</p>
                    <p className="text-xs text-emerald-600 mt-0.5">Your skill map will be created with {filledSketchTitles.length} nodes to complete.</p>
                  </div>
                </div>
              </div>

              {submitError && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2.5 rounded-xl text-[12px]">{submitError}</div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-5 sm:px-6 py-4 bg-[#f8faf6] border-t border-[#e2e6dc]">
          <div className="flex flex-col sm:flex-row gap-3">
            <button type="button" onClick={step === 1 ? resetAndClose : goBack} disabled={isSubmitting}
              className="flex-1 py-3 min-h-[44px] border-2 border-[#e2e6dc] text-[#565c52] rounded-xl font-semibold text-sm hover:bg-white active:bg-[#f4f7f2] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {step === 1 ? (<><X className="w-4 h-4" /> Cancel</>) : (<><ArrowRight className="w-4 h-4 rotate-180" /> Back</>)}
            </button>

            {step < totalSteps ? (
              <button type="button" onClick={goNext} disabled={!canProceed() && attemptedNext[step]}
                className="flex-1 py-3 min-h-[44px] text-white rounded-xl font-semibold text-sm transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}>
                Next <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button type="button" onClick={handleCreate} disabled={isSubmitting}
                className="flex-1 py-3 min-h-[44px] text-white rounded-xl font-semibold text-sm transition-all disabled:opacity-50 shadow-lg flex items-center justify-center gap-2"
                style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}>
                {isSubmitting ? (<><Loader2 className="w-4 h-4 animate-spin" /> Creating...</>) : (<><Plus className="w-4 h-4" /> Create Skill Map</>)}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}