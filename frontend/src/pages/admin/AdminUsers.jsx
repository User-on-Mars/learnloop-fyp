import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ChevronLeft, ChevronRight, ShieldAlert, ShieldOff, ShieldCheck, UserX, Crown } from 'lucide-react'
import { adminApi } from '../../api/adminApi'

const STATUS_BADGES = {
  active: { label: 'Active', cls: 'bg-green-100 text-green-700' },
  suspended: { label: 'Suspended', cls: 'bg-amber-100 text-amber-700' },
  banned: { label: 'Banned', cls: 'bg-red-100 text-red-700' }
}

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionModal, setActionModal] = useState(null)
  const [reason, setReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const navigate = useNavigate()

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, limit: 20 }
      if (search) params.search = search
      if (statusFilter) params.status = statusFilter
      const data = await adminApi.getUsers(params)
      setUsers(data.users)
      setTotal(data.total)
      setPages(data.pages)
    } catch (err) {
      console.error('Failed to fetch users:', err)
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const handleAction = async () => {
    if (!actionModal) return
    setActionLoading(true)
    try {
      const { userId, action } = actionModal
      if (action === 'suspend') await adminApi.suspendUser(userId, reason)
      else if (action === 'ban') await adminApi.banUser(userId, reason)
      else if (action === 'reactivate') await adminApi.reactivateUser(userId)
      else if (action === 'make-admin') await adminApi.changeRole(userId, 'admin')
      else if (action === 'remove-admin') await adminApi.changeRole(userId, 'user')
      setActionModal(null)
      setReason('')
      fetchUsers()
    } catch (err) {
      alert(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const actionConfig = {
    suspend: { title: 'Suspend User', desc: 'This will temporarily restrict the user from accessing the platform.', btn: 'Suspend', btnCls: 'bg-amber-500 hover:bg-amber-600', needsReason: true },
    ban: { title: 'Ban User', desc: 'This will permanently block the user from accessing the platform.', btn: 'Ban User', btnCls: 'bg-red-600 hover:bg-red-700', needsReason: true },
    reactivate: { title: 'Reactivate User', desc: "This will restore the user's access to the platform.", btn: 'Reactivate', btnCls: 'bg-green-600 hover:bg-green-700', needsReason: false },
    'make-admin': { title: 'Promote to Admin', desc: 'This will give the user full admin access.', btn: 'Make Admin', btnCls: 'bg-site-accent hover:bg-site-accent-hover', needsReason: false },
    'remove-admin': { title: 'Remove Admin Role', desc: 'This will revoke admin access from this user.', btn: 'Remove Admin', btnCls: 'bg-site-muted hover:bg-site-ink', needsReason: false }
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-site-ink">User Management</h1>
        <p className="text-site-muted mt-1">{total} total users</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-site-faint" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="w-full pl-10 pr-4 py-2 border border-site-border rounded-lg text-sm bg-site-surface text-site-ink focus:outline-none focus:ring-2 focus:ring-site-accent/20 focus:border-site-accent"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
          className="px-3 py-2 border border-site-border rounded-lg text-sm bg-site-surface text-site-ink focus:outline-none focus:ring-2 focus:ring-site-accent/20"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="banned">Banned</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="bg-site-surface rounded-xl border border-site-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-site-bg border-b border-site-border">
                <th className="text-left px-4 py-3 font-semibold text-site-muted">User</th>
                <th className="text-left px-4 py-3 font-semibold text-site-muted">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-site-muted">Role</th>
                <th className="text-center px-4 py-3 font-semibold text-site-muted">Skills</th>
                <th className="text-center px-4 py-3 font-semibold text-site-muted">Practices</th>
                <th className="text-left px-4 py-3 font-semibold text-site-muted">Joined</th>
                <th className="text-right px-4 py-3 font-semibold text-site-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-site-faint">Loading...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-site-faint">No users found</td></tr>
              ) : users.map(user => {
                const badge = STATUS_BADGES[user.accountStatus] || STATUS_BADGES.active
                return (
                  <tr key={user._id} className="border-b border-site-border/50 hover:bg-site-bg/50">
                    <td className="px-4 py-3">
                      <button onClick={() => navigate(`/admin/users/${user._id}`)} className="text-left hover:underline">
                        <p className="font-medium text-site-ink">{user.name}</p>
                        <p className="text-xs text-site-faint">{user.email}</p>
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${badge.cls}`}>{badge.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      {user.role === 'admin' ? (
                        <span className="inline-flex items-center gap-1 text-site-accent text-xs font-medium"><Crown className="w-3 h-3" /> Admin</span>
                      ) : (
                        <span className="text-site-faint text-xs">User</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-site-muted">{user.skillCount || 0}</td>
                    <td className="px-4 py-3 text-center text-site-muted">{user.practiceCount || 0}</td>
                    <td className="px-4 py-3 text-site-faint text-xs">{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        {user.accountStatus === 'active' && user.role !== 'admin' && (
                          <>
                            <button onClick={() => setActionModal({ userId: user._id, action: 'suspend', userName: user.name })} className="p-1.5 text-amber-500 hover:bg-amber-50 rounded-lg" title="Suspend">
                              <ShieldAlert className="w-4 h-4" />
                            </button>
                            <button onClick={() => setActionModal({ userId: user._id, action: 'ban', userName: user.name })} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title="Ban">
                              <ShieldOff className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {(user.accountStatus === 'suspended' || user.accountStatus === 'banned') && (
                          <button onClick={() => setActionModal({ userId: user._id, action: 'reactivate', userName: user.name })} className="p-1.5 text-green-500 hover:bg-green-50 rounded-lg" title="Reactivate">
                            <ShieldCheck className="w-4 h-4" />
                          </button>
                        )}
                        {user.role !== 'admin' && user.accountStatus === 'active' && (
                          <button onClick={() => setActionModal({ userId: user._id, action: 'make-admin', userName: user.name })} className="p-1.5 text-site-accent hover:bg-site-soft rounded-lg" title="Make Admin">
                            <Crown className="w-4 h-4" />
                          </button>
                        )}
                        {user.role === 'admin' && (
                          <button onClick={() => setActionModal({ userId: user._id, action: 'remove-admin', userName: user.name })} className="p-1.5 text-site-muted hover:bg-site-bg rounded-lg" title="Remove Admin">
                            <UserX className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-site-border">
            <p className="text-sm text-site-faint">Page {page} of {pages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 border border-site-border rounded-lg disabled:opacity-40 hover:bg-site-bg">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className="p-1.5 border border-site-border rounded-lg disabled:opacity-40 hover:bg-site-bg">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Action Confirmation Modal */}
      {actionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-site-surface rounded-2xl shadow-xl w-full max-w-md p-6 border border-site-border">
            <h3 className="text-lg font-bold text-site-ink mb-1">{actionConfig[actionModal.action]?.title}</h3>
            <p className="text-sm text-site-faint mb-1">User: <span className="font-medium text-site-ink">{actionModal.userName}</span></p>
            <p className="text-sm text-site-muted mb-4">{actionConfig[actionModal.action]?.desc}</p>

            {actionConfig[actionModal.action]?.needsReason && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-site-ink mb-1">Reason</label>
                <textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="Provide a reason for this action..."
                  className="w-full px-3 py-2 border border-site-border rounded-lg text-sm bg-site-surface text-site-ink focus:outline-none focus:ring-2 focus:ring-site-accent/20 resize-none"
                  rows={3}
                />
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => { setActionModal(null); setReason('') }} className="flex-1 py-2.5 border border-site-border text-site-muted rounded-lg font-medium hover:bg-site-bg transition-colors text-sm">
                Cancel
              </button>
              <button onClick={handleAction} disabled={actionLoading} className={`flex-1 py-2.5 text-white rounded-lg font-medium transition-colors text-sm ${actionConfig[actionModal.action]?.btnCls}`}>
                {actionLoading ? 'Processing...' : actionConfig[actionModal.action]?.btn}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
