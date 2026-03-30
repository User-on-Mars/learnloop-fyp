import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";
import { useActiveSessions } from "../context/ActiveSessionContext";
import LogoMark from "./LogoMark";

// Icons
const HomeIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const ClockIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ReflectIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const SkillMapIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
  </svg>
);

const SummaryIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const LogoutIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);

const UserIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const ChevronIcon = ({ isOpen }) => (
  <svg className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const AlertIcon = () => (
  <svg className="w-12 h-12 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: HomeIcon, path: '/dashboard' },
  { id: 'log-practice', label: 'Log Practice', icon: ClockIcon, path: '/log-practice' },
  { id: 'reflect', label: 'Reflect', icon: ReflectIcon, path: '/reflect' },
  { id: 'skills', label: 'Skill Maps', icon: SkillMapIcon, path: '/skills' },
  { id: 'summary', label: 'Weekly Summary', icon: SummaryIcon, path: '/weekly-summary' },
];

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = auth.currentUser;
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const menuRef = useRef(null);
  
  const { activeSessions, clearAllSessions } = useActiveSessions();
  const hasActiveSessions = activeSessions.length > 0;
  const runningSessions = activeSessions.filter(s => s.isRunning);

  /** Highlights Skill Maps when browsing legacy /skills or new /maps experience. */
  const isActive = (path) => {
    if (path === '/skills') {
      return (
        location.pathname === '/skills' ||
        location.pathname.startsWith('/skills/') ||
        location.pathname.startsWith('/maps')
      );
    }
    return location.pathname === path;
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogoutClick = () => {
    setShowUserMenu(false);
    if (hasActiveSessions) {
      setShowLogoutConfirm(true);
    } else {
      performLogout();
    }
  };

  const performLogout = async () => {
    try {
      clearAllSessions();
      await signOut(auth);
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const getInitials = () => {
    if (user?.displayName) {
      const names = user.displayName.split(' ');
      return names.length > 1 
        ? `${names[0].charAt(0)}${names[1].charAt(0)}`.toUpperCase()
        : names[0].charAt(0).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return "U";
  };

  return (
    <>
      <aside className="w-60 bg-site-surface border-r border-site-border sticky top-0 h-screen overflow-y-auto flex-col hidden md:flex">
        {/* Logo */}
        <div className="p-4 sm:p-6">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 text-left w-full rounded-lg hover:bg-site-soft transition-colors p-1 -m-1"
          >
            <LogoMark size={36} className="w-9 h-9 rounded-lg" />
            <span className="text-lg sm:text-xl font-bold text-site-ink tracking-tight">LearnLoop</span>
          </button>
        </div>
        
        {/* Navigation */}
        <nav className="px-3 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors
                  ${active 
                    ? 'bg-site-soft text-site-accent font-semibold' 
                    : 'text-site-muted hover:bg-site-bg'
                  }
                `}
              >
                <Icon />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User Profile Section with Popup Menu */}
        <div className="p-3 border-t border-site-border relative" ref={menuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
              showUserMenu ? 'bg-site-soft' : 'bg-site-bg hover:bg-site-soft/80'
            }`}
          >
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              {user?.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt="User avatar" 
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-white"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-site-accent flex items-center justify-center text-white font-semibold text-sm">
                  {getInitials()}
                </div>
              )}
              {/* Online indicator */}
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
            </div>
            
            {/* User Info */}
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium text-site-ink truncate">
                {user?.displayName || "User"}
              </p>
              <p className="text-xs text-site-faint truncate">
                {user?.email}
              </p>
            </div>
            
            {/* Chevron */}
            <ChevronIcon isOpen={showUserMenu} />
          </button>

          {/* Popup Menu */}
          {showUserMenu && (
            <div className="absolute bottom-full left-3 right-3 mb-2 bg-site-surface rounded-lg shadow-lg border border-site-border overflow-hidden z-50">
              <div className="py-1">
                <button
                  onClick={() => {
                    navigate('/profile');
                    setShowUserMenu(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-site-muted hover:bg-site-bg transition-colors"
                >
                  <UserIcon />
                  <span>View Profile</span>
                </button>
                <div className="border-t border-site-border my-1"></div>
                <button
                  onClick={handleLogoutClick}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogoutIcon />
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-site-surface rounded-2xl shadow-xl w-full max-w-sm p-6 border border-site-border">
            <div className="flex flex-col items-center text-center">
              <AlertIcon />
              <h3 className="text-lg font-bold text-site-ink mt-4 mb-2">
                Active Sessions Running
              </h3>
              <p className="text-site-muted text-sm mb-4">
                You have {activeSessions.length} active session{activeSessions.length > 1 ? 's' : ''}
                {runningSessions.length > 0 && (
                  <span className="text-amber-600 font-medium">
                    {' '}({runningSessions.length} currently running)
                  </span>
                )}. 
                Logging out will discard all unsaved progress.
              </p>
              
              {/* Session Preview */}
              <div className="w-full bg-site-bg rounded-lg p-3 mb-4 max-h-32 overflow-y-auto border border-site-border">
                {activeSessions.slice(0, 3).map(session => (
                  <div key={session.id} className="flex items-center justify-between py-1 text-sm">
                    <span className="text-site-ink truncate">{session.skillName}</span>
                    <span className={`font-mono ${session.isRunning ? 'text-green-600' : 'text-gray-500'}`}>
                      {Math.floor(session.timer / 60)}m
                    </span>
                  </div>
                ))}
                {activeSessions.length > 3 && (
                  <p className="text-xs text-site-faint mt-1">+{activeSessions.length - 3} more</p>
                )}
              </div>

              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 py-2.5 border border-site-border text-site-muted rounded-lg font-medium hover:bg-site-bg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={performLogout}
                  className="flex-1 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
                >
                  Sign Out Anyway
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
