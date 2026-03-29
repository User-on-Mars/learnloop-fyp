import { useState, useEffect, useCallback } from 'react';
import { practiceAPI } from '../services/api';
import { useActiveSessions } from '../context/ActiveSessionContext';
import Sidebar from '../components/Sidebar';
import {
    Play,
    Pause,
    RotateCcw,
    Plus,
    X,
    Clock,
    Search,
    Filter,
    Calendar,
    Tag,
    FileText,
    Trash2,
    ChevronDown,
    Activity,
    CheckCircle,
    Timer
} from 'lucide-react';

export default function LogPractice() {
    // Practice logs state (completed sessions from API)
    const [practices, setPractices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Search and filter state
    const [searchQuery, setSearchQuery] = useState('');
    const [filterSkill, setFilterSkill] = useState('');
    const [filterTag, setFilterTag] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    // Active sessions from context (persists across navigation)
    const {
        activeSessions,
        addSession,
        removeSession,
        toggleSession,
        resetSession,
        formatTimer,
        getProgress
    } = useActiveSessions();

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        skillName: '',
        tags: [],
        notes: ''
    });
    const [newTag, setNewTag] = useState('');
    const [timer, setTimer] = useState(0);
    const [targetHours, setTargetHours] = useState(0);
    const [targetMinutes, setTargetMinutes] = useState(25);
    const [targetTime, setTargetTime] = useState(25 * 60);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [isCountdown, setIsCountdown] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Completion modal state
    const [showCompleteModal, setShowCompleteModal] = useState(false);
    const [completingSession, setCompletingSession] = useState(null);
    const [completionNotes, setCompletionNotes] = useState('');

    // Delete completed practice — must type CONFIRM
    const [practicePendingDeleteId, setPracticePendingDeleteId] = useState(null);
    const [deleteConfirmInput, setDeleteConfirmInput] = useState('');

    // Remove active session — in-app confirm (avoids silent/broken window.confirm)
    const [activeSessionPendingRemoveId, setActiveSessionPendingRemoveId] = useState(null);

    // Fetch practices
    const fetchPractices = useCallback(async () => {
        try {
            setLoading(true);
            setError('');
            const response = await practiceAPI.getPractices();
            setPractices(response.data.practices || response.data || []);
        } catch (err) {
            console.error('Error fetching practices:', err);
            setError(err.response?.data?.message || 'Failed to load practice sessions');
            setTimeout(() => setError(''), 10000);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPractices();
    }, [fetchPractices]);

    // Timer effect for modal preview
    useEffect(() => {
        let interval;
        if (isTimerRunning) {
            interval = setInterval(() => {
                setTimer(prev => {
                    if (isCountdown) {
                        if (prev <= 1) {
                            setIsTimerRunning(false);
                            return 0;
                        }
                        return prev - 1;
                    }
                    return prev + 1;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isTimerRunning, isCountdown]);

    // Initialize timer when switching modes
    useEffect(() => {
        const totalSeconds = (targetHours * 60 * 60) + (targetMinutes * 60);
        setTargetTime(totalSeconds);
        if (isCountdown) {
            setTimer(totalSeconds);
        } else {
            setTimer(0);
        }
    }, [isCountdown, targetHours, targetMinutes]);

    // Format timer display (local)
    const formatTimerLocal = (seconds) => {
        const hrs = Math.floor(Math.abs(seconds) / 3600);
        const mins = Math.floor((Math.abs(seconds) % 3600) / 60);
        const secs = Math.abs(seconds) % 60;
        return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    // Format date
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    // Get unique skills and tags for filters
    const uniqueSkills = [...new Set(practices.map(p => p.skillName))];
    const uniqueTags = [...new Set(practices.flatMap(p => p.tags || []))];

    // Filter practices
    const filteredPractices = practices.filter(practice => {
        const matchesSearch = practice.skillName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            practice.notes?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesSkill = !filterSkill || practice.skillName === filterSkill;
        const matchesTag = !filterTag || (practice.tags || []).includes(filterTag);
        return matchesSearch && matchesSkill && matchesTag;
    });

    // Handle form functions
    const handleTargetHoursChange = (e) => {
        const hours = parseInt(e.target.value) || 0;
        setTargetHours(Math.max(0, Math.min(12, hours)));
    };

    const handleTargetMinutesChange = (e) => {
        const minutes = parseInt(e.target.value) || 0;
        setTargetMinutes(Math.max(0, Math.min(59, minutes)));
    };

    const handleAddTag = (e) => {
        e.preventDefault();
        if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
            setFormData(prev => ({
                ...prev,
                tags: [...prev.tags, newTag.trim()]
            }));
            setNewTag('');
        }
    };

    const handleRemoveTag = (tagToRemove) => {
        setFormData(prev => ({
            ...prev,
            tags: prev.tags.filter(tag => tag !== tagToRemove)
        }));
    };

    // Start active session (starts timer immediately)
    const handleStartActiveSession = () => {
        if (!formData.skillName) return;

        addSession({
            skillName: formData.skillName,
            tags: formData.tags,
            notes: formData.notes,
            timer: isCountdown ? targetTime : 0,
            targetTime: targetTime,
            isCountdown: isCountdown,
            isRunning: true
        });

        resetForm();
        setShowModal(false);
        setSuccess('Session started! Timer is running.');
        setTimeout(() => setSuccess(''), 3000);
    };

    // Start later (saves session but doesn't start timer)
    const handleStartLater = () => {
        if (!formData.skillName) return;

        addSession({
            skillName: formData.skillName,
            tags: formData.tags,
            notes: formData.notes,
            timer: isCountdown ? targetTime : 0,
            targetTime: targetTime,
            isCountdown: isCountdown,
            isRunning: false // Not running
        });

        resetForm();
        setShowModal(false);
        setSuccess('Session saved! Start it when you\'re ready.');
        setTimeout(() => setSuccess(''), 3000);
    };

    // Open completion modal
    const openCompleteModal = (session) => {
        // Check if timer has run (for countdown, time should have elapsed)
        if (session.isCountdown && session.timer === session.targetTime) {
            setError('Please start the timer before completing the session.');
            setTimeout(() => setError(''), 5000);
            return;
        }
        
        // Pause the session if running
        if (session.isRunning) {
            toggleSession(session.id);
        }
        
        setCompletingSession(session);
        setCompletionNotes(session.notes || '');
        setShowCompleteModal(true);
    };

    // Calculate session duration
    const getSessionDuration = (session) => {
        if (!session) return { hours: 0, minutes: 0, seconds: 0, totalMinutes: 0 };
        
        let totalSeconds = 0;
        if (session.isCountdown) {
            totalSeconds = Math.max(0, session.targetTime - session.timer);
        } else {
            totalSeconds = session.timer;
        }
        
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        const totalMinutes = Math.max(1, Math.floor(totalSeconds / 60));
        
        return { hours, minutes, seconds, totalMinutes, totalSeconds };
    };

    // Format duration for display
    const formatDuration = (session) => {
        const { hours, minutes, seconds } = getSessionDuration(session);
        if (hours > 0) {
            return `${hours}h ${minutes}m ${seconds}s`;
        }
        if (minutes > 0) {
            return `${minutes}m ${seconds}s`;
        }
        return `${seconds}s`;
    };

    // Submit active session as completed
    const handleSubmitActiveSession = async () => {
        if (!completingSession) return;
        
        setIsSubmitting(true);

        try {
            const { totalMinutes, totalSeconds } = getSessionDuration(completingSession);

            const practiceData = {
                skillName: completingSession.skillName,
                minutesPracticed: totalMinutes,
                tags: completingSession.tags,
                timerSeconds: totalSeconds,
                notes: completionNotes || '',
                date: new Date().toISOString()
            };

            await practiceAPI.createPractice(practiceData);
            removeSession(completingSession.id);
            setShowCompleteModal(false);
            setCompletingSession(null);
            setCompletionNotes('');
            fetchPractices();
            setSuccess('Practice session logged successfully!');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            console.error('Error logging practice:', err);
            setError(err.response?.data?.message || 'Failed to log practice session');
            setTimeout(() => setError(''), 5000);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Check if session can be completed
    const canComplete = (session) => {
        if (session.isCountdown) {
            // For countdown: can complete when timer has run (not at full time)
            return session.timer < session.targetTime;
        }
        // For stopwatch: can complete when some time has passed
        return session.timer > 0;
    };

    // Submit from modal directly (log immediately without active session)
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setIsSubmitting(true);

        try {
            let totalMinutes = 0;
            if (isCountdown) {
                const timeUsed = Math.max(0, targetTime - timer);
                totalMinutes = Math.floor(timeUsed / 60);
            } else {
                totalMinutes = Math.floor(timer / 60);
            }

            totalMinutes = Math.max(1, totalMinutes);

            const practiceData = {
                skillName: formData.skillName,
                minutesPracticed: totalMinutes,
                tags: formData.tags,
                timerSeconds: isCountdown ? (targetTime - timer) : timer,
                notes: formData.notes || '',
                date: new Date().toISOString()
            };

            await practiceAPI.createPractice(practiceData);
            setSuccess('Practice session logged successfully!');
            resetForm();
            setShowModal(false);
            fetchPractices();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            console.error('Error logging practice:', err);
            setError(err.response?.data?.message || 'Failed to log practice session');
        } finally {
            setIsSubmitting(false);
        }
    };

    const openDeletePracticeModal = (id) => {
        setPracticePendingDeleteId(id);
        setDeleteConfirmInput('');
    };

    const closeDeletePracticeModal = () => {
        setPracticePendingDeleteId(null);
        setDeleteConfirmInput('');
    };

    const handleDeletePracticeConfirmed = async () => {
        if (deleteConfirmInput !== 'CONFIRM' || !practicePendingDeleteId) return;
        try {
            await practiceAPI.deletePractice(practicePendingDeleteId);
            closeDeletePracticeModal();
            fetchPractices();
        } catch (err) {
            console.error('Error deleting practice:', err);
            setError('Failed to delete practice session');
            closeDeletePracticeModal();
        }
    };

    const openRemoveActiveSessionModal = (sessionId) => {
        setActiveSessionPendingRemoveId(sessionId);
    };

    const closeRemoveActiveSessionModal = () => {
        setActiveSessionPendingRemoveId(null);
    };

    const confirmRemoveActiveSession = () => {
        if (activeSessionPendingRemoveId == null) return;
        removeSession(activeSessionPendingRemoveId);
        closeRemoveActiveSessionModal();
    };

    const pendingRemoveSession =
        activeSessionPendingRemoveId != null
            ? activeSessions.find(
                  (s) =>
                      s.id === activeSessionPendingRemoveId ||
                      s._id === activeSessionPendingRemoveId
              )
            : null;

    const isNewModalDirty = () =>
        Boolean(
            formData.skillName.trim() ||
                formData.tags.length > 0 ||
                formData.notes.trim() ||
                isTimerRunning
        );

    const closeNewModal = () => {
        resetForm();
        setShowModal(false);
    };

    const requestCloseNewModal = () => {
        if (!isNewModalDirty()) {
            closeNewModal();
            return;
        }
        const ok = window.confirm(
            'Are you sure you want to close? Any unsaved details in this form will be lost.'
        );
        if (ok) closeNewModal();
    };

    const closeCompleteModal = () => {
        setShowCompleteModal(false);
        setCompletingSession(null);
        setCompletionNotes('');
    };

    const requestCloseCompleteModal = () => {
        closeCompleteModal();
    };

    // Reset form
    const resetForm = () => {
        setFormData({ skillName: '', tags: [], notes: '' });
        setNewTag('');
        setTimer(25 * 60);
        setTargetHours(0);
        setTargetMinutes(25);
        setIsTimerRunning(false);
        setIsCountdown(true);
    };

    // Open modal
    const openModal = () => {
        resetForm();
        setShowModal(true);
    };

    return (
        <div className="flex min-h-screen bg-site-bg">
            <Sidebar />

            <main className="flex-1 overflow-y-auto w-full">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Practice Sessions</h1>
                            <p className="text-gray-600 mt-1">Track and manage your learning activities</p>
                        </div>
                        <button
                            onClick={openModal}
                            className="flex items-center gap-2 px-5 py-3 bg-site-accent text-white rounded-lg font-semibold hover:bg-site-accent-hover transition-colors shadow-md"
                        >
                            <Plus className="w-5 h-5" />
                            New Practice
                        </button>
                    </div>

                    {/* Success/Error Messages */}
                    {success && (
                        <div className="mb-6 bg-green-50 border border-green-300 text-green-700 p-3 rounded-lg text-sm">
                            {success}
                        </div>
                    )}
                    {error && (
                        <div className="mb-6 bg-red-50 border border-red-300 text-red-700 p-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    {/* Active Sessions Section */}
                    {activeSessions.length > 0 && (
                        <div className="mb-8">
                            <div className="flex items-center gap-2 mb-4">
                                <Activity className="w-5 h-5 text-green-600" />
                                <h2 className="text-lg font-semibold text-gray-900">Active Sessions</h2>
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                                    {activeSessions.filter(s => s.isRunning).length} running
                                </span>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {activeSessions.map(session => (
                                    <div
                                        key={session.id}
                                        className={`bg-white rounded-xl border p-5 shadow-sm ${
                                            session.isRunning ? 'border-site-accent' : 'border-site-accent-border'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex-1">
                                                <h3 className="font-semibold text-gray-900 truncate">{session.skillName}</h3>
                                                {!session.isRunning && session.timer === session.targetTime && (
                                                    <span className="text-xs text-amber-600 font-medium">Not started</span>
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    openRemoveActiveSessionModal(session._id ?? session.id)
                                                }
                                                className="text-gray-400 hover:text-red-500 transition-colors"
                                                aria-label="Remove active session"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>

                                        {/* Progress Bar for Countdown */}
                                        {session.isCountdown && (
                                            <div className="w-full h-2 bg-gray-100 rounded-full mb-3 overflow-hidden">
                                                <div 
                                                    className="h-full bg-site-accent rounded-full transition-all duration-1000"
                                                    style={{ width: `${getProgress(session)}%` }}
                                                />
                                            </div>
                                        )}

                                        {/* Timer Display */}
                                        <div className={`text-3xl font-bold font-mono text-center py-3 rounded-lg mb-3 ${
                                            session.isCountdown && session.timer <= 0
                                                ? 'bg-red-50 text-red-600'
                                                : session.isRunning
                                                    ? 'bg-green-50 text-green-600'
                                                    : 'bg-site-soft text-site-accent'
                                        }`}>
                                            {formatTimer(session.timer)}
                                        </div>

                                        {session.isCountdown && session.timer <= 0 && (
                                            <p className="text-center text-red-600 text-sm font-medium mb-3">Time's up! 🎉</p>
                                        )}

                                        {/* Timer Controls */}
                                        <div className="flex gap-2 mb-3">
                                            <button
                                                onClick={() => toggleSession(session.id)}
                                                className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg font-medium text-sm transition-colors ${
                                                    session.isRunning
                                                        ? 'bg-gray-600 text-white hover:bg-gray-700'
                                                        : 'bg-site-accent text-white hover:bg-site-accent-hover'
                                                }`}
                                            >
                                                {session.isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                                {session.isRunning ? 'Pause' : 'Start'}
                                            </button>
                                            <button
                                                onClick={() => resetSession(session.id)}
                                                className="px-3 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-site-bg transition-colors"
                                            >
                                                <RotateCcw className="w-4 h-4" />
                                            </button>
                                        </div>

                                        {/* Complete Button */}
                                        <button
                                            onClick={() => openCompleteModal(session)}
                                            disabled={!canComplete(session)}
                                            className={`w-full py-2 rounded-lg font-medium transition-colors ${
                                                canComplete(session)
                                                    ? 'bg-green-600 text-white hover:bg-green-700'
                                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                            }`}
                                        >
                                            Complete & Log
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Completed Sessions Section */}
                    <div className="mb-6">
                        <div className="flex items-center gap-2 mb-4">
                            <CheckCircle className="w-5 h-5 text-site-accent" />
                            <h2 className="text-lg font-semibold text-gray-900">Completed Sessions</h2>
                        </div>

                        {/* Search and Filters */}
                        <div className="bg-white rounded-xl p-4 mb-6 shadow-sm">
                            <div className="flex flex-col sm:flex-row gap-3">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search by skill or notes..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5o border-2 border-transparent rounded-lg outline-none focus:border-site-accent transition-colors bg-gray-50 focus:bg-white"
                                    />
                                </div>
                                <button
                                    onClick={() => setShowFilters(!showFilters)}
                                    className={`flex items-center gap-2 px-4 py-2.5 border rounded-lg font-medium transition-colors ${
                                        showFilters || filterSkill || filterTag
                                            ? 'border-site-border bg-site-soft text-site-accent'
                                            : 'border-gray-300 text-gray-600 hover:bg-site-bg'
                                    }`}
                                >
                                    <Filter className="w-4 h-4" />
                                    Filters
                                    <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                                </button>
                            </div>

                            {showFilters && (
                                <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-gray-100">
                                    <div className="flex-1 min-w-[200px]">
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Skill</label>
                                        <select
                                            value={filterSkill}
                                            onChange={(e) => setFilterSkill(e.target.value)}
                                            className="w-full px-3 py-2 border-2 border-transparent rounded-lg outline-none focus:border-site-accent transition-colors bg-gray-50 focus:bg-white text-sm"
                                        >
                                            <option value="">All Skills</option>
                                            {uniqueSkills.map(skill => (
                                                <option key={skill} value={skill}>{skill}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex-1 min-w-[200px]">
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Tag</label>
                                        <select
                                            value={filterTag}
                                            onChange={(e) => setFilterTag(e.target.value)}
                                            className="w-full px-3 py-2 border-2 border-transparent rounded-lg outline-none focus:border-site-accent transition-colors bg-gray-50 focus:bg-white text-sm"
                                        >
                                            <option value="">All Tags</option>
                                            {uniqueTags.map(tag => (
                                                <option key={tag} value={tag}>{tag}</option>
                                            ))}
                                        </select>
                                    </div>
                                    {(filterSkill || filterTag) && (
                                        <button
                                            onClick={() => { setFilterSkill(''); setFilterTag(''); }}
                                            className="self-end px-3 py-2 text-sm text-site-accent hover:text-site-accent font-medium"
                                        >
                                            Clear Filters
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Practice Logs Grid */}
                        {loading ? (
                            <div className="text-center py-12">
                                <div className="animate-spin w-8 h-8 border-4 border-site-accent border-t-transparent rounded-full mx-auto mb-4"></div>
                                <p className="text-gray-500">Loading practice sessions...</p>
                            </div>
                        ) : filteredPractices.length === 0 ? (
                            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">No completed sessions found</h3>
                                <p className="text-gray-500 mb-4">
                                    {searchQuery || filterSkill || filterTag
                                        ? 'Try adjusting your search or filters'
                                        : 'Complete an active session to see it here'}
                                </p>
                            </div>
                        ) : (
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {filteredPractices.map(practice => (
                                    <div
                                        key={practice._id}
                                        className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow"
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <h3 className="font-semibold text-gray-900 truncate flex-1">{practice.skillName}</h3>
                                            <button
                                                type="button"
                                                onClick={() => openDeletePracticeModal(practice._id)}
                                                className="text-gray-400 hover:text-red-500 transition-colors ml-2"
                                                aria-label="Delete practice session"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>

                                        <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-4 h-4" />
                                                {practice.minutesPracticed} min
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-4 h-4" />
                                                {formatDate(practice.date || practice.createdAt)}
                                            </span>
                                        </div>

                                        {practice.tags && practice.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 mb-3">
                                                {practice.tags.slice(0, 3).map((tag, idx) => (
                                                    <span
                                                        key={idx}
                                                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-site-soft text-site-accent rounded-full text-xs font-medium"
                                                    >
                                                        <Tag className="w-3 h-3" />
                                                        {tag}
                                                    </span>
                                                ))}
                                                {practice.tags.length > 3 && (
                                                    <span className="text-xs text-gray-400">+{practice.tags.length - 3} more</span>
                                                )}
                                            </div>
                                        )}

                                        {practice.notes && (
                                            <p className="text-sm text-gray-600 line-clamp-2">{practice.notes}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="text-center mt-8 text-sm text-gray-500">
                        © 2025 LearnLoop. All rights reserved.
                    </div>
                </div>
            </main>

            {/* New Practice Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            {/* Modal Header */}
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-gray-900">New Practice Session</h2>
                                <button
                                    type="button"
                                    onClick={requestCloseNewModal}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                    aria-label="Close"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-5">
                                {/* Skill Name */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Skill Name
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.skillName}
                                        onChange={(e) => setFormData(prev => ({ ...prev, skillName: e.target.value }))}
                                        placeholder="e.g., React Hooks, Data Structures"
                                        required
                                        className="w-full px-4 py-2.5 border-2 border-transparent rounded-lg outline-none focus:border-site-accent transition-colors bg-gray-50 focus:bg-white"
                                    />
                                </div>

                                {/* Tags */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Tags</label>
                                    {formData.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mb-2">
                                            {formData.tags.map((tag, index) => (
                                                <span
                                                    key={index}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-site-soft text-site-accent rounded-full text-sm font-medium"
                                                >
                                                    {tag}
                                                    <button type="button" onClick={() => handleRemoveTag(tag)} className="hover:text-red-600">
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={newTag}
                                            onChange={(e) => setNewTag(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleAddTag(e)}
                                            placeholder="Add tag and press Enter"
                                            className="flex-1 px-3 py-2 border-2 border-transparent rounded-lg outline-none focus:border-site-accent transition-colors bg-gray-50 focus:bg-white text-sm"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleAddTag}
                                            className="px-3 py-2 bg-site-soft border border-site-border text-site-accent rounded-lg hover:bg-site-soft transition-colors"
                                        >
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Notes */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes (Optional)</label>
                                    <textarea
                                        value={formData.notes}
                                        onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                        placeholder="Add any notes..."
                                        rows={2}
                                        className="w-full px-4 py-2.5 border-2 border-transparent rounded-lg outline-none focus:border-site-accent transition-colors bg-gray-50 focus:bg-white resize-none"
                                    />
                                </div>

                                {/* Timer Section */}
                                <div className="bg-site-soft rounded-xl p-4 border border-site-border">
                                    <div className="flex items-center justify-center gap-2 mb-3">
                                        <Timer className="w-4 h-4 text-site-accent" />
                                        <span className="text-sm font-medium text-site-accent">Practice Timer</span>
                                    </div>

                                    {/* Timer Mode Toggle */}
                                    <div className="flex justify-center mb-3">
                                        <div className="bg-white rounded-lg p-1 border border-site-border inline-flex">
                                            <button
                                                type="button"
                                                onClick={() => { setIsCountdown(true); setIsTimerRunning(false); }}
                                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                                                    isCountdown ? 'bg-site-accent text-white' : 'text-site-accent hover:bg-site-soft'
                                                }`}
                                            >
                                                Countdown
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => { setIsCountdown(false); setIsTimerRunning(false); setTimer(0); }}
                                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                                                    !isCountdown ? 'bg-site-accent text-white' : 'text-site-accent hover:bg-site-soft'
                                                }`}
                                            >
                                                Stopwatch
                                            </button>
                                        </div>
                                    </div>

                                    {/* Target Time Input */}
                                    {isCountdown && (
                                        <div className="flex items-center justify-center gap-2 mb-3">
                                            <input
                                                type="number"
                                                min="0"
                                                max="12"
                                                value={targetHours}
                                                onChange={handleTargetHoursChange}
                                                className="w-14 px-2 py-1.5 border border-site-border rounded-md text-center text-sm"
                                                disabled={isTimerRunning}
                                            />
                                            <span className="text-xs text-site-accent">h</span>
                                            <span className="text-site-accent font-bold">:</span>
                                            <input
                                                type="number"
                                                min="0"
                                                max="59"
                                                value={targetMinutes}
                                                onChange={handleTargetMinutesChange}
                                                className="w-14 px-2 py-1.5 border border-site-border rounded-md text-center text-sm"
                                                disabled={isTimerRunning}
                                            />
                                            <span className="text-xs text-site-accent">m</span>
                                        </div>
                                    )}

                                    {/* Timer Display */}
                                    <div className={`text-4xl font-bold font-mono text-center py-2 ${
                                        isCountdown && timer <= 0 ? 'text-red-600' : 'text-site-accent'
                                    }`}>
                                        {formatTimerLocal(timer)}
                                    </div>

                                    {isCountdown && timer <= 0 && (
                                        <p className="text-center text-red-600 text-sm font-medium mt-1">Time's up! 🎉</p>
                                    )}

                                    {/* Timer Controls */}
                                    <div className="flex gap-2 justify-center mt-3">
                                        <button
                                            type="button"
                                            onClick={() => setIsTimerRunning(!isTimerRunning)}
                                            disabled={isCountdown && timer <= 0}
                                            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                                                isTimerRunning
                                                    ? 'bg-gray-600 text-white hover:bg-gray-700'
                                                    : 'bg-site-accent text-white hover:bg-site-accent-hover'
                                            } disabled:opacity-50`}
                                        >
                                            {isTimerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                            {isTimerRunning ? 'Pause' : 'Preview'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsTimerRunning(false);
                                                const totalSeconds = (targetHours * 60 * 60) + (targetMinutes * 60);
                                                setTimer(isCountdown ? totalSeconds : 0);
                                            }}
                                            className="px-3 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-site-bg transition-colors"
                                        >
                                            <RotateCcw className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="space-y-3 pt-2">
                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={handleStartActiveSession}
                                            disabled={!formData.skillName}
                                            className="flex-1 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                        >
                                            <Play className="w-4 h-4" />
                                            Start Now
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleStartLater}
                                            disabled={!formData.skillName}
                                            className="flex-1 py-3 bg-amber-500 text-white rounded-lg font-semibold hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                        >
                                            <Clock className="w-4 h-4" />
                                            Start Later
                                        </button>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting || !formData.skillName}
                                        className="w-full py-3 bg-site-accent text-white rounded-lg font-semibold hover:bg-site-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isSubmitting ? 'Saving...' : 'Log Immediately (Skip Timer)'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={requestCloseNewModal}
                                        className="w-full py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-site-bg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Completion Modal */}
            {showCompleteModal && completingSession && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
                        <div className="p-6">
                            {/* Modal Header */}
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-gray-900">Complete Session</h2>
                                <button
                                    type="button"
                                    onClick={requestCloseCompleteModal}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                    aria-label="Close"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            {/* Session Summary */}
                            <div className="bg-green-50 rounded-xl p-4 border border-green-200 mb-6">
                                <div className="flex items-center gap-2 mb-3">
                                    <CheckCircle className="w-5 h-5 text-green-600" />
                                    <span className="font-semibold text-green-800">Session Complete!</span>
                                </div>
                                
                                <h3 className="text-lg font-bold text-gray-900 mb-2">
                                    {completingSession.skillName}
                                </h3>
                                
                                {/* Duration Display */}
                                <div className="flex items-center gap-2 text-green-700 mb-2">
                                    <Clock className="w-4 h-4" />
                                    <span className="font-medium">Duration:</span>
                                    <span className="font-bold text-lg">{formatDuration(completingSession)}</span>
                                </div>
                                
                                <p className="text-sm text-green-600">
                                    {getSessionDuration(completingSession).totalMinutes} minute{getSessionDuration(completingSession).totalMinutes !== 1 ? 's' : ''} will be logged
                                </p>

                                {/* Tags */}
                                {completingSession.tags && completingSession.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-3">
                                        {completingSession.tags.map((tag, idx) => (
                                            <span
                                                key={idx}
                                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-white text-green-700 rounded-full text-xs font-medium"
                                            >
                                                <Tag className="w-3 h-3" />
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Session Notes */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Session Notes (Optional)
                                </label>
                                <p className="text-xs text-gray-500 mb-2">
                                    What did you accomplish? Any insights or things to remember?
                                </p>
                                <textarea
                                    value={completionNotes}
                                    onChange={(e) => setCompletionNotes(e.target.value)}
                                    placeholder="e.g., Completed 3 exercises on React hooks, struggled with useCallback but understood it better after reading docs..."
                                    rows={4}
                                    className="w-full px-4 py-2.5 border-2 border-transparent rounded-lg outline-none focus:border-green-600 transition-colors bg-gray-50 focus:bg-white resize-none"
                                />
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={requestCloseCompleteModal}
                                    className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-site-bg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSubmitActiveSession}
                                    disabled={isSubmitting}
                                    className="flex-1 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        'Log Session'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Remove active session — confirm */}
            {activeSessionPendingRemoveId != null && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 border border-gray-200">
                        <h2 className="text-lg font-bold text-gray-900 mb-2">Remove this active session?</h2>
                        <p className="text-sm text-gray-600 mb-1">
                            Are you sure you want to remove &ldquo;
                            {pendingRemoveSession?.skillName || 'this session'}&rdquo;? It will be discarded and
                            won&apos;t appear in completed history.
                        </p>
                        <div className="flex gap-3 mt-5">
                            <button
                                type="button"
                                onClick={closeRemoveActiveSessionModal}
                                className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={confirmRemoveActiveSession}
                                className="flex-1 py-2.5 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete logged practice — type CONFIRM */}
            {practicePendingDeleteId && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 border border-red-100">
                        <h2 className="text-lg font-bold text-gray-900 mb-2">Delete this practice session?</h2>
                        <p className="text-sm text-gray-600 mb-4">
                            This removes the logged session from your history permanently. To confirm, type{' '}
                            <span className="font-mono font-semibold text-gray-900">CONFIRM</span> below.
                        </p>
                        <input
                            type="text"
                            value={deleteConfirmInput}
                            onChange={(e) => setDeleteConfirmInput(e.target.value)}
                            placeholder="Type CONFIRM"
                            autoComplete="off"
                            className="w-full px-4 py-2.5 border-2 border-transparent rounded-lg outline-none focus:border-red-500 transition-colors bg-gray-50 focus:bg-white font-mono text-sm mb-4"
                        />
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={closeDeletePracticeModal}
                                className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleDeletePracticeConfirmed}
                                disabled={deleteConfirmInput !== 'CONFIRM'}
                                className="flex-1 py-2.5 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
