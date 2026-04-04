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
    <div className="flex min-h-screen bg-site-bg relative overflow-hidden">
      {/* Pixel Art Background Pattern */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage: `
            repeating-linear-gradient(0deg, transparent, transparent 10px, rgba(0,0,0,0.03) 10px, rgba(0,0,0,0.03) 11px),
            repeating-linear-gradient(90deg, transparent, transparent 10px, rgba(0,0,0,0.03) 10px, rgba(0,0,0,0.03) 11px)
          `,
          backgroundSize: '11px 11px'
        }}
      />
      
      {/* Decorative Pixel Art Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.35]">
        {/* Trees - distributed vertically */}
        <svg className="absolute top-[5%] left-[5%]" width="28" height="44" viewBox="0 0 7 11"><rect x="3" y="7" width="1" height="4" fill="#6B4226"/><rect x="1" y="3" width="5" height="4" fill="#2e5023"/><rect x="2" y="1" width="3" height="2" fill="#4f7942"/></svg>
        <svg className="absolute top-[20%] right-[6%]" width="36" height="52" viewBox="0 0 9 13"><rect x="3" y="9" width="3" height="4" fill="#8B5E3C"/><rect x="1" y="4" width="7" height="5" fill="#2e5023"/><rect x="2" y="1" width="5" height="3" fill="#4f7942"/></svg>
        <svg className="absolute top-[40%] left-[3%]" width="32" height="48" viewBox="0 0 8 12"><rect x="3" y="8" width="2" height="4" fill="#6B4226"/><rect x="1" y="4" width="6" height="4" fill="#2e5023"/><rect x="2" y="2" width="4" height="2" fill="#4f7942"/></svg>
        <svg className="absolute top-[60%] right-[4%]" width="28" height="44" viewBox="0 0 7 11"><rect x="3" y="7" width="1" height="4" fill="#6B4226"/><rect x="1" y="3" width="5" height="4" fill="#2e5023"/><rect x="2" y="1" width="3" height="2" fill="#4f7942"/></svg>
        <svg className="absolute top-[80%] left-[6%]" width="36" height="52" viewBox="0 0 9 13"><rect x="4" y="9" width="2" height="4" fill="#8B5E3C"/><rect x="1" y="4" width="7" height="5" fill="#2e5023"/><rect x="2" y="1" width="5" height="3" fill="#4f7942"/></svg>
        <svg className="absolute top-[90%] right-[8%]" width="32" height="48" viewBox="0 0 8 12"><rect x="3" y="8" width="2" height="4" fill="#6B4226"/><rect x="1" y="4" width="6" height="4" fill="#2e5023"/><rect x="2" y="2" width="4" height="2" fill="#4f7942"/></svg>
        {/* Flowers - distributed */}
        <svg className="absolute top-[10%] left-[15%]" width="16" height="20" viewBox="0 0 4 5"><rect x="1" y="3" width="1" height="2" fill="#4f7942"/><rect x="0" y="1" width="1" height="1" fill="#FF69B4"/><rect x="2" y="1" width="1" height="1" fill="#FF69B4"/><rect x="1" y="0" width="1" height="1" fill="#FF69B4"/><rect x="1" y="1" width="1" height="1" fill="#FFD700"/></svg>
        <svg className="absolute top-[25%] right-[18%]" width="16" height="20" viewBox="0 0 4 5"><rect x="1" y="3" width="1" height="2" fill="#4f7942"/><rect x="0" y="1" width="1" height="1" fill="#FF6347"/><rect x="2" y="1" width="1" height="1" fill="#FF6347"/><rect x="1" y="0" width="1" height="1" fill="#FF6347"/><rect x="1" y="1" width="1" height="1" fill="#FFD700"/></svg>
        <svg className="absolute top-[45%] left-[10%]" width="16" height="20" viewBox="0 0 4 5"><rect x="1" y="3" width="1" height="2" fill="#4f7942"/><rect x="0" y="1" width="1" height="1" fill="#DA70D6"/><rect x="2" y="1" width="1" height="1" fill="#DA70D6"/><rect x="1" y="0" width="1" height="1" fill="#DA70D6"/><rect x="1" y="1" width="1" height="1" fill="#FFD700"/></svg>
        <svg className="absolute top-[55%] right-[15%]" width="16" height="20" viewBox="0 0 4 5"><rect x="1" y="3" width="1" height="2" fill="#4f7942"/><rect x="0" y="1" width="1" height="1" fill="#87CEEB"/><rect x="2" y="1" width="1" height="1" fill="#87CEEB"/><rect x="1" y="0" width="1" height="1" fill="#87CEEB"/><rect x="1" y="1" width="1" height="1" fill="#FFD700"/></svg>
        <svg className="absolute top-[70%] left-[12%]" width="16" height="20" viewBox="0 0 4 5"><rect x="1" y="3" width="1" height="2" fill="#4f7942"/><rect x="0" y="1" width="1" height="1" fill="#FFB6C1"/><rect x="2" y="1" width="1" height="1" fill="#FFB6C1"/><rect x="1" y="0" width="1" height="1" fill="#FFB6C1"/><rect x="1" y="1" width="1" height="1" fill="#FFD700"/></svg>
        <svg className="absolute top-[85%] right-[20%]" width="16" height="20" viewBox="0 0 4 5"><rect x="1" y="3" width="1" height="2" fill="#4f7942"/><rect x="0" y="1" width="1" height="1" fill="#FFA500"/><rect x="2" y="1" width="1" height="1" fill="#FFA500"/><rect x="1" y="0" width="1" height="1" fill="#FFA500"/><rect x="1" y="1" width="1" height="1" fill="#FFD700"/></svg>
        {/* Grass - along edges */}
        <svg className="absolute top-[15%] left-[1%]" width="32" height="10" viewBox="0 0 8 3"><rect x="0" y="2" width="8" height="1" fill="#4f7942"/><rect x="1" y="0" width="1" height="2" fill="#2e5023"/><rect x="4" y="1" width="1" height="1" fill="#4f7942"/><rect x="6" y="0" width="1" height="1" fill="#2e5023"/></svg>
        <svg className="absolute top-[35%] right-[2%]" width="28" height="10" viewBox="0 0 7 3"><rect x="0" y="2" width="7" height="1" fill="#4f7942"/><rect x="2" y="0" width="1" height="2" fill="#2e5023"/><rect x="5" y="1" width="1" height="1" fill="#4f7942"/></svg>
        <svg className="absolute top-[65%] left-[2%]" width="24" height="10" viewBox="0 0 6 3"><rect x="0" y="2" width="6" height="1" fill="#4f7942"/><rect x="1" y="0" width="1" height="2" fill="#2e5023"/><rect x="4" y="1" width="1" height="1" fill="#4f7942"/></svg>
        <svg className="absolute top-[95%] right-[3%]" width="32" height="10" viewBox="0 0 8 3"><rect x="0" y="2" width="8" height="1" fill="#4f7942"/><rect x="3" y="0" width="1" height="2" fill="#2e5023"/><rect x="6" y="1" width="1" height="1" fill="#4f7942"/></svg>
        {/* Animals - scattered */}
        <svg className="absolute top-[30%] left-[8%]" width="20" height="16" viewBox="0 0 5 4"><rect x="1" y="1" width="3" height="2" fill="#4682B4"/><rect x="0" y="1" width="1" height="1" fill="#4682B4"/><rect x="4" y="0" width="1" height="1" fill="#4682B4"/><rect x="4" y="2" width="1" height="1" fill="#FFD700"/><rect x="2" y="1" width="1" height="1" fill="#fff"/></svg>
        <svg className="absolute top-[50%] right-[10%]" width="20" height="16" viewBox="0 0 5 4"><rect x="2" y="0" width="1" height="4" fill="#333"/><rect x="0" y="0" width="2" height="2" fill="#FF69B4"/><rect x="3" y="0" width="2" height="2" fill="#FF69B4"/><rect x="0" y="2" width="2" height="1" fill="#DA70D6"/><rect x="3" y="2" width="2" height="1" fill="#DA70D6"/></svg>
        <svg className="absolute top-[75%] right-[25%]" width="20" height="24" viewBox="0 0 5 6"><rect x="1" y="0" width="1" height="1" fill="#D2B48C"/><rect x="3" y="0" width="1" height="1" fill="#D2B48C"/><rect x="0" y="1" width="5" height="3" fill="#D2B48C"/><rect x="1" y="2" width="1" height="1" fill="#333"/><rect x="3" y="2" width="1" height="1" fill="#333"/><rect x="1" y="4" width="1" height="2" fill="#D2B48C"/><rect x="3" y="4" width="1" height="2" fill="#D2B48C"/></svg>
        {/* Mushrooms */}
        <svg className="absolute top-[18%] right-[12%]" width="14" height="18" viewBox="0 0 4 5"><rect x="1" y="3" width="2" height="2" fill="#F5F5DC"/><rect x="0" y="1" width="4" height="2" fill="#FF4500"/><rect x="1" y="1" width="1" height="1" fill="#fff"/></svg>
        <svg className="absolute top-[68%] left-[14%]" width="14" height="18" viewBox="0 0 4 5"><rect x="1" y="3" width="2" height="2" fill="#F5F5DC"/><rect x="0" y="1" width="4" height="2" fill="#FF4500"/><rect x="2" y="1" width="1" height="1" fill="#fff"/></svg>
        {/* Clouds */}
        <svg className="absolute top-[3%] left-[30%]" width="48" height="20" viewBox="0 0 12 5"><rect x="2" y="2" width="8" height="3" fill="#fff"/><rect x="1" y="3" width="10" height="2" fill="#fff"/><rect x="3" y="0" width="3" height="2" fill="#fff"/><rect x="7" y="1" width="2" height="1" fill="#fff"/></svg>
        <svg className="absolute top-[2%] right-[25%]" width="40" height="16" viewBox="0 0 10 4"><rect x="1" y="2" width="8" height="2" fill="#fff"/><rect x="2" y="0" width="3" height="2" fill="#fff"/><rect x="6" y="1" width="2" height="1" fill="#fff"/></svg>
      </div>
        {/* Trees */}
        <svg className="absolute bottom-8 left-[8%]" width="32" height="48" viewBox="0 0 8 12"><rect x="3" y="8" width="2" height="4" fill="#6B4226"/><rect x="1" y="4" width="6" height="4" fill="#2e5023"/><rect x="2" y="2" width="4" height="2" fill="#2e5023"/><rect x="3" y="0" width="2" height="2" fill="#4f7942"/></svg>
      {/* Main Content */}
      <div className={`flex-1 py-4 sm:py-8 px-3 sm:px-4 transition-all duration-300 relative z-10 ${isSidebarOpen ? 'mr-0 lg:mr-80' : 'mr-0'}`}>
        <div className="max-w-3xl mx-auto">
          <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => navigate('/skills')}
              className="px-4 sm:px-6 py-2.5 rounded-lg font-medium transition bg-[#2e5023] text-white hover:bg-[#1f3518] active:opacity-90 text-sm sm:text-base min-h-[44px] shadow-lg border-2 border-[#1f3518]"
            >
              Back to Skills
            </button>
          </div>

          {/* Compact Header */}
          <div className="bg-white/95 backdrop-blur-sm rounded-xl border-4 border-site-accent p-4 mb-4 shadow-lg overflow-hidden">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0 overflow-hidden">
                <span className="shrink-0" aria-hidden>
                  <SkillIcon name={icon} size={28} className="text-site-accent" />
                </span>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate min-w-0">{currentSkill.name}</h1>
              </div>
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 text-gray-400 hover:text-site-accent hover:bg-site-soft rounded-lg transition-colors lg:hidden"
                aria-label="Toggle details"
              >
                {isSidebarOpen ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="bg-white/95 backdrop-blur-sm rounded-lg border-4 border-site-accent p-4 mb-6 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs sm:text-sm font-bold text-gray-700">Progress</span>
              <span className="text-xs sm:text-sm font-bold text-gray-900">
                {completedCount} / {totalNodes} nodes
              </span>
            </div>
            <div className="w-full bg-gray-300 rounded-full h-3 border-2 border-gray-400">
              <div
                className="bg-gradient-to-r from-yellow-400 to-yellow-500 h-full rounded-full transition-all duration-500 border-r-2 border-yellow-600"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
            <div className="text-right mt-1">
              <span className="text-xs font-bold text-gray-600">{completionPercentage}%</span>
            </div>
          </div>

          {/* Node Path */}
          <div className="relative pb-12">
            {(() => {
              const filtered = nodes.filter(n => !n.isGoal && !(n.isStart && n.title === 'Start'));
              const allDone = filtered.length > 0 && filtered.every(n => n.status === 'Completed');
              const items = [...filtered];

              return filtered.map((node, index) => {
                const isCompleted = node.status === 'Completed';
                // First node should always be accessible even if backend says Locked (old data)
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
                    {/* Vertical connector line — always centered */}
                    {index > 0 && (
                      <div className={`w-1 h-10 rounded-full ${prevCompleted ? 'bg-green-400' : 'bg-gray-200'}`} />
                    )}

                    {/* Node — alternates left/right */}
                    <div className={`w-full flex ${isLeft ? 'justify-start pl-6 sm:pl-16' : 'justify-end pr-6 sm:pr-16'}`}>
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

          {/* Goal Card - separate from nodes */}
          {currentSkill.goal && (() => {
            const uNodes = nodes.filter(n => !n.isGoal && !(n.isStart && n.title === 'Start'));
            const allDone = uNodes.length > 0 && uNodes.every(n => n.status === 'Completed');
            const lastCompleted = uNodes.length > 0 && uNodes[uNodes.length - 1].status === 'Completed';
            return (
              <div className="flex flex-col items-center mt-0 mb-8">
                {/* Connector to goal */}
                <div className={`w-1 h-12 rounded-full ${lastCompleted ? 'bg-yellow-400' : 'bg-gray-200'}`} />
                <div className={`relative w-full max-w-sm p-6 rounded-2xl text-center transition-all duration-500 ${allDone ? 'bg-gradient-to-br from-yellow-100 via-amber-50 to-yellow-100 border-2 border-yellow-400 shadow-xl shadow-yellow-200/50' : 'bg-white/80 border-2 border-dashed border-gray-300'}`}>
                  {allDone && <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-yellow-400 text-white text-[10px] font-bold rounded-full uppercase tracking-wider shadow">Achieved</div>}
                  <Trophy className={`w-10 h-10 mx-auto mb-2 ${allDone ? 'text-yellow-500' : 'text-gray-300'}`} />
                  <p className={`text-lg font-bold mb-1 ${allDone ? 'text-yellow-700' : 'text-gray-400'}`}>{allDone ? '🎉 Goal Complete!' : 'Goal'}</p>
                  <p className={`text-sm ${allDone ? 'text-yellow-600' : 'text-gray-400'}`}>{currentSkill.goal}</p>
                  {!allDone && <p className="text-[10px] text-gray-400 mt-2">Complete all {uNodes.length} nodes to unlock</p>}
                </div>
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
        className={`fixed lg:fixed top-0 right-0 h-full bg-white border-l-4 border-site-accent shadow-xl transition-transform duration-300 z-40 ${
          isSidebarOpen ? 'translate-x-0' : 'translate-x-full'
        } w-80 flex flex-col`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b-4 border-site-accent bg-gradient-to-r from-green-100 to-emerald-100">
          <h2 className="text-lg font-bold text-gray-900">Details</h2>
          <div className="flex items-center gap-1">
            {isEditing ? (
              <>
                <button onClick={handleSaveEdit} disabled={isSaving || !editForm.name.trim()} className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors disabled:opacity-50" title="Save"><Check className="w-5 h-5" /></button>
                <button onClick={() => setShowCancelConfirm(true)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Cancel"><X className="w-5 h-5" /></button>
              </>
            ) : !isTemplateMap ? (
              <button onClick={handleEditClick} className="p-2 text-gray-400 hover:text-site-accent hover:bg-white rounded-lg transition-colors" title="Edit"><Pencil className="w-4 h-4" /></button>
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
                            <button onClick={() => handleEditNodeName(node)} className="p-1 text-site-accent hover:text-site-accent-hover" title="Edit"><Pencil className="w-3 h-3" /></button>
                            {index > 0 && <button onClick={() => setDeletingNodeId(node._id)} className="p-1 text-gray-400 hover:text-red-500" title="Delete"><Trash2 className="w-3 h-3" /></button>}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {/* Pending new nodes */}
                  {pendingAddNodes.map((title, i) => (
                    <div key={`pending-${i}`} className="bg-green-50 rounded p-2 border border-green-300 border-dashed text-xs flex items-center justify-between">
                      <span className="font-semibold text-green-700 truncate flex-1">+ {title}</span>
                      <button onClick={() => setPendingAddNodes(prev => prev.filter((_, j) => j !== i))} className="p-1 text-gray-400 hover:text-red-500 shrink-0"><X className="w-3 h-3" /></button>
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
        className={`fixed top-4 p-2.5 bg-white border-2 border-site-accent rounded-full shadow-lg hover:shadow-xl transition-all z-50 hover:bg-site-soft ${isSidebarOpen ? 'right-[20.5rem]' : 'right-4'}`}
        aria-label={isSidebarOpen ? 'Close details' : 'Open details'}
      >
        {isSidebarOpen ? <ChevronRight className="w-5 h-5 text-site-accent" /> : <ChevronLeft className="w-5 h-5 text-site-accent" />}
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
          className="fixed inset-0 bg-black/30 z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Back to Top */}
      {showBackToTop && (
        <button
          onClick={() => { const m = document.querySelector('main'); if (m) m.scrollTo({ top: 0, behavior: 'smooth' }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          className={`fixed bottom-6 w-11 h-11 bg-site-accent text-white rounded-full shadow-lg hover:bg-site-accent-hover transition-all z-50 flex items-center justify-center hover:scale-110 ${isSidebarOpen ? 'right-[21.5rem]' : 'right-6'}`}
          aria-label="Back to top"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
        </button>
      )}
    </div>
  );
}
