import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, BookOpen, AlertTriangle, ChevronDown } from "lucide-react";
import { practiceAPI } from "../services/api";
import Sidebar from "../components/Sidebar";
import DashboardGreeting from "../components/DashboardGreeting";
import SkillProgressCard from "../components/SkillProgressCard";
import TodayActivityCard from "../components/TodayActivityCard";
import WeeklyPerformanceChart from "../components/WeeklyPerformanceChart";

export default function Dashboard() {
    const navigate = useNavigate();
    
    // State for dashboard data
    const [dashboardData, setDashboardData] = useState({
        progress: {
            overallProgress: 75,
            completedSkills: 12,
            totalSkills: 15,
            totalHoursLogged: 45
        },
        todayActivity: {
            minutesPracticed: 150,
            notesAdded: 5
        },
        reflections: [
            { id: 1, title: "Understanding React Hooks", snippet: "Spent an hour today refactoring an old class component into functions...", time: "2 hours ago" },
            { id: 2, title: "Struggling with CSS Grid Layouts", snippet: "Trying to implement a complex responsive grid layout but facing issues...", time: "Yesterday" },
            { id: 3, title: "First successful deployment!", snippet: "Finally deployed my personal portfolio website to Vercel. The entire...", time: "2 days ago" },
        ],
        blockers: [
            { id: 1, title: "Difficulty with advanced TypeScript generics", priority: "High" },
            { id: 2, title: "Time management for personal projects", priority: "Medium" },
            { id: 3, title: "Understanding WebGL fundamentals", priority: "High" },
        ],
        weeklyData: [], // Placeholder for chart data
    });
    
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    // Function to fetch dashboard data
    const fetchDashboardData = async () => {
            try {
                setIsLoading(true);
                
                console.log('Fetching dashboard data...');
                const [statsResponse, practicesResponse, weeklyResponse] = await Promise.all([
                    practiceAPI.getStats().catch(err => {
                        console.log('Stats API error:', err);
                        return { data: { summary: { totalMinutes: 0, totalSessions: 0, weeklyMinutes: 0, monthlyMinutes: 0, yearlyMinutes: 0 }, topSkills: [], recentSessions: [] } };
                    }),
                    practiceAPI.getPractices({ limit: 5 }).catch(err => {
                        console.log('Practices API error:', err);
                        return { data: { practices: [] } };
                    }),
                    practiceAPI.getWeeklyStats(12).catch(err => {
                        console.log('Weekly stats API error:', err);
                        return { data: { weeklyData: [] } };
                    })
                ]);

                console.log('Dashboard API responses:', { statsResponse, practicesResponse, weeklyResponse });

                const stats = statsResponse.data;
                const practices = practicesResponse.data.practices;
                const weeklyData = weeklyResponse.data.weeklyData;

                // Calculate today's activity
                const today = new Date().toDateString();
                const todayPractices = practices.filter(p => 
                    new Date(p.date).toDateString() === today
                );
                const todayMinutes = todayPractices.reduce((sum, p) => sum + p.minutesPracticed, 0);

                setDashboardData({
                    progress: {
                        overallProgress: Math.min(Math.round((stats.summary.totalMinutes / 1000) * 100), 100) || 0,
                        completedSkills: stats.topSkills.length || 0,
                        totalSkills: Math.max(stats.topSkills.length, 15) || 15,
                        totalHoursLogged: Math.round(stats.summary.totalMinutes / 60) || 0
                    },
                    todayActivity: {
                        minutesPracticed: todayMinutes,
                        notesAdded: todayPractices.filter(p => p.notes && p.notes.trim()).length
                    },
                    reflections: practices.length > 0 ? practices.slice(0, 3).map(p => ({
                        id: p._id,
                        title: `Practiced ${p.skillName}`,
                        snippet: p.notes || `Practiced for ${p.minutesPracticed} minutes with tags: ${p.tags.join(', ')}`,
                        time: new Date(p.date).toLocaleDateString()
                    })) : [
                        { id: 1, title: "No practice sessions yet", snippet: "Start logging your practice sessions to see them here!", time: "Now" }
                    ],
                    blockers: [
                        { id: 1, title: "Difficulty with advanced TypeScript generics", priority: "High" },
                        { id: 2, title: "Time management for personal projects", priority: "Medium" },
                        { id: 3, title: "Understanding WebGL fundamentals", priority: "High" },
                    ],
                    weeklyData: weeklyData || []
                });
            } catch (err) {
                console.error('Error fetching dashboard data:', err);
                setError('Failed to load dashboard data');
            } finally {
                setIsLoading(false);
            }
    };

    // Fetch dashboard data on component mount and when returning from other pages
    useEffect(() => {
        fetchDashboardData();
    }, []);

    // Refresh data when the page becomes visible (user returns from another page)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (!document.hidden) {
                fetchDashboardData();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    // Quick action handlers - Functional logic is preserved
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

    // Helper to map priority to Tailwind colors (Using Red for High, Yellow/Gray for Medium/Low)
    const getPriorityStyles = (priority) => {
        switch (priority) {
            case 'High':
                return { text: 'text-white', bg: 'bg-red-600', border: 'border-red-600' };
            case 'Medium':
                return { text: 'text-yellow-900', bg: 'bg-yellow-300', border: 'border-yellow-300' };
            case 'Low':
                return { text: 'text-gray-700', bg: 'bg-gray-200', border: 'border-gray-200' };
            default:
                return { text: 'text-gray-700', bg: 'bg-gray-200', border: 'border-gray-200' };
        }
    };

    if (isLoading) {
        return (
            <div className="flex min-h-screen bg-gray-50">
                <Sidebar />
                <main className="flex-1 overflow-y-auto">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                        <div className="flex items-center justify-center h-64">
                            <div className="text-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                                <p className="text-gray-600">Loading dashboard...</p>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex min-h-screen bg-gray-50">
                <Sidebar />
                <main className="flex-1 overflow-y-auto">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                        <div className="bg-red-50 border border-red-300 text-red-700 p-4 rounded-lg">
                            <p>{error}</p>
                            <button 
                                onClick={() => window.location.reload()} 
                                className="mt-2 text-sm underline hover:no-underline"
                            >
                                Try again
                            </button>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    return (
        // Main Background is light gray
        <div className="flex min-h-screen bg-gray-50">
            {/* Sidebar Navigation (Preserved) */}
            <Sidebar />
            
            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto w-full">
                <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
                    
                    {/* Header Section with Personalized Greeting and Quick Actions */}
                    <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <DashboardGreeting /> {/* Component Preserved */}
                            <button
                                onClick={fetchDashboardData}
                                disabled={isLoading}
                                className="flex items-center gap-1 px-3 py-1 text-gray-600 hover:text-indigo-600 transition-colors text-sm disabled:opacity-50"
                                title="Refresh data"
                            >
                                <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Refresh
                            </button>
                        </div>
                        
                        {/* Quick Actions - Primary Indigo styling */}
                        <div className="flex flex-wrap gap-2 sm:gap-3">
                            <button
                                onClick={handleLogPractice}
                                // Primary Button: Indigo BG
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-md text-sm"
                            >
                                <Clock className="w-5 h-5" />
                                <span>Log Practice</span>
                            </button>
                            
                            <button
                                onClick={handleAddReflection}
                                // Secondary Button: White BG, Gray Border, Indigo Text on hover
                                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-100 hover:text-indigo-600 transition-colors shadow-sm text-sm"
                            >
                                <BookOpen className="w-5 h-5" />
                                <span>Add Reflection</span>
                            </button>
                            
                            <button
                                onClick={handleLogBlocker}
                                // Secondary Button: White BG, Gray Border, Indigo Text on hover
                                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-100 hover:text-indigo-600 transition-colors shadow-sm text-sm"
                            >
                                <AlertTriangle className="w-5 h-5" />
                                <span>Log Blocker</span>
                            </button>
                        </div>
                    </div>
                    
                    {/* Top Row: Skill Progress and Today's Activity (Components Preserved) */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
                        <SkillProgressCard
                            // Props Preserved. Card styling relies on internal component styling.
                            progress={dashboardData.progress.overallProgress}
                            completedSkills={dashboardData.progress.completedSkills}
                            totalSkills={dashboardData.progress.totalSkills}
                            hoursLogged={dashboardData.progress.totalHoursLogged}
                            isLoading={isLoading}
                        />
                        
                        <TodayActivityCard
                            // Props Preserved. Card styling relies on internal component styling.
                            minutesPracticed={dashboardData.todayActivity.minutesPracticed}
                            notesAdded={dashboardData.todayActivity.notesAdded}
                            isLoading={isLoading}
                        />
                    </div>

                    {/* Second Row: Recent Reflections and Blockers Summary - Styled as clean cards */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
                        
                        {/* Recent Reflections Card */}
                        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4 sm:p-6">
                            <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">
                                Recent Reflections
                            </h3>
                            
                            <div className="space-y-4">
                                {dashboardData.reflections.map((item) => (
                                    <div 
                                        key={item.id}
                                        // Subtle Indigo hover effect for interactivity
                                        className="flex items-start gap-3 p-3 rounded-lg hover:bg-indigo-50/50 transition-colors cursor-pointer border border-transparent hover:border-indigo-200"
                                    >
                                        {/* Indigo Bullet */}
                                        <div className="w-2 h-2 rounded-full bg-indigo-600 mt-2 flex-shrink-0 shadow-sm"></div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-semibold text-gray-900 mb-0.5">{item.title}</h4>
                                            <p className="text-xs text-gray-600 line-clamp-2">
                                                {item.snippet}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-1">{item.time}</p>
                                        </div>
                                        <ChevronDown className="w-4 h-4 text-gray-400 rotate-[-90deg] flex-shrink-0 mt-1" />
                                    </div>
                                ))}
                            </div>
                            
                            {/* View All link - Primary Indigo text */}
                            <div className="mt-4 pt-4 border-t border-gray-100">
                                <button className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors">
                                    View all reflections →
                                </button>
                            </div>
                        </div>

                        {/* Blockers Summary Card */}
                        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4 sm:p-6">
                            <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">
                                Blockers Summary
                            </h3>
                            
                            <div className="space-y-3">
                                {dashboardData.blockers.map((item) => {
                                    const styles = getPriorityStyles(item.priority);
                                    return (
                                        <div 
                                            key={item.id}
                                            className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:shadow-sm transition-shadow"
                                        >
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                {/* Red icon for High priority, Gray otherwise */}
                                                <AlertTriangle className={`w-5 h-5 ${item.priority === 'High' ? 'text-red-500' : 'text-gray-500'} flex-shrink-0`} />
                                                <span className="text-sm text-gray-900 truncate font-medium">{item.title}</span>
                                            </div>
                                            {/* Priority Tag with consistent color mapping */}
                                            <span 
                                                className={`px-3 py-1 text-xs font-semibold ${styles.text} ${styles.bg} rounded-full flex-shrink-0 shadow-sm`}
                                            >
                                                {item.priority}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* View All link - Primary Indigo text */}
                            <div className="mt-4 pt-4 border-t border-gray-100">
                                <button className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors">
                                    Manage all blockers →
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Weekly Performance Chart (Component Preserved) */}
                    <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4 sm:p-6">
                        <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">
                            Weekly Performance
                        </h3>
                        <WeeklyPerformanceChart 
                            weeklyData={dashboardData.weeklyData}
                            isLoading={isLoading}
                        />
                    </div>
                </div>
            </main>
        </div>
    );
}