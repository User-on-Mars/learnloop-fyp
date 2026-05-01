import { useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Activity,
  AlertCircle,
  TrendingUp,
  BookOpen,
  MessageSquare,
  FileText,
  Settings,
  ArrowLeft,
  Layers,
  Crown,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react'
import LogoMark from '../LogoMark'

const adminNav = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
  { id: 'alerts', label: 'Alerts', icon: AlertCircle, path: '/admin/alerts' },
  { id: 'users', label: 'Users', icon: Users, path: '/admin/users' },
  { id: 'activity', label: 'Activity', icon: Activity, path: '/admin/activity' },
  { id: 'xp-leagues', label: 'XP Leaderboard', icon: TrendingUp, path: '/admin/xp-leagues' },
  { id: 'subscriptions', label: 'Subscriptions', icon: Crown, path: '/admin/subscriptions' },
  { id: 'skill-maps', label: 'Skill Maps', icon: BookOpen, path: '/admin/skill-maps' },
  { id: 'templates', label: 'Templates', icon: Layers, path: '/admin/templates' },
  { id: 'reflections', label: 'Reflections', icon: MessageSquare, path: '/admin/reflections' },
  { id: 'audit-log', label: 'Audit Log', icon: FileText, path: '/admin/audit-log' },
  { id: 'settings', label: 'Settings', icon: Settings, path: '/admin/settings' },
]

export { adminNav }

export default function AdminSidebar({
  isCollapsed,
  onToggle,
  isMobileOpen,
  onMobileClose,
  onBackClick,
}) {
  const location = useLocation()
  const navigate = useNavigate()

  const isActive = (path) => {
    if (path === '/admin') return location.pathname === '/admin'
    return location.pathname.startsWith(path)
  }

  const handleNavClick = (path) => {
    navigate(path)
    // Close mobile sidebar on navigation
    if (onMobileClose) onMobileClose()
  }

  const handleBackClick = () => {
    if (onBackClick) {
      onBackClick()
    } else {
      navigate('/dashboard')
    }
    if (onMobileClose) onMobileClose()
  }

  // Shared nav content rendered in both desktop and mobile
  const renderNav = (collapsed) => (
    <>
      {/* Logo header */}
      <div className={`border-b border-site-border ${collapsed ? 'p-3' : 'p-5'}`}>
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-2'}`}>
          <LogoMark size={collapsed ? 28 : 32} />
          {!collapsed && (
            <div className="overflow-hidden whitespace-nowrap">
              <span className="text-base font-bold text-site-ink tracking-tight">
                Admin Panel
              </span>
              <p className="text-[10px] text-site-faint leading-tight">
                LearnLoop Management
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Nav items */}
      <nav className="px-3 py-4 flex-1 overflow-y-auto">
        {adminNav.map((item) => {
          const Icon = item.icon
          const active = isActive(item.path)
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.path)}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 rounded-lg mb-1 transition-colors ${
                active
                  ? 'bg-site-soft text-site-accent font-semibold'
                  : 'text-site-muted hover:bg-site-bg'
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!collapsed && (
                <span className="text-sm font-medium whitespace-nowrap overflow-hidden">
                  {item.label}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-site-border p-3">
        {/* Back to App */}
        <button
          onClick={handleBackClick}
          title={collapsed ? 'Back to App' : undefined}
          className={`w-full flex items-center ${collapsed ? 'justify-center' : 'gap-2'} px-3 py-2.5 text-sm text-site-muted hover:text-site-accent hover:bg-site-soft rounded-lg transition-colors`}
        >
          <ArrowLeft className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Back to App</span>}
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* ─── Desktop Sidebar ─── */}
      <aside
        className={`hidden md:flex flex-col bg-site-surface border-r border-site-border sticky top-0 h-screen overflow-hidden transition-all duration-200 ease-in-out ${
          isCollapsed ? 'w-16' : 'w-60'
        }`}
      >
        {renderNav(isCollapsed)}

        {/* Collapse toggle — desktop only */}
        <div className="border-t border-site-border p-2">
          <button
            onClick={onToggle}
            className="w-full flex items-center justify-center p-2 text-site-muted hover:text-site-accent hover:bg-site-soft rounded-lg transition-colors"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>
      </aside>

      {/* ─── Mobile Sidebar Overlay ─── */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={onMobileClose}
          />

          {/* Slide-in sidebar */}
          <aside className="absolute top-0 left-0 bottom-0 w-60 bg-site-surface flex flex-col shadow-xl transition-transform duration-200 ease-in-out">
            {/* Close button */}
            <div className="absolute top-3 right-3 z-10">
              <button
                onClick={onMobileClose}
                className="p-1.5 text-site-muted hover:text-site-ink hover:bg-site-soft rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {renderNav(false)}
          </aside>
        </div>
      )}
    </>
  )
}
