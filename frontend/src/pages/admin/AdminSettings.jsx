import { useState } from 'react'
import { AlertCircle, RotateCcw, Settings as SettingsIcon, X } from 'lucide-react'
import { adminApi } from '../../api/adminApi'

export default function AdminSettings() {
  const [confirmReset, setConfirmReset] = useState(false)
  const [resetConfirmation, setResetConfirmation] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
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

    setResetLoading(true)
    
    try {
      const response = await adminApi.manualReset('RESET')
      console.log('Reset API response:', response)
      
      setMessage('✅ Weekly reset completed successfully')
      setResetLoading(false)
      setConfirmReset(false)
      setResetConfirmation('')
      
      // Trigger a page refresh to update the leaderboard
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } catch (error) {
      console.error('Reset error details:', error)
      setResetLoading(false)
      setMessage(`❌ Error: ${error.message || 'Failed to trigger reset'}`)
      // Keep modal open on error so user can see the error and retry
    }
  }

  const handleExportUsers = async () => {
    try {
      setExportLoading(true)
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
      setExportLoading(false)
    }
  }

  return (
    <div className="p-6 lg:p-8 w-full">
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
              <button disabled className="w-full mt-4 px-4 py-2 border border-site-border rounded-lg text-site-muted bg-site-bg cursor-not-allowed opacity-50 transition-colors text-sm font-medium">
                Edit settings
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
              <button disabled className="w-full mt-4 px-4 py-2 border border-site-border rounded-lg text-site-muted bg-site-bg cursor-not-allowed opacity-50 transition-colors text-sm font-medium">
                Edit settings
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
                  onClick={handleExportUsers}
                  disabled={exportLoading}
                  className="w-full px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                >
                  {exportLoading ? 'Exporting...' : 'Export all user data (CSV)'}
                </button>
              </div>
              <p className="text-xs text-site-faint mt-4">All danger zone actions are logged in the audit log.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Manual Reset Confirmation */}
      {confirmReset && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-site-surface rounded-xl border border-site-border p-6 max-w-sm w-full mx-4">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 rounded-lg bg-red-50">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-site-ink">Trigger Manual Weekly Reset</h3>
                <p className="text-sm text-site-muted mt-1">This will reset all users' weekly XP to 0. Type 'RESET' below to confirm.</p>
              </div>
              <button onClick={() => setConfirmReset(false)} className="text-site-muted hover:text-site-ink">
                <X className="w-4 h-4" />
              </button>
            </div>

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
                disabled={resetLoading || resetConfirmation !== 'RESET'}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {resetLoading ? 'Processing...' : 'Confirm Reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
