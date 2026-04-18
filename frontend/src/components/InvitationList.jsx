import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Clock, User, CheckCircle, XCircle } from "lucide-react";
import { invitationsAPI } from "../api/client.ts";

export default function InvitationList({ invitations, onUpdate, isLoading }) {
  const navigate = useNavigate();
  const [processingId, setProcessingId] = useState(null);
  const [error, setError] = useState("");

  const handleAccept = async (invitationId) => {
    try {
      setProcessingId(invitationId);
      setError("");
      await invitationsAPI.acceptInvitation(invitationId);
      
      // Notify parent to refresh invitations
      if (onUpdate) {
        onUpdate();
      }
    } catch (err) {
      console.error("Failed to accept invitation:", err);
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
      
      // Notify parent to refresh invitations
      if (onUpdate) {
        onUpdate();
      }
    } catch (err) {
      console.error("Failed to decline invitation:", err);
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

    if (diffDays < 0) {
      return "Expired";
    } else if (diffDays === 0) {
      return "Expires today";
    } else if (diffDays === 1) {
      return "Expires tomorrow";
    } else {
      return `Expires in ${diffDays} days`;
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="bg-site-surface border border-site-border rounded-lg p-4 animate-pulse"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="h-5 w-48 bg-gray-200 rounded mb-2" />
                <div className="h-4 w-32 bg-gray-200 rounded mb-1" />
                <div className="h-4 w-28 bg-gray-200 rounded" />
              </div>
            </div>
            <div className="flex gap-2">
              <div className="flex-1 h-10 bg-gray-200 rounded-lg" />
              <div className="flex-1 h-10 bg-gray-200 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!invitations || invitations.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 bg-site-soft rounded-full flex items-center justify-center mx-auto mb-3">
          <Mail className="w-6 h-6 text-site-accent" />
        </div>
        <p className="text-site-muted">No pending invitations</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="p-3 bg-red-50 border border-red-300 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {invitations.map((invitation) => {
        const isProcessing = processingId === invitation._id;
        const expirationText = formatExpiration(invitation.expiresAt);
        const isExpired = expirationText === "Expired";

        return (
          <div
            key={invitation._id}
            className="bg-site-surface border border-site-border rounded-lg p-4 hover:shadow-sm transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="font-semibold text-site-ink mb-1">
                  {invitation.roomName || "Room Invitation"}
                </h3>
                <div className="flex items-center gap-2 text-sm text-site-muted mb-1">
                  <User className="w-3.5 h-3.5" />
                  <span>
                    Invited by {invitation.inviterName || invitation.invitedBy}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-site-muted">
                  <Clock className="w-3.5 h-3.5" />
                  <span className={isExpired ? "text-red-600" : ""}>
                    {expirationText}
                  </span>
                </div>
              </div>
            </div>

            {!isExpired && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleAccept(invitation._id)}
                  disabled={isProcessing}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-site-accent text-white rounded-lg font-medium hover:bg-site-accent-hover transition-colors disabled:opacity-50 text-sm"
                >
                  <CheckCircle className="w-4 h-4" />
                  {isProcessing ? "Accepting..." : "Accept"}
                </button>
                <button
                  onClick={() => handleDecline(invitation._id)}
                  disabled={isProcessing}
                  className="flex-1 flex items-center justify-center gap-2 py-2 border border-site-border text-site-muted rounded-lg font-medium hover:bg-site-bg transition-colors disabled:opacity-50 text-sm"
                >
                  <XCircle className="w-4 h-4" />
                  {isProcessing ? "Declining..." : "Decline"}
                </button>
              </div>
            )}

            {isExpired && (
              <div className="text-center py-2 text-sm text-red-600">
                This invitation has expired
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
