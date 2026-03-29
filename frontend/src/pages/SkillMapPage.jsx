import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useSkillMap } from '../context/SkillMapContext';
import Sidebar from '../components/Sidebar';
import SkillList from '../components/SkillList';
import ProgressionPathGamefied from '../components/ProgressionPathGamefied';

export default function SkillMapPage() {
  const { skillId } = useParams();
  const { loadSkills, isLoading, error } = useSkillMap();

  useEffect(() => {
    loadSkills();
  }, [loadSkills]);

  if (skillId) {
    return (
      <div className="flex min-h-screen bg-[#8BC34A]">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <ProgressionPathGamefied />
        </main>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-site-bg">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-site-accent mx-auto mb-4" />
                <p className="text-gray-600">Loading skills...</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen bg-site-bg">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="bg-red-50 border border-red-300 text-red-700 p-4 rounded-lg">
              <p>{error}</p>
              <button type="button" onClick={() => loadSkills()} className="mt-2 text-sm underline hover:no-underline">
                Try again
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-site-bg">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <SkillList />
        </div>
      </main>
    </div>
  );
}
