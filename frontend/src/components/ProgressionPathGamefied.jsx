import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSkillMap } from '../context/SkillMapContext';
import { Pencil, Check, X, ChevronRight, ChevronLeft, FileText, Target, Rocket, Trophy, Lock, Unlock, CheckCircle } from 'lucide-react';
import SkillMapPageSkeleton from './SkillMapPageSkeleton';

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
    clearError
  } = useSkillMap();

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    goal: '',
    description: '',
    icon: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [lockedNodeId, setLockedNodeId] = useState(null);
  const [editingNodeId, setEditingNodeId] = useState(null);
  const [editingNodeTitle, setEditingNodeTitle] = useState('');

  const commonEmojis = [
    '🗺️', '📚', '💻', '🎯', '🚀', '⚡', '🔥', '💡',
    '🎨', '🎵', '🏃', '🧠', '📝', '🔧', '🌟', '🎓',
    '💪', '🎮', '📱', '🌈', '🔬', '🎪', '🏆', '✨'
  ];

  useEffect(() => {
    if (skillId) loadSkillMapFull(skillId);
  }, [skillId, loadSkillMapFull]);

  useEffect(() => {
    if (currentSkill) {
      setEditForm({
        name: currentSkill.name || '',
        goal: currentSkill.goal || '',
        description: currentSkill.description || '',
        icon: currentSkill.icon || '🗺️'
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

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setShowEmojiPicker(false);
    if (currentSkill) {
      setEditForm({
        name: currentSkill.name || '',
        goal: currentSkill.goal || '',
        description: currentSkill.description || '',
        icon: currentSkill.icon || '🗺️'
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
      setShowEmojiPicker(false);
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
      <div className="flex items-center justify-center min-h-screen px-4 bg-[#8BC34A]">
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
      <div className="flex items-center justify-center min-h-screen px-4 bg-[#8BC34A]">
        <div className="text-white font-bold">Skill not found</div>
      </div>
    );
  }

  const completedCount = skillMapProgress?.completed ?? nodes.filter((node) => node.status === 'Completed').length;
  const totalNodes = skillMapProgress?.total ?? nodes.length;
  const completionPercentage =
    skillMapProgress?.percent ??
    (nodes.length > 0 ? Math.round((completedCount / nodes.length) * 100) : 0);

  const icon = currentSkill.icon || '🗺️';

  return (
    <div className="flex min-h-screen bg-[#8BC34A] relative overflow-hidden">
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
                className="inline-flex items-center px-4 sm:px-6 py-2.5 rounded-lg font-medium bg-white/90 text-[#2e5023] text-sm sm:text-base min-h-[44px] border-2 border-[#2e5023]"
              >
                Gamified map view
              </span>
            )}
          </div>

          {/* Compact Header */}
          <div className="bg-white/95 backdrop-blur-sm rounded-xl border-4 border-[#2e5023] p-4 mb-4 shadow-lg">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1">
                <span className="text-3xl" aria-hidden>
                  {icon}
                </span>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">{currentSkill.name}</h1>
              </div>
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 text-gray-400 hover:text-[#2e5023] hover:bg-green-100 rounded-lg transition-colors lg:hidden"
                aria-label="Toggle details"
              >
                {isSidebarOpen ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="bg-white/95 backdrop-blur-sm rounded-lg border-4 border-[#2e5023] p-4 mb-6 shadow-lg">
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
                    <div className="absolute left-0 right-0 top-32 h-24 pointer-events-none" style={{ zIndex: 1 }}>
                      {/* Vertical line down */}
                      <div 
                        className={`absolute w-1 h-12 ${node.status === 'Completed' ? 'bg-green-600' : 'bg-black/40'}`}
                        style={{ 
                          left: isLeft ? '15%' : '85%',
                          top: 0
                        }}
                      />
                      {/* Horizontal line across */}
                      <div 
                        className={`absolute h-1 ${node.status === 'Completed' ? 'bg-green-600' : 'bg-black/40'}`}
                        style={{ 
                          left: isLeft ? '15%' : '15%',
                          right: isLeft ? '15%' : '15%',
                          top: '48px'
                        }}
                      />
                      {/* Vertical line down to next */}
                      <div 
                        className={`absolute w-1 h-12 ${node.status === 'Completed' ? 'bg-green-600' : 'bg-black/40'}`}
                        style={{ 
                          left: isLeft ? '85%' : '15%',
                          top: '48px'
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
                            ? 'bg-green-500 border-4 border-green-700'
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
        className={`fixed lg:fixed top-0 right-0 h-full bg-white border-l-4 border-[#2e5023] shadow-xl transition-transform duration-300 z-40 ${
          isSidebarOpen ? 'translate-x-0' : 'translate-x-full'
        } w-80 flex flex-col`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b-4 border-[#2e5023] bg-gradient-to-r from-green-100 to-emerald-100">
          <h2 className="text-lg font-bold text-gray-900">Details</h2>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <button
                onClick={handleEditClick}
                className="p-2 text-gray-400 hover:text-[#2e5023] hover:bg-white rounded-lg transition-colors"
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
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {isEditing ? (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg border-2 border-gray-300 p-4">
                <label className="block text-sm font-bold text-gray-700 mb-3">Icon & Name</label>
                <div className="mb-3">
                  <div className="relative inline-block">
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="w-20 h-20 text-4xl flex items-center justify-center border-4 border-gray-400 rounded-xl hover:border-[#2e5023] transition-colors bg-white shadow-md"
                    >
                      {editForm.icon}
                    </button>
                    {showEmojiPicker && (
                      <div className="absolute top-full left-0 mt-2 bg-white border-4 border-[#2e5023] rounded-lg shadow-xl p-3 z-50 w-64">
                        <div className="grid grid-cols-6 gap-2">
                          {commonEmojis.map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => {
                                setEditForm({ ...editForm, icon: emoji });
                                setShowEmojiPicker(false);
                              }}
                              className="w-10 h-10 text-2xl flex items-center justify-center hover:bg-green-100 rounded-lg transition-colors"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="Skill map name"
                  className="w-full text-lg font-bold text-gray-900 border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-[#2e5023] outline-none bg-white"
                  maxLength={100}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  <Target className="w-4 h-4 inline mr-1" />
                  Goal
                </label>
                <textarea
                  value={editForm.goal}
                  onChange={(e) => setEditForm({ ...editForm, goal: e.target.value })}
                  placeholder="What do you want to achieve?"
                  className="w-full text-sm text-gray-600 border-2 border-gray-300 rounded-lg px-3 py-3 focus:border-[#2e5023] outline-none resize-none"
                  rows={3}
                  maxLength={200}
                />
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
                  className="w-full text-sm text-gray-600 border-2 border-gray-300 rounded-lg px-3 py-3 focus:border-[#2e5023] outline-none resize-none"
                  rows={4}
                  maxLength={500}
                />
              </div>

              {/* Nodes Section - Edit Mode */}
              <div className="bg-green-50 rounded-lg p-4 border-2 border-green-300 shadow-md">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-gray-900">Nodes ({nodes.length})</h3>
                  <button
                    onClick={() => {
                      alert('Add node feature requires backend implementation. Coming soon!');
                    }}
                    className="px-3 py-1 bg-[#2e5023] text-white text-xs font-bold rounded hover:bg-[#1f3518] transition"
                  >
                    + Add Node
                  </button>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {nodes.map((node, index) => (
                    <div key={node._id} className="bg-white rounded p-2 border border-green-300 text-xs">
                      {editingNodeId === node._id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editingNodeTitle}
                            onChange={(e) => setEditingNodeTitle(e.target.value)}
                            className="flex-1 px-2 py-1 border border-green-400 rounded text-xs focus:outline-none focus:border-[#2e5023]"
                            maxLength={200}
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveNodeName(node._id)}
                            className="text-green-600 hover:text-green-800"
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
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-gray-700">
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
                  <span className="text-4xl" aria-hidden>{icon}</span>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 break-words">{currentSkill.name}</h3>
                  </div>
                </div>
              </div>
              
              {/* Goal Section - Always visible */}
              <div className="bg-emerald-50 rounded-lg p-4 border-2 border-emerald-300 shadow-md">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-sm font-bold text-gray-900">Goal</h3>
                </div>
                {currentSkill.goal ? (
                  <p className="text-sm text-gray-700 leading-relaxed">{currentSkill.goal}</p>
                ) : (
                  <p className="text-sm text-gray-400 italic">No goal set yet. Click edit to add one.</p>
                )}
              </div>
              
              {/* Description Section - Always visible */}
              <div className="bg-white rounded-lg p-4 border-2 border-gray-300 shadow-md">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-gray-500" />
                  <h3 className="text-sm font-bold text-gray-900">Description</h3>
                </div>
                {currentSkill.description ? (
                  <p className="text-sm text-gray-600 leading-relaxed">{currentSkill.description}</p>
                ) : (
                  <p className="text-sm text-gray-400 italic">No description yet. Click edit to add one.</p>
                )}
              </div>

              {/* Nodes Section - View Mode */}
              <div className="bg-green-50 rounded-lg p-4 border-2 border-green-300 shadow-md">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-gray-900">Nodes ({nodes.length})</h3>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {nodes.map((node, index) => (
                    <div key={node._id} className="bg-white rounded p-2 border border-green-300 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-700">
                          {index + 1}. {node.title}
                        </span>
                      </div>
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
          className="fixed right-4 top-20 p-3 bg-white border-4 border-[#2e5023] rounded-lg shadow-lg hover:shadow-xl transition-all z-30 hover:bg-emerald-50"
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
