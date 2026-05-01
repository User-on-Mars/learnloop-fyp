import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useSkillMap } from '../context/SkillMapContext';
import SkillList from '../components/SkillList';
import ProgressionPathGamefied from '../components/ProgressionPathGamefied';

export default function SkillMapPage() {
  const { skillId } = useParams();
  const { loadSkills, isLoading, error } = useSkillMap();

  useEffect(() => {
    loadSkills();
  }, [loadSkills]);

  // Skill detail view
  if (skillId) {
    return <ProgressionPathGamefied />;
  }

  if (isLoading) {
    return (
      <div className="px-4 sm:px-6 py-6 lg:py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-3 border-[#2e5023] border-t-transparent mx-auto mb-4" />
            <p className="text-sm text-[#9aa094]">Loading skill maps...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 sm:px-6 py-6 lg:py-8">
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm">
          <p className="font-medium">{error}</p>
          <button type="button" onClick={() => loadSkills()} className="mt-2 text-xs text-red-500 underline hover:no-underline">Try again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 py-6 lg:py-8">
      <SkillList />
    </div>
  );
}
