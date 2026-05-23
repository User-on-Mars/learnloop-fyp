import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { Bell, CheckCircle, XCircle, Clock, Users, X, CheckCheck, Sparkles, AlertCircle, ExternalLink, Award } from "lucide-react";
import { invitationsAPI, notificationsAPI } from "../api/client.ts";
import { useAdmin } from "../hooks/useAdmin";

export default function NotificationBell() {
  const [invitations, setInvitations] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [error, setError] = useState("");
  const [showAdminSwitchConfirm, setShowAdminSwitchConfirm] = useState(false);
  const [pendingAdminNotif, setPendingAdminNotif] = useState(null);
  const [readIds, setReadIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("notif_read_ids") || "[]");
    } catch {
      return [];
    }
  });
  const bellRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useAdmin();

  /**
   * Get the redirect path for a notification based on its type and data.
   * Returns null for non-clickable notifications.
   */
  const getNotificationLink = (notif) => {
    const data = notif.data || {};
    switch (notif.type) {
      // Room-related: go to the specific room if we have the ID, otherwise rooms list
      case 'room_invitation_received':
        return '/roomspace';
      case 'room_invitation_accepted':
      case 'room_invitation_declined':
        return data.roomId ? `/roomspace/${data.roomId}` : '/roomspace';
      case 'room_member_kicked':
      case 'room_deleted':
        return '/roomspace';

      // Publish request outcomes: user goes to their skill maps
      case 'publish_request_approved':
      case 'publish_request_rejected':
      case 'published_template_removed':
        return '/skills';

      // Admin-only: new publish request → admin review page
      case 'new_publish_request':
        return isAdmin ? '/admin/publish-requests' : '/dashboard';

      // Subscription & payment
      case 'subscription_upgraded':
      case 'subscription_canceled':
      case 'payment_receipt':
        return '/subscription';

      // Leaderboard reward
      case 'weekly_reward_won':
        return '/leaderboard';

      default:
        return null;
    }
  };

  /**
   * Handle clicking on a notification — mark as read and navigate.
   */
  const handleNotificationClick = async (notif) => {
    const link = getNotificationLink(notif);
    if (!link) return;

    const isAdminPanel = location.pathname.startsWith('/admin');

    // If navigating to admin panel from outside admin, ask for confirmation first
    if (link.startsWith('/admin') && !isAdminPanel) {
      setPendingAdminNotif(notif);
      setShowAdminSwitchConfirm(true);
      return;
    }

    // Mark as read
    if (!notif.read) {
      try {
        await notificationsAPI.markAsRead(notif._id);
      } catch (err) {
        console.error("Failed to mark notification as read:", err);
      }
    }

    setIsOpen(false);
    navigate(link);
  };

  const handleConfirmAdminSwitch = async () => {
    if (!pendingAdminNotif) return;
    const link = getNotificationLink(pendingAdminNotif);

    // Mark as read
    if (!pendingAdminNotif.read) {
      try {
        await notificationsAPI.markAsRead(pendingAdminNotif._id);
      } catch (err) {
        console.error("Failed to mark notification as read:", err);
      }
    }

    setShowAdminSwitchConfirm(false);
    setPendingAdminNotif(null);
    setIsOpen(false);
    navigate(link);
  };

  const handleCancelAdminSwitch = () => {
    setShowAdminSwitchConfirm(false);
    setPendingAdminNotif(null);
  };

  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Fetch both invitations and general notifications
      const [invitationsRes, notificationsRes] = await Promise.all([
        invitationsAPI.getInvitations().catch(e => { console.error("Invitations fetch error:", e); return { data: { invitations: [] } }; }),
        notificationsAPI.getNotifications(50).catch(e => { console.error("Notifications fetch error:", e); return { data: { notifications: [] } }; })
      ]);
      
      const invites = invitationsRes.data.invitations || invitationsRes.data || [];
      const notifs = notificationsRes.data.notifications || [];
      
      setInvitations(invites);
      setNotifications(notifs);

      // Calculate unread count: unread invitations + unread notifications
      const unreadInvites = invites.filter(
        (n) => !readIds.includes(n._id) && (n.status === "pending" ? new Date(n.expiresAt) > new Date() : true)
      ).length;
      
      const unreadNotifs = notifs.filter(n => !n.read).length;
      
      setUnreadCount(unreadInvites + unreadNotifs);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
      setInvitations([]);
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  }, [readIds]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const persistReadIds = (ids) => {
    setReadIds(ids);
    localStorage.setItem("notif_read_ids", JSON.stringify(ids));
  };

  const handleMarkAllRead = async () => {
    try {
      // Mark all invitations as read (local storage)
      const allInviteIds = invitations.map((n) => n._id);
      persistReadIds(allInviteIds);
      
      // Mark all general notifications as read (API)
      await notificationsAPI.markAllAsRead();
      
      setUnreadCount(0);
      await fetchNotifications();
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const handleAccept = async (invitationId) => {
    try {
      setProcessingId(invitationId);
      setError("");
      await invitationsAPI.acceptInvitation(invitationId);
      const newReadIds = [...readIds, invitationId];
      persistReadIds(newReadIds);
      await fetchNotifications();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to accept invitation");
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecline = async (invitationId) => {
    try {
      setProcessingId(invitationId);
      setError("");
      await invitationsAPI.declineInvitation(invitationId);
      const newReadIds = [...readIds, invitationId];
      persistReadIds(newReadIds);
      await fetchNotifications();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to decline invitation");
    } finally {
      setProcessingId(null);
    }
  };

  const handleDismissNotification = async (notificationId) => {
    try {
      await notificationsAPI.deleteNotification(notificationId);
      await fetchNotifications();
    } catch (err) {
      console.error("Failed to dismiss notification:", err);
    }
  };

  const formatExpiration = (expiresAt) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffMs = expiry - now;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return "Expired";
    if (diffDays === 0) return "Expires today";
    if (diffDays === 1) return "Expires tomorrow";
    return `Expires in ${diffDays} days`;
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const d = new Date(date);
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  /**
   * Get the redirect path for an invitation notification.
   * Returns null for non-clickable states.
   */
  const getInvitationLink = (inv) => {
    if (inv.status === 'accepted' && inv.room?._id) {
      return `/roomspace/${inv.room._id}`;
    }
    return '/roomspace';
  };

  /**
   * Handle clicking on an invitation notification — mark as read and navigate.
   */
  const handleInvitationClick = (inv) => {
    // Don't navigate for pending invitations (they have Accept/Decline buttons)
    if (inv.status === 'pending' && new Date(inv.expiresAt) > new Date()) return;

    const link = getInvitationLink(inv);
    if (!link) return;

    if (!readIds.includes(inv._id)) {
      const newReadIds = [...readIds, inv._id];
      persistReadIds(newReadIds);
    }

    setIsOpen(false);
    navigate(link);
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'publish_request_approved':
        return <Sparkles className="w-4 h-4 text-green-600" />;
      case 'publish_request_rejected':
        return <AlertCircle className="w-4 h-4 text-orange-600" />;
      case 'published_template_removed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'new_publish_request':
        return <Sparkles className="w-4 h-4 text-indigo-600" />;
      case 'weekly_reward_won':
        return <Award className="w-4 h-4 text-yellow-600" />;
      case 'subscription_upgraded':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'subscription_canceled':
        return <XCircle className="w-4 h-4 text-gray-500" />;
      default:
        return <Bell className="w-4 h-4 text-teal-600" />;
    }
  };

  // Calculate dropdown position based on bell button
  const getDropdownStyle = () => {
    if (!bellRef.current) return { top: 8, right: 8 };
    const rect = bellRef.current.getBoundingClientRect();
    return {
      top: rect.bottom + 8,
      right: Math.max(8, window.innerWidth - rect.right),
    };
  };

  // Combine and sort all notifications by date
  const allNotifications = [
    ...invitations.map(inv => ({ ...inv, notifType: 'invitation' })),
    ...notifications.map(notif => ({ ...notif, notifType: 'general' }))
  ].sort((a, b) => {
    const dateA = new Date(a.createdAt || a.submittedAt);
    const dateB = new Date(b.createdAt || b.submittedAt);
    return dateB - dateA;
  });

  const dropdown = isOpen
    ? createPortal(
        <>
          {/* Invisible backdrop to catch clicks outside */}
          <div
            className="fixed inset-0"
            style={{ zIndex: 9998 }}
            onClick={() => setIsOpen(false)}
          />
          {/* Dropdown panel */}
          <div
            className="fixed left-3 right-3 top-[calc(env(safe-area-inset-top)+4.75rem)] max-h-[min(32rem,calc(100dvh-9rem))] bg-site-surface rounded-2xl shadow-2xl border border-site-border overflow-hidden sm:left-auto sm:right-auto sm:top-auto sm:w-96"
            style={{ ...(window.innerWidth < 640 ? {} : getDropdownStyle()), zIndex: 9999 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-site-border bg-white/95">
              <div className="min-w-0">
                <h3 className="font-semibold text-site-ink text-base sm:text-sm">Notifications</h3>
                {unreadCount > 0 && (
                  <p className="text-xs text-site-muted mt-0.5">{unreadCount} unread</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="min-h-9 inline-flex items-center gap-1 rounded-lg bg-site-accent/10 px-2.5 text-xs text-site-accent hover:text-site-accent-hover font-medium transition-colors"
                    title="Mark all as read"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span className="hidden min-[380px]:inline">Mark all read</span>
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="min-w-10 min-h-10 w-10 h-10 flex items-center justify-center text-site-muted hover:text-site-ink rounded-lg hover:bg-site-bg transition-colors"
                  aria-label="Close notifications"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="max-h-[calc(min(32rem,100dvh-9rem)-4.25rem)] overflow-y-auto bg-[#fbfcfa] sm:bg-site-surface">
              {error && (
                <div className="mx-3 mt-3 p-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
                  {error}
                </div>
              )}

              {isLoading ? (
                <div className="p-6 text-center">
                  <div className="w-6 h-6 border-2 border-site-accent border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-xs text-site-muted">Loading...</p>
                </div>
              ) : allNotifications.length === 0 ? (
                <div className="px-6 py-10 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-site-bg">
                    <Bell className="w-6 h-6 text-site-border" />
                  </div>
                  <p className="text-sm font-semibold text-site-ink">No notifications</p>
                  <p className="text-xs text-site-muted mt-1">You're all caught up</p>
                </div>
              ) : (
                <div className="space-y-2 p-3 sm:space-y-0 sm:p-0">
                  {allNotifications.map((item) => {
                    if (item.notifType === 'invitation') {
                      // Render invitation notification
                      const inv = item;
                      const isProcessing = processingId === inv._id;
                      const roomName = inv.room?.name || "Unknown Room";
                      const inviterName = inv.invitedByUser?.name || "Someone";
                      const isRead = readIds.includes(inv._id);
                      const isPending = inv.status === "pending" && new Date(inv.expiresAt) > new Date();
                      const isAccepted = inv.status === "accepted";
                      const isDeclined = inv.status === "declined";
                      const isExpired = inv.status === "pending" && new Date(inv.expiresAt) <= new Date();
                      const isClickable = !isPending;

                      return (
                        <div
                          key={inv._id}
                          onClick={() => isClickable && handleInvitationClick(inv)}
                          role={isClickable ? "button" : undefined}
                          tabIndex={isClickable ? 0 : undefined}
                          onKeyDown={(e) => { if (isClickable && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); handleInvitationClick(inv); } }}
                          className={`rounded-xl border px-3 py-3 shadow-sm transition-colors sm:rounded-none sm:border-x-0 sm:border-t-0 sm:shadow-none sm:px-4 ${
                            isRead ? "bg-white border-site-border/70 sm:bg-transparent" : "bg-site-accent/5 border-site-accent/20"
                          } ${isClickable ? "cursor-pointer hover:bg-site-accent/10" : ""}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-9 h-9 sm:w-8 sm:h-8 rounded-xl sm:rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                              isAccepted ? "bg-green-50" : isDeclined ? "bg-red-50" : isExpired ? "bg-gray-100" : "bg-teal-50"
                            }`}>
                              {isAccepted ? (
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              ) : isDeclined ? (
                                <XCircle className="w-4 h-4 text-red-500" />
                              ) : (
                                <Users className="w-4 h-4 text-teal-600" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm leading-5 text-site-ink">
                                <span className="font-semibold">{inviterName}</span>
                                {" invited you to "}
                                <span className="font-semibold">{roomName}</span>
                              </p>

                              {isAccepted && (
                                <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-green-50 text-green-700 rounded-full text-xs font-medium">
                                  <CheckCircle className="w-3 h-3" />
                                  Accepted
                                </span>
                              )}
                              {isDeclined && (
                                <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-red-50 text-red-600 rounded-full text-xs font-medium">
                                  <XCircle className="w-3 h-3" />
                                  Declined
                                </span>
                              )}
                              {isExpired && (
                                <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs font-medium">
                                  <Clock className="w-3 h-3" />
                                  Expired
                                </span>
                              )}

                              <div className="flex items-center gap-1 mt-1">
                                <Clock className="w-3 h-3 text-site-faint" />
                                <span className="text-xs text-site-faint">
                                  {isPending ? formatExpiration(inv.expiresAt) : formatTimeAgo(inv.updatedAt || inv.createdAt)}
                                </span>
                              </div>

                              {isPending && (
                                <div className="grid grid-cols-2 gap-2 mt-3">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleAccept(inv._id); }}
                                    disabled={isProcessing}
                                    className="min-h-9 flex items-center justify-center gap-1 px-3 py-1.5 bg-site-accent text-white rounded-lg text-xs font-medium hover:bg-site-accent-hover transition-colors disabled:opacity-50"
                                  >
                                    <CheckCircle className="w-3 h-3" />
                                    {isProcessing ? "..." : "Accept"}
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDecline(inv._id); }}
                                    disabled={isProcessing}
                                    className="min-h-9 flex items-center justify-center gap-1 px-3 py-1.5 border border-site-border text-site-muted rounded-lg text-xs font-medium hover:bg-site-bg transition-colors disabled:opacity-50"
                                  >
                                    <XCircle className="w-3 h-3" />
                                    {isProcessing ? "..." : "Decline"}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    } else {
                      // Render general notification
                      const notif = item;
                      const isRead = notif.read;
                      const notifLink = getNotificationLink(notif);
                      const isClickable = !!notifLink;

                      return (
                        <div
                          key={notif._id}
                          onClick={() => isClickable && handleNotificationClick(notif)}
                          role={isClickable ? "button" : undefined}
                          tabIndex={isClickable ? 0 : undefined}
                          onKeyDown={(e) => { if (isClickable && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); handleNotificationClick(notif); } }}
                          className={`rounded-xl border px-3 py-3 shadow-sm transition-colors sm:rounded-none sm:border-x-0 sm:border-t-0 sm:shadow-none sm:px-4 ${
                            isRead ? "bg-white border-site-border/70 sm:bg-transparent" : "bg-site-accent/5 border-site-accent/20"
                          } ${isClickable ? "cursor-pointer hover:bg-site-accent/10" : ""}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-9 h-9 sm:w-8 sm:h-8 rounded-xl sm:rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                              notif.type === 'publish_request_approved' ? "bg-green-50" :
                              notif.type === 'publish_request_rejected' ? "bg-orange-50" :
                              notif.type === 'published_template_removed' ? "bg-red-50" :
                              notif.type === 'new_publish_request' ? "bg-indigo-50" :
                              notif.type === 'weekly_reward_won' ? "bg-yellow-50" :
                              "bg-teal-50"
                            }`}>
                              {getNotificationIcon(notif.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold leading-5 text-site-ink">{notif.title}</p>
                              <p className="text-xs leading-5 text-site-muted mt-0.5">{notif.message}</p>

                              <div className="flex flex-wrap items-center justify-between gap-2 mt-2">
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-site-faint" />
                                  <span className="text-xs text-site-faint">
                                    {formatTimeAgo(notif.createdAt)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {isClickable && (
                                    <span className="min-h-7 inline-flex items-center gap-1 rounded-md bg-site-accent/10 px-2 text-xs font-medium text-site-accent">
                                      <ExternalLink className="w-3 h-3" />
                                      View
                                    </span>
                                  )}
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDismissNotification(notif._id); }}
                                    className="min-h-7 rounded-md px-2 text-xs text-site-muted hover:text-site-ink hover:bg-site-bg transition-colors"
                                  >
                                    Dismiss
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }
                  })}
                </div>
              )}
            </div>
          </div>
        </>,
        document.body
      )
    : null;

  return (
    <div className="relative">
      <button
        ref={bellRef}
        onClick={() => setIsOpen(!isOpen)}
        className="relative min-w-[44px] min-h-[44px] w-11 h-11 rounded-lg text-site-muted hover:bg-site-bg hover:text-site-ink transition-colors flex items-center justify-center"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      {dropdown}
      {showAdminSwitchConfirm && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) handleCancelAdminSwitch(); }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 border border-[#e2e6dc]">
            <div className="flex flex-col items-center text-center">
              <svg className="w-12 h-12 text-[#2e5023]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              <h3 className="text-lg font-bold text-site-ink mt-4 mb-2">Switch to Admin Panel?</h3>
              <p className="text-site-muted text-sm mb-4">
                This will take you to the admin panel to review the publish request.
              </p>
              <div className="flex gap-3 w-full">
                <button onClick={handleCancelAdminSwitch} className="flex-1 py-2.5 border border-[#e2e6dc] text-site-muted rounded-lg font-medium hover:bg-[#f5f7f2] transition-colors">No</button>
                <button onClick={handleConfirmAdminSwitch} className="flex-1 py-2.5 bg-[#2e5023] text-white rounded-lg font-medium hover:bg-[#3a6b2e] transition-colors">Yes</button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
