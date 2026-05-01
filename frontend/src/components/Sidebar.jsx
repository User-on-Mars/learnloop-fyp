import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";
import { useActiveSessions } from "../context/ActiveSessionContext";
import { useAdmin } from "../hooks/useAdmin";
import { useSubscription } from "../context/SubscriptionContext";
import LogoMark from "./LogoMark";
import { Avatar } from "./Avatar";
import NotificationBell from "./NotificationBell";
import Modal, { ModalButton } from "./Modal";
import { Menu, Plus, PenLine } from "lucide-react";

/* ─── Icon components (unchanged) ─── */
const HomeIcon = () => (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>);
const ClockIcon = () => (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>);
const ReflectIcon = () => (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>);
const SkillMapIcon = () => (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>);
const SummaryIcon = () => (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>);
const TrophyIcon = () => (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3h14M9 3v2a3 3 0 003 3m0 0a3 3 0 003-3V3m-3 5v4m-4 4h8m-8 0a2 2 0 01-2-2m10 2a2 2 0 002-2m-10 2v2h8v-2" /></svg>);
const UsersIcon = () => (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>);
const LogoutIcon = () => (<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>);
const UserIcon = () => (<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>);
const AlertIcon = () => (<svg className="w-12 h-12 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>);

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: HomeIcon, path: '/dashboard' },
  { id: 'log-practice', label: 'Log Practice', icon: ClockIcon, path: '/log-practice' },
  { id: 'reflect', label: 'Reflect', icon: ReflectIcon, path: '/reflect' },
  { id: 'skills', label: 'Skill Maps', icon: SkillMapIcon, path: '/skills' },
  { id: 'roomspace', label: 'RoomSpace', icon: UsersIcon, path: '/roomspace' },
  { id: 'leaderboard', label: 'Leaderboard', icon: TrophyIcon, path: '/leaderboard' },
  { id: 'summary', label: 'Weekly Summary', icon: SummaryIcon, path: '/weekly-summary' },
];

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = auth.currentUser;
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showAdminConfirm, setShowAdminConfirm] = useState(false);
  const menuRef = useRef(null);

  const { activeSessions, clearAllSessions, toggleSession } = useActiveSessions();
  const { isAdmin } = useAdmin();
  const { isFree } = useSubscription();
  const hasActiveSessions = activeSessions.length > 0;
  const runningSessions = activeSessions.filter(s => s.isRunning);

  const isActive = (path) => {
    if (path === '/skills') return location.pathname === '/skills' || location.pathname.startsWith('/skills/') || location.pathname.startsWith('/maps');
    if (path === '/roomspace') return location.pathname === '/roomspace' || location.pathname.startsWith('/roomspace/');
    return location.pathname === path;
  };

  useEffect(() => {
    const handleClickOutside = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowUserMenu(false); };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogoutClick = () => { setShowUserMenu(false); setShowLogoutConfirm(true); };
  const performLogout = async () => { try { clearAllSessions(); await signOut(auth); navigate("/login", { replace: true }); } catch (e) { console.error("Logout error:", e); } };
  const handleAdminClick = () => setShowAdminConfirm(true);
  const performAdminSwitch = () => { runningSessions.forEach(s => toggleSession(s.id)); setShowAdminConfirm(false); navigate('/admin'); };

  return (
    <>
      {/* ═══ TOP BAR ═══ */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-[#dde1d6] flex items-center px-4 gap-4 z-30 shadow-sm shadow-black/[0.02]">
        {/* Hamburger */}
        <button onClick={() => setSidebarOpen(o => !o)} className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-lg flex items-center justify-center text-[#565c52] hover:bg-[#eef0ea] transition-colors">
          <Menu className="w-5 h-5" />
        </button>

        {/* Logo */}
        <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2.5">
          <LogoMark size={30} />
          <span className="text-[16px] font-bold text-[#1c2a14] tracking-tight hidden sm:inline">LearnLoop</span>
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right actions */}
        <div className="flex items-center gap-1.5">
          <button onClick={() => navigate("/skills")} title="Create Skill Map"
            className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-lg flex items-center justify-center text-[#565c52] hover:bg-[#eef0ea] transition-colors">
            <Plus className="w-5 h-5" />
          </button>
          <button onClick={() => navigate("/reflect")} title="Reflect"
            className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-lg flex items-center justify-center text-[#565c52] hover:bg-[#eef0ea] transition-colors">
            <PenLine className="w-[18px] h-[18px]" />
          </button>
          <NotificationBell />
          {/* Profile */}
          <div className="relative ml-1" ref={menuRef}>
            <button onClick={() => setShowUserMenu(!showUserMenu)} className="relative">
              <Avatar photoURL={user?.photoURL} displayName={user?.displayName} email={user?.email} size="sm" />
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-[1.5px] border-white rounded-full" />
            </button>
            {showUserMenu && (
              <div className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-xl border border-[#dde1d6] overflow-hidden z-50 w-48">
                <div className="px-3 py-2.5 border-b border-[#eef0ea]">
                  <p className="text-[13px] font-semibold text-site-ink truncate">{user?.displayName || "User"}</p>
                  <p className="text-[11px] text-site-faint truncate">{user?.email}</p>
                </div>
                <div className="py-1">
                  <button onClick={() => { navigate('/profile'); setShowUserMenu(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-[#565c52] hover:bg-[#f5f7f2] transition-colors"><UserIcon /><span>Profile</span></button>
                  <button onClick={() => { navigate('/subscription'); setShowUserMenu(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-[#565c52] hover:bg-[#f5f7f2] transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l3.057-3L12 3.5 15.943 0 19 3l-2 7H7L5 3zM7 10h10l1 10H6l1-10z" /></svg>
                    <span>Subscription</span>
                  </button>
                  <div className="border-t border-[#eef0ea] my-1" />
                  <button onClick={handleLogoutClick} className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-red-600 hover:bg-red-50 transition-colors"><LogoutIcon /><span>Sign out</span></button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ═══ SIDEBAR ═══ */}
      <aside className={`fixed top-16 left-0 bottom-0 bg-white border-r border-[#dde1d6] flex-col items-center py-3 z-30 transition-all duration-200 overflow-hidden hidden md:flex shadow-sm shadow-black/[0.02] ${sidebarOpen ? 'w-[56px]' : 'w-0 border-r-0'}`}>
        <nav className="flex flex-col items-center gap-1 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <button key={item.id} onClick={() => navigate(item.path)} title={item.label}
                className={`min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl flex items-center justify-center transition-all ${active ? 'bg-[#2e5023] text-white shadow-sm' : 'text-[#8a9180] hover:bg-[#eef0ea] hover:text-[#3a4a30]'}`}>
                <Icon />
              </button>
            );
          })}
          {isAdmin && (
            <>
              <div className="w-5 border-t border-[#dde1d6] my-1" />
              <button onClick={handleAdminClick} title="Admin Panel"
                className={`min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl flex items-center justify-center transition-all ${location.pathname.startsWith('/admin') ? 'bg-red-500 text-white shadow-sm' : 'text-[#8a9180] hover:bg-[#eef0ea] hover:text-[#3a4a30]'}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              </button>
            </>
          )}
        </nav>
        {isFree && (
          <button onClick={() => navigate('/subscription')} title="Upgrade to Pro"
            className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-lg flex items-center justify-center text-amber-500 hover:bg-amber-50 transition-colors mb-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l3.057-3L12 3.5 15.943 0 19 3l-2 7H7L5 3zM7 10h10l1 10H6l1-10z" /></svg>
          </button>
        )}
      </aside>

      {/* ═══ Modals ═══ */}
      {showAdminConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 border border-[#e2e6dc]">
            <div className="flex flex-col items-center text-center">
              {hasActiveSessions ? (
                <>
                  <AlertIcon />
                  <h3 className="text-lg font-bold text-site-ink mt-4 mb-2">Switch to Admin Panel?</h3>
                  <p className="text-site-muted text-sm mb-4">
                    You have {activeSessions.length} active session{activeSessions.length > 1 ? 's' : ''}
                    {runningSessions.length > 0 && <span className="text-amber-600 font-medium"> ({runningSessions.length} running)</span>}. All running sessions will be paused.
                  </p>
                  <div className="w-full bg-[#f5f7f2] rounded-lg p-3 mb-4 max-h-32 overflow-y-auto border border-[#e8ebe4]">
                    {activeSessions.slice(0, 3).map(s => (
                      <div key={s.id} className="flex items-center justify-between py-1 text-sm">
                        <span className="text-site-ink truncate">{s.skillName}</span>
                        <span className={`font-mono ${s.isRunning ? 'text-green-600' : 'text-gray-500'}`}>{Math.floor(s.timer / 60)}m</span>
                      </div>
                    ))}
                    {activeSessions.length > 3 && <p className="text-xs text-site-faint mt-1">+{activeSessions.length - 3} more</p>}
                  </div>
                </>
              ) : (
                <>
                  <svg className="w-12 h-12 text-[#2e5023]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                  <h3 className="text-lg font-bold text-site-ink mt-4 mb-2">Switch to Admin Panel?</h3>
                </>
              )}
              <div className="flex gap-3 w-full">
                <button onClick={() => setShowAdminConfirm(false)} className="flex-1 py-2.5 border border-[#e2e6dc] text-site-muted rounded-lg font-medium hover:bg-[#f5f7f2] transition-colors">No</button>
                <button onClick={performAdminSwitch} className="flex-1 py-2.5 bg-[#2e5023] text-white rounded-lg font-medium hover:bg-[#3a6b2e] transition-colors">Yes</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showLogoutConfirm && (
        <Modal
          isOpen={true}
          onClose={() => setShowLogoutConfirm(false)}
          maxWidth="max-w-sm"
          showCloseButton={false}
          footer={
            <>
              <ModalButton
                variant="secondary"
                onClick={() => setShowLogoutConfirm(false)}
              >
                No
              </ModalButton>
              <ModalButton
                variant="danger"
                onClick={performLogout}
              >
                {hasActiveSessions ? 'Sign Out Anyway' : 'Yes'}
              </ModalButton>
            </>
          }
        >
          <div className="flex flex-col items-center text-center">
            {hasActiveSessions ? (
              <>
                <AlertIcon />
                <h3 className="text-lg font-bold text-[#1c1f1a] mt-4 mb-2">Active Sessions Running</h3>
                <p className="text-[#565c52] text-sm mb-4">
                  You have {activeSessions.length} active session{activeSessions.length > 1 ? 's' : ''}
                  {runningSessions.length > 0 && <span className="text-amber-600 font-medium"> ({runningSessions.length} running)</span>}. Logging out will discard all unsaved progress.
                </p>
                <div className="w-full bg-[#f5f7f2] rounded-lg p-3 mb-4 max-h-32 overflow-y-auto border border-[#e8ebe4]">
                  {activeSessions.slice(0, 3).map(s => (
                    <div key={s.id} className="flex items-center justify-between py-1 text-sm">
                      <span className="text-[#1c1f1a] truncate">{s.skillName}</span>
                      <span className={`font-mono ${s.isRunning ? 'text-green-600' : 'text-gray-500'}`}>{Math.floor(s.timer / 60)}m</span>
                    </div>
                  ))}
                  {activeSessions.length > 3 && <p className="text-xs text-[#9aa094] mt-1">+{activeSessions.length - 3} more</p>}
                </div>
              </>
            ) : (
              <>
                <svg className="w-12 h-12 text-[#2e5023]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                <h3 className="text-lg font-bold text-[#1c1f1a] mt-4 mb-2">Sign out?</h3>
                <p className="text-[#565c52] text-sm">Are you sure you want to sign out?</p>
              </>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
