import { useState, useEffect } from 'react';
import { Trash2, Download, AlertCircle, Loader2 } from 'lucide-react';
import api from '../services/api';

const MOODS = {
  'Happy': '😊',
  'Neutral': '😐',
  'Sad': '😢',
  'Energized': '⚡',
  'Thoughtful': '🤔'
};

function getRelativeTime(date) {
  if (!date) return '';
  
  const now = new Date();
  const diffMs = now - new Date(date);
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return 'just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  } else {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  }
}

function DeleteConfirmationDialog({ isOpen, onClose, onConfirm, isDeleting }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity backdrop-blur-sm"
        onClick={onClose}
      ></div>

      {/* Dialog */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full p-6 transform transition-all animate-in">
          <div className="mb-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
              Delete Reflection
            </h3>
            <p className="text-sm text-gray-600 text-center">
              Are you sure you want to delete this reflection? This action cannot be undone.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isDeleting}
              className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ReflectionHistory() {
  const [reflections, setReflections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedReflection, setSelectedReflection] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reflectionToDelete, setReflectionToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(null);

  // Fetch reflections on mount
  useEffect(() => {
    fetchReflections();
  }, []);

  const fetchReflections = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.get('/reflections');
      setReflections(response.data);
    } catch (err) {
      console.error('Error fetching reflections:', err);
      setError(err.response?.data?.message || 'Failed to load reflections. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = (reflection) => {
    setReflectionToDelete(reflection);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!reflectionToDelete) return;

    setIsDeleting(true);
    
    try {
      await api.delete(`/reflections/${reflectionToDelete._id}`);
      
      // Remove from list
      setReflections(reflections.filter(r => r._id !== reflectionToDelete._id));
      
      // Clear selected reflection if it was deleted
      if (selectedReflection?._id === reflectionToDelete._id) {
        setSelectedReflection(null);
      }
      
      setDeleteDialogOpen(false);
      setReflectionToDelete(null);
    } catch (err) {
      console.error('Error deleting reflection:', err);
      setError(err.response?.data?.message || 'Failed to delete reflection. Please try again.');
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExport = async (reflection) => {
    setIsExporting(reflection._id);
    
    try {
      const response = await api.get(`/reflections/${reflection._id}/pdf`, {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Format filename with date
      const date = new Date(reflection.createdAt).toISOString().split('T')[0];
      link.setAttribute('download', `reflection-${date}.pdf`);
      
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting reflection:', err);
      setError(err.response?.data?.message || 'Failed to export reflection. Please try again.');
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsExporting(null);
    }
  };

  const handleSelect = (reflection) => {
    setSelectedReflection(selectedReflection?._id === reflection._id ? null : reflection);
  };

  const getPreview = (content) => {
    return content.length > 150 ? content.substring(0, 150) + '...' : content;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-site-accent animate-spin" />
      </div>
    );
  }

  // Error state
  if (error && reflections.length === 0) {
    return (
      <div className="bg-red-50 border border-red-300 text-red-700 p-4 rounded-lg flex items-center gap-3">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  // Empty state
  if (reflections.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">No reflections yet.</p>
        <p className="text-gray-400 mt-2">Start writing your first reflection to see it here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Error message (for delete/export errors) */}
      {error && (
        <div className="bg-red-50 border border-red-300 text-red-700 p-4 rounded-lg flex items-center gap-3 animate-in">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Reflections list */}
      <div className="space-y-3">
        {reflections.map((reflection) => (
          <div
            key={reflection._id}
            className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden transition-all hover:shadow-md hover:border-gray-300"
          >
            {/* Reflection header - clickable */}
            <div
              onClick={() => handleSelect(reflection)}
              className="p-4 sm:p-5 cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    {reflection.mood && (
                      <span className="text-2xl sm:text-3xl">{MOODS[reflection.mood]}</span>
                    )}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                      <span className="text-sm font-semibold text-gray-700">
                        {new Date(reflection.createdAt).toLocaleDateString('en-US', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                      <span className="text-sm text-gray-500">
                        {new Date(reflection.createdAt).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      <span className="text-xs text-gray-400">
                        ({getRelativeTime(reflection.createdAt)})
                      </span>
                    </div>
                  </div>
                  
                  {reflection.tags && reflection.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {reflection.tags.map((tag, index) => (
                        <span
                          key={`${tag}-${index}`}
                          className="px-2.5 py-1 bg-ll-100 text-ll-800 rounded-full text-xs font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  <p className="text-gray-700 text-sm leading-relaxed">
                    {getPreview(reflection.content)}
                  </p>
                </div>

                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExport(reflection);
                    }}
                    disabled={isExporting === reflection._id}
                    className="p-2 text-ll-600 hover:bg-ll-50 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
                    title="Export to PDF"
                  >
                    {isExporting === reflection._id ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Download className="w-5 h-5" />
                    )}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(reflection);
                    }}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all hover:scale-105 active:scale-95"
                    title="Delete reflection"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Expanded content */}
            {selectedReflection?._id === reflection._id && (
              <div className="border-t border-gray-200 p-4 sm:p-5 bg-gradient-to-b from-gray-50 to-white">
                <div className="prose prose-sm max-w-none">
                  <p className="text-gray-800 whitespace-pre-wrap break-words leading-relaxed">
                    {reflection.content}
                  </p>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-gray-500">
                  <div>
                    <span className="font-medium">Created:</span> {new Date(reflection.createdAt).toLocaleString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })}
                  </div>
                  {reflection.updatedAt && reflection.updatedAt !== reflection.createdAt && (
                    <div>
                      <span className="font-medium">Updated:</span> {new Date(reflection.updatedAt).toLocaleString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Delete confirmation dialog */}
      <DeleteConfirmationDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setReflectionToDelete(null);
        }}
        onConfirm={confirmDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}
