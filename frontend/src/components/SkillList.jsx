import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, ChevronRight, Target } from 'lucide-react';
import { useSkillMap } from '../context/SkillMapContext';
import { useToast } from '../context/ToastContext';
import CreateSkillMapWizard from './CreateSkillMapWizard';

export default function SkillList() {
  const navigate = useNavigate();
  const { showSuccess } = useToast();
  const { skills, deleteSkill, isLoading } = useSkillMap();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [deletingSkillId, setDeletingSkillId] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  const handleDeleteClick = (skillId, e) => {
    e.stopPropagation();
    setShowDeleteConfirm(skillId);
  };

  const handleDeleteConfirm = async (skillId, e) => {
    e.stopPropagation();
    try {
      setDeletingSkillId(skillId);
      await deleteSkill(skillId);
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting skill:', error);
    } finally {
      setDeletingSkillId(null);
    }
  };

  const handleDeleteCancel = (e) => {
    e.stopPropagation();
    setShowDeleteConfirm(null);
  };

  const handleSkillClick = (skillId) => {
    navigate(`/skills/${skillId}`);
  };

  return (
    <div className="px-3 sm:px-4 py-4 sm:py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Skill Maps</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Track your learning journey with visual progression paths</p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-3 sm:py-2.5 bg-site-accent text-white rounded-lg font-medium hover:bg-site-accent-hover active:opacity-90 transition-all shadow-md hover:shadow-lg min-h-[44px] text-sm sm:text-base"
        >
          <Plus className="w-5 h-5" />
          <span>Create New Skill Map</span>
        </button>
      </div>

      {/* Skills Grid */}
      {skills.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-8 sm:p-12 text-center">
          <div className="w-16 sm:w-20 h-16 sm:h-20 bg-site-soft rounded-full flex items-center justify-center mx-auto mb-4 border border-site-border">
            <Target className="w-8 sm:w-10 h-8 sm:h-10 text-site-accent" />
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">No skills yet</h3>
          <p className="text-sm sm:text-base text-gray-600 mb-6">Create your first skill map to start tracking your learning journey</p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 sm:px-6 py-3 bg-site-accent text-white rounded-lg font-medium hover:bg-site-accent-hover active:opacity-90 transition-all min-h-[44px] text-sm sm:text-base"
          >
            <Plus className="w-5 h-5" />
            <span>Create Your First Skill</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {skills.map((skill) => (
            <div
              key={skill._id}
              onClick={() => handleSkillClick(skill._id)}
              className="bg-white rounded-xl shadow-md border border-gray-100 p-5 sm:p-6 hover:shadow-lg transition-all cursor-pointer group relative min-h-[140px] touch-manipulation"
            >
              {/* Delete Button - touch-friendly */}
              {showDeleteConfirm === skill._id ? (
                <div className="absolute top-3 sm:top-4 right-3 sm:right-4 flex gap-2 z-10">
                  <button
                    onClick={(e) => handleDeleteConfirm(skill._id, e)}
                    disabled={deletingSkillId === skill._id}
                    className="px-3 py-2 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 active:bg-red-800 transition-colors disabled:opacity-50 min-h-[44px] min-w-[44px] flex items-center justify-center"
                  >
                    {deletingSkillId === skill._id ? '...' : 'Yes'}
                  </button>
                  <button
                    onClick={handleDeleteCancel}
                    disabled={deletingSkillId === skill._id}
                    className="px-3 py-2 bg-gray-200 text-gray-700 text-xs rounded-lg hover:bg-gray-300 active:bg-gray-400 transition-colors disabled:opacity-50 min-h-[44px] min-w-[44px] flex items-center justify-center"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  onClick={(e) => handleDeleteClick(skill._id, e)}
                  className="absolute top-3 sm:top-4 right-3 sm:right-4 p-2.5 sm:p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 active:bg-red-100 rounded-lg transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label="Delete skill"
                >
                  <Trash2 className="w-5 h-5 sm:w-4 sm:h-4" />
                </button>
              )}

              {/* Title + icon */}
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 pr-12 sm:pr-8 break-words flex items-center gap-2">
                <span className="text-2xl shrink-0" aria-hidden>
                  {skill.icon || '🗺️'}
                </span>
                <span>{skill.name}</span>
              </h3>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs sm:text-sm mb-2">
                  <span className="text-gray-600">Progress</span>
                  <span className="font-semibold text-site-accent">
                    {Math.round(skill.completionPercentage || 0)}%
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-site-accent rounded-full transition-all duration-500"
                    style={{ width: `${skill.completionPercentage || 0}%` }}
                  />
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="text-gray-600">
                  {skill.completedNodes || 0}/{skill.nodeCount} nodes
                </span>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-site-accent transition-colors" />
              </div>

              <div className="mt-3 pt-3 border-t border-gray-100" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => navigate(`/maps/${skill._id}`)}
                  className="text-xs sm:text-sm font-medium text-emerald-700 hover:text-emerald-800 hover:underline"
                >
                  Open gamified map view →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Skill Modal */}
      <CreateSkillMapWizard
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={({ skillId, title }) => {
          showSuccess(`Skill map ${title} created! Start from the first node.`);
          navigate(`/maps/${skillId}`);
        }}
      />
    </div>
  );
}
