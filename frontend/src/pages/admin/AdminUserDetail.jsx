import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Clock,
  Crown,
  Flame,
  Mail,
  MessageSquare,
  Play,
  ShieldCheck,
  ShieldOff,
  Trophy
} from 'lucide-react'
import { adminApi } from '../../api/adminApi'
import ConfirmAction from '../../components/admin/ConfirmAction'
import PageTransition from '../../components/admin/PageTransition'
import ErrorState from '../../components/admin/ErrorState'
import { Skeleton } from '../../components/admin/Skeleton'

const STATUS_COLORS = {
  active: 'bg-green-100 text-green-700 border-green-200',
  suspended: 'bg-amber-100 text-amber-700 border-amber-200',
  banned: 'bg-red-100 text-red-700 border-red-200'
}

function formatDate(value) {
  if (!value) return 'Never'
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function getLastActive(value) {
  if (!value) return 'Never'
  const days = Math.floor((Date.now() - new Date(value).getTime()) / (1000 * 60 * 60 * 24))
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return `${days} days ago`
}

function StatCard({ icon: Icon, label, value, accent = 'text-site-ink', tone = 'bg-site-bg' }) {
  return (
    <div className="rounded-xl border border-site-border bg-site-surface p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${tone}`}>
          <Icon className="w-5 h-5 text-site-muted" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-site-faint">{label}</p>
          <p className={`text-lg font-bold truncate ${accent}`}>{value}</p>
        </div>
      </div>
    </div>
  )
}

function SectionCard({ title, count, children }) {
  return (
    <div className="bg-site-surface rounded-xl border border-site-border p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-site-ink">{title}</h2>
        {count != null && <span className="text-xs font-medium text-site-muted">{count}</span>}
      </div>
      {children}
    </div>
  )
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
        <div className="p-6 lg:p-8 max-w-7xl">
          <Skeleton className="h-4 w-32 mb-6" />
          <Skeleton className="h-72 w-full rounded-xl mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-56 w-full rounded-xl lg:col-span-2" />
          </div>
        </div>
      </PageTransition>
    )
  }

  if (error) {
    return (
      <PageTransition>
        <div className="p-6 lg:p-8 max-w-7xl">
          <ErrorState message={error} onRetry={fetchUser} />
        </div>
      </PageTransition>
    )
  }

  if (!data) return null

  const { user, skills, practices, reflections, xpProfile } = data
  const status = user.accountStatus || 'active'
  const initial = user.name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || '?'
  const totalMinutes = practices.reduce((sum, practice) => sum + (practice.minutesPracticed || 0), 0)
  const practiceTime = totalMinutes >= 60 ? `${(totalMinutes / 60).toFixed(1)}h` : `${totalMinutes}m`
  const lastActive = getLastActive(user.lastLoginAt)

  return (
    <PageTransition>
      <div className="p-6 lg:p-8 max-w-7xl">
        <button onClick={() => navigate('/admin/users')} className="flex items-center gap-1 text-sm text-site-muted hover:text-site-accent mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Users
        </button>

        <div className="bg-site-surface rounded-xl border border-site-border overflow-hidden mb-6">
          <div className="p-6 border-b border-site-border bg-gradient-to-r from-site-surface to-site-bg">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-start gap-4 min-w-0">
                <div className="w-16 h-16 rounded-2xl bg-site-accent/10 flex items-center justify-center text-site-accent text-2xl font-bold flex-shrink-0">
                  {initial}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-2xl font-bold text-site-ink truncate">{user.name || 'Unknown user'}</h1>
                    {user.role === 'admin' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-site-soft text-site-accent rounded-full text-xs font-medium">
                        <Crown className="w-3 h-3" /> Admin
                      </span>
                    )}
                    <span className={`inline-flex px-2 py-0.5 rounded-full border text-xs font-medium ${STATUS_COLORS[status] || STATUS_COLORS.active}`}>
                      {status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-sm text-site-muted break-all">
                    <Mail className="w-4 h-4 flex-shrink-0" />
                    {user.email}
                  </div>
                  {user.statusReason && (
                    <p className="text-xs text-amber-700 mt-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
                      Reason: {user.statusReason}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-2 flex-shrink-0">
                {status === 'active' && user.role !== 'admin' && (
                  <button
                    onClick={() => setConfirmAction({ action: 'ban' })}
                    disabled={actionLoading}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-red-50 text-red-600 rounded-lg hover:bg-red-100 border border-red-200 transition-colors"
                  >
                    <ShieldOff className="w-4 h-4" /> Ban
                  </button>
                )}
                {status === 'banned' && (
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
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4 p-5 bg-site-bg/50">
            <StatCard icon={Calendar} label="Joined" value={formatDate(user.createdAt)} />
            <StatCard icon={Clock} label="Last active" value={lastActive} accent={lastActive === 'Never' ? 'text-red-500' : 'text-site-ink'} />
            <StatCard icon={BookOpen} label="Skill maps" value={skills.length} />
            <StatCard icon={Play} label="Practices" value={practices.length} />
            <StatCard icon={Trophy} label="Total XP" value={(xpProfile?.totalXp || 0).toLocaleString()} accent="text-site-accent" />
            <StatCard icon={Flame} label="Weekly XP" value={(xpProfile?.weeklyXp || 0).toLocaleString()} accent="text-green-600" />
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <SectionCard title="Skill maps" count={skills.length}>
            {skills.length === 0 ? (
              <p className="text-sm text-site-faint py-10 text-center">No skill maps yet</p>
            ) : (
              <div className="space-y-2">
                {skills.map(skill => (
                  <div key={skill._id} className="flex items-center justify-between gap-3 p-3 bg-site-bg rounded-lg">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <BookOpen className="w-4 h-4 text-site-accent flex-shrink-0" />
                      <span className="font-medium text-site-ink text-sm truncate">{skill.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs flex-shrink-0">
                      <span className="text-site-faint">{skill.nodeCount || 0} nodes</span>
                      <span className={`px-2 py-0.5 rounded-full font-medium ${skill.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                        {skill.status || 'active'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Recent practices" count={practiceTime}>
            {practices.length === 0 ? (
              <p className="text-sm text-site-faint py-10 text-center">No practices yet</p>
            ) : (
              <div className="space-y-2">
                {practices.slice(0, 8).map(practice => (
                  <div key={practice._id} className="flex items-center justify-between gap-3 p-3 bg-blue-50/50 border border-blue-100 rounded-lg">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Play className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-site-ink text-sm truncate">{practice.skillName || 'Practice session'}</p>
                        <p className="text-xs text-site-faint">{practice.minutesPracticed || 0} min</p>
                      </div>
                    </div>
                    <span className="text-xs text-site-faint flex-shrink-0">
                      {formatDate(practice.date || practice.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Recent reflections" count={reflections.length}>
            {reflections.length === 0 ? (
              <p className="text-sm text-site-faint py-10 text-center">No reflections yet</p>
            ) : (
              <div className="space-y-2">
                {reflections.slice(0, 8).map(reflection => (
                  <div key={reflection._id} className="p-3 bg-purple-50/50 border border-purple-100 rounded-lg">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-site-ink text-sm truncate">{reflection.title || 'Untitled reflection'}</p>
                        {reflection.content && <p className="text-xs text-site-muted mt-1 line-clamp-2">{reflection.content}</p>}
                      </div>
                      <span className="text-xs text-site-faint flex-shrink-0">{formatDate(reflection.createdAt)}</span>
                    </div>
                    {reflection.mood && (
                      <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded-full bg-site-surface text-site-muted border border-site-border">
                        {reflection.mood}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

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
            <label className="block text-sm font-medium text-site-ink mb-2">Reason (10-50 characters)</label>
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
