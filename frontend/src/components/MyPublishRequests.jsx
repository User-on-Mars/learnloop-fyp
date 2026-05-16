import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { publishRequestsAPI } from '../api/client';
import { PublishStatusBadge } from './PublishStatusBadge';
import { useToast } from '../context/ToastContext';
import { auth } from '../firebase';
import { ChevronLeft, ChevronRight, Upload, AlertTriangle } from 'lucide-react';

const PER_PAGE = 5;

/**
 * MyPublishRequests - Shows user's publish request history with pagination
 */
export function MyPublishRequests() {
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [page, setPage] = useState(1);
  const [cancellingId, setCancellingId] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const { showSuccess, showError } = useToast();

  // Monitor authentication state
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setIsAuthenticated(!!user);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadRequests();
    }
  }, [isAuthenticated]);

  const loadRequests = async () => {
    try {
      setIsLoading(true);
      const response = await publishRequestsAPI.getMyRequests();
      setRequests(response.data.requests || []);
    } catch (error) {
      console.error('Failed to load requests:', error);
      showError('Failed to load publish requests');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelClick = (request) => {
    setCancelTarget(request);
    setShowCancelModal(true);
  };

  const handleConfirmCancel = async () => {
    if (!cancelTarget) return;
    setShowCancelModal(false);
    setCancellingId(cancelTarget._id);

    try {
      await publishRequestsAPI.cancelRequest(cancelTarget._id);
      showSuccess('Publish request cancelled');
      loadRequests();
    } catch (error) {
      console.error('Failed to cancel request:', error);
      showError('Failed to cancel request');
    } finally {
      setCancellingId(null);
      setCancelTarget(null);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-[#e2e6dc] overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-[#e8ece3] flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
            <Upload className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#1c1f1a]">My Publish Requests</h2>
            <p className="text-[11px] text-[#9aa094]">Track your submitted skill maps</p>
          </div>
        </div>
        <div className="p-8 text-center text-[#9aa094]">
          Loading requests...
        </div>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#e2e6dc] overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-[#e8ece3] flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
            <Upload className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#1c1f1a]">My Publish Requests</h2>
            <p className="text-[11px] text-[#9aa094]">Track your submitted skill maps</p>
          </div>
        </div>
        <div className="p-8 text-center">
          <p className="text-sm text-[#9aa094]">No publish requests yet</p>
          <p className="text-xs text-[#c8cec0] mt-1">Submit a skill map for publication to see it here</p>
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(requests.length / PER_PAGE);
  const paged = requests.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <>
      <div className="bg-white rounded-2xl border border-[#e2e6dc] overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-[#e8ece3] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
              <Upload className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#1c1f1a]">My Publish Requests</h2>
              <p className="text-[11px] text-[#9aa094]">Track your submitted skill maps</p>
            </div>
          </div>
          <span className="text-xs text-[#9aa094] font-medium">{requests.length} request{requests.length !== 1 ? 's' : ''}</span>
        </div>

        <div className="divide-y divide-[#f0f2eb]">
          {paged.map((request) => (
            <div key={request._id} className="p-5 hover:bg-[#fafcf8] transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1.5">
                    <h4 className="font-bold text-sm text-[#1c1f1a] truncate">
                      {request.skillmap?.name || request.skillmapSnapshot?.name || 'Untitled'}
                    </h4>
                    <PublishStatusBadge status={request.status} />
                  </div>

                  <p className="text-xs text-[#9aa094] mb-1">
                    Submitted: {new Date(request.submittedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>

                  {request.skillmapSnapshot && (
                    <p className="text-xs text-[#9aa094]">
                      {request.skillmapSnapshot.nodeCount} nodes · {request.skillmapSnapshot.completionPercentage}% complete
                    </p>
                  )}

                  {request.adminNote && (
                    <div className="mt-3 p-3 bg-[#f8faf6] border border-[#e2e6dc] rounded-xl">
                      <p className="text-[10px] font-bold text-[#9aa094] uppercase tracking-wide mb-1">
                        {request.status === 'approved' ? 'Admin Note' : 'Feedback'}
                      </p>
                      <p className="text-sm text-[#1c1f1a]">{request.adminNote}</p>
                    </div>
                  )}

                  {request.reviewedAt && (
                    <p className="text-[11px] text-[#c8cec0] mt-2">
                      Reviewed: {new Date(request.reviewedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  )}
                </div>

                {request.status === 'pending' && (
                  <button
                    onClick={() => handleCancelClick(request)}
                    disabled={cancellingId === request._id}
                    className="text-sm text-red-500 hover:text-red-600 font-semibold hover:bg-red-50 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {cancellingId === request._id ? 'Cancelling...' : 'Cancel'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-[#e8ece3] flex items-center justify-between">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 text-xs text-[#9aa094] hover:text-[#1c1f1a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            <span className="text-xs text-[#9aa094]">
              Page <span className="font-bold text-[#1c1f1a]">{page}</span> of <span className="font-bold text-[#1c1f1a]">{totalPages}</span>
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-1 text-xs text-[#9aa094] hover:text-[#1c1f1a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50" onClick={(e) => { if (e.target === e.currentTarget) { setShowCancelModal(false); setCancelTarget(null); } }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-500 to-rose-500 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Cancel Publish Request</h2>
                  <p className="text-white/70 text-xs">This action cannot be undone</p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="px-5 py-5">
              <p className="text-sm text-[#565c52]">
                Are you sure you want to cancel the publish request for{' '}
                <span className="font-semibold text-[#1c1f1a]">
                  {cancelTarget?.skillmap?.name || cancelTarget?.skillmapSnapshot?.name || 'this skill map'}
                </span>?
                You can submit a new request later.
              </p>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-[#e2e6dc] flex gap-3">
              <button
                onClick={() => { setShowCancelModal(false); setCancelTarget(null); }}
                className="flex-1 py-3 min-h-[44px] rounded-xl font-semibold text-sm border border-[#e2e6dc] text-[#565c52] hover:bg-[#f4f7f2] transition-all"
              >
                Keep Request
              </button>
              <button
                onClick={handleConfirmCancel}
                className="flex-1 py-3 min-h-[44px] rounded-xl font-semibold text-sm bg-gradient-to-r from-red-600 to-rose-600 text-white hover:from-red-700 hover:to-rose-700 transition-all"
              >
                Cancel Request
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

export default MyPublishRequests;
