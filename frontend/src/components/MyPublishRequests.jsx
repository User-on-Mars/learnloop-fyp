import { useState, useEffect } from 'react';
import { publishRequestsAPI } from '../api/client';
import { PublishStatusBadge } from './PublishStatusBadge';
import { useToast } from '../context/ToastContext';
import { auth } from '../firebase';

/**
 * MyPublishRequests - Shows user's publish request history
 */
export function MyPublishRequests() {
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
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

  const handleCancel = async (requestId) => {
    if (!confirm('Cancel this publish request?')) return;

    try {
      await publishRequestsAPI.cancelRequest(requestId);
      showSuccess('Request cancelled');
      loadRequests();
    } catch (error) {
      console.error('Failed to cancel request:', error);
      showError('Failed to cancel request');
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-site-muted">
        Loading requests...
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="p-8 text-center text-site-muted">
        <p className="text-lg mb-2">No publish requests yet</p>
        <p className="text-sm">Submit a skillmap for publication to see it here</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-site-ink">My Publish Requests</h3>
      
      <div className="space-y-3">
        {requests.map((request) => (
          <div
            key={request._id}
            className="bg-site-surface border border-site-border rounded-lg p-4 hover:shadow-md transition"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h4 className="font-semibold text-site-ink">
                    {request.skillmap?.name || request.skillmapSnapshot?.name || 'Untitled'}
                  </h4>
                  <PublishStatusBadge status={request.status} />
                </div>
                
                <p className="text-sm text-site-muted mb-2">
                  Submitted: {new Date(request.submittedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>

                {request.skillmapSnapshot && (
                  <div className="text-xs text-site-muted">
                    {request.skillmapSnapshot.nodeCount} nodes · {request.skillmapSnapshot.completionPercentage}% complete
                  </div>
                )}

                {request.adminNote && (
                  <div className="mt-3 p-3 bg-site-bg border border-site-border rounded-lg">
                    <p className="text-xs font-semibold text-site-muted mb-1">
                      {request.status === 'approved' ? 'Admin Note' : 'Feedback'}
                    </p>
                    <p className="text-sm text-site-ink">{request.adminNote}</p>
                  </div>
                )}

                {request.reviewedAt && (
                  <p className="text-xs text-site-muted mt-2">
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
                  onClick={() => handleCancel(request._id)}
                  className="text-sm text-red-600 hover:text-red-700 font-medium"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default MyPublishRequests;
