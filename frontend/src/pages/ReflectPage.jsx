import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../useAuth';
import Sidebar from '../components/Sidebar';
import { MoodSelector } from '../components/MoodSelector';
import { TagManager } from '../components/TagManager';
import { LivePreview } from '../components/LivePreview';
import ReflectionHistory from '../components/ReflectionHistory';
import api from '../services/api';
import { CheckCircle, AlertCircle } from 'lucide-react';

export default function ReflectPage() {
  const user = useAuth();
  const navigate = useNavigate();

  // Form state
  const [content, setContent] = useState('');
  const [mood, setMood] = useState(null);
  const [tags, setTags] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [refreshHistory, setRefreshHistory] = useState(0);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (user === null) {
      navigate('/login');
    }
  }, [user, navigate]);

  // Handle content change
  const handleContentChange = (e) => {
    setContent(e.target.value);
  };

  // Handle mood selection
  const handleMoodSelect = (selectedMood) => {
    setMood(selectedMood);
  };

  // Handle tag addition
  const handleTagAdd = (tag) => {
    if (!tags.includes(tag)) {
      setTags([...tags, tag]);
    }
  };

  // Handle tag removal
  const handleTagRemove = (tagToRemove) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  // Handle save
  const handleSave = async () => {
    // Validate content
    if (!content.trim()) {
      setError('Please write something before saving your reflection.');
      setTimeout(() => setError(null), 5000);
      return;
    }

    if (content.length > 10000) {
      setError('Reflection content cannot exceed 10,000 characters.');
      setTimeout(() => setError(null), 5000);
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const reflectionData = {
        content: content.trim(),
        mood: mood,
        tags: tags
      };

      await api.post('/reflections', reflectionData);
      
      setLastUpdated(new Date());
      setSuccess(true);
      
      // Trigger history refresh
      setRefreshHistory(prev => prev + 1);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
      
      // Reset form after successful save
      setTimeout(() => {
        setContent('');
        setMood(null);
        setTags([]);
        setLastUpdated(null);
      }, 1500);
    } catch (err) {
      console.error('Error saving reflection:', err);
      const errorMessage = err.response?.data?.error?.message || err.response?.data?.message || err.message || 'Failed to save reflection. Please try again.';
      setError(errorMessage);
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  // Show loading state while checking authentication
  if (user === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-site-accent border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-site-bg">
      <Sidebar />

      <main className="flex-1 overflow-y-auto w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Reflect</h1>
            <p className="text-gray-600 mt-1">Capture your thoughts and insights about your practice</p>
          </div>

          {/* Success Message */}
          {success && (
            <div className="mb-6 bg-green-50 border border-green-300 text-green-700 p-4 rounded-lg flex items-center gap-3">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <span>Reflection saved successfully!</span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-300 text-red-700 p-4 rounded-lg flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-2 gap-6 lg:gap-8">
            {/* Left Column - Form */}
            <div className="space-y-6">
              {/* Text Area */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                <label htmlFor="reflection-content" className="block text-sm font-medium text-gray-700 mb-3">
                  Your Reflection
                </label>
                <textarea
                  id="reflection-content"
                  value={content}
                  onChange={handleContentChange}
                  placeholder="What did you learn today? How did your practice session go? What insights did you gain?"
                  maxLength={10000}
                  rows={12}
                  className="w-full px-4 py-3 border-2 border-transparent rounded-lg outline-none focus:border-site-accent transition-colors bg-gray-50 focus:bg-white resize-none text-gray-900 placeholder:text-gray-400"
                />
                <div className="mt-2 text-sm text-gray-500 text-right">
                  {content.length} / 10,000 characters
                </div>
              </div>

              {/* Mood Selector */}
              <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <MoodSelector selectedMood={mood} onMoodSelect={handleMoodSelect} />
              </div>

              {/* Tag Manager */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                <TagManager tags={tags} onTagAdd={handleTagAdd} onTagRemove={handleTagRemove} />
              </div>

              {/* Save Button */}
              <button
                onClick={handleSave}
                disabled={isSaving || !content.trim()}
                className={`w-full py-3 px-6 rounded-lg font-semibold transition-all duration-200 ${
                  isSaving || !content.trim()
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-site-accent text-white hover:bg-site-accent-hover shadow-md hover:shadow-lg active:scale-[0.98]'
                }`}
              >
                {isSaving ? 'Saving...' : 'Save Reflection'}
              </button>
            </div>

            {/* Right Column - Live Preview */}
            <div className="lg:sticky lg:top-8 h-fit">
              <LivePreview 
                content={content} 
                mood={mood} 
                tags={tags} 
                lastUpdated={lastUpdated} 
              />
            </div>
          </div>

          {/* Reflection History Section */}
          <div className="mt-12">
            <div className="mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Your Reflections</h2>
              <p className="text-gray-600 mt-1">View and manage your past reflections</p>
            </div>
            <ReflectionHistory key={refreshHistory} />
          </div>
        </div>
      </main>
    </div>
  );
}
