import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Users, Plus, Crown, UserCheck, Trash2, AlertTriangle, Check, 
  Sparkles, Search, ArrowRight, Globe, Zap, Trophy, Target,
  BookOpen, GraduationCap, Code, Brain, Rocket, Lightbulb,
  Flame, Star, Diamond, Shield, Compass, ChevronRight, X, Palette,
} from "lucide-react";
import { roomsAPI } from "../api/client";
import ConfirmationDialog from "../components/ConfirmationDialog";
import HeroSection from "../components/HeroSection";
import Modal, { ModalButton } from "../components/Modal";
import { useToast } from "../context/ToastContext";
import { useApiError } from "../hooks/useApiError";
import { getIconComponent } from "../utils/iconLibrary";
import { COLOR_THEMES } from "../components/ColorPicker";
import { useSubscription } from "../context/SubscriptionContext";

export default function RoomSpace() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all"); // all, owned, member

  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    roomToDelete: null
  });
  const [colorPickerOpen, setColorPickerOpen] = useState(null);

  const { handleApiError } = useApiError();
  const { showSuccess } = useToast();

  const ownedRoomsCount = rooms.filter(room => room.isOwner).length;
  const memberRoomsCount = rooms.filter(room => !room.isOwner).length;
  const { limits, isFree } = useSubscription();
  const maxRooms = limits?.maxRooms === -1 ? Infinity : (limits?.maxRooms ?? 1);
  const hasReachedLimit = ownedRoomsCount >= maxRooms;

  const fetchRooms = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");
      const response = await roomsAPI.getRooms();
      const roomsData = response.data.rooms || [];
      
      const roomsWithOwnership = roomsData.map(room => ({
        ...room,
        isOwner: room.role === 'owner'
      }));
      
      // Sort owned rooms by creation date (newest first) to identify accessible rooms
      const ownedRooms = roomsWithOwnership.filter(r => r.isOwner).sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
      );
      const joinedRooms = roomsWithOwnership.filter(r => !r.isOwner);
      
      // Mark rooms as locked if user is on free plan and has exceeded limit
      // The newest N rooms (index < maxRooms) are unlocked
      const roomsWithLockStatus = roomsWithOwnership.map((room, index) => {
        if (!room.isOwner) return room; // Joined rooms are always accessible
        
        const ownedIndex = ownedRooms.findIndex(r => r._id === room._id);
        const isLocked = isFree && ownedIndex >= maxRooms;
        
        return {
          ...room,
          isLocked
        };
      });
      
      setRooms(roomsWithLockStatus);
    } catch (err) {
      console.error("Failed to fetch rooms:", err);
      setError("Failed to load rooms");
    } finally {
      setIsLoading(false);
    }
  }, [isFree, maxRooms]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  // Filter rooms
  const filteredRooms = rooms.filter(room => {
    const matchesSearch = !searchQuery || 
      room.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      room.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = filterType === "all" || 
      (filterType === "owned" && room.isOwner) ||
      (filterType === "member" && !room.isOwner);
    
    return matchesSearch && matchesFilter;
  });

  const handleRoomClick = (roomId, isLocked) => {
    if (isLocked) {
      // Show upgrade prompt instead of navigating
      navigate('/subscription');
      return;
    }
    navigate(`/roomspace/${roomId}`);
  };

  const handleDeleteRoom = (room, e) => {
    e.stopPropagation();
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
      fetchRooms();
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

  // Close color picker on outside click
  useEffect(() => {
    if (colorPickerOpen) {
      const handleClick = () => setColorPickerOpen(null);
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [colorPickerOpen]);

  // Handle color change for a room
  const handleColorChange = async (roomId, newColor, e) => {
    e.stopPropagation();
    setColorPickerOpen(null);
    try {
      await roomsAPI.updateRoom(roomId, { color: newColor });
      showSuccess('Room color updated!');
      fetchRooms();
    } catch (err) {
      handleApiError(err, {
        title: "Failed to Update Color",
        defaultMessage: "Unable to update the room color. Please try again.",
        context: { operation: 'updateRoomColor', roomId }
      });
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="px-4 sm:px-6 py-6 lg:py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-48 bg-white rounded-2xl border border-[#e2e6dc]" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-white rounded-2xl border border-[#e2e6dc]" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="px-4 sm:px-6 py-6 lg:py-8">
        <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-2xl">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold mb-2">Unable to Load Rooms</h3>
              <p className="text-sm mb-4">{error}</p>
              <button
                onClick={fetchRooms}
                className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 py-6 lg:py-8">

      {/* Hero Header */}
      <HeroSection
            title="RoomSpace"
            subtitle="Collaborative Learning"
            description="Create rooms to learn together with friends. Share skill maps, track progress as a team, and compete on room leaderboards."
            icon={Users}
            gradientFrom="pink-50"
            gradientVia="white"
            gradientTo="rose-50"
            borderColor="pink-100"
            iconGradientFrom="pink-500"
            iconGradientTo="rose-500"
            subtitleColor="pink-600"
            decorColor1="pink-200"
            decorColor2="rose-200"
            actions={[
              {
                label: hasReachedLimit ? "Upgrade to Create" : "Create Room",
                icon: hasReachedLimit ? Crown : Plus,
                onClick: () => {
                  if (hasReachedLimit) {
                    navigate('/subscription');
                  } else {
                    setShowCreateModal(true);
                  }
                },
                variant: "primary"
              }
            ]}
            stats={[
              { icon: Crown, color: "#ec4899", bg: "bg-pink-100", label: "Owned", value: ownedRoomsCount },
              { icon: UserCheck, color: "#f43f5e", bg: "bg-rose-100", label: "Joined", value: memberRoomsCount },
              { icon: Users, color: "#d946ef", bg: "bg-fuchsia-100", label: "Total Rooms", value: rooms.length }
            ]}
            statsColumns="grid-cols-2 sm:grid-cols-3"
            extraContent={hasReachedLimit && (
              <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-800">
                    You've reached the maximum of {limits?.maxRooms ?? 1} room on the free plan.
                  </p>
                  <p className="text-xs text-amber-600 mt-1">
                    Upgrade to Pro for unlimited rooms.
                  </p>
                </div>
                <a 
                  href="/subscription" 
                  className="px-4 py-2 bg-amber-500 text-white text-xs font-bold rounded-lg hover:bg-amber-600 transition-colors whitespace-nowrap"
                >
                  Upgrade
                </a>
              </div>
            )}
          />

          {/* ═══ Search & Filter Bar ═══ */}
          {rooms.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#e2e6dc] p-4 mb-6">
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#c8cec0]" />
                  <input
                    type="text"
                    placeholder="Search rooms..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-[#e2e6dc] rounded-xl outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-400/15 bg-[#fafbf8] text-sm text-[#1c1f1a] placeholder:text-[#c8cec0] transition-all"
                  />
                </div>
                
                {/* Filter Tabs */}
                <div className="flex bg-[#f5f7f2] rounded-xl p-1 border border-[#e8ebe4]">
                  {[
                    { id: 'all', label: 'All', count: rooms.length },
                    { id: 'owned', label: 'Owned', count: ownedRoomsCount },
                    { id: 'member', label: 'Joined', count: memberRoomsCount },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setFilterType(tab.id)}
                      className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                        filterType === tab.id
                          ? 'bg-white text-[#1c1f1a] shadow-sm'
                          : 'text-[#9aa094] hover:text-[#565c52]'
                      }`}
                    >
                      {tab.label} <span className="text-[10px] opacity-60">({tab.count})</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══ Empty State ═══ */}
          {rooms.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#e2e6dc] overflow-hidden">
              <div className="p-12 text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-pink-100 to-rose-100 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-pink-500/10">
                  <Users className="w-10 h-10 text-pink-500" />
                </div>
                <h3 className="text-xl font-bold text-[#1c1f1a] mb-2">
                  No rooms yet
                </h3>
                <p className="text-[#9aa094] max-w-md mx-auto mb-6 text-[15px]">
                  Create your first room to start learning with friends. Share skill maps, track progress together, and compete on leaderboards.
                </p>
                <button
                  onClick={() => {
                    if (hasReachedLimit) {
                      navigate('/subscription');
                    } else {
                      setShowCreateModal(true);
                    }
                  }}
                  className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all shadow-lg ${
                    hasReachedLimit
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 shadow-amber-500/25'
                      : 'bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:from-pink-600 hover:to-rose-600 shadow-pink-500/25'
                  }`}
                >
                  {hasReachedLimit ? (
                    <>
                      <Crown className="w-4 h-4" /> Upgrade to Create More
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" /> Create Your First Room
                    </>
                  )}
                </button>
              </div>

              {/* Feature highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-3 border-t border-[#e2e6dc]">
                {[
                  { icon: Target, color: 'text-blue-500', bg: 'bg-blue-50', title: 'Shared Skill Maps', desc: 'Work through skill maps together' },
                  { icon: Trophy, color: 'text-amber-500', bg: 'bg-amber-50', title: 'Room Leaderboards', desc: 'Compete with room members' },
                  { icon: Zap, color: 'text-emerald-500', bg: 'bg-emerald-50', title: 'Track Progress', desc: 'See everyone\'s learning journey' },
                ].map((feature, i) => (
                  <div key={i} className={`p-6 text-center ${i < 2 ? 'border-b sm:border-b-0 sm:border-r border-[#e2e6dc]' : ''}`}>
                    <div className={`w-10 h-10 ${feature.bg} rounded-xl flex items-center justify-center mx-auto mb-3`}>
                      <feature.icon className={`w-5 h-5 ${feature.color}`} />
                    </div>
                    <h4 className="text-sm font-bold text-[#1c1f1a] mb-1">{feature.title}</h4>
                    <p className="text-sm text-[#9aa094]">{feature.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : filteredRooms.length === 0 ? (
            /* No search results */
            <div className="bg-white rounded-2xl border border-[#e2e6dc] p-12 text-center">
              <div className="w-14 h-14 bg-[#f5f7f2] rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Search className="w-7 h-7 text-[#c8cec0]" />
              </div>
              <h3 className="text-base font-bold text-[#1c1f1a] mb-1">No matching rooms</h3>
              <p className="text-sm text-[#9aa094]">Try adjusting your search or filter</p>
            </div>
          ) : (
            /* ═══ Room Grid ═══ */
            <div className="bg-white rounded-2xl border border-[#e2e6dc]">
              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredRooms.map((room) => (
                  <RoomCard
                    key={room._id}
                    room={room}
                    onClick={() => handleRoomClick(room._id, room.isLocked)}
                    onDelete={(e) => handleDeleteRoom(room, e)}
                    onColorChange={handleColorChange}
                    maxMembers={limits?.maxRoomMembers === -1 ? Infinity : (limits?.maxRoomMembers ?? 3)}
                    colorPickerOpen={colorPickerOpen}
                    setColorPickerOpen={setColorPickerOpen}
                    isLocked={room.isLocked}
                  />
                ))}
              </div>
            </div>
          )}
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

/* ═══ Room Card Component ═══ */
function RoomCard({ room, onClick, onDelete, onColorChange, maxMembers, colorPickerOpen, setColorPickerOpen, isLocked }) {
  const isOwner = room.isOwner;
  const memberCount = room.memberCount || 0;
  const themeColor = room.color || '#ec4899';
  const RoomIcon = getIconComponent(room.icon) || Users;
  const isFull = maxMembers !== Infinity && memberCount >= maxMembers;

  if (isLocked) {
    return (
      <div
        onClick={onClick}
        className="group relative bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-5 transition-all duration-200 border-2 border-amber-200 cursor-pointer hover:shadow-lg hover:border-amber-300 hover:-translate-y-0.5"
      >
        {/* Locked Overlay */}
        <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] rounded-xl flex flex-col items-center justify-center z-10">
          <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-400 rounded-2xl flex items-center justify-center mb-3 shadow-lg">
            <Crown className="w-7 h-7 text-white" />
          </div>
          <p className="text-sm font-bold text-amber-900 mb-1">Pro Required</p>
          <button
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all shadow-md flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Upgrade
          </button>
        </div>

        {/* Blurred Content Behind */}
        <div className="opacity-40">
          <div className="flex items-start gap-3 mb-4">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm text-white shrink-0"
              style={{ backgroundColor: themeColor }}
            >
              <RoomIcon className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[15px] font-bold text-[#1c1f1a] truncate">
                {room.name}
              </h3>
              <p className="text-[12px] text-[#9aa094] line-clamp-1">
                {room.description || 'No description'}
              </p>
            </div>
          </div>

          <div 
            className="flex items-center justify-between p-3 rounded-xl"
            style={{ backgroundColor: `${themeColor}10` }}
          >
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" style={{ color: themeColor }} />
              <span className="text-sm font-semibold text-[#1c1f1a]">{memberCount}</span>
            </div>
            <span className="flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full text-[11px] font-bold">
              <Crown className="w-3 h-3" />
              Owner
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className="group relative bg-[#f8faf6] rounded-xl p-5 transition-all duration-200 border border-[#e2e6dc] cursor-pointer hover:shadow-lg hover:border-[#c8cec0] hover:-translate-y-0.5"
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div 
          className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm text-white shrink-0"
          style={{ backgroundColor: themeColor }}
        >
          <RoomIcon className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[15px] font-bold text-[#1c1f1a] truncate group-hover:text-[#2e5023] transition-colors">
            {room.name}
          </h3>
          {room.description ? (
            <p className="text-[12px] text-[#9aa094] line-clamp-2 leading-relaxed">
              {room.description}
            </p>
          ) : (
            <p className="text-[12px] text-[#c8cec0] italic">No description</p>
          )}
        </div>
        
        {/* Action buttons */}
        {isOwner && (
          <div className="flex items-center gap-1 shrink-0">
            <button 
              onClick={(e) => { e.stopPropagation(); setColorPickerOpen(colorPickerOpen === room._id ? null : room._id); }} 
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[#c8cec0] hover:text-[#565c52] hover:bg-white transition-all opacity-0 group-hover:opacity-100"
              title="Change color"
            >
              <Palette className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onDelete}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[#c8cec0] hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
              title="Delete room"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Color Picker Dropdown */}
        {colorPickerOpen === room._id && (
          <div 
            className="absolute right-4 top-16 bg-white rounded-xl shadow-2xl border border-[#e2e6dc] p-4 z-50 w-60" 
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-[#1c1f1a]">Choose Color</span>
              <button 
                onClick={e => { e.stopPropagation(); setColorPickerOpen(null); }} 
                className="min-w-[44px] min-h-[44px] text-[#c8cec0] hover:text-[#1c1f1a] flex items-center justify-center"
                aria-label="Close color picker"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {COLOR_THEMES.map(theme => (
                <button 
                  key={theme.value} 
                  type="button" 
                  onClick={e => onColorChange(room._id, theme.value, e)} 
                  title={theme.name}
                >
                  <div 
                    className={`w-full aspect-square rounded-lg transition-all hover:scale-110 ${
                      themeColor === theme.value ? 'ring-2 ring-offset-2 ring-[#1c1f1a]' : 'hover:shadow-md'
                    }`} 
                    style={{ backgroundColor: theme.value }}
                  >
                    {themeColor === theme.value && (
                      <div className="flex items-center justify-center h-full">
                        <Check className="w-4 h-4 text-white drop-shadow-lg" strokeWidth={3} />
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Stats Row */}
      <div 
        className="flex items-center justify-between p-3 rounded-xl"
        style={{ backgroundColor: `${themeColor}10` }}
      >
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4" style={{ color: themeColor }} />
          <span className="text-sm font-semibold text-[#1c1f1a]">
            {memberCount}
            {maxMembers !== Infinity && <span className="text-[#9aa094] font-normal">/{maxMembers}</span>}
          </span>
          {isFull && (
            <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">Full</span>
          )}
        </div>

        {/* Role Badge */}
        {isOwner ? (
          <span className="flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full text-[11px] font-bold border border-amber-200">
            <Crown className="w-3 h-3" />
            Owner
          </span>
        ) : (
          <span className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[11px] font-bold border border-emerald-200">
            <UserCheck className="w-3 h-3" />
            Member
          </span>
        )}
      </div>

      {/* Hover action hint */}
      <div className="flex items-center justify-center gap-1 mt-4 text-[12px] font-medium text-[#c8cec0] group-hover:text-[#2e5023] transition-colors">
        <span>Enter Room</span>
        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
      </div>
    </div>
  );
}


/* ═══ Create Room Wizard - Step by Step ═══ */
function CreateRoomModal({ onClose, onSuccess }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#ec4899");
  const [icon, setIcon] = useState("Users");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const { showSuccess } = useToast();
  const { handleApiError } = useApiError();
  const { limits } = useSubscription();

  const totalSteps = 3;

  const canProceed = () => {
    if (step === 1) return name.trim().length > 0 && name.length <= 20;
    return true;
  };

  const handleNext = () => {
    if (step < totalSteps && canProceed()) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setError("");
      
      await roomsAPI.createRoom({ name: name.trim(), description: description.trim(), color, icon });
      
      showSuccess("Room Created!", `"${name.trim()}" is ready for collaboration`);
      onSuccess();
    } catch (err) {
      if (err?.response?.status === 403 || err?.response?.status === 409) {
        setError(err.response?.data?.message || "You've reached your room limit. Upgrade to Pro for unlimited rooms.");
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
    <Modal
      isOpen={true}
      onClose={onClose}
      maxWidth="max-w-lg"
      showCloseButton={false}
      preventBackdropClose={isSubmitting}
      footer={
        <div className="flex gap-3 w-full">
          {/* Back / Cancel Button */}
          <ModalButton
            variant="secondary"
            onClick={step === 1 ? onClose : handleBack}
            disabled={isSubmitting}
          >
            {step === 1 ? (
              <span className="flex items-center justify-center gap-2">
                <X className="w-4 h-4" />
                Cancel
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <ArrowRight className="w-4 h-4 rotate-180" />
                Back
              </span>
            )}
          </ModalButton>

          {/* Next / Create Button */}
          {step < totalSteps ? (
            <ModalButton
              variant="primary"
              onClick={handleNext}
              disabled={!canProceed()}
            >
              <span className="flex items-center justify-center gap-2">
                Next
                <ArrowRight className="w-4 h-4" />
              </span>
            </ModalButton>
          ) : (
            <ModalButton
              variant="primary"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                "Creating..."
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Plus className="w-4 h-4" />
                  Create Room
                </span>
              )}
            </ModalButton>
          )}
        </div>
      }
    >
      {/* Custom Colored Header */}
      <div 
        className="px-6 py-4 -mx-5 sm:-mx-6 -mt-4 sm:-mt-5 mb-4 sm:mb-5 transition-colors"
        style={{ background: `linear-gradient(to right, ${color}, ${color}dd)` }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              {(() => {
                const IconComp = getIconComponent(icon);
                return IconComp ? <IconComp className="w-5 h-5 text-white" /> : <Users className="w-5 h-5 text-white" />;
              })()}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{name || 'Create Room'}</h2>
              <p className="text-white/70 text-xs">Step {step} of {totalSteps}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 min-w-[44px] min-h-[44px] rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Progress Bar */}
        <div className="flex gap-2 mt-4">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-all ${
                s <= step ? 'bg-white' : 'bg-white/30'
              }`}
            />
          ))}
        </div>
      </div>

      {/* ── Step Content ── */}
      <div className="space-y-5">
          
          {/* Step 1: Name & Description */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="text-center mb-6">
                <div className="w-14 h-14 bg-pink-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <BookOpen className="w-7 h-7 text-pink-500" />
                </div>
                <h3 className="text-xl font-bold text-[#1c1f1a]">Name Your Room</h3>
                <p className="text-sm text-[#9aa094] mt-1">Give your room a memorable name</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#1c1f1a] mb-2">
                  Room Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., JavaScript Study Group"
                  maxLength={20}
                  autoFocus
                  className="w-full px-4 py-3 min-h-[44px] border-2 border-[#e2e6dc] rounded-xl focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-400/15 transition-all text-sm"
                />
                <div className="flex justify-end mt-1.5">
                  <span className={`text-[11px] ${name.length > 20 ? 'text-red-500' : 'text-[#9aa094]'}`}>
                    {name.length}/20
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#1c1f1a] mb-2">
                  Description <span className="text-[#9aa094] font-normal">(optional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What will you learn together?"
                  maxLength={200}
                  rows={3}
                  className="w-full px-4 py-3 min-h-[44px] border-2 border-[#e2e6dc] rounded-xl focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-400/15 transition-all text-sm resize-none"
                />
                <div className="flex justify-end mt-1.5">
                  <span className="text-[11px] text-[#9aa094]">{description.length}/200</span>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Icon & Color */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <div className="w-14 h-14 bg-pink-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Sparkles className="w-7 h-7 text-pink-500" />
                </div>
                <h3 className="text-xl font-bold text-[#1c1f1a]">Customize Appearance</h3>
                <p className="text-sm text-[#9aa094] mt-1">Choose an icon and color theme</p>
              </div>

              {/* Icon Picker */}
              <div>
                <label className="block text-sm font-semibold text-[#1c1f1a] mb-3">
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
                        className={`h-12 min-h-[44px] rounded-xl border-2 flex items-center justify-center transition-all ${
                          selected
                            ? 'border-pink-400 bg-pink-50 shadow-md scale-105'
                            : 'border-[#e2e6dc] bg-white hover:border-pink-300 hover:bg-pink-50/50'
                        }`}
                      >
                        {IconComp && <IconComp size={22} className={selected ? 'text-pink-500' : 'text-[#9aa094]'} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color Picker */}
              <div>
                <label className="block text-sm font-semibold text-[#1c1f1a] mb-3">
                  Theme Color
                </label>
                <div className="grid grid-cols-6 gap-3">
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
                          className={`w-full aspect-square rounded-xl transition-all ${
                            selected
                              ? 'ring-2 ring-offset-2 ring-[#1c1f1a] scale-110'
                              : 'hover:scale-105 border-2 border-black/5'
                          }`}
                          style={{ backgroundColor: theme.value }}
                        >
                          {selected && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Check className="w-5 h-5 text-white drop-shadow-lg" strokeWidth={3} />
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Review & Create */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="text-center mb-6">
                <div className="w-14 h-14 bg-pink-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Check className="w-7 h-7 text-pink-500" />
                </div>
                <h3 className="text-xl font-bold text-[#1c1f1a]">Review & Create</h3>
                <p className="text-sm text-[#9aa094] mt-1">Everything looks good?</p>
              </div>

              {/* Preview Card */}
              <div className="bg-[#f8faf6] rounded-2xl border border-[#e2e6dc] p-5">
                <div className="flex items-start gap-4">
                  <div
                    className="w-16 h-16 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0"
                    style={{ 
                      backgroundColor: color,
                      boxShadow: `0 8px 16px -4px ${color}40`
                    }}
                  >
                    {(() => {
                      const IconComp = getIconComponent(icon);
                      return IconComp ? <IconComp size={28} className="text-white" /> : null;
                    })()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-lg font-bold text-[#1c1f1a] mb-1">{name || 'Room Name'}</h4>
                    <p className="text-sm text-[#9aa094] leading-relaxed">
                      {description || 'No description provided'}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-[#e2e6dc] flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" style={{ color }} />
                    <span className="text-sm text-[#565c52]">1 member (you)</span>
                  </div>
                  <span className="flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full text-[11px] font-bold">
                    <Crown className="w-3 h-3" />
                    Owner
                  </span>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Zap className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-emerald-800">Ready to collaborate!</p>
                    <p className="text-xs text-emerald-600 mt-0.5">
                      After creating, you can invite friends and add skill maps to learn together.
                    </p>
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  {error}
                </div>
              )}
            </div>
          )}
        </div>
    </Modal>
  );
}
