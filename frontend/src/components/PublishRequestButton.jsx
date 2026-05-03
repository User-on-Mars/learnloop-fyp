import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { publishRequestsAPI } from '../api/client';
import { Upload, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
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
  const [showConfirm, setShowConfirm] = useState(false);
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

  const handlePublishClick = () => {
    if (!skillmap) return;

    if (publishStatus === 'published') {
      showError('This skill map has already been published.');
      return;
    }

    if (publishStatus === 'pending') {
      showError('This skill map already has a pending publish request.');
      return;
    }

    if (isFromTemplate) {
      showError('Template-based skill maps cannot be published. Only original skill maps can be submitted.');
      return;
    }

    const nodeCount = skillmap.nodeCount || 0;
    if (nodeCount < 5) {
      showError(`Skill map must have at least 5 nodes. Currently has ${nodeCount}. Add ${5 - nodeCount} more node${5 - nodeCount > 1 ? 's' : ''} to publish.`);
      return;
    }

    setShowConfirm(true);
  };

  const handleConfirmPublish = async () => {
    setShowConfirm(false);
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

  // Confirmation modal rendered via portal to cover sidebar, navbar, and details panel
  const confirmModal = showConfirm ? createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: skillColor + '15' }}>
            <AlertTriangle className="w-6 h-6" style={{ color: skillColor }} />
          </div>
          <h3 className="text-lg font-bold text-[#1c1f1a] mb-2">
            {publishStatus === 'rejected' ? 'Resubmit this skill map?' : 'Publish this skill map?'}
          </h3>
          <p className="text-sm text-[#6b7260] mb-6">
            Your skill map <span className="font-semibold text-[#1c1f1a]">{skillmap?.name}</span>{' '}
            {publishStatus === 'rejected'
              ? 'will be resubmitted for review.'
              : 'will be submitted for review. Once approved, it will be available as a template for other users.'}
          </p>
          <div className="flex gap-3 w-full">
            <button
              onClick={() => setShowConfirm(false)}
              className="flex-1 py-2.5 px-4 border-2 border-[#e2e6dc] text-[#565c52] rounded-xl font-semibold text-sm hover:bg-[#f4f7f2] transition-colors"
            >
              No
            </button>
            <button
              onClick={handleConfirmPublish}
              disabled={isLoading}
              className="flex-1 py-2.5 px-4 text-white rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
              style={{ backgroundColor: skillColor }}
            >
              {isLoading ? 'Submitting...' : (publishStatus === 'rejected' ? 'Resubmit' : 'Publish')}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  // Don't render if skillmap is not loaded yet or user not authenticated
  if (!skillmap || !skillmap._id || !isAuthenticated) return null;

  // ── PUBLISHED: show clear "Published" badge with message ──
  if (publishStatus === 'published') {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold shadow-sm" style={{ backgroundColor: skillColor }}>
          <CheckCircle className="w-4 h-4" />
          Published
        </div>
        <p className="text-xs text-green-700 font-medium">
          This skill map has been published as a template
        </p>
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

  // ── REJECTED: show "Not Approved" badge with compact resubmit ──
  if (publishStatus === 'rejected') {
    const canResubmit = !isFromTemplate && !isChecking;
    return (
      <>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
            <svg className="w-4 h-4 text-red-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span className="text-sm font-semibold text-red-700 whitespace-nowrap">Not Approved</span>
          </div>
          {canResubmit && (
            <button
              onClick={handlePublishClick}
              disabled={isLoading || isChecking}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-white text-sm font-semibold shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              style={{ backgroundColor: skillColor }}
            >
              <Upload className="w-3.5 h-3.5" />
              {isLoading ? 'Submitting...' : 'Resubmit'}
            </button>
          )}
        </div>
        {confirmModal}
      </>
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
    <>
      <button
        onClick={handlePublishClick}
        disabled={isLoading}
        className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ backgroundColor: skillColor }}
      >
        <Upload className="w-4 h-4" />
        {isLoading ? 'Submitting...' : 'Publish'}
      </button>
      {confirmModal}
    </>
  );
}

export default PublishRequestButton;
