import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSkillMap } from '../context/SkillMapContext';
import NodeCard from './NodeCard';
import SkillMapPageSkeleton from './SkillMapPageSkeleton';

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
    clearError
  } = useSkillMap();

  useEffect(() => {
    if (skillId) loadSkillMapFull(skillId);
  }, [skillId, loadSkillMapFull]);

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

  const icon = currentSkill.icon || '🗺️';

  return (
    <div className="min-h-screen bg-site-bg py-4 sm:py-8 px-3 sm:px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => navigate('/skills')}
            className="px-4 sm:px-6 py-2.5 rounded-lg font-medium transition border border-gray-300 bg-site-accent text-white hover:bg-site-accent-hover active:opacity-90 text-sm sm:text-base min-h-[44px] min-w-[44px]"
          >
            ← Back to Skills
          </button>
          {skillId && (
            <button
              type="button"
              onClick={() => navigate(`/maps/${skillId}`)}
              className="px-4 sm:px-6 py-2.5 rounded-lg font-medium transition border border-site-border bg-site-soft text-site-accent hover:bg-site-bg text-sm sm:text-base min-h-[44px]"
            >
              Gamified map view →
            </button>
          )}

          <div className="flex items-start gap-3">
            <span className="text-3xl sm:text-4xl leading-none" aria-hidden>
              {icon}
            </span>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 break-words">{currentSkill.name}</h1>
              {currentSkill.goal ? (
                <p className="text-sm sm:text-base text-gray-600 break-words">{currentSkill.goal}</p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <span className="text-xs sm:text-sm font-medium text-gray-700">Progress</span>
            <span className="text-xs sm:text-sm font-medium text-gray-900">
              {completedCount} / {totalNodes} nodes
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5 sm:h-3">
            <div
              className="bg-site-accent h-2.5 sm:h-3 rounded-full transition-all duration-500"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
          <div className="text-right mt-1">
            <span className="text-xs text-gray-600">{completionPercentage}%</span>
          </div>
        </div>

        <div className="relative">
          {nodes.map((node, index) => {
            const isLeft = index % 2 === 0;
            const isLast = index === nodes.length - 1;

            return (
              <div key={node._id} className="relative mb-6 sm:mb-8">
                {!isLast && (
                  <div
                    className={`absolute top-full left-1/2 w-0.5 h-6 sm:h-8 bg-gray-300 transform -translate-x-1/2 ${
                      node.status === 'Completed' ? 'bg-site-accent' : ''
                    }`}
                    style={{ zIndex: 0 }}
                  />
                )}

                <div className={`flex justify-center ${isLeft ? 'md:justify-start' : 'md:justify-end'}`}>
                  <div className="w-full sm:w-11/12 md:w-2/3 lg:w-1/2">
                    <NodeCard node={node} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {nodes.length === 0 && (
          <div className="text-center py-12 text-gray-500 text-sm sm:text-base">No nodes found for this skill.</div>
        )}
      </div>
    </div>
  );
}
