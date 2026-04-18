import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Plus, Crown, UserCheck, Trash2, AlertTriangle, Check } from "lucide-react";
import { roomsAPI } from "../api/client";
import Sidebar from "../components/Sidebar";
import ConfirmationDialog from "../components/ConfirmationDialog";
import { useToast } from "../context/ToastContext";
import { useApiError } from "../hooks/useApiError";
import { getIconComponent } from "../utils/iconLibrary";
import { COLOR_THEMES } from "../components/ColorPicker";

export default function RoomSpace() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Delete confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    roomToDelete: null
  });

  const { handleApiError } = useApiError();
  const { showSuccess } = useToast();

  // Calculate owned rooms count
  const ownedRoomsCount = rooms.filter(room => room.isOwner).length;
  const hasReachedLimit = ownedRoomsCount >= 3;

  const fetchRooms = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");
      const response = await roomsAPI.getRooms();
      const roomsData = response.data.rooms || [];
      
      // Transform rooms to add isOwner property based on role
      const roomsWithOwnership = roomsData.map(room => ({
        ...room,
        isOwner: room.role === 'owner'
      }));
      
      console.log('🏠 Rooms loaded:', roomsWithOwnership);
      setRooms(roomsWithOwnership);
    } catch (err) {
      console.error("Failed to fetch rooms:", err);
      setError("Failed to load rooms");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const handleRoomClick = (roomId) => {
    navigate(`/roomspace/${roomId}`);
  };

  const handleDeleteRoom = (room, e) => {
    e.stopPropagation(); // Prevent card click navigation
    setConfirmDialog({
      isOpen: true,
      roomToDelete: room
    });
  };

  const confirmDeleteRoom = async () => {
    const room = confirmDialog.roomToDelete;
    if (!room) return;

    try {
      await roomsAPI.deleteRoom(room._id);
      showSuccess("Room Deleted", `"${room.name}" has been permanently deleted`);
      
      // Refresh rooms list
      fetchRooms();
      
      // Close dialog
      setConfirmDialog({ isOpen: false, roomToDelete: null });
    } catch (err) {
      handleApiError(err, {
        title: "Failed to Delete Room",
        defaultMessage: "Unable to delete the room. Please try again.",
        context: { operation: 'deleteRoom', roomId: room._id }
      });
    }
  };

  const cancelDeleteRoom = () => {
    setConfirmDialog({ isOpen: false, roomToDelete: null });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-site-bg">
        <Sidebar />
        <main className="flex-1 overflow-y-auto w-full">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header Skeleton */}
            <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="h-8 w-32 bg-gray-200 rounded-md animate-pulse mb-2" />
                <div className="h-4 w-64 bg-gray-200 rounded-md animate-pulse" />
              </div>
              <div className="h-10 w-32 bg-gray-200 rounded-lg animate-pulse" />
            </div>

            {/* Room List Skeleton */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-site-surface rounded-xl p-5 border border-site-border animate-pulse"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="h-6 w-3/4 bg-gray-200 rounded-md mb-2" />
                      <div className="h-4 w-full bg-gray-200 rounded-md" />
                    </div>
                    <div className="w-5 h-5 bg-gray-200 rounded ml-2" />
                  </div>
                  <div className="flex items-center gap-4 mt-4 pt-4 border-t border-site-border">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-gray-200 rounded" />
                      <div className="h-4 w-16 bg-gray-200 rounded" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-4 bg-gray-200 rounded" />
                      <div className="h-4 w-12 bg-gray-200 rounded" />
                    </div>
                  </div>
                </div>
              ))}
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
            <div className="bg-red-50 border border-red-300 text-red-700 p-6 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <h3 className="font-semibold mb-2">Unable to Load Rooms</h3>
                  <p className="text-sm mb-4">{error}</p>
                  <div className="flex gap-3">
                    <button
                      onClick={fetchRooms}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
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

  return (
    <div className="flex min-h-screen bg-site-bg">
      <Sidebar />

      <main className="flex-1 overflow-y-auto w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-site-ink mb-2">RoomSpace</h1>
              <p className="text-site-muted">
                Collaborate with friends and compete on shared skill maps
              </p>
              {ownedRoomsCount > 0 && (
                <p className="text-sm text-site-faint mt-1">
                  You own {ownedRoomsCount}/3 rooms
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              <button
                onClick={() => setShowCreateModal(true)}
                disabled={hasReachedLimit}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all shadow-md text-sm ${
                  hasReachedLimit
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-site-accent text-white hover:bg-site-accent-hover'
                }`}
                title={hasReachedLimit ? 'You have reached the maximum of 3 rooms' : 'Create a new room'}
              >
                  Create Room
              </button>
              {hasReachedLimit && (
                <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg max-w-sm">
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <p className="text-xs text-amber-700 font-medium">
                    You've reached the maximum of 3 rooms. Delete a room to create a new one.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Empty State */}
          {rooms.length === 0 ? (
            <div className="bg-site-surface rounded-xl shadow-sm border border-site-border p-12 text-center">
              <div className="w-16 h-16 bg-site-soft rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-site-accent" />
              </div>
              <h3 className="text-xl font-semibold text-site-ink mb-2">
                No rooms yet
              </h3>
              <p className="text-site-muted max-w-md mx-auto">
                Create your first room to start collaborating with friends on shared skill maps and compete on leaderboards
              </p>
            </div>
          ) : (
            /* Room List */
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {rooms.map((room) => (
                <RoomCard
                  key={room._id}
                  room={room}
                  onClick={() => handleRoomClick(room._id)}
                  onDelete={(e) => handleDeleteRoom(room, e)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Create Room Modal */}
      {showCreateModal && (
        <CreateRoomModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchRooms();
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmDialog.isOpen}
        title="Delete Room"
        message={`This will permanently delete "${confirmDialog.roomToDelete?.name}" and remove all members. This action cannot be undone.\n\nType "CONFIRM" to proceed.`}
        confirmText="Delete Room"
        confirmStyle="danger"
        requiresTyping={true}
        typingValue="CONFIRM"
        onConfirm={confirmDeleteRoom}
        onCancel={cancelDeleteRoom}
      />
    </div>
  );
}

// Curated icons for RoomSpace
const ROOM_ICONS = [
  'Users', 'BookOpen', 'GraduationCap', 'Code', 'Brain',
  'Target', 'Rocket', 'Trophy', 'Lightbulb', 'Globe',
  'Flame', 'Star', 'Diamond', 'Shield', 'Compass',
];

/* Room Card Component */
function RoomCard({ room, onClick, onDelete }) {
  const isOwner = room.isOwner;
  const memberCount = room.memberCount || 0;
  const themeColor = room.color || '#0d9488';
  const RoomIcon = getIconComponent(room.icon) || Users;

  // Helper to lighten a hex color for backgrounds
  const getLightColor = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, 0.08)`;
  };

  const getBorderColor = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, 0.3)`;
  };

  return (
    <div
      className="rounded-2xl p-8 border-2 hover:shadow-xl transition-all cursor-pointer group relative overflow-hidden"
      style={{
        backgroundColor: getLightColor(themeColor),
        borderColor: getBorderColor(themeColor),
      }}
    >
      {/* Delete button for owners */}
      {isOwner && (
        <button
          onClick={onDelete}
          className="absolute top-4 right-4 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all z-10"
          title="Delete room"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
      
      <div className="relative" onClick={onClick}>
        <div className="flex items-start gap-4 mb-5">
          {/* Room Icon */}
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
            style={{ backgroundColor: themeColor }}
          >
            <RoomIcon className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1 min-w-0 pr-6">
            <div className="flex items-center gap-2 mb-1.5">
              <h3 className="text-xl font-bold truncate" style={{ color: themeColor }}>
                {room.name}
              </h3>
              {isOwner && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold border border-amber-200 flex-shrink-0">
                  <Crown className="w-3 h-3" />
                  Owner
                </span>
              )}
            </div>
            {room.description && (
              <p className="text-sm line-clamp-2 leading-relaxed break-words" style={{ color: `${themeColor}cc` }}>
                {room.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 pt-4 border-t" style={{ borderColor: getBorderColor(themeColor) }}>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5" style={{ color: themeColor }} />
            <span className="text-sm font-semibold" style={{ color: `${themeColor}cc` }}>
              {memberCount} {memberCount === 1 ? "member" : "members"}
            </span>
          </div>
          {!isOwner && (
            <div className="flex items-center gap-1.5">
              <UserCheck className="w-4 h-4" style={{ color: themeColor }} />
              <span className="text-sm font-medium" style={{ color: `${themeColor}cc` }}>Member</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* Create Room Modal Component */
function CreateRoomModal({ onClose, onSuccess }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#0d9488");
  const [icon, setIcon] = useState("Users");
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
      
      await roomsAPI.createRoom({ name: name.trim(), description: description.trim(), color, icon });
      
      showSuccess("Room Created", `"${name.trim()}" has been created successfully`);
      onSuccess();
    } catch (err) {
      // Handle specific error cases
      if (err?.response?.status === 409 && err?.response?.data?.message?.includes("3 rooms")) {
        setError("You can only own up to 3 rooms. Delete an existing room to create a new one.");
      } else if (err?.response?.status === 403 && err?.response?.data?.message?.includes("3 rooms")) {
        setError("You can only own up to 3 rooms. Delete an existing room to create a new one.");
      } else if (err?.response?.status === 400) {
        setError(err.response?.data?.message || "Failed to create room");
      } else {
        handleApiError(err, {
          title: "Failed to Create Room",
          defaultMessage: "Unable to create the room. Please try again.",
          context: { operation: 'createRoom', name: name.trim() }
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-site-surface rounded-2xl shadow-xl w-full max-w-md p-6 border border-site-border">
        <h2 className="text-xl font-bold text-site-ink mb-4">Create Room</h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-site-ink mb-2">
              Room Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={handleNameChange}
              placeholder="e.g., JavaScript Study"
              maxLength={20}
              className={`
                w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-site-accent focus:border-transparent
                ${nameError ? 'border-red-300 bg-red-50' : 'border-site-border'}
              `}
            />
            {nameError && (
              <p className="text-red-600 text-xs mt-1">{nameError}</p>
            )}
            <p className="text-xs text-site-faint mt-1">
              {name.length}/20 characters
            </p>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-site-ink mb-2">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={handleDescriptionChange}
              placeholder="What will you learn together?"
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

          {/* Icon Picker */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-site-ink mb-2">
              Room Icon
            </label>
            <div className="grid grid-cols-5 gap-2">
              {ROOM_ICONS.map((iconName) => {
                const IconComp = getIconComponent(iconName);
                const selected = icon === iconName;
                return (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => setIcon(iconName)}
                    title={iconName}
                    className={`h-10 rounded-lg border-2 flex items-center justify-center transition-all ${
                      selected
                        ? 'border-site-accent bg-site-soft shadow-sm'
                        : 'border-gray-200 bg-white hover:border-site-accent/50 hover:bg-site-soft/50'
                    }`}
                  >
                    {IconComp && <IconComp size={18} className={selected ? 'text-site-accent' : 'text-gray-500'} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color Picker */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-site-ink mb-2">
              Card Color
            </label>
            <div className="grid grid-cols-6 gap-2">
              {COLOR_THEMES.map((theme) => {
                const selected = color === theme.value;
                return (
                  <button
                    key={theme.value}
                    type="button"
                    onClick={() => setColor(theme.value)}
                    title={theme.name}
                    className="relative"
                  >
                    <div
                      className={`w-full h-8 rounded-lg transition-all ${
                        selected
                          ? 'ring-2 ring-offset-2 ring-gray-900 scale-105'
                          : 'hover:scale-110 border-2 border-gray-200'
                      }`}
                      style={{ backgroundColor: theme.value }}
                    >
                      {selected && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Check className="w-4 h-4 text-white drop-shadow-lg" strokeWidth={3} />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
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
              {isSubmitting ? "Creating..." : "Create Room"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
