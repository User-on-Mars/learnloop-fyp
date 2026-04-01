import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, BookOpen, Clock, MessageSquare, Play, Crown, ShieldAlert, ShieldOff, ShieldCheck } from 'lucide-react'
import { adminApi } from '../../api/adminApi'

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

  const fetchUser = () => {
    setLoading(true)
    adminApi.getUserDetail(userId)
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchUser() }, [userId])

  const handleAction = async (action, reason = '') => {
    setActionLoading(true)
    try {
      if (action === 'suspend') await adminApi.suspendUser(userId, reason)
      else if (action === 'ban') await adminApi.banUser(userId, reason)
      else if (action === 'reactivate') await adminApi.reactivateUser(userId)
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

  const { user, skills, practices, reflections, sessions } = data

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
              <>
                <button onClick={() => handleAction('suspend', 'Admin action')} disabled={actionLoading} className="px-3 py-1.5 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600 flex items-center gap-1">
                  <ShieldAlert className="w-4 h-4" /> Suspend
                </button>
                <button onClick={() => handleAction('ban', 'Admin action')} disabled={actionLoading} className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-1">
                  <ShieldOff className="w-4 h-4" /> Ban
                </button>
              </>
            )}
            {(user.accountStatus === 'suspended' || user.accountStatus === 'banned') && (
              <button onClick={() => handleAction('reactivate')} disabled={actionLoading} className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1">
                <ShieldCheck className="w-4 h-4" /> Reactivate
              </button>
            )}
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
    </div>
  )
}
