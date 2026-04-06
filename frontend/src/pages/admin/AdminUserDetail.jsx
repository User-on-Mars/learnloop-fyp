import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, BookOpen, Clock, MessageSquare, Play, Crown, ShieldOff, ShieldCheck, Zap } from 'lucide-react'
import { adminApi } from '../../api/adminApi'
import ConfirmAction from '../../components/admin/ConfirmAction'

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
  const [xpAmount, setXpAmount] = useState('')

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
      const { action } = confirmAction
      if (action === 'ban') await adminApi.banUser(userId, actionReason)
      else if (action === 'unban') await adminApi.unbanUser(userId)
      else if (action === 'adjust-xp') await adminApi.adjustXp(userId, parseInt(xpAmount), actionReason)
      setConfirmAction(null)
      setActionReason('')
      setXpAmount('')
      fetchUser()
    } catch (err) {
      alert(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) return <div className="p-8 text-site-muted">Loading...</div>
  if (error) return <div className="p-8 text-red-500">Error: {error}</div>
  if (!data) return null

  const { user, skills, practices, reflections, sessions, xpProfile } = data

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      <button onClick={() => navigate('/admin/users')} className="flex items-center gap-1 text-sm text-site-muted hover:text-site-accent mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Users
      </button>

      {/* User Header */}
      <div className="bg-site-surface rounded-xl border border-site-border p-6 mb-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-bold text-site-ink">{user.name}</h1>
              {user.role === 'admin' && <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-site-soft text-site-accent rounded-full text-xs font-medium"><Crown className="w-3 h-3" /> Admin</span>}
              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[user.accountStatus] || STATUS_COLORS.active}`}>
                {user.accountStatus || 'active'}
              </span>
            </div>
            <p className="text-site-muted text-sm">{user.email}</p>
            <p className="text-site-faint text-xs mt-1">Joined {new Date(user.createdAt).toLocaleDateString()}</p>
            {user.statusReason && <p className="text-sm text-amber-600 mt-2">Reason: {user.statusReason}</p>}
          </div>
          <div className="flex gap-2">
            {user.accountStatus === 'active' && user.role !== 'admin' && (
              <button onClick={() => setConfirmAction({ action: 'ban' })} disabled={actionLoading} className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-1">
                <ShieldOff className="w-4 h-4" /> Ban
              </button>
            )}
            {user.accountStatus === 'banned' && (
              <button onClick={() => setConfirmAction({ action: 'unban' })} disabled={actionLoading} className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1">
                <ShieldCheck className="w-4 h-4" /> Unban
              </button>
            )}
            <button onClick={() => setConfirmAction({ action: 'adjust-xp' })} disabled={actionLoading} className="px-3 py-1.5 text-sm bg-site-accent text-white rounded-lg hover:bg-site-accent-hover flex items-center gap-1">
              <Zap className="w-4 h-4" /> Adjust XP
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-site-border">
          <div className="text-center">
            <p className="text-2xl font-bold text-site-ink">{skills.length}</p>
            <p className="text-xs text-site-faint flex items-center justify-center gap-1"><BookOpen className="w-3 h-3" /> Skill Maps</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-site-ink">{practices.length}</p>
            <p className="text-xs text-site-faint flex items-center justify-center gap-1"><Clock className="w-3 h-3" /> Practices</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-site-ink">{reflections.length}</p>
            <p className="text-xs text-site-faint flex items-center justify-center gap-1"><MessageSquare className="w-3 h-3" /> Reflections</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-site-ink">{sessions.length}</p>
            <p className="text-xs text-site-faint flex items-center justify-center gap-1"><Play className="w-3 h-3" /> Sessions</p>
          </div>
        </div>

        {xpProfile && (
          <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-site-border">
            <div className="text-center">
              <p className="text-2xl font-bold text-site-accent">{xpProfile.totalXp?.toLocaleString() || 0}</p>
              <p className="text-xs text-site-faint">Total XP</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{xpProfile.weeklyXp?.toLocaleString() || 0}</p>
              <p className="text-xs text-site-faint">Weekly XP</p>
            </div>
          </div>
        )}
      </div>

      {skills.length > 0 && (
        <div className="bg-site-surface rounded-xl border border-site-border p-5 mb-6">
          <h2 className="text-xs font-semibold text-site-faint uppercase tracking-wider mb-3">Skill Maps</h2>
          <div className="space-y-2">
            {skills.map(s => (
              <div key={s._id} className="flex items-center justify-between py-2 px-3 bg-site-bg rounded-lg">
                <span className="font-medium text-site-ink text-sm">{s.name}</span>
                <span className="text-xs text-site-faint">{s.nodeCount} nodes · {s.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {practices.length > 0 && (
        <div className="bg-site-surface rounded-xl border border-site-border p-5 mb-6">
          <h2 className="text-xs font-semibold text-site-faint uppercase tracking-wider mb-3">Recent Practices</h2>
          <div className="space-y-2">
            {practices.slice(0, 10).map(p => (
              <div key={p._id} className="flex items-center justify-between py-2 px-3 bg-site-bg rounded-lg">
                <div>
                  <span className="font-medium text-site-ink text-sm">{p.skillName}</span>
                  <span className="text-xs text-site-faint ml-2">{p.minutesPracticed}min</span>
                </div>
                <span className="text-xs text-site-faint">{new Date(p.date || p.createdAt).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {reflections.length > 0 && (
        <div className="bg-site-surface rounded-xl border border-site-border p-5">
          <h2 className="text-xs font-semibold text-site-faint uppercase tracking-wider mb-3">Recent Reflections</h2>
          <div className="space-y-2">
            {reflections.slice(0, 10).map(r => (
              <div key={r._id} className="py-2 px-3 bg-site-bg rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-site-ink text-sm">{r.title || 'Untitled'}</span>
                  <div className="flex items-center gap-2">
                    {r.mood && <span className="text-xs text-site-faint">{r.mood}</span>}
                    <span className="text-xs text-site-faint">{new Date(r.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <p className="text-xs text-site-muted line-clamp-2">{r.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ban Confirmation */}
      <ConfirmAction
        isOpen={confirmAction?.action === 'ban'}
        title="Ban User"
        message="This will permanently block the user from accessing the platform and void their weekly XP."
        confirmText="Ban"
        isDangerous
        onCancel={() => setConfirmAction(null)}
        loading={actionLoading}
        onConfirm={() => {}}
      >
        {confirmAction?.action === 'ban' && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-site-ink mb-2">
              Reason (10-50 characters)
            </label>
            <textarea
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              placeholder="Why are you banning this user?"
              maxLength={50}
              className="w-full px-3 py-2 border border-site-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-site-accent resize-none"
              rows={3}
            />
            <p className="text-xs text-site-faint mt-1">
              {actionReason.length}/50 characters {actionReason.length < 10 && `(minimum 10)`}
            </p>
            <button
              onClick={handleAction}
              disabled={actionLoading || actionReason.length < 10 || actionReason.length > 50}
              className="w-full mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {actionLoading ? 'Banning...' : 'Confirm Ban'}
            </button>
          </div>
        )}
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

      {/* Adjust XP Modal */}
      {confirmAction?.action === 'adjust-xp' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-site-surface rounded-xl border border-site-border p-6 max-w-sm w-full mx-4">
            <h3 className="font-semibold text-site-ink mb-4">Adjust XP</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-site-ink mb-2">Amount (positive or negative)</label>
                <input
                  type="number"
                  value={xpAmount}
                  onChange={(e) => setXpAmount(e.target.value)}
                  placeholder="e.g., 100 or -50"
                  className="w-full px-3 py-2 border border-site-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-site-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-site-ink mb-2">Reason (min 10 characters)</label>
                <textarea
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="Why are you adjusting this user's XP?"
                  className="w-full px-3 py-2 border border-site-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-site-accent resize-none"
                  rows={3}
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => setConfirmAction(null)}
                className="px-4 py-2 rounded-lg border border-site-border text-site-muted hover:bg-site-soft transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleAction}
                disabled={actionLoading || !xpAmount || actionReason.length < 10}
                className="px-4 py-2 bg-site-accent text-white rounded-lg text-sm font-medium hover:bg-site-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {actionLoading ? 'Adjusting...' : 'Adjust XP'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
