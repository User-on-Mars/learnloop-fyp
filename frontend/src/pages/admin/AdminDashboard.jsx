import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, BookOpen, Clock, MessageSquare, TrendingUp, Activity, ShieldAlert, ShieldOff } from 'lucide-react'
import { adminApi } from '../../api/adminApi'

function StatCard({ icon: Icon, label, value, sub, iconBg = 'bg-site-soft', iconColor = 'text-site-accent' }) {
  return (
    <div className="bg-site-surface rounded-xl border border-site-border p-5">
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-2 rounded-lg ${iconBg}`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <span className="text-sm text-site-muted font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold text-site-ink">{value}</p>
      {sub && <p className="text-xs text-site-faint mt-1">{sub}</p>}
    </div>
  )
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    adminApi.getStats()
      .then(setStats)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-site-muted">Loading dashboard...</div>
  if (error) return <div className="p-8 text-red-500">Error: {error}</div>
  if (!stats) return null

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-site-ink">Admin Dashboard</h1>
        <p className="text-site-muted mt-1">Platform overview and key metrics</p>
      </div>

      {/* User Stats */}
      <h2 className="text-xs font-semibold text-site-faint uppercase tracking-wider mb-3">Users</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Users} label="Total Users" value={stats.users.total} sub={`+${stats.users.newToday} today`} />
        <StatCard icon={TrendingUp} label="New This Week" value={stats.users.newWeek} iconBg="bg-blue-50" iconColor="text-blue-600" />
        <StatCard icon={ShieldAlert} label="Suspended" value={stats.users.suspended} iconBg="bg-amber-50" iconColor="text-amber-500" />
        <StatCard icon={ShieldOff} label="Banned" value={stats.users.banned} iconBg="bg-red-50" iconColor="text-red-500" />
      </div>

      {/* Content Stats */}
      <h2 className="text-xs font-semibold text-site-faint uppercase tracking-wider mb-3">Content</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={BookOpen} label="Skill Maps" value={stats.content.skillMaps} iconBg="bg-purple-50" iconColor="text-purple-600" />
        <StatCard icon={Clock} label="Practice Hours" value={stats.content.practiceHours} iconBg="bg-green-50" iconColor="text-green-600" />
        <StatCard icon={Activity} label="Practice Logs" value={stats.content.practices} iconBg="bg-indigo-50" iconColor="text-indigo-600" />
        <StatCard icon={MessageSquare} label="Reflections" value={stats.content.reflections} iconBg="bg-teal-50" iconColor="text-teal-600" />
      </div>

      {/* Activity Stats */}
      <h2 className="text-xs font-semibold text-site-faint uppercase tracking-wider mb-3">Live Activity</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard icon={Activity} label="Active Sessions Now" value={stats.activity.activeSessions} iconBg="bg-green-50" iconColor="text-green-500" />
        <StatCard icon={Clock} label="Practice Today" value={stats.activity.practiceToday} iconBg="bg-blue-50" iconColor="text-blue-500" />
        <StatCard icon={TrendingUp} label="Practice This Week" value={stats.activity.practiceWeek} iconBg="bg-purple-50" iconColor="text-purple-500" />
      </div>

      {/* Quick Actions */}
      <div className="bg-site-surface rounded-xl border border-site-border p-5">
        <h2 className="text-xs font-semibold text-site-faint uppercase tracking-wider mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => navigate('/admin/users')} className="px-4 py-2 bg-site-accent text-white rounded-lg text-sm font-medium hover:bg-site-accent-hover transition-colors">
            Manage Users
          </button>
          <button onClick={() => navigate('/admin/activity')} className="px-4 py-2 border border-site-border text-site-muted rounded-lg text-sm font-medium hover:bg-site-bg transition-colors">
            View Activity
          </button>
        </div>
      </div>
    </div>
  )
}
