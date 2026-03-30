import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSkillMap } from '../context/SkillMapContext';
import { Pencil, Check, X, ChevronRight, ChevronLeft, FileText, Target } from 'lucide-react';
import NodeCard from './NodeCard';
import SkillMapPageSkeleton from './SkillMapPageSkeleton';
import IconPicker, { SkillIcon } from './IconPicker';

export default function ProgressionPath() {
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
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="text-center text-red-600 max-w-md">
          <p>{mapDetailError}</p>
          <button
            type="button"
            onClick={() => {
              clearError();
              if (skillId) loadSkillMapFull(skillId);
            }}
            className="mt-4 text-sm underline text-site-accent"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!currentSkill) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="text-gray-600">Skill not found</div>
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
    <div className="flex min-h-screen bg-[#8BC34A] relative overflow-hidden">
      {/* Pixel Art Background Decorations */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Grass tufts */}
        <div className="absolute bottom-10 left-[10%] text-4xl">🌿</div>
        <div className="absolute bottom-20 left-[25%] text-3xl">🌿</div>
        <div className="absolute top-40 left-[15%] text-3xl">🌿</div>
        <div className="absolute bottom-32 right-[20%] text-4xl">🌿</div>
        <div className="absolute top-60 right-[30%] text-3xl">🌿</div>
        
        {/* Trees */}
        <div className="absolute top-20 right-[10%] text-6xl">🌳</div>
        <div className="absolute bottom-40 left-[5%] text-5xl">🌳</div>
        <div className="absolute top-[50%] right-[5%] text-5xl">🌳</div>
        
        {/* Flowers */}
        <div className="absolute top-32 left-[20%] text-2xl">🌸</div>
        <div className="absolute bottom-24 left-[35%] text-2xl">🌼</div>
        <div className="absolute top-[45%] left-[8%] text-2xl">🌺</div>
        <div className="absolute bottom-16 right-[25%] text-2xl">🌸</div>
        <div className="absolute top-[35%] right-[15%] text-2xl">🌼</div>
        
        {/* Sparkles */}
        <div className="absolute top-24 left-[30%] text-xl animate-pulse">✨</div>
        <div className="absolute bottom-28 right-[35%] text-xl animate-pulse" style={{ animationDelay: '0.5s' }}>✨</div>
        <div className="absolute top-[55%] left-[12%] text-xl animate-pulse" style={{ animationDelay: '1s' }}>✨</div>
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
                title="Current view"
              >
                Gamified map view
              </span>
            )}
          </div>

          {/* Compact Header */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1">
                <span className="shrink-0" aria-hidden>
                  <SkillIcon name={icon} size={28} className="text-site-accent" />
                </span>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">{currentSkill.name}</h1>
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
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs sm:text-sm font-medium text-gray-700">Progress</span>
              <span className="text-xs sm:text-sm font-medium text-gray-900">
                {completedCount} / {totalNodes} nodes
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-gradient-to-r from-green-500 to-emerald-500 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
            <div className="text-right mt-1">
              <span className="text-xs text-gray-600">{completionPercentage}%</span>
            </div>
          </div>

          {/* Nodes Path */}
          <div className="relative space-y-4">
            {nodes.map((node, index) => {
              const isLast = index === nodes.length - 1;

              return (
                <div key={node._id} className="relative">
                  {/* Node Label Above */}
                  <div className="flex items-center gap-2 mb-2 ml-2">
                    <span className="text-xs font-semibold text-gray-500">Node {node.order}</span>
                    {node.isStart && (
                      <span className="bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        START
                      </span>
                    )}
                    {node.isGoal && (
                      <span className="bg-purple-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        GOAL
                      </span>
                    )}
                  </div>

                  {/* Compact Node Card */}
                  <NodeCard node={node} compact={true} />

                  {/* Connector Line */}
                  {!isLast && (
                    <div className="flex justify-center my-2">
                      <div
                        className={`w-1 h-8 rounded-full ${
                          node.status === 'Completed' ? 'bg-gradient-to-b from-green-500 to-emerald-500' : 'bg-gray-300'
                        }`}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {nodes.length === 0 && (
            <div className="text-center py-12 text-gray-500 text-sm">No nodes found for this skill.</div>
          )}
        </div>
      </div>

      {/* Right Sidebar - Details Panel */}
      <div
        className={`fixed lg:fixed top-0 right-0 h-full bg-white border-l border-gray-200 shadow-xl transition-transform duration-300 z-40 ${
          isSidebarOpen ? 'translate-x-0' : 'translate-x-full'
        } w-80 flex flex-col`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
          <h2 className="text-lg font-semibold text-gray-900">Details</h2>
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

        {/* Sidebar Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {isEditing ? (
            <div className="space-y-4">
              {/* Icon and Name Card - Display together but edit separately */}
              <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                <label className="block text-sm font-medium text-gray-500 mb-3">Icon & Name</label>
                
                {/* Icon Section */}
                <div className="mb-3">
                  <IconPicker
                    value={editForm.icon}
                    onChange={(iconName) => setEditForm({ ...editForm, icon: iconName })}
                  />
                </div>

                {/* Name Section */}
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="Skill map name"
                  className="w-full text-lg font-semibold text-gray-900 border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-site-accent outline-none bg-white"
                  maxLength={100}
                />
              </div>

              {/* Goal Section */}
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">
                  <Target className="w-4 h-4 inline mr-1" />
                  Goal
                </label>
                <textarea
                  value={editForm.goal}
                  onChange={(e) => setEditForm({ ...editForm, goal: e.target.value })}
                  placeholder="master loop anduild an app usdig loooopaw[ pfkj;&#x27;nowfmqmf"
                  className="w-full text-sm text-gray-600 border-2 border-gray-200 rounded-lg px-3 py-3 focus:border-site-accent outline-none resize-none"
                  rows={3}
                  maxLength={200}
                />
              </div>

              {/* Description Section */}
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">
                  <FileText className="w-4 h-4 inline mr-1" />
                  Description
                </label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="Loops are confusing, I need to start to practice forloop and whileloop"
                  className="w-full text-sm text-gray-600 border-2 border-gray-200 rounded-lg px-3 py-3 focus:border-site-accent outline-none resize-none"
                  rows={4}
                  maxLength={500}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={handleSaveEdit}
                  disabled={isSaving || !editForm.name.trim()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-site-accent text-white rounded-lg font-medium hover:bg-site-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Check className="w-5 h-5" />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  <X className="w-5 h-5" />
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Icon and Name Display */}
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center gap-3">
                  <span className="shrink-0" aria-hidden>
                    <SkillIcon name={icon} size={32} className="text-site-accent" />
                  </span>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 break-words">{currentSkill.name}</h3>
                  </div>
                </div>
              </div>

              {/* Goal Section */}
              {currentSkill.goal && (
                <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-sm font-semibold text-gray-900">Goal</h3>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{currentSkill.goal}</p>
                </div>
              )}

              {/* Description Section */}
              {currentSkill.description && (
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-gray-500" />
                    <h3 className="text-sm font-semibold text-gray-900">Description</h3>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">{currentSkill.description}</p>
                </div>
              )}

              {/* Empty State */}
              {!currentSkill.goal && !currentSkill.description && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <FileText className="w-8 h-8 text-emerald-500/50" />
                  </div>
                  <p className="text-sm text-gray-500 mb-4">No details added yet</p>
                  <button
                    onClick={handleEditClick}
                    className="text-sm text-site-accent hover:text-site-accent-hover font-medium"
                  >
                    Add goal and description
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Toggle Button (visible when sidebar is closed) */}
      {!isSidebarOpen && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="fixed right-4 top-20 p-3 bg-white border border-gray-200 rounded-lg shadow-lg hover:shadow-xl transition-all z-30 hover:bg-emerald-50"
          aria-label="Open details"
        >
          <ChevronLeft className="w-5 h-5 text-site-accent" />
        </button>
      )}

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}
