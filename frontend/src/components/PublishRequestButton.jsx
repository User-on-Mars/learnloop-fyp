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
export function PublishRequestButton({ skillmap, actualNodeCount }) {
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

  // Button style constants - easy to modify
  const BUTTON_STYLES = {
    padding: 'px-4 py-2',
    textSize: 'text-sm',
    iconSize: 'w-4 h-4',
    gap: 'gap-2',
    rounded: 'rounded-lg'
  };

  // Message style constants - easy to modify
  const MESSAGE_STYLES = {
    textSize: 'text-xs',
    maxWidth: 'max-w-[240px]',
    wrap: 'break-words whitespace-normal'
  };

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
  }, [skillmap?._id, publishStatus, isFromTemplate, isAuthenticated]);

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

    const nodeCount = actualNodeCount != null ? actualNodeCount : (skillmap.nodeCount || 0);
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

  // ── DON'T SHOW BUTTON FOR TEMPLATE-BASED SKILL MAPS ──
  if (isFromTemplate) {
    return null;
  }

  // ── PUBLISHED: show clear "Published" badge ──
  if (publishStatus === 'published') {
    const buttonContent = (
      <div
        className={`flex items-center ${BUTTON_STYLES.gap} ${BUTTON_STYLES.padding} ${BUTTON_STYLES.rounded} text-white ${BUTTON_STYLES.textSize} font-semibold shadow-sm whitespace-nowrap`}
        style={{ backgroundColor: skillColor }}
      >
        <CheckCircle className={BUTTON_STYLES.iconSize} />
        Published
      </div>
    );

    return buttonContent;
  }

  // ── PENDING: show "Under Review" badge with message ──
  if (publishStatus === 'pending') {
    return (
      <div className="flex flex-col items-end gap-1 max-w-[240px] min-w-0">
        <div className={`flex items-center ${BUTTON_STYLES.gap} ${BUTTON_STYLES.padding} bg-amber-50 border border-amber-200 ${BUTTON_STYLES.rounded} whitespace-nowrap`}>
          <Clock className={BUTTON_STYLES.iconSize + ' text-amber-600'} />
          <span className={`${BUTTON_STYLES.textSize} font-semibold text-amber-700`}>Under Review</span>
        </div>
      </div>
    );
  }

  // ── REJECTED: show "Rejected" badge with resubmit button (if quota available) ──
  if (publishStatus === 'rejected') {
    // Check if user has quota remaining before showing resubmit button
    const canResubmit = !isFromTemplate && !isChecking && eligibility?.canSubmit;

    const statusBadge = (
      <div className={`flex items-center ${BUTTON_STYLES.gap} ${BUTTON_STYLES.padding} bg-red-50 border border-red-200 ${BUTTON_STYLES.rounded}`}>
        <svg className={`${BUTTON_STYLES.iconSize} text-red-600 shrink-0`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
        <span className={`${BUTTON_STYLES.textSize} font-semibold text-red-700 whitespace-nowrap`}>Rejected</span>
      </div>
    );

    const resubmitButton = canResubmit ? (
      <button
        onClick={handlePublishClick}
        disabled={isLoading || isChecking}
        className={`flex items-center ${BUTTON_STYLES.gap} ${BUTTON_STYLES.padding} ${BUTTON_STYLES.rounded} text-white ${BUTTON_STYLES.textSize} font-semibold shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap`}
        style={{ backgroundColor: skillColor }}
      >
        <Upload className={BUTTON_STYLES.iconSize} />
        {isLoading ? 'Sending...' : 'Resubmit'}
      </button>
    ) : null;

    // Show quota limit message if user can't resubmit
    let quotaMessage = null;
    if (!canResubmit && eligibility && !eligibility.canSubmit) {
      let daysRemaining = null;
      if (eligibility?.resetDate) {
        const resetDate = new Date(eligibility.resetDate);
        const now = new Date();
        const diffTime = resetDate - now;
        daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      const current = eligibility?.currentCount || 0;
      const max = eligibility?.maxCount || 1;
      const limitText = daysRemaining
        ? `${current}/${max} used (${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} left)`
        : `Limit: ${max} per 30 days`;

      quotaMessage = (
        <p className={`${MESSAGE_STYLES.textSize} text-red-600 font-medium ${MESSAGE_STYLES.maxWidth}`}>
          {limitText}
        </p>
      );
    }

    return (
      <>
        <div className="flex flex-col items-end gap-1 max-w-[240px] min-w-0">
          <div className="flex items-center gap-2">
            {statusBadge}
            {resubmitButton}
          </div>
          {quotaMessage}
        </div>
        {confirmModal}
      </>
    );
  }

  // ── TEMPLATE: always show "cannot publish" regardless of quota ──
  // This code is now unreachable since we return null for templates above
  // Keeping for reference in case logic changes
  if (isFromTemplate) {
    return null;
  }

  // ── CHECKING eligibility ──
  if (isChecking) {
    const buttonContent = (
      <button
        disabled
        className={`flex items-center ${BUTTON_STYLES.gap} ${BUTTON_STYLES.padding} ${BUTTON_STYLES.rounded} text-white ${BUTTON_STYLES.textSize} font-semibold shadow-sm opacity-50 cursor-not-allowed whitespace-nowrap`}
        style={{ backgroundColor: skillColor }}
      >
        <Upload className={BUTTON_STYLES.iconSize} />
        Checking...
      </button>
    );

    return buttonContent;
  }

  // ── NOT ELIGIBLE (quota, pending, etc.) ──
  if (!eligibility?.canSubmit) {
    // Calculate days remaining if resetDate is provided
    let shortReason = eligibility?.reason || '';
    let daysRemaining = null;

    if (eligibility?.resetDate) {
      const resetDate = new Date(eligibility.resetDate);
      const now = new Date();
      const diffTime = resetDate - now;
      daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    if (shortReason.includes('monthly submission limit')) {
      const current = eligibility?.currentCount || 0;
      const max = eligibility?.maxCount || 1;

      shortReason = daysRemaining
        ? `${current}/${max} used (${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} left)`
        : `Limit: ${max} per 30 days`;
    }

    const buttonContent = (
      <button
        disabled
        className={`flex items-center ${BUTTON_STYLES.gap} ${BUTTON_STYLES.padding} ${BUTTON_STYLES.rounded} text-white ${BUTTON_STYLES.textSize} font-semibold shadow-sm opacity-50 cursor-not-allowed whitespace-nowrap`}
        style={{ backgroundColor: skillColor }}
      >
        <Upload className={BUTTON_STYLES.iconSize} />
        Publish
      </button>
    );

    const messageContent = shortReason ? (
      <p className={`${MESSAGE_STYLES.textSize} text-red-600 font-medium text-right ${MESSAGE_STYLES.maxWidth} ${MESSAGE_STYLES.wrap}`}>
        {shortReason}
      </p>
    ) : null;

    return (
      <div className="flex flex-col items-end gap-1 max-w-[240px] min-w-0">
        {buttonContent}
        {messageContent}
      </div>
    );
  }

  // ── MINIMUM NODES CHECK ──
  const nodeCount = actualNodeCount != null ? actualNodeCount : (skillmap.nodeCount || 0);
  if (nodeCount < 5) {
    const buttonContent = (
      <button
        disabled
        className={`flex items-center ${BUTTON_STYLES.gap} ${BUTTON_STYLES.padding} ${BUTTON_STYLES.rounded} text-white ${BUTTON_STYLES.textSize} font-semibold shadow-sm cursor-not-allowed whitespace-nowrap`}
        style={{ backgroundColor: skillColor }}
      >
        <Upload className={BUTTON_STYLES.iconSize} />
        Publish
      </button>
    );

    const messageContent = (
      <p className={`${MESSAGE_STYLES.textSize} text-red-500 font-medium ${MESSAGE_STYLES.wrap} ${MESSAGE_STYLES.maxWidth}`}>
        Need {5 - nodeCount} more node{5 - nodeCount > 1 ? 's' : ''}
      </p>
    );

    return (
      <div className="flex flex-col items-end gap-1 max-w-[240px] min-w-0">
        {buttonContent}
        {messageContent}
      </div>
    );
  }

  // ── READY TO PUBLISH (but check eligibility one more time) ──
  if (eligibility && !eligibility.canSubmit) {
    // Calculate days remaining if resetDate is provided
    let shortReason = eligibility?.reason || '';
    let daysRemaining = null;

    if (eligibility?.resetDate) {
      const resetDate = new Date(eligibility.resetDate);
      const now = new Date();
      const diffTime = resetDate - now;
      daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    if (shortReason.includes('monthly submission limit')) {
      const current = eligibility?.currentCount || 0;
      const max = eligibility?.maxCount || 1;

      shortReason = daysRemaining
        ? `${current}/${max} used (${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} left)`
        : `Limit: ${max} per 30 days`;
    }

    const buttonContent = (
      <button
        disabled
        className={`flex items-center ${BUTTON_STYLES.gap} ${BUTTON_STYLES.padding} ${BUTTON_STYLES.rounded} text-white ${BUTTON_STYLES.textSize} font-semibold shadow-sm opacity-50 cursor-not-allowed whitespace-nowrap`}
        style={{ backgroundColor: skillColor }}
      >
        <Upload className={BUTTON_STYLES.iconSize} />
        Publish
      </button>
    );

    const messageContent = shortReason ? (
      <p className={`${MESSAGE_STYLES.textSize} text-red-600 font-medium text-right ${MESSAGE_STYLES.maxWidth} ${MESSAGE_STYLES.wrap}`}>
        {shortReason}
      </p>
    ) : null;

    return (
      <div className="flex flex-col items-end gap-1 max-w-[240px] min-w-0">
        {buttonContent}
        {messageContent}
      </div>
    );
  }

  // ── READY TO PUBLISH ──
  const buttonContent = (
    <button
      onClick={handlePublishClick}
      disabled={isLoading}
      className={`flex items-center ${BUTTON_STYLES.gap} ${BUTTON_STYLES.padding} ${BUTTON_STYLES.rounded} text-white ${BUTTON_STYLES.textSize} font-semibold shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap`}
      style={{ backgroundColor: skillColor }}
    >
      <Upload className={BUTTON_STYLES.iconSize} />
      {isLoading ? 'Sending...' : 'Publish'}
    </button>
  );

  return (
    <div className="max-w-[240px] min-w-0">
      {buttonContent}
      {confirmModal}
    </div>
  );
}

export default PublishRequestButton;
