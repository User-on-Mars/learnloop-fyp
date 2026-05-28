import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useActiveSessions } from '../context/ActiveSessionContext';
import { auth } from '../firebase';
import { X, Clock, AlarmClock } from 'lucide-react';

const MINI_SESSION_KEY = 'miniPopupSessionId';

const isSameSession = (session, sessionId) => {
    if (sessionId === null || sessionId === undefined) return false;
    return (
        session?.id === sessionId ||
        session?._id === sessionId ||
        String(session?.id) === String(sessionId) ||
        String(session?._id) === String(sessionId)
    );
};

export default function ActiveSessionPopup() {
    const navigate = useNavigate();
    const location = useLocation();
    const user = auth.currentUser;
    const {
        activeSessions,
        toggleSession,
        formatTimer,
        getProgress,
        completedSessionNotice,
        clearCompletedSessionNotice,
    } = useActiveSessions();
    
    // Track the single session shown in mini popup (persisted in localStorage)
    const [miniSessionId, setMiniSessionId] = useState(() => localStorage.getItem(MINI_SESSION_KEY) || null);
    const prevCountRef = useRef(activeSessions.length);

    // When a NEW session is added (count increases), auto-set it as the mini popup session
    useEffect(() => {
        if (activeSessions.length > prevCountRef.current) {
            // Newest session is the last one added
            const newest = activeSessions[activeSessions.length - 1];
            if (newest) {
                const id = String(newest.id);
                setMiniSessionId(id);
                localStorage.setItem(MINI_SESSION_KEY, id);
            }
        }
        prevCountRef.current = activeSessions.length;
    }, [activeSessions.length, activeSessions]);

    // Clear mini session if it no longer exists in active sessions
    useEffect(() => {
        if (miniSessionId) {
            const exists = activeSessions.some(s => String(s.id) === miniSessionId);
            if (!exists) {
                setMiniSessionId(null);
                localStorage.removeItem(MINI_SESSION_KEY);
            }
        }
    }, [activeSessions, miniSessionId]);

    // The one session to show — prefer miniSessionId, fallback to any running free practice session
    const primarySession = (() => {
        if (miniSessionId) {
            const found = activeSessions.find(s => String(s.id) === miniSessionId);
            if (found) return found;
        }
        // Fallback: pick any running session (prefer free practice)
        const runningFree = activeSessions.find(s => s.isRunning && !s.skillId && !s.nodeId);
        if (runningFree) return runningFree;
        const runningAny = activeSessions.find(s => s.isRunning);
        return runningAny || null;
    })();

    useEffect(() => {
        if (!completedSessionNotice) return;
        const stillActive = activeSessions.some(session =>
            isSameSession(session, completedSessionNotice.id) ||
            isSameSession(session, completedSessionNotice._id)
        );
        if (!stillActive) {
            clearCompletedSessionNotice?.();
        }
    }, [activeSessions, clearCompletedSessionNotice, completedSessionNotice]);

    const handleDismiss = useCallback((e) => {
        e.stopPropagation();
        if (primarySession?.isRunning) toggleSession(primarySession.id);
        setMiniSessionId(null);
        localStorage.removeItem(MINI_SESSION_KEY);
    }, [primarySession, toggleSession]);

    const getSessionPath = useCallback((session) => {
        if (!session) return null;
        const sid = session.skillId;
        const nid = session.nodeId;
        if (session.roomId && session.roomSkillMapId) {
            return `/roomspace/${session.roomId}/skill-maps/${session.roomSkillMapId}/nodes/${nid}`;
        }
        if (sid && nid) {
            return `/skills/${sid}/nodes/${nid}`;
        }
        return '/log-practice';
    }, []);

    const handleNavigate = useCallback(() => {
        if (!primarySession) return;
        const path = getSessionPath(primarySession);
        if (path) {
            navigate(path);
            return;
        }
        const sid = primarySession.skillId;
        const nid = primarySession.nodeId;
        // Room session — navigate to room node detail
        if (primarySession.roomId && primarySession.roomSkillMapId) {
            navigate(`/roomspace/${primarySession.roomId}/skill-maps/${primarySession.roomSkillMapId}/nodes/${nid}`);
            return;
        }
        if (sid && nid) {
            navigate(`/skills/${sid}/nodes/${nid}`);
        } else {
            navigate('/log-practice');
        }
    }, [primarySession, getSessionPath, navigate]);

    const visibleCompletedNotice = completedSessionNotice && activeSessions.some(session =>
        isSameSession(session, completedSessionNotice.id) ||
        isSameSession(session, completedSessionNotice._id)
    ) ? completedSessionNotice : null;

    const handleCompletedNavigate = useCallback(() => {
        const path = getSessionPath(visibleCompletedNotice);
        clearCompletedSessionNotice?.();
        if (path) navigate(path);
    }, [visibleCompletedNotice, clearCompletedSessionNotice, getSessionPath, navigate]);

    const timeUpNotice = visibleCompletedNotice ? (
        <div className="fixed left-4 right-4 top-20 z-[60] sm:left-auto sm:right-6 sm:w-80">
            <div className="relative mx-auto max-w-sm rounded-xl border border-amber-200 bg-white shadow-xl overflow-hidden">
                <button
                    type="button"
                    onClick={handleCompletedNavigate}
                    className="w-full flex items-center gap-3 px-3 py-3 pr-10 text-left hover:bg-amber-50 transition-colors"
                >
                    <span className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
                        <AlarmClock className="w-5 h-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold text-[#1c1f1a]">Time's up</span>
                        <span className="block text-xs text-[#565c52] truncate">
                            {visibleCompletedNotice.skillName || 'Practice session'} finished. Tap to open.
                        </span>
                    </span>
                </button>
                <button
                    type="button"
                    onClick={clearCompletedSessionNotice}
                    className="absolute top-2 right-2 p-1.5 rounded-lg text-[#9aa094] hover:text-[#1c1f1a] hover:bg-[#f5f7f2]"
                    aria-label="Dismiss time's up notification"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    ) : null;

    // Don't show on auth pages or the page that already displays active sessions.
    if (!user) return null;
    const hiddenPages = ['/login', '/signup', '/forgot', '/reset', '/', '/log-practice'];
    if (hiddenPages.includes(location.pathname)) return timeUpNotice;

    // Hide on admin panel pages
    if (location.pathname.startsWith('/admin')) return timeUpNotice;

    // Hide if on the node detail page that owns this session
    const nodeMatch = location.pathname.match(/\/skills\/[^/]+\/nodes\/([^/]+)/);
    const roomNodeMatch = location.pathname.match(/\/roomspace\/[^/]+\/skill-maps\/[^/]+\/nodes\/([^/]+)/);
    const currentNodeId = nodeMatch ? nodeMatch[1] : roomNodeMatch ? roomNodeMatch[1] : null;
    const isOnOwnNode = primarySession && currentNodeId && primarySession.nodeId === currentNodeId;

    if (!primarySession || isOnOwnNode) {
        return timeUpNotice;
    }

    const isRunning = primarySession.isRunning;
    const progress = primarySession.isCountdown ? getProgress(primarySession) : null;

    return (
        <>
            {timeUpNotice}
            <div className="fixed left-4 right-4 bottom-20 z-40 sm:left-auto sm:right-6 sm:bottom-6 sm:w-72">
                <div 
                    onClick={handleNavigate}
                    className={`mx-auto max-w-sm overflow-hidden rounded-xl sm:rounded-2xl shadow-lg sm:shadow-2xl border cursor-pointer transition-all hover:shadow-3xl sm:hover:scale-[1.02] ${
                        isRunning ? 'bg-green-50 border-green-500' : 'bg-white border-gray-300'
                    }`}
                >
                    <div className={`flex items-center justify-between gap-3 px-3 py-2 sm:px-4 sm:py-2.5 sm:rounded-t-2xl ${isRunning ? 'bg-green-600' : 'bg-site-accent'}`}>
                        <div className="flex items-center gap-2 min-w-0">
                            <Clock className="w-4 h-4 text-white flex-shrink-0" />
                            <span className="text-sm font-semibold text-white truncate">
                                {primarySession.skillName}{primarySession.notes ? ` — ${primarySession.notes}` : ''}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="sm:hidden text-sm font-bold font-mono text-white tabular-nums">
                                {formatTimer(primarySession.timer)}
                            </span>
                            {isRunning && <span className="w-2 h-2 bg-green-300 rounded-full animate-pulse" />}
                            <button onClick={handleDismiss} className="p-1 text-white/70 hover:text-white rounded hover:bg-white/20 transition-colors" aria-label="Hide">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                    {primarySession.isCountdown && (
                        <div className="w-full h-1 bg-gray-200">
                            <div className={`h-full transition-all duration-1000 ${isRunning ? 'bg-green-500' : 'bg-site-accent'}`} style={{ width: `${progress}%` }} />
                        </div>
                    )}
                    <div className="hidden sm:block px-4 py-3">
                        <div className={`text-3xl font-bold font-mono text-center ${
                            primarySession.isCountdown && primarySession.timer <= 0 ? 'text-red-600' : isRunning ? 'text-green-700' : 'text-site-ink'
                        }`}>
                            {formatTimer(primarySession.timer)}
                        </div>
                        {isRunning && <p className="text-center text-xs text-green-600 mt-1">● Running — tap to view</p>}
                    </div>
                </div>
            </div>
        </>
    );
}
