import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Eye,
  ShieldAlert,
  UserX,
  XCircle,
  Zap
} from 'lucide-react'
import { motion } from 'framer-motion'
import { adminApi } from '../../api/adminApi'
import ConfirmAction from '../../components/admin/ConfirmAction'
import PageTransition from '../../components/admin/PageTransition'
import ErrorState from '../../components/admin/ErrorState'
import { SkeletonCard } from '../../components/admin/Skeleton'
import MetricCard from '../../components/admin/MetricCard'
import AnimatedList from '../../components/admin/AnimatedList'
import { staggerItem } from '../../components/admin/animations'

const FLAG_CONFIG = {
  too_many_sessions: { icon: ShieldAlert, label: 'Excessive sessions', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', desc: 'User completed an unusually high number of sessions in 24 hours' },
  short_sessions: { icon: Clock, label: 'Micro sessions', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', desc: 'Session was shorter than the minimum threshold' },
  high_daily_xp: { icon: Zap, label: 'XP spike', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', desc: 'User earned an unusually high amount of XP in one day' },
  duplicate_reflection: { icon: Copy, label: 'Duplicate content', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', desc: 'Duplicate reflection text was detected' },
  xp_farming: { icon: ShieldAlert, label: 'XP farming', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', desc: 'Pattern suggests automated or abusive XP farming' },
  never_active: { icon: UserX, label: 'Never active', color: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-200', desc: 'User registered but never started a session' }
}

const SEVERITY_STYLE = {
  high: 'bg-red-100 text-red-700 border-red-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  low: 'bg-gray-100 text-gray-600 border-gray-200'
}

const RULES = [
  { type: 'too_many_sessions', label: 'Sessions per day > 20', desc: 'Flags users who complete more than 20 sessions in 24 hours. Could indicate XP farming.', severity: 'high' },
  { type: 'short_sessions', label: 'Session duration < 60s', desc: 'Flags sessions shorter than 1 minute. Users may be starting and immediately ending sessions.', severity: 'medium' },
  { type: 'high_daily_xp', label: 'Daily XP > 500', desc: 'Flags users who earn more than 500 XP in a single day. Unusually high for normal usage.', severity: 'high' },
  { type: 'duplicate_reflection', label: 'Duplicate reflections', desc: 'Flags when a user submits the same reflection text multiple times.', severity: 'medium' }
]

const PER_PAGE = 10

function timeAgo(date) {
  const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function RuleCard({ rule }) {
  const cfg = FLAG_CONFIG[rule.type] || FLAG_CONFIG.xp_farming
  const Icon = cfg.icon

  return (
    <div className="rounded-xl border border-site-border bg-site-bg p-4">
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${cfg.bg}`}>
          <Icon className={`w-5 h-5 ${cfg.color}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-site-ink text-sm">{rule.label}</h3>
            <span className={`ml-auto px-2 py-0.5 rounded-full border text-xs font-medium ${SEVERITY_STYLE[rule.severity]}`}>
              {rule.severity}
            </span>
          </div>
          <p className="text-xs text-site-muted leading-relaxed mt-2">{rule.desc}</p>
        </div>
      </div>
    </div>
  )
}

export default function AdminAlerts() {
  const [alerts, setAlerts] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [confirmAction, setConfirmAction] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => { loadAlerts() }, [page])

  const loadAlerts = async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await adminApi.getAlerts(page, PER_PAGE)
      setAlerts(result.flags || [])
      setTotal(result.total || 0)
      setPages(result.pages || 1)
    } catch (error) {
      console.error('Failed to load alerts:', error)
      setError('Failed to load alerts. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleDismiss = async (flagId) => {
    try {
      setActionLoading(true)
      await adminApi.dismissAlert(flagId)
      setAlerts(prev => prev.filter(alert => alert._id !== flagId))
      setTotal(prev => Math.max(0, prev - 1))
      setConfirmAction(null)
    } catch (error) {
      console.error('Failed to dismiss:', error)
    } finally {
      setActionLoading(false)
    }
  }

  const handleAction = async (flagId) => {
    try {
      setActionLoading(true)
      await adminApi.actionAlert(flagId)
      setAlerts(prev => prev.filter(alert => alert._id !== flagId))
      setTotal(prev => Math.max(0, prev - 1))
      setConfirmAction(null)
    } catch (error) {
      console.error('Failed to action:', error)
    } finally {
      setActionLoading(false)
    }
  }

  const highCount = alerts.filter(alert => alert.severity === 'high').length
  const medCount = alerts.filter(alert => alert.severity === 'medium').length
  const healthText = total === 0 ? 'All systems clear' : `${total} alert${total === 1 ? '' : 's'} need review`

  return (
    <PageTransition>
      <div className="p-6 lg:p-8 max-w-7xl">
        <div className="mb-8 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-site-ink">Alerts & Flags</h1>
            <p className="text-site-muted mt-1">Automated detection of suspicious or unusual user activity</p>
          </div>
          <div className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold ${
            total === 0 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}>
            {total === 0 ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            {healthText}
          </div>
        </div>

        {error ? (
          <ErrorState message={error} onRetry={loadAlerts} />
        ) : (
          <>
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <SkeletonCard lines={2} />
                <SkeletonCard lines={2} />
                <SkeletonCard lines={2} />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <MetricCard icon={AlertTriangle} label="Open alerts" value={total} sub="Currently unresolved" iconBg="bg-amber-50" iconColor="text-amber-500" />
                <MetricCard icon={ShieldAlert} label="High severity" value={highCount} sub="Needs immediate review" iconBg="bg-red-50" iconColor="text-red-500" />
                <MetricCard icon={Clock} label="Medium severity" value={medCount} sub="Review when possible" iconBg="bg-amber-50" iconColor="text-amber-500" />
              </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.4fr)_minmax(360px,0.9fr)] gap-6">
              <div className="bg-site-surface rounded-xl border border-site-border overflow-hidden">
                <div className="px-5 py-4 border-b border-site-border flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-site-ink">Active alerts</h2>
                    <p className="text-xs text-site-faint mt-0.5">Review, mark handled, or dismiss open flags</p>
                  </div>
                  <span className="text-xs font-medium text-site-muted">{alerts.length} shown</span>
                </div>

                {loading ? (
                  <p className="text-sm text-site-faint py-12 text-center">Loading...</p>
                ) : alerts.length === 0 ? (
                  <div className="py-16 px-6 text-center">
                    <div className="w-14 h-14 rounded-full bg-green-50 border border-green-200 flex items-center justify-center mx-auto mb-3">
                      <CheckCircle className="w-8 h-8 text-green-500" />
                    </div>
                    <p className="font-semibold text-site-ink">No open alerts</p>
                    <p className="text-sm text-site-faint mt-1">Everything looks clear right now.</p>
                  </div>
                ) : (
                  <>
                    <AnimatedList className="divide-y divide-site-border/60">
                      {alerts.map(alert => {
                        const cfg = FLAG_CONFIG[alert.flagType] || FLAG_CONFIG.xp_farming
                        const Icon = cfg.icon
                        return (
                          <motion.div key={alert._id} variants={staggerItem} className="p-5 hover:bg-site-bg/40 transition-colors">
                            <div className={`rounded-xl border ${cfg.border} ${cfg.bg} p-4`}>
                              <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                  <div className="w-10 h-10 rounded-lg bg-white/70 flex items-center justify-center flex-shrink-0">
                                    <Icon className={`w-5 h-5 ${cfg.color}`} />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <h3 className="font-semibold text-site-ink text-sm">{cfg.label}</h3>
                                      <span className={`px-2 py-0.5 rounded-full border text-xs font-medium ${SEVERITY_STYLE[alert.severity] || SEVERITY_STYLE.low}`}>
                                        {alert.severity || 'low'}
                                      </span>
                                      <span className="text-xs text-site-faint">{timeAgo(alert.triggeredAt)}</span>
                                    </div>
                                    <p className="text-sm text-site-muted mt-2">{alert.detail || cfg.desc}</p>
                                    {alert.userEmail && (
                                      <p className="text-xs text-site-faint mt-2">User: <span className="font-medium text-site-ink">{alert.userEmail}</span></p>
                                    )}
                                  </div>
                                </div>

                                <div className="flex gap-2 lg:flex-shrink-0">
                                  {alert.userId && (
                                    <button
                                      onClick={() => navigate('/admin/users')}
                                      className="p-2 rounded-lg border border-site-border bg-white text-site-muted hover:bg-site-bg transition-colors"
                                      title="View user"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => setConfirmAction({ type: 'action', flagId: alert._id })}
                                    className="p-2 rounded-lg border border-green-200 bg-white text-green-600 hover:bg-green-50 transition-colors"
                                    title="Mark as handled"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => setConfirmAction({ type: 'dismiss', flagId: alert._id })}
                                    className="p-2 rounded-lg border border-site-border bg-white text-site-faint hover:bg-site-bg transition-colors"
                                    title="Dismiss"
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )
                      })}
                    </AnimatedList>

                    {pages > 1 && (
                      <div className="flex items-center justify-between px-5 py-3 border-t border-site-border">
                        <span className="text-xs text-site-faint">
                          {(page - 1) * PER_PAGE + 1}-{Math.min(page * PER_PAGE, total)} of {total}
                        </span>
                        <div className="flex items-center gap-1">
                          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1 rounded border border-site-border disabled:opacity-30 hover:bg-site-bg transition-colors">
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          {Array.from({ length: Math.min(pages, 5) }, (_, i) => i + 1).map(p => (
                            <button key={p} onClick={() => setPage(p)} className={`min-w-[28px] h-7 text-xs rounded font-medium transition-colors ${page === p ? 'bg-site-accent text-white' : 'border border-site-border text-site-ink hover:bg-site-bg'}`}>
                              {p}
                            </button>
                          ))}
                          <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className="p-1 rounded border border-site-border disabled:opacity-30 hover:bg-site-bg transition-colors">
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="bg-site-surface rounded-xl border border-site-border p-5">
                <div className="mb-4">
                  <h2 className="font-semibold text-site-ink">Detection rules</h2>
                  <p className="text-xs text-site-faint mt-1">Rules run automatically when users complete sessions or earn XP</p>
                </div>
                <div className="space-y-3">
                  {RULES.map(rule => <RuleCard key={rule.type} rule={rule} />)}
                </div>
              </div>
            </div>
          </>
        )}

        <ConfirmAction
          isOpen={confirmAction?.type === 'dismiss'}
          title="Dismiss Alert"
          message="This will mark the alert as dismissed. It will no longer appear in the active list."
          confirmText="Dismiss"
          onConfirm={() => handleDismiss(confirmAction.flagId)}
          onCancel={() => setConfirmAction(null)}
          loading={actionLoading}
        />
        <ConfirmAction
          isOpen={confirmAction?.type === 'action'}
          title="Mark as Handled"
          message="This confirms you have reviewed and taken appropriate action on this alert."
          confirmText="Mark Handled"
          onConfirm={() => handleAction(confirmAction.flagId)}
          onCancel={() => setConfirmAction(null)}
          loading={actionLoading}
        />
      </div>
    </PageTransition>
  )
}
