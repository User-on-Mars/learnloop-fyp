import { useState, useEffect } from 'react'
import { AlertCircle, RotateCcw, Settings as SettingsIcon, X, Save } from 'lucide-react'
import { adminApi } from '../../api/adminApi'

export default function AdminSettings() {
  const [confirmReset, setConfirmReset] = useState(false)
  const [resetConfirmation, setResetConfirmation] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [xpSettings, setXpSettings] = useState({
    reflectionXp: 20,
    practiceXpPerMinute: 2,
    streak5DayMultiplier: 2,
    streak7DayMultiplier: 5
  })
  const [xpSettingsLoading, setXpSettingsLoading] = useState(true)
  const [xpSettingsEditing, setXpSettingsEditing] = useState(false)
  const [xpSettingsSaving, setXpSettingsSaving] = useState(false)
  const [editedXpSettings, setEditedXpSettings] = useState({})
  
  const [leaderboardSettings, setLeaderboardSettings] = useState({
    resetDay: 'Monday 00:00 UTC',
    goldTierSize: 'Top 10',
    silverTierSize: 'Rank 11-30',
    bronzeTierSize: 'Rank 31-100'
  })
  const [autoFlagSettings, setAutoFlagSettings] = useState({
    sessionsPerDay: '20',
    minSessionDuration: '60s',
    xpDayAlertThreshold: '500 XP',
    notifyAdminOn: 'Email + dashboard'
  })

  // Fetch XP settings on mount
  useEffect(() => {
    fetchXpSettings()
  }, [])

  const fetchXpSettings = async () => {
    try {
      setXpSettingsLoading(true)
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/admin/xp-settings`, {
        headers: {
          'Authorization': `Bearer ${await adminApi.getToken()}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setXpSettings(data)
        setEditedXpSettings(data)
      }
    } catch (error) {
      console.error('Failed to fetch XP settings:', error)
      setMessage('Error: Failed to load XP settings')
      setTimeout(() => setMessage(''), 5000)
    } finally {
      setXpSettingsLoading(false)
    }
  }

  const handleSaveXpSettings = async () => {
    try {
      setXpSettingsSaving(true)
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/admin/xp-settings`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${await adminApi.getToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editedXpSettings)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to update XP settings')
      }

      const data = await response.json()
      setXpSettings(data.settings)
      setEditedXpSettings(data.settings)
      setXpSettingsEditing(false)
      setMessage('XP settings updated successfully')
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      console.error('Failed to save XP settings:', error)
      setMessage(`Error: ${error.message}`)
      setTimeout(() => setMessage(''), 5000)
    } finally {
      setXpSettingsSaving(false)
    }
  }

  const handleManualReset = async () => {
    if (resetConfirmation !== 'RESET') {
      setMessage('Please type "RESET" to confirm')
      setTimeout(() => setMessage(''), 3000)
      return
    }

    setResetLoading(true)
    
    try {
      const response = await adminApi.manualReset('RESET')
      console.log('Reset API response:', response)
      
      setMessage('Weekly reset completed successfully')
      setResetLoading(false)
      setConfirmReset(false)
      setResetConfirmation('')
      
      // Auto-dismiss message after 3 seconds, then refresh
      setTimeout(() => {
        setMessage('')
        window.location.reload()
      }, 3000)
    } catch (error) {
      console.error('Reset error details:', error)
      setResetLoading(false)
      setMessage(`Error: ${error.message || 'Failed to trigger reset'}`)
      // Auto-dismiss error message after 5 seconds
      setTimeout(() => {
        setMessage('')
      }, 5000)
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
      
      // Wait for download to complete before showing success message
      setTimeout(() => {
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        setMessage('User data exported successfully')
        
        // Auto-dismiss message after 3 seconds
        setTimeout(() => {
          setMessage('')
        }, 3000)
      }, 100)
    } catch (error) {
      setMessage(`Error: ${error.message}`)
      // Auto-dismiss error message after 5 seconds
      setTimeout(() => {
        setMessage('')
      }, 5000)
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
        <div className={`mb-6 p-4 rounded-lg border ${message.toLowerCase().includes('error') ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
          {message}
        </div>
      )}

      <div className="space-y-6">
        {/* XP Settings */}
        <div className="bg-site-surface rounded-xl border border-site-border p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-purple-50">
              <SettingsIcon className="w-6 h-6 text-purple-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-site-ink mb-4">XP Reward Settings</h3>
              {xpSettingsLoading ? (
                <div className="text-site-muted">Loading...</div>
              ) : (
                <>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-site-bg rounded-lg">
                      <span className="text-sm text-site-ink">Daily Reflection XP</span>
                      {xpSettingsEditing ? (
                        <input
                          type="number"
                          min="0"
                          max="1000"
                          value={editedXpSettings.reflectionXp}
                          onChange={(e) => setEditedXpSettings({...editedXpSettings, reflectionXp: Number(e.target.value)})}
                          className="w-20 px-2 py-1 border border-site-border rounded text-sm"
                        />
                      ) : (
                        <span className="font-semibold text-site-accent">{xpSettings.reflectionXp} XP</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between p-3 bg-site-bg rounded-lg">
                      <span className="text-sm text-site-ink">Practice XP per Minute</span>
                      {xpSettingsEditing ? (
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={editedXpSettings.practiceXpPerMinute}
                          onChange={(e) => setEditedXpSettings({...editedXpSettings, practiceXpPerMinute: Number(e.target.value)})}
                          className="w-20 px-2 py-1 border border-site-border rounded text-sm"
                        />
                      ) : (
                        <span className="font-semibold text-site-accent">{xpSettings.practiceXpPerMinute} XP/min</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between p-3 bg-site-bg rounded-lg">
                      <span className="text-sm text-site-ink">5-Day Streak Multiplier</span>
                      {xpSettingsEditing ? (
                        <input
                          type="number"
                          min="1"
                          max="10"
                          step="0.1"
                          value={editedXpSettings.streak5DayMultiplier}
                          onChange={(e) => setEditedXpSettings({...editedXpSettings, streak5DayMultiplier: Number(e.target.value)})}
                          className="w-20 px-2 py-1 border border-site-border rounded text-sm"
                        />
                      ) : (
                        <span className="font-semibold text-site-accent">{xpSettings.streak5DayMultiplier}x</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between p-3 bg-site-bg rounded-lg">
                      <span className="text-sm text-site-ink">7+ Day Streak Multiplier</span>
                      {xpSettingsEditing ? (
                        <input
                          type="number"
                          min="1"
                          max="10"
                          step="0.1"
                          value={editedXpSettings.streak7DayMultiplier}
                          onChange={(e) => setEditedXpSettings({...editedXpSettings, streak7DayMultiplier: Number(e.target.value)})}
                          className="w-20 px-2 py-1 border border-site-border rounded text-sm"
                        />
                      ) : (
                        <span className="font-semibold text-site-accent">{xpSettings.streak7DayMultiplier}x</span>
                      )}
                    </div>
                  </div>
                  {xpSettingsEditing ? (
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={handleSaveXpSettings}
                        disabled={xpSettingsSaving}
                        className="flex-1 px-4 py-2 bg-site-accent text-white rounded-lg hover:bg-site-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium flex items-center justify-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        {xpSettingsSaving ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button
                        onClick={() => {
                          setXpSettingsEditing(false)
                          setEditedXpSettings(xpSettings)
                        }}
                        className="px-4 py-2 border border-site-border rounded-lg text-site-ink hover:bg-site-bg transition-colors text-sm font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setXpSettingsEditing(true)}
                      className="w-full mt-4 px-4 py-2 border border-site-border rounded-lg text-site-ink hover:bg-site-bg transition-colors text-sm font-medium"
                    >
                      Edit XP Settings
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
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
