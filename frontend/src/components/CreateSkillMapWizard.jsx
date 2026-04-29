import { Fragment, useMemo, useState, useEffect } from 'react';
import { X, Loader2, ChevronRight, Check, Plus, Trash2, Target, Map } from 'lucide-react';
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

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const markAttempt = s => setAttemptedNext(p => ({ ...p, [s]: true }));
  const filledSketchTitles = nodeInputs.map(x => x.trim()).filter(Boolean);

  const goNext = () => {
    markAttempt(step);
    if (step === 1 && (!title.trim() || !titleUnique || !goal.trim())) return;
    if (step === 3) {
      const filled = nodeInputs.map(x => x.trim()).filter(Boolean);
      const lower = filled.map(x => x.toLowerCase());
      if (filled.length === 0 || lower.length !== new Set(lower).size) return;
    }
    setStep(s => Math.min(4, s + 1));
  };

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

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col border border-[#e2e6dc]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e2e6dc]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#edf5e9] flex items-center justify-center">
              <Map className="w-[18px] h-[18px] text-[#2e5023]" />
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-[#1c1f1a]">Create Skill Map</h2>
              <p className="text-[11px] text-[#9aa094]">Step {step} of {STEPS.length} — {STEPS[step - 1].label}</p>
            </div>
          </div>
          <button type="button" onClick={resetAndClose} className="text-[#c8cec0] hover:text-[#1c1f1a] transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="px-6 py-3 border-b border-[#e8ece3] bg-[#f8faf6]">
          <div className="flex items-center gap-1">
            {STEPS.map((s, i) => {
              const active = step === s.id;
              const done = step > s.id;
              return (
                <Fragment key={s.id}>
                  {i > 0 && <div className={`flex-1 h-0.5 rounded-full mx-1 ${done ? 'bg-[#2e5023]' : 'bg-[#e2e6dc]'}`} />}
                  <button type="button" onClick={() => { if (s.id < step) setStep(s.id); }}
                    disabled={s.id > step}
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 transition-all ${
                      done ? 'bg-[#2e5023] text-white' :
                      active ? 'bg-[#2e5023] text-white ring-4 ring-[#2e5023]/15' :
                      'bg-[#e8ece3] text-[#9aa094]'
                    }`}>
                    {done ? <Check className="w-3.5 h-3.5" /> : s.id}
                  </button>
                </Fragment>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* Step 1: Basics — Title, Description, Goal */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-[#1c1f1a] mb-2">
                  Title <span className="text-red-400">*</span>
                  <span className="text-xs text-[#9aa094] font-normal ml-2">{title.length}/20</span>
                </label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value.slice(0, 20))} maxLength={20}
                  placeholder="e.g. Python Basics, Guitar"
                  className="w-full px-4 py-2.5 border border-[#e2e6dc] rounded-xl outline-none focus:border-[#4f7942] focus:ring-2 focus:ring-[#4f7942]/15 bg-[#f8faf6] focus:bg-white text-sm transition-all" />
                {attemptedNext[1] && !title.trim() && <p className="text-xs text-red-500 mt-1.5">Title is required</p>}
                {attemptedNext[1] && title.trim() && !titleUnique && <p className="text-xs text-red-500 mt-1.5">You already have a map with this title</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#1c1f1a] mb-2">
                  Description <span className="text-xs text-[#9aa094] font-normal">(optional · {description.length}/120)</span>
                </label>
                <textarea value={description} onChange={e => setDescription(e.target.value.slice(0, 120))} rows={2} maxLength={120}
                  placeholder="What will this skill map help you learn?"
                  className="w-full px-4 py-2.5 border border-[#e2e6dc] rounded-xl outline-none focus:border-[#4f7942] focus:ring-2 focus:ring-[#4f7942]/15 bg-[#f8faf6] focus:bg-white text-sm resize-none transition-all" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#1c1f1a] mb-2">
                  Goal <span className="text-red-400">*</span>
                  <span className="text-xs text-[#9aa094] font-normal ml-2">{goal.length}/16</span>
                </label>
                <input type="text" value={goal} onChange={e => setGoal(e.target.value.slice(0, 16))} maxLength={16}
                  placeholder="e.g. Build a web app"
                  className="w-full px-4 py-2.5 border border-[#e2e6dc] rounded-xl outline-none focus:border-[#4f7942] focus:ring-2 focus:ring-[#4f7942]/15 bg-[#f8faf6] focus:bg-white text-sm transition-all" />
                {attemptedNext[1] && !goal.trim() && <p className="text-xs text-red-500 mt-1.5">Goal is required</p>}
                <p className="text-[11px] text-[#9aa094] mt-1.5">Something concrete you can do or build — keeps you motivated.</p>
              </div>
            </div>
          )}

          {/* Step 2: Appearance — Icon + Color */}
          {step === 2 && (
            <div className="space-y-6">
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
                <div className="grid grid-cols-6 gap-2.5">
                  {COLOR_THEMES.map(theme => (
                    <button key={theme.value} type="button" onClick={() => setColor(theme.value)} title={theme.name}
                      className="group relative">
                      <div className={`w-full aspect-square rounded-xl transition-all ${
                        color === theme.value ? 'ring-2 ring-offset-2 ring-[#1c1f1a] scale-110' : 'hover:scale-105 hover:shadow-md'
                      }`} style={{ backgroundColor: theme.value }}>
                        {color === theme.value && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Check className="w-4 h-4 text-white drop-shadow-lg" strokeWidth={3} />
                          </div>
                        )}
                      </div>
                      <p className="text-[9px] text-[#9aa094] text-center mt-1 truncate">{theme.name}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Nodes */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-[12px] text-[#565c52]">
                Add up to {maxNodes} nodes for your learning path. Node 1 is your starting point.
              </p>

              <div className="space-y-2">
                {nodeInputs.map((val, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#2e5023] text-white text-[10px] font-bold flex items-center justify-center shrink-0">{i + 1}</div>
                    <input type="text" value={val} onChange={e => updateNodeRow(i, e.target.value)} maxLength={16}
                      placeholder={`Node ${i + 1} title`}
                      className="flex-1 px-3 py-2 border border-[#e2e6dc] rounded-lg outline-none focus:border-[#4f7942] focus:ring-2 focus:ring-[#4f7942]/15 bg-[#f8faf6] focus:bg-white text-sm transition-all" />
                    <span className="text-[10px] text-[#c8cec0] w-8 text-right shrink-0">{val.length}/16</span>
                    <button type="button" onClick={() => removeNodeRow(i)} disabled={nodeInputs.length <= 1}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-[#c8cec0] hover:text-red-500 hover:bg-red-50 disabled:opacity-30 transition-all shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <button type="button" onClick={addNodeRow} disabled={nodeInputs.length >= maxNodes}
                className="flex items-center gap-1.5 text-[12px] font-semibold text-[#2e5023] hover:text-[#4f7942] disabled:text-[#c8cec0] disabled:cursor-not-allowed transition-colors">
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
                        <span className="px-2.5 py-1 bg-white border border-[#d4e8cc] rounded-lg text-[12px] font-medium text-[#2e5023]">{t}</span>
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
              {/* Card preview */}
              <div className="bg-[#f4f7f2] rounded-xl p-5 border border-[#e2e6dc]">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0" style={{ backgroundColor: color }}>
                    <SkillIcon name={icon} size={28} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[17px] font-bold text-[#1c1f1a] break-words">{title.trim()}</h3>
                    {description.trim() && <p className="text-[12px] text-[#565c52] mt-1 break-words">{description.trim()}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-lg p-3 border border-[#e2e6dc]">
                    <p className="text-[10px] font-semibold text-[#9aa094] uppercase tracking-wider mb-1">Goal</p>
                    <p className="text-[13px] font-semibold text-[#2e5023]">{goal.trim()}</p>
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

              {submitError && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2.5 rounded-xl text-[12px]">{submitError}</div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[#e2e6dc] px-6 py-4 bg-[#f8faf6] flex items-center justify-between">
          <div>
            {step > 1 ? (
              <button type="button" onClick={() => setStep(s => s - 1)}
                className="text-[13px] font-semibold text-[#565c52] hover:text-[#2e5023] transition-colors">
                Back
              </button>
            ) : (
              <button type="button" onClick={resetAndClose}
                className="text-[13px] font-semibold text-[#9aa094] hover:text-[#565c52] transition-colors">
                Cancel
              </button>
            )}
          </div>
          <div>
            {step < 4 ? (
              <button type="button" onClick={goNext}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-[#2e5023] text-white text-[13px] font-bold rounded-xl hover:bg-[#4f7942] transition-all shadow-sm active:scale-[0.97]">
                Next <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button type="button" onClick={handleCreate} disabled={isSubmitting}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#2e5023] text-white text-[13px] font-bold rounded-xl hover:bg-[#4f7942] disabled:opacity-50 transition-all shadow-sm active:scale-[0.97]">
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {isSubmitting ? 'Creating...' : 'Create Skill Map'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
