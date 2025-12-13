import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../useAuth';
import Sidebar from '../components/Sidebar';

export default function LogPractice() {
  const navigate = useNavigate();
  const user = useAuth();

  const [formData, setFormData] = useState({
    skillName: '',
    minutesPracticed: 30,
    tags: ['Problem Solving', 'React', 'Data Structures']
  });

  const [newTag, setNewTag] = useState('');
  const [timer, setTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    setIsSubmitting(true);

    try {
      // Add timer minutes to practiced minutes if timer was used
      const totalMinutes = formData.minutesPracticed + Math.floor(timer / 60);

      const practiceData = {
        ...formData,
        minutesPracticed: totalMinutes,
        timerSeconds: timer,
        date: new Date().toISOString()
      };

      console.log('Practice logged:', practiceData);
      
      // TODO: Send to API
      // await api.post('/api/practice', practiceData);

      // Navigate back to dashboard
      navigate('/dashboard');
    } catch (error) {
      console.error('Error logging practice:', error);
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
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
          {/* Title */}
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              Log New Practice Session
            </h1>
            <p className="text-gray-600">
              Record your latest learning activities to track your progress and insights.
            </p>
          </div>

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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ll-600 focus:border-transparent text-gray-900 placeholder-gray-400"
              />
            </div>

            {/* Minutes Practiced Slider */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label htmlFor="minutesPracticed" className="block text-sm font-medium text-gray-700">
                  Minutes Practiced
                </label>
                <span className="text-2xl font-bold text-ll-600">
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
                  background: `linear-gradient(to right, #0284c7 0%, #0284c7 ${(formData.minutesPracticed / 240) * 100}%, #e5e7eb ${(formData.minutesPracticed / 240) * 100}%, #e5e7eb 100%)`
                }}
              />
              
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>5</span>
                <span>240</span>
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Tags
              </label>
              
              {/* Tag Pills */}
              <div className="flex flex-wrap gap-2 mb-3">
                {formData.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm font-medium"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 hover:text-red-600 transition-colors"
                    >
                      ×
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
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ll-600 focus:border-transparent text-sm"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Current Session Timer */}
            <div className="bg-gray-50 rounded-xl p-6 text-center">
              <h3 className="text-sm font-medium text-gray-700 mb-4">
                Current Session Timer
              </h3>
              
              <div className="text-5xl font-bold text-ll-600 mb-6 font-mono">
                {formatTimer(timer)}
              </div>

              <div className="flex gap-3 justify-center">
                {!isTimerRunning ? (
                  <button
                    type="button"
                    onClick={() => setIsTimerRunning(true)}
                    className="px-6 py-2 bg-ll-600 text-white rounded-lg font-medium hover:bg-ll-700 transition-colors"
                  >
                    Start Timer
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsTimerRunning(false)}
                      className="px-6 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors"
                    >
                      Pause
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsTimerRunning(false);
                        setTimer(0);
                      }}
                      className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                    >
                      Reset
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Motivational Quote */}
            <div className="text-center py-4">
              <p className="text-gray-500 italic">
                "Every master was once a beginner. Keep practicing!"
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !formData.skillName}
              className="w-full py-4 bg-ll-600 text-white rounded-xl font-semibold text-lg hover:bg-ll-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Logging Practice...' : 'Log Practice'}
            </button>

            {/* Cancel Button */}
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

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #0284c7;
          cursor: pointer;
          border: 3px solid white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #0284c7;
          cursor: pointer;
          border: 3px solid white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </div>
  );
}
