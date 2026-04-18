import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Lock, Unlock, CheckCircle, Check, ChevronRight, ChevronLeft,
  Target, FileText, Rocket, Trophy,
} from "lucide-react";
import { roomsAPI } from "../api/client.ts";
import { auth } from "../firebase";
import Sidebar from "../components/Sidebar";
import { SkillIcon } from "../components/IconPicker";
import { useToast } from "../context/ToastContext";

export default function RoomSkillMapDetail() {
  const { roomId, roomSkillMapId } = useParams();
  const navigate = useNavigate();
  const { showSuccess } = useToast();

  const [skillMap, setSkillMap] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingNodeId, setUpdatingNodeId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [lockedNodeId, setLockedNodeId] = useState(null);

  const fetchDetail = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");
      const res = await roomsAPI.getRoomSkillMapDetail(roomId, roomSkillMapId);
      setSkillMap(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load skill map");
    } finally {
      setIsLoading(false);
    }
  }, [roomId, roomSkillMapId]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  useEffect(() => {
    if (lockedNodeId) {
      const timer = setTimeout(() => setLockedNodeId(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [lockedNodeId]);

  const handleNodeAction = async (node, newStatus) => {
    try {
      setUpdatingNodeId(node._id);
      await roomsAPI.updateNodeStatus(roomId, roomSkillMapId, node._id, newStatus);
      await fetchDetail();
      showSuccess("Progress Updated", `"${node.title}" marked as ${newStatus.replace("_", " ")}`);
    } catch (err) {
      console.error("Failed to update node:", err);
    } finally {
      setUpdatingNodeId(null);
    }
  };

  const handleNodeClick = (node, index) => {
    if (node.status === "Locked" && index > 0) {
      setLockedNodeId(node._id);
      return;
    }
    // Navigate to node detail page for practice
    navigate(`/roomspace/${roomId}/skill-maps/${roomSkillMapId}/nodes/${node._id}`);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-site-bg">
        <Sidebar />
        <main className="flex-1 overflow-y-auto w-full">
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-site-accent mx-auto mb-4" />
              <p className="text-site-muted">Loading skill map...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !skillMap) {
    return (
      <div className="flex min-h-screen bg-site-bg">
        <Sidebar />
        <main className="flex-1 overflow-y-auto w-full">
          <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="bg-red-50 border border-red-300 text-red-700 p-6 rounded-lg">
              <p>{error || "Skill map not found"}</p>
              <button onClick={() => navigate(`/roomspace/${roomId}`)} className="mt-3 text-sm underline">Back to Room</button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const nodes = (skillMap.nodes || []).sort((a, b) => a.order - b.order);
  const completedCount = nodes.filter(n => n.status === "Completed").length;
  const totalNodes = nodes.length;
  const completionPercentage = totalNodes > 0 ? Math.round((completedCount / totalNodes) * 100) : 0;
  const allDone = totalNodes > 0 && completedCount === totalNodes;
  const icon = skillMap.icon || "Map";

  return (
    <div className="flex min-h-screen bg-site-bg">
      <Sidebar />
      <main className="flex-1 overflow-y-auto w-full">
        <div className="flex min-h-screen bg-site-bg relative overflow-hidden">
          {/* Pixel Art Background */}
          <div className="absolute inset-0 pointer-events-none opacity-30" style={{
            backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 10px, rgba(0,0,0,0.03) 10px, rgba(0,0,0,0.03) 11px), repeating-linear-gradient(90deg, transparent, transparent 10px, rgba(0,0,0,0.03) 10px, rgba(0,0,0,0.03) 11px)`,
            backgroundSize: '11px 11px'
          }} />

          {/* Decorative elements */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.35]">
            <svg className="absolute top-[5%] left-[5%]" width="28" height="44" viewBox="0 0 7 11"><rect x="3" y="7" width="1" height="4" fill="#6B4226"/><rect x="1" y="3" width="5" height="4" fill="#2e5023"/><rect x="2" y="1" width="3" height="2" fill="#4f7942"/></svg>
            <svg className="absolute top-[40%] left-[3%]" width="32" height="48" viewBox="0 0 8 12"><rect x="3" y="8" width="2" height="4" fill="#6B4226"/><rect x="1" y="4" width="6" height="4" fill="#2e5023"/><rect x="2" y="2" width="4" height="2" fill="#4f7942"/></svg>
            <svg className="absolute top-[80%] left-[6%]" width="36" height="52" viewBox="0 0 9 13"><rect x="4" y="9" width="2" height="4" fill="#8B5E3C"/><rect x="1" y="4" width="7" height="5" fill="#2e5023"/><rect x="2" y="1" width="5" height="3" fill="#4f7942"/></svg>
            <svg className="absolute top-[20%] right-[6%]" width="36" height="52" viewBox="0 0 9 13"><rect x="3" y="9" width="3" height="4" fill="#8B5E3C"/><rect x="1" y="4" width="7" height="5" fill="#2e5023"/><rect x="2" y="1" width="5" height="3" fill="#4f7942"/></svg>
            <svg className="absolute top-[60%] right-[4%]" width="28" height="44" viewBox="0 0 7 11"><rect x="3" y="7" width="1" height="4" fill="#6B4226"/><rect x="1" y="3" width="5" height="4" fill="#2e5023"/><rect x="2" y="1" width="3" height="2" fill="#4f7942"/></svg>
          </div>

          {/* Main Content */}
          <div className={`flex-1 py-4 sm:py-8 px-3 sm:px-4 transition-all duration-300 relative z-10 ${isSidebarOpen ? 'mr-0 lg:mr-80' : 'mr-0'}`}>
            <div className="max-w-3xl mx-auto">
              {/* Back Button */}
              <div className="mb-4 sm:mb-6">
                <button
                  onClick={() => navigate(`/roomspace/${roomId}`)}
                  className="px-4 sm:px-6 py-2.5 rounded-lg font-medium transition bg-[#2e5023] text-white hover:bg-[#1f3518] active:opacity-90 text-sm sm:text-base min-h-[44px] shadow-lg border-2 border-[#1f3518]"
                >
                  Back to Room
                </button>
              </div>

              {/* Compact Header */}
              <div className="bg-white/95 backdrop-blur-sm rounded-xl border-4 border-site-accent p-4 mb-4 shadow-lg overflow-hidden">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0 overflow-hidden">
                    <span className="shrink-0"><SkillIcon name={icon} size={28} className="text-site-accent" /></span>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate min-w-0">{skillMap.name}</h1>
                  </div>
                  <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="p-2 text-gray-400 hover:text-site-accent hover:bg-site-soft rounded-lg transition-colors lg:hidden"
                  >
                    {isSidebarOpen ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="bg-white/95 backdrop-blur-sm rounded-lg border-4 border-site-accent p-4 mb-6 shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs sm:text-sm font-bold text-gray-700">Progress</span>
                  <span className="text-xs sm:text-sm font-bold text-gray-900">{completedCount} / {totalNodes} nodes</span>
                </div>
                <div className="w-full bg-gray-300 rounded-full h-3 border-2 border-gray-400">
                  <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 h-full rounded-full transition-all duration-500 border-r-2 border-yellow-600" style={{ width: `${completionPercentage}%` }} />
                </div>
                <div className="text-right mt-1">
                  <span className="text-xs font-bold text-gray-600">{completionPercentage}%</span>
                </div>
              </div>

              {/* Node Path */}
              <div className="relative pb-12">
                {nodes.map((node, index) => {
                  const isCompleted = node.status === "Completed";
                  const isUnlocked = node.status === "Unlocked" || node.status === "In_Progress" || (index === 0 && node.status === "Locked");
                  const isInProgress = node.status === "In_Progress";
                  const isFirst = index === 0;
                  const isLeft = index % 2 === 0;
                  const prevCompleted = index > 0 && nodes[index - 1].status === "Completed";
                  const isLocked = node.status === "Locked" && index > 0;
                  const isUpdating = updatingNodeId === node._id;

                  let outerCls, innerCls;
                  if (isCompleted) { outerCls = "border-green-400 bg-green-50"; innerCls = "bg-green-500"; }
                  else if (isUnlocked) { outerCls = "border-site-accent bg-site-soft"; innerCls = "bg-site-accent"; }
                  else { outerCls = "border-gray-300 bg-gray-50"; innerCls = "bg-gray-300"; }

                  return (
                    <div key={node._id} className="flex flex-col items-center">
                      {index > 0 && (
                        <div className={`w-1 h-10 rounded-full ${prevCompleted ? "bg-green-400" : "bg-gray-200"}`} />
                      )}
                      <div className={`w-full flex ${isLeft ? "justify-start pl-6 sm:pl-16" : "justify-end pr-6 sm:pr-16"}`}>
                        <div
                          className={`flex flex-col items-center ${isLocked ? "cursor-not-allowed" : "cursor-pointer"}`}
                          onClick={() => !isUpdating && handleNodeClick(node, index)}
                        >
                          <div className={`relative w-20 h-20 sm:w-24 sm:h-24 rounded-full border-[3px] flex items-center justify-center transition-all duration-300 shadow-lg hover:scale-105 ${outerCls} ${isUpdating ? "animate-pulse" : ""}`}>
                            <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center ${innerCls}`}>
                              {isFirst && !isCompleted ? <Rocket className="w-7 h-7 sm:w-8 sm:h-8 text-white" strokeWidth={2} />
                              : isCompleted ? <CheckCircle className="w-7 h-7 sm:w-8 sm:h-8 text-white" strokeWidth={2} />
                              : isUnlocked ? <Unlock className="w-7 h-7 sm:w-8 sm:h-8 text-white" strokeWidth={2} />
                              : <Lock className="w-7 h-7 sm:w-8 sm:h-8 text-white" strokeWidth={2} />}
                            </div>
                            {isCompleted && (
                              <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center shadow border-2 border-white">
                                <Check className="w-3 h-3 text-white" />
                              </div>
                            )}
                            {isLocked && lockedNodeId === node._id && (
                              <div className="absolute inset-0 bg-red-500/90 rounded-full flex items-center justify-center animate-pulse">
                                <p className="text-white text-[9px] font-bold text-center px-1">Complete previous</p>
                              </div>
                            )}
                          </div>
                          <p className="mt-1.5 text-xs font-semibold text-center max-w-[120px] truncate text-gray-700">{node.title}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Goal Card */}
              {skillMap.goal && (
                <div className="flex flex-col items-center mt-0 mb-8">
                  <div className={`w-1 h-12 rounded-full ${nodes.length > 0 && nodes[nodes.length - 1].status === "Completed" ? "bg-yellow-400" : "bg-gray-200"}`} />
                  <div className={`relative w-full max-w-sm p-6 rounded-2xl text-center transition-all duration-500 ${allDone ? "bg-gradient-to-br from-yellow-100 via-amber-50 to-yellow-100 border-2 border-yellow-400 shadow-xl shadow-yellow-200/50" : "bg-white/80 border-2 border-dashed border-gray-300"}`}>
                    {allDone && <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-yellow-400 text-white text-[10px] font-bold rounded-full uppercase tracking-wider shadow">Achieved</div>}
                    <Trophy className={`w-10 h-10 mx-auto mb-2 ${allDone ? "text-yellow-500" : "text-gray-300"}`} />
                    <p className={`text-lg font-bold mb-1 ${allDone ? "text-yellow-700" : "text-gray-400"}`}>{allDone ? "🎉 Goal Complete!" : "Goal"}</p>
                    <p className={`text-sm ${allDone ? "text-yellow-600" : "text-gray-400"}`}>{skillMap.goal}</p>
                    {!allDone && <p className="text-[10px] text-gray-400 mt-2">Complete all {totalNodes} nodes to unlock</p>}
                  </div>
                </div>
              )}

              {nodes.length === 0 && (
                <div className="text-center py-12 text-gray-700 text-sm">No nodes found for this skill map.</div>
              )}
            </div>
          </div>

          {/* Right Sidebar */}
          <div className={`fixed lg:fixed top-0 right-0 h-full bg-white border-l-4 border-site-accent shadow-xl transition-transform duration-300 z-40 ${isSidebarOpen ? "translate-x-0" : "translate-x-full"} w-80 flex flex-col`}>
            <div className="flex items-center justify-between p-4 border-b-4 border-site-accent bg-gradient-to-r from-green-100 to-emerald-100">
              <h2 className="text-lg font-bold text-gray-900">Details</h2>
            </div>
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-6">
              {/* Name */}
              <div className="bg-white rounded-lg p-4 border-2 border-gray-300 shadow-md">
                <div className="flex items-center gap-3">
                  <span className="shrink-0"><SkillIcon name={icon} size={32} className="text-site-accent" /></span>
                  <h3 className="text-lg font-bold text-gray-900 truncate">{skillMap.name}</h3>
                </div>
              </div>

              {/* Goal */}
              <div className="bg-site-soft rounded-lg p-4 border-2 border-site-border shadow-md">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-site-accent" />
                  <h3 className="text-sm font-bold text-gray-900">Goal</h3>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed break-words">{skillMap.goal || "No goal set"}</p>
              </div>

              {/* Description */}
              {skillMap.description && (
                <div className="bg-white rounded-lg p-4 border-2 border-gray-300 shadow-md">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-gray-500" />
                    <h3 className="text-sm font-bold text-gray-900">Description</h3>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed break-words">{skillMap.description}</p>
                </div>
              )}

              {/* Nodes List */}
              <div className="bg-site-soft rounded-lg p-4 border-2 border-site-border shadow-md">
                <h3 className="text-sm font-bold text-gray-900 mb-3">Nodes ({completedCount}/{totalNodes})</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {nodes.map((node, index) => (
                    <div key={node._id} className={`bg-white rounded p-2 border text-xs ${node.status === "Completed" ? "border-green-300 bg-green-50" : "border-site-border"}`}>
                      <div className="flex items-center gap-2">
                        {node.status === "Completed" ? (
                          <CheckCircle className="w-3 h-3 text-green-500 shrink-0" />
                        ) : (
                          <div className="w-3 h-3 rounded-full border border-gray-300 shrink-0" />
                        )}
                        <span className="font-semibold text-gray-700 truncate">{index + 1}. {node.title}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Toggle sidebar button */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`fixed top-4 p-2.5 bg-white border-2 border-site-accent rounded-full shadow-lg hover:shadow-xl transition-all z-50 hover:bg-site-soft ${isSidebarOpen ? "right-[20.5rem]" : "right-4"}`}
          >
            {isSidebarOpen ? <ChevronRight className="w-5 h-5 text-site-accent" /> : <ChevronLeft className="w-5 h-5 text-site-accent" />}
          </button>

          {/* Mobile Overlay */}
          {isSidebarOpen && <div className="fixed inset-0 bg-black/30 z-30 lg:hidden" onClick={() => setIsSidebarOpen(false)} />}
        </div>
      </main>
    </div>
  );
}
