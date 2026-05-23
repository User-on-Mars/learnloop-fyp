import { useLocation, useNavigate } from "react-router-dom";
import { useActiveSessions } from "../context/ActiveSessionContext";
import { useAuth } from "../useAuth";

// Simple SVG icons to keep it lightweight
const icons = {
  dashboard: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  practice: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  reflect: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  skills: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
    </svg>
  ),
  rooms: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  summary: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
};

const navItems = [
  { id: "dashboard", label: "Home", icon: icons.dashboard, path: "/dashboard" },
  { id: "practice", label: "Practice", icon: icons.practice, path: "/log-practice" },
  { id: "reflect", label: "Reflect", icon: icons.reflect, path: "/reflect" },
  { id: "skills", label: "Skills", icon: icons.skills, path: "/skills" },
  { id: "rooms", label: "Rooms", icon: icons.rooms, path: "/roomspace" },
  { id: "summary", label: "Summary", icon: icons.summary, path: "/weekly-summary" },
];

export default function MobileNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuth();
  const { activeSessions } = useActiveSessions();
  const runningCount = activeSessions.filter((s) => s.isRunning).length;

  // Don't show on public/auth pages
  const publicPaths = ["/", "/login", "/signup", "/forgot", "/reset", "/features", "/about", "/contact"];
  if (!user || publicPaths.includes(location.pathname)) return null;

  const isActive = (path) => {
    if (path === "/skills") {
      return location.pathname === "/skills" || location.pathname.startsWith("/skills/");
    }
    if (path === "/roomspace") {
      return location.pathname === "/roomspace" || location.pathname.startsWith("/roomspace/");
    }
    return location.pathname === path;
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-site-surface border-t border-site-border z-50 safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const active = isActive(item.path);
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors relative ${
                active ? "text-site-accent" : "text-site-faint"
              }`}
            >
              {item.icon}
              <span className="text-[9px] min-[380px]:text-[10px] font-medium leading-none">{item.label}</span>
              {/* Show badge for running sessions on Practice tab */}
              {item.id === "practice" && runningCount > 0 && (
                <span className="absolute top-2 right-1/4 w-4 h-4 bg-green-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {runningCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
