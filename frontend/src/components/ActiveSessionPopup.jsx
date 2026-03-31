import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useActiveSessions } from '../context/ActiveSessionContext';
import { auth } from '../firebase';
import { Play, Pause, X, Clock } from 'lucide-react';
import SessionCompletionPrompt from './SessionCompletionPrompt';

const MINI_SESSION_KEY = 'miniPopupSessionId';

export default function ActiveSessionPopup() {
    const navigate = useNavigate();
    const location = useLocation();
    const user = auth.currentUser;
    const { activeSessions, toggleSession, formatTimer, getProgress } = useActiveSessions();
    
    // Track the single session shown in mini popup (persisted in localStorage)
    const [miniSessionId, setMiniSessionId] = useState(() => localStorage.getItem(MINI_SESSION_KEY) || null);
    const prevCountRef = useRef(activeSessions.length);

    const [showCompletionPrompt, setShowCompletionPrompt] = useState(false);
    const [completedSession, setCompletedSession] = useState(null);
    const completedSessionsRef = useRef(new Set());

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

    // The one session to show
    const primarySession = miniSessionId
        ? activeSessions.find(s => String(s.id) === miniSessionId) || null
        : null;

    // Detect countdown completion
    useEffect(() => {
        activeSessions.forEach(session => {
            if (session.isCountdown && session.timer <= 0 && !session.isRunning) {
                const sessionKey = `${session.id || session._id}_${session.startedAt}`;
                if (!completedSessionsRef.current.has(sessionKey)) {
                    completedSessionsRef.current.add(sessionKey);
                    setCompletedSession(session);
                    setShowCompletionPrompt(true);
                }
            }
        });
    }, [activeSessions]);

    const handleAddReflection = async (session) => {
        navigate('/log-practice', { state: { completedSession: session, nodeId: session.nodeId, skillId: session.skillId, showReflectionForm: true } });
        setShowCompletionPrompt(false);
    };
    const handleReportBlocker = async (session) => {
        navigate('/log-practice', { state: { completedSession: session, nodeId: session.nodeId, skillId: session.skillId, showBlockerForm: true } });
        setShowCompletionPrompt(false);
    };
    const handleCloseCompletionPrompt = () => { setShowCompletionPrompt(false); setCompletedSession(null); };

    // Dismiss: pause if running, clear from mini popup permanently
    const handleDismiss = useCallback((e) => {
        e.stopPropagation();
        if (primarySession?.isRunning) toggleSession(primarySession.id);
        setMiniSessionId(null);
        localStorage.removeItem(MINI_SESSION_KEY);
    }, [primarySession, toggleSession]);

    const handleToggle = useCallback((e) => {
        e.stopPropagation();
        if (primarySession) toggleSession(primarySession.id);
    }, [primarySession, toggleSession]);

    const handleNavigate = useCallback(() => {
        if (!primarySession) return;
        const sid = primarySession.skillId;
        const nid = primarySession.nodeId;
        if (sid && nid) {
            navigate(`/skills/${sid}/nodes/${nid}`);
        } else {
            navigate('/log-practice');
        }
    }, [primarySession, navigate]);

    // Don't show on auth pages or log-practice
    if (!user) return null;
    const hiddenPages = ['/login', '/signup', '/forgot', '/'];
    if (hiddenPages.includes(location.pathname) || location.pathname.startsWith('/log-practice')) return null;

    // Hide if on the node detail page that owns this session
    const nodeMatch = location.pathname.match(/\/skills\/[^/]+\/nodes\/([^/]+)/);
    const currentNodeId = nodeMatch ? nodeMatch[1] : null;
    const isOnOwnNode = primarySession && currentNodeId && primarySession.nodeId === currentNodeId;

    if (!primarySession || isOnOwnNode) {
        return showCompletionPrompt ? (
            <SessionCompletionPrompt isOpen={showCompletionPrompt} onClose={handleCloseCompletionPrompt} session={completedSession} onAddReflection={handleAddReflection} onReportBlocker={handleReportBlocker} />
        ) : null;
    }

    const isRunning = primarySession.isRunning;
    const progress = primarySession.isCountdown ? getProgress(primarySession) : null;

    return (
        <>
            <SessionCompletionPrompt isOpen={showCompletionPrompt} onClose={handleCloseCompletionPrompt} session={completedSession} onAddReflection={handleAddReflection} onReportBlocker={handleReportBlocker} />
            
            <div className="fixed bottom-6 right-6 z-50">
                <div 
                    onClick={handleNavigate}
                    className={`w-72 rounded-2xl shadow-2xl border-2 cursor-pointer transition-all hover:shadow-3xl hover:scale-[1.02] ${
                        isRunning ? 'bg-green-50 border-green-500' : 'bg-white border-gray-300'
                    }`}
                >
                    <div className={`flex items-center justify-between px-4 py-2.5 rounded-t-2xl ${isRunning ? 'bg-green-600' : 'bg-site-accent'}`}>
                        <div className="flex items-center gap-2 min-w-0">
                            <Clock className="w-4 h-4 text-white flex-shrink-0" />
                            <span className="text-sm font-semibold text-white truncate">
                                {primarySession.skillName}{primarySession.notes ? ` — ${primarySession.notes}` : ''}
                            </span>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
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
                    <div className="px-4 py-3">
                        <div className={`text-3xl font-bold font-mono text-center mb-3 ${
                            primarySession.isCountdown && primarySession.timer <= 0 ? 'text-red-600' : isRunning ? 'text-green-700' : 'text-site-ink'
                        }`}>
                            {formatTimer(primarySession.timer)}
                        </div>
                        <div className="flex gap-2">
                            <button onClick={handleToggle} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg font-medium text-sm transition-colors ${
                                isRunning ? 'bg-gray-700 text-white hover:bg-gray-800' : 'bg-site-accent text-white hover:bg-site-accent-hover'
                            }`}>
                                {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                {isRunning ? 'Pause' : 'Resume'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
