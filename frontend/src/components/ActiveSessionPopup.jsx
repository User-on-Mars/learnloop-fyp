import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useActiveSessions } from '../context/ActiveSessionContext';
import { auth } from '../firebase';
import { Play, Pause, X, ChevronUp, ChevronDown, Clock, Volume2, VolumeX } from 'lucide-react';

export default function ActiveSessionPopup() {
    const navigate = useNavigate();
    const location = useLocation();
    const user = auth.currentUser;
    const { 
        activeSessions, 
        toggleSession, 
        removeSession,
        formatTimer, 
        getProgress,
        soundEnabled,
        setSoundEnabled,
        testSound
    } = useActiveSessions();
    
    const [isExpanded, setIsExpanded] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);

    // Don't show if not logged in, on log-practice page, or no sessions
    if (!user || location.pathname === '/log-practice' || activeSessions.length === 0) {
        return null;
    }

    // Don't show on auth pages
    const authPages = ['/login', '/signup', '/forgot', '/'];
    if (authPages.includes(location.pathname)) {
        return null;
    }

    const runningSessions = activeSessions.filter(s => s.isRunning);
    const primarySession = runningSessions[0] || activeSessions[0];

    const handleSoundToggle = (e) => {
        e.stopPropagation();
        const newValue = !soundEnabled;
        setSoundEnabled(newValue);
        if (newValue) {
            testSound();
        }
    };

    if (isMinimized) {
        return (
            <button
                onClick={() => setIsMinimized(false)}
                className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-all"
            >
                <Clock className="w-5 h-5" />
                <span className="font-mono font-bold">{formatTimer(primarySession.timer)}</span>
                {runningSessions.length > 0 && (
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                )}
            </button>
        );
    }

    return (
        <div className="fixed bottom-4 right-4 z-50 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
            {/* Header */}
            <div 
                className="flex items-center justify-between px-4 py-3 bg-indigo-600 text-white cursor-pointer"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    <span className="font-semibold">Active Sessions</span>
                    <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs">
                        {activeSessions.length}
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    {/* Sound Toggle */}
                    <button
                        onClick={handleSoundToggle}
                        className="p-1 hover:bg-white/20 rounded"
                        title={soundEnabled ? 'Sound on' : 'Sound off'}
                    >
                        {soundEnabled ? (
                            <Volume2 className="w-4 h-4" />
                        ) : (
                            <VolumeX className="w-4 h-4 opacity-60" />
                        )}
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsMinimized(true); }}
                        className="p-1 hover:bg-white/20 rounded"
                    >
                        <ChevronDown className="w-4 h-4" />
                    </button>
                    {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                    ) : (
                        <ChevronDown className="w-4 h-4" />
                    )}
                </div>
            </div>

            {/* Primary Session */}
            <div className="p-4 border-b border-gray-100">
                <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900 truncate flex-1">
                        {primarySession.skillName}
                    </h4>
                    {primarySession.isRunning && (
                        <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                            Running
                        </span>
                    )}
                </div>

                {/* Progress Bar */}
                {primarySession.isCountdown && (
                    <div className="w-full h-2 bg-gray-100 rounded-full mb-3 overflow-hidden">
                        <div 
                            className="h-full bg-indigo-600 rounded-full transition-all duration-1000"
                            style={{ width: `${getProgress(primarySession)}%` }}
                        />
                    </div>
                )}

                {/* Timer */}
                <div className={`text-3xl font-bold font-mono text-center mb-3 ${
                    primarySession.isCountdown && primarySession.timer <= 0 
                        ? 'text-red-600' 
                        : 'text-indigo-600'
                }`}>
                    {formatTimer(primarySession.timer)}
                </div>

                {primarySession.isCountdown && primarySession.timer <= 0 && (
                    <p className="text-center text-red-600 text-sm font-medium mb-2">Time's up! 🎉</p>
                )}

                {/* Controls */}
                <div className="flex gap-2">
                    <button
                        onClick={() => toggleSession(primarySession.id)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-medium text-sm transition-colors ${
                            primarySession.isRunning
                                ? 'bg-gray-600 text-white hover:bg-gray-700'
                                : 'bg-indigo-600 text-white hover:bg-indigo-700'
                        }`}
                    >
                        {primarySession.isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        {primarySession.isRunning ? 'Pause' : 'Resume'}
                    </button>
                    <button
                        onClick={() => navigate('/log-practice')}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium text-sm hover:bg-green-700 transition-colors"
                    >
                        View All
                    </button>
                </div>
            </div>

            {/* Expanded List */}
            {isExpanded && activeSessions.length > 1 && (
                <div className="max-h-48 overflow-y-auto">
                    {activeSessions.slice(1).map(session => (
                        <div 
                            key={session.id} 
                            className="flex items-center justify-between px-4 py-3 border-b border-gray-50 hover:bg-gray-50"
                        >
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                    {session.skillName}
                                </p>
                                <p className="text-xs text-gray-500 font-mono">
                                    {formatTimer(session.timer)}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                {session.isRunning && (
                                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                )}
                                <button
                                    onClick={() => toggleSession(session.id)}
                                    className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                                >
                                    {session.isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                </button>
                                <button
                                    onClick={() => removeSession(session.id)}
                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
