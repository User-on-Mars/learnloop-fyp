import { useState } from 'react';
import { Edit2, Save, X } from 'lucide-react';
import { useSkillMap } from '../context/SkillMapContext';

export default function EditNodeForm({ node, onUpdate }) {
  const { updateNodeContent } = useSkillMap();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    title: node.title || '',
    description: node.description || ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isLocked = node.status === 'Locked';

  const validateForm = () => {
    const newErrors = {};

    // Validate title (max 200 characters)
    if (formData.title.length > 200) {
      newErrors.title = 'Title must not exceed 200 characters';
    }

    // Validate description (max 2000 characters)
    if (formData.description.length > 2000) {
      newErrors.description = 'Description must not exceed 2000 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await updateNodeContent(node._id, {
        title: formData.title.trim(),
        description: formData.description.trim()
      });

      setIsEditing(false);
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      setErrors({
        submit: error.message || 'Failed to update node'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      title: node.title || '',
      description: node.description || ''
    });
    setErrors({});
    setIsEditing(false);
  };

  const handleEdit = () => {
    if (!isLocked) {
      setIsEditing(true);
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-3 sm:p-4">
      <div className="flex items-center justify-between mb-3 gap-2">
        <h4 className="text-base sm:text-lg font-semibold text-gray-900">Edit Node Content</h4>
        {!isEditing && (
          <button
            onClick={handleEdit}
            disabled={isLocked}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 py-2 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 justify-center ${
              isLocked
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-site-accent text-white hover:bg-site-accent-hover active:opacity-90'
            }`}
          >
            <Edit2 className="w-4 h-4" />
            <span className="hidden sm:inline">Edit</span>
          </button>
        )}
      </div>

      {isLocked && !isEditing && (
        <p className="text-xs sm:text-sm text-gray-500 italic">
          Locked nodes cannot be edited
        </p>
      )}

      {!isEditing && !isLocked && (
        <div className="text-xs sm:text-sm text-gray-600">
          <p className="mb-1 break-words">
            <span className="font-medium">Title:</span> {node.title || 'No title set'}
          </p>
          <p className="break-words">
            <span className="font-medium">Description:</span> {node.description || 'No description set'}
          </p>
        </div>
      )}

      {isEditing && (
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          {/* Title Input */}
          <div>
            <label htmlFor="title" className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
              Title
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              maxLength={201}
              placeholder="Enter node title"
              className={`w-full px-3 sm:px-4 py-2.5 sm:py-2 border rounded-lg focus:ring-2 focus:ring-site-accent focus:border-transparent text-sm ${
                errors.title ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.title && (
              <p className="text-red-500 text-xs sm:text-sm mt-1">{errors.title}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              {formData.title.length}/200 characters
            </p>
          </div>

          {/* Description Textarea */}
          <div>
            <label htmlFor="description" className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              maxLength={2001}
              rows={4}
              placeholder="Enter node description"
              className={`w-full px-3 sm:px-4 py-2.5 sm:py-2 border rounded-lg focus:ring-2 focus:ring-site-accent focus:border-transparent resize-none text-sm ${
                errors.description ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.description && (
              <p className="text-red-500 text-xs sm:text-sm mt-1">{errors.description}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              {formData.description.length}/2000 characters
            </p>
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div className="bg-red-50 border border-red-300 text-red-700 p-3 rounded-lg text-xs sm:text-sm">
              {errors.submit}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSubmitting}
              className="w-full sm:flex-1 flex items-center justify-center gap-2 px-4 py-3 sm:py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors disabled:opacity-50 min-h-[44px] text-sm"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:flex-1 flex items-center justify-center gap-2 px-4 py-3 sm:py-2 bg-site-accent text-white rounded-lg font-medium hover:bg-site-accent-hover active:opacity-90 transition-colors disabled:opacity-50 min-h-[44px] text-sm"
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
