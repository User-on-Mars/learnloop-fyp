import { useState, useEffect } from 'react'
import { adminApi } from '../../api/adminApi'
import DataTable from '../../components/admin/DataTable'
import AuditBadge from '../../components/admin/AuditBadge'

const ACTION_OPTIONS = [
  'All actions',
  'ban_user',
  'unban_user',
  'promote_to_admin',
  'demote_from_admin',
  'adjust_xp',
  'void_xp',
  'manual_weekly_reset',
  'recalculate_xp',
  'delete_skill_map',
  'dismiss_flag',
  'update_xp_settings',
  'update_flag_settings',
  'export_data'
]

export default function AdminAuditLog() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [selectedAction, setSelectedAction] = useState('All actions')

  useEffect(() => {
    loadLogs()
  }, [page, selectedAction])

  const loadLogs = async () => {
    try {
      setLoading(true)
      const filter = selectedAction !== 'All actions' ? { action: selectedAction } : {}
      const result = await adminApi.getAuditLog(page, 50, filter)
      setLogs(result.logs || [])
      setPages(result.pages || 1)
    } catch (error) {
      console.error('Failed to load audit log:', error)
    } finally {
      setLoading(false)
    }
  }

  const getActionDescription = (log) => {
    switch(log.action) {
      case 'ban_user':
        return `Banned user ${log.targetUserEmail} — reason: ${log.reason}`
      case 'unban_user':
        return `Unbanned user ${log.targetUserEmail}`
      case 'promote_to_admin':
        return `Promoted ${log.targetUserEmail} to Admin role`
      case 'demote_from_admin':
        return `Demoted ${log.targetUserEmail} from Admin role`
      case 'adjust_xp':
        return `Voided ${log.metadata?.amount || 0} XP from ${log.targetUserEmail} (farmed XP removed)`
      case 'manual_weekly_reset':
        return `Weekly league reset executed — 3 promoted to Gold, 2 relegated to Silver`
      case 'recalculate_xp':
        return `Recalculated all user XP`
      default:
        return log.reason || `${log.action} executed`
    }
  }

  const columns = [
    { 
      key: 'action', 
      label: 'Action',
      render: (val) => <AuditBadge action={val} />
    },
    { key: 'adminEmail', label: 'Admin' },
    { key: 'targetUserEmail', label: 'Target User', render: (val) => val || '—' },
    { 
      key: 'reason', 
      label: 'Description',
      render: (val, row) => <span className="text-xs">{getActionDescription(row)}</span>
    },
    { 
      key: 'createdAt', 
      label: 'Date',
      render: (val) => {
        const now = new Date()
        const logDate = new Date(val)
        const diffMs = now - logDate
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
        const diffMins = Math.floor(diffMs / (1000 * 60))

        if (diffMins < 60) return `${diffMins}m ago`
        if (diffHours < 24) return `${diffHours}h ago`
        if (diffDays < 7) return `${diffDays}d ago`
        return logDate.toLocaleDateString()
      }
    }
  ]

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-site-ink">Audit Log</h1>
        <p className="text-site-muted mt-1">Complete record of all admin actions (read-only)</p>
      </div>

      {/* Action Filter */}
      <div className="mb-6">
        <div className="bg-site-surface rounded-xl border border-site-border p-6">
          <h3 className="font-semibold text-site-ink mb-4">Admin audit log — all admin actions recorded</h3>
          <select
            value={selectedAction}
            onChange={(e) => {
              setSelectedAction(e.target.value)
              setPage(1)
            }}
            className="w-full px-4 py-2 border border-site-border rounded-lg text-sm bg-site-surface text-site-ink focus:outline-none focus:ring-2 focus:ring-site-accent"
          >
            {ACTION_OPTIONS.map(action => (
              <option key={action} value={action}>
                {action === 'All actions' ? 'All actions' : action.replace(/_/g, ' ').toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={logs}
        loading={loading}
        empty="No audit logs"
        page={page}
        pages={pages}
        onPageChange={setPage}
      />
    </div>
  )
}
