import { useState } from 'react';
import { X } from 'lucide-react';

export default function LogPracticeModal({ isOpen, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    duration: '',
    skill: '',
    notes: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Convert duration to minutes
      const durationInMinutes = parseInt(formData.duration);
      
      await onSubmit({
        ...formData,
        duration: durationInMinutes
      });

      // Reset form
      setFormData({
        duration: '',
        skill: '',
        notes: '',
        date: new Date().toISOString().split('T')[0]
      });

      onClose();
    } catch (error) {
      console.error('Error logging practice:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6 transform transition-all">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Log Practice Session</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Date */}
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
                Date
              </label>
              <input
                type="date"
                id="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ll-600 focus:border-transparent"
              />
            </div>

            {/* Duration */}
            <div>
              <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-2">
                Duration (minutes)
              </label>
              <input
                type="number"
                id="duration"
                name="duration"
                value={formData.duration}
                onChange={handleChange}
                min="1"
                max="1440"
                required
                placeholder="e.g., 30"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ll-600 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Enter the number of minutes you practiced</p>
            </div>

            {/* Skill */}
            <div>
              <label htmlFor="skill" className="block text-sm font-medium text-gray-700 mb-2">
                Skill/Topic
              </label>
              <input
                type="text"
                id="skill"
                name="skill"
                value={formData.skill}
                onChange={handleChange}
                required
                placeholder="e.g., React Hooks, CSS Grid"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ll-600 focus:border-transparent"
              />
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                Notes (optional)
              </label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows="3"
                placeholder="What did you learn or work on?"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ll-600 focus:border-transparent resize-none"
              ></textarea>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-site-accent text-white rounded-lg font-medium hover:bg-site-accent-hover transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Logging...' : 'Log Practice'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
