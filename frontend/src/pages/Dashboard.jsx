import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, BookOpen, AlertTriangle, ChevronRight, Zap, Award, Calendar } from "lucide-react";
import { practiceAPI } from "../services/api";
import Sidebar from "../components/Sidebar";
import DashboardGreeting from "../components/DashboardGreeting";
import SkillProgressCard from "../components/SkillProgressCard";
import TodayActivityCard from "../components/TodayActivityCard";
import WeeklyPerformanceChart from "../components/WeeklyPerformanceChart";

export default function Dashboard() {
    const navigate = useNavigate();
    
    const [dashboardData, setDashboardData] = useState({
        progress: {
            overallProgress: 0,
            completedSkills: 0,
            totalSkills: 15,
            totalHoursLogged: 0
        },
        todayActivity: {
            minutesPracticed: 0,
            notesAdded: 0
        },
        recentPractices: [],
        topSkills: [],
        weeklyData: [],
    });
    
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchDashboardData = async () => {
        try {
            setIsLoading(true);
            
            const [statsResponse, practicesResponse, weeklyResponse] = await Promise.all([
                practiceAPI.getStats().catch(() => ({ 
                    data: { summary: { totalMinutes: 0, totalSessions: 0 }, topSkills: [], recentSessions: [] } 
                })),
                practiceAPI.getPractices({ limit: 10 }).catch(() => ({ data: { practices: [] } })),
                practiceAPI.getWeeklyStats(12).catch(() => ({ data: { weeklyData: [] } }))
            ]);

            const stats = statsResponse.data;
            const practices = practicesResponse.data.practices || [];
            const weeklyData = weeklyResponse.data.weeklyData || [];

            // Calculate today's activity
            const today = new Date().toDateString();
            const todayPractices = practices.filter(p => 
                new Date(p.date).toDateString() === today
            );
            const todayMinutes = todayPractices.reduce((sum, p) => sum + p.minutesPracticed, 0);

            setDashboardData({
                progress: {
                    overallProgress: Math.min(Math.round((stats.summary.totalMinutes / 1000) * 100), 100) || 0,
                    completedSkills: stats.topSkills?.length || 0,
                    totalSkills: Math.max(stats.topSkills?.length || 0, 15),
                    totalHoursLogged: Math.round(stats.summary.totalMinutes / 60) || 0
                },
                todayActivity: {
                    minutesPracticed: todayMinutes,
                    notesAdded: todayPractices.filter(p => p.notes && p.notes.trim()).length
                },
                recentPractices: practices.slice(0, 5),
                topSkills: stats.topSkills || [],
                weeklyData: weeklyData
            });
        } catch (err) {
            console.error('Error fetching dashboard data:', err);
            setError('Failed to load dashboard data');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    // Refresh when page becomes visible
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (!document.hidden) {
                fetchDashboardData();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
        <div className="flex min-h-screen bg-gray-50">
            <Sidebar />
            
            <main className="flex-1 overflow-y-auto w-full">
                <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
                    
                    {/* Header */}
                    <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <DashboardGreeting />
                        
                        {/* Quick Actions */}
                        <div className="flex flex-wrap gap-2 sm:gap-3">
                            <button
                                onClick={() => navigate('/log-practice')}
                                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-all shadow-md hover:shadow-lg text-sm"
                            >
                                <Clock className="w-5 h-5" />
                                <span>Log Practice</span>
                            </button>
                        </div>
                    </div>

                    {/* Quick Stats Bar */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                                    <Clock className="w-5 h-5 text-indigo-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-gray-900">{dashboardData.progress.totalHoursLogged}h</p>
                                    <p className="text-xs text-gray-500">Total Hours</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                                    <Zap className="w-5 h-5 text-emerald-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-gray-900">{dashboardData.recentPractices.length}</p>
                                    <p className="text-xs text-gray-500">Sessions</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center">
                                    <Award className="w-5 h-5 text-violet-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-gray-900">{dashboardData.topSkills.length}</p>
                                    <p className="text-xs text-gray-500">Skills</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                                    <Calendar className="w-5 h-5 text-orange-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-gray-900">{dashboardData.progress.overallProgress}%</p>
                                    <p className="text-xs text-gray-500">Progress</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Main Content Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
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

                    {/* Recent Activity & Top Skills */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
                        
                        {/* Recent Practice Sessions */}
                        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4 sm:p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-gray-900">Recent Sessions</h3>
                                <button 
                                    onClick={() => navigate('/log-practice')}
                                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                                >
                                    View all
                                </button>
                            </div>
                            
                            {dashboardData.recentPractices.length === 0 ? (
                                <div className="text-center py-8">
                                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <Clock className="w-8 h-8 text-gray-400" />
                                    </div>
                                    <p className="text-gray-500 mb-3">No practice sessions yet</p>
                                    <button
                                        onClick={() => navigate('/log-practice')}
                                        className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                                    >
                                        Start your first session →
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {dashboardData.recentPractices.map((practice) => (
                                        <div 
                                            key={practice._id}
                                            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group"
                                            onClick={() => navigate('/log-practice')}
                                        >
                                            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                                                <span className="text-indigo-600 font-semibold text-sm">
                                                    {practice.skillName?.charAt(0).toUpperCase()}
                                                </span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 truncate">
                                                    {practice.skillName}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {practice.minutesPracticed} min • {formatDate(practice.date)}
                                                </p>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 transition-colors" />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Top Skills */}
                        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4 sm:p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-gray-900">Top Skills</h3>
                                <span className="text-xs text-gray-500">By time spent</span>
                            </div>
                            
                            {dashboardData.topSkills.length === 0 ? (
                                <div className="text-center py-8">
                                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <Award className="w-8 h-8 text-gray-400" />
                                    </div>
                                    <p className="text-gray-500">Start practicing to see your top skills</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {dashboardData.topSkills.slice(0, 5).map((skill, index) => {
                                        const maxMinutes = dashboardData.topSkills[0]?.totalMinutes || 1;
                                        const percentage = Math.round((skill.totalMinutes / maxMinutes) * 100);
                                        const colors = ['indigo', 'emerald', 'violet', 'orange', 'pink'];
                                        const color = colors[index % colors.length];
                                        
                                        return (
                                            <div key={skill._id} className="group">
                                                <div className="flex items-center justify-between mb-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`w-2 h-2 rounded-full bg-${color}-500`}></span>
                                                        <span className="text-sm font-medium text-gray-900">{skill._id}</span>
                                                    </div>
                                                    <span className="text-xs text-gray-500">
                                                        {Math.round(skill.totalMinutes / 60)}h {skill.totalMinutes % 60}m
                                                    </span>
                                                </div>
                                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                                    <div 
                                                        className={`h-full bg-${color}-500 rounded-full transition-all duration-500 group-hover:opacity-80`}
                                                        style={{ width: `${percentage}%` }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Weekly Performance Chart */}
                    <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4 sm:p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Weekly Performance</h3>
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
