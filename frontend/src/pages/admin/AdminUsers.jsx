import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ChevronLeft, ChevronRight, ShieldOff, ShieldCheck, UserX, Crown } from 'lucide-react'
import { adminApi } from '../../api/adminApi'
import PageTransition from '../../components/admin/PageTransition'
import ErrorState from '../../components/admin/ErrorState'
import { SkeletonTable } from '../../components/admin/Skeleton'

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
  const [limit, setLimit] = useState(20)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionModal, setActionModal] = useState(null)
  const [reason, setReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const navigate = useNavigate()
  const searchTimeoutRef = useRef(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = { page, limit }
      if (search) params.search = search
      if (statusFilter) params.status = statusFilter
      const data = await adminApi.getUsers(params)
      setUsers(data.users)
      setTotal(data.total)
      setPages(data.pages)
    } catch (err) {
      console.error('Failed to fetch users:', err)
      setError(err.message || 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [page, limit, search, statusFilter])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const handleAction = async () => {
    if (!actionModal) return
    setActionLoading(true)
    try {
      const { userId, action } = actionModal
      if (action === 'ban') await adminApi.banUser(userId, reason)
      else if (action === 'unban') await adminApi.unbanUser(userId)
      else if (action === 'make-admin') await adminApi.promoteToAdmin(userId)
      else if (action === 'remove-admin') await adminApi.demoteFromAdmin(userId)
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
    ban: { title: 'Ban User', desc: 'This will permanently block the user from accessing the platform and void their weekly XP.', btn: 'Ban User', btnCls: 'bg-red-600 hover:bg-red-700', needsReason: true },
    unban: { title: 'Unban User', desc: "This will restore the user's access to the platform.", btn: 'Unban', btnCls: 'bg-green-600 hover:bg-green-700', needsReason: false },
    'make-admin': { title: 'Promote to Admin', desc: 'This will give the user full admin access.', btn: 'Make Admin', btnCls: 'bg-site-accent hover:bg-site-accent-hover', needsReason: false },
    'remove-admin': { title: 'Remove Admin Role', desc: 'This will revoke admin access from this user.', btn: 'Remove Admin', btnCls: 'bg-site-muted hover:bg-site-ink', needsReason: false }
  }

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pageNumbers = []
    const maxVisible = 5
    
    if (pages <= maxVisible) {
      // Show all pages if total is less than max
      for (let i = 1; i <= pages; i++) {
        pageNumbers.push(i)
      }
    } else {
      // Always show first page
      pageNumbers.push(1)
      
      // Calculate range around current page
      let start = Math.max(2, page - 1)
      let end = Math.min(pages - 1, page + 1)
      
      // Add ellipsis after first page if needed
      if (start > 2) {
        pageNumbers.push('...')
      }
      
      // Add pages around current page
      for (let i = start; i <= end; i++) {
        pageNumbers.push(i)
      }
      
      // Add ellipsis before last page if needed
      if (end < pages - 1) {
        pageNumbers.push('...')
      }
      
      // Always show last page
      pageNumbers.push(pages)
    }
    
    return pageNumbers
  }

  const startItem = (page - 1) * limit + 1
  const endItem = Math.min(page * limit, total)

  return (
    <PageTransition>
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
              onChange={e => {
                setSearch(e.target.value)
                setPage(1)
                clearTimeout(searchTimeoutRef.current)
                searchTimeoutRef.current = setTimeout(() => {
                  // Debounced search will trigger via useEffect dependency
                }, 300)
              }}
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
          <select
            value={limit}
            onChange={e => { setLimit(Number(e.target.value)); setPage(1) }}
            className="px-3 py-2 border border-site-border rounded-lg text-sm bg-site-surface text-site-ink focus:outline-none focus:ring-2 focus:ring-site-accent/20"
          >
            <option value="10">10 per page</option>
            <option value="20">20 per page</option>
            <option value="50">50 per page</option>
            <option value="100">100 per page</option>
          </select>
        </div>

        {/* Error State */}
        {error && !loading && (
          <ErrorState message={error} onRetry={fetchUsers} />
        )}

        {/* Loading State */}
        {loading && (
          <SkeletonTable rows={10} columns={10} />
        )}

        {/* Users Table - Desktop */}
        {!loading && !error && (
          <>
            <div className="hidden md:block bg-site-surface rounded-xl border border-site-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-site-bg border-b border-site-border">
                      <th className="text-left px-4 py-3 font-semibold text-site-muted">User</th>
                      <th className="text-left px-4 py-3 font-semibold text-site-muted">Status</th>
                      <th className="text-left px-4 py-3 font-semibold text-site-muted">Role</th>
                      <th className="text-left px-4 py-3 font-semibold text-site-muted">Plan</th>
                      <th className="text-left px-4 py-3 font-semibold text-site-muted">League</th>
                      <th className="text-center px-4 py-3 font-semibold text-site-muted">Skills</th>
                      <th className="text-center px-4 py-3 font-semibold text-site-muted">Practices</th>
                      <th className="text-left px-4 py-3 font-semibold text-site-muted">Joined</th>
                      <th className="text-left px-4 py-3 font-semibold text-site-muted">Last active</th>
                      <th className="text-right px-4 py-3 font-semibold text-site-muted">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.length === 0 ? (
                      <tr><td colSpan={10} className="px-4 py-8 text-center text-site-faint">No users found</td></tr>
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
                          <td className="px-4 py-3">
                            {user.plan === 'pro' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full text-xs font-semibold">
                                <Crown className="w-3 h-3" /> Pro
                              </span>
                            ) : (
                              <span className="text-site-faint text-xs">Free</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                              user.leagueTier === 'Gold' ? 'bg-amber-50 text-amber-700' :
                              user.leagueTier === 'Silver' ? 'bg-gray-50 text-gray-700' :
                              user.leagueTier === 'Bronze' ? 'bg-orange-50 text-orange-700' :
                              'bg-blue-50 text-blue-700'
                            }`}>
                              {user.leagueTier || 'Newcomer'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center text-site-muted">{user.skillCount || 0}</td>
                          <td className="px-4 py-3 text-center text-site-muted">{user.practiceCount || 0}</td>
                          <td className="px-4 py-3 text-site-faint text-xs">{new Date(user.createdAt).toLocaleDateString()}</td>
                          <td className="px-4 py-3 text-site-faint text-xs">{user.lastLoginAt ? (() => {
                            const days = Math.floor((new Date() - new Date(user.lastLoginAt)) / (1000 * 60 * 60 * 24))
                            const hours = Math.floor((new Date() - new Date(user.lastLoginAt)) / (1000 * 60 * 60))
                            if (hours < 1) return 'Now'
                            if (hours < 24) return `${hours}h ago`
                            if (days < 30) return `${days}d ago`
                            return '30+ days ago'
                          })() : 'Never'}</td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-1">
                              {user.accountStatus === 'active' && user.role !== 'admin' && (
                                <button onClick={() => setActionModal({ userId: user._id, action: 'ban', userName: user.name })} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title="Ban">
                                  <ShieldOff className="w-4 h-4" />
                                </button>
                              )}
                              {user.accountStatus === 'banned' && (
                                <button onClick={() => setActionModal({ userId: user._id, action: 'unban', userName: user.name })} className="p-1.5 text-green-500 hover:bg-green-50 rounded-lg" title="Unban">
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
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t border-site-border">
                  <div className="text-sm text-site-faint">
                    Showing {startItem} to {endItem} of {total} users
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {/* Previous button */}
                    <button 
                      onClick={() => setPage(p => Math.max(1, p - 1))} 
                      disabled={page === 1} 
                      className="p-2 border border-site-border rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-site-bg transition-colors"
                      title="Previous page"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    
                    {/* Page numbers */}
                    <div className="hidden sm:flex items-center gap-1">
                      {getPageNumbers().map((pageNum, idx) => (
                        pageNum === '...' ? (
                          <span key={`ellipsis-${idx}`} className="px-3 py-1 text-site-faint">...</span>
                        ) : (
                          <button
                            key={pageNum}
                            onClick={() => setPage(pageNum)}
                            className={`min-w-[36px] px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                              page === pageNum
                                ? 'bg-site-accent text-white'
                                : 'text-site-ink hover:bg-site-bg border border-site-border'
                            }`}
                          >
                            {pageNum}
                          </button>
                        )
                      ))}
                    </div>
                    
                    {/* Mobile page indicator */}
                    <div className="sm:hidden px-3 py-1 text-sm text-site-ink font-medium">
                      {page} / {pages}
                    </div>
                    
                    {/* Next button */}
                    <button 
                      onClick={() => setPage(p => Math.min(pages, p + 1))} 
                      disabled={page === pages} 
                      className="p-2 border border-site-border rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-site-bg transition-colors"
                      title="Next page"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Card Layout */}
            <div className="md:hidden space-y-4">
              {users.length === 0 ? (
                <div className="bg-site-surface rounded-xl border border-site-border p-8 text-center text-site-faint">
                  No users found
                </div>
              ) : users.map(user => {
                const badge = STATUS_BADGES[user.accountStatus] || STATUS_BADGES.active
                return (
                  <div key={user._id} className="bg-site-surface rounded-xl border border-site-border p-4">
                    {/* User Info */}
                    <button 
                      onClick={() => navigate(`/admin/users/${user._id}`)} 
                      className="text-left w-full mb-3"
                    >
                      <p className="font-medium text-site-ink">{user.name}</p>
                      <p className="text-xs text-site-faint">{user.email}</p>
                    </button>

                    {/* Status and Role */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${badge.cls}`}>
                        {badge.label}
                      </span>
                      {user.role === 'admin' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-site-soft text-site-accent rounded-full text-xs font-medium">
                          <Crown className="w-3 h-3" /> Admin
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-0.5 bg-site-bg text-site-faint rounded-full text-xs">
                          User
                        </span>
                      )}
                      {user.plan === 'pro' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full text-xs font-semibold">
                          <Crown className="w-3 h-3" /> Pro
                        </span>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-3 border-t border-site-border">
                      {user.accountStatus === 'active' && user.role !== 'admin' && (
                        <button 
                          onClick={() => setActionModal({ userId: user._id, action: 'ban', userName: user.name })} 
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-red-500 bg-red-50 hover:bg-red-100 rounded-lg text-xs font-medium transition-colors"
                        >
                          <ShieldOff className="w-3.5 h-3.5" />
                          Ban
                        </button>
                      )}
                      {user.accountStatus === 'banned' && (
                        <button 
                          onClick={() => setActionModal({ userId: user._id, action: 'unban', userName: user.name })} 
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-green-600 bg-green-50 hover:bg-green-100 rounded-lg text-xs font-medium transition-colors"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Unban
                        </button>
                      )}
                      {user.role !== 'admin' && user.accountStatus === 'active' && (
                        <button 
                          onClick={() => setActionModal({ userId: user._id, action: 'make-admin', userName: user.name })} 
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-site-accent bg-site-soft hover:bg-site-soft/80 rounded-lg text-xs font-medium transition-colors"
                        >
                          <Crown className="w-3.5 h-3.5" />
                          Make Admin
                        </button>
                      )}
                      {user.role === 'admin' && (
                        <button 
                          onClick={() => setActionModal({ userId: user._id, action: 'remove-admin', userName: user.name })} 
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-site-muted bg-site-bg hover:bg-site-border rounded-lg text-xs font-medium transition-colors"
                        >
                          <UserX className="w-3.5 h-3.5" />
                          Remove Admin
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}

              {/* Mobile Pagination */}
              {pages > 1 && (
                <div className="flex flex-col items-center gap-4 pt-4">
                  <div className="text-sm text-site-faint">
                    Showing {startItem} to {endItem} of {total} users
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setPage(p => Math.max(1, p - 1))} 
                      disabled={page === 1} 
                      className="p-2 border border-site-border rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-site-bg transition-colors"
                      title="Previous page"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    
                    <div className="px-3 py-1 text-sm text-site-ink font-medium">
                      {page} / {pages}
                    </div>
                    
                    <button 
                      onClick={() => setPage(p => Math.min(pages, p + 1))} 
                      disabled={page === pages} 
                      className="p-2 border border-site-border rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-site-bg transition-colors"
                      title="Next page"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Action Confirmation Modal */}
        {actionModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-site-surface rounded-2xl shadow-xl w-full max-w-md p-6 border border-site-border">
              <h3 className="text-lg font-bold text-site-ink mb-1">{actionConfig[actionModal.action]?.title}</h3>
              <p className="text-sm text-site-faint mb-1">User: <span className="font-medium text-site-ink">{actionModal.userName}</span></p>
              <p className="text-sm text-site-muted mb-4">{actionConfig[actionModal.action]?.desc}</p>

              {actionConfig[actionModal.action]?.needsReason && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-site-ink mb-1">
                    Reason (10-50 characters)
                  </label>
                  <textarea
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    placeholder="Provide a reason for this action..."
                    maxLength={50}
                    className="w-full px-3 py-2 border border-site-border rounded-lg text-sm bg-site-surface text-site-ink focus:outline-none focus:ring-2 focus:ring-site-accent/20 resize-none"
                    rows={3}
                  />
                  <p className="text-xs text-site-faint mt-1">
                    {reason.length}/50 characters {reason.length < 10 && `(minimum 10)`}
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => { setActionModal(null); setReason('') }} className="flex-1 py-2.5 border border-site-border text-site-muted rounded-lg font-medium hover:bg-site-bg transition-colors text-sm">
                  Cancel
                </button>
                <button 
                  onClick={handleAction} 
                  disabled={actionLoading || (actionConfig[actionModal.action]?.needsReason && (reason.length < 10 || reason.length > 50))} 
                  className={`flex-1 py-2.5 text-white rounded-lg font-medium transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed ${actionConfig[actionModal.action]?.btnCls}`}
                >
                  {actionLoading ? 'Processing...' : actionConfig[actionModal.action]?.btn}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  )
}
