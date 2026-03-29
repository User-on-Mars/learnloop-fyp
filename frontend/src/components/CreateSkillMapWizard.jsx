import { Fragment, useMemo, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useSkillMap } from '../context/SkillMapContext';

const ICON_OPTIONS = ['🗺️', '📚', '⚙️', '🎯', '💻', '🎨', '🔬', '🏆', '🧠', '📐', '🌐', '🚀'];

const STEPS = [
  { id: 1, label: 'Name & icon' },
  { id: 2, label: 'Goal' },
  { id: 3, label: 'Sketch nodes' },
  { id: 4, label: 'Review' }
];

function truncate(s, n) {
  if (!s) return '';
  return s.length <= n ? s : `${s.slice(0, n)}…`;
}

export default function CreateSkillMapWizard({ isOpen, onClose, onCreated }) {
  const { skills, createSkillMap } = useSkillMap();
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState(ICON_OPTIONS[0]);
  const [goal, setGoal] = useState('');
  const [nodeInputs, setNodeInputs] = useState(['', '', '']);
  const [attemptedNext, setAttemptedNext] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const titleUnique = useMemo(() => {
    const t = title.trim().toLowerCase();
    if (!t) return true;
    return !skills.some((s) => (s.name || '').trim().toLowerCase() === t);
  }, [skills, title]);

  const reset = () => {
    setStep(1);
    setTitle('');
    setDescription('');
    setIcon(ICON_OPTIONS[0]);
    setGoal('');
    setNodeInputs(['', '', '']);
    setAttemptedNext({});
    setSubmitError('');
    setIsSubmitting(false);
  };

  const resetAndClose = () => {
    reset();
    onClose();
  };

  if (!isOpen) return null;

  const markAttempt = (s) => setAttemptedNext((prev) => ({ ...prev, [s]: true }));

  const goNextFrom1 = () => {
    markAttempt(1);
    if (!title.trim() || !titleUnique) return;
    setStep(2);
  };

  const goNextFrom2 = () => {
    markAttempt(2);
    if (!goal.trim()) return;
    setStep(3);
  };

  const sketchTitlesNonUnique = () => {
    const filled = nodeInputs.map((x) => x.trim()).filter(Boolean);
    const lower = filled.map((x) => x.toLowerCase());
    return lower.length !== new Set(lower).size;
  };

  const goNextFrom3 = () => {
    markAttempt(3);
    if (sketchTitlesNonUnique()) return;
    setStep(4);
  };

  const skipStep3 = () => setStep(4);

  const filledSketchTitles = nodeInputs.map((x) => x.trim()).filter(Boolean);
  const contentCount = filledSketchTitles.length;

  const addNodeRow = () => {
    if (nodeInputs.length >= 6) return;
    setNodeInputs((prev) => [...prev, '']);
  };

  const removeNodeRow = (index) => {
    if (nodeInputs.length <= 1) return;
    setNodeInputs((prev) => prev.filter((_, i) => i !== index));
  };

  const updateNodeRow = (index, value) => {
    setNodeInputs((prev) => prev.map((v, i) => (i === index ? value : v)));
  };

  const handleCreate = async () => {
    setSubmitError('');
    setIsSubmitting(true);
    try {
      const { skill } = await createSkillMap({
        title: title.trim(),
        description: description.trim() || null,
        icon,
        goal: goal.trim(),
        sketchTitles: filledSketchTitles
      });
      const id = skill._id ?? skill.id;
      const t = title.trim();
      onCreated?.({ skillId: String(id), title: t });
      resetAndClose();
    } catch (e) {
      const msg = e.message || 'Could not create skill map';
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="border-b border-gray-100 px-2 py-4">
      <div className="flex w-full flex-nowrap items-start">
        {STEPS.map((s, idx) => {
          const isActive = step === s.id;
          const isDone = step > s.id;
          const segmentDone = idx > 0 && step > idx;

          return (
            <Fragment key={s.id}>
              {idx > 0 && (
                <div
                  className="flex h-8 min-w-[6px] shrink flex-1 items-center sm:min-w-[10px]"
                  aria-hidden
                >
                  <div
                    className={`h-0.5 w-full rounded-full ${
                      segmentDone ? 'bg-site-accent' : 'bg-gray-200'
                    }`}
                  />
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  if (s.id < step) setStep(s.id);
                }}
                className={`flex w-[4.25rem] shrink-0 flex-col items-center sm:w-[5.25rem] ${
                  s.id < step ? 'cursor-pointer' : 'cursor-default'
                }`}
                aria-current={isActive ? 'step' : undefined}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold ${
                    isDone
                      ? 'border-site-accent bg-site-accent text-white'
                      : isActive
                        ? 'border-site-accent bg-site-accent text-white'
                        : 'border-gray-300 bg-white text-gray-400'
                  }`}
                >
                  {isDone || isActive ? s.id : ''}
                </span>
                <span
                  className={`mt-2 text-center text-[10px] font-medium leading-tight sm:text-xs ${
                    isDone ? 'text-site-accent' : isActive ? 'text-gray-900' : 'text-gray-400'
                  }`}
                >
                  {s.label}
                </span>
              </button>
            </Fragment>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[92vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Create skill map</h2>
          <button
            type="button"
            onClick={resetAndClose}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {renderStepIndicator()}

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value.slice(0, 60))}
                  className="w-full border-2 border-transparent rounded-lg px-3 py-2 text-sm outline-none focus:border-site-accent transition-colors bg-gray-50 focus:bg-white"
                  placeholder="My learning path"
                  maxLength={60}
                />
                <div className="flex justify-end mt-1 text-xs text-gray-500">{title.length}/60</div>
                {attemptedNext[1] && !title.trim() && (
                  <p className="text-sm text-red-600 mt-1">Title is required</p>
                )}
                {attemptedNext[1] && title.trim() && !titleUnique && (
                  <p className="text-sm text-red-600 mt-1">You already have a map with this title</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, 120))}
                  rows={3}
                  className="w-full border-2 border-transparent rounded-lg px-3 py-2 text-sm outline-none focus:border-site-accent transition-colors bg-gray-50 focus:bg-white"
                  placeholder="What will this skill map help you learn?"
                  maxLength={120}
                />
                <div className="text-right text-xs text-gray-500 mt-1">{description.length}/120</div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Icon</label>
                <div className="grid grid-cols-6 gap-2">
                  {ICON_OPTIONS.map((em) => {
                    const selected = icon === em;
                    return (
                      <button
                        key={em}
                        type="button"
                        onClick={() => setIcon(em)}
                        className={`text-2xl h-11 w-full rounded-lg border-2 flex items-center justify-center transition-colors outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--site-accent,#2e5023)] focus-visible:ring-offset-2 ${
                          selected
                            ? 'border-[var(--site-accent,#2e5023)] bg-site-soft shadow-[0_0_0_3px_rgba(46,80,35,0.18)]'
                            : 'border-gray-200 bg-white hover:border-[var(--site-accent,#2e5023)] hover:bg-site-soft/70'
                        }`}
                      >
                        {em}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">Goal</label>
              <textarea
                value={goal}
                onChange={(e) => setGoal(e.target.value.slice(0, 200))}
                rows={4}
                className="w-full border-2 border-transparent rounded-lg px-3 py-2 text-sm outline-none focus:border-site-accent transition-colors bg-gray-50 focus:bg-white"
                placeholder="e.g. Build and deploy a working ML model from scratch using Python…"
                maxLength={200}
              />
              <div className="flex justify-end text-xs text-gray-500">{goal.length}/200</div>
              {attemptedNext[2] && !goal.trim() && (
                <p className="text-sm text-red-600">Goal is required</p>
              )}
              <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 border border-gray-100">
                Write it as something concrete you can do or build — not just &apos;learn Python.&apos; A clear goal
                keeps you motivated.
              </p>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Optional: add up to six titles to block out your path. Empty rows are ignored.
              </p>
              <div className="space-y-2">
                {nodeInputs.map((val, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <span className="text-xs text-gray-500 w-5 text-right shrink-0">{i + 1}.</span>
                    <input
                      type="text"
                      value={val}
                      onChange={(e) => updateNodeRow(i, e.target.value)}
                      className="flex-1 border-2 border-transparent rounded-lg px-3 py-2 text-sm min-w-0 outline-none focus:border-site-accent transition-colors bg-gray-50 focus:bg-white"
                      placeholder={`Node ${i + 1}`}
                    />
                    <button
                      type="button"
                      onClick={() => removeNodeRow(i)}
                      disabled={nodeInputs.length <= 1}
                      className="shrink-0 px-2 py-2 text-gray-500 hover:text-red-600 disabled:opacity-30 text-lg leading-none"
                      aria-label="Remove row"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addNodeRow}
                disabled={nodeInputs.length >= 6}
                className="text-sm font-medium text-site-accent hover:text-site-accent-hover disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                ＋ Add node ({nodeInputs.length}/6)
              </button>
              {attemptedNext[3] && sketchTitlesNonUnique() && (
                <p className="text-sm text-red-600">Node titles must be unique</p>
              )}

              <div className="rounded-lg border border-site-border bg-site-bg/80 p-3 sm:p-4 overflow-x-auto">
                <p className="text-[10px] font-medium uppercase tracking-wide text-site-muted mb-2">Path preview</p>
                <div className="flex items-center gap-1.5 sm:gap-2 flex-nowrap min-w-0 text-xs sm:text-sm">
                  <span className="shrink-0 inline-flex items-center gap-1 rounded-md border border-site-border bg-site-surface px-2 py-1 font-semibold text-site-accent">
                    <span aria-hidden>🚩</span> START
                  </span>
                  {nodeInputs.map((val, i) => (
                    <span key={i} className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                      <span className="text-site-accent font-semibold" aria-hidden>
                        →
                      </span>
                      <span className="inline-flex max-w-[9rem] sm:max-w-[11rem] truncate rounded-md border border-dashed border-site-accent/40 bg-site-soft px-2 py-1 font-medium text-site-ink">
                        {truncate(val.trim() || `Node ${i + 1}`, 20)}
                      </span>
                    </span>
                  ))}
                  <span className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    <span className="text-site-accent font-semibold" aria-hidden>
                      →
                    </span>
                    <span className="shrink-0 inline-flex items-center gap-1 rounded-md border border-site-border bg-site-surface px-2 py-1 font-semibold text-site-accent">
                      <span aria-hidden>🏆</span> GOAL
                    </span>
                  </span>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4 text-sm">
              <div className="flex items-start gap-2">
                <span className="text-2xl">{icon}</span>
                <div>
                  <p className="font-semibold text-gray-900 text-base">{title.trim() || '—'}</p>
                  {(description || '').trim() ? (
                    <p className="text-gray-600 mt-1">{description.trim()}</p>
                  ) : null}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Goal</p>
                <div className="mt-2 rounded-lg border border-site-border bg-site-soft p-3 text-xs sm:text-sm text-site-accent whitespace-pre-wrap font-medium">
                  {goal.trim()}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Sketch nodes</p>
                {filledSketchTitles.length === 0 ? (
                  <p className="text-gray-600">No nodes sketched — add them after creation.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {filledSketchTitles.map((t, i) => (
                      <span
                        key={`${i}-${t}`}
                        className="inline-flex px-2 py-1 bg-site-soft text-site-accent rounded-full text-xs"
                      >
                        {i + 1}. {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 border-t border-gray-100 pt-3">
                START and GOAL nodes are auto-created. {contentCount} content node{contentCount === 1 ? '' : 's'}{' '}
                will be added as &apos;not started&apos;.
              </p>
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 px-4 py-3 flex flex-wrap items-center gap-2 justify-between bg-gray-50">
          <div>
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="px-4 py-2 text-sm font-medium text-site-ink rounded-lg transition-colors hover:bg-site-soft hover:text-site-accent"
              >
                Back
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2 justify-end">
            {step === 1 && (
              <button
                type="button"
                onClick={goNextFrom1}
                className="px-4 py-2 text-sm font-medium text-white bg-site-accent rounded-lg hover:bg-site-accent-hover"
              >
                Next
              </button>
            )}
            {step === 2 && (
              <button
                type="button"
                onClick={goNextFrom2}
                className="px-4 py-2 text-sm font-medium text-white bg-site-accent rounded-lg hover:bg-site-accent-hover"
              >
                Next
              </button>
            )}
            {step === 3 && (
              <>
                <button
                  type="button"
                  onClick={skipStep3}
                  className="wizard-foot-skip px-4 py-2 text-sm font-medium rounded-lg transition-colors"
                >
                  Skip
                </button>
                <button
                  type="button"
                  onClick={goNextFrom3}
                  className="px-4 py-2 text-sm font-medium text-white bg-site-accent rounded-lg hover:bg-site-accent-hover"
                >
                  Continue →
                </button>
              </>
            )}
            {step === 4 && (
              <>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleCreate}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-site-accent rounded-lg hover:bg-site-accent-hover disabled:opacity-60"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create skill map
                </button>
              </>
            )}
          </div>
        </div>
        {step === 4 && submitError && (
          <p className="px-4 pb-3 text-sm text-red-600 bg-gray-50 -mt-1">{submitError}</p>
        )}
      </div>
    </div>
  );
}
