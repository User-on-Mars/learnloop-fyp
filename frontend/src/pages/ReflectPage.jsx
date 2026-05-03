import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../useAuth';
import { useToast } from '../context/ToastContext';
import { useSubscription } from '../context/SubscriptionContext';
import { showXpNotification } from '../utils/xpNotifications';
import FilterDropdown from '../components/FilterDropdown';
import HeroSection from '../components/HeroSection';
import DataTable from '../components/DataTable';
import Modal, { ModalButton } from '../components/Modal';
import client from '../api/client';
import {
  CheckCircle, AlertCircle, Trash2, Download, ChevronDown, ChevronUp,
  ChevronLeft, ChevronRight, Loader2, BookOpen, Smile, Meh, Frown, Zap, Brain, X, Lock,
  PenLine, Plus, Search, History, Sparkles, FileText, Heart, ArrowRight,
} from 'lucide-react';

const MOODS = [
  { value: 'Happy', icon: Smile, label: 'Happy', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', activeBg: 'from-emerald-500 to-teal-500' },
  { value: 'Neutral', icon: Meh, label: 'Neutral', bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-600', activeBg: 'from-gray-500 to-slate-500' },
  { value: 'Sad', icon: Frown, label: 'Struggling', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', activeBg: 'from-blue-500 to-indigo-500' },
  { value: 'Energized', icon: Zap, label: 'Energized', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', activeBg: 'from-amber-500 to-orange-500' },
  { value: 'Thoughtful', icon: Brain, label: 'Thoughtful', bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700', activeBg: 'from-violet-500 to-purple-500' },
];
const MOOD_MAP = Object.fromEntries(MOODS.map(m => [m.value, m]));

export default function ReflectPage() {
  const user = useAuth();
  const navigate = useNavigate();
  const { showSuccess } = useToast();
  const { isFree } = useSubscription();
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [mood, setMood] = useState(null);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formStep, setFormStep] = useState(1);

  const [reflections, setReflections] = useState([]);
  const [histLoading, setHistLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(null);
  const [searchQ, setSearchQ] = useState('');
  const [moodFilter, setMoodFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [page, setPage] = useState(1);
  const PER_PAGE = 5;

  const fetchHistory = useCallback(async () => {
    try { setHistLoading(true); const r = await client.get('/reflections'); setReflections(r.data || []); }
    catch { /* silent */ }
    finally { setHistLoading(false); }
  }, []);
  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const addTag = (e) => { e.preventDefault(); const t = tagInput.trim(); if (t && !tags.includes(t) && tags.length < 10) { setTags([...tags, t]); setTagInput(''); } };

  const openNewReflection = () => {
    setShowForm(true); setFormStep(1); setTitle(''); setContent(''); setMood(null); setTags([]); setTagInput('');
  };

  const handleSave = async () => {
    if (!title.trim()) { setError('Title is required.'); setTimeout(() => setError(null), 4000); return; }
    if (!content.trim()) { setError('Content is required.'); setTimeout(() => setError(null), 4000); return; }
    if (!mood) { setError('Please select a mood.'); setTimeout(() => setError(null), 4000); return; }
    setSaving(true); setError(null); setSuccess(false);
    try {
      const response = await client.post('/reflections', { title: title.trim(), content: content.trim(), mood, tags });
      if (response.data?.xpAwarded) showXpNotification(showSuccess, response.data.xpAwarded);
      setSuccess(true); setTimeout(() => setSuccess(false), 3000);
      setTimeout(() => { setContent(''); setTitle(''); setMood(null); setTags([]); setShowForm(false); }, 1000);
      fetchHistory();
    } catch (err) { setError(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to save.'); setTimeout(() => setError(null), 5000); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return; setDeleting(true);
    try { await client.delete(`/reflections/${deleteId}`); setReflections(r => r.filter(x => x._id !== deleteId)); if (expandedId === deleteId) setExpandedId(null); setDeleteId(null); }
    catch { setError('Failed to delete.'); setTimeout(() => setError(null), 4000); }
    finally { setDeleting(false); }
  };

  const handleExport = async (id) => {
    setExporting(id);
    try {
      const r = await client.get(`/reflections/${id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([r.data]));
      const a = document.createElement('a'); a.href = url;
      const ref = reflections.find(x => x._id === id);
      a.download = `reflection-${new Date(ref?.createdAt).toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
    } catch { setError('Failed to export.'); setTimeout(() => setError(null), 4000); }
    finally { setExporting(null); }
  };

  const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const fmtTime = (d) => new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const totalReflections = reflections.length;
  const moodCounts = reflections.reduce((acc, r) => { acc[r.mood] = (acc[r.mood] || 0) + 1; return acc; }, {});
  const topMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0];
  const thisWeekCount = reflections.filter(r => { const d = new Date(r.createdAt); const w = new Date(); w.setDate(w.getDate() - 7); return d >= w; }).length;

  const filtered = reflections.filter(r => {
    if (searchQ && !r.title?.toLowerCase().includes(searchQ.toLowerCase()) && !r.content?.toLowerCase().includes(searchQ.toLowerCase())) return false;
    if (moodFilter !== 'all' && r.mood !== moodFilter) return false;
    if (dateFilter !== 'all') {
      const d = new Date(r.createdAt), n = new Date();
      if (dateFilter === 'today' && d.toDateString() !== n.toDateString()) return false;
      if (dateFilter === 'week') { const w = new Date(n); w.setDate(w.getDate() - 7); if (d < w) return false; }
      if (dateFilter === 'month') { const m = new Date(n); m.setMonth(m.getMonth() - 1); if (d < m) return false; }
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const hasFilters = searchQ || moodFilter !== 'all' || dateFilter !== 'all';

  useEffect(() => { setPage(1); }, [searchQ, moodFilter, dateFilter]);

  return (
    <div className="px-4 sm:px-6 py-6 lg:py-8 space-y-6">

      {/* Hero Header */}
      <HeroSection
            title="Reflect"
            subtitle="Learning Journal"
            description="Write about your learning journey. Capture insights, track your mood, and build a habit of reflection."
            icon={PenLine}
            gradientFrom="emerald-50"
            gradientVia="white"
            gradientTo="teal-50"
            borderColor="emerald-100"
            iconGradientFrom="emerald-600"
            iconGradientTo="teal-600"
            subtitleColor="emerald-600"
            decorColor1="emerald-200"
            decorColor2="teal-200"
            actions={[
              {
                label: "New Reflection",
                icon: Plus,
                onClick: openNewReflection,
                variant: "primary"
              }
            ]}
            stats={[
              { icon: BookOpen, color: "#10b981", bg: "bg-emerald-100", label: "Total", value: totalReflections },
              { icon: Heart, color: "#f59e0b", bg: "bg-amber-100", label: "Top Mood", value: topMood ? MOOD_MAP[topMood[0]]?.label || '—' : '—' },
              { icon: Zap, color: "#14b8a6", bg: "bg-teal-100", label: "This Week", value: thisWeekCount }
            ]}
            statsColumns="grid-cols-2 sm:grid-cols-3"
          />

          {/* Alerts */}
          {success && <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm font-medium"><CheckCircle className="w-4 h-4 flex-shrink-0" />Reflection saved successfully!</div>}
          {error && <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium"><AlertCircle className="w-4 h-4 flex-shrink-0" />{error}</div>}

          {/* Search & Filter */}
          <div className="bg-white rounded-2xl border border-[#e2e6dc] p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#c8cec0]" />
                <input type="text" placeholder="Search reflections..." value={searchQ} onChange={e => setSearchQ(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-[#e2e6dc] rounded-xl outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/15 bg-[#fafbf8] text-sm text-[#1c1f1a] placeholder:text-[#c8cec0] transition-all" />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <FilterDropdown value={moodFilter} onChange={v => { setMoodFilter(v); setPage(1); }}
                  options={[
                    { value: 'all', label: 'All Moods' },
                    ...MOODS.map(m => ({ value: m.value, label: m.label }))
                  ]} />
                <FilterDropdown value={dateFilter} onChange={v => { setDateFilter(v); setPage(1); }}
                  options={[
                    { value: 'all', label: 'All Time' },
                    { value: 'today', label: 'Today' },
                    { value: 'week', label: 'This Week' },
                    { value: 'month', label: 'This Month' },
                  ]} />
                {hasFilters && <button onClick={() => { setSearchQ(''); setMoodFilter('all'); setDateFilter('all'); }} className="px-3 py-1.5 text-xs text-red-500 font-semibold hover:bg-red-50 rounded-lg transition-colors">Clear</button>}
                <span className="ml-auto text-[11px] text-[#9aa094]">{filtered.length} reflection{filtered.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>

          {/* Reflections List */}
          <div className="bg-white rounded-2xl border border-[#e2e6dc]">
            {histLoading ? (
              <div className="text-center py-16">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mx-auto mb-3 animate-pulse">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <p className="text-sm text-[#9aa094]">Loading reflections...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="overflow-hidden">
                <div className="p-12 text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-emerald-500/10">
                    <PenLine className="w-10 h-10 text-emerald-500" />
                  </div>
                  <h3 className="text-xl font-bold text-[#1c1f1a] mb-2">{hasFilters ? 'No matching reflections' : 'No reflections yet'}</h3>
                  <p className="text-[#9aa094] max-w-md mx-auto mb-6 text-[15px]">
                    {hasFilters ? 'Try adjusting your filters' : 'Start your learning journal by writing your first reflection.'}
                  </p>
                  {!hasFilters && (
                    <button onClick={openNewReflection}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-semibold text-sm hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg shadow-emerald-500/20">
                      <Plus className="w-4 h-4" /> Write Your First Reflection
                    </button>
                  )}
                </div>
                {!hasFilters && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 border-t border-[#e2e6dc]">
                    {[
                      { icon: PenLine, color: 'text-emerald-500', bg: 'bg-emerald-50', title: 'Daily Journal', desc: 'Capture what you learned each day' },
                      { icon: Heart, color: 'text-rose-500', bg: 'bg-rose-50', title: 'Track Moods', desc: 'See how your feelings evolve' },
                      { icon: Zap, color: 'text-amber-500', bg: 'bg-amber-50', title: 'Earn XP', desc: 'Get rewarded for reflecting' },
                    ].map((feature, i) => (
                      <div key={i} className={`p-6 text-center ${i < 2 ? 'border-b sm:border-b-0 sm:border-r border-[#e2e6dc]' : ''}`}>
                        <div className={`w-10 h-10 ${feature.bg} rounded-xl flex items-center justify-center mx-auto mb-3`}>
                          <feature.icon className={`w-5 h-5 ${feature.color}`} />
                        </div>
                        <h4 className="text-sm font-bold text-[#1c1f1a] mb-1">{feature.title}</h4>
                        <p className="text-sm text-[#9aa094]">{feature.desc}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="px-5 py-4">
                <DataTable
                  data={paged.map((r, i) => ({ ...r, index: (page - 1) * PER_PAGE + i + 1 }))}
                  expandedIndex={paged.findIndex(item => item._id === expandedId)}
                  renderExpand={(r) => {
                    const m = MOOD_MAP[r.mood];
                    const MoodIcon = m?.icon;
                    return (
                      <div className="rounded-xl bg-white border border-[#e2e6dc] shadow-sm overflow-hidden">
                        <div className="px-5 py-4 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              {r.title && <h3 className="text-[17px] font-bold text-[#1c1f1a] mb-1">{r.title}</h3>}
                              <p className="text-[12px] text-[#9aa094]">{fmtDate(r.createdAt)} at {fmtTime(r.createdAt)}</p>
                            </div>
                            {m && (
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${m.bg} ${m.text} border ${m.border} flex-shrink-0`}>
                                <MoodIcon className="w-3.5 h-3.5" /> {m.label}
                              </span>
                            )}
                          </div>
                          {r.tags?.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-3">
                              {r.tags.map(t => (
                                <span key={t} className="px-2.5 py-0.5 bg-white text-emerald-700 text-[11px] font-medium rounded-full border border-emerald-200">
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="px-5 py-5">
                          <p className="text-[14px] text-[#1c1f1a] whitespace-pre-wrap leading-relaxed">{r.content}</p>
                        </div>
                        <div className="px-5 py-3 bg-[#f8faf6] border-t border-[#e2e6dc] flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              if (isFree) { navigate('/subscription'); return; }
                              handleExport(r._id);
                            }}
                            disabled={exporting === r._id}
                            className={`flex items-center gap-2 px-4 py-2 text-[12px] rounded-lg font-semibold disabled:opacity-50 transition-all border ${
                              isFree ? 'text-gray-400 bg-gray-50 border-gray-200' : 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                            }`}
                          >
                            {exporting === r._id ? <Loader2 className="w-4 h-4 animate-spin" /> : isFree ? <><Download className="w-4 h-4 opacity-40" /><Lock className="w-3.5 h-3.5 text-amber-500" /></> : <Download className="w-4 h-4" />}
                            Export PDF
                          </button>
                          <button onClick={() => setDeleteId(r._id)} className="flex items-center gap-2 px-4 py-2 text-[12px] text-red-600 bg-red-50 border border-red-200 rounded-lg font-semibold hover:bg-red-100 transition-all">
                            <Trash2 className="w-4 h-4" /> Delete
                          </button>
                        </div>
                      </div>
                    );
                  }}
                  columns={[
                    {
                      key: 'date',
                      label: 'Date',
                      span: 2,
                      render: (r) => (
                        <span className="text-[12px] text-[#9aa094] font-medium">
                          {fmtDate(r.createdAt)}
                        </span>
                      )
                    },
                    {
                      key: 'mood',
                      label: 'Mood',
                      span: 2,
                      align: 'center',
                      render: (r) => {
                        const m = MOOD_MAP[r.mood];
                        const MoodIcon = m?.icon;
                        return m ? (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold ${m.bg} ${m.text} border ${m.border}`}>
                            <MoodIcon className="w-3 h-3" /> {m.label}
                          </span>
                        ) : (
                          <span className="text-[11px] text-[#c8cec0]">—</span>
                        );
                      }
                    },
                    {
                      key: 'title',
                      label: 'Title',
                      span: 4,
                      render: (r) => (
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-[#1c1f1a] truncate group-hover:text-emerald-600 transition-colors">
                            {r.title || 'Untitled'}
                          </p>
                          <p className="text-[11px] text-[#c8cec0] truncate">
                            {r.content?.slice(0, 60)}{r.content?.length > 60 ? '...' : ''}
                          </p>
                        </div>
                      )
                    },
                    {
                      key: 'tags',
                      label: 'Tags',
                      span: 2,
                      align: 'center',
                      render: (r) => {
                        if (!r.tags || r.tags.length === 0) {
                          return <span className="text-[11px] text-[#c8cec0]">—</span>;
                        }
                        return (
                          <div className="flex gap-1 justify-center">
                            {r.tags.slice(0, 2).map(t => (
                              <span key={t} className="px-2 py-0.5 bg-[#f0f2eb] text-[#565c52] text-[10px] font-medium rounded-full">
                                {t}
                              </span>
                            ))}
                            {r.tags.length > 2 && (
                              <span className="text-[10px] text-[#9aa094]">+{r.tags.length - 2}</span>
                            )}
                          </div>
                        );
                      }
                    },
                    {
                      key: 'actions',
                      label: 'Actions',
                      span: 2,
                      align: 'right',
                      render: (r) => {
                        const open = expandedId === r._id;
                        return (
                          <div className="flex items-center justify-end gap-2">
                            {open ? (
                              <ChevronUp className="w-3.5 h-3.5 text-[#c8cec0]" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 text-[#c8cec0]" />
                            )}
                          </div>
                        );
                      }
                    }
                  ]}
                  renderMobileCard={(r) => {
                    const m = MOOD_MAP[r.mood];
                    const MoodIcon = m?.icon;
                    
                    return (
                      <>
                        {/* Header Row: Date + Mood */}
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[11px] text-[#9aa094] font-medium">
                            {fmtDate(r.createdAt)}
                          </span>
                          {m ? (
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold ${m.bg} ${m.text} border ${m.border}`}>
                              <MoodIcon className="w-3 h-3" /> {m.label}
                            </span>
                          ) : (
                            <span className="text-[11px] text-[#c8cec0]">—</span>
                          )}
                        </div>
                        
                        {/* Title */}
                        <div className="mb-3">
                          <p className="text-[13px] font-semibold text-[#1c1f1a] mb-1">
                            {r.title || 'Untitled'}
                          </p>
                          <p className="text-[11px] text-[#c8cec0] line-clamp-2">
                            {r.content || 'No content'}
                          </p>
                        </div>
                        
                        {/* Tags Row */}
                        {r.tags && r.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {r.tags.map(t => (
                              <span key={t} className="px-2 py-0.5 bg-[#f0f2eb] text-[#565c52] text-[10px] font-medium rounded-full">
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                        
                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 pt-3 border-t border-[#e2e6dc]">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isFree) {
                                navigate('/subscription');
                                return;
                              }
                              handleExport(r._id);
                            }}
                            disabled={exporting === r._id}
                            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-[11px] rounded-lg font-semibold disabled:opacity-50 transition-all border ${
                              isFree ? 'text-gray-400 bg-gray-50 border-gray-200' : 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                            }`}
                          >
                            {exporting === r._id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : isFree ? (
                              <>
                                <Download className="w-3.5 h-3.5 opacity-40" />
                                <Lock className="w-3 h-3 text-amber-500" />
                              </>
                            ) : (
                              <Download className="w-3.5 h-3.5" />
                            )}
                            Export
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteId(r._id);
                            }}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-lg font-semibold hover:bg-red-100 transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        </div>
                      </>
                    );
                  }}
                  onRowClick={(r) => setExpandedId(expandedId === r._id ? null : r._id)}
                />
                
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 mt-4 border-t border-[#f0f2eb]">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="flex items-center gap-1 text-[12px] font-medium text-[#9aa094] hover:text-[#1c1f1a] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" /> Previous
                    </button>
                    <span className="text-[12px] text-[#9aa094]">
                      Page <span className="font-bold text-[#1c1f1a]">{page}</span> of <span className="font-bold text-[#1c1f1a]">{totalPages}</span>
                    </span>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                      className="flex items-center gap-1 text-[12px] font-medium text-[#9aa094] hover:text-[#1c1f1a] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      Next <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

      {/* New Reflection Modal - Step by Step */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col border border-[#e2e6dc]">

            {/* Header */}
            <div className="px-5 sm:px-6 py-4 flex-shrink-0 bg-gradient-to-r from-emerald-600 to-teal-600">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <PenLine className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">{title || 'New Reflection'}</h2>
                    <p className="text-white/70 text-xs">Step {formStep} of 3</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowForm(false)} 
                  className="w-10 h-10 min-w-[44px] min-h-[44px] rounded-lg bg-white/20 hover:bg-white/30 active:bg-white/40 flex items-center justify-center text-white transition-colors"
                  aria-label="Close modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex gap-2 mt-4">
                {[1, 2, 3].map(s => (
                  <div key={s} className={`h-1 flex-1 rounded-full transition-all ${s <= formStep ? 'bg-white' : 'bg-white/30'}`} />
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 sm:py-5">

              {/* Step 1: Title & Content */}
              {formStep === 1 && (
                <div className="space-y-5">
                  <div className="text-center mb-6">
                    <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <BookOpen className="w-7 h-7 text-emerald-500" />
                    </div>
                    <h3 className="text-xl font-bold text-[#1c1f1a]">What's on your mind?</h3>
                    <p className="text-sm text-[#9aa094] mt-1">Write about what you learned today</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[#1c1f1a] mb-2">Title <span className="text-red-500">*</span></label>
                    <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Give your reflection a title" maxLength={200} autoFocus
                      className="w-full px-4 py-3.5 min-h-[44px] border-2 border-[#e2e6dc] rounded-xl focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/15 transition-all text-sm" />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[#1c1f1a] mb-2">
                      Content <span className="text-red-500">*</span>
                      <span className="text-xs text-[#9aa094] font-normal ml-2">{content.length}/10,000</span>
                    </label>
                    <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="What did you learn? What insights did you gain? What was challenging?" maxLength={10000} rows={6}
                      className="w-full px-4 py-3 min-h-[120px] border-2 border-[#e2e6dc] rounded-xl focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/15 transition-all text-sm resize-none" />
                  </div>
                </div>
              )}

              {/* Step 2: Mood & Tags */}
              {formStep === 2 && (
                <div className="space-y-6">
                  <div className="text-center mb-6">
                    <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <Heart className="w-7 h-7 text-emerald-500" />
                    </div>
                    <h3 className="text-xl font-bold text-[#1c1f1a]">How are you feeling?</h3>
                    <p className="text-sm text-[#9aa094] mt-1">Select your mood and add tags</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[#1c1f1a] mb-3">Mood <span className="text-red-500">*</span></label>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-2">
                      {MOODS.map(m => {
                        const Icon = m.icon;
                        const active = mood === m.value;
                        return (
                          <button key={m.value} type="button" onClick={() => setMood(mood === m.value ? null : m.value)}
                            className={`flex flex-col items-center gap-1.5 p-3 min-h-[44px] min-w-[44px] rounded-xl text-xs font-semibold transition-all ${
                              active
                                ? `bg-gradient-to-br ${m.activeBg} text-white shadow-md scale-105`
                                : `${m.bg} ${m.text} border ${m.border} hover:scale-[1.02]`
                            }`}>
                            <Icon className="w-5 h-5" />
                            <span className="text-center">{m.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[#1c1f1a] mb-2">Tags <span className="text-xs text-[#9aa094] font-normal ml-1">({tags.length}/10)</span></label>
                    <form onSubmit={addTag} className="flex gap-2">
                      <input type="text" value={tagInput} onChange={e => setTagInput(e.target.value)} placeholder="Add a tag" maxLength={50}
                        className="flex-1 px-3 py-2.5 min-h-[44px] border-2 border-[#e2e6dc] rounded-xl outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/15 text-sm transition-all" />
                      <button type="submit" disabled={tags.length >= 10}
                        className="px-4 py-2.5 min-h-[44px] min-w-[44px] bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-sm font-semibold hover:from-emerald-700 hover:to-teal-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                        Add
                      </button>
                    </form>
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {tags.map(t => (
                          <span key={t} className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full border border-emerald-200">
                            {t}
                            <button type="button" onClick={() => setTags(tags.filter(x => x !== t))} className="hover:text-red-500 transition-colors"><X className="w-3 h-3" /></button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 3: Review */}
              {formStep === 3 && (
                <div className="space-y-5">
                  <div className="text-center mb-6">
                    <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <CheckCircle className="w-7 h-7 text-emerald-500" />
                    </div>
                    <h3 className="text-xl font-bold text-[#1c1f1a]">Review & Save</h3>
                    <p className="text-sm text-[#9aa094] mt-1">Everything looks good?</p>
                  </div>

                  {/* Preview */}
                  <div className="bg-[#f8faf6] rounded-2xl border border-[#e2e6dc] overflow-hidden">
                    <div className="px-5 py-4 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
                      <h4 className="text-lg font-bold text-[#1c1f1a]">{title || 'Untitled'}</h4>
                      <div className="flex items-center gap-3 mt-2">
                        {mood && MOOD_MAP[mood] && (() => {
                          const m = MOOD_MAP[mood];
                          const MIcon = m.icon;
                          return (
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${m.bg} ${m.text} border ${m.border}`}>
                              <MIcon className="w-3 h-3" /> {m.label}
                            </span>
                          );
                        })()}
                        {tags.length > 0 && tags.map(t => (
                          <span key={t} className="px-2 py-0.5 bg-white text-emerald-700 text-[10px] font-medium rounded-full border border-emerald-200">{t}</span>
                        ))}
                      </div>
                    </div>
                    <div className="px-5 py-4">
                      <p className="text-[14px] text-[#1c1f1a] whitespace-pre-wrap leading-relaxed line-clamp-6">{content || 'No content'}</p>
                    </div>
                  </div>

                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-emerald-800">Ready to save!</p>
                        <p className="text-xs text-emerald-600 mt-0.5">Your reflection will be saved and you'll earn XP for it.</p>
                      </div>
                    </div>
                  </div>

                  {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2.5 rounded-xl text-[12px] flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 px-5 sm:px-6 py-4 bg-[#f8faf6] border-t border-[#e2e6dc]">
              <div className="flex flex-col sm:flex-row gap-3">
                <button type="button" onClick={formStep === 1 ? () => setShowForm(false) : () => setFormStep(s => s - 1)} disabled={saving}
                  className="flex-1 py-3 min-h-[44px] border-2 border-[#e2e6dc] text-[#565c52] rounded-xl font-semibold text-sm hover:bg-white active:bg-[#f4f7f2] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {formStep === 1 ? (<><X className="w-4 h-4" /> Cancel</>) : (<><ArrowRight className="w-4 h-4 rotate-180" /> Back</>)}
                </button>

                {formStep < 3 ? (
                  <button type="button"
                    onClick={() => {
                      if (formStep === 1 && (!title.trim() || !content.trim())) { setError('Title and content are required.'); setTimeout(() => setError(null), 3000); return; }
                      if (formStep === 2 && !mood) { setError('Please select a mood.'); setTimeout(() => setError(null), 3000); return; }
                      setFormStep(s => s + 1);
                    }}
                    className="flex-1 py-3 min-h-[44px] bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-semibold text-sm hover:from-emerald-700 hover:to-teal-700 active:from-emerald-800 active:to-teal-800 transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2">
                    Next <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button type="button" onClick={handleSave} disabled={saving || !title.trim() || !content.trim() || !mood}
                    className="flex-1 py-3 min-h-[44px] bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-semibold text-sm hover:from-emerald-700 hover:to-teal-700 active:from-emerald-800 active:to-teal-800 transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2">
                    {saving ? (<><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>) : (<><CheckCircle className="w-4 h-4" /> Save Reflection</>)}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      <Modal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        maxWidth="max-w-sm"
        showCloseButton={false}
        preventBackdropClose={deleting}
        footer={
          <>
            <ModalButton
              variant="secondary"
              onClick={() => setDeleteId(null)}
              disabled={deleting}
            >
              Cancel
            </ModalButton>
            <ModalButton
              variant="danger"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? <><Loader2 className="w-4 h-4 animate-spin" /> Deleting...</> : 'Delete'}
            </ModalButton>
          </>
        }
      >
        {/* Header with gradient background */}
        <div className="bg-gradient-to-r from-red-500 to-rose-500 -mx-5 sm:-mx-6 -mt-4 sm:-mt-5 px-5 sm:px-6 py-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Delete Reflection</h2>
              <p className="text-white/70 text-xs">This cannot be undone</p>
            </div>
          </div>
        </div>

        {/* Message */}
        <p className="text-sm text-[#565c52]">Are you sure you want to permanently delete this reflection?</p>
      </Modal>
    </div>
  );
}