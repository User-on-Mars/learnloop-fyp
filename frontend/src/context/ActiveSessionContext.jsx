import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { activeSessionAPI } from '../services/api.js';
import { auth } from '../firebase.js';

const ActiveSessionContext = createContext(null);

// Simple notification sound using Web Audio API
const createNotificationSound = () => {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        const playTone = (frequency, startTime, duration) => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = frequency;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, startTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
            
            oscillator.start(startTime);
            oscillator.stop(startTime + duration);
        };

        // Play a pleasant chime sequence
        const now = audioContext.currentTime;
        playTone(523.25, now, 0.2);        // C5
        playTone(659.25, now + 0.15, 0.2); // E5
        playTone(783.99, now + 0.3, 0.3);  // G5
        playTone(1046.50, now + 0.45, 0.4); // C6
        
        return true;
    } catch (e) {
        console.log('Could not play notification sound:', e);
        return false;
    }
};

export function ActiveSessionProvider({ children }) {
    // Initialize from localStorage for immediate display
    const [activeSessions, setActiveSessions] = useState(() => {
        const saved = localStorage.getItem('activeSessions');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                return parsed.map(session => ({
                    ...session,
                    isRunning: false // Always pause on load
                }));
            } catch (e) {
                return [];
            }
        }
        return [];
    });
    const [isLoading, setIsLoading] = useState(true);
    const [syncError, setSyncError] = useState(null);

    const [showPopup, setShowPopup] = useState(false);
    
    // Sound settings
    const [soundEnabled, setSoundEnabled] = useState(() => {
        const saved = localStorage.getItem('sessionSoundEnabled');
        return saved !== 'false'; // Default to true
    });

    // Track which sessions have already played their completion sound
    const completedSoundsRef = useRef(new Set());
    const hasLoadedRef = useRef(false);

    // Load sessions from backend when user is authenticated
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (user && !hasLoadedRef.current) {
                hasLoadedRef.current = true;
                try {
                    setIsLoading(true);
                    setSyncError(null);

                    const response = await activeSessionAPI.getSessions();
                    const sessions = response.data.activeSessions || [];
                    
                    // Restore sessions but pause all running timers
                    const restoredSessions = sessions.map(session => ({
                        ...session,
                        id: session._id, // Use MongoDB _id as id
                        isRunning: false // Always pause on load
                    }));
                    
                    setActiveSessions(restoredSessions);
                    console.log('✅ Loaded', restoredSessions.length, 'active sessions from backend');
                } catch (error) {
                    console.error('❌ Error loading active sessions:', error);
                    setSyncError(error.message);
                    // Fall back to localStorage if backend fails
                    const saved = localStorage.getItem('activeSessions');
                    if (saved) {
                        try {
                            const parsed = JSON.parse(saved);
                            setActiveSessions(parsed.map(s => ({ ...s, isRunning: false })));
                            console.log('✅ Loaded sessions from localStorage fallback');
                        } catch (e) {
                            console.error('Error parsing localStorage:', e);
                        }
                    }
                } finally {
                    setIsLoading(false);
                }
            } else if (!user) {
                // User logged out - pause sessions but keep in localStorage
                hasLoadedRef.current = false;
                setActiveSessions(prev => prev.map(s => ({ ...s, isRunning: false })));
                setIsLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    // Save sound preference
    useEffect(() => {
        localStorage.setItem('sessionSoundEnabled', soundEnabled.toString());
    }, [soundEnabled]);

    // Sync sessions to backend and localStorage
    useEffect(() => {
        const syncSessions = async () => {
            try {
                // Save to localStorage for quick access
                const sessionsToSave = activeSessions.map(s => ({
                    ...s,
                    lastUpdated: Date.now()
                }));
                localStorage.setItem('activeSessions', JSON.stringify(sessionsToSave));

                // Sync to backend (only if user is authenticated)
                if (auth.currentUser) {
                    // For now, we'll sync on demand rather than on every change
                    // This prevents too many API calls
                }
            } catch (error) {
                console.error('Error syncing sessions:', error);
            }
        };

        syncSessions();
    }, [activeSessions]);

    // Save sessions to localStorage and backend when browser/tab is closing
    useEffect(() => {
        const saveToLocalStorage = () => {
            if (activeSessions.length > 0) {
                const sessionsToSave = activeSessions.map(s => ({
                    ...s,
                    isRunning: false, // Always pause when saving
                    lastUpdated: Date.now()
                }));
                localStorage.setItem('activeSessions', JSON.stringify(sessionsToSave));
                console.log('💾 Saved sessions to localStorage');
            }
        };

        const syncToBackend = async () => {
            if (!auth.currentUser || activeSessions.length === 0) return;
            
            try {
                for (const session of activeSessions) {
                    if (session._id) {
                        await activeSessionAPI.updateSession(session._id, {
                            timer: session.timer,
                            isRunning: false
                        });
                    }
                }
                console.log('☁️ Synced sessions to backend');
            } catch (error) {
                console.error('Error syncing sessions to backend:', error);
            }
        };

        const handleBeforeUnload = () => {
            // Synchronous save to localStorage (reliable)
            saveToLocalStorage();
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                saveToLocalStorage();
                syncToBackend(); // Async but best effort
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [activeSessions]);

    // Global timer effect with sound notification
    useEffect(() => {
        let interval;
        if (activeSessions.some(s => s.isRunning)) {
            interval = setInterval(() => {
                setActiveSessions(prev =>
                    prev.map(session => {
                        if (!session.isRunning) return session;
                        if (session.isCountdown) {
                            const newTimer = session.timer - 1;
                            if (newTimer <= 0) {
                                // Play sound when countdown reaches zero
                                if (soundEnabled && !completedSoundsRef.current.has(session.id)) {
                                    completedSoundsRef.current.add(session.id);
                                    createNotificationSound();
                                }
                                return { ...session, timer: 0, isRunning: false };
                            }
                            return { ...session, timer: newTimer };
                        }
                        return { ...session, timer: session.timer + 1 };
                    })
                );
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [activeSessions, soundEnabled]);

    // Add a new session
    const addSession = useCallback((session) => {
        const newSession = {
            id: Date.now(),
            ...session,
            startedAt: new Date().toISOString(),
            lastUpdated: Date.now()
        };
        setActiveSessions(prev => [...prev, newSession]);
        
        // Sync to backend
        if (auth.currentUser) {
            activeSessionAPI.createSession({
                skillName: session.skillName,
                tags: session.tags,
                notes: session.notes,
                timer: session.timer,
                targetTime: session.targetTime,
                isCountdown: session.isCountdown,
                isRunning: session.isRunning,
                nodeId: session.nodeId,
                skillId: session.skillId
            }).then(response => {
                // Update local session with MongoDB _id
                setActiveSessions(prev =>
                    prev.map(s => s.id === newSession.id ? { ...s, _id: response.data._id } : s)
                );
            }).catch(error => {
                console.error('Error creating session on backend:', error);
                setSyncError(error.message);
            });
        }
        
        return newSession;
    }, []);

    // Remove a session
    const removeSession = useCallback((sessionId) => {
        completedSoundsRef.current.delete(sessionId);
        
        // Find the session to get its _id
        const session = activeSessions.find(s => s.id === sessionId || s._id === sessionId);
        
        setActiveSessions(prev => prev.filter(s => s.id !== sessionId && s._id !== sessionId));
        
        // Delete from backend
        if (auth.currentUser && session?._id) {
            activeSessionAPI.deleteSession(session._id).catch(error => {
                console.error('Error deleting session from backend:', error);
                setSyncError(error.message);
            });
        }
    }, [activeSessions]);

    // Clear all sessions (for logout)
    const clearAllSessions = useCallback(() => {
        completedSoundsRef.current.clear();
        setActiveSessions([]);
        localStorage.removeItem('activeSessions');
        
        // Clear from backend
        if (auth.currentUser) {
            activeSessionAPI.deleteAllSessions().catch(error => {
                console.error('Error clearing sessions from backend:', error);
            });
        }
    }, []);

    // Toggle session timer
    const toggleSession = useCallback((sessionId) => {
        setActiveSessions(prev =>
            prev.map(s => {
                if (s.id === sessionId || s._id === sessionId) {
                    const updated = { ...s, isRunning: !s.isRunning };
                    
                    // Sync to backend
                    if (auth.currentUser && s._id) {
                        activeSessionAPI.updateSession(s._id, {
                            isRunning: updated.isRunning,
                            timer: updated.timer
                        }).catch(error => {
                            console.error('Error updating session on backend:', error);
                            setSyncError(error.message);
                        });
                    }
                    
                    return updated;
                }
                return s;
            })
        );
    }, []);

    // Reset session timer
    const resetSession = useCallback((sessionId) => {
        completedSoundsRef.current.delete(sessionId);
        setActiveSessions(prev =>
            prev.map(s => {
                if (s.id !== sessionId && s._id !== sessionId) return s;
                
                const updated = {
                    ...s,
                    timer: s.isCountdown ? s.targetTime : 0,
                    isRunning: false
                };
                
                // Sync to backend
                if (auth.currentUser && s._id) {
                    activeSessionAPI.updateSession(s._id, {
                        timer: updated.timer,
                        isRunning: false
                    }).catch(error => {
                        console.error('Error resetting session on backend:', error);
                        setSyncError(error.message);
                    });
                }
                
                return updated;
            })
        );
    }, []);

    // Update session
    const updateSession = useCallback((sessionId, updates) => {
        setActiveSessions(prev =>
            prev.map(s => {
                if (s.id !== sessionId && s._id !== sessionId) return s;
                
                const updated = { ...s, ...updates };
                
                // Sync to backend
                if (auth.currentUser && s._id) {
                    activeSessionAPI.updateSession(s._id, updates).catch(error => {
                        console.error('Error updating session on backend:', error);
                        setSyncError(error.message);
                    });
                }
                
                return updated;
            })
        );
    }, []);

    // Format timer display
    const formatTimer = (seconds) => {
        const hrs = Math.floor(Math.abs(seconds) / 3600);
        const mins = Math.floor((Math.abs(seconds) % 3600) / 60);
        const secs = Math.abs(seconds) % 60;
        if (hrs > 0) {
            return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        }
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    // Get progress percentage for countdown
    const getProgress = (session) => {
        if (!session.isCountdown || session.targetTime === 0) return 0;
        const elapsed = session.targetTime - session.timer;
        return Math.min(100, Math.max(0, (elapsed / session.targetTime) * 100));
    };

    // Test sound
    const testSound = useCallback(() => {
        createNotificationSound();
    }, []);

    const value = {
        activeSessions,
        addSession,
        removeSession,
        clearAllSessions,
        toggleSession,
        resetSession,
        updateSession,
        formatTimer,
        getProgress,
        showPopup,
        setShowPopup,
        soundEnabled,
        setSoundEnabled,
        testSound,
        isLoading,
        syncError
    };

    return (
        <ActiveSessionContext.Provider value={value}>
            {children}
        </ActiveSessionContext.Provider>
    );
}

export function useActiveSessions() {
    const context = useContext(ActiveSessionContext);
    if (!context) {
        throw new Error('useActiveSessions must be used within ActiveSessionProvider');
    }
    return context;
}
