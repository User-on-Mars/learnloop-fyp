import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import DashboardGreeting from "../components/DashboardGreeting";
import SkillProgressCard from "../components/SkillProgressCard";
import TodayActivityCard from "../components/TodayActivityCard";
import WeeklyPerformanceChart from "../components/WeeklyPerformanceChart";

export default function Dashboard() {
  const navigate = useNavigate();
  
  // Mock data state - will be replaced with API calls
  const [dashboardData, setDashboardData] = useState({
    progress: {
      overallProgress: 75,
      completedSkills: 12,
      totalSkills: 9,
      totalHoursLogged: 0
    },
    todayActivity: {
      minutesPracticed: 150,
      notesAdded: 5
    },
    weeklyData: [],
    reflections: [],
    blockers: []
  });
  
  const [isLoading] = useState(false);

  // Quick action handlers
  const handleLogPractice = () => {
    navigate('/log-practice');
  };

  const handleAddReflection = () => {
    console.log("Add Reflection clicked");
    // TODO: Navigate to reflection page or open modal
  };

  const handleLogBlocker = () => {
    console.log("Log Blocker clicked");
    // TODO: Navigate to blocker page or open modal
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar Navigation */}
      <Sidebar />
      
      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto w-full">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          {/* Header Section with Personalized Greeting and Quick Actions */}
          <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <DashboardGreeting />
            
            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2 sm:gap-3">
              <button
                onClick={handleLogPractice}
                className="flex items-center gap-2 px-4 py-2 bg-ll-600 text-white rounded-lg font-medium hover:bg-ll-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Log Practice</span>
              </button>
              
              <button
                onClick={handleAddReflection}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>Add Reflection</span>
              </button>
              
              <button
                onClick={handleLogBlocker}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>Log Blocker</span>
              </button>
            </div>
          </div>
          
          {/* Top Row: Skill Progress and Today's Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
            <SkillProgressCard
              progress={dashboardData.progress.overallProgress}
              completedSkills={dashboardData.progress.completedSkills}
              totalSkills={dashboardData.progress.totalSkills}
              hoursLogged={dashboardData.progress.totalHoursLogged}
              isLoading={isLoading}
            />
            
            <TodayActivityCard
              minutesPracticed={dashboardData.todayActivity.minutesPracticed}
              notesAdded={dashboardData.todayActivity.notesAdded}
              isLoading={isLoading}
            />
          </div>

          {/* Second Row: Recent Reflections and Blockers Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
            {/* Recent Reflections Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Recent Reflections</h3>
              
              <div className="space-y-4">
                {/* Reflection Item 1 */}
                <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                  <div className="w-2 h-2 rounded-full bg-ll-600 mt-2 flex-shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 mb-1">Understanding React Hooks</h4>
                    <p className="text-xs text-gray-600 line-clamp-2">
                      Spent an hour today refactoring an old class component into functions...
                    </p>
                    <p className="text-xs text-gray-500 mt-1">2 hours ago</p>
                  </div>
                </div>

                {/* Reflection Item 2 */}
                <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                  <div className="w-2 h-2 rounded-full bg-ll-600 mt-2 flex-shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 mb-1">Struggling with CSS Grid Layouts</h4>
                    <p className="text-xs text-gray-600 line-clamp-2">
                      Trying to implement a complex responsive grid layout but facing issues...
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Yesterday</p>
                  </div>
                </div>

                {/* Reflection Item 3 */}
                <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                  <div className="w-2 h-2 rounded-full bg-ll-600 mt-2 flex-shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 mb-1">First successful deployment!</h4>
                    <p className="text-xs text-gray-600 line-clamp-2">
                      Finally deployed my personal portfolio website to Vercel. The entire...
                    </p>
                    <p className="text-xs text-gray-500 mt-1">2 days ago</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Blockers Summary Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Blockers Summary</h3>
              
              <div className="space-y-3">
                {/* Blocker Item 1 */}
                <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span className="text-sm text-gray-900 truncate">Difficulty with advanced TypeScript generics</span>
                  </div>
                  <span className="px-2 py-1 text-xs font-medium text-white bg-red-500 rounded-full flex-shrink-0">High</span>
                </div>

                {/* Blocker Item 2 */}
                <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <svg className="w-5 h-5 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span className="text-sm text-gray-900 truncate">Time management for personal projects</span>
                  </div>
                  <span className="px-2 py-1 text-xs font-medium text-gray-700 bg-gray-200 rounded-full flex-shrink-0">Medium</span>
                </div>

                {/* Blocker Item 3 */}
                <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span className="text-sm text-gray-900 truncate">Understanding WebGL fundamentals</span>
                  </div>
                  <span className="px-2 py-1 text-xs font-medium text-white bg-red-500 rounded-full flex-shrink-0">High</span>
                </div>
              </div>
            </div>
          </div>

          {/* Weekly Performance Chart */}
          <WeeklyPerformanceChart 
            weeklyData={dashboardData.weeklyData}
            isLoading={isLoading}
          />
        </div>
      </main>
    </div>
  );
}
