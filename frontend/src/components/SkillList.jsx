import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, ChevronRight, ChevronLeft, Target, Palette, Check, X, Crown, Sparkles } from 'lucide-react';
import { useSkillMap } from '../context/SkillMapContext';
import { useToast } from '../context/ToastContext';
import { useSubscription } from '../context/SubscriptionContext';
import CreateSkillMapWizard from './CreateSkillMapWizard';
import TemplateGallery from './TemplateGallery';
import { SkillIcon } from './IconPicker';
import { COLOR_THEMES } from './ColorPicker';

const PER_PAGE = 9;

export default function SkillList() {
  const navigate = useNavigate();
  const { showSuccess } = useToast();
  const { skills, deleteSkill, loadSkills, updateSkillMap, isLoading } = useSkillMap();
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [deletingSkillId, setDeletingSkillId] = useState(null);
  const [skillPendingDeleteId, setSkillPendingDeleteId] = useState(null);
  const [page, setPage] = useState(1);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  const [colorPickerOpen, setColorPickerOpen] = useState(null); // Track which card's color picker is open
  const { limits, isFree, usage, refresh: refreshSubscription } = useSubscription();
  const maxSkillMaps = limits?.maxSkillMaps === -1 ? Infinity : (limits?.maxSkillMaps ?? 3);
  const hasReachedSkillMapLimit = skills.length >= maxSkillMaps;

  const handleCreateClick = () => {
    if (hasReachedSkillMapLimit && isFree) {
      // Don't open gallery, show upgrade prompt handled in JSX
      return;
    }
    setIsGalleryOpen(true);
  };

  // Close color picker when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (colorPickerOpen) {
        setColorPickerOpen(null);
      }
    };
    
    if (colorPickerOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [colorPickerOpen]);

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

  const handleColorChange = async (skillId, newColor, e) => {
    e.stopPropagation();
    setColorPickerOpen(null);
    
    try {
      // Update immediately without reloading
      await updateSkillMap(skillId, { color: newColor });
      showSuccess('Color updated!');
    } catch (error) {
      console.error('Error updating color:', error);
      showSuccess('Failed to update color');
    }
  };

  return (
    <div className="px-3 sm:px-4 py-4 sm:py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Skill Maps
          </h1>
          <p className="text-gray-600 mt-1.5">Track your learning journey with visual progression paths</p>
        </div>
        <button
          onClick={handleCreateClick}
          disabled={hasReachedSkillMapLimit && isFree}
          className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all shadow-md active:scale-[0.98] ${
            hasReachedSkillMapLimit && isFree
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'
              : 'bg-site-accent text-white hover:bg-site-accent-hover hover:shadow-lg'
          }`}
          title={hasReachedSkillMapLimit && isFree ? `Limit reached (${maxSkillMaps} skill maps). Upgrade to Pro or delete one.` : 'Create a new skill map'}
        >
          <span>Create Skill Map</span>
        </button>
      </div>

      {/* Upgrade Banner when limit reached */}
      {hasReachedSkillMapLimit && isFree && (
        <div className="mb-6 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 rounded-lg flex-shrink-0">
              <Sparkles className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-amber-900 text-sm">
                You've reached the limit of {limits.maxSkillMaps} skill maps
              </p>
              <p className="text-amber-700 text-xs mt-1">
                Delete a skill map to create a new one, or upgrade to Pro for unlimited skill maps.
              </p>
              <a
                href="/subscription"
                className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Crown className="w-4 h-4" />
                Upgrade to Pro
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Skills Grid */}
      {skills.length === 0 ? (
        <div className="bg-white rounded-xl p-16 text-center border border-gray-200 shadow-sm">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center mx-auto mb-6 shadow-inner">
            <Target className="w-10 h-10 text-gray-400" />
          </div>
          
          <h3 className="text-2xl font-bold text-gray-900 mb-3">
            No skill maps yet
          </h3>
          <p className="text-gray-600 mb-8 max-w-md mx-auto leading-relaxed">
            Create your first skill map to start tracking your learning progress and visualize your journey
          </p>
          
          <button
            onClick={handleCreateClick}
            className="inline-flex items-center gap-2 px-6 py-3 bg-site-accent text-white rounded-lg font-semibold hover:bg-site-accent-hover transition-all shadow-md hover:shadow-lg active:scale-[0.98]"
          >
            <span>Create Your First Skill Map</span>
          </button>
        </div>
      ) : (
        <>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {skills.slice((page - 1) * PER_PAGE, page * PER_PAGE).map((skill) => {
            const progress = skill.completionPercentage || 0;
            const isCompleted = progress >= 100;
            const isInProgress = progress > 0 && progress < 100;
            const themeColor = skill.color || '#2e5023';
            const isLocked = skill.locked === true;
            
            // Helper function to lighten color for backgrounds
            const getLightColor = (hex) => {
              // Convert hex to RGB
              const r = parseInt(hex.slice(1, 3), 16);
              const g = parseInt(hex.slice(3, 5), 16);
              const b = parseInt(hex.slice(5, 7), 16);
              // Return very light version
              return `rgba(${r}, ${g}, ${b}, 0.1)`;
            };
            
            return (
              <div
                key={skill._id}
                onClick={() => {
                  if (isLocked) return;
                  handleSkillClick(skill._id);
                }}
                className={`group relative bg-white rounded-xl p-5 transition-all duration-200 border border-gray-200 ${
                  isLocked
                    ? 'opacity-60 cursor-not-allowed'
                    : 'cursor-pointer hover:shadow-xl'
                }`}
                style={{
                  borderColor: !isLocked && (isCompleted || isInProgress) ? themeColor : undefined,
                  borderWidth: !isLocked && (isCompleted || isInProgress) ? '2px' : '1px'
                }}
              >
                {/* Locked overlay */}
                {isLocked && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/70 backdrop-blur-[1px] rounded-xl">
                    <Crown className="w-8 h-8 text-amber-500 mb-2" />
                    <p className="text-sm font-semibold text-gray-800">Pro Required</p>
                    <a
                      href="/subscription"
                      onClick={(e) => e.stopPropagation()}
                      className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium rounded-lg transition-colors"
                    >
                      <Sparkles className="w-3 h-3" />
                      Upgrade
                    </a>
                  </div>
                )}
                {/* Header with icon, title, and actions */}
                <div className="flex items-start gap-3 mb-4">
                  {/* Icon */}
                  <div 
                    className="w-14 h-14 rounded-xl flex items-center justify-center shadow-sm text-white shrink-0"
                    style={{
                      backgroundColor: themeColor
                    }}
                  >
                    <SkillIcon name={skill.icon || 'Map'} size={26} />
                  </div>

                  {/* Title and node count */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-gray-900 truncate mb-1">
                      {skill.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {skill.completedNodes || 0}/{skill.nodeCount} nodes
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div className={`flex items-center gap-1 shrink-0 ${isLocked ? 'hidden' : ''}`}>
                    {/* Color picker button */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setColorPickerOpen(colorPickerOpen === skill._id ? null : skill._id);
                        }}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all opacity-0 group-hover:opacity-100"
                        aria-label="Change color"
                        title="Change color"
                      >
                        <Palette className="w-4 h-4" />
                      </button>

                      {/* Color picker dropdown */}
                      {colorPickerOpen === skill._id && (
                        <div 
                          className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 p-4 z-50 w-64"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-semibold text-gray-700">Choose Color</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setColorPickerOpen(null);
                              }}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="grid grid-cols-4 gap-2">
                            {COLOR_THEMES.map((theme) => (
                              <button
                                key={theme.value}
                                type="button"
                                onClick={(e) => handleColorChange(skill._id, theme.value, e)}
                                className="group/color relative"
                                title={theme.name}
                              >
                                <div
                                  className={`w-full aspect-square rounded-lg transition-all hover:scale-110 ${
                                    themeColor === theme.value
                                      ? 'ring-2 ring-offset-2 ring-gray-900'
                                      : 'hover:shadow-md'
                                  }`}
                                  style={{ backgroundColor: theme.value }}
                                >
                                  {themeColor === theme.value && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <Check className="w-4 h-4 text-white drop-shadow-lg" strokeWidth={3} />
                                    </div>
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={(e) => openDeleteSkillModal(skill._id, e)}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all ${
                        hasReachedSkillMapLimit && isFree
                          ? 'opacity-100 text-red-400'
                          : 'opacity-0 group-hover:opacity-100'
                      }`}
                      aria-label="Delete skill"
                      title="Delete skill map"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Progress section */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Progress</span>
                    <span 
                      className="text-base font-bold"
                      style={{
                        color: themeColor
                      }}
                    >
                      {Math.round(progress)}%
                    </span>
                  </div>
                  
                  {/* Progress bar with custom color */}
                  <div className="relative h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${progress}%`,
                        background: `linear-gradient(to right, ${themeColor}, ${themeColor}dd)`
                      }}
                    >
                      {/* Shine effect */}
                      {progress > 10 && (
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent" 
                             style={{ 
                               backgroundSize: '200% 100%',
                               animation: 'shimmer 3s infinite'
                             }} 
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <span 
                    className="text-xs font-medium"
                    style={{
                      color: themeColor
                    }}
                  >
                    {isCompleted ? 'Completed' : isInProgress ? 'In Progress' : 'Not Started'}
                  </span>
                  <div 
                    className="flex items-center gap-1 text-sm font-medium text-gray-400 transition-colors"
                    style={{
                      color: undefined
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = themeColor}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#9ca3af'}
                  >
                    <span>View</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {/* Pagination */}
        {skills.length > PER_PAGE && (
          <div className="flex items-center justify-center gap-2 mt-10 mb-4">
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))} 
              disabled={page === 1} 
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-white border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              <ChevronLeft className="w-4 h-4" /> 
              <span className="hidden sm:inline">Previous</span>
            </button>
            
            <div className="flex items-center gap-1.5">
              {Array.from({ length: Math.ceil(skills.length / PER_PAGE) }, (_, i) => (
                <button 
                  key={i} 
                  onClick={() => setPage(i + 1)} 
                  className={`w-10 h-10 rounded-lg text-sm font-bold transition-all ${
                    page === i + 1 
                      ? 'bg-site-accent text-white shadow-md' 
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300 hover:border-gray-400 shadow-sm'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            
            <button 
              onClick={() => setPage(p => Math.min(Math.ceil(skills.length / PER_PAGE), p + 1))} 
              disabled={page >= Math.ceil(skills.length / PER_PAGE)} 
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-white border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
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
