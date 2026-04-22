import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Users,
  Crown,
  Settings,
  UserPlus,
  Plus,
  Trash2,
  LogOut,
  BookOpen,
  UserMinus,
  X,
  CheckCircle,
  ChevronRight,
} from "lucide-react";
import { roomsAPI, invitationsAPI, skillsAPI } from "../api/client.ts";
import { auth } from "../firebase";
import Sidebar from "../components/Sidebar";
import RoomLeaderboard from "../components/RoomLeaderboard";
import ConfirmationDialog from "../components/ConfirmationDialog";
import { SkillIcon } from "../components/IconPicker";
import { useToast } from "../context/ToastContext";
import { useApiError } from "../hooks/useApiError";
import { useSubscription } from "../context/SubscriptionContext";

export default function RoomDetail() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const currentUserId = auth.currentUser?.uid;

  const [room, setRoom] = useState(null);
  const [members, setMembers] = useState([]);
  const [skillMaps, setSkillMaps] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [showEditModal, setShowEditModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showAddSkillMapModal, setShowAddSkillMapModal] = useState(false);
  
  // Confirmation dialog states
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    type: null, // 'delete', 'leave', 'kick', 'removeSkillMap'
    title: "",
    message: "",
    confirmText: "",
    targetData: null, // stores additional data like member info, skill map info
    requiresTyping: false, // for delete room confirmation
    typingValue: "" // expected value to type
  });

  const { showSuccess, showError } = useToast();
  const { handleApiError } = useApiError();
  const { limits } = useSubscription();
  const maxMembers = limits?.maxRoomMembers === -1 ? Infinity : (limits?.maxRoomMembers ?? 3);
  const isRoomFull = members.length >= maxMembers;

  const isOwner = members.some(m => m.userId === currentUserId && m.role === 'owner');

  // Helper functions for showing confirmation dialogs
  const showDeleteRoomConfirm = () => {
    setConfirmDialog({
      isOpen: true,
      type: 'delete',
      title: "Delete Room",
      message: `This will permanently delete "${room?.name}" and remove all members. This action cannot be undone.\n\nType "CONFIRM" to proceed.`,
      confirmText: "Delete Room",
      targetData: null,
      requiresTyping: true,
      typingValue: "CONFIRM"
    });
  };

  const showLeaveRoomConfirm = () => {
    setConfirmDialog({
      isOpen: true,
      type: 'leave',
      title: "Leave Room",
      message: "Are you sure you want to leave this room? You will need to be re-invited to join again.",
      confirmText: "Leave Room",
      targetData: null
    });
  };

  const showKickMemberConfirm = (member) => {
    setConfirmDialog({
      isOpen: true,
      type: 'kick',
      title: "Kick Member",
      message: `Are you sure you want to remove ${member.username || 'this user'} from the room? They will need to be re-invited to join again.`,
      confirmText: "Remove Member",
      targetData: member
    });
  };

  const showRemoveSkillMapConfirm = (skillMap) => {
    const smName = skillMap.name || skillMap.skillMap?.name || 'this skill map';
    setConfirmDialog({
      isOpen: true,
      type: 'removeSkillMap',
      title: "Remove Skill Map",
      message: `Are you sure you want to remove "${smName}" from the room? This will remove the skill map but retain member progress data.`,
      confirmText: "Remove Skill Map",
      targetData: skillMap
    });
  };

  const closeConfirmDialog = () => {
    setConfirmDialog({
      isOpen: false,
      type: null,
      title: "",
      message: "",
      confirmText: "",
      targetData: null,
      requiresTyping: false,
      typingValue: ""
    });
  };

  const fetchRoomData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");

      const [roomRes, membersRes, skillMapsRes] = await Promise.all([
        roomsAPI.getRoom(roomId),
        roomsAPI.getMembers(roomId),
        roomsAPI.getSkillMaps(roomId),
      ]);

      // Backend returns room directly in data, not wrapped in { room: ... }
      setRoom(roomRes.data);
      setMembers(membersRes.data.members || []);
      setSkillMaps(skillMapsRes.data.skillMaps || skillMapsRes.data || []);
    } catch (err) {
      console.error("Failed to fetch room data:", err);
      setError(err.response?.data?.message || "Failed to load room");
    } finally {
      setIsLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    fetchRoomData();
  }, [fetchRoomData]);

  const handleLeaveRoom = async () => {
    try {
      await roomsAPI.leaveRoom(roomId);
      showSuccess("Left Room", "You have successfully left the room");
      navigate("/roomspace");
    } catch (err) {
      handleApiError(err, {
        title: "Failed to Leave Room",
        defaultMessage: "Unable to leave the room. Please try again.",
        showRetry: true,
        onRetry: handleLeaveRoom,
        context: { operation: 'leaveRoom', roomId }
      });
    }
  };

  const handleDeleteRoom = async () => {
    try {
      await roomsAPI.deleteRoom(roomId);
      showSuccess("Room Deleted", "The room has been permanently deleted");
      navigate("/roomspace");
    } catch (err) {
      handleApiError(err, {
        title: "Failed to Delete Room",
        defaultMessage: "Unable to delete the room. Please try again.",
        showRetry: true,
        onRetry: handleDeleteRoom,
        context: { operation: 'deleteRoom', roomId }
      });
    }
  };

  const handleKickMember = async (member) => {
    try {
      await roomsAPI.kickMember(roomId, member.userId);
      showSuccess("Member Removed", `${member.username || 'User'} has been removed from the room`);
      // Refresh room data to update member list
      fetchRoomData();
    } catch (err) {
      handleApiError(err, {
        title: "Failed to Remove Member",
        defaultMessage: "Unable to remove the member. Please try again.",
        showRetry: true,
        onRetry: () => handleKickMember(member),
        context: { operation: 'kickMember', roomId, targetUserId: member.userId }
      });
    }
  };

  const handleRemoveSkillMap = async (skillMap) => {
    const smName = skillMap.name || skillMap.skillMap?.name || 'Skill map';
    try {
      // Use _id for the room skill map record
      await roomsAPI.removeSkillMap(roomId, skillMap._id);
      showSuccess("Skill Map Removed", `"${smName}" has been removed from the room`);
      fetchRoomData();
    } catch (err) {
      handleApiError(err, {
        title: "Failed to Remove Skill Map",
        defaultMessage: "Unable to remove the skill map. Please try again.",
        showRetry: true,
        onRetry: () => handleRemoveSkillMap(skillMap),
        context: { operation: 'removeSkillMap', roomId, roomSkillMapId: skillMap._id }
      });
    }
  };

  // Handle confirmation dialog actions
  const handleConfirmAction = async () => {
    const { type, targetData } = confirmDialog;
    
    switch (type) {
      case 'delete':
        await handleDeleteRoom();
        break;
      case 'leave':
        await handleLeaveRoom();
        break;
      case 'kick':
        await handleKickMember(targetData);
        break;
      case 'removeSkillMap':
        await handleRemoveSkillMap(targetData);
        break;
      default:
        console.warn('Unknown confirmation type:', type);
    }
    
    closeConfirmDialog();
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-site-bg">
        <Sidebar />
        <main className="flex-1 overflow-y-auto w-full">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Back Button Skeleton */}
            <div className="h-6 w-32 bg-gray-200 rounded-md animate-pulse mb-6" />

            {/* Room Header Skeleton */}
            <div className="bg-site-surface rounded-xl shadow-sm border border-site-border p-6 mb-6 animate-pulse">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-8 w-48 bg-gray-200 rounded-md" />
                    <div className="h-6 w-16 bg-gray-200 rounded-md" />
                  </div>
                  <div className="h-4 w-64 bg-gray-200 rounded-md mb-3" />
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gray-200 rounded" />
                    <div className="h-4 w-20 bg-gray-200 rounded" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="w-10 h-10 bg-gray-200 rounded-lg" />
                  <div className="w-20 h-10 bg-gray-200 rounded-lg" />
                </div>
              </div>
            </div>

            {/* Leaderboard Skeleton */}
            <div className="bg-site-surface rounded-xl shadow-sm border border-site-border p-6 mb-6 animate-pulse">
              <div className="h-6 w-32 bg-gray-200 rounded-md mb-4" />
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 p-4 rounded-lg bg-site-bg"
                  >
                    <div className="w-8 h-8 bg-gray-200 rounded-full" />
                    <div className="w-10 h-10 bg-gray-200 rounded-full" />
                    <div className="flex-1">
                      <div className="h-4 w-32 bg-gray-200 rounded mb-2" />
                      <div className="h-3 w-24 bg-gray-200 rounded" />
                    </div>
                    <div className="h-6 w-16 bg-gray-200 rounded" />
                  </div>
                ))}
              </div>
            </div>

            {/* Skill Maps Skeleton */}
            <div className="bg-site-surface rounded-xl shadow-sm border border-site-border p-6 mb-6 animate-pulse">
              <div className="flex items-center justify-between mb-4">
                <div className="h-6 w-24 bg-gray-200 rounded-md" />
                <div className="h-8 w-28 bg-gray-200 rounded-lg" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="p-4 rounded-lg border border-site-border"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="h-5 w-32 bg-gray-200 rounded mb-1" />
                        <div className="h-4 w-16 bg-gray-200 rounded" />
                      </div>
                      <div className="w-4 h-4 bg-gray-200 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Members Skeleton */}
            <div className="bg-site-surface rounded-xl shadow-sm border border-site-border p-6 animate-pulse">
              <div className="h-6 w-20 bg-gray-200 rounded-md mb-4" />
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-full" />
                      <div>
                        <div className="h-4 w-24 bg-gray-200 rounded mb-1" />
                        <div className="h-3 w-16 bg-gray-200 rounded" />
                      </div>
                    </div>
                    <div className="w-8 h-8 bg-gray-200 rounded-lg" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Error state
  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-site-bg">
        <Sidebar />
        <main className="flex-1 overflow-y-auto w-full">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <button
              onClick={() => navigate("/roomspace")}
              className="flex items-center gap-2 text-site-muted hover:text-site-ink mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to RoomSpace
            </button>
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-site-accent mx-auto mb-4" />
                <p className="text-site-muted">Loading room...</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex min-h-screen bg-site-bg">
        <Sidebar />
        <main className="flex-1 overflow-y-auto w-full">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <button
              onClick={() => navigate("/roomspace")}
              className="flex items-center gap-2 text-site-muted hover:text-site-ink mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to RoomSpace
            </button>
            <div className="bg-red-50 border border-red-300 text-red-700 p-6 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <h3 className="font-semibold mb-2">Unable to Load Room</h3>
                  <p className="text-sm mb-4">{error}</p>
                  <div className="flex gap-3">
                    <button
                      onClick={fetchRoomData}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                    >
                      Try Again
                    </button>
                    <button
                      onClick={() => navigate("/roomspace")}
                      className="px-4 py-2 border border-red-300 text-red-700 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
                    >
                      Back to RoomSpace
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // If no room data after loading, show error
  if (!room) {
    return (
      <div className="flex min-h-screen bg-site-bg">
        <Sidebar />
        <main className="flex-1 overflow-y-auto w-full">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <button
              onClick={() => navigate("/roomspace")}
              className="flex items-center gap-2 text-site-muted hover:text-site-ink mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to RoomSpace
            </button>
            <div className="bg-red-50 border border-red-300 text-red-700 p-6 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <h3 className="font-semibold mb-2">Room Not Found</h3>
                  <p className="text-sm mb-4">This room does not exist or you don't have access to it.</p>
                  <button
                    onClick={() => navigate("/roomspace")}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                  >
                    Back to RoomSpace
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-site-bg">
      <Sidebar />

      <main className="flex-1 overflow-y-auto w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Back Button */}
          <button
            onClick={() => navigate("/roomspace")}
            className="flex items-center gap-2 text-site-muted hover:text-site-ink mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to RoomSpace
          </button>

          {/* Room Header */}
          <div className="bg-site-surface rounded-xl shadow-sm border border-site-border p-6 mb-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold text-site-ink break-words">{room.name}</h1>
                  {isOwner && (
                    <span className="flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-600 rounded-md text-xs font-medium">
                      <Crown className="w-3 h-3" />
                      Owner
                    </span>
                  )}
                </div>
                {room.description && (
                  <p className="text-site-muted break-words overflow-hidden">{room.description}</p>
                )}
                <div className="flex items-center gap-2 mt-3">
                  <Users className="w-4 h-4 text-site-muted" />
                  <span className="text-sm text-site-muted">
                    {members.length} {members.length === 1 ? "member" : "members"}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                {isOwner ? (
                  <>
                    <button
                      onClick={() => setShowEditModal(true)}
                      className="p-2 text-site-muted hover:text-site-ink hover:bg-site-bg rounded-lg transition-colors"
                      title="Edit room"
                    >
                      <Settings className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setShowInviteModal(true)}
                      disabled={isRoomFull}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
                        isRoomFull
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-site-accent text-white hover:bg-site-accent-hover'
                      }`}
                      title={isRoomFull ? `Room is full (${members.length}/${maxMembers === Infinity ? '∞' : maxMembers} members)` : 'Invite a member'}
                    >
                      <UserPlus className="w-4 h-4" />
                      {isRoomFull ? 'Room Full' : 'Invite'}
                    </button>
                    <button
                      onClick={showDeleteRoomConfirm}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete room"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={showLeaveRoomConfirm}
                    className="flex items-center gap-2 px-4 py-2 border border-site-border text-site-muted rounded-lg font-medium hover:bg-site-bg transition-colors text-sm"
                  >
                    <LogOut className="w-4 h-4" />
                    Leave Room
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Leaderboard Section */}
          <div className="bg-site-surface rounded-xl shadow-sm border border-site-border p-6 mb-6">
            <h2 className="text-lg font-semibold text-site-ink mb-4">Leaderboard</h2>
            <RoomLeaderboard roomId={roomId} currentUserId={currentUserId} />
          </div>

          {/* Skill Maps Section */}
          <div className="bg-site-surface rounded-xl shadow-sm border border-site-border p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-site-ink">Skill Maps</h2>
                {skillMaps.length > 0 && (
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    skillMaps.length >= 6
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-site-soft text-site-muted'
                  }`}>
                    {skillMaps.length}/6
                  </span>
                )}
              </div>
              {isOwner && (
                <button
                  onClick={() => setShowAddSkillMapModal(true)}
                  disabled={skillMaps.length >= 6}
                  className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg font-medium transition-colors ${
                    skillMaps.length >= 6
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-site-accent text-white hover:bg-site-accent-hover'
                  }`}
                  title={skillMaps.length >= 6 ? 'Maximum of 6 skill maps reached' : 'Add a skill map'}
                >
                  Add Skill Map
                </button>
              )}
            </div>

            {skillMaps.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-site-soft rounded-full flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-8 h-8 text-site-accent" />
                </div>
                <h3 className="text-lg font-semibold text-site-ink mb-2">No skill maps yet</h3>
                {isOwner ? (
                  <>
                    <p className="text-site-muted mb-4 max-w-sm mx-auto">
                      Add skill maps to give your team something to practice and compete on
                    </p>
                    <button
                      onClick={() => setShowAddSkillMapModal(true)}
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-site-accent text-white rounded-lg font-medium hover:bg-site-accent-hover transition-colors"
                    >
                      Add Your First Skill Map
                    </button>
                  </>
                ) : (
                  <p className="text-site-muted max-w-sm mx-auto">
                    The room owner hasn't added any skill maps yet. Check back later!
                  </p>
                )}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {skillMaps.map((skillMap) => (
                  <SkillMapCard
                    key={skillMap._id}
                    skillMap={skillMap}
                    isOwner={isOwner}
                    onRemove={() => showRemoveSkillMapConfirm(skillMap)}
                    onClick={() => navigate(`/roomspace/${roomId}/skill-maps/${skillMap._id}`)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Members Section */}
          <div className="bg-site-surface rounded-xl shadow-sm border border-site-border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-site-ink">Members</h2>
              <span className="text-sm text-site-muted">
                {members.length}{maxMembers !== Infinity ? `/${maxMembers}` : ''} members
              </span>
            </div>
            <div className="space-y-2">
              {members.map((member) => (
                <MemberCard
                  key={member.userId}
                  member={member}
                  isOwner={isOwner}
                  currentUserId={currentUserId}
                  onKick={() => showKickMemberConfirm(member)}
                />
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Modals */}
      {showEditModal && (
        <EditRoomModal
          room={room}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false);
            fetchRoomData();
          }}
        />
      )}

      {showInviteModal && (
        <InviteModal
          roomId={roomId}
          onClose={() => setShowInviteModal(false)}
        />
      )}

      {showAddSkillMapModal && (
        <AddSkillMapModal
          roomId={roomId}
          existingSkillMapIds={skillMaps.map(sm => sm.skillMapId || sm._id)}
          onClose={() => setShowAddSkillMapModal(false)}
          onSuccess={() => {
            setShowAddSkillMapModal(false);
            fetchRoomData();
          }}
        />
      )}

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        confirmStyle="danger"
        requiresTyping={confirmDialog.requiresTyping}
        typingValue={confirmDialog.typingValue}
        onConfirm={handleConfirmAction}
        onCancel={closeConfirmDialog}
      />
    </div>
  );
}

/* Skill Map Card Component */
function SkillMapCard({ skillMap: rsm, isOwner, onRemove, onClick }) {
  // Data is now embedded directly in the room skill map record
  // Fall back to nested skillMap for backward compat with old records
  const name = rsm.name || rsm.skillMap?.name || "Untitled";
  const icon = rsm.icon || rsm.skillMap?.icon || "Map";
  const color = rsm.color || rsm.skillMap?.color || "#2e5023";
  const nodeCount = rsm.nodeCount || rsm.skillMap?.nodeCount || rsm.nodes?.length || 0;
  const themeColor = color;
  const progress = rsm.completionPercentage || 0;
  const isCompleted = progress >= 100;
  const isInProgress = progress > 0 && progress < 100;

  return (
    <div
      className="group relative bg-white rounded-xl p-5 cursor-pointer transition-all duration-200 hover:shadow-xl border"
      style={{
        borderColor: isCompleted || isInProgress ? themeColor : '#e5e7eb',
        borderWidth: isCompleted || isInProgress ? '2px' : '1px'
      }}
      onClick={onClick}
    >
      {/* Header with icon, title, and actions */}
      <div className="flex items-start gap-3 mb-4">
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center shadow-sm text-white shrink-0"
          style={{ backgroundColor: themeColor }}
        >
          <SkillIcon name={icon} size={26} />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-gray-900 truncate mb-1">
            {name}
          </h3>
          <p className="text-sm text-gray-500">
            {rsm.completedCount || 0}/{nodeCount} nodes
          </p>
        </div>

        {/* Action buttons - always visible */}
        {isOwner && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(); }}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
              title="Remove from room"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Progress section */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Progress</span>
          <span className="text-base font-bold" style={{ color: themeColor }}>
            {Math.round(progress)}%
          </span>
        </div>
        <div className="relative h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${progress}%`,
              background: `linear-gradient(to right, ${themeColor}, ${themeColor}dd)`
            }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <span className="text-xs font-medium" style={{ color: themeColor }}>
          {isCompleted ? 'Completed' : isInProgress ? 'In Progress' : 'Not Started'}
        </span>
        <div className="flex items-center gap-1 text-sm font-medium text-gray-400 hover:text-site-accent transition-colors">
          <span>View</span>
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}

/* Member Card Component */
function MemberCard({ member, isOwner, currentUserId, onKick }) {
  const isSelf = member.userId === currentUserId;
  const memberIsOwner = member.role === "owner";
  const displayName = member.user?.name || member.username || "Unknown User";

  return (
    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-site-bg transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-site-soft flex items-center justify-center">
          <span className="text-site-accent font-semibold">
            {displayName.charAt(0).toUpperCase()}
          </span>
        </div>
        <div>
          <p className="text-sm font-medium text-site-ink">
            {displayName}
            {isSelf && <span className="text-site-muted ml-1">(You)</span>}
          </p>
          {memberIsOwner && (
            <span className="flex items-center gap-1 text-xs text-amber-600">
              <Crown className="w-3 h-3" />
              Owner
            </span>
          )}
        </div>
      </div>

      {isOwner && !memberIsOwner && !isSelf && (
        <button
          onClick={onKick}
          className="p-2 text-site-muted hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Remove member"
        >
          <UserMinus className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

/* Edit Room Modal */
function EditRoomModal({ room, onClose, onSuccess }) {
  const [name, setName] = useState(room.name);
  const [description, setDescription] = useState(room.description || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [nameError, setNameError] = useState("");
  const [descriptionError, setDescriptionError] = useState("");

  const { showSuccess } = useToast();
  const { handleApiError } = useApiError();

  const handleNameChange = (e) => {
    const newName = e.target.value;
    setName(newName);
    setError("");
    setNameError("");

    // Real-time validation
    if (newName.length > 20) {
      setNameError("Room name must be 20 characters or less");
    } else if (!newName.trim()) {
      setNameError("Room name is required");
    }
  };

  const handleDescriptionChange = (e) => {
    const newDescription = e.target.value;
    setDescription(newDescription);
    setError("");
    setDescriptionError("");

    // Real-time validation
    if (newDescription.length > 200) {
      setDescriptionError("Description must be 200 characters or less");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Client-side validation
    let hasErrors = false;

    if (!name.trim()) {
      setNameError("Room name is required");
      hasErrors = true;
    } else if (name.length > 20) {
      setNameError("Room name must be 20 characters or less");
      hasErrors = true;
    }

    if (description.length > 200) {
      setDescriptionError("Description must be 200 characters or less");
      hasErrors = true;
    }

    if (hasErrors) return;

    try {
      setIsSubmitting(true);
      setError("");
      setNameError("");
      setDescriptionError("");
      
      await roomsAPI.updateRoom(room._id, {
        name: name.trim(),
        description: description.trim(),
      });
      
      showSuccess("Room Updated", "Room details have been saved successfully");
      onSuccess();
    } catch (err) {
      // Handle validation errors with field-specific messages
      if (err?.response?.status === 400) {
        setError(err.response?.data?.message || "Failed to update room");
      } else {
        handleApiError(err, {
          title: "Failed to Update Room",
          defaultMessage: "Unable to save room changes. Please try again.",
          context: { operation: 'updateRoom', roomId: room._id }
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-site-surface rounded-2xl shadow-xl w-full max-w-md p-6 border border-site-border">
        <h2 className="text-xl font-bold text-site-ink mb-4">Edit Room</h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-site-ink mb-2">
              Room Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={handleNameChange}
              maxLength={20}
              className={`
                w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-site-accent focus:border-transparent
                ${nameError ? 'border-red-300 bg-red-50' : 'border-site-border'}
              `}
            />
            {nameError && (
              <p className="text-red-600 text-xs mt-1">{nameError}</p>
            )}
            <p className="text-xs text-site-faint mt-1">{name.length}/20 characters</p>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-site-ink mb-2">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={handleDescriptionChange}
              maxLength={200}
              rows={3}
              className={`
                w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-site-accent focus:border-transparent resize-none
                ${descriptionError ? 'border-red-300 bg-red-50' : 'border-site-border'}
              `}
            />
            {descriptionError && (
              <p className="text-red-600 text-xs mt-1">{descriptionError}</p>
            )}
            <p className="text-xs text-site-faint mt-1">
              {description.length}/200 characters
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-300 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-2.5 border border-site-border text-site-muted rounded-lg font-medium hover:bg-site-bg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 bg-site-accent text-white rounded-lg font-medium hover:bg-site-accent-hover transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* Add Skill Map Modal */
function AddSkillMapModal({ roomId, existingSkillMapIds, onClose, onSuccess }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("templates"); // "templates" | "my-maps"
  const [templates, setTemplates] = useState([]);
  const [userSkillMaps, setUserSkillMaps] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const { showSuccess } = useToast();
  const { handleApiError } = useApiError();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [skillsRes, templatesRes] = await Promise.all([
          skillsAPI.getAll().catch(() => ({ data: { skills: [] } })),
          fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000/api'}/templates`, {
            headers: { 'Authorization': `Bearer ${await auth.currentUser.getIdToken()}` }
          }).then(r => r.json()).catch(() => ({ templates: [] }))
        ]);

        const allMaps = skillsRes.data.skills || [];
        setUserSkillMaps(allMaps.filter(sm => !existingSkillMapIds.includes(sm._id) && !sm.fromTemplate));
        setTemplates(templatesRes.templates || []);
      } catch (err) {
        console.error("Failed to fetch data:", err);
        setError("Failed to load skill maps");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [existingSkillMapIds]);

  const handleAddExisting = async () => {
    if (!selectedId) return;
    try {
      setIsSubmitting(true);
      setError("");
      await roomsAPI.addSkillMap(roomId, selectedId);
      const addedMap = userSkillMaps.find(sm => sm._id === selectedId);
      showSuccess("Skill Map Added", `"${addedMap?.name || 'Skill map'}" has been added to the room`);
      onSuccess();
    } catch (err) {
      const msg = err?.response?.data?.message || "";
      if (msg.includes("already")) {
        setError("This skill map is already in the room.");
      } else if (msg.includes("maximum of")) {
        setError("This room already has 6 skill maps. Remove one to add another.");
      } else {
        handleApiError(err, {
          title: "Failed to Add Skill Map",
          defaultMessage: "Unable to add the skill map.",
          context: { operation: 'addSkillMap', roomId, skillMapId: selectedId }
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImportTemplate = async (template) => {
    try {
      setIsSubmitting(true);
      setError("");
      // Create room skill map directly from template data (no personal skill map created)
      await roomsAPI.addSkillMapFromTemplate(roomId, {
        name: (template.title || "Untitled").slice(0, 50),
        description: (template.description || "").slice(0, 200),
        icon: template.icon || "Map",
        color: template.color || "#2e5023",
        goal: (template.goal || "").slice(0, 50),
        nodes: (template.nodes || []).map((n, i) => ({
          title: n.title || `Node ${i + 1}`,
          description: n.description || "",
          type: n.type || "Learn",
          order: n.order ?? i
        }))
      });
      showSuccess("Template Added", `"${template.title}" has been added to the room`);
      onSuccess();
    } catch (err) {
      setError(err?.response?.data?.error || err?.response?.data?.message || "Failed to import template");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-site-surface rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col border border-site-border overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-site-border">
          <h2 className="text-lg font-bold text-site-ink">Add Skill Map</h2>
          <button onClick={onClose} disabled={isSubmitting} className="p-1.5 text-site-muted hover:text-site-ink rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-site-border px-5">
          <button
            onClick={() => { setActiveTab("templates"); setSelectedId(null); setSelectedTemplate(null); setError(""); }}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === "templates"
                ? "border-site-accent text-site-accent"
                : "border-transparent text-site-muted hover:text-site-ink"
            }`}
          >
            Templates
          </button>
          <button
            onClick={() => { setActiveTab("my-maps"); setSelectedId(null); setSelectedTemplate(null); setError(""); }}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === "my-maps"
                ? "border-site-accent text-site-accent"
                : "border-transparent text-site-muted hover:text-site-ink"
            }`}
          >
            My Skill Maps
            {userSkillMaps.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 bg-site-soft text-site-accent text-xs rounded-full font-semibold">
                {userSkillMaps.length}
              </span>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0">
          {error && (
            <div className="mb-3 p-3 bg-red-50 border border-red-300 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="py-12 text-center">
              <div className="w-6 h-6 border-2 border-site-accent border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sm text-site-muted">Loading...</p>
            </div>
          ) : activeTab === "templates" ? (
            templates.length === 0 ? (
              <div className="py-12 text-center">
                <BookOpen className="w-10 h-10 text-site-border mx-auto mb-3" />
                <p className="text-sm text-site-muted">No templates available</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {templates.map((t) => {
                  const tId = t._id || t.id;
                  const isSelected = selectedTemplate && (selectedTemplate._id || selectedTemplate.id) === tId;
                  return (
                    <button
                      key={tId}
                      type="button"
                      onClick={() => setSelectedTemplate(t)}
                      disabled={isSubmitting}
                      className={`text-left rounded-xl border p-4 transition-all group disabled:opacity-50 ${
                        isSelected
                          ? 'border-site-accent bg-site-soft shadow-md'
                          : 'border-site-border bg-white hover:border-site-accent hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-9 h-9 rounded-lg bg-site-soft border border-site-border flex items-center justify-center shrink-0">
                          <SkillIcon name={t.icon} size={18} className="text-site-accent" />
                        </div>
                        <span className="text-sm font-semibold text-site-ink group-hover:text-site-accent transition-colors truncate">
                          {t.title}
                        </span>
                      </div>
                      {t.description && (
                        <p className="text-xs text-site-muted line-clamp-2 mb-2 break-words">{t.description}</p>
                      )}
                      <span className="text-xs text-site-faint">{t.nodes?.length || 0} nodes</span>
                    </button>
                  );
                })}
              </div>
            )
          ) : (
            userSkillMaps.length === 0 ? (
              <div className="py-12 text-center">
                <BookOpen className="w-10 h-10 text-site-border mx-auto mb-3" />
                <p className="text-sm text-site-muted mb-1">No skill maps available</p>
                <p className="text-xs text-site-faint">All your maps are already in this room, or you haven't created any yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {userSkillMaps.map((sm) => (
                  <button
                    key={sm._id}
                    type="button"
                    onClick={() => setSelectedId(sm._id)}
                    className={`text-left rounded-xl border p-4 transition-all group ${
                      selectedId === sm._id
                        ? 'border-site-accent bg-site-soft shadow-md'
                        : 'border-site-border bg-white hover:border-site-accent hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-9 h-9 rounded-lg bg-site-soft border border-site-border flex items-center justify-center shrink-0">
                        <SkillIcon name={sm.icon} size={18} className="text-site-accent" />
                      </div>
                      <span className="text-sm font-semibold text-site-ink group-hover:text-site-accent transition-colors truncate">
                        {sm.name}
                      </span>
                    </div>
                    {sm.description && (
                      <p className="text-xs text-site-muted line-clamp-2 mb-2 break-words">{sm.description}</p>
                    )}
                    <span className="text-xs text-site-faint">{sm.nodeCount || sm.nodes?.length || 0} nodes</span>
                  </button>
                ))}
              </div>
            )
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-site-border px-5 py-3 bg-site-bg/30">
          {(activeTab === "my-maps" && selectedId) || (activeTab === "templates" && selectedTemplate) ? (
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 py-2.5 border border-site-border text-site-muted rounded-lg font-medium hover:bg-site-bg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={activeTab === "templates" ? () => handleImportTemplate(selectedTemplate) : handleAddExisting}
                disabled={isSubmitting || (activeTab === "my-maps" && !selectedId) || (activeTab === "templates" && !selectedTemplate)}
                className="flex-1 py-2.5 bg-site-accent text-white rounded-lg font-medium hover:bg-site-accent-hover transition-colors disabled:opacity-50"
              >
                {isSubmitting ? "Adding..." : "Add to Room"}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate("/skills?create=scratch");
              }}
              className="w-full py-2.5 text-sm font-medium text-site-ink border-2 border-site-border rounded-lg hover:border-site-accent hover:text-site-accent transition-colors"
            >
              Or create from scratch
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* Invite Modal */
function InviteModal({ roomId, onClose }) {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [success, setSuccess] = useState(false);

  const { showSuccess } = useToast();
  const { handleApiError, handleValidationError } = useApiError();

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleEmailChange = (e) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    setError("");
    setEmailError("");

    // Real-time validation
    if (newEmail && !validateEmail(newEmail.trim())) {
      setEmailError("Please enter a valid email address");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Client-side validation
    if (!email.trim()) {
      setEmailError("Email address is required");
      return;
    }

    if (!validateEmail(email.trim())) {
      setEmailError("Please enter a valid email address");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");
      setEmailError("");
      
      await invitationsAPI.createInvitation(roomId, email.trim());
      
      setSuccess(true);
      setEmail("");
      showSuccess("Invitation Sent", "The user will receive an email and in-app notification");
      
      // Auto-close after 2 seconds on success
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      const msg = err?.response?.data?.message || "";
      // Map backend error messages to user-friendly messages
      if (err?.response?.status === 409 || err?.response?.status === 400) {
        if (msg.includes("already a member")) {
          setError("This user is already a member of this room.");
        } else if (msg.includes("Invitation already sent")) {
          setError("An invitation has already been sent to this user. Please wait at least 1 minute before trying again.");
        } else if (msg.includes("Room is full")) {
          setError("This room is full (5/5 members). Remove a member before inviting someone new.");
        } else if (msg.includes("cannot invite yourself")) {
          setError("You can't invite yourself to your own room.");
        } else if (msg.includes("not found") || msg.includes("registered")) {
          setError("No account found with this email. The user must sign up first.");
        } else {
          setError(msg || "Failed to send invitation. Please try again.");
        }
      } else {
        handleApiError(err, {
          title: "Failed to Send Invitation",
          defaultMessage: "Unable to send the invitation. Please try again.",
          context: { operation: 'createInvitation', roomId, email: email.trim() }
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-site-surface rounded-2xl shadow-xl w-full max-w-md p-6 border border-site-border">
        <h2 className="text-xl font-bold text-site-ink mb-4">Invite Member</h2>

        {success ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-site-ink font-medium mb-2">Invitation Sent!</p>
            <p className="text-sm text-site-muted">
              The user will receive an email and in-app notification
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-site-ink mb-2">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={handleEmailChange}
                placeholder="friend@example.com"
                className={`
                  w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-site-accent focus:border-transparent
                  ${emailError ? 'border-red-300 bg-red-50' : 'border-site-border'}
                `}
                disabled={isSubmitting}
              />
              {emailError && (
                <p className="text-red-600 text-xs mt-1">{emailError}</p>
              )}
              <p className="text-xs text-site-faint mt-1">
                The user must have a registered account
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-300 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 py-2.5 border border-site-border text-site-muted rounded-lg font-medium hover:bg-site-bg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-2.5 bg-site-accent text-white rounded-lg font-medium hover:bg-site-accent-hover transition-colors disabled:opacity-50"
              >
                {isSubmitting ? "Sending..." : "Send Invitation"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
