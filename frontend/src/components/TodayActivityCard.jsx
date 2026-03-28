import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, FileText, Flame, Target, TrendingUp, Play } from 'lucide-react';
import { useActiveSessions } from '../context/ActiveSessionContext';

export default function TodayActivityCard({ 
    minutesPracticed = 0, 
    notesAdded = 0,
    isLoading = false 
}) {
    const navigate = useNavigate();
    const { activeSessions, formatTimer } = useActiveSessions();
    const [hoveredStat, setHoveredStat] = useState(null);
    
    // Format minutes to hours and minutes
    const formatTime = (minutes) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours > 0 && mins > 0) {
            return `${hours}h ${mins}m`;
        } else if (hours > 0) {
            return `${hours}h`;
        } else {
            return `${mins}m`;
        }
    };

    // Calculate streak (mock - you can connect to real data)
    const streak = minutesPracticed > 0 ? Math.max(1, Math.floor(minutesPracticed / 30)) : 0;
    
    // Daily goal progress (assuming 60 min daily goal)
    const dailyGoal = 60;
    const goalProgress = Math.min(100, Math.round((minutesPracticed / dailyGoal) * 100));

    if (isLoading) {
        return (
            <div className="bg-site-surface rounded-xl shadow-md border border-site-border p-6">
                <h3 className="text-xl font-bold text-site-ink mb-6">Today's Activity</h3>
                <div className="grid grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="flex flex-col items-center p-4">
                            <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse mb-3"></div>
                            <div className="h-6 w-16 bg-gray-200 rounded animate-pulse mb-2"></div>
                            <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    const stats = [
        {
            id: 'time',
            icon: Clock,
            value: formatTime(minutesPracticed),
            label: 'Time Today',
            bgColor: 'bg-site-soft',
            textColor: 'text-site-accent',
            hoverBg: 'hover:bg-site-soft/90'
        },
        {
            id: 'notes',
            icon: FileText,
            value: notesAdded,
            label: 'Notes Added',
            bgColor: 'bg-site-bg',
            textColor: 'text-site-accent',
            hoverBg: 'hover:bg-site-soft/50'
        },
        {
            id: 'streak',
            icon: Flame,
            value: streak,
            label: 'Day Streak',
            bgColor: 'bg-site-soft',
            textColor: 'text-site-accent',
            hoverBg: 'hover:bg-site-soft/90'
        },
        {
            id: 'goal',
            icon: Target,
            value: `${goalProgress}%`,
            label: 'Daily Goal',
            bgColor: 'bg-site-bg',
            textColor: 'text-site-accent',
            hoverBg: 'hover:bg-site-soft/50'
        }
    ];

    return (
        <div className="bg-site-surface rounded-xl shadow-md border border-site-border p-6 hover:shadow-lg transition-shadow duration-200">
            <div className="flex items-center justify-between mb-5">
                <h3 className="text-xl font-bold text-site-ink">Today's Activity</h3>
                {minutesPracticed > 0 && (
                    <span className="flex items-center gap-1 text-sm text-site-accent font-medium">
                        <TrendingUp className="w-4 h-4" />
                        Active
                    </span>
                )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3 mb-5">
                {stats.map((stat) => {
                    const Icon = stat.icon;
                    const isHovered = hoveredStat === stat.id;
                    
                    return (
                        <div
                            key={stat.id}
                            onMouseEnter={() => setHoveredStat(stat.id)}
                            onMouseLeave={() => setHoveredStat(null)}
                            className={`relative p-4 rounded-xl ${stat.bgColor} ${stat.hoverBg} transition-all duration-200 cursor-pointer ${
                                isHovered ? 'scale-105 shadow-md' : ''
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-site-surface flex items-center justify-center shadow-sm border border-site-border">
                                    <Icon className={`w-5 h-5 ${stat.textColor}`} />
                                </div>
                                <div>
                                    <div className={`text-2xl font-bold ${stat.textColor}`}>
                                        {stat.value}
                                    </div>
                                    <div className="text-xs text-site-muted">{stat.label}</div>
                                </div>
                            </div>
                            
                            {/* Animated indicator for goal */}
                            {stat.id === 'goal' && (
                                <div className="mt-2 h-1.5 bg-site-bg rounded-full overflow-hidden border border-site-border">
                                    <div 
                                        className="h-full bg-site-accent rounded-full transition-all duration-500"
                                        style={{ width: `${goalProgress}%` }}
                                    />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Active Sessions Preview */}
            {activeSessions.length > 0 && (
                <div className="border-t border-site-border pt-4 mb-4">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-site-muted">Active Sessions</span>
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                            {activeSessions.filter(s => s.isRunning).length} running
                        </span>
                    </div>
                    <div className="space-y-2">
                        {activeSessions.slice(0, 2).map(session => (
                            <div 
                                key={session.id}
                                className="flex items-center justify-between p-2 bg-site-bg rounded-lg border border-site-border"
                            >
                                <div className="flex items-center gap-2">
                                    {session.isRunning ? (
                                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                    ) : (
                                        <span className="w-2 h-2 bg-gray-400 rounded-full" />
                                    )}
                                    <span className="text-sm font-medium text-site-ink truncate max-w-[120px]">
                                        {session.skillName}
                                    </span>
                                </div>
                                <span className="text-sm font-mono text-site-accent">
                                    {formatTimer(session.timer)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Quick Action */}
            <button 
                onClick={() => navigate('/log-practice')}
                className="w-full flex items-center justify-center gap-2 py-3 bg-site-accent text-white rounded-lg font-medium hover:bg-site-accent-hover transition-colors"
            >
                <Play className="w-4 h-4" />
                {activeSessions.length > 0 ? 'View Sessions' : 'Start Practice'}
            </button>
        </div>
    );
}
