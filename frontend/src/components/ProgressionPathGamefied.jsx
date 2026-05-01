import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSkillMap } from '../context/SkillMapContext';
import { useActiveSessions } from '../context/ActiveSessionContext';
import { practiceAPI } from '../api/client';
import { Pencil, Check, X, ChevronRight, ChevronLeft, FileText, Target, Rocket, Trophy, Lock, Unlock, CheckCircle, Trash2, Clock } from 'lucide-react';
import SkillMapPageSkeleton from './SkillMapPageSkeleton';
import IconPicker, { SkillIcon } from './IconPicker';

export default function ProgressionPathGamefied() {
  const { skillId } = useParams();
  const navigate = useNavigate();
  const { activeSessions, formatTimer } = useActiveSessions();
  const {
    currentSkill,
    nodes,
    mapViewLoading,
    mapDetailError,
    skillMapProgress,
    loadSkillMapFull,
    updateSkillMap,
    updateNodeContent,
    updateNodeStatus,
    createNode,
    deleteNode,
    clearError
  } = useSkillMap();

  const [isEditing, setIsEditing] = useState(false);
  const [deletingNodeId, setDeletingNodeId] = useState(null);
  const [isDeletingNode, setIsDeletingNode] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    goal: '',
    description: '',
    icon: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [lockedNodeId, setLockedNodeId] = useState(null);
  const [editingNodeId, setEditingNodeId] = useState(null);
  const [editingNodeTitle, setEditingNodeTitle] = useState('');
  const [isAddingNode, setIsAddingNode] = useState(false);
  const [newNodeTitle, setNewNodeTitle] = useState('');
  const [showAddNodeForm, setShowAddNodeForm] = useState(false);
  const [nodeError, setNodeError] = useState('');
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  // Pending changes — only applied on save
  const [pendingAddNodes, setPendingAddNodes] = useState([]);
  const [pendingDeleteIds, setPendingDeleteIds] = useState([]);
  const [practiceHistory, setPracticeHistory] = useState([]);

  useEffect(() => {
    if (skillId) loadSkillMapFull(skillId);
  }, [skillId, loadSkillMapFull]);

  // Fetch practice history for all nodes in this skill map
  const fetchPracticeHistory = useCallback(async () => {
    if (!nodes || nodes.length === 0) return;
    try {
      const r = await practiceAPI.getPractices({ limit: 500 });
      const allPractices = r.data.practices || r.data || [];
      // Filter to practices that match node titles in this skill map
      const nodeTitles = new Set(nodes.map(n => n.title));
      setPracticeHistory(allPractices.filter(p => nodeTitles.has(p.skillName)));
    } catch { setPracticeHistory([]); }
  }, [nodes]);

  useEffect(() => { fetchPracticeHistory(); }, [fetchPracticeHistory]);

  useEffect(() => {
    const main = document.querySelector('main');
    if (!main) return;
    const onScroll = () => setShowBackToTop(main.scrollTop > 300);
    main.addEventListener('scroll', onScroll);
    window.addEventListener('scroll', () => setShowBackToTop(window.scrollY > 300));
    return () => { main.removeEventListener('scroll', onScroll); };
  }, []);

  useEffect(() => {
    if (currentSkill) {
      setEditForm({
        name: currentSkill.name || '',
        goal: currentSkill.goal || '',
        description: currentSkill.description || '',
        icon: currentSkill.icon || 'Map'
      });
    }
  }, [currentSkill]);

  useEffect(() => {
    if (lockedNodeId) {
      const timer = setTimeout(() => setLockedNodeId(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [lockedNodeId]);

  const handleNodeClick = (node, nodeIndex) => {
    // First node is always accessible
    if (node.status === 'Locked' && nodeIndex > 0) {
      setLockedNodeId(node._id);
      return;
    }
    if (!skillId) return;
    navigate(`/skills/${skillId}/nodes/${node._id}`);
  };

  const handleEditNodeName = (node) => {
    setEditingNodeId(node._id);
    setEditingNodeTitle(node.title);
  };

  const handleSaveNodeName = async (nodeId) => {
    if (!editingNodeTitle.trim()) return;
    
    try {
      await updateNodeContent(nodeId, { title: editingNodeTitle.trim() });
      setEditingNodeId(null);
      setEditingNodeTitle('');
    } catch (error) {
      console.error('Error updating node name:', error);
      alert('Failed to update node name. Please try again.');
    }
  };

  const handleCancelEditNode = () => {
    setEditingNodeId(null);
    setEditingNodeTitle('');
  };

  const handleAddNode = async () => {
    if (!newNodeTitle.trim()) return;
    setNodeError('');
    // Check duplicates against existing nodes + pending adds
    const allNames = [...nodes.filter(n => !n.isGoal && !(n.isStart && n.title === 'Start')).map(n => n.title), ...pendingAddNodes];
    if (allNames.some(t => t.toLowerCase() === newNodeTitle.trim().toLowerCase())) { setNodeError('Duplicate name'); return; }
    if (allNames.length >= 15) { setNodeError('Max 15 nodes'); return; }
    // Add to pending — don't call API yet
    setPendingAddNodes(prev => [...prev, newNodeTitle.trim()]);
    setNewNodeTitle('');
    setShowAddNodeForm(false);
    setNodeError('');
  };

  const handleCancelAddNode = () => {
    setNewNodeTitle('');
    setShowAddNodeForm(false);
  };

  const handleDeleteNode = (nodeId) => {
    setPendingDeleteIds(prev => [...prev, nodeId]);
    setDeletingNodeId(null);
  };

  const handleEditClick = () => {
    setPendingAddNodes([]);
    setPendingDeleteIds([]);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setPendingAddNodes([]);
    setPendingDeleteIds([]);
    setDeletingNodeId(null);
    setEditingNodeId(null);
    setShowAddNodeForm(false);
    if (currentSkill) {
      setEditForm({ name: currentSkill.name || '', goal: currentSkill.goal || '', description: currentSkill.description || '', icon: currentSkill.icon || 'Map' });
    }
  };

  const handleSaveEdit = async () => {
    if (!editForm.name.trim()) return;
    setIsSaving(true);
    try {
      // Save skill details
      await updateSkillMap(skillId, { name: editForm.name.trim(), goal: editForm.goal.trim(), description: editForm.description.trim(), icon: editForm.icon });
      // Process pending deletes
      for (const id of pendingDeleteIds) {
        try { await deleteNode(id); } catch (e) { console.error('Delete failed:', e.message); }
      }
      // Process pending adds
      for (const title of pendingAddNodes) {
        try { await createNode(skillId, { title }); } catch (e) { console.error('Add failed:', e.message); }
      }
      setPendingAddNodes([]);
      setPendingDeleteIds([]);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const showSkeleton = mapViewLoading && !currentSkill;
  if (showSkeleton) {
    return <SkillMapPageSkeleton />;
  }

  if (mapDetailError && !currentSkill) {
    // Check if this is a subscription lock error
    const isLocked = mapDetailError.includes('locked') || mapDetailError.includes('Upgrade to Pro');
    
    if (isLocked) {
      return (
        <div className="flex items-center justify-center min-h-screen px-4 bg-site-bg">
          <div className="text-center max-w-md bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Skill Map Locked</h2>
            <p className="text-gray-600 text-sm mb-6">
              This skill map is beyond your free plan limit. Upgrade to Pro to access all your skill maps.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                type="button"
                onClick={() => window.history.back()}
                className="px-5 py-2.5 border border-gray-300 text-gray-600 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Go Back
              </button>
              <a
                href="/subscription"
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors"
              >
                Upgrade to Pro
              </a>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center min-h-screen px-4 bg-site-bg">
        <div className="text-center text-white max-w-md bg-red-500/90 p-6 rounded-xl border-4 border-red-700">
          <p className="font-bold">{mapDetailError}</p>
          <button
            type="button"
            onClick={() => {
              clearError();
              if (skillId) loadSkillMapFull(skillId);
            }}
            className="mt-4 text-sm underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!currentSkill) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4 bg-site-bg">
        <div className="text-white font-bold">Skill not found</div>
      </div>
    );
  }

  const userNodes = nodes.filter(n => !n.isGoal && !(n.isStart && n.title === 'Start'));
  const isTemplateMap = userNodes.some(n => n.sessionDefinitions && n.sessionDefinitions.length > 0);
  const totalTemplateSessions = isTemplateMap ? userNodes.reduce((sum, n) => sum + (n.sessionDefinitions?.length || 0), 0) : 0;
  const totalCompletedTemplateSessions = isTemplateMap ? userNodes.reduce((sum, n) => sum + (n.completedSessions?.length || 0), 0) : 0;
  const completedCount = userNodes.filter(n => n.status === 'Completed').length;
  const totalNodes = userNodes.length;
  const completionPercentage = totalNodes > 0 ? Math.round((completedCount / totalNodes) * 100) : 0;

  const icon = currentSkill.icon || 'Map';

  return (
    <div className="min-h-screen bg-[#eef0ea] relative overflow-hidden">
      {/* Dot grid */}
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #c8cec0 0.7px, transparent 0.7px)', backgroundSize: '20px 20px', opacity: 0.4 }} />

      {/* Decorative elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Stylized trees */}
        <svg className="absolute top-[5%] left-[4%] opacity-20" width="40" height="56" viewBox="0 0 40 56"><rect x="17" y="36" width="6" height="20" rx="2" fill="#6B4226"/><ellipse cx="20" cy="28" rx="16" ry="18" fill="#2e5023"/><ellipse cx="20" cy="18" rx="12" ry="14" fill="#4f7942"/></svg>
        <svg className="absolute top-[22%] right-[5%] opacity-15" width="48" height="64" viewBox="0 0 48 64"><rect x="20" y="42" width="8" height="22" rx="3" fill="#8B5E3C"/><ellipse cx="24" cy="32" rx="20" ry="22" fill="#2e5023"/><ellipse cx="24" cy="20" rx="14" ry="16" fill="#4f7942"/></svg>
        <svg className="absolute top-[45%] left-[3%] opacity-18" width="36" height="50" viewBox="0 0 36 50"><rect x="15" y="32" width="6" height="18" rx="2" fill="#6B4226"/><ellipse cx="18" cy="24" rx="14" ry="16" fill="#2e5023"/><ellipse cx="18" cy="16" rx="10" ry="12" fill="#4f7942"/></svg>
        <svg className="absolute top-[65%] right-[4%] opacity-15" width="40" height="56" viewBox="0 0 40 56"><rect x="17" y="36" width="6" height="20" rx="2" fill="#6B4226"/><ellipse cx="20" cy="28" rx="16" ry="18" fill="#2e5023"/><ellipse cx="20" cy="18" rx="12" ry="14" fill="#4f7942"/></svg>
        <svg className="absolute top-[85%] left-[6%] opacity-20" width="44" height="60" viewBox="0 0 44 60"><rect x="18" y="40" width="8" height="20" rx="3" fill="#8B5E3C"/><ellipse cx="22" cy="30" rx="18" ry="20" fill="#2e5023"/><ellipse cx="22" cy="20" rx="13" ry="15" fill="#4f7942"/></svg>

        {/* Bushes / shrubs */}
        <svg className="absolute top-[15%] left-[12%] opacity-15" width="32" height="20" viewBox="0 0 32 20"><ellipse cx="16" cy="14" rx="16" ry="6" fill="#4f7942"/><ellipse cx="10" cy="10" rx="10" ry="8" fill="#2e5023"/><ellipse cx="22" cy="10" rx="10" ry="8" fill="#2e5023"/></svg>
        <svg className="absolute top-[38%] right-[10%] opacity-12" width="28" height="18" viewBox="0 0 28 18"><ellipse cx="14" cy="12" rx="14" ry="6" fill="#4f7942"/><ellipse cx="9" cy="8" rx="9" ry="7" fill="#2e5023"/><ellipse cx="19" cy="8" rx="9" ry="7" fill="#2e5023"/></svg>
        <svg className="absolute top-[58%] left-[10%] opacity-14" width="30" height="18" viewBox="0 0 30 18"><ellipse cx="15" cy="12" rx="15" ry="6" fill="#4f7942"/><ellipse cx="10" cy="8" rx="10" ry="7" fill="#2e5023"/><ellipse cx="20" cy="8" rx="10" ry="7" fill="#2e5023"/></svg>
        <svg className="absolute top-[78%] right-[8%] opacity-12" width="26" height="16" viewBox="0 0 26 16"><ellipse cx="13" cy="10" rx="13" ry="6" fill="#4f7942"/><ellipse cx="8" cy="7" rx="8" ry="6" fill="#2e5023"/><ellipse cx="18" cy="7" rx="8" ry="6" fill="#2e5023"/></svg>

        {/* Small flowers */}
        <svg className="absolute top-[10%] left-[18%] opacity-25" width="12" height="16" viewBox="0 0 12 16"><rect x="5" y="8" width="2" height="8" rx="1" fill="#4f7942"/><circle cx="6" cy="5" r="3" fill="#f9a8d4"/><circle cx="6" cy="5" r="1.5" fill="#fbbf24"/></svg>
        <svg className="absolute top-[28%] right-[16%] opacity-20" width="12" height="16" viewBox="0 0 12 16"><rect x="5" y="8" width="2" height="8" rx="1" fill="#4f7942"/><circle cx="6" cy="5" r="3" fill="#fca5a5"/><circle cx="6" cy="5" r="1.5" fill="#fbbf24"/></svg>
        <svg className="absolute top-[50%] left-[15%] opacity-22" width="12" height="16" viewBox="0 0 12 16"><rect x="5" y="8" width="2" height="8" rx="1" fill="#4f7942"/><circle cx="6" cy="5" r="3" fill="#c4b5fd"/><circle cx="6" cy="5" r="1.5" fill="#fbbf24"/></svg>
        <svg className="absolute top-[70%] right-[14%] opacity-20" width="12" height="16" viewBox="0 0 12 16"><rect x="5" y="8" width="2" height="8" rx="1" fill="#4f7942"/><circle cx="6" cy="5" r="3" fill="#93c5fd"/><circle cx="6" cy="5" r="1.5" fill="#fbbf24"/></svg>
        <svg className="absolute top-[90%] left-[14%] opacity-22" width="12" height="16" viewBox="0 0 12 16"><rect x="5" y="8" width="2" height="8" rx="1" fill="#4f7942"/><circle cx="6" cy="5" r="3" fill="#fdba74"/><circle cx="6" cy="5" r="1.5" fill="#fbbf24"/></svg>

        {/* Sparkle stars */}
        <svg className="absolute top-[8%] right-[20%] opacity-20" width="16" height="16" viewBox="0 0 16 16"><path d="M8 0L9.5 6.5L16 8L9.5 9.5L8 16L6.5 9.5L0 8L6.5 6.5Z" fill="#fbbf24"/></svg>
        <svg className="absolute top-[35%] left-[8%] opacity-15" width="12" height="12" viewBox="0 0 12 12"><path d="M6 0L7 5L12 6L7 7L6 12L5 7L0 6L5 5Z" fill="#fbbf24"/></svg>
        <svg className="absolute top-[55%] right-[6%] opacity-18" width="14" height="14" viewBox="0 0 14 14"><path d="M7 0L8.5 5.5L14 7L8.5 8.5L7 14L5.5 8.5L0 7L5.5 5.5Z" fill="#fbbf24"/></svg>
        <svg className="absolute top-[75%] left-[6%] opacity-15" width="10" height="10" viewBox="0 0 10 10"><path d="M5 0L6 4L10 5L6 6L5 10L4 6L0 5L4 4Z" fill="#fbbf24"/></svg>

        {/* Grass patches */}
        <svg className="absolute top-[20%] left-[1%] opacity-20" width="40" height="12" viewBox="0 0 40 12"><path d="M2 12L5 4L8 12M12 12L16 2L20 12M24 12L27 6L30 12M34 12L37 3L40 12" stroke="#2e5023" strokeWidth="1.5" fill="none"/></svg>
        <svg className="absolute top-[42%] right-[1%] opacity-18" width="36" height="12" viewBox="0 0 36 12"><path d="M2 12L5 5L8 12M12 12L15 3L18 12M22 12L25 6L28 12M32 12L34 4L36 12" stroke="#4f7942" strokeWidth="1.5" fill="none"/></svg>
        <svg className="absolute top-[62%] left-[1%] opacity-16" width="32" height="10" viewBox="0 0 32 10"><path d="M2 10L4 4L6 10M10 10L13 2L16 10M20 10L22 5L24 10M28 10L30 3L32 10" stroke="#2e5023" strokeWidth="1.5" fill="none"/></svg>
        <svg className="absolute top-[82%] right-[2%] opacity-18" width="38" height="12" viewBox="0 0 38 12"><path d="M2 12L5 4L8 12M14 12L17 2L20 12M26 12L29 5L32 12" stroke="#4f7942" strokeWidth="1.5" fill="none"/></svg>
      </div>

      {/* Main Content */}
      <div className={`py-4 sm:py-8 px-4 sm:px-6 transition-all duration-300 relative z-10 ${isSidebarOpen ? 'lg:mr-80' : ''}`}>
        <div className="max-w-3xl mx-auto">
          <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => navigate('/skills')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm bg-white text-[#2e5023] border border-[#d4e8cc] hover:bg-[#edf5e9] transition-all shadow-sm"
            >
              <ChevronLeft className="w-4 h-4" /> Back to Skills
            </button>
          </div>

          {/* Compact Header */}
          <div className="bg-white rounded-2xl border border-[#e2e6dc] p-5 mb-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0 overflow-hidden">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: currentSkill.color || '#2e5023' }}>
                  <SkillIcon name={icon} size={22} className="text-white" />
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-[#1c1f1a] truncate min-w-0">{currentSkill.name}</h1>
              </div>
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 text-[#9aa094] hover:text-[#2e5023] hover:bg-[#edf5e9] rounded-lg transition-colors lg:hidden"
                aria-label="Toggle details"
              >
                {isSidebarOpen ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="bg-white rounded-2xl border border-[#e2e6dc] p-5 mb-6 shadow-sm">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[12px] font-semibold text-[#565c52]">Progress</span>
              <span className="text-[12px] font-bold text-[#1c1f1a]">
                {completedCount} / {totalNodes} nodes
              </span>
            </div>
            <div className="w-full bg-[#e8ece3] rounded-full h-2.5 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${completionPercentage}%`, backgroundColor: currentSkill.color || '#2e5023' }}
              />
            </div>
            <div className="text-right mt-1.5">
              <span className="text-[11px] font-bold" style={{ color: currentSkill.color || '#2e5023' }}>{completionPercentage}%</span>
            </div>
          </div>

          {/* Node Path */}
          <div className="relative pb-12">
            {(() => {
              const filtered = nodes.filter(n => !n.isGoal && !(n.isStart && n.title === 'Start'));

              return filtered.map((node, index) => {
                const isCompleted = node.status === 'Completed';
                const isUnlocked = node.status === 'Unlocked' || node.status === 'In_Progress' || (index === 0 && node.status === 'Locked');
                const isFirst = index === 0;
                const isLeft = index % 2 === 0;
                const prevCompleted = index > 0 && filtered[index - 1].status === 'Completed';
                const isLocked = node.status === 'Locked' && index > 0;

                let outerCls, innerCls;
                if (isCompleted) { outerCls = 'border-green-400 bg-green-50'; innerCls = 'bg-green-500'; }
                else if (isUnlocked) { outerCls = 'border-site-accent bg-site-soft'; innerCls = 'bg-site-accent'; }
                else { outerCls = 'border-gray-300 bg-gray-50'; innerCls = 'bg-gray-300'; }

                return (
                  <div key={node._id} className="flex flex-col items-center">
                    {index > 0 && (
                      <div className={`w-1 h-10 rounded-full ${prevCompleted ? 'bg-green-400' : 'bg-gray-200'}`} />
                    )}
                    <div className={`w-full flex ${isLeft ? 'justify-start pl-4 sm:pl-16' : 'justify-end pr-4 sm:pr-16'}`}>
                      <div className="flex flex-col items-center cursor-pointer" onClick={() => handleNodeClick(node, index)}>
                        <div className={`relative w-20 h-20 sm:w-24 sm:h-24 rounded-full border-[3px] flex items-center justify-center transition-all duration-300 shadow-lg hover:scale-105 ${outerCls}`}>
                          <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center ${innerCls}`}>
                            {isFirst ? <Rocket className="w-7 h-7 sm:w-8 sm:h-8 text-white" strokeWidth={2} />
                            : isCompleted ? <CheckCircle className="w-7 h-7 sm:w-8 sm:h-8 text-white" strokeWidth={2} />
                            : isUnlocked ? <Unlock className="w-7 h-7 sm:w-8 sm:h-8 text-white" strokeWidth={2} />
                            : <Lock className="w-7 h-7 sm:w-8 sm:h-8 text-white" strokeWidth={2} />}
                          </div>
                          {isCompleted && <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center shadow border-2 border-white"><Check className="w-3 h-3 text-white" /></div>}
                          {isLocked && lockedNodeId === node._id && <div className="absolute inset-0 bg-red-500/90 rounded-full flex items-center justify-center animate-pulse"><p className="text-white text-[9px] font-bold text-center px-1">Complete previous</p></div>}
                        </div>
                        <p className="mt-1.5 text-xs font-semibold text-center max-w-[120px] truncate text-gray-700">{node.title}</p>
                      </div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>

          {/* Goal Card */}
          {currentSkill.goal && (() => {
            const uNodes = nodes.filter(n => !n.isGoal && !(n.isStart && n.title === 'Start'));
            const allDone = uNodes.length > 0 && uNodes.every(n => n.status === 'Completed');
            const lastCompleted = uNodes.length > 0 && uNodes[uNodes.length - 1].status === 'Completed';
            return (
              <div className="flex flex-col items-center mt-0 mb-8">
                <div className={`w-1 h-12 rounded-full ${lastCompleted ? 'bg-yellow-400' : 'bg-gray-200'}`} />

                {allDone ? (
                  /* Achieved — rewarding */
                  <div className="relative w-full max-w-md">
                    <div className="bg-white rounded-2xl border-2 border-yellow-300 p-8 text-center shadow-lg">
                      {/* Badge */}
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-yellow-400 text-white text-[10px] font-bold rounded-full uppercase tracking-wider shadow-sm">
                        Goal Achieved
                      </div>

                      {/* Trophy circle */}
                      <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-yellow-50 border-2 border-yellow-300 flex items-center justify-center">
                        <Trophy className="w-10 h-10 text-yellow-500" />
                      </div>

                      <h3 className="text-xl font-bold text-[#1c1f1a] mb-1">{currentSkill.goal}</h3>
                      <p className="text-sm text-[#565c52] mb-5">You completed all {uNodes.length} nodes. Great work!</p>

                      {/* Stats */}
                      <div className="inline-flex items-center gap-5 bg-[#f8faf6] rounded-xl px-6 py-3 border border-[#e2e6dc]">
                        <div className="text-center">
                          <p className="text-lg font-bold text-[#1c1f1a]">{uNodes.length}</p>
                          <p className="text-[10px] text-[#9aa094] font-medium">Nodes</p>
                        </div>
                        <div className="w-px h-8 bg-[#e2e6dc]" />
                        <div className="text-center">
                          <p className="text-lg font-bold text-emerald-600">100%</p>
                          <p className="text-[10px] text-[#9aa094] font-medium">Complete</p>
                        </div>
                        <div className="w-px h-8 bg-[#e2e6dc]" />
                        <div className="text-center">
                          <p className="text-lg font-bold text-yellow-500">★</p>
                          <p className="text-[10px] text-[#9aa094] font-medium">Mastered</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Locked */
                  <div className="relative w-full max-w-sm p-6 rounded-2xl text-center bg-white/80 border-2 border-dashed border-gray-300">
                    <Trophy className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                    <p className="text-lg font-bold mb-1 text-gray-400">Goal</p>
                    <p className="text-sm text-gray-400">{currentSkill.goal}</p>
                    <p className="text-[10px] text-gray-400 mt-2">Complete all {uNodes.length} nodes to unlock</p>
                  </div>
                )}
              </div>
            );
          })()}

          {nodes.filter(n => !n.isGoal && !(n.isStart && n.title === 'Start')).length === 0 && (
            <div className="text-center py-12 text-gray-700 text-sm">
              No nodes found for this skill.
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar - Details Panel */}
      <div
        className={`fixed top-16 right-0 h-[calc(100vh-4rem)] bg-white border-l border-[#e2e6dc] shadow-lg transition-transform duration-300 z-20 ${
          isSidebarOpen ? 'translate-x-0' : 'translate-x-full'
        } w-full sm:w-80 flex flex-col`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#e2e6dc] bg-[#f8faf6]">
          <h2 className="text-[15px] font-bold text-[#1c1f1a]">Details</h2>
          <div className="flex items-center gap-1">
            {isEditing ? (
              <>
                <button onClick={handleSaveEdit} disabled={isSaving || !editForm.name.trim()} className="min-w-[44px] min-h-[44px] p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50" title="Save"><Check className="w-5 h-5" /></button>
                <button onClick={() => setShowCancelConfirm(true)} className="min-w-[44px] min-h-[44px] p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Cancel"><X className="w-5 h-5" /></button>
              </>
            ) : !isTemplateMap ? (
              <button onClick={handleEditClick} className="min-w-[44px] min-h-[44px] p-2 text-[#9aa094] hover:text-[#2e5023] hover:bg-[#edf5e9] rounded-lg transition-colors" title="Edit"><Pencil className="w-4 h-4" /></button>
            ) : null}
          </div>
        </div>

        {/* Sidebar Content - same as before */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-6">
          {isEditing ? (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg border-2 border-gray-300 p-4">
                <label className="block text-sm font-bold text-gray-700 mb-3">Icon & Name</label>
                <div className="mb-3">
                  <IconPicker
                    value={editForm.icon}
                    onChange={(iconName) => setEditForm({ ...editForm, icon: iconName })}
                  />
                </div>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => { if (e.target.value.length <= 30) setEditForm({ ...editForm, name: e.target.value }); }}
                  placeholder="Skill map name"
                  className="w-full text-lg font-bold text-gray-900 border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-site-accent outline-none bg-white"
                  maxLength={30}
                />
                <div className="text-right text-[10px] text-gray-400 mt-0.5">{editForm.name.length}/30</div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  <Target className="w-4 h-4 inline mr-1" />
                  Goal
                </label>
                <textarea
                  value={editForm.goal}
                  onChange={(e) => { if (e.target.value.length <= 16) setEditForm({ ...editForm, goal: e.target.value }); }}
                  placeholder="What's your goal?"
                  className="w-full text-sm text-gray-600 border-2 border-gray-300 rounded-lg px-3 py-2 focus:border-site-accent outline-none resize-none"
                  rows={1}
                  maxLength={16}
                />
                <div className="text-right text-[10px] text-gray-400 mt-0.5">{editForm.goal.length}/16</div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  <FileText className="w-4 h-4 inline mr-1" />
                  Description
                </label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="Additional details"
                  className="w-full text-sm text-gray-600 border-2 border-gray-300 rounded-lg px-3 py-3 focus:border-site-accent outline-none resize-none"
                  rows={4}
                  maxLength={500}
                />
              </div>

              {/* Nodes Section - Edit Mode */}
              <div className="bg-site-soft rounded-lg p-4 border-2 border-site-border shadow-md">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-gray-900">Nodes ({nodes.filter(n => !n.isGoal && !(n.isStart && n.title === 'Start')).length}/15)</h3>
                  {nodes.length < 15 ? (
                    <button
                      onClick={() => { setShowAddNodeForm(true); setNodeError(''); }}
                      className="px-3 py-1 bg-[#2e5023] text-white text-xs font-bold rounded hover:bg-[#1f3518] transition"
                    >
                      + Add Node
                    </button>
                  ) : (
                    <span className="text-[10px] text-amber-600 font-medium">Max reached</span>
                  )}
                </div>
                
                {/* Add Node Form */}
                {showAddNodeForm && nodes.length < 15 && (
                  <div className="mb-3 bg-white rounded p-3 border-2 border-site-border">
                    <label className="block text-xs font-bold text-gray-700 mb-2">New Node Title</label>
                    <input
                      type="text"
                      value={newNodeTitle}
                      onChange={(e) => { if (e.target.value.length <= 16) { setNewNodeTitle(e.target.value); setNodeError(''); } }}
                      placeholder="Max 16 characters"
                      className="w-full px-2 py-1 border border-site-border rounded text-xs focus:outline-none focus:border-site-accent mb-1"
                      maxLength={16}
                      autoFocus
                    />
                    <div className="flex justify-between text-[10px] text-gray-400 mb-2">
                      <span>{nodeError && <span className="text-red-500">{nodeError}</span>}</span>
                      <span>{newNodeTitle.length}/16</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleAddNode}
                        disabled={!newNodeTitle.trim() || isAddingNode}
                        className="flex-1 px-3 py-1 bg-[#2e5023] text-white text-xs font-bold rounded hover:bg-[#1f3518] transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isAddingNode ? 'Adding...' : 'Add'}
                      </button>
                      <button
                        onClick={handleCancelAddNode}
                        disabled={isAddingNode}
                        className="flex-1 px-3 py-1 border border-gray-400 text-gray-700 text-xs font-bold rounded hover:bg-gray-100 transition disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
                
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {nodes.filter(n => !n.isGoal && !(n.isStart && n.title === 'Start') && !pendingDeleteIds.includes(n._id)).map((node, index) => (
                    <div key={node._id} className={`bg-white rounded p-2 border text-xs ${pendingDeleteIds.includes(node._id) ? 'border-red-300 bg-red-50 opacity-50' : 'border-site-border'}`}>
                      {deletingNodeId === node._id ? (
                        <div><p className="text-[10px] text-red-600 mb-1.5">Delete "{node.title}"?</p><div className="flex gap-1.5"><button onClick={() => handleDeleteNode(node._id)} className="flex-1 px-2 py-1 bg-red-600 text-white text-[10px] rounded hover:bg-red-700">Yes</button><button onClick={() => setDeletingNodeId(null)} className="flex-1 px-2 py-1 border border-gray-300 text-gray-600 text-[10px] rounded hover:bg-gray-50">No</button></div></div>
                      ) : editingNodeId === node._id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editingNodeTitle}
                            onChange={(e) => { if (e.target.value.length <= 16) setEditingNodeTitle(e.target.value); }}
                            className="flex-1 px-2 py-1 border border-green-400 rounded text-xs focus:outline-none focus:border-site-accent"
                            maxLength={16}
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveNodeName(node._id)}
                            className="text-site-accent hover:text-site-accent-hover"
                            title="Save"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            onClick={handleCancelEditNode}
                            className="text-red-600 hover:text-red-800"
                            title="Cancel"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between min-w-0">
                          <span className="font-semibold text-gray-700 truncate flex-1">{index + 1}. {node.title}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            <button onClick={() => handleEditNodeName(node)} className="min-w-[44px] min-h-[44px] p-2 text-site-accent hover:text-site-accent-hover" title="Edit"><Pencil className="w-3 h-3" /></button>
                            {index > 0 && <button onClick={() => setDeletingNodeId(node._id)} className="min-w-[44px] min-h-[44px] p-2 text-gray-400 hover:text-red-500" title="Delete"><Trash2 className="w-3 h-3" /></button>}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {/* Pending new nodes */}
                  {pendingAddNodes.map((title, i) => (
                    <div key={`pending-${i}`} className="bg-green-50 rounded p-2 border border-green-300 border-dashed text-xs flex items-center justify-between">
                      <span className="font-semibold text-green-700 truncate flex-1">+ {title}</span>
                      <button onClick={() => setPendingAddNodes(prev => prev.filter((_, j) => j !== i))} className="min-w-[44px] min-h-[44px] p-2 text-gray-400 hover:text-red-500 shrink-0" aria-label="Remove"><X className="w-3 h-3" /></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-white rounded-lg p-4 border-2 border-gray-300 shadow-md">
                <div className="flex items-center gap-3">
                  <span className="shrink-0" aria-hidden><SkillIcon name={icon} size={32} className="text-site-accent" /></span>
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <h3 className="text-lg font-bold text-gray-900 truncate">{currentSkill.name}</h3>
                  </div>
                </div>
              </div>
              
              {/* Goal Section - Always visible */}
              <div className="bg-site-soft rounded-lg p-4 border-2 border-site-border shadow-md overflow-hidden">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-site-accent" />
                  <h3 className="text-sm font-bold text-gray-900">Goal</h3>
                </div>
                {currentSkill.goal ? (
                  <p className="text-sm text-gray-700 leading-relaxed break-words">{currentSkill.goal}</p>
                ) : (
                  <p className="text-sm text-gray-400 italic">No goal set yet. Click edit to add one.</p>
                )}
              </div>
              
              {/* Description Section - Always visible */}
              <div className="bg-white rounded-lg p-4 border-2 border-gray-300 shadow-md overflow-hidden">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-gray-500" />
                  <h3 className="text-sm font-bold text-gray-900">Description</h3>
                </div>
                {currentSkill.description ? (
                  <p className="text-sm text-gray-600 leading-relaxed break-words">{currentSkill.description}</p>
                ) : (
                  <p className="text-sm text-gray-400 italic">No description yet. Click edit to add one.</p>
                )}
              </div>

              {/* Nodes Section - View Mode (no edit/delete) */}
              <div className="bg-site-soft rounded-lg p-4 border-2 border-site-border shadow-md">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-gray-900">Nodes ({nodes.filter(n => !n.isGoal && !(n.isStart && n.title === 'Start')).length}/15)</h3>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {nodes.filter(n => !n.isGoal && !(n.isStart && n.title === 'Start')).map((node, index) => (
                    <div key={node._id} className="bg-white rounded p-2 border border-site-border text-xs">
                      <span className="font-semibold text-gray-700 truncate block">{index + 1}. {node.title}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Template Sessions Overview */}
              {isTemplateMap && (
                <div className="bg-white rounded-lg p-4 border-2 border-gray-300 shadow-md">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-gray-900">Sessions</h3>
                    <span className="text-xs font-medium text-site-accent">{totalCompletedTemplateSessions}/{totalTemplateSessions}</span>
                  </div>
                  <div className="space-y-3 max-h-72 overflow-y-auto">
                    {userNodes.filter(n => n.sessionDefinitions?.length > 0).map((node) => (
                      <div key={node._id}>
                        <p className="text-[10px] font-bold text-site-accent uppercase tracking-wide mb-1">{node.title}</p>
                        <div className="space-y-1">
                          {node.sessionDefinitions.map((sd, j) => {
                            const done = (node.completedSessions || []).includes(j);
                            return (
                              <div key={j} className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs ${done ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-600'}`}>
                                {done ? <CheckCircle className="w-3 h-3 text-green-500 shrink-0" /> : <div className="w-3 h-3 rounded-full border border-gray-300 shrink-0" />}
                                <span className="truncate">{sd.title}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                  {isTemplateMap && <p className="text-[10px] text-gray-400 mt-2 text-center">Template sessions are managed within each node</p>}
                </div>
              )}

              {/* Sessions for user-created maps — always show */}
              {!isTemplateMap && (() => {
                const mapSessions = activeSessions.filter(s => s.skillId === skillId);
                const totalActive = mapSessions.length;
                const totalCompleted = practiceHistory.length;
                return (
                  <div className="bg-white rounded-lg p-4 border-2 border-gray-300 shadow-md">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold text-gray-900">Sessions</h3>
                      <div className="flex gap-2 text-[10px]">
                        {totalActive > 0 && <span className="text-site-accent font-medium">{totalActive} active</span>}
                        {totalCompleted > 0 && <span className="text-gray-400">{totalCompleted} completed</span>}
                      </div>
                    </div>
                    {totalActive === 0 && totalCompleted === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-3">No sessions yet. Start practicing from a node.</p>
                    ) : (
                      <div className="space-y-3 max-h-72 overflow-y-auto">
                        {userNodes.map(n => {
                          const nodeSessions = mapSessions.filter(s => s.nodeId === n._id);
                          const nodeHistory = practiceHistory.filter(p => p.skillName === n.title);
                          if (nodeSessions.length === 0 && nodeHistory.length === 0) return null;
                          return (
                            <div key={n._id}>
                              <p className="text-[10px] font-bold text-site-accent uppercase tracking-wide mb-1">{n.title}</p>
                              <div className="space-y-1">
                                {nodeSessions.map(s => (
                                  <div key={s.id || s._id} className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs cursor-pointer hover:shadow-sm ${s.isRunning ? 'bg-green-50 border border-green-300' : 'bg-gray-50 border border-gray-200'}`} onClick={() => navigate(`/skills/${skillId}/nodes/${n._id}`)}>
                                    {s.isRunning ? <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shrink-0" /> : <Clock className="w-3 h-3 text-gray-400 shrink-0" />}
                                    <span className="truncate flex-1">{s.notes || s.skillName || 'Active'}</span>
                                    <span className={`font-mono text-[10px] shrink-0 ${s.isRunning ? 'text-green-600' : 'text-gray-500'}`}>{formatTimer(s.timer)}</span>
                                  </div>
                                ))}
                                {nodeHistory.map(p => (
                                  <div key={p._id} className="flex items-center gap-2 px-2 py-1.5 rounded text-xs bg-green-50 border border-green-200 cursor-pointer hover:shadow-sm" onClick={() => navigate(`/skills/${skillId}/nodes/${n._id}`)}>
                                    <CheckCircle className="w-3 h-3 text-green-500 shrink-0" />
                                    <span className="truncate flex-1">{p.notes || p.skillName || n.title}</span>
                                    <span className="text-[10px] text-gray-400 shrink-0">{p.minutesPracticed}m</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Toggle sidebar button - always visible at same position */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className={`fixed top-20 p-2 bg-white border border-[#e2e6dc] rounded-xl shadow-md hover:shadow-lg transition-all z-20 hover:bg-[#edf5e9] ${isSidebarOpen ? 'right-[calc(100%-2.5rem)] sm:right-[20.5rem]' : 'right-4'}`}
        aria-label={isSidebarOpen ? 'Close details' : 'Open details'}
      >
        {isSidebarOpen ? <ChevronRight className="w-5 h-5 text-[#2e5023]" /> : <ChevronLeft className="w-5 h-5 text-[#2e5023]" />}
      </button>

      {/* Cancel Edit Confirmation */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xs p-5 text-center">
            <p className="text-sm font-semibold text-gray-900 mb-2">Discard changes?</p>
            <p className="text-xs text-gray-500 mb-4">Unsaved edits will be lost.</p>
            <div className="flex gap-2">
              <button onClick={() => setShowCancelConfirm(false)} className="flex-1 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50">Keep editing</button>
              <button onClick={() => { handleCancelEdit(); setShowCancelConfirm(false); }} className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">Discard</button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-10 sm:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Back to Top */}
      {showBackToTop && (
        <button
          onClick={() => { const m = document.querySelector('main'); if (m) m.scrollTo({ top: 0, behavior: 'smooth' }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          className={`fixed bottom-6 w-11 h-11 bg-site-accent text-white rounded-full shadow-lg hover:bg-site-accent-hover transition-all z-50 flex items-center justify-center hover:scale-110 ${isSidebarOpen ? 'right-[calc(100%-2.5rem)] sm:right-[21.5rem]' : 'right-6'}`}
          aria-label="Back to top"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
        </button>
      )}
    </div>
  );
}
