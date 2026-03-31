import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, ChevronRight, ChevronLeft, Target } from 'lucide-react';
import { useSkillMap } from '../context/SkillMapContext';
import { useToast } from '../context/ToastContext';
import CreateSkillMapWizard from './CreateSkillMapWizard';
import TemplateGallery from './TemplateGallery';
import { SkillIcon } from './IconPicker';

const PER_PAGE = 9;

export default function SkillList() {
  const navigate = useNavigate();
  const { showSuccess } = useToast();
  const { skills, deleteSkill, loadSkills, isLoading } = useSkillMap();
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [deletingSkillId, setDeletingSkillId] = useState(null);
  const [skillPendingDeleteId, setSkillPendingDeleteId] = useState(null);
  const [page, setPage] = useState(1);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');

  const openDeleteSkillModal = (skillId, e) => {
    e.stopPropagation();
    setSkillPendingDeleteId(skillId);
    setDeleteConfirmInput('');
  };

  const closeDeleteSkillModal = () => {
    setSkillPendingDeleteId(null);
    setDeleteConfirmInput('');
  };

  const handleDeleteSkillConfirmed = async () => {
    if (deleteConfirmInput !== 'CONFIRM' || !skillPendingDeleteId) return;
    const idToDelete = skillPendingDeleteId;
    closeDeleteSkillModal();
    try {
      setDeletingSkillId(idToDelete);
      await deleteSkill(idToDelete);
    } catch (error) {
      console.error('Error deleting skill:', error);
    } finally {
      setDeletingSkillId(null);
    }
  };

  const handleSkillClick = (skillId) => {
    navigate(`/skills/${skillId}`);
  };

  return (
    <div className="px-3 sm:px-4 py-4 sm:py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-site-ink">Skill Maps</h1>
          <p className="text-sm sm:text-base text-site-muted mt-1">Track your learning journey with visual progression paths</p>
        </div>
        <button
          onClick={() => setIsGalleryOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-3 sm:py-2.5 bg-site-accent text-white rounded-lg font-medium hover:bg-site-accent-hover active:opacity-90 transition-all shadow-md hover:shadow-lg min-h-[44px] text-sm sm:text-base"
        >
          <Plus className="w-5 h-5" />
          <span>Create New Skill Map</span>
        </button>
      </div>

      {/* Skills Grid */}
      {skills.length === 0 ? (
        <div className="bg-site-surface rounded-xl shadow-sm border border-site-border p-8 sm:p-12 text-center">
          <div className="w-16 sm:w-20 h-16 sm:h-20 bg-site-soft rounded-full flex items-center justify-center mx-auto mb-4 border border-site-border">
            <Target className="w-8 sm:w-10 h-8 sm:h-10 text-site-accent" />
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-site-ink mb-2">No skills yet</h3>
          <p className="text-sm sm:text-base text-site-muted mb-6">Create your first skill map to start tracking your learning journey</p>
          <button
            onClick={() => setIsGalleryOpen(true)}
            className="inline-flex items-center gap-2 px-5 sm:px-6 py-3 bg-site-accent text-white rounded-lg font-medium hover:bg-site-accent-hover active:opacity-90 transition-all min-h-[44px] text-sm sm:text-base"
          >
            <Plus className="w-5 h-5" />
            <span>Create Your First Skill</span>
          </button>
        </div>
      ) : (
        <>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {skills.slice((page - 1) * PER_PAGE, page * PER_PAGE).map((skill) => (
            <div
              key={skill._id}
              onClick={() => handleSkillClick(skill._id)}
              className={`rounded-xl shadow-sm p-5 sm:p-6 hover:shadow-lg transition-all cursor-pointer group relative min-h-[140px] touch-manipulation border-l-4 ${
                (skill.completionPercentage || 0) >= 100
                  ? 'bg-green-50/60 border-l-green-500 border border-green-200'
                  : (skill.completionPercentage || 0) > 0
                  ? 'bg-site-soft/40 border-l-site-accent border border-site-border'
                  : 'bg-site-surface border-l-gray-300 border border-site-border'
              }`}
            >
              {/* Delete Button - touch-friendly */}
              <button
                onClick={(e) => openDeleteSkillModal(skill._id, e)}
                className="absolute top-3 sm:top-4 right-3 sm:right-4 p-2.5 sm:p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 active:bg-red-100 rounded-lg transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Delete skill"
              >
                <Trash2 className="w-5 h-5 sm:w-4 sm:h-4" />
              </button>

              {/* Title + icon */}
              <h3 className="text-lg sm:text-xl font-bold text-site-ink mb-3 pr-12 sm:pr-8 flex items-center gap-2 min-w-0">
                <span className="shrink-0" aria-hidden>
                  <SkillIcon name={skill.icon || 'Map'} size={24} className="text-site-accent" />
                </span>
                <span className="truncate">{skill.name}</span>
              </h3>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs sm:text-sm mb-2">
                  <span className="text-site-muted">Progress</span>
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
                <span className="text-site-muted">
                  {skill.completedNodes || 0}/{skill.nodeCount} nodes
                </span>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-site-accent transition-colors" />
              </div>

              </div>
          ))}
        </div>
        {/* Pagination */}
        {skills.length > PER_PAGE && (
          <div className="flex items-center justify-center gap-2 mt-8 mb-4">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="flex items-center gap-1 px-3 py-2 rounded-lg border border-site-border text-sm font-medium text-site-muted hover:bg-site-soft hover:text-site-accent disabled:opacity-30 transition-colors"><ChevronLeft className="w-4 h-4" /> Prev</button>
            {Array.from({ length: Math.ceil(skills.length / PER_PAGE) }, (_, i) => (
              <button key={i} onClick={() => setPage(i + 1)} className={`w-9 h-9 rounded-lg text-sm font-semibold transition-colors ${page === i + 1 ? 'bg-site-accent text-white shadow-md' : 'border border-site-border text-site-muted hover:bg-site-soft hover:text-site-accent'}`}>{i + 1}</button>
            ))}
            <button onClick={() => setPage(p => Math.min(Math.ceil(skills.length / PER_PAGE), p + 1))} disabled={page >= Math.ceil(skills.length / PER_PAGE)} className="flex items-center gap-1 px-3 py-2 rounded-lg border border-site-border text-sm font-medium text-site-muted hover:bg-site-soft hover:text-site-accent disabled:opacity-30 transition-colors">Next <ChevronRight className="w-4 h-4" /></button>
          </div>
        )}
        </>
      )}

      {/* Template Gallery Modal */}
      <TemplateGallery
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        onCreated={({ skillId, title }) => {
          setIsGalleryOpen(false);
          loadSkills();
          showSuccess(`Skill map "${title}" created!`);
          navigate(`/skills/${skillId}`);
        }}
        onSwitchToWizard={() => {
          setIsGalleryOpen(false);
          setIsWizardOpen(true);
        }}
      />

      {/* Create Skill Map Wizard Modal */}
      <CreateSkillMapWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onCreated={({ skillId, title }) => {
          showSuccess(`Skill map ${title} created! Start from the first node.`);
          navigate(`/skills/${skillId}`);
        }}
        onSwitchToTemplates={() => {
          setIsWizardOpen(false);
          setIsGalleryOpen(true);
        }}
      />

      {/* Delete Skill Map — type CONFIRM */}
      {skillPendingDeleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 border border-red-100">
            <h2 className="text-lg font-bold text-site-ink mb-2">Delete this skill map?</h2>
            <p className="text-sm text-site-muted mb-4">
              This removes the skill map and all its nodes permanently. To confirm, type{' '}
              <span className="font-mono font-semibold text-site-ink">CONFIRM</span> below.
            </p>
            <input
              type="text"
              value={deleteConfirmInput}
              onChange={(e) => setDeleteConfirmInput(e.target.value)}
              placeholder="Type CONFIRM"
              autoComplete="off"
              className="w-full px-4 py-2.5 border-2 border-transparent rounded-lg outline-none focus:border-red-500 transition-colors bg-gray-50 focus:bg-white font-mono text-sm mb-4"
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={closeDeleteSkillModal}
                className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteSkillConfirmed}
                disabled={deleteConfirmInput !== 'CONFIRM'}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
