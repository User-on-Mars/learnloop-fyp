import { useState, useEffect } from 'react'
import { AlertCircle, CheckCircle, Trash2, ToggleRight, ToggleLeft } from 'lucide-react'
import { adminApi } from '../../api/adminApi'
import DataTable from '../../components/admin/DataTable'
import StatusPill from '../../components/admin/StatusPill'
import ConfirmAction from '../../components/admin/ConfirmAction'

export default function AdminAlerts() {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [confirmAction, setConfirmAction] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [flagRules, setFlagRules] = useState({
    tooManySessions: true,
    shortSessions: true,
    highDailyXp: true,
    duplicateReflection: false
  })

  useEffect(() => {
    loadAlerts()
  }, [page])

  const loadAlerts = async () => {
    try {
      setLoading(true)
      const result = await adminApi.getAlerts(page, 20)
      setAlerts(result.flags || [])
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
      setAlerts(alerts.filter(a => a._id !== flagId))
      setConfirmAction(null)
    } catch (error) {
      console.error('Failed to dismiss alert:', error)
    } finally {
      setActionLoading(false)
    }
  }

  const handleAction = async (flagId) => {
    try {
      setActionLoading(true)
      await adminApi.actionAlert(flagId)
      setAlerts(alerts.filter(a => a._id !== flagId))
      setConfirmAction(null)
    } catch (error) {
      console.error('Failed to action alert:', error)
    } finally {
      setActionLoading(false)
    }
  }

  const getAlertIcon = (flagType) => {
    switch(flagType) {
      case 'xp_farming': return '🚨'
      case 'too_many_sessions': return '⚠️'
      case 'short_sessions': return '⏱️'
      case 'high_daily_xp': return '💰'
      case 'duplicate_reflection': return '📝'
      case 'never_active': return '😴'
      default: return '❓'
    }
  }

  const getAlertDescription = (alert) => {
    switch(alert.flagType) {
      case 'xp_farming':
        return `Possible XP farming — user "${alert.userEmail}"\n47 sessions in 24h, all under 2 min. Daily cap should have prevented this — check XP service logic.`
      case 'too_many_sessions':
        return `Too many sessions — ${alert.detail}`
      case 'high_daily_xp':
        return `High daily XP — ${alert.detail}`
      default:
        return alert.detail
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-site-ink">Alerts & Flags</h1>
        <p className="text-site-muted mt-1">Suspicious user activity flagged by the system</p>
      </div>

      {/* Active Alerts */}
      <div className="bg-site-surface rounded-xl border border-site-border p-6 mb-8">
        <h2 className="font-semibold text-site-ink mb-4">Active alerts — requires action</h2>
        <div className="space-y-3">
          {alerts.length === 0 ? (
            <p className="text-site-muted text-sm">No active alerts</p>
          ) : (
            alerts.map(alert => (
              <div key={alert._id} className="flex items-start justify-between p-4 bg-site-bg rounded-lg border border-site-border/50">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{getAlertIcon(alert.flagType)}</span>
                    <h3 className="font-medium text-site-ink">{alert.flagType.replace(/_/g, ' ').toUpperCase()}</h3>
                    <span className="text-xs text-site-faint ml-auto">
                      {Math.floor((new Date() - new Date(alert.triggeredAt)) / (1000 * 60 * 60))}h ago
                    </span>
                  </div>
                  <p className="text-sm text-site-muted whitespace-pre-wrap">{getAlertDescription(alert)}</p>
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => setConfirmAction({ type: 'action', flagId: alert._id })}
                    className="px-4 py-2 rounded-lg border border-site-border text-site-muted hover:bg-site-soft transition-colors text-sm font-medium whitespace-nowrap"
                  >
                    Review
                  </button>
                  <button
                    onClick={() => setConfirmAction({ type: 'dismiss', flagId: alert._id })}
                    className="px-4 py-2 rounded-lg border border-site-border text-site-muted hover:bg-site-soft transition-colors text-sm font-medium whitespace-nowrap"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Auto-flag Rules */}
      <div className="bg-site-surface rounded-xl border border-site-border p-6">
        <h2 className="font-semibold text-site-ink mb-4">Auto-flag rules active</h2>
        <div className="space-y-3">
          {[
            { key: 'tooManySessions', label: 'Sessions per day > 20', status: flagRules.tooManySessions },
            { key: 'shortSessions', label: 'Session duration < 60s', status: flagRules.shortSessions },
            { key: 'highDailyXp', label: 'XP earned > 500 in one day', status: flagRules.highDailyXp }
          ].map(rule => (
            <div key={rule.key} className="flex items-center justify-between p-3 bg-site-bg rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-sm text-site-ink">{rule.label}</span>
                {rule.beta && <span className="text-xs px-2 py-0.5 bg-amber-50 text-amber-700 rounded">Beta</span>}
              </div>
              <button
                onClick={() => setFlagRules({ ...flagRules, [rule.key]: !rule.status })}
                className="flex items-center gap-1 text-sm font-medium"
              >
                {rule.status ? (
                  <>
                    <ToggleRight className="w-5 h-5 text-green-500" />
                    <span className="text-green-500">On</span>
                  </>
                ) : (
                  <>
                    <ToggleLeft className="w-5 h-5 text-site-muted" />
                    <span className="text-site-muted">Off</span>
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      <ConfirmAction
        isOpen={confirmAction?.type === 'dismiss'}
        title="Dismiss Alert"
        message="This alert will be marked as dismissed."
        confirmText="Dismiss"
        onConfirm={() => handleDismiss(confirmAction.flagId)}
        onCancel={() => setConfirmAction(null)}
        loading={actionLoading}
      />

      <ConfirmAction
        isOpen={confirmAction?.type === 'action'}
        title="Mark as Actioned"
        message="This alert will be marked as actioned (admin took action)."
        confirmText="Mark Actioned"
        onConfirm={() => handleAction(confirmAction.flagId)}
        onCancel={() => setConfirmAction(null)}
        loading={actionLoading}
      />
    </div>
  )
}
