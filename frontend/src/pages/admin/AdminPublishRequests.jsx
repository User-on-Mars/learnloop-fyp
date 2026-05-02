import { useState, useEffect } from 'react';
import { publishRequestsAPI } from '../../api/client';
import { PublishStatusBadge } from '../../components/PublishStatusBadge';
import { Button, GhostButton } from '../../components/Button';
import { useToast } from '../../context/ToastContext';
import { auth } from '../../firebase';
import { SkillIcon } from '../../components/IconPicker';
import { BookOpen, CheckCircle, Target, Clock, Calendar } from 'lucide-react';
import { generateAvatar } from '../../data/avatars';

/**
 * Parse avatar code like "ghost-dc2626" into an image URL
 */
function parseAvatarCode(avatarCode) {
  if (!avatarCode || avatarCode.startsWith('http')) return avatarCode || null;
  const lastDash = avatarCode.lastIndexOf('-');
  if (lastDash === -1) return null;
  const shapeId = avatarCode.substring(0, lastDash);
  const colorHex = '#' + avatarCode.substring(lastDash + 1);
  return generateAvatar(shapeId, colorHex) || null;
}

function UserAvatar({ user, skillColor = '#2e5023' }) {
  const userName = user?.name || 'Unknown';
  const avatarUrl = parseAvatarCode(user?.avatar);

  if (avatarUrl) {
    return <img src={avatarUrl} alt={userName} style={{ width: 40, height: 40 }} className="rounded-full object-cover ring-2 ring-white shadow-sm" />;
  }

  return (
    <div style={{ width: 40, height: 40, backgroundColor: skillColor }} className="rounded-full flex items-center justify-center text-white text-sm font-bold ring-2 ring-white shadow-sm">
      {userName.charAt(0).toUpperCase()}
    </div>
  );
}

export default function AdminPublishRequests() {
  const [activeTab, setActiveTab] = useState('pending');
  const [pendingRequests, setPendingRequests] = useState([]);
  const [historyRequests, setHistoryRequests] = useState([]);
  const [historyFilter, setHistoryFilter] = useState('all');
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPagination, setHistoryPagination] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [approvalNote, setApprovalNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => { setIsAuthenticated(!!user); });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      activeTab === 'pending' ? loadPendingRequests() : loadHistory();
    }
  }, [isAuthenticated, activeTab, historyFilter, historyPage]);

  const loadPendingRequests = async () => {
    try { setIsLoading(true); const r = await publishRequestsAPI.getPendingRequests(); setPendingRequests(r.data.requests || []); }
    catch { showError('Failed to load publish requests'); }
    finally { setIsLoading(false); }
  };

  const loadHistory = async () => {
    try { setIsLoading(true); const r = await publishRequestsAPI.getRequestHistory(historyFilter, historyPage, 10); setHistoryRequests(r.data.requests || []); setHistoryPagination(r.data.pagination || null); }
    catch { showError('Failed to load request history'); }
    finally { setIsLoading(false); }
  };

  const confirmApprove = async () => {
    if (!selectedRequest) return;
    try { setIsProcessing(true); await publishRequestsAPI.approveRequest(selectedRequest._id, approvalNote); showSuccess('Request approved! Template created.'); setShowApproveModal(false); setSelectedRequest(null); setApprovalNote(''); loadPendingRequests(); }
    catch { showError('Failed to approve request'); }
    finally { setIsProcessing(false); }
  };

  const confirmReject = async () => {
    if (!selectedRequest || !rejectReason.trim()) { showError('Please provide a rejection reason'); return; }
    try { setIsProcessing(true); await publishRequestsAPI.rejectRequest(selectedRequest._id, rejectReason); showSuccess('Request rejected. User has been notified.'); setShowRejectModal(false); setSelectedRequest(null); setRejectReason(''); loadPendingRequests(); }
    catch { showError('Failed to reject request'); }
    finally { setIsProcessing(false); }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  const renderRequestCard = (request, showActions = false) => {
    const snapshot = request.skillmapSnapshot || {};
    const skillmap = request.skillmap || snapshot;
    const nodes = request.nodes || [];
    const userName = request.user?.name || 'Unknown User';
    const userEmail = request.user?.email || '';
    const userInitial = userName.charAt(0).toUpperCase();
    const skillColor = skillmap?.color || snapshot?.color || '#2e5023';
    const skillIcon = skillmap?.icon || snapshot?.icon || 'Map';

    return (
      <div key={request._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
        {/* Skillmap header with color */}
        <div className="px-6 pt-5 pb-4" style={{ background: `linear-gradient(135deg, ${skillColor}08, ${skillColor}15)` }}>
          <div className="flex items-start justify-between mb-4">
            {/* User info */}
            <div className="flex items-center gap-3">
              <UserAvatar user={request.user} skillColor={skillColor} />
              <div>
                <p className="text-sm font-semibold text-gray-900">{userName}</p>
                <p className="text-xs text-gray-400">{userEmail}</p>
              </div>
            </div>
            <PublishStatusBadge status={request.status} />
          </div>

          {/* Skillmap title */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm" style={{ backgroundColor: skillColor }}>
              <SkillIcon name={skillIcon} size={22} className="text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-bold text-gray-900 truncate">{skillmap?.name || snapshot?.name || 'Untitled'}</h3>
              {skillmap?.description && <p className="text-xs text-gray-500 truncate mt-0.5">{skillmap.description}</p>}
            </div>
          </div>
        </div>

        <div className="px-6 pb-5">
          {/* Stats */}
          <div className="flex flex-wrap items-center gap-2 py-3 border-b border-gray-50">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 rounded-lg text-xs text-gray-600 font-medium">
              <BookOpen className="w-3 h-3" /> {snapshot?.nodeCount || nodes.length || 0} nodes
            </span>
            {skillmap?.goal && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 rounded-lg text-xs text-gray-600 font-medium">
                <Target className="w-3 h-3" /> {skillmap.goal}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 text-xs text-gray-400 ml-auto">
              <Calendar className="w-3 h-3" /> {formatDate(request.submittedAt)}
            </span>
          </div>

          {/* Nodes */}
          {nodes.length > 0 && (
            <div className="pt-3 pb-1">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Learning Path</p>
              <div className="space-y-1">
                {nodes.map((node, i) => (
                  <div key={node._id || i} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-gray-50/70">
                    <span className="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center text-white shrink-0" style={{ backgroundColor: skillColor }}>
                      {i + 1}
                    </span>
                    <span className="text-sm text-gray-700 truncate flex-1">{node.title}</span>
                    {node.status === 'Completed' && <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Admin note */}
          {request.adminNote && (
            <div className={`mt-3 rounded-lg p-3 ${request.status === 'approved' ? 'bg-green-50 border border-green-100' : 'bg-red-50 border border-red-100'}`}>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{request.status === 'approved' ? 'Approval Note' : 'Rejection Reason'}</p>
              <p className="text-sm text-gray-700">{request.adminNote}</p>
            </div>
          )}

          {request.reviewedAt && (
            <p className="flex items-center gap-1.5 text-xs text-gray-400 mt-3"><Clock className="w-3 h-3" /> Reviewed {formatDate(request.reviewedAt)}</p>
          )}

          {/* Actions */}
          {showActions && (
            <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100">
              <button onClick={() => { setSelectedRequest(request); setApprovalNote(''); setShowApproveModal(true); }}
                className="flex-1 py-2.5 text-sm font-semibold rounded-xl text-white transition-colors" style={{ backgroundColor: skillColor }}>
                Approve
              </button>
              <button onClick={() => { setSelectedRequest(request); setRejectReason(''); setShowRejectModal(true); }}
                className="flex-1 py-2.5 text-sm font-semibold rounded-xl text-red-600 border border-red-200 hover:bg-red-50 transition-colors">
                Reject
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Publish Requests</h1>
        <p className="text-sm text-gray-500">Review and manage user-submitted skillmaps</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-gray-100">
        {['pending', 'history'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize ${activeTab === tab ? 'border-site-accent text-site-accent' : 'border-transparent text-gray-400 hover:text-gray-700'}`}>
            {tab}
            {tab === 'pending' && pendingRequests.length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[10px] font-bold">{pendingRequests.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* History filter */}
      {activeTab === 'history' && (
        <div className="flex items-center gap-2 mb-4">
          {['all', 'approved', 'rejected', 'pending'].map(f => (
            <button key={f} onClick={() => { setHistoryFilter(f); setHistoryPage(1); }}
              className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors capitalize ${historyFilter === f ? 'bg-site-accent text-white border-site-accent' : 'bg-white text-gray-500 border-gray-200 hover:border-site-accent'}`}>
              {f}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="text-center text-gray-400 py-16">
          <div className="w-6 h-6 border-2 border-site-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Loading...
        </div>
      ) : (activeTab === 'pending' ? pendingRequests : historyRequests).length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-16 text-center">
          <p className="text-gray-400 mb-1">{activeTab === 'pending' ? 'No pending requests' : 'No request history'}</p>
          <p className="text-xs text-gray-300">{activeTab === 'pending' ? 'All caught up!' : 'Reviewed requests will appear here.'}</p>
        </div>
      ) : (
        <div className="space-y-5">
          {(activeTab === 'pending' ? pendingRequests : historyRequests).map(r => renderRequestCard(r, activeTab === 'pending'))}
        </div>
      )}

      {/* Pagination for history */}
      {activeTab === 'history' && historyPagination && historyPagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
            disabled={historyPage <= 1}
            className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          {Array.from({ length: historyPagination.totalPages }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              onClick={() => setHistoryPage(p)}
              className={`w-8 h-8 text-sm font-medium rounded-lg transition-colors ${
                p === historyPage ? 'bg-site-accent text-white' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => setHistoryPage(p => Math.min(historyPagination.totalPages, p + 1))}
            disabled={historyPage >= historyPagination.totalPages}
            className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}

      {/* Approve Modal */}
      {showApproveModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-3">Approve Request</h3>
            <p className="text-sm text-gray-500 mb-4">Publish "<strong>{selectedRequest.skillmap?.name}</strong>" as a template and notify <strong>{selectedRequest.user?.name}</strong>.</p>
            <textarea value={approvalNote} onChange={e => setApprovalNote(e.target.value)} placeholder="Optional note for the user..." className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-site-accent/30 focus:border-site-accent text-sm mb-4" rows={3} />
            <div className="flex gap-3">
              <Button onClick={confirmApprove} disabled={isProcessing} className="flex-1 py-2.5">{isProcessing ? 'Approving...' : 'Approve'}</Button>
              <GhostButton onClick={() => { setShowApproveModal(false); setSelectedRequest(null); }} disabled={isProcessing} className="flex-1 py-2.5">Cancel</GhostButton>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-3">Reject Request</h3>
            <p className="text-sm text-gray-500 mb-4">Provide a reason for rejecting "<strong>{selectedRequest.skillmap?.name}</strong>" by <strong>{selectedRequest.user?.name}</strong>.</p>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Rejection reason (sent to user)..." className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 text-sm mb-4" rows={4} required />
            <div className="flex gap-3">
              <button onClick={confirmReject} disabled={isProcessing || !rejectReason.trim()} className="flex-1 py-2.5 text-sm font-semibold rounded-xl text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors">{isProcessing ? 'Rejecting...' : 'Reject'}</button>
              <GhostButton onClick={() => { setShowRejectModal(false); setSelectedRequest(null); }} disabled={isProcessing} className="flex-1 py-2.5">Cancel</GhostButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
