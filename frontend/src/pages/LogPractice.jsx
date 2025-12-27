import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../useAuth';
import { practiceAPI } from '../services/api';
import Sidebar from '../components/Sidebar';
import { Play, Pause, RotateCcw, Plus, X } from 'lucide-react'; // Import Lucide icons

export default function LogPractice() {
    const navigate = useNavigate();
    const user = useAuth();

    const [formData, setFormData] = useState({
        skillName: '',
        minutesPracticed: 30,
        tags: [],
        notes: ''
    });

    const [newTag, setNewTag] = useState('');
    const [timer, setTimer] = useState(0);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Color constants
    const primaryColorHex = '#4f46e5'; // Indigo-600

    // Timer effect
    useEffect(() => {
        let interval;
        if (isTimerRunning) {
            interval = setInterval(() => {
                setTimer(prev => prev + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isTimerRunning]);

    // Format timer display
    const formatTimer = (seconds) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    const handleSliderChange = (e) => {
        setFormData(prev => ({
            ...prev,
            minutesPracticed: parseInt(e.target.value)
        }));
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setIsSubmitting(true);

        try {
            // Add timer minutes to practiced minutes if timer was used
            const totalMinutes = formData.minutesPracticed + Math.floor(timer / 60);

            const practiceData = {
                skillName: formData.skillName,
                minutesPracticed: totalMinutes,
                tags: formData.tags,
                timerSeconds: timer,
                notes: formData.notes || '',
                date: new Date().toISOString()
            };

            console.log('Submitting practice data:', practiceData);
            const response = await practiceAPI.createPractice(practiceData);
            console.log('Practice logged successfully:', response.data);
            
            setSuccess('Practice session logged successfully!');
            
            // Navigate back to dashboard after a short delay
            setTimeout(() => {
                navigate('/dashboard');
            }, 1500);
        } catch (error) {
            console.error('Error logging practice:', error);
            setError(error.response?.data?.message || 'Failed to log practice session. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-gray-50">
            {/* Sidebar Navigation */}
            <Sidebar />

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto w-full">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
                    <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 sm:p-8">
                        {/* Title */}
                        <div className="mb-8">
                            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                                Log New Practice Session
                            </h1>
                            <p className="text-gray-600">
                                Record your latest learning activities to track your progress and insights.
                            </p>
                        </div>

                        {/* Error/Success Messages */}
                        {error && (
                            <div className="mb-6 bg-red-50 border border-red-300 text-red-700 p-3 rounded-lg text-sm">
                                {error}
                            </div>
                        )}
                        {success && (
                            <div className="mb-6 bg-green-50 border border-green-300 text-green-700 p-3 rounded-lg text-sm">
                                {success}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-8">
                            {/* Skill Name */}
                            <div>
                                <label htmlFor="skillName" className="block text-sm font-medium text-gray-700 mb-2">
                                    Skill Name
                                </label>
                                <input
                                    type="text"
                                    id="skillName"
                                    value={formData.skillName}
                                    onChange={(e) => setFormData(prev => ({ ...prev, skillName: e.target.value }))}
                                    placeholder="e.g., React Hooks, Data Structures, Spanish Verbs"
                                    required
                                    // Use Indigo focus ring
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent text-gray-900 placeholder-gray-400"
                                />
                            </div>

                            {/* Minutes Practiced Slider */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <label htmlFor="minutesPracticed" className="block text-sm font-medium text-gray-700">
                                        Minutes Practiced
                                    </label>
                                    <span className="text-2xl font-bold text-indigo-600">
                                        {formData.minutesPracticed} min
                                    </span>
                                </div>
                                
                                <input
                                    type="range"
                                    id="minutesPracticed"
                                    min="5"
                                    max="240"
                                    step="5"
                                    value={formData.minutesPracticed}
                                    onChange={handleSliderChange}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                                    style={{
                                        // Update linear gradient colors to Indigo-600 (#4f46e5)
                                        background: `linear-gradient(to right, ${primaryColorHex} 0%, ${primaryColorHex} ${(formData.minutesPracticed / 240) * 100}%, #e5e7eb ${(formData.minutesPracticed / 240) * 100}%, #e5e7eb 100%)`
                                    }}
                                />
                                
                                <div className="flex justify-between text-xs text-gray-500 mt-2">
                                    <span>5 min</span>
                                    <span>240 min (4h)</span>
                                </div>
                            </div>

                            {/* Tags */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-3">
                                    Tags
                                </label>
                                
                                {/* Tag Pills - Indigo Hover */}
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {formData.tags.map((tag, index) => (
                                        <span
                                            key={index}
                                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-sm font-medium shadow-sm border border-indigo-100"
                                        >
                                            {tag}
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveTag(tag)}
                                                className="ml-1 text-indigo-500 hover:text-red-600 transition-colors"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </span>
                                    ))}
                                </div>

                                {/* Add Tag Input */}
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newTag}
                                        onChange={(e) => setNewTag(e.target.value)}
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter') {
                                                handleAddTag(e);
                                            }
                                        }}
                                        placeholder="Add a tag and press Enter (e.g., focus, deep work)"
                                        // Use Indigo focus ring
                                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent text-sm"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddTag}
                                        // Indigo Button style for Add Tag
                                        className="px-4 py-2 bg-indigo-50 border border-indigo-200 text-indigo-600 rounded-lg font-medium hover:bg-indigo-100 transition-colors shadow-sm"
                                    >
                                        <Plus className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Notes */}
                            <div>
                                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                                    Notes (Optional)
                                </label>
                                <textarea
                                    id="notes"
                                    value={formData.notes}
                                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                    placeholder="Add any notes about your practice session..."
                                    rows={3}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent text-gray-900 placeholder-gray-400 resize-none"
                                />
                            </div>

                            {/* Current Session Timer */}
                            <div className="bg-indigo-50 rounded-xl p-6 text-center border border-indigo-200">
                                <h3 className="text-sm font-medium text-indigo-700 mb-4">
                                    Current Session Timer
                                </h3>
                                
                                <div className="text-5xl font-extrabold text-indigo-600 mb-6 font-mono">
                                    {formatTimer(timer)}
                                </div>

                                <div className="flex gap-3 justify-center">
                                    {!isTimerRunning ? (
                                        // Start Button - Primary Indigo
                                        <button
                                            type="button"
                                            onClick={() => setIsTimerRunning(true)}
                                            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors shadow-md"
                                        >
                                            <Play className="w-5 h-5" />
                                            <span>Start Timer</span>
                                        </button>
                                    ) : (
                                        <>
                                            {/* Pause Button - Secondary Gray/Indigo */}
                                            <button
                                                type="button"
                                                onClick={() => setIsTimerRunning(false)}
                                                className="flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition-colors shadow-md"
                                            >
                                                <Pause className="w-5 h-5" />
                                                <span>Pause</span>
                                            </button>
                                            {/* Reset Button - Outline Style */}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsTimerRunning(false);
                                                    setTimer(0);
                                                }}
                                                className="flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-100 transition-colors"
                                            >
                                                <RotateCcw className="w-5 h-5" />
                                                <span>Reset</span>
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Motivational Quote */}
                            <div className="text-center py-4">
                                <p className="text-gray-500 italic border-l-4 border-indigo-400 pl-4">
                                    "Every master was once a beginner. Keep practicing!"
                                </p>
                            </div>

                            {/* Submit Button - Primary Indigo */}
                            <button
                                type="submit"
                                disabled={isSubmitting || !formData.skillName}
                                className="w-full py-4 bg-indigo-600 text-white rounded-xl font-semibold text-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                            >
                                {isSubmitting ? 'Logging Practice...' : 'Log Practice'}
                            </button>

                            {/* Cancel Button - Outline Style */}
                            <button
                                type="button"
                                onClick={() => navigate('/dashboard')}
                                className="w-full py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                        </form>
                    </div>

                    {/* Footer */}
                    <div className="text-center mt-8 text-sm text-gray-500">
                        © 2025 LearnLoop. All rights reserved.
                    </div>
                </div>
            </main>

            {/* Global style block for the slider thumb - UPDATED COLORS */}
            <style jsx>{`
                .slider::-webkit-slider-thumb {
                    appearance: none;
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    background: ${primaryColorHex}; /* Indigo-600 */
                    cursor: pointer;
                    border: 3px solid white;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                }

                .slider::-moz-range-thumb {
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    background: ${primaryColorHex}; /* Indigo-600 */
                    cursor: pointer;
                    border: 3px solid white;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                }
            `}</style>
        </div>
    );
}