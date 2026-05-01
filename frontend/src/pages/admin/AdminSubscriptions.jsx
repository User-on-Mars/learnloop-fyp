import { useState, useEffect } from 'react'
import { Crown, Users, Calendar, AlertCircle, Check, X } from 'lucide-react'
import { motion } from 'framer-motion'
import { adminApi } from '../../api/adminApi'
import PageTransition from '../../components/admin/PageTransition'
import ErrorState from '../../components/admin/ErrorState'
import AnimatedList from '../../components/admin/AnimatedList'
import { SkeletonCard } from '../../components/admin/Skeleton'
import { staggerItem } from '../../components/admin/animations'

function StatCard({ icon: Icon, label, value, color = 'text-site-accent', bgColor = 'bg-site-accent/10' }) {
  return (
    <motion.div variants={staggerItem} className="bg-site-surface rounded-xl border border-site-border p-6">
      <div className="flex items-center gap-3">
        <div className={`p-3 rounded-lg ${bgColor}`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
        <div>
          <p className="text-sm text-site-muted">{label}</p>
          <p className="text-2xl font-bold text-site-ink mt-1">{value}</p>
        </div>
      </div>
    </motion.div>
  )
}

function SubscriptionRow({ sub, onAction }) {
  const [showActions, setShowActions] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [confirmDialog, setConfirmDialog] = useState(null) // { type, days, message }

  const isPro = sub.effectiveTier === 'pro'
  const isCanceled = sub.status === 'canceled'
  const hasExpiry = sub.currentPeriodEnd && new Date(sub.currentPeriodEnd) > new Date()

  const showConfirmDialog = (type, days = null) => {
    let dialogMessage = ''
    
    if (type === 'upgrade') {
      dialogMessage = isPro 
        ? `Extend ${sub.userName}'s Pro subscription by ${days} days?`
        : `Upgrade ${sub.userName} to Pro for ${days} days?`
    } else if (type === 'cancel') {
      dialogMessage = `Cancel ${sub.userName}'s Pro subscription? They will keep Pro access until ${new Date(sub.currentPeriodEnd).toLocaleDateString()}.`
    } else if (type === 'downgrade') {
      dialogMessage = `Downgrade ${sub.userName} to Free? This will remove Pro access immediately.`
    }
    
    setConfirmDialog({ type, days, message: dialogMessage })
  }

  const handleConfirm = async () => {
    const { type, days } = confirmDialog
    setConfirmDialog(null)
    setLoading(true)
    
    try {
      if (type === 'upgrade') {
        let periodEnd
        if (isPro && hasExpiry) {
          const currentExpiry = new Date(sub.currentPeriodEnd)
          periodEnd = new Date(currentExpiry.getTime() + days * 24 * 60 * 60 * 1000).toISOString()
        } else {
          periodEnd = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
        }
        await adminApi.upgradeSubscription(sub.userId, periodEnd)
        setMessage(isPro ? `Extended by ${days} days` : 'Upgraded to Pro')
      } else if (type === 'cancel') {
        await adminApi.cancelSubscription(sub.userId)
        setMessage('Subscription canceled')
      } else if (type === 'downgrade') {
        await adminApi.downgradeSubscription(sub.userId)
        setMessage('Downgraded to Free')
      }
      setTimeout(() => onAction(), 1500)
    } catch (e) {
      setMessage(`Error: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      variants={staggerItem}
      className="bg-site-surface rounded-lg border border-site-border p-4 hover:border-site-accent/30 transition-colors"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-site-ink truncate">{sub.userName}</p>
            {isPro && <Crown className="w-4 h-4 text-amber-500 flex-shrink-0" />}
          </div>
          <p className="text-sm text-site-muted truncate">{sub.userEmail}</p>
          <div className="flex items-center gap-3 mt-2 text-xs">
            <span className={`px-2 py-1 rounded-full font-medium ${
              isPro ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
            }`}>
              {isPro ? 'Pro' : 'Free'}
            </span>
            {isCanceled && (
              <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 font-medium">
                Canceled
              </span>
            )}
            {hasExpiry && (
              <span className="text-site-faint flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Expires {new Date(sub.currentPeriodEnd).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {message && (
            <span className={`text-xs ${message.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>
              {message}
            </span>
          )}
          <button
            onClick={() => setShowActions(!showActions)}
            disabled={loading}
            className="px-3 py-2 text-sm font-medium text-site-ink border border-site-border rounded-lg hover:bg-site-bg transition-colors disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Actions'}
          </button>
        </div>
      </div>

      {showActions && (
        <div className="mt-4 pt-4 border-t border-site-border">
          {!isPro && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => showConfirmDialog('upgrade', 30)}
                disabled={loading}
                className="flex items-center gap-2 px-3 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors disabled:opacity-50"
              >
                <Crown className="w-4 h-4" />
                Give Pro (30 days)
              </button>
              <button
                onClick={() => showConfirmDialog('upgrade', 90)}
                disabled={loading}
                className="flex items-center gap-2 px-3 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors disabled:opacity-50"
              >
                <Crown className="w-4 h-4" />
                Give Pro (90 days)
              </button>
              <button
                onClick={() => showConfirmDialog('upgrade', 365)}
                disabled={loading}
                className="flex items-center gap-2 px-3 py-2 bg-amber-700 text-white rounded-lg text-sm font-medium hover:bg-amber-800 transition-colors disabled:opacity-50"
              >
                <Crown className="w-4 h-4" />
                Give Pro (1 year)
              </button>
            </div>
          )}
          {isPro && !isCanceled && (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => showConfirmDialog('upgrade', 30)}
                  disabled={loading}
                  className="flex items-center gap-2 px-3 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors disabled:opacity-50"
                >
                  <Crown className="w-4 h-4" />
                  Extend +30 days
                </button>
                <button
                  onClick={() => showConfirmDialog('upgrade', 90)}
                  disabled={loading}
                  className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  <Crown className="w-4 h-4" />
                  Extend +90 days
                </button>
                <button
                  onClick={() => showConfirmDialog('upgrade', 365)}
                  disabled={loading}
                  className="flex items-center gap-2 px-3 py-2 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800 transition-colors disabled:opacity-50"
                >
                  <Crown className="w-4 h-4" />
                  Extend +1 year
                </button>
              </div>
              <div className="flex flex-wrap gap-2 pt-2 border-t border-site-border">
                <button
                  onClick={() => showConfirmDialog('cancel')}
                  disabled={loading}
                  className="flex items-center gap-2 px-3 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors disabled:opacity-50"
                >
                  <AlertCircle className="w-4 h-4" />
                  Cancel (keep until expiry)
                </button>
                <button
                  onClick={() => showConfirmDialog('downgrade')}
                  disabled={loading}
                  className="flex items-center gap-2 px-3 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                  Revoke (immediate)
                </button>
              </div>
            </div>
          )}
          {isPro && isCanceled && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => showConfirmDialog('upgrade', 30)}
                disabled={loading}
                className="flex items-center gap-2 px-3 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors disabled:opacity-50"
              >
                <Crown className="w-4 h-4" />
                Reactivate +30 days
              </button>
              <button
                onClick={() => showConfirmDialog('downgrade')}
                disabled={loading}
                className="flex items-center gap-2 px-3 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                <X className="w-4 h-4" />
                Revoke Now
              </button>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-site-surface rounded-xl border border-site-border p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-semibold text-site-ink mb-3">Confirm Action</h3>
            <p className="text-sm text-site-muted mb-6">{confirmDialog.message}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDialog(null)}
                className="flex-1 px-4 py-2.5 border border-site-border rounded-lg text-sm font-medium text-site-ink hover:bg-site-bg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-colors ${
                  confirmDialog.type === 'downgrade' 
                    ? 'bg-red-600 hover:bg-red-700' 
                    : confirmDialog.type === 'cancel'
                    ? 'bg-orange-500 hover:bg-orange-600'
                    : 'bg-site-accent hover:bg-site-accent-hover'
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
}

export default function AdminSubscriptions() {
  const [subscriptions, setSubscriptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all') // 'all' | 'pro' | 'free'
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    fetchSubscriptions()
  }, [page, filter])

  const fetchSubscriptions = async () => {
    try {
      setLoading(true)
      setError(null)
      const params = { page, limit: 20 }
      if (filter !== 'all') params.tier = filter
      const data = await adminApi.getSubscriptions(params)
      setSubscriptions(data.subscriptions || [])
      setTotalPages(data.pages || 1)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const stats = {
    total: subscriptions.length,
    pro: subscriptions.filter(s => s.effectiveTier === 'pro').length,
    free: subscriptions.filter(s => s.effectiveTier === 'free').length,
  }

  if (loading && subscriptions.length === 0) {
    return (
      <PageTransition>
        <div className="p-6 lg:p-8 max-w-7xl">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-site-ink">Subscriptions</h1>
            <p className="text-site-muted mt-1">Manage user subscription tiers</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <SkeletonCard lines={2} />
            <SkeletonCard lines={2} />
            <SkeletonCard lines={2} />
          </div>
          <SkeletonCard lines={8} />
        </div>
      </PageTransition>
    )
  }

  if (error && subscriptions.length === 0) {
    return (
      <PageTransition>
        <div className="p-6 lg:p-8 max-w-7xl">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-site-ink">Subscriptions</h1>
            <p className="text-site-muted mt-1">Manage user subscription tiers</p>
          </div>
          <ErrorState message={error} onRetry={fetchSubscriptions} />
        </div>
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      <div className="p-6 lg:p-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-site-ink">Subscriptions</h1>
          <p className="text-site-muted mt-1">Manage user subscription tiers</p>
        </div>

        {/* Stats */}
        <AnimatedList className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard icon={Users} label="Total Users" value={stats.total} />
          <StatCard icon={Crown} label="Pro Users" value={stats.pro} color="text-amber-600" bgColor="bg-amber-50" />
          <StatCard icon={Check} label="Free Users" value={stats.free} color="text-gray-600" bgColor="bg-gray-50" />
        </AnimatedList>

        {/* Filters */}
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => { setFilter('all'); setPage(1) }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all' ? 'bg-site-accent text-white' : 'bg-site-surface text-site-ink border border-site-border hover:bg-site-bg'
            }`}
          >
            All
          </button>
          <button
            onClick={() => { setFilter('pro'); setPage(1) }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'pro' ? 'bg-amber-500 text-white' : 'bg-site-surface text-site-ink border border-site-border hover:bg-site-bg'
            }`}
          >
            Pro Only
          </button>
          <button
            onClick={() => { setFilter('free'); setPage(1) }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'free' ? 'bg-gray-500 text-white' : 'bg-site-surface text-site-ink border border-site-border hover:bg-site-bg'
            }`}
          >
            Free Only
          </button>
        </div>

        {/* Subscriptions List */}
        <AnimatedList className="space-y-3">
          {subscriptions.map(sub => (
            <SubscriptionRow key={sub._id} sub={sub} onAction={fetchSubscriptions} />
          ))}
        </AnimatedList>

        {subscriptions.length === 0 && (
          <div className="text-center py-12 text-site-muted">
            <Crown className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No subscriptions found</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 border border-site-border rounded-lg text-sm font-medium text-site-ink hover:bg-site-bg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-site-muted">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 border border-site-border rounded-lg text-sm font-medium text-site-ink hover:bg-site-bg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </PageTransition>
  )
}
