# Timer Persistence Implementation

## Overview
The practice timer now persists across browser restarts and PC restarts by saving session state to both the backend database and browser localStorage.

## How It Works

### 1. **Browser Close/Restart (Same Session)**
- When you close the browser or tab, the timer state is saved to localStorage
- When you reopen the browser, the timer resumes from exactly where it stopped
- The timer is **paused** on reload - you must manually click "Start" to resume

### 2. **PC Restart (Persistent Storage)**
- Active sessions are saved to the MongoDB database on the backend
- When you restart your PC and reopen the app, sessions are loaded from the database
- Timer values are preserved exactly as they were
- All sessions are paused on load - you can resume them manually

## Architecture

### Backend Changes

#### New Model: `ActiveSession` (`backend/src/models/ActiveSession.js`)
Stores active practice sessions with:
- `userId` - User identifier
- `skillName` - Name of the skill being practiced
- `tags` - Array of tags
- `notes` - Session notes
- `timer` - Current timer value (in seconds)
- `targetTime` - Target time for countdown (in seconds)
- `isCountdown` - Boolean for countdown vs stopwatch mode
- `isRunning` - Whether timer is currently running
- `startedAt` - When session was created
- `lastUpdated` - Last sync timestamp

#### New Routes: `backend/src/routes/activeSessions.js`
API endpoints for managing active sessions:
- `GET /api/active-sessions` - Get all active sessions for user
- `POST /api/active-sessions` - Create new active session
- `PUT /api/active-sessions/:id` - Update active session
- `DELETE /api/active-sessions/:id` - Delete specific session
- `DELETE /api/active-sessions` - Delete all sessions for user

### Frontend Changes

#### Updated Context: `frontend/src/context/ActiveSessionContext.jsx`
Enhanced with backend synchronization:
- Loads sessions from backend on app startup
- Falls back to localStorage if backend is unavailable
- Syncs session changes to backend in real-time
- Saves sessions to backend when browser closes
- Pauses all timers on reload (no automatic resume)

#### Updated API Service: `frontend/src/services/api.js`
New `activeSessionAPI` object with methods:
- `getSessions()` - Fetch all active sessions
- `createSession(data)` - Create new session
- `updateSession(id, data)` - Update session
- `deleteSession(id)` - Delete session
- `deleteAllSessions()` - Clear all sessions

## Data Flow

### Creating a Session
1. User creates session in LogPractice component
2. Session is added to local state
3. API call creates session in database
4. MongoDB `_id` is synced back to local state
5. Session is saved to localStorage

### Resuming After Browser Close
1. App loads
2. Context fetches sessions from backend database
3. Sessions are restored with `isRunning: false`
4. User can click "Start" to resume timer from saved value
5. Timer continues from exact point where it stopped

### Resuming After PC Restart
1. PC restarts, user opens app
2. Firebase authentication happens
3. Context loads sessions from backend database
4. Sessions are restored with exact timer values
5. User can resume from saved state

## Key Features

✅ **Survives Browser Close** - Timer pauses and resumes from same point
✅ **Survives PC Restart** - Sessions stored in database
✅ **Offline Support** - Falls back to localStorage if backend unavailable
✅ **Manual Resume** - Timers are paused on load, user controls when to resume
✅ **Real-time Sync** - Changes synced to backend immediately
✅ **Logout Clears Sessions** - All sessions deleted when user logs out

## Usage

### For Users
1. Start a practice session - timer begins
2. Close browser/restart PC - timer stops at current value
3. Reopen app - session is restored with timer paused
4. Click "Start" to resume timer from where it stopped

### For Developers
The context provides these methods:
```javascript
const {
  activeSessions,      // Array of active sessions
  addSession,          // Create new session
  removeSession,       // Delete session
  toggleSession,       // Pause/resume timer
  resetSession,        // Reset timer to initial value
  updateSession,       // Update session properties
  isLoading,          // Loading state
  syncError           // Any sync errors
} = useActiveSessions();
```

## Error Handling
- If backend is unavailable, sessions fall back to localStorage
- Sync errors are logged but don't break the app
- Sessions continue to work locally even if backend sync fails
- On next successful connection, sessions are synced to backend

## Database Cleanup
Sessions are automatically deleted when:
- User manually deletes a session
- User completes and logs a session
- User logs out (all sessions cleared)
- User manually clears all sessions

## Future Enhancements
- Sync timer updates every 30 seconds instead of on every change
- Add session history/archive
- Implement session sharing between devices
- Add automatic session recovery on network reconnect
