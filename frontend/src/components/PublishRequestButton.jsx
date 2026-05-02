import { useState, useEffect } from 'react';
import { publishRequestsAPI } from '../api/client';
import { Upload, CheckCircle, Clock } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { auth } from '../firebase';

/**
 * PublishRequestButton - Button to request publishing a skillmap
 * Shows eligibility status and handles submission
 */
export function PublishRequestButton({ skillmap }) {
  const [eligibility, setEligibility] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { showSuccess, showError } = useToast();

  const skillColor = skillmap?.color || '#2e5023';
  
  // Check if this skill map was created from a template
  const isFromTemplate = skillmap?.isTemplate || skillmap?.templateId || skillmap?.source === 'template' || skillmap?.fromTemplate;

  // Get publish status from skillmap data (set by backend)
  const publishStatus = skillmap?.publishStatus || 'draft';

  // Monitor authentication state
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setIsAuthenticated(!!user);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    // Don't check eligibility for published or template skillmaps
    if (publishStatus === 'published' || isFromTemplate) {
      setIsChecking(false);
      return;
    }
    if (skillmap && skillmap._id && isAuthenticated) {
      checkEligibility();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skillmap, isAuthenticated]);

  const checkEligibility = async () => {
    try {
      setIsChecking(true);
      const response = await publishRequestsAPI.checkEligibility();
      setEligibility(response.data);
    } catch (error) {
      console.error('❌ PublishRequestButton: Failed to check eligibility:', error);
      setEligibility({ 
        canSubmit: false, 
        reason: 'Unable to check eligibility. Please try again later.' 
      });
    } finally {
      setIsChecking(false);
    }
  };

  const handleSubmit = async () => {
    if (!eligibility?.canSubmit || !skillmap) return;

    if (isFromTemplate) {
      showError('Template-based skill maps cannot be published. Only original skill maps can be submitted.');
      return;
    }

    const nodeCount = skillmap.nodeCount || 0;
    if (nodeCount < 5) {
      showError(`Skill map must have at least 5 nodes. Currently has ${nodeCount}. Add ${5 - nodeCount} more node${5 - nodeCount > 1 ? 's' : ''} to publish.`);
      return;
    }

    try {
      setIsLoading(true);
      await publishRequestsAPI.submitRequest(skillmap._id);
      showSuccess('Publish request submitted! We\'ll review it soon.');
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to submit request';
      showError(message);
    } finally {
      setIsLoading(false);
    }
  };

  // Don't render if skillmap is not loaded yet or user not authenticated
  if (!skillmap || !skillmap._id || !isAuthenticated) return null;

  // ── PUBLISHED: show locked "Published" badge ──
  if (publishStatus === 'published') {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-white text-sm font-semibold shadow-sm" style={{ backgroundColor: skillColor }}>
        <CheckCircle className="w-4 h-4" />
        Published
      </div>
    );
  }

  // ── PENDING: show "Under Review" badge ──
  if (publishStatus === 'pending') {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
        <Clock className="w-4 h-4 text-amber-600" />
        <span className="text-sm font-semibold text-amber-700">Under Review</span>
      </div>
    );
  }

  // ── REJECTED: show "Not Approved" with optional resubmit ──
  if (publishStatus === 'rejected') {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
          <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span className="text-sm font-semibold text-red-700">Not Approved</span>
        </div>
        {!isFromTemplate && eligibility?.canSubmit && (
          <button
            onClick={handleSubmit}
            disabled={isLoading || isChecking}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: skillColor }}
          >
            <Upload className="w-4 h-4" />
            {isLoading ? 'Submitting...' : 'Resubmit'}
          </button>
        )}
      </div>
    );
  }

  // ── TEMPLATE: always show "cannot publish" regardless of quota ──
  if (isFromTemplate) {
    return (
      <div className="flex flex-col gap-1">
        <button disabled className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold shadow-sm opacity-50 cursor-not-allowed" style={{ backgroundColor: skillColor }}>
          <Upload className="w-4 h-4" />
          Publish
        </button>
        <p className="text-xs text-amber-600 font-medium">
          Template-based maps cannot be published
        </p>
      </div>
    );
  }

  // ── CHECKING eligibility ──
  if (isChecking) {
    return (
      <button disabled className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold shadow-sm opacity-50 cursor-not-allowed" style={{ backgroundColor: skillColor }}>
        <Upload className="w-4 h-4" />
        Checking...
      </button>
    );
  }

  // ── NOT ELIGIBLE (quota, pending, etc.) ──
  if (!eligibility?.canSubmit) {
    return (
      <div className="flex flex-col gap-1">
        <button disabled className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold shadow-sm opacity-50 cursor-not-allowed" style={{ backgroundColor: skillColor }}>
          <Upload className="w-4 h-4" />
          Publish
        </button>
        {eligibility?.reason && (
          <p className="text-xs text-red-600 font-medium">{eligibility.reason}</p>
        )}
      </div>
    );
  }

  // ── MINIMUM NODES CHECK ──
  const nodeCount = skillmap.nodeCount || 0;
  if (nodeCount < 5) {
    return (
      <div className="flex flex-col gap-1">
        <button disabled className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold shadow-sm opacity-50 cursor-not-allowed" style={{ backgroundColor: skillColor }}>
          <Upload className="w-4 h-4" />
          Publish
        </button>
        <p className="text-xs text-red-600 font-medium">
          Need {5 - nodeCount} more node{5 - nodeCount > 1 ? 's' : ''} (min. 5)
        </p>
      </div>
    );
  }

  // ── READY TO PUBLISH ──
  return (
    <button
      onClick={handleSubmit}
      disabled={isLoading}
      className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ backgroundColor: skillColor }}
    >
      <Upload className="w-4 h-4" />
      {isLoading ? 'Submitting...' : 'Publish'}
    </button>
  );
}

export default PublishRequestButton;
