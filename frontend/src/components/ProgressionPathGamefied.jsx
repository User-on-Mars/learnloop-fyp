import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSkillMap } from '../context/SkillMapContext';
import { Pencil, Check, X, ChevronRight, ChevronLeft, FileText, Target, Rocket, Trophy, Lock, Unlock, CheckCircle, Trash2 } from 'lucide-react';
import SkillMapPageSkeleton from './SkillMapPageSkeleton';
import IconPicker, { SkillIcon } from './IconPicker';

export default function ProgressionPathGamefied() {
  const { skillId } = useParams();
  const navigate = useNavigate();
  const {
    currentSkill,
    nodes,
    mapViewLoading,
    mapDetailError,
    skillMapProgress,
    loadSkillMapFull,
    updateSkillMap,
    updateNodeContent,
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

  useEffect(() => {
    if (skillId) loadSkillMapFull(skillId);
  }, [skillId, loadSkillMapFull]);

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

  const handleNodeClick = (node) => {
    if (node.status === 'Locked') {
      setLockedNodeId(node._id);
      return;
    }
    if (!skillId) return;
    navigate(`/maps/${skillId}/nodes/${node._id}`);
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
    if (!newNodeTitle.trim() || !skillId) return;
    setNodeError('');
    
    // Check for duplicate node name
    const isDuplicate = nodes.some(n => n.title.toLowerCase() === newNodeTitle.trim().toLowerCase());
    if (isDuplicate) {
      setNodeError('A node with this name already exists.');
      return;
    }
    
    // Check max nodes
    if (nodes.length >= 15) {
      setNodeError('Maximum 15 nodes reached.');
      return;
    }
    
    setIsAddingNode(true);
    try {
      await createNode(skillId, { title: newNodeTitle.trim() });
      setNewNodeTitle('');
      setShowAddNodeForm(false);
      setNodeError('');
    } catch (error) {
      console.error('Error adding node:', error);
      setNodeError(error.message || 'Failed to add node.');
    } finally {
      setIsAddingNode(false);
    }
  };

  const handleCancelAddNode = () => {
    setNewNodeTitle('');
    setShowAddNodeForm(false);
  };

  const handleDeleteNode = async (nodeId) => {
    setIsDeletingNode(true);
    try {
      await deleteNode(nodeId);
      setDeletingNodeId(null);
    } catch (error) {
      setNodeError(error.message || 'Cannot delete this node.');
      setDeletingNodeId(null);
    } finally {
      setIsDeletingNode(false);
    }
  };

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    if (currentSkill) {
      setEditForm({
        name: currentSkill.name || '',
        goal: currentSkill.goal || '',
        description: currentSkill.description || '',
        icon: currentSkill.icon || 'Map'
      });
    }
  };

  const handleSaveEdit = async () => {
    if (!editForm.name.trim()) return;
    
    setIsSaving(true);
    try {
      await updateSkillMap(skillId, {
        name: editForm.name.trim(),
        goal: editForm.goal.trim(),
        description: editForm.description.trim(),
        icon: editForm.icon
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update skill map:', error);
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

  const completedCount = skillMapProgress?.completed ?? nodes.filter((node) => node.status === 'Completed').length;
  const totalNodes = skillMapProgress?.total ?? nodes.length;
  const completionPercentage =
    skillMapProgress?.percent ??
    (nodes.length > 0 ? Math.round((completedCount / nodes.length) * 100) : 0);

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
      
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-40">
        <div className="absolute bottom-10 left-[10%] text-4xl">🌿</div>
        <div className="absolute bottom-20 left-[25%] text-3xl">🌿</div>
        <div className="absolute top-40 left-[15%] text-3xl">🌿</div>
        <div className="absolute bottom-32 right-[20%] text-4xl">🌿</div>
        <div className="absolute top-60 right-[30%] text-3xl">🌿</div>
        <div className="absolute top-20 right-[10%] text-6xl">🌳</div>
        <div className="absolute bottom-40 left-[5%] text-5xl">🌳</div>
        <div className="absolute top-[50%] right-[5%] text-5xl">🌳</div>
        <div className="absolute top-32 left-[20%] text-2xl">🌸</div>
        <div className="absolute bottom-24 left-[35%] text-2xl">🌼</div>
        <div className="absolute top-[45%] left-[8%] text-2xl">🌺</div>
        <div className="absolute bottom-16 right-[25%] text-2xl">🌸</div>
        <div className="absolute top-[35%] right-[15%] text-2xl">🌼</div>
      </div>

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
            {skillId && (
              <span
                className="inline-flex items-center px-4 sm:px-6 py-2.5 rounded-lg font-medium bg-white/90 text-[#2e5023] text-sm sm:text-base min-h-[44px] border-2 border-site-accent"
              >
                Gamified map view
              </span>
            )}
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

          {/* Simple visible connecting lines using divs */}
          <div className="relative pb-20">
            {nodes.map((node, index) => {
              const isLast = index === nodes.length - 1;
              const isStart = node.isStart;
              const isGoal = node.isGoal;
              const isLeft = index % 2 === 0;

              return (
                <div key={node._id} className="relative mb-24">
                  {/* Simple connecting line to next node */}
                  {!isLast && (
                    <div className="absolute left-0 right-0 pointer-events-none" style={{ top: '64px', height: '140px', zIndex: 1 }}>
                      {/* Vertical line down from current node (extends below node name) */}
                      <div 
                        className={`absolute w-2 ${node.status === 'Completed' ? 'bg-site-accent' : 'bg-black/50'}`}
                        style={{ 
                          left: isLeft ? 'calc(15% - 4px)' : 'calc(85% - 4px)',
                          top: 0,
                          height: '70px'
                        }}
                      />
                      {/* Horizontal line across */}
                      <div 
                        className={`absolute h-2 ${node.status === 'Completed' ? 'bg-site-accent' : 'bg-black/50'}`}
                        style={{ 
                          left: isLeft ? 'calc(15% - 4px)' : 'calc(15% - 4px)',
                          right: isLeft ? 'calc(15% - 4px)' : 'calc(15% - 4px)',
                          top: '70px'
                        }}
                      />
                      {/* Vertical line down to next node */}
                      <div 
                        className={`absolute w-2 ${node.status === 'Completed' ? 'bg-site-accent' : 'bg-black/50'}`}
                        style={{ 
                          left: isLeft ? 'calc(85% - 4px)' : 'calc(15% - 4px)',
                          top: '70px',
                          height: '70px'
                        }}
                      />
                    </div>
                  )}
                  {/* Node Container - Zig-zag positioning */}
                  <div className={`flex ${isLeft ? 'justify-start pl-8 sm:pl-16' : 'justify-end pr-8 sm:pr-16'} relative`} style={{ zIndex: 10 }}>
                    <div className="relative">
                      {/* Node Card */}
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => handleNodeClick(node)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleNodeClick(node);
                          }
                        }}
                        className={`relative cursor-pointer transition-all duration-200 hover:scale-105 w-32 h-32 rounded-xl shadow-xl flex items-center justify-center ${
                          isStart
                            ? 'bg-pink-400 border-4 border-pink-600'
                            : isGoal
                            ? 'bg-cyan-400 border-4 border-cyan-600 rounded-full'
                            : node.status === 'Completed'
                            ? 'bg-site-soft0 border-4 border-green-700'
                            : node.status === 'Unlocked' || node.status === 'In_Progress'
                            ? 'bg-blue-400 border-4 border-blue-600'
                            : 'bg-gray-400 border-4 border-gray-600 opacity-75'
                        }`}
                      >
                        {/* Show message inside locked node when clicked */}
                        {node.status === 'Locked' && lockedNodeId === node._id ? (
                          <div className="absolute inset-0 bg-red-500/95 rounded-xl flex items-center justify-center p-2 animate-pulse">
                            <p className="text-white text-xs font-bold text-center leading-tight">
                              🔒 Complete previous node to unlock
                            </p>
                          </div>
                        ) : (
                          <>
                            {/* Icon inside node */}
                            {isStart ? (
                              <Rocket className="w-16 h-16 text-white" strokeWidth={2.5} />
                            ) : isGoal ? (
                              <Trophy className="w-16 h-16 text-white" strokeWidth={2.5} />
                            ) : node.status === 'Locked' ? (
                              <Lock className="w-16 h-16 text-white" strokeWidth={2.5} />
                            ) : node.status === 'Completed' ? (
                              <CheckCircle className="w-16 h-16 text-white" strokeWidth={2.5} />
                            ) : (
                              <Unlock className="w-16 h-16 text-white" strokeWidth={2.5} />
                            )}
                          </>
                        )}

                        {/* Sparkle for completed */}
                        {node.status === 'Completed' && (
                          <div className="absolute -top-2 -right-2 text-2xl animate-pulse">
                            ⭐
                          </div>
                        )}
                      </div>

                      {/* Node Title Below - Compact */}
                      <div className="absolute top-full mt-3 left-1/2 -translate-x-1/2">
                        <div className="bg-white/95 px-3 py-1.5 rounded-lg shadow-md border-2 border-gray-300 max-w-[180px]">
                          <p className="text-sm font-semibold text-gray-900 text-center whitespace-nowrap overflow-hidden text-ellipsis">
                            {node.title}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {nodes.length === 0 && (
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
          <div className="flex items-center gap-2">
            {!isEditing && (
              <button
                onClick={handleEditClick}
                className="p-2 text-gray-400 hover:text-site-accent hover:bg-white rounded-lg transition-colors"
                aria-label="Edit details"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-colors"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
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
                  <h3 className="text-sm font-bold text-gray-900">Nodes ({nodes.length}/15)</h3>
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
                  {nodes.map((node, index) => (
                    <div key={node._id} className="bg-white rounded p-2 border border-site-border text-xs">
                      {editingNodeId === node._id ? (
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
                          <span className="font-semibold text-gray-700 truncate">
                            {index + 1}. {node.title}
                          </span>
                          <button
                            onClick={() => handleEditNodeName(node)}
                            className="text-[#2e5023] hover:text-[#1f3518]"
                            title="Edit name"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={handleSaveEdit}
                  disabled={isSaving || !editForm.name.trim()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#2e5023] text-white rounded-lg font-bold hover:bg-[#1f3518] disabled:opacity-50 disabled:cursor-not-allowed transition-colors border-2 border-[#1f3518] shadow-md"
                >
                  <Check className="w-5 h-5" />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-gray-400 text-gray-700 rounded-lg font-bold hover:bg-gray-100 disabled:opacity-50 transition-colors shadow-md"
                >
                  <X className="w-5 h-5" />
                  Cancel
                </button>
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

              {/* Nodes Section - View Mode */}
              <div className="bg-site-soft rounded-lg p-4 border-2 border-site-border shadow-md">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-gray-900">Nodes ({nodes.length}/15)</h3>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {nodes.map((node, index) => (
                    <div key={node._id} className="bg-white rounded p-2 border border-site-border text-xs">
                      {deletingNodeId === node._id ? (
                        <div>
                          <p className="text-xs text-red-600 mb-2">Delete "{node.title}"?</p>
                          <div className="flex gap-2">
                            <button onClick={() => handleDeleteNode(node._id)} disabled={isDeletingNode} className="flex-1 px-2 py-1 bg-red-600 text-white text-xs rounded font-medium hover:bg-red-700 disabled:opacity-50">{isDeletingNode ? '...' : 'Delete'}</button>
                            <button onClick={() => setDeletingNodeId(null)} className="flex-1 px-2 py-1 border border-gray-300 text-gray-600 text-xs rounded font-medium hover:bg-gray-50">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between min-w-0">
                          <span className="font-semibold text-gray-700 truncate flex-1">
                            {index + 1}. {node.title}
                          </span>
                          {!node.isStart && !node.isGoal && (
                            <button onClick={() => setDeletingNodeId(node._id)} className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors shrink-0" title="Delete node">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Toggle Button */}
      {!isSidebarOpen && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="fixed right-4 top-20 p-3 bg-white border-4 border-site-accent rounded-lg shadow-lg hover:shadow-xl transition-all z-30 hover:bg-site-soft"
          aria-label="Open details"
        >
          <ChevronLeft className="w-5 h-5 text-[#2e5023]" />
        </button>
      )}

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}
