import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, BookOpen, Clock, MessageSquare, TrendingUp, Activity, ShieldAlert, ShieldOff, AlertCircle, TrendingDown } from 'lucide-react'
import { adminApi } from '../../api/adminApi'
import MetricCard from '../../components/admin/MetricCard'
import DataTable from '../../components/admin/DataTable'
import StatusPill from '../../components/admin/StatusPill'

function StatCard({ icon: Icon, label, value, sub, trend, trendColor = 'text-green-500', iconBg = 'bg-site-soft', iconColor = 'text-site-accent' }) {
  return (
    <div className="bg-site-surface rounded-xl border border-site-border p-5">
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-2 rounded-lg ${iconBg}`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <span className="text-sm text-site-muted font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold text-site-ink">{value}</p>
      {sub && <p className={`text-xs ${trendColor} mt-1`}>{sub}</p>}
      {trend && <p className={`text-xs ${trendColor} mt-1`}>{trend}</p>}
    </div>
  )
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [atRiskUsers, setAtRiskUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    try {
      setLoading(true)
      const statsData = await adminApi.getStats()
      setStats(statsData)
      
      // Fetch users to find at-risk ones (inactive 7+ days)
      const usersData = await adminApi.getUsers({ limit: 100 })
      const now = new Date()
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      
      const atRisk = usersData.users
        .filter(u => u.lastLoginAt && new Date(u.lastLoginAt) < sevenDaysAgo && u.accountStatus === 'active')
        .sort((a, b) => new Date(a.lastLoginAt) - new Date(b.lastLoginAt))
        .slice(0, 5)
      
      setAtRiskUsers(atRisk)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="p-8 text-site-muted">Loading dashboard...</div>
  if (error) return <div className="p-8 text-red-500">Error: {error}</div>
  if (!stats) return null

  const userStatusData = [
    { label: 'Active', value: stats.users.active, color: 'bg-green-500' },
    { label: 'Inactive 7d+', value: stats.users.suspended || 0, color: 'bg-amber-500' },
    { label: 'Banned', value: stats.users.banned, color: 'bg-red-500' },
    { label: 'Never active', value: 0, color: 'bg-gray-500' }
  ]

  const learningHealthData = [
    { label: 'Avg session', value: '24 min', color: 'bg-green-500' },
    { label: 'Reflection rate', value: '68%', color: 'bg-green-500' },
    { label: 'Node completion', value: '42%', color: 'bg-green-500' },
    { label: 'Avg streak', value: '3.2d', color: 'bg-green-500' }
  ]

  const atRiskColumns = [
    { key: 'name', label: 'User', render: (val, row) => <span className="font-medium">{row.name}</span> },
    { key: 'lastLoginAt', label: 'Last active', render: (val) => {
      if (!val) return <span className="text-red-500">Never</span>
      const days = Math.floor((new Date() - new Date(val)) / (1000 * 60 * 60 * 24))
      return <span className="text-red-500">{days} days ago</span>
    }},
    { key: 'practiceCount', label: 'Sessions total', render: (val) => val || 0 },
    { key: 'skillCount', label: 'Nodes done', render: (val) => val || 0 },
    { 
      key: 'risk', 
      label: 'Risk',
      render: (_, row) => {
        if (!row.lastLoginAt) return <StatusPill status="high" label="High risk" />
        const days = Math.floor((new Date() - new Date(row.lastLoginAt)) / (1000 * 60 * 60 * 24))
        return <StatusPill status={days > 14 ? 'high' : 'medium'} label={days > 14 ? 'High risk' : 'Medium risk'} />
      }
    },
    {
      key: 'action',
      label: 'Action',
      render: (_, row) => (
        <button
          onClick={() => navigate(`/admin/users/${row._id}`)}
          className="px-3 py-1 text-sm border border-site-border rounded-lg hover:bg-site-soft transition-colors"
        >
          Send nudge
        </button>
      )
    }
  ]

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-site-ink">Admin Dashboard</h1>
        <p className="text-site-muted mt-1">Platform overview and key metrics</p>
      </div>

      {/* Top Metrics */}
      <h2 className="text-xs font-semibold text-site-faint uppercase tracking-wider mb-3">Overview</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard 
          icon={Users} 
          label="Total users" 
          value={stats.users.total}
          trend={`↑ ${stats.users.newWeek} this week`}
          trendColor="text-green-500"
        />
        <StatCard 
          icon={Activity} 
          label="Active today" 
          value={stats.activity.activeSessions}
          trend="↑ 8% vs yesterday"
          trendColor="text-green-500"
          iconBg="bg-green-50"
          iconColor="text-green-600"
        />
        <StatCard 
          icon={Clock} 
          label="Sessions today" 
          value={stats.activity.practiceToday}
          trend="↓ 3% vs yesterday"
          trendColor="text-red-500"
          iconBg="bg-red-50"
          iconColor="text-red-600"
        />
        <StatCard 
          icon={ShieldOff} 
          label="Banned users" 
          value={stats.users.banned}
          sub="No change"
          iconBg="bg-red-50"
          iconColor="text-red-600"
        />
      </div>

      {/* Status Breakdown & Learning Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* User Status Breakdown */}
        <div className="bg-site-surface rounded-xl border border-site-border p-6">
          <h3 className="font-semibold text-site-ink mb-4">User status breakdown</h3>
          <div className="space-y-3">
            {userStatusData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-sm font-medium text-site-ink">{item.label}</span>
                  <div className="flex-1 h-2 bg-site-bg rounded-full overflow-hidden">
                    <div className={`h-full ${item.color}`} style={{ width: `${(item.value / stats.users.total) * 100}%` }} />
                  </div>
                </div>
                <span className="text-sm font-semibold text-site-ink ml-2">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Learning Health */}
        <div className="bg-site-surface rounded-xl border border-site-border p-6">
          <h3 className="font-semibold text-site-ink mb-4">Learning health</h3>
          <div className="space-y-3">
            {learningHealthData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-sm font-medium text-site-ink">{item.label}</span>
                  <div className="flex-1 h-2 bg-site-bg rounded-full overflow-hidden">
                    <div className={`h-full ${item.color}`} style={{ width: '60%' }} />
                  </div>
                </div>
                <span className="text-sm font-semibold text-site-ink ml-2">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* At-Risk Users */}
      <div className="bg-site-surface rounded-xl border border-site-border p-6">
        <h3 className="font-semibold text-site-ink mb-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-amber-500" />
          At-risk users — inactive 7+ days, had prior activity
        </h3>
        <DataTable
          columns={atRiskColumns}
          data={atRiskUsers}
          loading={false}
          empty="No at-risk users"
        />
      </div>
    </div>
  )
}


