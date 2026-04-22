import { useState, useEffect } from 'react'
import { AlertCircle, RotateCcw, Save, X, Download, Zap, Trophy, Shield, Database, Mail } from 'lucide-react'
import { adminApi } from '../../api/adminApi'

function SettingRow({ label, desc, children }) {
  return (
    <div className="flex items-center justify-between gap-4 p-3 bg-site-bg rounded-lg">
      <div className="min-w-0">
        <p className="text-sm font-medium text-site-ink">{label}</p>
        {desc && <p className="text-xs text-site-faint mt-0.5">{desc}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}

function NumInput({ value, onChange, suffix = '', min = 0, max = 10000, step = 1 }) {
  return (
    <div className="flex items-center gap-1">
      <input type="number" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-20 px-2 py-1 border border-site-border rounded text-sm text-right focus:outline-none focus:ring-2 focus:ring-site-accent/30" />
      {suffix && <span className="text-xs text-site-faint">{suffix}</span>}
    </div>
  )
}

function DisplayVal({ value, color = 'text-site-accent' }) {
  return <span className={`font-semibold text-sm ${color}`}>{value}</span>
}

function SectionCard({ icon: Icon, iconBg, iconColor, title, desc, children }) {
  return (
    <div className="bg-site-surface rounded-xl border border-site-border p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className={`p-2 rounded-lg ${iconBg}`}><Icon className={`w-5 h-5 ${iconColor}`} /></div>
        <div><h2 className="font-semibold text-site-ink">{title}</h2><p className="text-xs text-site-faint">{desc}</p></div>
      </div>
      {children}
    </div>
  )
}

function EditButton({ editing, onEdit, onSave, onCancel, saving }) {
  if (editing) {
    return (
      <div className="flex gap-2 mt-4">
        <button onClick={onSave} disabled={saving} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-site-accent text-white rounded-lg text-sm font-medium hover:bg-site-accent-hover disabled:opacity-50 transition-colors">
          <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save changes'}
        </button>
        <button onClick={onCancel} className="px-4 py-2.5 border border-site-border rounded-lg text-sm font-medium text-site-ink hover:bg-site-bg transition-colors">Cancel</button>
      </div>
    )
  }
  return <button onClick={onEdit} className="w-full mt-4 px-4 py-2.5 border border-site-border rounded-lg text-sm font-medium text-site-ink hover:bg-site-bg transition-colors">Edit settings</button>
}

export default function AdminSettings() {
  const [message, setMessage] = useState('')
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [edited, setEdited] = useState({})

  // Section edit states
  const [xpEditing, setXpEditing] = useState(false)
  const [tierEditing, setTierEditing] = useState(false)
  const [lbEditing, setLbEditing] = useState(false)
  const [flagEditing, setFlagEditing] = useState(false)
  const [contactEditing, setContactEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  // Danger zone
  const [confirmAction, setConfirmAction] = useState(null) // 'reset' | 'recalc' | 'export'
  const [resetText, setResetText] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000'

  useEffect(() => { fetchSettings() }, [])

  const showMsg = (msg, ms = 3000) => { setMessage(msg); setTimeout(() => setMessage(''), ms) }

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const token = await adminApi.getToken()
      const res = await fetch(`${apiUrl}/admin/xp-settings`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) { const d = await res.json(); setSettings(d); setEdited(d) }
    } catch (e) { showMsg(`Error: ${e.message}`, 5000) }
    finally { setLoading(false) }
  }

  const saveFields = async (fields) => {
    setSaving(true)
    try {
      const payload = {}
      fields.forEach(f => { if (edited[f] !== undefined) payload[f] = edited[f] })
      const token = await adminApi.getToken()
      const res = await fetch(`${apiUrl}/admin/xp-settings`, {
        method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.message || 'Failed') }
      const d = await res.json()
      setSettings(d.settings); setEdited(d.settings)
      showMsg('Settings saved')
      return true
    } catch (e) { showMsg(`Error: ${e.message}`, 5000); return false }
    finally { setSaving(false) }
  }

  const cancelEdit = () => { setEdited(settings); setXpEditing(false); setTierEditing(false); setLbEditing(false); setFlagEditing(false); setContactEditing(false) }
  const set = (k, v) => setEdited(prev => ({ ...prev, [k]: v }))
  const s = xpEditing || tierEditing || lbEditing || flagEditing || contactEditing ? edited : (settings || {})

  const handleReset = async () => {
    setActionLoading(true)
    try { await adminApi.manualReset('RESET'); showMsg('Weekly reset completed — all weekly XP set to 0'); setConfirmAction(null) }
    catch (e) { showMsg(`Error: ${e.message}`, 5000) }
    finally { setActionLoading(false) }
  }

  const handleExport = async () => {
    setActionLoading(true)
    try {
      const token = await adminApi.getToken()
      const res = await fetch(`${apiUrl}/admin/export-users`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob(); const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = `learnloop-users-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a); a.click()
      setTimeout(() => { URL.revokeObjectURL(url); document.body.removeChild(a) }, 100)
      showMsg('Export downloaded'); setConfirmAction(null)
    } catch (e) { showMsg(`Error: ${e.message}`, 5000) }
    finally { setActionLoading(false) }
  }

  if (loading) return <div className="p-8 text-site-muted">Loading settings...</div>

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-site-ink">Settings</h1>
        <p className="text-site-muted mt-1">Platform configuration and admin tools</p>
      </div>

      {message && (
        <div className={`mb-6 p-3 rounded-lg border text-sm ${message.startsWith('Error') ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>{message}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* XP & Rewards */}
        <SectionCard icon={Zap} iconBg="bg-purple-50" iconColor="text-purple-600" title="XP & Rewards" desc="How users earn XP from activities">
          <div className="space-y-2">
            <SettingRow label="Reflection XP" desc="XP earned per daily reflection">
              {xpEditing ? <NumInput value={s.reflectionXp} onChange={v => set('reflectionXp', v)} suffix="XP" max={1000} /> : <DisplayVal value={`${s.reflectionXp} XP`} />}
            </SettingRow>
            <SettingRow label="Practice XP rate" desc="XP earned per minute of practice">
              {xpEditing ? <NumInput value={s.practiceXpPerMinute} onChange={v => set('practiceXpPerMinute', v)} suffix="XP/min" max={100} /> : <DisplayVal value={`${s.practiceXpPerMinute} XP/min`} />}
            </SettingRow>
            <SettingRow label="5-day streak bonus" desc="Multiplier after 5 consecutive days">
              {xpEditing ? <NumInput value={s.streak5DayMultiplier} onChange={v => set('streak5DayMultiplier', v)} suffix="x" min={1} max={10} step={0.5} /> : <DisplayVal value={`${s.streak5DayMultiplier}x`} />}
            </SettingRow>
            <SettingRow label="7+ day streak bonus" desc="Multiplier after 7+ consecutive days">
              {xpEditing ? <NumInput value={s.streak7DayMultiplier} onChange={v => set('streak7DayMultiplier', v)} suffix="x" min={1} max={10} step={0.5} /> : <DisplayVal value={`${s.streak7DayMultiplier}x`} />}
            </SettingRow>
          </div>
          <EditButton editing={xpEditing} saving={saving}
            onEdit={() => { setEdited(settings); setXpEditing(true) }}
            onSave={async () => { if (await saveFields(['reflectionXp', 'practiceXpPerMinute', 'streak5DayMultiplier', 'streak7DayMultiplier'])) setXpEditing(false) }}
            onCancel={() => { cancelEdit(); setXpEditing(false) }} />
        </SectionCard>

        {/* League Tiers */}
        <SectionCard icon={Trophy} iconBg="bg-amber-50" iconColor="text-amber-600" title="League tiers" desc="Weekly XP thresholds for each league">
          <div className="space-y-2">
            <SettingRow label="🥇 Gold league" desc={`${s.goldThreshold}+ weekly XP`}>
              {tierEditing ? <NumInput value={s.goldThreshold} onChange={v => set('goldThreshold', v)} suffix="XP" /> : <DisplayVal value={`${s.goldThreshold} XP`} color="text-amber-700" />}
            </SettingRow>
            <SettingRow label="🥈 Silver league" desc={`${s.silverThreshold}–${(s.goldThreshold || 1) - 1} weekly XP`}>
              {tierEditing ? <NumInput value={s.silverThreshold} onChange={v => set('silverThreshold', v)} suffix="XP" /> : <DisplayVal value={`${s.silverThreshold} XP`} color="text-gray-600" />}
            </SettingRow>
            <SettingRow label="🥉 Bronze league" desc={`${s.bronzeThreshold}–${(s.silverThreshold || 1) - 1} weekly XP`}>
              {tierEditing ? <NumInput value={s.bronzeThreshold} onChange={v => set('bronzeThreshold', v)} suffix="XP" /> : <DisplayVal value={`${s.bronzeThreshold} XP`} color="text-orange-700" />}
            </SettingRow>
          </div>
          <p className="text-xs text-site-faint mt-3">Below {s.bronzeThreshold} XP = Newcomer. Must be Bronze &lt; Silver &lt; Gold.</p>
          <EditButton editing={tierEditing} saving={saving}
            onEdit={() => { setEdited(settings); setTierEditing(true) }}
            onSave={async () => { if (await saveFields(['bronzeThreshold', 'silverThreshold', 'goldThreshold'])) setTierEditing(false) }}
            onCancel={() => { cancelEdit(); setTierEditing(false) }} />
        </SectionCard>

        {/* Leaderboard */}
        <SectionCard icon={Database} iconBg="bg-blue-50" iconColor="text-blue-600" title="Leaderboard" desc="Weekly leaderboard configuration">
          <div className="space-y-2">
            <SettingRow label="Board size" desc="Number of users shown on leaderboard">
              {lbEditing ? <NumInput value={s.leaderboardSize || 10} onChange={v => set('leaderboardSize', v)} min={1} max={100} /> : <DisplayVal value={`Top ${s.leaderboardSize || 10}`} />}
            </SettingRow>
            <SettingRow label="Reset schedule" desc="When weekly XP resets to zero">
              <DisplayVal value="Sunday 00:00 UTC" />
            </SettingRow>
            <SettingRow label="Ranked by" desc="What determines leaderboard position">
              <DisplayVal value="Weekly XP" />
            </SettingRow>
            <SettingRow label="On reset" desc="What happens to XP each Sunday">
              <DisplayVal value="Weekly → 0, Total kept" />
            </SettingRow>
          </div>
          <EditButton editing={lbEditing} saving={saving}
            onEdit={() => { setEdited(settings); setLbEditing(true) }}
            onSave={async () => { if (await saveFields(['leaderboardSize'])) setLbEditing(false) }}
            onCancel={() => { cancelEdit(); setLbEditing(false) }} />
        </SectionCard>

        {/* Auto-flag Rules */}
        <SectionCard icon={Shield} iconBg="bg-amber-50" iconColor="text-amber-600" title="Auto-flag rules" desc="Thresholds that trigger admin alerts">
          <div className="space-y-2">
            <SettingRow label="Max sessions per day" desc="Flags users exceeding this in 24 hours">
              {flagEditing ? <NumInput value={s.maxSessionsPerDay || 20} onChange={v => set('maxSessionsPerDay', v)} min={1} max={1000} /> : <DisplayVal value={s.maxSessionsPerDay || 20} />}
            </SettingRow>
            <SettingRow label="Min session duration" desc="Sessions shorter than this get flagged">
              {flagEditing ? <NumInput value={s.minSessionDuration || 60} onChange={v => set('minSessionDuration', v)} suffix="s" min={1} max={3600} /> : <DisplayVal value={`${s.minSessionDuration || 60}s`} />}
            </SettingRow>
            <SettingRow label="Daily XP alert" desc="Flags users earning more than this in one day">
              {flagEditing ? <NumInput value={s.maxDailyXp || 500} onChange={v => set('maxDailyXp', v)} suffix="XP" min={1} max={100000} /> : <DisplayVal value={`${s.maxDailyXp || 500} XP`} />}
            </SettingRow>
          </div>
          <p className="text-xs text-site-faint mt-3">Flagged activity appears on the Alerts page. Duplicate reflection detection is always active.</p>
          <EditButton editing={flagEditing} saving={saving}
            onEdit={() => { setEdited(settings); setFlagEditing(true) }}
            onSave={async () => { if (await saveFields(['maxSessionsPerDay', 'minSessionDuration', 'maxDailyXp'])) setFlagEditing(false) }}
            onCancel={() => { cancelEdit(); setFlagEditing(false) }} />
        </SectionCard>

        {/* Contact Email */}
        <SectionCard icon={Mail} iconBg="bg-green-50" iconColor="text-green-600" title="Contact email" desc="Email shown on the public contact page and where messages are sent">
          <div className="space-y-2">
            <SettingRow label="Contact email" desc="Displayed on the contact page and receives form submissions">
              {contactEditing ? (
                <input type="email" value={s.contactEmail || ''} onChange={e => set('contactEmail', e.target.value)}
                  className="w-56 px-2 py-1 border border-site-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-site-accent/30"
                  placeholder="admin@example.com" />
              ) : (
                <DisplayVal value={s.contactEmail || 'weweebo@gmail.com'} />
              )}
            </SettingRow>
          </div>
          <EditButton editing={contactEditing} saving={saving}
            onEdit={() => { setEdited(settings); setContactEditing(true) }}
            onSave={async () => { if (await saveFields(['contactEmail'])) setContactEditing(false) }}
            onCancel={() => { cancelEdit(); setContactEditing(false) }} />
        </SectionCard>

        {/* Admin Tools — full width */}
        <div className="lg:col-span-2 bg-site-surface rounded-xl border border-red-200 p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 rounded-lg bg-red-50"><AlertCircle className="w-5 h-5 text-red-600" /></div>
            <div><h2 className="font-semibold text-red-600">Admin tools</h2><p className="text-xs text-site-faint">Destructive actions — use with caution</p></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <button onClick={() => setConfirmAction('reset')} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium">
                <RotateCcw className="w-4 h-4" /> Trigger weekly reset
              </button>
              <p className="text-xs text-site-faint mt-1.5 text-center">Sets all weekly XP to 0. Runs auto every Sunday.</p>
            </div>
            <div>
              <button onClick={() => setConfirmAction('export')} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-site-border text-site-ink rounded-lg hover:bg-site-bg transition-colors text-sm font-medium">
                <Download className="w-4 h-4" /> Export users (CSV)
              </button>
              <p className="text-xs text-site-faint mt-1.5 text-center">Downloads all user data as a CSV file.</p>
            </div>
          </div>
          <p className="text-xs text-site-faint mt-3">All actions are logged in the audit log.</p>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-site-surface rounded-xl border border-site-border p-6 max-w-sm w-full">
            <h3 className="font-semibold text-site-ink mb-2">Are you sure?</h3>
            <p className="text-sm text-site-muted mb-5">
              {confirmAction === 'reset' && 'This will set all users\' weekly XP to 0. Total XP is not affected.'}
              {confirmAction === 'export' && 'This will download a CSV with all user data.'}
            </p>
            <div className="flex gap-3">
              <button onClick={() => { setConfirmAction(null); setResetText('') }} className="flex-1 px-4 py-2.5 border border-site-border rounded-lg text-sm font-medium text-site-ink hover:bg-site-bg transition-colors">
                No
              </button>
              <button
                onClick={() => {
                  if (confirmAction === 'reset') handleReset()
                  else if (confirmAction === 'export') handleExport()
                }}
                disabled={actionLoading}
                className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors ${
                  confirmAction === 'export' ? 'bg-site-accent text-white hover:bg-site-accent-hover' : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                {actionLoading ? 'Processing...' : 'Yes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
