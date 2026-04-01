import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Users, Activity, ArrowLeft } from 'lucide-react'
import LogoMark from '../components/LogoMark'

const adminNav = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
  { id: 'users', label: 'Users', icon: Users, path: '/admin/users' },
  { id: 'activity', label: 'Activity', icon: Activity, path: '/admin/activity' },
]

export default function AdminLayout() {
  const location = useLocation()
  const navigate = useNavigate()

  const isActive = (path) => {
    if (path === '/admin') return location.pathname === '/admin'
    return location.pathname.startsWith(path)
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
            onClick={() => navigate('/dashboard')}
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
    </div>
  )
}
