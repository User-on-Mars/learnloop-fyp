/**
 * DataTable Component - Usage Examples
 * 
 * This file demonstrates how to use the DataTable component for different use cases
 * found in the LearnLoop application.
 */

import DataTable from "./DataTable";
import { MapPin, Award, Clock, Sparkles, ArrowUpRight } from "lucide-react";
import { SkillIcon } from "./IconPicker";

// ============================================================================
// Example 1: Skill Maps Table (Dashboard)
// ============================================================================

function SkillMapsTable({ skills, onSkillClick }) {
  const columns = [
    {
      key: "index",
      label: "#",
      span: 1,
      render: (_, index) => (
        <span className="text-[12px] text-[#9aa094] font-medium">
          {index + 1}
        </span>
      ),
    },
    {
      key: "name",
      label: "Name",
      span: 4,
      render: (skill) => (
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border"
            style={{
              backgroundColor: skill.color + "15",
              borderColor: skill.color + "25",
              color: skill.color,
            }}
          >
            <SkillIcon name={skill.icon || "Map"} size={16} />
          </div>
          <span className="text-[13px] font-semibold text-[#1c1f1a] truncate group-hover:text-sky-600 transition-colors">
            {skill.name}
          </span>
        </div>
      ),
    },
    {
      key: "nodes",
      label: "Nodes",
      span: 2,
      align: "center",
      render: (skill) => (
        <span className="text-[12px] text-[#9aa094]">
          {skill.completedNodes || 0}/{skill.nodeCount || 0}
        </span>
      ),
    },
    {
      key: "progress",
      label: "Progress",
      span: 3,
      render: (skill) => {
        const pct = skill.completionPercentage || 0;
        return (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-[5px] bg-[#e8ece3] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${pct}%`,
                  backgroundColor: skill.color || "#2e5023",
                }}
              />
            </div>
            <span
              className="text-[11px] font-bold tabular-nums"
              style={{ color: skill.color || "#2e5023" }}
            >
              {pct}%
            </span>
          </div>
        );
      },
    },
    {
      key: "status",
      label: "Status",
      span: 2,
      align: "right",
      render: (skill) => {
        const pct = skill.completionPercentage || 0;
        const isComplete = pct === 100;

        if (isComplete) {
          return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-full border border-emerald-200">
              <Sparkles className="w-3 h-3" /> Completed
            </span>
          );
        } else if (pct > 0) {
          return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-800 text-[11px] font-bold rounded-full border border-amber-200">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />{" "}
              In Progress
            </span>
          );
        } else {
          return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 text-gray-600 text-[11px] font-bold rounded-full border border-gray-200">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400" /> Not
              Started
            </span>
          );
        }
      },
    },
  ];

  const renderMobileCard = (skill, index) => {
    const pct = skill.completionPercentage || 0;
    const done = skill.completedNodes || 0;
    const total = skill.nodeCount || 0;
    const color = skill.color || "#2e5023";
    const isComplete = pct === 100;

    return (
      <>
        {/* Header Row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border"
              style={{
                backgroundColor: color + "15",
                borderColor: color + "25",
                color,
              }}
            >
              <SkillIcon name={skill.icon || "Map"} size={16} />
            </div>
            <span className="text-[13px] font-semibold text-[#1c1f1a]">
              {skill.name}
            </span>
          </div>
          {isComplete ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full border border-emerald-200">
              <Sparkles className="w-3 h-3" /> Done
            </span>
          ) : pct > 0 ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full border border-amber-200">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />{" "}
              Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 text-gray-600 text-[10px] font-bold rounded-full border border-gray-200">
              New
            </span>
          )}
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <p className="text-[11px] text-[#9aa094] mb-1">Nodes</p>
            <p className="text-[13px] font-semibold text-[#1c1f1a]">
              {done}/{total}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-[#9aa094] mb-1">Progress</p>
            <p
              className="text-[13px] font-semibold"
              style={{ color }}
            >
              {pct}%
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-[5px] bg-[#e8ece3] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, backgroundColor: color }}
            />
          </div>
        </div>
      </>
    );
  };

  return (
    <DataTable
      data={skills}
      columns={columns}
      renderMobileCard={renderMobileCard}
      onRowClick={onSkillClick}
      emptyMessage="No skill maps yet"
      emptyIcon={<MapPin className="w-7 h-7 text-gray-300" />}
      emptyAction={
        <button className="inline-flex items-center gap-1 text-xs text-sky-600 font-bold hover:underline">
          Create skill map <ArrowUpRight className="w-3 h-3" />
        </button>
      }
    />
  );
}

// ============================================================================
// Example 2: Reflections Table (Dashboard)
// ============================================================================

function ReflectionsTable({ reflections, onReflectionClick }) {
  const moods = {
    Happy: { emoji: "😊", label: "Happy", cls: "text-emerald-700 bg-emerald-50" },
    Neutral: { emoji: "😐", label: "Neutral", cls: "text-gray-600 bg-gray-100" },
    Sad: { emoji: "😔", label: "Struggling", cls: "text-blue-700 bg-blue-50" },
    Energized: { emoji: "⚡", label: "Energized", cls: "text-amber-700 bg-amber-50" },
    Thoughtful: { emoji: "🧠", label: "Thoughtful", cls: "text-violet-700 bg-violet-50" },
  };

  const columns = [
    {
      key: "index",
      label: "#",
      span: 1,
      render: (_, index) => (
        <span className="text-[12px] text-[#9aa094] font-medium">
          {index + 1}
        </span>
      ),
    },
    {
      key: "title",
      label: "Title",
      span: 4,
      render: (reflection) => (
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-[#1c1f1a] truncate group-hover:text-sky-600 transition-colors">
            {reflection.title || "Untitled"}
          </p>
          <p className="text-[11px] text-[#9aa094] truncate">
            {reflection.content?.slice(0, 50)}
            {reflection.content?.length > 50 ? "..." : ""}
          </p>
        </div>
      ),
    },
    {
      key: "mood",
      label: "Mood",
      span: 2,
      align: "center",
      render: (reflection) => {
        const m = moods[reflection.mood] || {
          emoji: "—",
          label: reflection.mood || "None",
          cls: "text-gray-500 bg-gray-50",
        };
        return (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${m.cls}`}
          >
            {m.emoji} {m.label}
          </span>
        );
      },
    },
    {
      key: "date",
      label: "Date",
      span: 3,
      render: (reflection) => (
        <span className="text-[12px] text-[#9aa094]">
          {new Date(reflection.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
      ),
    },
    {
      key: "action",
      label: "Action",
      span: 2,
      align: "right",
      render: () => (
        <span className="inline-flex px-3 py-1 bg-sky-600 text-white text-[10px] font-bold rounded-lg">
          View
        </span>
      ),
    },
  ];

  const renderMobileCard = (reflection) => {
    const m = moods[reflection.mood] || {
      emoji: "—",
      label: reflection.mood || "None",
      cls: "text-gray-500 bg-gray-50",
    };

    return (
      <>
        {/* Header Row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">{m.emoji}</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${m.cls}`}
            >
              {m.label}
            </span>
          </div>
          <span className="text-[11px] text-[#9aa094]">
            {new Date(reflection.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-[13px] font-semibold text-[#1c1f1a] mb-2">
          {reflection.title || "Untitled"}
        </h3>

        {/* Content Preview */}
        <p className="text-[12px] text-[#565c52] line-clamp-2 mb-3">
          {reflection.content}
        </p>

        {/* Action */}
        <div className="flex justify-end">
          <span className="inline-flex px-3 py-1.5 bg-sky-600 text-white text-[11px] font-bold rounded-lg">
            View Details
          </span>
        </div>
      </>
    );
  };

  return (
    <DataTable
      data={reflections}
      columns={columns}
      renderMobileCard={renderMobileCard}
      onRowClick={onReflectionClick}
      emptyMessage="No reflections yet"
      emptyIcon={<Award className="w-6 h-6 text-gray-300" />}
      emptyAction={
        <button className="inline-flex items-center gap-1 text-xs text-sky-600 font-bold hover:underline">
          Write a reflection <ArrowUpRight className="w-3 h-3" />
        </button>
      }
    />
  );
}

// ============================================================================
// Example 3: Sessions Table (Dashboard)
// ============================================================================

function SessionsTable({ sessions, onSessionClick }) {
  const timeAgo = (d) => {
    const diff = Date.now() - new Date(d).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(diff / 3600000);
    if (h < 24) return `${h}h ago`;
    const dy = Math.floor(diff / 86400000);
    if (dy < 7) return `${dy}d ago`;
    return new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const columns = [
    {
      key: "index",
      label: "#",
      span: 1,
      render: (_, index) => (
        <span className="text-[12px] text-[#9aa094] font-medium">
          {index + 1}
        </span>
      ),
    },
    {
      key: "skill",
      label: "Skill",
      span: 3,
      render: (session) => (
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#f0f2eb] flex items-center justify-center flex-shrink-0">
            <span className="text-[#2e5023] text-[11px] font-bold">
              {session.skillName?.charAt(0).toUpperCase()}
            </span>
          </div>
          <span className="text-[13px] font-semibold text-[#1c1f1a] truncate group-hover:text-sky-600 transition-colors">
            {session.skillName}
          </span>
        </div>
      ),
    },
    {
      key: "type",
      label: "Type",
      span: 2,
      align: "center",
      render: (session) => {
        const isSkillMap = !!session.skillId;
        return (
          <span
            className={`inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded ${
              isSkillMap
                ? "bg-blue-50 text-blue-700"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            {isSkillMap ? "Skill Map" : "Free"}
          </span>
        );
      },
    },
    {
      key: "duration",
      label: "Duration",
      span: 2,
      align: "center",
      render: (session) => (
        <span className="text-[12px] text-[#9aa094]">
          {session.minutesPracticed}min
        </span>
      ),
    },
    {
      key: "when",
      label: "When",
      span: 2,
      render: (session) => (
        <span className="text-[12px] text-[#9aa094]">
          {timeAgo(session.date)}
        </span>
      ),
    },
    {
      key: "action",
      label: "Action",
      span: 2,
      align: "right",
      render: () => (
        <span className="inline-flex px-3 py-1 bg-sky-600 text-white text-[10px] font-bold rounded-lg">
          View Details
        </span>
      ),
    },
  ];

  const renderMobileCard = (session) => {
    const isSkillMap = !!session.skillId;

    return (
      <>
        {/* Header Row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#f0f2eb] flex items-center justify-center flex-shrink-0">
              <span className="text-[#2e5023] text-[11px] font-bold">
                {session.skillName?.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="text-[13px] font-semibold text-[#1c1f1a] truncate">
              {session.skillName}
            </span>
          </div>
          <span
            className={`inline-flex px-2 py-0.5 text-[9px] font-bold rounded flex-shrink-0 ${
              isSkillMap
                ? "bg-blue-50 text-blue-700"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            {isSkillMap ? "Skill Map" : "Free"}
          </span>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <p className="text-[11px] text-[#9aa094] mb-1">Duration</p>
            <p className="text-[13px] font-semibold text-[#1c1f1a]">
              {session.minutesPracticed} minutes
            </p>
          </div>
          <div>
            <p className="text-[11px] text-[#9aa094] mb-1">When</p>
            <p className="text-[13px] font-semibold text-[#1c1f1a]">
              {timeAgo(session.date)}
            </p>
          </div>
        </div>

        {/* Action */}
        <div className="flex justify-end">
          <span className="inline-flex px-3 py-1.5 bg-sky-600 text-white text-[11px] font-bold rounded-lg">
            View Details
          </span>
        </div>
      </>
    );
  };

  return (
    <DataTable
      data={sessions}
      columns={columns}
      renderMobileCard={renderMobileCard}
      onRowClick={onSessionClick}
      emptyMessage="No sessions yet"
      emptyIcon={<Clock className="w-6 h-6 text-gray-300" />}
    />
  );
}

export { SkillMapsTable, ReflectionsTable, SessionsTable };
