import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Crown, ShieldOff, ShieldCheck, Calendar, Clock, Trophy, Flame, BookOpen, Play, MessageSquare } from 'lucide-react'
import { adminApi } from '../../api/adminApi'
import ConfirmAction from '../../components/admin/ConfirmAction'
import PageTransition from '../../components/admin/PageTransition'
import ErrorState from '../../components/admin/ErrorState'
import { Skeleton } from '../../components/admin/Skeleton'

const STATUS_COLORS = {
  active: 'bg-green-100 text-green-700',
  suspended: 'bg-amber-100 text-amber-700',
  banned: 'bg-red-100 text-red-700'
}

export default function AdminUserDetail() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [confirmAction, setConfirmAction] = useState(null)
  const [actionReason, setActionReason] = useState('')

  const fetchUser = () => {
    setLoading(true)
    adminApi.getUserDetail(userId)
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchUser() }, [userId])

  const handleAction = async () => {
    if (!confirmAction) return
    setActionLoading(true)
    try {
      if (confirmAction.action === 'ban') await adminApi.banUser(userId, actionReason)
      else if (confirmAction.action === 'unban') await adminApi.unbanUser(userId)
      setConfirmAction(null)
      setActionReason('')
      fetchUser()
    } catch (err) {
      alert(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <PageTransition>
        <div className="p-6 lg:p-8 max-w-6xl">
          <Skeleton className="h-4 w-32 mb-6" />
          
          {/* Profile header skeleton */}
          <div className="bg-site-surface rounded-xl border border-site-border p-6 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-5">
              <Skeleton className="w-16 h-16 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-64" />
              </div>
              <Skeleton className="h-10 w-24" />
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 mt-6 pt-6 border-t border-site-border">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="text-center space-y-2">
                  <Skeleton className="h-4 w-4 mx-auto" />
                  <Skeleton className="h-5 w-12 mx-auto" />
                  <Skeleton className="h-3 w-16 mx-auto" />
                </div>
              ))}
            </div>
          </div>

          {/* Content grid skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-site-surface rounded-xl border border-site-border p-5">
              <Skeleton className="h-4 w-24 mb-3" />
              <div className="space-y-2">
                {Array.from({ length: 3 }, (_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            </div>
            <div className="bg-site-surface rounded-xl border border-site-border p-5">
              <Skeleton className="h-4 w-32 mb-3" />
              <div className="space-y-2">
                {Array.from({ length: 3 }, (_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            </div>
            <div className="bg-site-surface rounded-xl border border-site-border p-5 lg:col-span-2">
              <Skeleton className="h-4 w-36 mb-3" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Array.from({ length: 4 }, (_, i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </PageTransition>
    )
  }
  
  if (error) {
    return (
      <PageTransition>
        <div className="p-6 lg:p-8 max-w-6xl">
          <ErrorState message={error} onRetry={fetchUser} />
        </div>
      </PageTransition>
    )
  }
  
  if (!data) return null

  const { user, skills, practices, reflections, sessions, xpProfile } = data

  const lastActive = user.lastLoginAt
    ? (() => {
        const days = Math.floor((Date.now() - new Date(user.lastLoginAt).getTime()) / (1000 * 60 * 60 * 24))
        if (days === 0) return 'Today'
        if (days === 1) return 'Yesterday'
        return `${days} days ago`
      })()
    : 'Never'

  const totalMinutes = practices.reduce((sum, p) => sum + (p.minutesPracticed || 0), 0)
  const practiceTime = totalMinutes >= 60 ? `${(totalMinutes / 60).toFixed(1)}h` : `${totalMinutes}m`

  return (
    <PageTransition>
      <div className="p-6 lg:p-8 max-w-6xl">
        <button onClick={() => navigate('/admin/users')} className="flex items-center gap-1 text-sm text-site-muted hover:text-site-accent mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Users
        </button>

      {/* ── Full-width Profile Header ─────────────────────────── */}
      <div className="bg-site-surface rounded-xl border border-site-border p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-full bg-site-accent/10 flex items-center justify-center text-site-accent text-2xl font-bold flex-shrink-0">
            {user.name?.charAt(0)?.toUpperCase() || '?'}
          </div>

          {/* Name + email + meta */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-xl font-bold text-site-ink">{user.name}</h1>
              {user.role === 'admin' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-site-soft text-site-accent rounded-full text-xs font-medium">
                  <Crown className="w-3 h-3" /> Admin
                </span>
              )}
              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[user.accountStatus] || STATUS_COLORS.active}`}>
                {user.accountStatus || 'active'}
              </span>
            </div>
            <p className="text-sm text-site-muted break-all">{user.email}</p>
            {user.statusReason && <p className="text-xs text-amber-600 mt-1">Reason: {user.statusReason}</p>}
          </div>

          {/* Actions */}
          <div className="flex gap-2 flex-shrink-0">
            {user.accountStatus === 'active' && user.role !== 'admin' && (
              <button
                onClick={() => setConfirmAction({ action: 'ban' })}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-red-50 text-red-600 rounded-lg hover:bg-red-100 border border-red-200 transition-colors"
              >
                <ShieldOff className="w-4 h-4" /> Ban
              </button>
            )}
            {user.accountStatus === 'banned' && (
              <button
                onClick={() => setConfirmAction({ action: 'unban' })}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-green-50 text-green-600 rounded-lg hover:bg-green-100 border border-green-200 transition-colors"
              >
                <ShieldCheck className="w-4 h-4" /> Unban
              </button>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 mt-6 pt-6 border-t border-site-border">
          {[
            { icon: Calendar, label: 'Joined', value: new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) },
            { icon: Clock, label: 'Last active', value: lastActive, accent: lastActive === 'Never' ? 'text-red-500' : null },
            { icon: BookOpen, label: 'Skill maps', value: skills.length },
            { icon: Play, label: 'Practices', value: practices.length },
            { icon: Trophy, label: 'Total XP', value: (xpProfile?.totalXp || 0).toLocaleString(), accent: 'text-site-accent' },
            { icon: Flame, label: 'Weekly XP', value: (xpProfile?.weeklyXp || 0).toLocaleString(), accent: 'text-green-600' },
          ].map((s, i) => (
            <div key={i} className="text-center">
              <s.icon className="w-4 h-4 text-site-faint mx-auto mb-1" />
              <p className={`text-lg font-bold ${s.accent || 'text-site-ink'}`}>{s.value}</p>
              <p className="text-xs text-site-faint">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Content Grid ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Skill Maps */}
        <div className="bg-site-surface rounded-xl border border-site-border p-5">
          <h2 className="text-xs font-semibold text-site-faint uppercase tracking-wider mb-3">Skill maps</h2>
          {skills.length === 0 ? (
            <p className="text-sm text-site-faint py-6 text-center">No skill maps yet</p>
          ) : (
            <div className="space-y-2">
              {skills.map(s => (
                <div key={s._id} className="flex items-center justify-between py-2.5 px-3 bg-site-bg rounded-lg">
                  <div className="flex items-center gap-2.5">
                    <BookOpen className="w-4 h-4 text-site-accent" />
                    <span className="font-medium text-site-ink text-sm">{s.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-site-faint">{s.nodeCount} nodes</span>
                    <span className={`px-1.5 py-0.5 rounded font-medium ${s.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                      {s.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Practices */}
        <div className="bg-site-surface rounded-xl border border-site-border p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-site-faint uppercase tracking-wider">Recent practices</h2>
            {practices.length > 0 && <span className="text-xs text-site-faint">Total: {practiceTime}</span>}
          </div>
          {practices.length === 0 ? (
            <p className="text-sm text-site-faint py-6 text-center">No practices yet</p>
          ) : (
            <div className="space-y-2">
              {practices.slice(0, 8).map(p => (
                <div key={p._id} className="flex items-center justify-between py-2.5 px-3 bg-site-bg rounded-lg">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Play className="w-3.5 h-3.5 text-site-faint flex-shrink-0" />
                    <span className="font-medium text-site-ink text-sm truncate">{p.skillName}</span>
                    <span className="text-xs text-site-faint flex-shrink-0">{p.minutesPracticed} min</span>
                  </div>
                  <span className="text-xs text-site-faint flex-shrink-0 ml-2">
                    {new Date(p.date || p.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Reflections — full width */}
        <div className="bg-site-surface rounded-xl border border-site-border p-5 lg:col-span-2">
          <h2 className="text-xs font-semibold text-site-faint uppercase tracking-wider mb-3">Recent reflections</h2>
          {reflections.length === 0 ? (
            <p className="text-sm text-site-faint py-6 text-center">No reflections yet</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {reflections.slice(0, 6).map(r => (
                <div key={r._id} className="py-3 px-4 bg-site-bg rounded-lg">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-medium text-site-ink text-sm">{r.title || 'Untitled'}</span>
                    <span className="text-xs text-site-faint">
                      {new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  {r.content && <p className="text-xs text-site-muted line-clamp-2">{r.content}</p>}
                  {r.mood && (
                    <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded-full bg-site-surface text-site-muted border border-site-border">
                      {r.mood}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Ban Confirmation */}
      <ConfirmAction
        isOpen={confirmAction?.action === 'ban'}
        title="Ban User"
        message="This will permanently block the user from accessing the platform and void their weekly XP."
        confirmText="Ban"
        isDangerous
        onCancel={() => { setConfirmAction(null); setActionReason('') }}
        loading={actionLoading}
        onConfirm={() => {}}
      >
        <div className="mt-4">
          <label className="block text-sm font-medium text-site-ink mb-2">Reason (10–50 characters)</label>
          <textarea
            value={actionReason}
            onChange={(e) => setActionReason(e.target.value)}
            placeholder="Why are you banning this user?"
            maxLength={50}
            className="w-full px-3 py-2 border border-site-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
            rows={3}
          />
          <p className="text-xs text-site-faint mt-1">{actionReason.length}/50 {actionReason.length < 10 && '(min 10)'}</p>
          <button
            onClick={handleAction}
            disabled={actionLoading || actionReason.length < 10 || actionReason.length > 50}
            className="w-full mt-3 px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {actionLoading ? 'Banning...' : 'Confirm Ban'}
          </button>
        </div>
      </ConfirmAction>

      {/* Unban Confirmation */}
      <ConfirmAction
        isOpen={confirmAction?.action === 'unban'}
        title="Unban User"
        message="This will restore the user's access to the platform."
        confirmText="Unban"
        onCancel={() => setConfirmAction(null)}
        loading={actionLoading}
        onConfirm={handleAction}
      />
    </div>
    </PageTransition>
  )
}
