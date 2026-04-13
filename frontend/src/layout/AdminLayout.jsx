import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { LayoutDashboard, Users, Activity, AlertCircle, TrendingUp, BookOpen, MessageSquare, FileText, Settings, ArrowLeft, Layers } from 'lucide-react'
import LogoMark from '../components/LogoMark'
import { useActiveSessions } from '../context/ActiveSessionContext'

const adminNav = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
  { id: 'alerts', label: 'Alerts', icon: AlertCircle, path: '/admin/alerts' },
  { id: 'users', label: 'Users', icon: Users, path: '/admin/users' },
  { id: 'activity', label: 'Activity', icon: Activity, path: '/admin/activity' },
  { id: 'xp-leagues', label: 'XP Leaderboard', icon: TrendingUp, path: '/admin/xp-leagues' },
  { id: 'skill-maps', label: 'Skill Maps', icon: BookOpen, path: '/admin/skill-maps' },
  { id: 'templates', label: 'Templates', icon: Layers, path: '/admin/templates' },
  { id: 'reflections', label: 'Reflections', icon: MessageSquare, path: '/admin/reflections' },
  { id: 'audit-log', label: 'Audit Log', icon: FileText, path: '/admin/audit-log' },
  { id: 'settings', label: 'Settings', icon: Settings, path: '/admin/settings' },
]

export default function AdminLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [showBackConfirm, setShowBackConfirm] = useState(false)
  
  const { activeSessions, toggleSession } = useActiveSessions()
  const hasActiveSessions = activeSessions.length > 0
  const runningSessions = activeSessions.filter(s => s.isRunning)

  const isActive = (path) => {
    if (path === '/admin') return location.pathname === '/admin'
    return location.pathname.startsWith(path)
  }

  const handleBackClick = () => {
    // Always show confirmation dialog
    setShowBackConfirm(true)
  }

  const performBackToApp = () => {
    // Pause all running sessions
    runningSessions.forEach(session => {
      toggleSession(session.id)
    })
    setShowBackConfirm(false)
    navigate('/dashboard')
  }

  return (
    <div className="flex min-h-screen bg-site-bg">
      {/* Admin Sidebar — app-themed */}
      <aside className="w-60 bg-site-surface border-r border-site-border sticky top-0 h-screen overflow-y-auto flex-col hidden md:flex">
        <div className="p-5 border-b border-site-border">
          <div className="flex items-center gap-2">
            <LogoMark size={32} />
            <div>
              <span className="text-base font-bold text-site-ink tracking-tight">Admin Panel</span>
              <p className="text-[10px] text-site-faint leading-tight">LearnLoop Management</p>
            </div>
          </div>
        </div>

        <nav className="px-3 py-4 flex-1">
          {adminNav.map((item) => {
            const Icon = item.icon
            const active = isActive(item.path)
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors ${
                  active
                    ? 'bg-site-soft text-site-accent font-semibold'
                    : 'text-site-muted hover:bg-site-bg'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="p-3 border-t border-site-border">
          <button
            onClick={handleBackClick}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-site-muted hover:text-site-accent hover:bg-site-soft rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to App
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>

      {/* Back to App Confirmation Modal */}
      {showBackConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-site-surface rounded-2xl shadow-xl w-full max-w-sm p-6 border border-site-border">
            <div className="flex flex-col items-center text-center">
              {hasActiveSessions ? (
                <>
                  <svg className="w-12 h-12 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <h3 className="text-lg font-bold text-site-ink mt-4 mb-2">
                    Return to App?
                  </h3>
                  <p className="text-site-muted text-sm mb-4">
                    You have {activeSessions.length} active session{activeSessions.length > 1 ? 's' : ''}
                    {runningSessions.length > 0 && (
                      <span className="text-amber-600 font-medium">
                        {' '}({runningSessions.length} currently running)
                      </span>
                    )}. 
                    All running sessions will be paused.
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
                </>
              ) : (
                <>
                  <svg className="w-12 h-12 text-site-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  <h3 className="text-lg font-bold text-site-ink mt-4 mb-2">
                    Return to App?
                  </h3>
                </>
              )}

              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setShowBackConfirm(false)}
                  className="flex-1 py-2.5 border border-site-border text-site-muted rounded-lg font-medium hover:bg-site-bg transition-colors"
                >
                  No
                </button>
                <button
                  onClick={performBackToApp}
                  className="flex-1 py-2.5 bg-site-accent text-white rounded-lg font-medium hover:bg-site-accent-hover transition-colors"
                >
                  Yes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
