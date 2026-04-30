import { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Trash2, ChevronRight, ChevronLeft, Target, Palette, Check, X,
  Crown, Sparkles, Search, Map, BarChart3, Layout, Loader2, ArrowRight,
} from 'lucide-react';
import { useSkillMap } from '../context/SkillMapContext';
import { useToast } from '../context/ToastContext';
import { useSubscription } from '../context/SubscriptionContext';
import { skillMapAPI } from '../api/client';
import { auth } from '../firebase';
import CreateSkillMapWizard from './CreateSkillMapWizard';
import TemplatePreview from './TemplatePreview';
import FilterDropdown from './FilterDropdown';
import { SkillIcon } from './IconPicker';
import { COLOR_THEMES } from './ColorPicker';

const PER_PAGE = 9;

export default function SkillList() {
  const navigate = useNavigate();
  const { showSuccess } = useToast();
  const { skills, deleteSkill, loadSkills, updateSkillMap } = useSkillMap();
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [applyingTemplate, setApplyingTemplate] = useState(null);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [deletingSkillId, setDeletingSkillId] = useState(null);
  const [skillPendingDeleteId, setSkillPendingDeleteId] = useState(null);
  const [page, setPage] = useState(1);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  const [colorPickerOpen, setColorPickerOpen] = useState(null);
  const [searchQ, setSearchQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeView, setActiveView] = useState('maps');
  const [templateSearch, setTemplateSearch] = useState('');
  const [templateSort, setTemplateSort] = useState('popular');
  const { limits, isFree } = useSubscription();
  const maxSkillMaps = limits?.maxSkillMaps === -1 ? Infinity : (limits?.maxSkillMaps ?? 3);
  const hasReachedSkillMapLimit = skills.length >= maxSkillMaps;

  const handleCreateClick = () => {
    if (hasReachedSkillMapLimit && isFree) return;
    setIsWizardOpen(true);
  };

  const fetchTemplates = useCallback(async () => {
    try {
      setTemplatesLoading(true);
      const token = await auth.currentUser.getIdToken();
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000/api'}/templates`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed');
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch { setTemplates([]); }
    finally { setTemplatesLoading(false); }
  }, []);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const handleApplyTemplate = async (template) => {
    setApplyingTemplate(template._id || template.id);
    try {
      const { data } = await skillMapAPI.createSkillMapFromTemplate({
        templateId: template._id || template.id,
        template: { title: template.title, description: template.description, icon: template.icon, goal: template.goal, nodes: template.nodes }
      });
      const skill = data.skill;
      const id = skill._id ?? skill.id;
      showSuccess(`Skill map "${template.title}" created!`);
      loadSkills();
      navigate(`/skills/${id}`);
    } catch (e) {
      showSuccess(e?.response?.data?.error || 'Failed to create skill map');
    } finally { setApplyingTemplate(null); }
  };

  useEffect(() => {
    if (colorPickerOpen) {
      const h = () => setColorPickerOpen(null);
      document.addEventListener('click', h);
      return () => document.removeEventListener('click', h);
    }
  }, [colorPickerOpen]);

  const openDeleteSkillModal = (skillId, e) => { e.stopPropagation(); setSkillPendingDeleteId(skillId); setDeleteConfirmInput(''); };
  const closeDeleteSkillModal = () => { setSkillPendingDeleteId(null); setDeleteConfirmInput(''); };
  const handleDeleteSkillConfirmed = async () => {
    if (deleteConfirmInput !== 'CONFIRM' || !skillPendingDeleteId) return;
    const id = skillPendingDeleteId; closeDeleteSkillModal();
    try { setDeletingSkillId(id); await deleteSkill(id); } catch {} finally { setDeletingSkillId(null); }
  };
  const handleColorChange = async (skillId, newColor, e) => {
    e.stopPropagation(); setColorPickerOpen(null);
    try { await updateSkillMap(skillId, { color: newColor }); showSuccess('Color updated!'); } catch {}
  };

  const completedMaps = skills.filter(s => (s.completionPercentage || 0) === 100).length;
  const inProgressMaps = skills.filter(s => { const p = s.completionPercentage || 0; return p > 0 && p < 100; }).length;
  const totalNodes = skills.reduce((s, sk) => s + (sk.nodeCount || 0), 0);

  const filtered = useMemo(() => {
    return skills.filter(s => {
      if (s.locked) return false;
      if (searchQ && !s.name?.toLowerCase().includes(searchQ.toLowerCase())) return false;
      if (statusFilter !== 'all') {
        const pct = s.completionPercentage || 0;
        if (statusFilter === 'done' && pct !== 100) return false;
        if (statusFilter === 'active' && !(pct > 0 && pct < 100)) return false;
        if (statusFilter === 'new' && pct !== 0) return false;
      }
      return true;
    });
  }, [skills, searchQ, statusFilter]);

  const lockedSkills = skills.filter(s => s.locked);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const hasFilters = searchQ || statusFilter !== 'all';

  useEffect(() => { setPage(1); }, [searchQ, statusFilter]);

  useEffect(() => {
    if (previewTemplate || skillPendingDeleteId) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [previewTemplate, skillPendingDeleteId]);

  return (
    <div className="space-y-5">

      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-violet-50 rounded-2xl border border-indigo-100 p-6 sm:p-8">
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-indigo-200 opacity-15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-36 h-36 rounded-full bg-violet-200 opacity-10 blur-2xl pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-sm">
                <Map className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-[#1c1f1a]">Skill Maps</h1>
                <p className="text-sm text-indigo-600 font-medium">Visual Learning Paths</p>
              </div>
            </div>
            <p className="text-[#565c52] text-[15px] leading-relaxed max-w-xl">
              Track your learning journey with visual progression paths. Create maps, add nodes, and watch your skills grow.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {hasReachedSkillMapLimit && isFree && (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl">
                <Crown className="w-4 h-4 text-amber-500" />
                <span className="text-xs text-amber-700 font-medium">{limits?.maxSkillMaps ?? 3} map limit</span>
                <a href="/subscription" className="text-xs text-amber-600 font-bold hover:underline">Upgrade</a>
              </div>
            )}
            <button onClick={handleCreateClick} disabled={hasReachedSkillMapLimit && isFree}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all shadow-lg active:scale-[0.97] ${
                hasReachedSkillMapLimit && isFree
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                  : 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-700 hover:to-violet-700 shadow-indigo-500/20'
              }`}>
              <Plus className="w-4 h-4" /> Create Skill Map
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="relative grid grid-cols-4 gap-4 mt-6 pt-6 border-t border-indigo-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
              <Map className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-[#1c1f1a] leading-none">{skills.filter(s => !s.locked).length}</p>
              <p className="text-[11px] text-[#9aa094] mt-0.5">Total Maps</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-[#1c1f1a] leading-none">{completedMaps}</p>
              <p className="text-[11px] text-[#9aa094] mt-0.5">Completed</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-[#1c1f1a] leading-none">{inProgressMaps}</p>
              <p className="text-[11px] text-[#9aa094] mt-0.5">In Progress</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
              <Target className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-[#1c1f1a] leading-none">{totalNodes}</p>
              <p className="text-[11px] text-[#9aa094] mt-0.5">Total Nodes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Upgrade Banner */}
      {hasReachedSkillMapLimit && isFree && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-3">
          <div className="p-2 bg-amber-100 rounded-xl flex-shrink-0"><Sparkles className="w-5 h-5 text-amber-600" /></div>
          <div className="flex-1">
            <p className="font-semibold text-amber-900 text-sm">You've reached the limit of {limits.maxSkillMaps} skill maps</p>
            <p className="text-amber-700 text-xs mt-1">Delete a skill map or upgrade to Pro for unlimited.</p>
            <a href="/subscription" className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-xl transition-colors">
              <Crown className="w-4 h-4" /> Upgrade to Pro
            </a>
          </div>
        </div>
      )}

      {/* Tab Switcher */}
      <div className="bg-white rounded-2xl border border-[#e2e6dc]">
        <div className="px-4 py-3">
          <div className="flex bg-[#f5f7f2] rounded-xl p-1 border border-[#e8ebe4]">
            {[
              { id: 'maps', label: 'My Skill Maps', count: skills.filter(s => !s.locked).length },
              { id: 'templates', label: 'Explore Templates', count: templates.length },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveView(tab.id)}
                className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  activeView === tab.id
                    ? 'bg-white text-[#1c1f1a] shadow-sm'
                    : 'text-[#9aa094] hover:text-[#565c52]'
                }`}>
                {tab.label} <span className="text-[10px] opacity-60">({tab.count})</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* My Skill Maps View */}
      {activeView === 'maps' && (<>
        {/* Search & Filter */}
        <div className="bg-white rounded-2xl border border-[#e2e6dc] p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#c8cec0]" />
              <input type="text" placeholder="Search skill maps..." value={searchQ} onChange={e => setSearchQ(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-[#e2e6dc] rounded-xl outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/15 bg-[#fafbf8] text-sm text-[#1c1f1a] placeholder:text-[#c8cec0] transition-all" />
            </div>
            <div className="flex items-center gap-2">
              <FilterDropdown value={statusFilter} onChange={v => setStatusFilter(v)}
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'done', label: 'Completed' },
                  { value: 'active', label: 'In Progress' },
                  { value: 'new', label: 'Not Started' },
                ]} />
              {hasFilters && <button onClick={() => { setSearchQ(''); setStatusFilter('all'); }} className="px-3 py-1.5 text-xs text-red-500 font-semibold hover:bg-red-50 rounded-lg transition-colors">Clear</button>}
              <span className="ml-auto text-[11px] text-[#9aa094]">
                {filtered.length > 0 && `${filtered.length} map${filtered.length !== 1 ? 's' : ''}`}
              </span>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="bg-white rounded-2xl border border-[#e2e6dc]">
          {filtered.length === 0 && !hasFilters && skills.filter(s => !s.locked).length === 0 ? (
            /* Empty State */
            <div className="overflow-hidden">
              <div className="p-12 text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-violet-100 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-indigo-500/10">
                  <Map className="w-10 h-10 text-indigo-500" />
                </div>
                <h3 className="text-xl font-bold text-[#1c1f1a] mb-2">No skill maps yet</h3>
                <p className="text-[#9aa094] max-w-md mx-auto mb-6 text-[15px]">
                  Create your first skill map or pick a template to start your learning journey.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <button onClick={handleCreateClick}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-semibold text-sm hover:from-indigo-700 hover:to-violet-700 transition-all shadow-lg shadow-indigo-500/20">
                    <Plus className="w-4 h-4" /> Create from Scratch
                  </button>
                  <button onClick={() => setActiveView('templates')}
                    className="inline-flex items-center gap-2 px-6 py-3 border border-[#e2e6dc] text-[#565c52] rounded-xl font-semibold text-sm hover:bg-[#f4f7f2] transition-all">
                    <Layout className="w-4 h-4" /> Browse Templates
                  </button>
                </div>
              </div>
              {/* Feature highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-3 border-t border-[#e2e6dc]">
                {[
                  { icon: Target, color: 'text-indigo-500', bg: 'bg-indigo-50', title: 'Visual Paths', desc: 'Track progress node by node' },
                  { icon: Sparkles, color: 'text-emerald-500', bg: 'bg-emerald-50', title: 'Earn XP', desc: 'Gain experience as you learn' },
                  { icon: Layout, color: 'text-violet-500', bg: 'bg-violet-50', title: 'Templates', desc: 'Start with curated paths' },
                ].map((feature, i) => (
                  <div key={i} className={`p-6 text-center ${i < 2 ? 'border-b sm:border-b-0 sm:border-r border-[#e2e6dc]' : ''}`}>
                    <div className={`w-10 h-10 ${feature.bg} rounded-xl flex items-center justify-center mx-auto mb-3`}>
                      <feature.icon className={`w-5 h-5 ${feature.color}`} />
                    </div>
                    <h4 className="text-sm font-bold text-[#1c1f1a] mb-1">{feature.title}</h4>
                    <p className="text-xs text-[#9aa094]">{feature.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-14 h-14 rounded-2xl bg-[#f4f7f2] flex items-center justify-center mx-auto mb-4">
                <Search className="w-7 h-7 text-[#c8cec0]" />
              </div>
              <h3 className="text-base font-bold text-[#1c1f1a] mb-1">No matching skill maps</h3>
              <p className="text-sm text-[#9aa094]">Try adjusting your filters</p>
            </div>
          ) : (<>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {paged.map((skill) => {
                const progress = skill.completionPercentage || 0;
                const isCompleted = progress >= 100;
                const isInProgress = progress > 0 && progress < 100;
                const themeColor = skill.color || '#4f46e5';
                return (
                  <div key={skill._id} onClick={() => navigate(`/skills/${skill._id}`)}
                    className="group relative bg-[#f8faf6] rounded-xl p-5 transition-all duration-200 border border-[#e2e6dc] cursor-pointer hover:shadow-lg hover:border-[#c8cec0] hover:-translate-y-0.5">
                    {/* Header */}
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm text-white shrink-0" style={{ backgroundColor: themeColor }}>
                        <SkillIcon name={skill.icon || 'Map'} size={22} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[15px] font-bold text-[#1c1f1a] truncate group-hover:text-indigo-600 transition-colors">{skill.name}</h3>
                        <p className="text-[12px] text-[#9aa094]">{skill.completedNodes || 0}/{skill.nodeCount || 0} nodes</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={(e) => { e.stopPropagation(); setColorPickerOpen(colorPickerOpen === skill._id ? null : skill._id); }}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-[#c8cec0] hover:text-[#565c52] hover:bg-white transition-all opacity-0 group-hover:opacity-100">
                          <Palette className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={(e) => openDeleteSkillModal(skill._id, e)}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center text-[#c8cec0] hover:text-red-500 hover:bg-red-50 transition-all ${hasReachedSkillMapLimit && isFree ? 'opacity-100 text-red-400' : 'opacity-0 group-hover:opacity-100'}`}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {/* Color Picker */}
                      {colorPickerOpen === skill._id && (
                        <div className="absolute right-4 top-16 bg-white rounded-xl shadow-2xl border border-[#e2e6dc] p-4 z-50 w-60" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-semibold text-[#1c1f1a]">Choose Color</span>
                            <button onClick={e => { e.stopPropagation(); setColorPickerOpen(null); }} className="text-[#c8cec0] hover:text-[#1c1f1a]"><X className="w-4 h-4" /></button>
                          </div>
                          <div className="grid grid-cols-4 gap-2">
                            {COLOR_THEMES.map(theme => (
                              <button key={theme.value} type="button" onClick={e => handleColorChange(skill._id, theme.value, e)} title={theme.name}>
                                <div className={`w-full aspect-square rounded-lg transition-all hover:scale-110 ${themeColor === theme.value ? 'ring-2 ring-offset-2 ring-[#1c1f1a]' : 'hover:shadow-md'}`} style={{ backgroundColor: theme.value }}>
                                  {themeColor === theme.value && <div className="flex items-center justify-center h-full"><Check className="w-4 h-4 text-white drop-shadow-lg" strokeWidth={3} /></div>}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Progress */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-[#9aa094] uppercase tracking-wider">Progress</span>
                        <span className="text-[14px] font-bold" style={{ color: themeColor }}>{Math.round(progress)}%</span>
                      </div>
                      <div className="relative h-2 bg-[#e8ece3] rounded-full overflow-hidden">
                        <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-700" style={{ width: `${progress}%`, backgroundColor: themeColor }} />
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-3 border-t border-[#e2e6dc]">
                      {isCompleted ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full border border-emerald-200">
                          <Sparkles className="w-3 h-3" /> Completed
                        </span>
                      ) : isInProgress ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full border border-amber-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> In Progress
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 text-gray-600 text-[10px] font-bold rounded-full border border-gray-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400" /> Not Started
                        </span>
                      )}
                      <div className="flex items-center gap-1 text-[12px] font-medium text-[#c8cec0] group-hover:text-indigo-600 transition-colors">
                        <span>View</span>
                        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Locked Skills */}
            {lockedSkills.length > 0 && statusFilter === 'all' && !searchQ && (
              <div className="px-5 pb-5">
                <p className="text-[11px] font-semibold text-[#9aa094] uppercase tracking-wider mb-3">Locked — Pro Required</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {lockedSkills.map(skill => (
                    <div key={skill._id} className="relative bg-[#f4f7f2] rounded-xl p-5 border border-[#e2e6dc] opacity-50">
                      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/70 backdrop-blur-[1px] rounded-xl">
                        <Crown className="w-7 h-7 text-amber-500 mb-1.5" />
                        <p className="text-xs font-semibold text-[#1c1f1a]">Pro Required</p>
                        <a href="/subscription" onClick={e => e.stopPropagation()} className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-semibold rounded-lg transition-colors">
                          <Sparkles className="w-3 h-3" /> Upgrade
                        </a>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center"><SkillIcon name={skill.icon || 'Map'} size={18} /></div>
                        <div><p className="text-sm font-semibold text-[#1c1f1a]">{skill.name}</p><p className="text-[11px] text-[#9aa094]">{skill.nodeCount || 0} nodes</p></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mx-5 mb-5 pt-3 border-t border-[#f0f2eb]">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="flex items-center gap-1 text-[12px] font-medium text-[#9aa094] hover:text-[#1c1f1a] disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                  <ChevronLeft className="w-3.5 h-3.5" /> Previous
                </button>
                <span className="text-[12px] text-[#9aa094]">Page <span className="font-bold text-[#1c1f1a]">{page}</span> of <span className="font-bold text-[#1c1f1a]">{totalPages}</span></span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                  className="flex items-center gap-1 text-[12px] font-medium text-[#9aa094] hover:text-[#1c1f1a] disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </>)}
        </div>
      </>)}

      {/* Explore Templates View */}
      {activeView === 'templates' && (() => {
        const filteredTemplates = templates.filter(t => {
          if (templateSearch && !t.title?.toLowerCase().includes(templateSearch.toLowerCase()) && !t.description?.toLowerCase().includes(templateSearch.toLowerCase())) return false;
          return true;
        }).sort((a, b) => {
          if (templateSort === 'popular') return (b.usageCount || 0) - (a.usageCount || 0);
          if (templateSort === 'newest') return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
          if (templateSort === 'nodes-most') return (b.nodes?.length || 0) - (a.nodes?.length || 0);
          if (templateSort === 'nodes-least') return (a.nodes?.length || 0) - (b.nodes?.length || 0);
          if (templateSort === 'az') return (a.title || '').localeCompare(b.title || '');
          return 0;
        });
        return (<>
          {/* Template Search & Filter */}
          <div className="bg-white rounded-2xl border border-[#e2e6dc] p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#c8cec0]" />
                <input type="text" placeholder="Search templates..." value={templateSearch} onChange={e => setTemplateSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-[#e2e6dc] rounded-xl outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/15 bg-[#fafbf8] text-sm text-[#1c1f1a] placeholder:text-[#c8cec0] transition-all" />
              </div>
              <div className="flex items-center gap-2">
                <FilterDropdown value={templateSort} onChange={v => setTemplateSort(v)}
                  options={[
                    { value: 'popular', label: 'Most Used' },
                    { value: 'newest', label: 'Newest' },
                    { value: 'az', label: 'A - Z' },
                    { value: 'nodes-most', label: 'Most Nodes' },
                    { value: 'nodes-least', label: 'Fewest Nodes' },
                  ]} />
                {templateSearch && <button onClick={() => setTemplateSearch('')} className="px-3 py-1.5 text-xs text-red-500 font-semibold hover:bg-red-50 rounded-lg transition-colors">Clear</button>}
                <span className="ml-auto text-[11px] text-[#9aa094]">{filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>

          {/* Template Results */}
          <div className="bg-white rounded-2xl border border-[#e2e6dc]">
            {templatesLoading ? (
              <div className="text-center py-16"><Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto mb-4" /><p className="text-sm text-[#9aa094]">Loading templates...</p></div>
            ) : filteredTemplates.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-14 h-14 rounded-2xl bg-[#f4f7f2] flex items-center justify-center mx-auto mb-4"><Layout className="w-7 h-7 text-[#c8cec0]" /></div>
                <h3 className="text-base font-bold text-[#1c1f1a] mb-1">{templateSearch ? 'No matching templates' : 'No templates available'}</h3>
                <p className="text-sm text-[#9aa094]">{templateSearch ? 'Try a different search term' : "Templates will appear here when they're added"}</p>
              </div>
            ) : (
              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTemplates.map((t, idx) => {
                  const tid = t._id || t.id;
                  const nodeCount = t.nodes?.length || 0;
                  const uses = t.usageCount || 0;
                  const isTop = templateSort === 'popular' && idx < 3 && uses > 0;
                  return (
                    <div key={tid} onClick={() => !(hasReachedSkillMapLimit && isFree) && setPreviewTemplate(t)}
                      className={`group relative rounded-xl border p-5 transition-all cursor-pointer hover:shadow-lg hover:-translate-y-0.5 ${
                        isTop ? 'bg-gradient-to-br from-indigo-50/50 to-violet-50/50 border-indigo-200 hover:border-indigo-400' : 'bg-[#f8faf6] border-[#e2e6dc] hover:border-indigo-300'
                      }`}>
                      {isTop && (
                        <div className="absolute -top-2.5 right-4 px-2.5 py-0.5 bg-indigo-500 text-white text-[9px] font-bold rounded-full uppercase tracking-wider shadow-sm">
                          Popular
                        </div>
                      )}
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-white shadow-sm bg-gradient-to-br from-indigo-600 to-violet-600">
                          <SkillIcon name={t.icon} size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-[14px] font-bold text-[#1c1f1a] truncate group-hover:text-indigo-600 transition-colors">{t.title}</h3>
                        </div>
                      </div>
                      <p className="text-[12px] text-[#565c52] line-clamp-2 leading-relaxed mb-4">{t.description}</p>
                      <div className="flex items-center gap-2 mb-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-semibold rounded-full border border-indigo-100">
                          {nodeCount} node{nodeCount !== 1 ? 's' : ''}
                        </span>
                        {uses > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-semibold rounded-full border border-amber-100">
                            {uses} use{uses !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <div className="pt-3 border-t border-[#e8ece3] flex items-center justify-between">
                        <span className="text-[11px] text-[#c8cec0] truncate">{t.goal || 'Ready to use'}</span>
                        <span className="flex items-center gap-1 text-[12px] font-semibold text-indigo-600 group-hover:text-indigo-700 transition-colors">
                          Use <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>);
      })()}

      {/* Modals */}
      {createPortal(
        <CreateSkillMapWizard isOpen={isWizardOpen} onClose={() => setIsWizardOpen(false)}
          onCreated={({ skillId, title }) => { showSuccess(`Skill map ${title} created!`); loadSkills(); navigate(`/skills/${skillId}`); }}
          onSwitchToTemplates={() => setIsWizardOpen(false)} />,
        document.body
      )}

      {previewTemplate && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col border border-[#e2e6dc]">
            <TemplatePreview
              template={previewTemplate}
              onBack={() => setPreviewTemplate(null)}
              onApply={handleApplyTemplate}
              isApplying={!!applyingTemplate}
              error=""
            />
          </div>
        </div>,
        document.body
      )}

      {skillPendingDeleteId && createPortal(
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-[#e2e6dc]">
            {/* Delete Modal Header */}
            <div className="bg-gradient-to-r from-red-500 to-rose-500 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Delete Skill Map</h2>
                  <p className="text-white/70 text-xs">This action cannot be undone</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <p className="text-sm text-[#565c52] mb-4">
                This removes the skill map and all its nodes permanently. Type{' '}
                <span className="font-mono font-bold text-[#1c1f1a] bg-[#f4f7f2] px-1.5 py-0.5 rounded">CONFIRM</span> to delete.
              </p>
              <input type="text" value={deleteConfirmInput} onChange={e => setDeleteConfirmInput(e.target.value)} placeholder="Type CONFIRM" autoComplete="off"
                className="w-full px-4 py-2.5 border border-[#e2e6dc] rounded-xl outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/15 bg-[#f8faf6] focus:bg-white font-mono text-sm mb-4 transition-all" />
              <div className="flex gap-3">
                <button type="button" onClick={closeDeleteSkillModal}
                  className="flex-1 py-2.5 border border-[#e2e6dc] text-[#565c52] rounded-xl font-semibold text-sm hover:bg-[#f4f7f2] transition-all">Cancel</button>
                <button type="button" onClick={handleDeleteSkillConfirmed} disabled={deleteConfirmInput !== 'CONFIRM'}
                  className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all">Delete</button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}