import { Outlet, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useActiveSessions } from '../context/ActiveSessionContext'
import { useAuth } from '../useAuth'
import AdminSidebar from '../components/admin/AdminSidebar'
import AdminHeader from '../components/admin/AdminHeader'
import PageTransition from '../components/admin/PageTransition'

export default function AdminLayout() {
  const navigate = useNavigate()
  const [showBackConfirm, setShowBackConfirm] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  const user = useAuth()
  const adminName = user?.displayName || user?.email || 'Admin'

  const { activeSessions, toggleSession } = useActiveSessions()
  const hasActiveSessions = activeSessions.length > 0
  const runningSessions = activeSessions.filter(s => s.isRunning)

  const handleBackClick = () => {
    setShowBackConfirm(true)
  }

  const performBackToApp = () => {
    // Pause all running sessions
    runningSessions.forEach(session => {
      toggleSession(session.id)
    })
    setShowBackConfirm(false)
    navigate('/dashboard')
  }

  return (
    <div className="flex min-h-screen bg-site-bg">
      {/* Admin Sidebar */}
      <AdminSidebar
        isCollapsed={isCollapsed}
        onToggle={() => setIsCollapsed(prev => !prev)}
        isMobileOpen={isMobileOpen}
        onMobileClose={() => setIsMobileOpen(false)}
        onBackClick={handleBackClick}
      />

      {/* Main Content — flex-1 fills remaining space next to the sticky sidebar */}
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-200 ease-in-out">
        {/* Admin Header */}
        <AdminHeader
          onMenuToggle={() => setIsMobileOpen(prev => !prev)}
          adminName={adminName}
        />

        <main className="flex-1 overflow-y-auto">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </main>
      </div>

      {/* Back to App Confirmation Modal */}
      {showBackConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-site-surface rounded-2xl shadow-xl w-full max-w-sm p-6 border border-site-border">
            <div className="flex flex-col items-center text-center">
              {hasActiveSessions ? (
                <>
                  <svg className="w-12 h-12 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <h3 className="text-lg font-bold text-site-ink mt-4 mb-2">
                    Return to App?
                  </h3>
                  <p className="text-site-muted text-sm mb-4">
                    You have {activeSessions.length} active session{activeSessions.length > 1 ? 's' : ''}
                    {runningSessions.length > 0 && (
                      <span className="text-amber-600 font-medium">
                        {' '}({runningSessions.length} currently running)
                      </span>
                    )}. 
                    All running sessions will be paused.
                  </p>
                  
                  {/* Session Preview */}
                  <div className="w-full bg-site-bg rounded-lg p-3 mb-4 max-h-32 overflow-y-auto border border-site-border">
                    {activeSessions.slice(0, 3).map(session => (
                      <div key={session.id} className="flex items-center justify-between py-1 text-sm">
                        <span className="text-site-ink truncate">{session.skillName}</span>
                        <span className={`font-mono ${session.isRunning ? 'text-green-600' : 'text-gray-500'}`}>
                          {Math.floor(session.timer / 60)}m
                        </span>
                      </div>
                    ))}
                    {activeSessions.length > 3 && (
                      <p className="text-xs text-site-faint mt-1">+{activeSessions.length - 3} more</p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <svg className="w-12 h-12 text-site-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  <h3 className="text-lg font-bold text-site-ink mt-4 mb-2">
                    Return to App?
                  </h3>
                </>
              )}

              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setShowBackConfirm(false)}
                  className="flex-1 py-2.5 border border-site-border text-site-muted rounded-lg font-medium hover:bg-site-bg transition-colors"
                >
                  No
                </button>
                <button
                  onClick={performBackToApp}
                  className="flex-1 py-2.5 bg-site-accent text-white rounded-lg font-medium hover:bg-site-accent-hover transition-colors"
                >
                  Yes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
