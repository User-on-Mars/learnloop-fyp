import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, ShieldAlert, Clock, Zap, Copy, UserX, CheckCircle, XCircle, Eye, ChevronLeft, ChevronRight } from 'lucide-react'
import { adminApi } from '../../api/adminApi'
import ConfirmAction from '../../components/admin/ConfirmAction'

const FLAG_CONFIG = {
  too_many_sessions: { icon: ShieldAlert, label: 'Excessive sessions', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', desc: 'User completed an unusually high number of sessions in 24 hours' },
  short_sessions:    { icon: Clock,       label: 'Micro sessions',     color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', desc: 'Session was shorter than the minimum threshold' },
  high_daily_xp:     { icon: Zap,         label: 'XP spike',           color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', desc: 'User earned an unusually high amount of XP in one day' },
  duplicate_reflection: { icon: Copy,     label: 'Duplicate content',  color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', desc: 'Duplicate reflection text was detected' },
  xp_farming:        { icon: ShieldAlert, label: 'XP farming',         color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', desc: 'Pattern suggests automated or abusive XP farming' },
  never_active:      { icon: UserX,       label: 'Never active',       color: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-200', desc: 'User registered but never started a session' }
}

const SEVERITY_STYLE = {
  high:   'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low:    'bg-gray-100 text-gray-600'
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
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export default function AdminAlerts() {
  const [alerts, setAlerts] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [confirmAction, setConfirmAction] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => { loadAlerts() }, [page])

  const loadAlerts = async () => {
    try {
      setLoading(true)
      const result = await adminApi.getAlerts(page, PER_PAGE)
      setAlerts(result.flags || [])
      setTotal(result.total || 0)
      setPages(result.pages || 1)
    } catch (error) {
      console.error('Failed to load alerts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDismiss = async (flagId) => {
    try {
      setActionLoading(true)
      await adminApi.dismissAlert(flagId)
      setAlerts(prev => prev.filter(a => a._id !== flagId))
      setTotal(prev => prev - 1)
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
      setAlerts(prev => prev.filter(a => a._id !== flagId))
      setTotal(prev => prev - 1)
      setConfirmAction(null)
    } catch (error) {
      console.error('Failed to action:', error)
    } finally {
      setActionLoading(false)
    }
  }

  const highCount = alerts.filter(a => a.severity === 'high').length
  const medCount = alerts.filter(a => a.severity === 'medium').length

  return (
    <div className="p-6 lg:p-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-site-ink">Alerts & Flags</h1>
        <p className="text-site-muted mt-1">Automated detection of suspicious or unusual user activity</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-site-surface rounded-xl border border-site-border p-5">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-lg bg-amber-50"><AlertTriangle className="w-5 h-5 text-amber-500" /></div>
            <span className="text-sm text-site-muted font-medium">Open alerts</span>
          </div>
          <p className="text-2xl font-bold text-site-ink">{total}</p>
        </div>
        <div className="bg-site-surface rounded-xl border border-site-border p-5">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-lg bg-red-50"><ShieldAlert className="w-5 h-5 text-red-500" /></div>
            <span className="text-sm text-site-muted font-medium">High severity</span>
          </div>
          <p className="text-2xl font-bold text-red-600">{highCount}</p>
        </div>
        <div className="bg-site-surface rounded-xl border border-site-border p-5">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-lg bg-amber-50"><Clock className="w-5 h-5 text-amber-500" /></div>
            <span className="text-sm text-site-muted font-medium">Medium severity</span>
          </div>
          <p className="text-2xl font-bold text-amber-600">{medCount}</p>
        </div>
      </div>

      {/* Active Alerts */}
      <div className="bg-site-surface rounded-xl border border-site-border p-6 mb-8">
        <h2 className="font-semibold text-site-ink mb-4">Active alerts</h2>

        {loading ? (
          <p className="text-sm text-site-faint py-8 text-center">Loading...</p>
        ) : alerts.length === 0 ? (
          <div className="text-center py-10">
            <CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-400" />
            <p className="text-sm text-site-faint">No open alerts — all clear</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {alerts.map(alert => {
                const cfg = FLAG_CONFIG[alert.flagType] || FLAG_CONFIG.xp_farming
                const Icon = cfg.icon
                return (
                  <div key={alert._id} className={`flex items-start gap-4 p-4 rounded-xl border ${cfg.border} ${cfg.bg}`}>
                    <div className={`p-2 rounded-lg bg-white/60 flex-shrink-0`}>
                      <Icon className={`w-5 h-5 ${cfg.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold text-site-ink text-sm">{cfg.label}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${SEVERITY_STYLE[alert.severity]}`}>
                          {alert.severity}
                        </span>
                        <span className="text-xs text-site-faint ml-auto flex-shrink-0">{timeAgo(alert.triggeredAt)}</span>
                      </div>
                      <p className="text-sm text-site-muted mb-1">{alert.detail}</p>
                      {alert.userEmail && (
                        <p className="text-xs text-site-faint">User: <span className="font-medium text-site-ink">{alert.userEmail}</span></p>
                      )}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      {alert.userId && (
                        <button
                          onClick={() => {
                            // Find user by firebaseUid — navigate to admin users page
                            navigate(`/admin/users`)
                          }}
                          className="p-2 rounded-lg border border-site-border bg-white text-site-muted hover:bg-site-bg transition-colors"
                          title="View user"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => setConfirmAction({ type: 'action', flagId: alert._id })}
                        className="p-2 rounded-lg border border-site-border bg-white text-green-600 hover:bg-green-50 transition-colors"
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
                )
              })}
            </div>

            {/* Pagination */}
            {pages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-site-border">
                <span className="text-xs text-site-faint">
                  {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, total)} of {total}
                </span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1 rounded border border-site-border disabled:opacity-30 hover:bg-site-bg transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: pages }, (_, i) => i + 1).slice(0, 5).map(p => (
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

      {/* Detection Rules */}
      <div className="bg-site-surface rounded-xl border border-site-border p-6">
        <h2 className="font-semibold text-site-ink mb-1">Detection rules</h2>
        <p className="text-xs text-site-faint mb-4">These rules run automatically when users complete sessions or earn XP</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {RULES.map(rule => {
            const cfg = FLAG_CONFIG[rule.type]
            const Icon = cfg?.icon || AlertTriangle
            return (
              <div key={rule.type} className="p-4 bg-site-bg rounded-xl border border-site-border/50">
                <div className="flex items-center gap-2.5 mb-2">
                  <Icon className={`w-4 h-4 ${cfg?.color || 'text-site-faint'}`} />
                  <span className="font-medium text-site-ink text-sm">{rule.label}</span>
                  <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-medium ${SEVERITY_STYLE[rule.severity]}`}>
                    {rule.severity}
                  </span>
                </div>
                <p className="text-xs text-site-muted leading-relaxed">{rule.desc}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Confirm modals */}
      <ConfirmAction
        isOpen={confirmAction?.type === 'dismiss'}
        title="Dismiss Alert"
        message="This will mark the alert as dismissed. It won't appear in the active list anymore."
        confirmText="Dismiss"
        onConfirm={() => handleDismiss(confirmAction.flagId)}
        onCancel={() => setConfirmAction(null)}
        loading={actionLoading}
      />
      <ConfirmAction
        isOpen={confirmAction?.type === 'action'}
        title="Mark as Handled"
        message="This confirms you've reviewed and taken appropriate action on this alert."
        confirmText="Mark Handled"
        onConfirm={() => handleAction(confirmAction.flagId)}
        onCancel={() => setConfirmAction(null)}
        loading={actionLoading}
      />
    </div>
  )
}
