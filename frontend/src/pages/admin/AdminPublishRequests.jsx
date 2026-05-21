import { useState, useEffect } from 'react';
import { publishRequestsAPI } from '../../api/client';
import { PublishStatusBadge } from '../../components/PublishStatusBadge';
import { Button, GhostButton } from '../../components/Button';
import { useToast } from '../../context/ToastContext';
import { auth } from '../../firebase';
import { SkillIcon } from '../../components/IconPicker';
import { BookOpen, CheckCircle, Target, Clock, Calendar, X } from 'lucide-react';
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
  const [pendingPage, setPendingPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [detailRequest, setDetailRequest] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [approvalNote, setApprovalNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { showSuccess, showError } = useToast();

  const ITEMS_PER_PAGE = 4; // 2 columns × 2 rows

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => { setIsAuthenticated(!!user); });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      if (activeTab === 'pending') {
        loadPendingRequests();
        setPendingPage(1); // Reset to first page when switching to pending
      } else {
        loadHistory();
        setHistoryPage(1); // Reset to first page when switching to history or changing filter
      }
    }
  }, [isAuthenticated, activeTab, historyFilter]);

  const loadPendingRequests = async () => {
    try {
      setIsLoading(true);
      const r = await publishRequestsAPI.getPendingRequests();
      setPendingRequests(r.data.requests || []);
      setPendingPage(1); // Reset to first page
    }
    catch { showError('Failed to load publish requests'); }
    finally { setIsLoading(false); }
  };

  const loadHistory = async () => {
    try {
      setIsLoading(true);
      // For history, we use API pagination with larger page size to handle client-side pagination
      const r = await publishRequestsAPI.getRequestHistory(historyFilter, 1, 100); // Get more items
      setHistoryRequests(r.data.requests || []);
    }
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

  const getNodeList = (request) => {
    if (request.nodes?.length) return request.nodes;
    if (request.skillmapSnapshot?.nodes?.length) return request.skillmapSnapshot.nodes;
    return [];
  };

  const renderRequestSummaryCard = (request) => {
    const snapshot = request.skillmapSnapshot || {};
    const skillmap = request.skillmap || snapshot;
    const skillColor = skillmap?.color || snapshot?.color || '#2e5023';
    const skillIcon = skillmap?.icon || snapshot?.icon || 'Map';
    const userName = request.user?.name || 'Unknown User';
    const userEmail = request.user?.email || '';
    const nodeList = getNodeList(request);
    const nodeCount = nodeList.length || snapshot?.nodeCount || 0;

    return (
      <button
        key={request._id}
        type="button"
        onClick={() => setDetailRequest(request)}
        className="group text-left bg-white rounded-3xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-200 p-4 flex flex-col gap-3 min-h-[140px]"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <UserAvatar user={request.user} skillColor={skillColor} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{skillmap?.name || snapshot?.name || 'Untitled Skill Map'}</p>
              <p className="text-[11px] text-gray-500 truncate">{userName} · {userEmail}</p>
            </div>
          </div>
          <PublishStatusBadge status={request.status} />
        </div>

        <div className="flex flex-wrap gap-2 text-xs text-gray-500">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
            <BookOpen className="w-3.5 h-3.5" />
            {nodeCount} node{nodeCount !== 1 ? 's' : ''}
          </span>
          {(skillmap?.goal || snapshot?.goal) && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-50 text-purple-700">
              <Target className="w-3.5 h-3.5" />
              {skillmap?.goal || snapshot?.goal}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between text-[11px] text-gray-400">
          <span>{formatDate(request.submittedAt)}</span>
          <span className="text-site-accent font-semibold">View details</span>
        </div>
      </button>
    );
  };

  const renderRequestDetailModal = (request) => {
    if (!request) return null;

    const snapshot = request.skillmapSnapshot || {};
    const skillmap = request.skillmap || snapshot;
    const skillColor = skillmap?.color || snapshot?.color || '#2e5023';
    const skillIcon = skillmap?.icon || snapshot?.icon || 'Map';
    const nodeList = getNodeList(request);

    return (
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-start justify-center overflow-auto p-4">
        <div className="relative w-full max-w-5xl rounded-[2rem] bg-white shadow-2xl overflow-hidden">
          <button
            type="button"
            onClick={() => setDetailRequest(null)}
            className="absolute top-4 right-4 rounded-full p-2 bg-white shadow-sm text-gray-600 hover:text-gray-900 transition"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="p-6 xl:p-8 space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:pr-10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: skillColor }}>
                  <SkillIcon name={skillIcon} size={22} className="text-white" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-xl lg:text-2xl font-bold text-gray-900 truncate">{skillmap?.name || snapshot?.name || 'Untitled Skill Map'}</h2>
                  <p className="text-sm text-gray-500">Submitted by {request.user?.name || 'Unknown User'} · {request.user?.email || 'No email'}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <PublishStatusBadge status={request.status} />
              </div>
            </div>

            {(skillmap?.description || snapshot?.description) && (
              <div className="rounded-3xl border border-gray-100 bg-gray-50 p-4">
                <p className="text-sm text-gray-700 leading-6">{skillmap?.description || snapshot?.description}</p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <div className="rounded-3xl border border-gray-100 p-4 bg-white">
                <p className="text-xs uppercase text-gray-400 tracking-[0.25em] mb-2">Nodes</p>
                <p className="text-3xl font-semibold text-gray-900">{nodeList.length || snapshot?.nodeCount || 0}</p>
                <p className="text-xs text-gray-500 mt-2">Total learning steps in this request</p>
              </div>
              <div className="rounded-3xl border border-gray-100 p-4 bg-white">
                <p className="text-xs uppercase text-gray-400 tracking-[0.25em] mb-2">Goal</p>
                <p className="text-sm font-semibold text-gray-900">{skillmap?.goal || snapshot?.goal || 'No goal set'}</p>
              </div>
              <div className="rounded-3xl border border-gray-100 p-4 bg-white">
                <p className="text-xs uppercase text-gray-400 tracking-[0.25em] mb-2">Submitted</p>
                <p className="text-sm font-semibold text-gray-900">{formatDate(request.submittedAt)}</p>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs uppercase text-slate-400 tracking-[0.25em]">Full node view</p>
                <p className="text-xs text-slate-500">{nodeList.length} item{nodeList.length !== 1 ? 's' : ''}</p>
              </div>
              <div className="space-y-2">
                {nodeList.length ? nodeList.map((node, index) => (
                  <div key={node._id || index} className="flex items-center gap-3 p-3 rounded-3xl border border-slate-200 bg-slate-50">
                    <div className="w-9 h-9 rounded-2xl flex items-center justify-center bg-site-accent text-white text-sm font-semibold shadow-sm">{index + 1}</div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{node.title || node.name || 'Untitled node'}</p>
                      {(node.description || node.details) && (
                        <p className="text-xs text-slate-500 truncate">{node.description || node.details}</p>
                      )}
                    </div>
                  </div>
                )) : (
                  <div className="rounded-3xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
                    No node details available for this request.
                  </div>
                )}
              </div>
            </div>

            {request.status === 'pending' && (
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-end">
                <button onClick={() => { setSelectedRequest(request); setShowApproveModal(true); }}
                  className="w-full xl:w-auto px-5 py-3 rounded-3xl bg-site-accent text-white font-semibold hover:bg-site-accent-hover transition">
                  Approve
                </button>
                <button onClick={() => { setSelectedRequest(request); setShowRejectModal(true); }}
                  className="w-full xl:w-auto px-5 py-3 rounded-3xl bg-red-50 text-red-700 font-semibold border border-red-200 hover:bg-red-100 transition">
                  Reject
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderRequestCard = (request, showActions = false) => {
    const snapshot = request.skillmapSnapshot || {};
    const skillmap = request.skillmap || snapshot;
    const nodes = request.nodes || [];
    const userName = request.user?.name || 'Unknown User';
    const userEmail = request.user?.email || '';
    const userInitial = userName.charAt(0).toUpperCase();
    const skillColor = skillmap?.color || snapshot?.color || '#2e5023';
    const skillIcon = skillmap?.icon || snapshot?.icon || 'Map';

    // Use snapshot nodeCount if nodes array is empty (skillmap was deleted)
    const nodeCount = nodes.length > 0 ? nodes.length : (snapshot?.nodeCount || 0);
    const hasNodes = nodes.length > 0;

    return (
      <div key={request._id} className="bg-white rounded-2xl border border-gray-200 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden group hover:scale-[1.02] flex flex-col h-full">
        {/* Skillmap header with color */}
        <div className="px-4 pt-4 pb-3" style={{ background: `linear-gradient(135deg, ${skillColor}15, ${skillColor}25)` }}>
          <div className="flex items-start justify-between mb-2">
            {/* User info */}
            <div className="flex items-center gap-2">
              <UserAvatar user={request.user} skillColor={skillColor} />
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">{userName}</p>
                <p className="text-[10px] text-gray-500 truncate">{userEmail}</p>
              </div>
            </div>
            <PublishStatusBadge status={request.status} />
          </div>

          {/* Skillmap title */}
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-md" style={{ backgroundColor: skillColor }}>
              <SkillIcon name={skillIcon} size={20} className="text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-gray-900 line-clamp-2 leading-tight">{skillmap?.name || snapshot?.name || 'Untitled'}</h3>
            </div>
          </div>
        </div>

        <div className="px-4 pb-4 flex-1 flex flex-col">
          {/* Description */}
          {(skillmap?.description || snapshot?.description) && (
            <p className="text-xs text-gray-600 line-clamp-1 mb-2 leading-relaxed">{skillmap?.description || snapshot?.description}</p>
          )}

          {/* Stats */}
          <div className="flex flex-wrap items-center gap-2 py-2 border-y border-gray-100 mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg text-xs text-blue-700 font-semibold">
              <BookOpen className="w-3.5 h-3.5" /> {nodeCount} node{nodeCount !== 1 ? 's' : ''}
            </span>
            {(skillmap?.goal || snapshot?.goal) && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg text-xs text-purple-700 font-semibold">
                <Target className="w-3.5 h-3.5" /> {skillmap?.goal || snapshot?.goal}
              </span>
            )}
          </div>

          {/* Date info */}
          <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
            <Calendar className="w-3.5 h-3.5" />
            <span>Submitted {formatDate(request.submittedAt)}</span>
          </div>

          {/* Nodes preview - show first 3 if available */}
          {hasNodes ? (
            <div className="mb-2 flex-1">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Learning Path Preview</p>
              <div className="space-y-1">
                {nodes.slice(0, 3).map((node, i) => (
                  <div key={node._id || i} className="flex items-center gap-2 px-2 py-1 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                    <span className="w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center text-white shrink-0" style={{ backgroundColor: skillColor }}>
                      {i + 1}
                    </span>
                    <span className="text-xs text-gray-700 truncate flex-1">{node.title}</span>
                    {node.status === 'Completed' && <CheckCircle className="w-3 h-3 text-green-500 shrink-0" />}
                  </div>
                ))}
                {nodes.length > 3 && (
                  <p className="text-[10px] text-gray-400 text-center py-0.5">+{nodes.length - 3} more node{nodes.length - 3 !== 1 ? 's' : ''}</p>
                )}
              </div>
            </div>
          ) : nodeCount > 0 ? (
            <div className="mb-2 flex-1">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Learning Path</p>
              <div className="px-2.5 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-center">
                <BookOpen className="w-5 h-5 text-amber-500 mx-auto mb-1.5" />
                <p className="text-xs text-amber-700 font-medium">Contains {nodeCount} learning node{nodeCount !== 1 ? 's' : ''}</p>
                <p className="text-[9px] text-amber-600 mt-0.5">Original skill map may have been modified</p>
              </div>
            </div>
          ) : null}

          {/* Admin note */}
          {request.adminNote && (
            <div className={`mb-2 rounded-lg p-2.5 ${request.status === 'approved' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">{request.status === 'approved' ? '✓ Approval Note' : '✗ Rejection Reason'}</p>
              <p className="text-xs text-gray-700 leading-relaxed">{request.adminNote}</p>
            </div>
          )}

          {request.reviewedAt && (
            <p className="flex items-center gap-1.5 text-[10px] text-gray-400 mb-2">
              <Clock className="w-3 h-3" /> Reviewed {formatDate(request.reviewedAt)}
            </p>
          )}

          {/* Actions */}
          {showActions && (
            <div className="flex items-center gap-2 mt-auto pt-2 border-t border-gray-100">
              <button onClick={() => { setSelectedRequest(request); setApprovalNote(''); setShowApproveModal(true); }}
                className="flex-1 py-2 text-sm font-bold rounded-xl text-white transition-all hover:shadow-lg transform hover:-translate-y-0.5" style={{ backgroundColor: skillColor }}>
                ✓ Approve
              </button>
              <button onClick={() => { setSelectedRequest(request); setRejectReason(''); setShowRejectModal(true); }}
                className="flex-1 py-2 text-sm font-bold rounded-xl text-red-600 bg-red-50 border-2 border-red-200 hover:bg-red-100 transition-all hover:shadow-lg transform hover:-translate-y-0.5">
                ✗ Reject
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-1">Publish Requests</h1>
              <p className="text-sm text-gray-500">Review and manage user-submitted skillmaps</p>
            </div>
            {activeTab === 'pending' && pendingRequests.length > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl">
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                <span className="text-sm font-semibold text-amber-700">{pendingRequests.length} pending</span>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1">
            {['pending', 'history'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-5 py-2.5 text-sm font-semibold rounded-lg transition-all capitalize ${activeTab === tab ? 'bg-site-accent text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* History filter */}
        {activeTab === 'history' && (
          <div className="flex items-center gap-2 mb-6">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider mr-2">Filter:</span>
            {['all', 'approved', 'rejected', 'pending'].map(f => (
              <button key={f} onClick={() => { setHistoryFilter(f); setHistoryPage(1); }}
                className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-all capitalize ${historyFilter === f ? 'bg-site-accent text-white border-site-accent shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-site-accent hover:shadow-sm'}`}>
                {f}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="text-center text-gray-400 py-24">
            <div className="w-8 h-8 border-3 border-site-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm font-medium">Loading requests...</p>
          </div>
        ) : (activeTab === 'pending' ? pendingRequests : historyRequests).length === 0 ? (
          <div className="bg-white border-2 border-dashed border-gray-200 rounded-3xl p-20 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-lg font-semibold text-gray-400 mb-1">{activeTab === 'pending' ? 'No pending requests' : 'No request history'}</p>
            <p className="text-sm text-gray-300">{activeTab === 'pending' ? 'All caught up! New requests will appear here.' : 'Reviewed requests will appear here.'}</p>
          </div>
        ) : (
          <>
            {/* 2-column grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {(() => {
                const allItems = activeTab === 'pending' ? pendingRequests : historyRequests;
                const currentPage = activeTab === 'pending' ? pendingPage : historyPage;
                const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
                const endIdx = startIdx + ITEMS_PER_PAGE;
                const pageItems = allItems.slice(startIdx, endIdx);

                return pageItems.map(r => renderRequestSummaryCard(r));
              })()}
            </div>

            {/* Pagination */}
            {(() => {
              const allItems = activeTab === 'pending' ? pendingRequests : historyRequests;
              const currentPage = activeTab === 'pending' ? pendingPage : historyPage;
              const totalPages = Math.ceil(allItems.length / ITEMS_PER_PAGE);

              if (totalPages <= 1) return null;

              const setPage = activeTab === 'pending' ? setPendingPage : setHistoryPage;

              return (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    className="px-4 py-2 text-sm font-semibold rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                  >
                    Previous
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`w-10 h-10 text-sm font-semibold rounded-xl transition-all ${
                          p === currentPage ? 'bg-site-accent text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className="px-4 py-2 text-sm font-semibold rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                  >
                    Next
                  </button>
                </div>
              );
            })()}
          </>
        )}
      </div>

      {detailRequest && renderRequestDetailModal(detailRequest)}

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
