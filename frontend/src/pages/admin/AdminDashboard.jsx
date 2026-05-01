import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Clock, Activity, ShieldOff, AlertCircle, Mail, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js'
import { adminApi } from '../../api/adminApi'
import PageTransition from '../../components/admin/PageTransition'
import MetricCard from '../../components/admin/MetricCard'
import ErrorState from '../../components/admin/ErrorState'
import { SkeletonCard, SkeletonTable } from '../../components/admin/Skeleton'

ChartJS.register(ArcElement, Tooltip, Legend)

function MiniRing({ value, max, label, sub, color }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  const data = {
    datasets: [{
      data: [pct, 100 - pct],
      backgroundColor: [color, '#f1f5f9'],
      borderWidth: 0,
      cutout: '75%'
    }]
  }
  const opts = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: { legend: { display: false }, tooltip: { enabled: false } },
    events: []
  }
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative w-20 h-20">
        <Doughnut data={data} options={opts} />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-sm font-bold text-site-ink">{sub}</span>
        </div>
      </div>
      <span className="text-xs text-site-muted text-center leading-tight">{label}</span>
    </div>
  )
}

const PER_PAGE = 5

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [health, setHealth] = useState(null)
  const [atRiskUsers, setAtRiskUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [nudging, setNudging] = useState({})
  const [riskPage, setRiskPage] = useState(1)
  const navigate = useNavigate()

  useEffect(() => { loadDashboard() }, [])

  const loadDashboard = async () => {
    try {
      setLoading(true)
      const [statsData, healthData, usersData] = await Promise.all([
        adminApi.getStats(),
        adminApi.getLearningHealth(),
        adminApi.getUsers({ limit: 100 })
      ])
      setStats(statsData)
      setHealth(healthData)

      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      const atRisk = usersData.users
        .filter(u => u.lastLoginAt && new Date(u.lastLoginAt) < sevenDaysAgo && u.accountStatus === 'active')
        .sort((a, b) => new Date(a.lastLoginAt) - new Date(b.lastLoginAt))
      setAtRiskUsers(atRisk)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleNudge = async (userId) => {
    setNudging(prev => ({ ...prev, [userId]: 'sending' }))
    try {
      await adminApi.nudgeUser(userId)
      setNudging(prev => ({ ...prev, [userId]: 'sent' }))
    } catch (err) {
      const msg = err.message || ''
      if (msg.includes('Try again in')) {
        setNudging(prev => ({ ...prev, [userId]: msg }))
      } else {
        setNudging(prev => ({ ...prev, [userId]: 'error' }))
        setTimeout(() => setNudging(prev => ({ ...prev, [userId]: undefined })), 3000)
      }
    }
  }

  if (loading) {
    return (
      <PageTransition>
        <div className="p-6 lg:p-8 max-w-7xl">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-site-ink">Admin Dashboard</h1>
            <p className="text-site-muted mt-1">Platform overview and key metrics</p>
          </div>
          <h2 className="text-xs font-semibold text-site-faint uppercase tracking-wider mb-3">Overview</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <SkeletonCard lines={2} />
            <SkeletonCard lines={2} />
            <SkeletonCard lines={2} />
            <SkeletonCard lines={2} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <SkeletonCard lines={6} />
            <SkeletonCard lines={6} />
          </div>
          <SkeletonTable rows={5} columns={6} />
        </div>
      </PageTransition>
    )
  }

  if (error) {
    return (
      <PageTransition>
        <div className="p-6 lg:p-8 max-w-7xl">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-site-ink">Admin Dashboard</h1>
            <p className="text-site-muted mt-1">Platform overview and key metrics</p>
          </div>
          <ErrorState message={error} onRetry={loadDashboard} />
        </div>
      </PageTransition>
    )
  }

  if (!stats || !health) return null

  // ── Donut ──────────────────────────────────────────────────
  const userStatusItems = [
    { label: 'Active', value: health.activeLearnersCount, color: '#22c55e', dotClass: 'bg-green-500' },
    { label: 'Inactive 7d+', value: health.inactiveCount, color: '#f59e0b', dotClass: 'bg-amber-500' },
    { label: 'Banned', value: stats.users.banned, color: '#ef4444', dotClass: 'bg-red-500' },
    { label: 'Never logged in', value: health.neverActiveCount, color: '#94a3b8', dotClass: 'bg-gray-400' }
  ]
  const donutData = {
    labels: userStatusItems.map(i => i.label),
    datasets: [{ data: userStatusItems.map(i => i.value), backgroundColor: userStatusItems.map(i => i.color), borderWidth: 0, hoverOffset: 6 }]
  }
  const donutOptions = {
    cutout: '68%', responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1e293b', padding: 10, cornerRadius: 8, callbacks: { label: ctx => { const pct = stats.users.total > 0 ? ((ctx.raw / stats.users.total) * 100).toFixed(0) : 0; return ` ${ctx.label}: ${ctx.raw} (${pct}%)` } } } }
  }

  // ── Rings ──────────────────────────────────────────────────
  const ringMetrics = [
    { label: 'Skill maps completed', value: health.completedSkillMaps, max: health.totalSkillMaps, sub: `${health.completedSkillMaps}/${health.totalSkillMaps}`, color: '#22c55e' },
    { label: 'Node completion', value: health.completedNodes, max: health.totalNodes, sub: `${health.nodeCompletionRate}%`, color: '#f59e0b' },
    { label: 'Avg practice logged', value: health.avgPracticeMinutes, max: Math.max(health.avgPracticeMinutes, 30), sub: `${health.avgPracticeMinutes}m`, color: '#3b82f6' },
    { label: 'Practices this week', value: health.recentPractices, max: Math.max(health.recentPractices, 20), sub: String(health.recentPractices), color: '#8b5cf6' }
  ]

  // ── At-risk pagination ─────────────────────────────────────
  const totalRiskPages = Math.max(1, Math.ceil(atRiskUsers.length / PER_PAGE))
  const pagedRisk = atRiskUsers.slice((riskPage - 1) * PER_PAGE, riskPage * PER_PAGE)

  return (
    <PageTransition>
      <div className="p-6 lg:p-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-site-ink">Admin Dashboard</h1>
          <p className="text-site-muted mt-1">Platform overview and key metrics</p>
        </div>

        {/* Top Metrics */}
        <h2 className="text-xs font-semibold text-site-faint uppercase tracking-wider mb-3">Overview</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <MetricCard 
            icon={Users} 
            label="Total users" 
            value={stats.users.total} 
            trend={`↑ ${stats.users.newWeek} this week`} 
            trendColor="text-green-500" 
          />
          <MetricCard 
            icon={Activity} 
            label="Active today" 
            value={stats.activity.activeSessions} 
            trend="↑ 8% vs yesterday" 
            trendColor="text-green-500" 
            iconBg="bg-green-50" 
            iconColor="text-green-600" 
          />
          <MetricCard 
            icon={Clock} 
            label="Sessions today" 
            value={stats.activity.practiceToday} 
            trend="↓ 3% vs yesterday" 
            trendColor="text-red-500" 
            iconBg="bg-red-50" 
            iconColor="text-red-600" 
          />
          <MetricCard 
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
          <div className="bg-site-surface rounded-xl shadow-sm border border-site-border p-6">
            <h3 className="font-semibold text-site-ink mb-5">User status breakdown</h3>
            <div className="flex items-center gap-6">
              <div className="relative w-40 h-40 flex-shrink-0">
                <Doughnut data={donutData} options={donutOptions} />
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-bold text-site-ink">{stats.users.total}</span>
                  <span className="text-xs text-site-muted">total</span>
                </div>
              </div>
              <div className="flex-1 space-y-3">
                {userStatusItems.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${item.dotClass}`} />
                      <span className="text-sm text-site-muted">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-site-ink">{item.value}</span>
                      <span className="text-xs text-site-faint">{stats.users.total > 0 ? ((item.value / stats.users.total) * 100).toFixed(0) : 0}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-site-surface rounded-xl shadow-sm border border-site-border p-6">
            <h3 className="font-semibold text-site-ink mb-5">Learning health</h3>
            <div className="grid grid-cols-4 gap-4">
              {ringMetrics.map((m, idx) => <MiniRing key={idx} {...m} />)}
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-5 pt-4 border-t border-site-border">
              <div className="flex items-center justify-between"><span className="text-xs text-site-muted">Total practice hours</span><span className="text-xs font-semibold text-site-ink">{health.totalPracticeHours}h</span></div>
              <div className="flex items-center justify-between"><span className="text-xs text-site-muted">Total reflections</span><span className="text-xs font-semibold text-site-ink">{health.totalReflections}</span></div>
              <div className="flex items-center justify-between"><span className="text-xs text-site-muted">Nodes done</span><span className="text-xs font-semibold text-site-ink">{health.completedNodes} / {health.totalNodes}</span></div>
              <div className="flex items-center justify-between"><span className="text-xs text-site-muted">Reflections (7d)</span><span className="text-xs font-semibold text-site-ink">{health.recentReflections}</span></div>
            </div>
          </div>
        </div>

        {/* At-Risk Users — Simple Table */}
        <div className="bg-site-surface rounded-xl shadow-sm border border-site-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-site-ink flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              At-risk users
              {atRiskUsers.length > 0 && <span className="text-xs font-normal text-site-faint ml-1">({atRiskUsers.length})</span>}
            </h3>
            <span className="text-xs text-site-faint">Inactive 7+ days</span>
          </div>

          {atRiskUsers.length === 0 ? (
            <div className="text-center py-8 text-site-faint">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-400" />
              <p className="text-sm">All users are active</p>
            </div>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-site-border">
                    <th className="text-left pb-2 font-medium text-site-faint text-xs uppercase tracking-wider">User</th>
                    <th className="text-left pb-2 font-medium text-site-faint text-xs uppercase tracking-wider">Last active</th>
                    <th className="text-center pb-2 font-medium text-site-faint text-xs uppercase tracking-wider">Sessions</th>
                    <th className="text-center pb-2 font-medium text-site-faint text-xs uppercase tracking-wider">Skills</th>
                    <th className="text-left pb-2 font-medium text-site-faint text-xs uppercase tracking-wider">Risk</th>
                    <th className="text-right pb-2 font-medium text-site-faint text-xs uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedRisk.map(user => {
                    const days = Math.floor((Date.now() - new Date(user.lastLoginAt).getTime()) / (1000 * 60 * 60 * 24))
                    const riskLabel = days >= 21 ? 'Critical' : days >= 14 ? 'High' : 'Medium'
                    const riskCls = days >= 21 ? 'bg-red-100 text-red-700' : days >= 14 ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700'
                    const status = nudging[user._id]

                    return (
                      <tr key={user._id} className="border-b border-site-border/50">
                        <td className="py-3 pr-3">
                          <button onClick={() => navigate(`/admin/users/${user._id}`)} className="text-left hover:underline">
                            <p className="font-medium text-site-ink">{user.name}</p>
                            <p className="text-xs text-site-faint">{user.email}</p>
                          </button>
                        </td>
                        <td className="py-3 text-red-500 text-xs">{days}d ago</td>
                        <td className="py-3 text-center text-site-muted">{user.practiceCount || 0}</td>
                        <td className="py-3 text-center text-site-muted">{user.skillCount || 0}</td>
                        <td className="py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${riskCls}`}>{riskLabel}</span>
                        </td>
                        <td className="py-3 text-right">
                          {status === 'sent' ? (
                            <span className="inline-flex items-center gap-1 text-xs text-green-600">
                              <CheckCircle className="w-3.5 h-3.5" /> Sent
                            </span>
                          ) : status && status !== 'sending' && status !== 'error' ? (
                            <span className="text-xs text-amber-600">{status}</span>
                          ) : (
                            <button
                              onClick={() => handleNudge(user._id)}
                              disabled={status === 'sending'}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-site-accent text-white hover:bg-site-accent-hover transition-colors disabled:opacity-50"
                            >
                              <Mail className="w-3 h-3" />
                              {status === 'sending' ? 'Sending...' : status === 'error' ? 'Retry' : 'Nudge'}
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {/* Pagination */}
              {totalRiskPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-site-border">
                  <span className="text-xs text-site-faint">
                    {(riskPage - 1) * PER_PAGE + 1}–{Math.min(riskPage * PER_PAGE, atRiskUsers.length)} of {atRiskUsers.length}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setRiskPage(p => Math.max(1, p - 1))}
                      disabled={riskPage === 1}
                      className="p-1 rounded border border-site-border disabled:opacity-30 hover:bg-site-bg transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    {Array.from({ length: totalRiskPages }, (_, i) => i + 1).map(p => (
                      <button
                        key={p}
                        onClick={() => setRiskPage(p)}
                        className={`min-w-[28px] h-7 text-xs rounded font-medium transition-colors ${
                          riskPage === p ? 'bg-site-accent text-white' : 'border border-site-border text-site-ink hover:bg-site-bg'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                    <button
                      onClick={() => setRiskPage(p => Math.min(totalRiskPages, p + 1))}
                      disabled={riskPage === totalRiskPages}
                      className="p-1 rounded border border-site-border disabled:opacity-30 hover:bg-site-bg transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </PageTransition>
  )
}
