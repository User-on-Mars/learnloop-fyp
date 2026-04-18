import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Bell, CheckCircle, XCircle, Clock, Users, X, CheckCheck } from "lucide-react";
import { invitationsAPI } from "../api/client.ts";

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [error, setError] = useState("");
  const [readIds, setReadIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("notif_read_ids") || "[]");
    } catch {
      return [];
    }
  });
  const bellRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await invitationsAPI.getNotifications();
      const notifs = res.data.notifications || [];
      setNotifications(notifs);

      const unread = notifs.filter(
        (n) => !readIds.includes(n._id) && (n.status === "pending" ? new Date(n.expiresAt) > new Date() : true)
      ).length;
      setUnreadCount(unread);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
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

  const handleMarkAllRead = () => {
    const allIds = notifications.map((n) => n._id);
    persistReadIds(allIds);
    setUnreadCount(0);
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
    return d.toLocaleDateString();
  };

  // Calculate dropdown position based on bell button
  const getDropdownStyle = () => {
    if (!bellRef.current) return { top: 8, left: 248 };
    const rect = bellRef.current.getBoundingClientRect();
    return {
      top: rect.bottom + 8,
      left: rect.left,
    };
  };

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
            className="fixed w-80 bg-site-surface rounded-xl shadow-2xl border border-site-border overflow-hidden"
            style={{ ...getDropdownStyle(), zIndex: 9999 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-site-border">
              <h3 className="font-semibold text-site-ink text-sm">Notifications</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="flex items-center gap-1 text-xs text-site-accent hover:text-site-accent-hover font-medium transition-colors"
                    title="Mark all as read"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 text-site-muted hover:text-site-ink rounded transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="max-h-96 overflow-y-auto">
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
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="w-8 h-8 text-site-border mx-auto mb-2" />
                  <p className="text-sm text-site-muted">No notifications</p>
                  <p className="text-xs text-site-faint mt-1">You're all caught up</p>
                </div>
              ) : (
                <div className="py-1">
                  {notifications.map((inv) => {
                    const isProcessing = processingId === inv._id;
                    const roomName = inv.room?.name || "Unknown Room";
                    const inviterName = inv.invitedByUser?.name || "Someone";
                    const isRead = readIds.includes(inv._id);
                    const isPending = inv.status === "pending" && new Date(inv.expiresAt) > new Date();
                    const isAccepted = inv.status === "accepted";
                    const isDeclined = inv.status === "declined";
                    const isExpired = inv.status === "pending" && new Date(inv.expiresAt) <= new Date();

                    return (
                      <div
                        key={inv._id}
                        className={`px-4 py-3 border-b border-site-border/50 last:border-b-0 transition-colors ${
                          isRead ? "bg-transparent" : "bg-site-accent/5"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
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
                            <p className="text-sm text-site-ink">
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
                              <div className="flex gap-2 mt-2">
                                <button
                                  onClick={() => handleAccept(inv._id)}
                                  disabled={isProcessing}
                                  className="flex items-center gap-1 px-3 py-1.5 bg-site-accent text-white rounded-lg text-xs font-medium hover:bg-site-accent-hover transition-colors disabled:opacity-50"
                                >
                                  <CheckCircle className="w-3 h-3" />
                                  {isProcessing ? "..." : "Accept"}
                                </button>
                                <button
                                  onClick={() => handleDecline(inv._id)}
                                  disabled={isProcessing}
                                  className="flex items-center gap-1 px-3 py-1.5 border border-site-border text-site-muted rounded-lg text-xs font-medium hover:bg-site-bg transition-colors disabled:opacity-50"
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
        className="relative p-2 rounded-lg text-site-muted hover:bg-site-bg hover:text-site-ink transition-colors"
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
    </div>
  );
}
