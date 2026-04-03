import { useState } from 'react'
import { AlertCircle, RotateCcw, Zap, Settings as SettingsIcon } from 'lucide-react'
import { adminApi } from '../../api/adminApi'
import ConfirmAction from '../../components/admin/ConfirmAction'

export default function AdminSettings() {
  const [confirmReset, setConfirmReset] = useState(false)
  const [confirmRecalc, setConfirmRecalc] = useState(false)
  const [resetConfirmation, setResetConfirmation] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [leaderboardSettings, setLeaderboardSettings] = useState({
    resetDay: 'Monday 00:00 UTC',
    goldTierSize: 'Top 10',
    silverTierSize: 'Rank 11-30',
    bronzeTierSize: 'Rank 31-100',
    minXpForPromotion: '50 XP'
  })
  const [autoFlagSettings, setAutoFlagSettings] = useState({
    sessionsPerDay: '20',
    minSessionDuration: '60s',
    xpDayAlertThreshold: '500 XP',
    notifyAdminOn: 'Email + dashboard'
  })

  const handleManualReset = async () => {
    if (resetConfirmation !== 'RESET') {
      setMessage('Please type "RESET" to confirm')
      return
    }

    try {
      setLoading(true)
      await adminApi.manualReset('RESET')
      setMessage('✅ Weekly reset completed successfully')
      setResetConfirmation('')
      setConfirmReset(false)
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleRecalculateXp = async () => {
    try {
      setLoading(true)
      await adminApi.recalculateXp()
      setMessage('✅ XP recalculation completed successfully')
      setConfirmRecalc(false)
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleExportUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/admin/export-users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${await adminApi.getToken()}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to export data')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `learnloop-users-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      setMessage('✅ User data exported successfully')
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-site-ink">Admin Settings</h1>
        <p className="text-site-muted mt-1">System-wide admin actions and configurations</p>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg border ${message.includes('✅') ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
          {message}
        </div>
      )}

      <div className="space-y-6">
        {/* Leaderboard Settings */}
        <div className="bg-site-surface rounded-xl border border-site-border p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-blue-50">
              <SettingsIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-site-ink mb-4">Leaderboard settings</h3>
              <div className="space-y-3">
                {Object.entries(leaderboardSettings).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between p-3 bg-site-bg rounded-lg">
                    <span className="text-sm text-site-ink capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                    <span className="font-semibold text-site-accent">{value}</span>
                  </div>
                ))}
              </div>
              <button className="w-full mt-4 px-4 py-2 border border-site-border rounded-lg text-site-muted hover:bg-site-bg transition-colors text-sm font-medium">
                Edit settings →
              </button>
            </div>
          </div>
        </div>

        {/* Auto-flag Settings */}
        <div className="bg-site-surface rounded-xl border border-site-border p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-amber-50">
              <AlertCircle className="w-6 h-6 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-site-ink mb-4">Auto-flag settings</h3>
              <div className="space-y-3">
                {Object.entries(autoFlagSettings).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between p-3 bg-site-bg rounded-lg">
                    <span className="text-sm text-site-ink capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                    <span className="font-semibold text-site-accent">{value}</span>
                  </div>
                ))}
              </div>
              <button className="w-full mt-4 px-4 py-2 border border-site-border rounded-lg text-site-muted hover:bg-site-bg transition-colors text-sm font-medium">
                Edit settings →
              </button>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-site-surface rounded-xl border border-site-border p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-red-50">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-site-ink mb-4 text-red-600">Danger zone</h3>
              <div className="space-y-3">
                <button
                  onClick={() => setConfirmReset(true)}
                  className="w-full px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Manually trigger weekly reset
                </button>
                <button
                  onClick={() => setConfirmRecalc(true)}
                  className="w-full px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                >
                  <Zap className="w-4 h-4" />
                  Recalculate all XP from transactions
                </button>
                <button
                  onClick={handleExportUsers}
                  disabled={loading}
                  className="w-full px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                >
                  {loading ? 'Exporting...' : 'Export all user data (CSV)'}
                </button>
              </div>
              <p className="text-xs text-site-faint mt-4">All danger zone actions are logged in the audit log.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Manual Reset Confirmation */}
      <ConfirmAction
        isOpen={confirmReset}
        title="Trigger Manual Weekly Reset"
        message="This will reset all users' weekly XP to 0. Type 'RESET' below to confirm."
        confirmText="Reset"
        isDangerous
        onCancel={() => {
          setConfirmReset(false)
          setResetConfirmation('')
        }}
        loading={loading}
        onConfirm={() => {}}
      >
        {confirmReset && (
          <div className="mt-4 space-y-3">
            <input
              type="text"
              placeholder='Type "RESET" to confirm'
              value={resetConfirmation}
              onChange={(e) => setResetConfirmation(e.target.value)}
              className="w-full px-3 py-2 border border-site-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-site-accent"
            />
            <button
              onClick={handleManualReset}
              disabled={loading || resetConfirmation !== 'RESET'}
              className="w-full px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Processing...' : 'Confirm Reset'}
            </button>
          </div>
        )}
      </ConfirmAction>

      {/* Recalculate Confirmation */}
      <ConfirmAction
        isOpen={confirmRecalc}
        title="Recalculate All XP"
        message="This will recalculate total XP for all users from their transaction history. This may take a few moments."
        confirmText="Recalculate"
        isDangerous
        onConfirm={handleRecalculateXp}
        onCancel={() => setConfirmRecalc(false)}
        loading={loading}
      />
    </div>
  )
}
