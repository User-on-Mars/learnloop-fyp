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
  TrendingUp,
  Map,
  Sparkles,
} from "lucide-react";
import { roomsAPI, invitationsAPI, skillsAPI } from "../api/client.ts";
import { auth } from "../firebase";
import Sidebar from "../components/Sidebar";
import RoomLeaderboard from "../components/RoomLeaderboard";
import ConfirmationDialog from "../components/ConfirmationDialog";
import { SkillIcon } from "../components/IconPicker";
import { getIconComponent } from "../utils/iconLibrary";
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
      <div className="flex min-h-screen bg-[#f8faf6]">
        <Sidebar />
        <main className="flex-1 overflow-y-auto w-full pt-16 md:pl-14">
          <div className="px-4 sm:px-6 py-6">
            {/* Back Button */}
            <div className="h-10 w-40 bg-white rounded-xl animate-pulse mb-6" />
            
            {/* Hero Header Skeleton */}
            <div className="bg-white rounded-2xl border border-[#e2e6dc] p-6 mb-6 animate-pulse">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-[#e8ece3] rounded-xl" />
                <div className="flex-1">
                  <div className="h-7 w-48 bg-[#e8ece3] rounded-lg mb-2" />
                  <div className="h-4 w-64 bg-[#e8ece3] rounded mb-3" />
                  <div className="h-4 w-24 bg-[#e8ece3] rounded" />
                </div>
              </div>
            </div>

            {/* Content Grid Skeleton */}
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-2xl border border-[#e2e6dc] p-6 animate-pulse">
                  <div className="h-6 w-32 bg-[#e8ece3] rounded mb-4" />
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-16 bg-[#f5f7f2] rounded-xl" />
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-[#e2e6dc] p-6 animate-pulse">
                  <div className="h-6 w-28 bg-[#e8ece3] rounded mb-4" />
                  <div className="grid sm:grid-cols-2 gap-4">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-32 bg-[#f5f7f2] rounded-xl" />
                    ))}
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-[#e2e6dc] p-6 animate-pulse">
                <div className="h-6 w-24 bg-[#e8ece3] rounded mb-4" />
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-14 bg-[#f5f7f2] rounded-xl" />
                  ))}
                </div>
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
      <div className="flex min-h-screen bg-[#f8faf6]">
        <Sidebar />
        <main className="flex-1 overflow-y-auto w-full pt-16 md:pl-14">
          <div className="px-4 sm:px-6 py-6">
            <button
              onClick={() => navigate("/roomspace")}
              className="flex items-center gap-2 text-[#9aa094] hover:text-[#1c1f1a] mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to RoomSpace
            </button>
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2e5023] mx-auto mb-4" />
                <p className="text-[#9aa094]">Loading room...</p>
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
      <div className="flex min-h-screen bg-[#f8faf6]">
        <Sidebar />
        <main className="flex-1 overflow-y-auto w-full pt-16 md:pl-14">
          <div className="px-4 sm:px-6 py-6">
            <button
              onClick={() => navigate("/roomspace")}
              className="flex items-center gap-2.5 px-4 py-2.5 bg-white border border-[#e2e6dc] rounded-xl text-[#565c52] hover:border-[#c8cec0] hover:text-[#1c1f1a] transition-all mb-6 shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Back to RoomSpace</span>
            </button>
            <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-2xl">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <h3 className="font-semibold mb-2">Unable to Load Room</h3>
                  <p className="text-sm mb-4">{error}</p>
                  <div className="flex gap-3">
                    <button
                      onClick={fetchRoomData}
                      className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors"
                    >
                      Try Again
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
      <div className="flex min-h-screen bg-[#f8faf6]">
        <Sidebar />
        <main className="flex-1 overflow-y-auto w-full pt-16 md:pl-14">
          <div className="px-4 sm:px-6 py-6">
            <button
              onClick={() => navigate("/roomspace")}
              className="flex items-center gap-2.5 px-4 py-2.5 bg-white border border-[#e2e6dc] rounded-xl text-[#565c52] hover:border-[#c8cec0] hover:text-[#1c1f1a] transition-all mb-6 shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Back to RoomSpace</span>
            </button>
            <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-2xl">
              <h3 className="font-semibold mb-2">Room Not Found</h3>
              <p className="text-sm">This room does not exist or you don't have access to it.</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const themeColor = room.color || '#ec4899';
  const RoomIcon = getIconComponent(room.icon) || Users;

  return (
    <div className="flex min-h-screen bg-[#f8faf6]">
      <Sidebar />

      <main className="flex-1 overflow-y-auto w-full pt-16 md:pl-14">
        <div className="px-4 sm:px-6 py-6">
          
          {/* ═══ Back Button ═══ */}
          <button
            onClick={() => navigate("/roomspace")}
            className="group flex items-center gap-2.5 px-4 py-2.5 bg-white border border-[#e2e6dc] rounded-xl text-[#565c52] hover:border-pink-300 hover:text-pink-600 transition-all mb-6 shadow-sm"
          >
            <div 
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
              style={{ backgroundColor: `${themeColor}15` }}
            >
              <ArrowLeft className="w-4 h-4" style={{ color: themeColor }} />
            </div>
            <span className="text-sm font-medium">Back to RoomSpace</span>
          </button>

          {/* ═══ Hero Header ═══ */}
          <div 
            className="relative overflow-hidden rounded-2xl border p-6 sm:p-8 mb-6"
            style={{ 
              background: `linear-gradient(135deg, ${themeColor}08 0%, ${themeColor}15 100%)`,
              borderColor: `${themeColor}30`
            }}
          >
            {/* Decorative elements */}
            <div 
              className="absolute -top-16 -right-16 w-48 h-48 rounded-full opacity-20 blur-3xl pointer-events-none"
              style={{ backgroundColor: themeColor }}
            />
            
            <div className="relative flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              <div className="flex items-start gap-4">
                <div 
                  className="w-16 h-16 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0"
                  style={{ 
                    backgroundColor: themeColor,
                    boxShadow: `0 8px 24px -4px ${themeColor}40`
                  }}
                >
                  <RoomIcon className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h1 className="text-2xl sm:text-3xl font-bold text-[#1c1f1a]">{room.name}</h1>
                    {isOwner && (
                      <span className="flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold border border-amber-200">
                        <Crown className="w-3 h-3" />
                        Owner
                      </span>
                    )}
                  </div>
                  {room.description && (
                    <p className="text-[#565c52] text-[15px] leading-relaxed mb-3">{room.description}</p>
                  )}
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" style={{ color: themeColor }} />
                    <span className="text-sm text-[#565c52]">
                      {members.length} {members.length === 1 ? "member" : "members"}
                      {maxMembers !== Infinity && <span className="text-[#9aa094]"> / {maxMembers}</span>}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {isOwner ? (
                  <>
                    <button
                      onClick={() => setShowEditModal(true)}
                      className="p-2.5 text-[#9aa094] hover:text-[#1c1f1a] hover:bg-white rounded-xl transition-all border border-transparent hover:border-[#e2e6dc]"
                      title="Edit room"
                    >
                      <Settings className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setShowInviteModal(true)}
                      disabled={isRoomFull}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-lg ${
                        isRoomFull
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                          : 'text-white hover:opacity-90'
                      }`}
                      style={!isRoomFull ? { 
                        backgroundColor: themeColor,
                        boxShadow: `0 4px 14px -2px ${themeColor}50`
                      } : {}}
                      title={isRoomFull ? `Room is full` : 'Invite a member'}
                    >
                      <UserPlus className="w-4 h-4" />
                      {isRoomFull ? 'Full' : 'Invite'}
                    </button>
                    <button
                      onClick={showDeleteRoomConfirm}
                      className="p-2.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-200"
                      title="Delete room"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={showLeaveRoomConfirm}
                    className="flex items-center gap-2 px-4 py-2.5 border border-[#e2e6dc] text-[#565c52] rounded-xl font-medium hover:bg-white hover:border-red-200 hover:text-red-600 transition-all text-sm"
                  >
                    <LogOut className="w-4 h-4" />
                    Leave Room
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ═══ Content Grid ═══ */}
          <div className="grid lg:grid-cols-3 gap-6">
            
            {/* Left Column - Leaderboard & Skill Maps */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Leaderboard Section */}
              <div className="bg-white rounded-2xl border border-[#e2e6dc] overflow-hidden">
                <div className="px-6 py-4 border-b border-[#e8ece3] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-[#1c1f1a]">Leaderboard</h2>
                      <p className="text-xs text-[#9aa094]">{members.length} member{members.length !== 1 ? 's' : ''} competing</p>
                    </div>
                  </div>
                  <span className="text-xs text-[#9aa094] flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    Live Rankings
                  </span>
                </div>
                <div className="p-6">
                  <RoomLeaderboard roomId={roomId} currentUserId={currentUserId} />
                </div>
              </div>

              {/* Skill Maps Section */}
              <div className="bg-white rounded-2xl border border-[#e2e6dc] overflow-hidden">
                <div className="px-6 py-4 border-b border-[#e8ece3] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
                      <Map className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-[#1c1f1a]">Skill Maps</h2>
                      {skillMaps.length > 0 && (
                        <p className="text-xs text-[#9aa094]">{skillMaps.length}/6 maps added</p>
                      )}
                    </div>
                  </div>
                  {isOwner && (
                    <button
                      onClick={() => setShowAddSkillMapModal(true)}
                      disabled={skillMaps.length >= 6}
                      className={`flex items-center gap-2 px-4 py-2 text-sm rounded-xl font-semibold transition-all ${
                        skillMaps.length >= 6
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-[#2e5023] text-white hover:bg-[#3a6b2e] shadow-md shadow-[#2e5023]/20'
                      }`}
                    >
                      <Plus className="w-4 h-4" />
                      Add Skill Map
                    </button>
                  )}
                </div>

                <div className="p-6">
                  {skillMaps.length === 0 ? (
                    <div className="text-center py-10">
                      <div className="w-16 h-16 bg-[#f5f7f2] rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <BookOpen className="w-8 h-8 text-[#c8cec0]" />
                      </div>
                      <h3 className="text-base font-bold text-[#1c1f1a] mb-2">No skill maps yet</h3>
                      {isOwner ? (
                        <>
                          <p className="text-sm text-[#9aa094] mb-4 max-w-sm mx-auto">
                            Add skill maps to give your team something to practice and compete on
                          </p>
                          <button
                            onClick={() => setShowAddSkillMapModal(true)}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#2e5023] text-white rounded-xl font-semibold text-sm hover:bg-[#3a6b2e] transition-all shadow-md"
                          >
                            <Plus className="w-4 h-4" />
                            Add Your First Skill Map
                          </button>
                        </>
                      ) : (
                        <p className="text-sm text-[#9aa094] max-w-sm mx-auto">
                          The room owner hasn't added any skill maps yet
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
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
              </div>
            </div>

            {/* Right Column - Members */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl border border-[#e2e6dc] overflow-hidden sticky top-24">
                <div className="px-6 py-4 border-b border-[#e8ece3] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${themeColor}15` }}
                    >
                      <Users className="w-5 h-5" style={{ color: themeColor }} />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-[#1c1f1a]">Members</h2>
                      <p className="text-xs text-[#9aa094]">
                        {members.length}{maxMembers !== Infinity ? `/${maxMembers}` : ''} members
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <div className="space-y-2">
                    {members.map((member) => (
                      <MemberCard
                        key={member.userId}
                        member={member}
                        isOwner={isOwner}
                        currentUserId={currentUserId}
                        onKick={() => showKickMemberConfirm(member)}
                        themeColor={themeColor}
                      />
                    ))}
                  </div>
                </div>
              </div>
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
      className="group relative bg-[#f8faf6] rounded-xl p-5 cursor-pointer transition-all duration-200 border border-[#e2e6dc] hover:shadow-lg hover:border-[#c8cec0] hover:-translate-y-0.5"
      onClick={onClick}
    >
      {/* Header with icon, title, and actions */}
      <div className="flex items-start gap-3 mb-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm text-white shrink-0"
          style={{ backgroundColor: themeColor }}
        >
          <SkillIcon name={icon} size={22} />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-[15px] font-bold text-[#1c1f1a] truncate group-hover:text-[#2e5023] transition-colors">
            {name}
          </h3>
          <p className="text-[12px] text-[#9aa094]">
            {rsm.completedCount || 0}/{nodeCount} nodes
          </p>
        </div>

        {/* Action buttons */}
        {isOwner && (
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#c8cec0] hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
            title="Remove from room"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Progress section */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-[#9aa094] uppercase tracking-wider">Progress</span>
          <span className="text-[14px] font-bold" style={{ color: themeColor }}>
            {Math.round(progress)}%
          </span>
        </div>
        <div className="relative h-2 bg-[#e8ece3] rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
            style={{ width: `${progress}%`, backgroundColor: themeColor }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-[#e2e6dc]">
        {isCompleted ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full border border-emerald-200">
            <Sparkles className="w-3 h-3" /> Completed
          </span>
        ) : isInProgress ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> In Progress
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 text-gray-600 text-[10px] font-bold rounded-full border border-gray-200">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400" /> Not Started
          </span>
        )}
        <div className="flex items-center gap-1 text-[12px] font-medium text-[#9aa094] group-hover:text-[#2e5023] transition-colors">
          View <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </div>
  );
}

/* Member Card Component */
function MemberCard({ member, isOwner, currentUserId, onKick, themeColor }) {
  const isSelf = member.userId === currentUserId;
  const memberIsOwner = member.role === "owner";
  const displayName = member.user?.name || member.username || "Unknown User";

  return (
    <div className="flex items-center justify-between p-3 rounded-xl hover:bg-[#f8faf6] transition-colors group">
      <div className="flex items-center gap-3">
        <div 
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${themeColor || '#ec4899'}20` }}
        >
          <span className="font-bold text-sm" style={{ color: themeColor || '#ec4899' }}>
            {displayName.charAt(0).toUpperCase()}
          </span>
        </div>
        <div>
          <p className="text-sm font-semibold text-[#1c1f1a]">
            {displayName}
            {isSelf && <span className="text-[#9aa094] font-normal ml-1">(You)</span>}
          </p>
          {memberIsOwner && (
            <span className="flex items-center gap-1 text-[11px] text-amber-600 font-medium">
              <Crown className="w-3 h-3" />
              Owner
            </span>
          )}
        </div>
      </div>

      {isOwner && !memberIsOwner && !isSelf && (
        <button
          onClick={onKick}
          className="p-2 text-[#c8cec0] hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
          title="Remove member"
        >
          <UserMinus className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

/* Edit Room Modal - Redesigned */
function EditRoomModal({ room, onClose, onSuccess }) {
  const [name, setName] = useState(room.name);
  const [description, setDescription] = useState(room.description || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [nameError, setNameError] = useState("");
  const [descriptionError, setDescriptionError] = useState("");

  const { showSuccess } = useToast();
  const { handleApiError } = useApiError();

  const themeColor = room.color || '#ec4899';

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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        
        {/* Header with gradient */}
        <div 
          className="px-6 py-4"
          style={{ background: `linear-gradient(135deg, ${themeColor} 0%, ${themeColor}dd 100%)` }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Settings className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Edit Room</h2>
                <p className="text-white/70 text-xs">Update room details</p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-5">
            <label className="block text-sm font-semibold text-[#1c1f1a] mb-2">
              Room Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={handleNameChange}
              maxLength={20}
              className={`
                w-full px-4 py-3 border-2 rounded-xl focus:outline-none transition-all text-sm
                ${nameError 
                  ? 'border-red-300 bg-red-50 focus:border-red-400 focus:ring-2 focus:ring-red-400/15' 
                  : 'border-[#e2e6dc] focus:border-pink-400 focus:ring-2 focus:ring-pink-400/15'
                }
              `}
            />
            <div className="flex justify-between mt-1.5">
              {nameError ? (
                <p className="text-red-600 text-xs">{nameError}</p>
              ) : (
                <span />
              )}
              <span className={`text-[11px] ${name.length > 20 ? 'text-red-500' : 'text-[#9aa094]'}`}>
                {name.length}/20
              </span>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-semibold text-[#1c1f1a] mb-2">
              Description <span className="text-[#9aa094] font-normal">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={handleDescriptionChange}
              maxLength={200}
              rows={3}
              className={`
                w-full px-4 py-3 border-2 rounded-xl focus:outline-none transition-all text-sm resize-none
                ${descriptionError 
                  ? 'border-red-300 bg-red-50 focus:border-red-400 focus:ring-2 focus:ring-red-400/15' 
                  : 'border-[#e2e6dc] focus:border-pink-400 focus:ring-2 focus:ring-pink-400/15'
                }
              `}
            />
            <div className="flex justify-between mt-1.5">
              {descriptionError ? (
                <p className="text-red-600 text-xs">{descriptionError}</p>
              ) : (
                <span />
              )}
              <span className="text-[11px] text-[#9aa094]">{description.length}/200</span>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-start gap-2">
              <X className="w-4 h-4 mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-3 border-2 border-[#e2e6dc] text-[#565c52] rounded-xl font-semibold text-sm hover:bg-[#f8faf6] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 text-white rounded-xl font-semibold text-sm transition-all disabled:opacity-50 shadow-lg flex items-center justify-center gap-2"
              style={{ 
                background: `linear-gradient(135deg, ${themeColor} 0%, ${themeColor}dd 100%)`,
                boxShadow: `0 4px 14px -2px ${themeColor}40`
              }}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* Add Skill Map Modal - Redesigned */
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

  // Get selected item details for header
  const selectedItem = activeTab === "templates" ? selectedTemplate : userSkillMaps.find(sm => sm._id === selectedId);
  const selectedColor = selectedItem?.color || (activeTab === "templates" ? "#10b981" : "#3b82f6");
  const selectedName = activeTab === "templates" ? selectedTemplate?.title : selectedItem?.name;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
        
        {/* ── Header with Gradient ── */}
        <div 
          className="px-6 py-4 flex-shrink-0"
          style={{ 
            background: activeTab === "templates" 
              ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' 
              : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Map className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Add Skill Map</h2>
                <p className="text-white/70 text-xs">
                  {selectedName ? `Selected: ${selectedName}` : 'Choose a skill map to add'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Tab Switcher ── */}
        <div className="px-6 py-3 bg-[#f8faf6] border-b border-[#e2e6dc]">
          <div className="flex bg-[#e8ece3] rounded-xl p-1">
            <button
              onClick={() => { setActiveTab("templates"); setSelectedId(null); setSelectedTemplate(null); setError(""); }}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                activeTab === "templates"
                  ? "bg-white text-emerald-600 shadow-sm"
                  : "text-[#9aa094] hover:text-[#565c52]"
              }`}
            >
              <Sparkles className="w-4 h-4" />
              Templates
            </button>
            <button
              onClick={() => { setActiveTab("my-maps"); setSelectedId(null); setSelectedTemplate(null); setError(""); }}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                activeTab === "my-maps"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-[#9aa094] hover:text-[#565c52]"
              }`}
            >
              <BookOpen className="w-4 h-4" />
              My Maps
              {userSkillMaps.length > 0 && (
                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-600 text-[10px] rounded-full font-bold">
                  {userSkillMaps.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-start gap-2">
              <X className="w-4 h-4 mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="py-16 text-center">
              <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-[#9aa094]">Loading skill maps...</p>
            </div>
          ) : activeTab === "templates" ? (
            templates.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-emerald-300" />
                </div>
                <h3 className="text-base font-bold text-[#1c1f1a] mb-1">No templates available</h3>
                <p className="text-sm text-[#9aa094]">Check back later for new templates</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {templates.map((t) => {
                  const tId = t._id || t.id;
                  const isSelected = selectedTemplate && (selectedTemplate._id || selectedTemplate.id) === tId;
                  const templateColor = t.color || "#10b981";
                  return (
                    <button
                      key={tId}
                      type="button"
                      onClick={() => setSelectedTemplate(t)}
                      disabled={isSubmitting}
                      className={`relative text-left rounded-xl border-2 p-4 transition-all group disabled:opacity-50 ${
                        isSelected
                          ? 'border-emerald-400 bg-emerald-50 shadow-lg shadow-emerald-500/10'
                          : 'border-[#e2e6dc] bg-[#f8faf6] hover:border-emerald-300 hover:shadow-md hover:-translate-y-0.5'
                      }`}
                    >
                      {/* Selection checkmark */}
                      {isSelected && (
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                          <CheckCircle className="w-4 h-4 text-white" />
                        </div>
                      )}
                      
                      <div className="flex items-start gap-3 mb-3">
                        <div 
                          className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm text-white shrink-0"
                          style={{ backgroundColor: templateColor }}
                        >
                          <SkillIcon name={t.icon} size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-bold text-[#1c1f1a] group-hover:text-emerald-600 transition-colors line-clamp-1">
                            {t.title}
                          </span>
                          <p className="text-[11px] text-[#9aa094] mt-0.5">{t.nodes?.length || 0} nodes</p>
                        </div>
                      </div>
                      {t.description && (
                        <p className="text-xs text-[#565c52] line-clamp-2 leading-relaxed">{t.description}</p>
                      )}
                    </button>
                  );
                })}
              </div>
            )
          ) : (
            userSkillMaps.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-8 h-8 text-blue-300" />
                </div>
                <h3 className="text-base font-bold text-[#1c1f1a] mb-1">No skill maps available</h3>
                <p className="text-sm text-[#9aa094] max-w-xs mx-auto">
                  All your maps are already in this room, or you haven't created any yet.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {userSkillMaps.map((sm) => {
                  const isSelected = selectedId === sm._id;
                  const mapColor = sm.color || "#3b82f6";
                  return (
                    <button
                      key={sm._id}
                      type="button"
                      onClick={() => setSelectedId(sm._id)}
                      className={`relative text-left rounded-xl border-2 p-4 transition-all group ${
                        isSelected
                          ? 'border-blue-400 bg-blue-50 shadow-lg shadow-blue-500/10'
                          : 'border-[#e2e6dc] bg-[#f8faf6] hover:border-blue-300 hover:shadow-md hover:-translate-y-0.5'
                      }`}
                    >
                      {/* Selection checkmark */}
                      {isSelected && (
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                          <CheckCircle className="w-4 h-4 text-white" />
                        </div>
                      )}
                      
                      <div className="flex items-start gap-3 mb-3">
                        <div 
                          className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm text-white shrink-0"
                          style={{ backgroundColor: mapColor }}
                        >
                          <SkillIcon name={sm.icon} size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-bold text-[#1c1f1a] group-hover:text-blue-600 transition-colors line-clamp-1">
                            {sm.name}
                          </span>
                          <p className="text-[11px] text-[#9aa094] mt-0.5">{sm.nodeCount || sm.nodes?.length || 0} nodes</p>
                        </div>
                      </div>
                      {sm.description && (
                        <p className="text-xs text-[#565c52] line-clamp-2 leading-relaxed">{sm.description}</p>
                      )}
                    </button>
                  );
                })}
              </div>
            )
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex-shrink-0 px-6 py-4 bg-[#f8faf6] border-t border-[#e2e6dc]">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-3 border-2 border-[#e2e6dc] text-[#565c52] rounded-xl font-semibold text-sm hover:bg-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
            
            {(activeTab === "my-maps" && selectedId) || (activeTab === "templates" && selectedTemplate) ? (
              <button
                onClick={activeTab === "templates" ? () => handleImportTemplate(selectedTemplate) : handleAddExisting}
                disabled={isSubmitting}
                className={`flex-1 py-3 text-white rounded-xl font-semibold text-sm transition-all disabled:opacity-50 shadow-lg flex items-center justify-center gap-2 ${
                  activeTab === "templates"
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-emerald-500/25'
                    : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-blue-500/25'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Add to Room
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate("/skills?create=scratch");
                }}
                className="flex-1 py-3 border-2 border-[#2e5023] text-[#2e5023] rounded-xl font-semibold text-sm hover:bg-[#2e5023] hover:text-white transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Create New
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* Invite Modal - Redesigned */
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        
        {/* Header with gradient */}
        <div className="px-6 py-4 bg-gradient-to-r from-pink-500 to-rose-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Invite Member</h2>
                <p className="text-white/70 text-xs">Add someone to your room</p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {success ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold text-[#1c1f1a] mb-2">Invitation Sent!</h3>
              <p className="text-sm text-[#9aa094]">
                The user will receive an email and in-app notification
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="mb-5">
                <label className="block text-sm font-semibold text-[#1c1f1a] mb-2">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  placeholder="friend@example.com"
                  className={`
                    w-full px-4 py-3 border-2 rounded-xl focus:outline-none transition-all text-sm
                    ${emailError 
                      ? 'border-red-300 bg-red-50 focus:border-red-400 focus:ring-2 focus:ring-red-400/15' 
                      : 'border-[#e2e6dc] focus:border-pink-400 focus:ring-2 focus:ring-pink-400/15'
                    }
                  `}
                  disabled={isSubmitting}
                />
                {emailError ? (
                  <p className="text-red-600 text-xs mt-1.5">{emailError}</p>
                ) : (
                  <p className="text-xs text-[#9aa094] mt-1.5">
                    The user must have a registered account
                  </p>
                )}
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-start gap-2">
                  <X className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="flex-1 py-3 border-2 border-[#e2e6dc] text-[#565c52] rounded-xl font-semibold text-sm hover:bg-[#f8faf6] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl font-semibold text-sm hover:from-pink-600 hover:to-rose-600 transition-all disabled:opacity-50 shadow-lg shadow-pink-500/25 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      Send Invitation
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
