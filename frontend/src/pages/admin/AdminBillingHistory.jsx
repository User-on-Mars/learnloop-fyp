import { useState, useEffect, useCallback } from 'react'
import { Receipt, Search, Filter, ChevronLeft, ChevronRight, CreditCard, Gift, Crown, Star, DollarSign, Clock, AlertCircle, CheckCircle, X } from 'lucide-react'
import { motion } from 'framer-motion'
import { adminApi } from '../../api/adminApi'
import PageTransition from '../../components/admin/PageTransition'
import ErrorState from '../../components/admin/ErrorState'
import AnimatedList from '../../components/admin/AnimatedList'
import { SkeletonCard, SkeletonTable } from '../../components/admin/Skeleton'
import { staggerItem } from '../../components/admin/animations'

const STATUS_CONFIG = {
  COMPLETE: { label: 'Completed', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle },
  PENDING: { label: 'Pending', cls: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock },
  FAILED: { label: 'Failed', cls: 'bg-red-50 text-red-700 border-red-200', icon: AlertCircle },
  CANCELED: { label: 'Canceled', cls: 'bg-gray-100 text-gray-600 border-gray-200', icon: X },
  EXPIRED: { label: 'Expired', cls: 'bg-slate-100 text-slate-600 border-slate-200', icon: Clock },
  AMBIGUOUS: { label: 'Ambiguous', cls: 'bg-purple-50 text-purple-700 border-purple-200', icon: AlertCircle },
}

const PLAN_LABELS = {
  pro_1month: '1 Month',
  pro_3month: '3 Months',
  pro_6month: '6 Months',
  pro_monthly: '1 Month',
}

function StatCard({ icon: Icon, label, value, color = 'text-site-accent', bgColor = 'bg-site-accent/10' }) {
  return (
    <motion.div variants={staggerItem} className="bg-site-surface rounded-xl border border-site-border p-5">
      <div className="flex items-center gap-3">
        <div className={`p-3 rounded-lg ${bgColor}`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <div>
          <p className="text-xs text-site-muted">{label}</p>
          <p className="text-xl font-bold text-site-ink mt-0.5">{value}</p>
        </div>
      </div>
    </motion.div>
  )
}

export default function AdminBillingHistory() {
  const [history, setHistory] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  // Filters
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [planFilter, setPlanFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const params = {
        page,
        limit: 20,
        search,
        type: typeFilter,
        status: statusFilter,
        plan: planFilter,
        startDate,
        endDate,
      }
      const data = await adminApi.getBillingHistory(params)
      setHistory(data.history || [])
      setTotalPages(data.pages || 1)
      setTotal(data.total || 0)
      setStats(data.stats || null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [page, search, typeFilter, statusFilter, planFilter, startDate, endDate])

  useEffect(() => { fetchHistory() }, [fetchHistory])

  const hasActiveFilters = search || typeFilter || statusFilter || planFilter || startDate || endDate
  const clearFilters = () => {
    setSearch('')
    setTypeFilter('')
    setStatusFilter('')
    setPlanFilter('')
    setStartDate('')
    setEndDate('')
    setPage(1)
  }

  const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const fmtTime = (d) => new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

  if (error && history.length === 0) {
    return (
      <PageTransition>
        <div className="p-6 lg:p-8 max-w-7xl">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-site-ink">Billing History</h1>
            <p className="text-site-muted mt-1">All payments and rewards across the platform</p>
          </div>
          <ErrorState message={error} onRetry={fetchHistory} />
        </div>
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      <div className="p-6 lg:p-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-site-ink">Billing History</h1>
          <p className="text-site-muted mt-1">All payments and rewards across the platform</p>
        </div>

        {/* Stats */}
        {stats && (
          <AnimatedList className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <StatCard icon={DollarSign} label="Total Revenue" value={`Rs. ${stats.totalRevenue?.toLocaleString() || 0}`} color="text-emerald-600" bgColor="bg-emerald-50" />
            <StatCard icon={CheckCircle} label="Completed" value={stats.completedPayments || 0} color="text-green-600" bgColor="bg-green-50" />
            <StatCard icon={Clock} label="Pending" value={stats.pendingPayments || 0} color="text-amber-600" bgColor="bg-amber-50" />
            <StatCard icon={AlertCircle} label="Failed" value={stats.failedPayments || 0} color="text-red-600" bgColor="bg-red-50" />
            <StatCard icon={Gift} label="Rewards Given" value={stats.totalRewards || 0} color="text-purple-600" bgColor="bg-purple-50" />
          </AnimatedList>
        )}

        {/* Filters */}
        <div className="bg-site-surface rounded-xl border border-site-border p-4 mb-6">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-site-faint" />
              <input
                type="text"
                placeholder="Search name, email, or transaction ID..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="w-full pl-9 pr-3 py-2 border border-site-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-site-accent/30 bg-site-bg"
              />
            </div>

            {/* Type quick filter */}
            <div className="flex gap-1">
              <button onClick={() => { setTypeFilter(''); setPage(1) }}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${!typeFilter ? 'bg-site-accent text-white' : 'bg-site-bg text-site-ink border border-site-border hover:bg-site-bg'}`}>
                All
              </button>
              <button onClick={() => { setTypeFilter('payment'); setPage(1) }}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${typeFilter === 'payment' ? 'bg-emerald-500 text-white' : 'bg-site-bg text-site-ink border border-site-border hover:bg-site-bg'}`}>
                Payments
              </button>
              <button onClick={() => { setTypeFilter('reward'); setPage(1) }}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${typeFilter === 'reward' ? 'bg-amber-500 text-white' : 'bg-site-bg text-site-ink border border-site-border hover:bg-site-bg'}`}>
                Rewards
              </button>
            </div>

            {/* More Filters Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
                showFilters || (statusFilter || planFilter || startDate || endDate)
                  ? 'bg-site-accent/10 text-site-accent border-site-accent/30'
                  : 'bg-site-surface text-site-ink border-site-border hover:bg-site-bg'
              }`}
            >
              <Filter className="w-4 h-4" />
              More
              {(statusFilter || planFilter || startDate || endDate) && <span className="w-2 h-2 rounded-full bg-site-accent" />}
            </button>

            {hasActiveFilters && (
              <button onClick={clearFilters} className="text-xs text-site-muted hover:text-red-600 transition-colors">
                Clear all
              </button>
            )}
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-site-border grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-site-muted mb-1">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
                  className="w-full px-3 py-2 border border-site-border rounded-lg text-sm bg-site-bg focus:outline-none focus:ring-2 focus:ring-site-accent/30"
                >
                  <option value="">All Status</option>
                  <option value="COMPLETE">Completed</option>
                  <option value="PENDING">Pending</option>
                  <option value="FAILED">Failed</option>
                  <option value="EXPIRED">Expired</option>
                  <option value="CANCELED">Canceled</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-site-muted mb-1">Plan</label>
                <select
                  value={planFilter}
                  onChange={(e) => { setPlanFilter(e.target.value); setPage(1) }}
                  className="w-full px-3 py-2 border border-site-border rounded-lg text-sm bg-site-bg focus:outline-none focus:ring-2 focus:ring-site-accent/30"
                >
                  <option value="">All Plans</option>
                  <option value="pro_1month">1 Month</option>
                  <option value="pro_3month">3 Months</option>
                  <option value="pro_6month">6 Months</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-site-muted mb-1">From Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setPage(1) }}
                  className="w-full px-3 py-2 border border-site-border rounded-lg text-sm bg-site-bg focus:outline-none focus:ring-2 focus:ring-site-accent/30"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-site-muted mb-1">To Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setPage(1) }}
                  className="w-full px-3 py-2 border border-site-border rounded-lg text-sm bg-site-bg focus:outline-none focus:ring-2 focus:ring-site-accent/30"
                />
              </div>
            </div>
          )}
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-site-muted">{total} record{total !== 1 ? 's' : ''} found</p>
        </div>

        {/* Loading */}
        {loading && history.length === 0 ? (
          <SkeletonTable rows={8} cols={7} />
        ) : (
          <>
            {/* Table - Desktop */}
            <div className="hidden md:block bg-site-surface rounded-xl border border-site-border overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-site-border bg-site-bg/50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-site-muted uppercase tracking-wider">Type</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-site-muted uppercase tracking-wider">User</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-site-muted uppercase tracking-wider">Plan</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-site-muted uppercase tracking-wider">Amount</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-site-muted uppercase tracking-wider">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-site-muted uppercase tracking-wider">Transaction</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-site-muted uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-site-border">
                  {history.map((item) => {
                    const isReward = item.type === 'reward'
                    const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.PENDING
                    return (
                      <tr key={item.id} className="hover:bg-site-bg/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${isReward ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                            {isReward ? <Gift className="w-3 h-3" /> : <CreditCard className="w-3 h-3" />}
                            {isReward ? 'Reward' : 'Payment'}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-site-ink">{item.userName}</p>
                          <p className="text-xs text-site-faint">{item.userEmail}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-site-ink">{item.label}</span>
                          <p className="text-xs text-site-faint">{item.durationDays} days</p>
                        </td>
                        <td className="px-4 py-3">
                          {isReward ? (
                            <span className="text-sm font-medium text-amber-600">Free</span>
                          ) : (
                            <span className="text-sm font-semibold text-site-ink">Rs. {item.amount?.toLocaleString()}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${statusCfg.cls}`}>
                            {statusCfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {item.transactionId ? (
                            <span className="text-xs font-mono text-site-faint truncate block max-w-[140px]" title={item.transactionId}>
                              {item.transactionId}
                            </span>
                          ) : (
                            <span className="text-xs text-site-faint">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-site-muted">{fmtDate(item.date)}</p>
                          <p className="text-xs text-site-faint">{fmtTime(item.date)}</p>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Cards - Mobile */}
            <div className="md:hidden space-y-3">
              {history.map((item) => {
                const isReward = item.type === 'reward'
                const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.PENDING
                return (
                  <div key={item.id} className="bg-site-surface rounded-lg border border-site-border p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isReward ? 'bg-amber-100' : 'bg-emerald-100'}`}>
                          {isReward ? <Gift className="w-4 h-4 text-amber-600" /> : <CreditCard className="w-4 h-4 text-emerald-600" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-site-ink">{item.userName}</p>
                          <p className="text-xs text-site-faint">{item.userEmail}</p>
                        </div>
                      </div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusCfg.cls}`}>
                        {statusCfg.label}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-site-border">
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-site-muted">{item.label}</span>
                        <span className="text-site-faint">{fmtDate(item.date)}</span>
                      </div>
                      {isReward ? (
                        <span className="text-sm font-medium text-amber-600">Free</span>
                      ) : (
                        <span className="text-sm font-bold text-site-ink">Rs. {item.amount?.toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Empty State */}
            {history.length === 0 && !loading && (
              <div className="text-center py-12 text-site-muted">
                <Receipt className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No billing records found</p>
                <p className="text-sm mt-1">
                  {hasActiveFilters ? 'Try adjusting your filters' : 'Payment and reward records will appear here'}
                </p>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="flex items-center gap-1 px-3 py-2 border border-site-border rounded-lg text-sm font-medium text-site-ink hover:bg-site-bg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>
                <span className="text-sm text-site-muted px-3">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="flex items-center gap-1 px-3 py-2 border border-site-border rounded-lg text-sm font-medium text-site-ink hover:bg-site-bg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </PageTransition>
  )
}
