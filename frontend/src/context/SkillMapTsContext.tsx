import React, { createContext, useContext, useReducer, useCallback, useRef } from 'react'
import type { Session, SkillMapFull } from '../types/skillmap'
import * as api from '../api/skillMapApi'
import * as cache from '../cache/skillMapCache'

interface SkillMapTsState {
  skillMap: SkillMapFull['skillMap'] | null
  nodes: SkillMapFull['nodes']
  currentNodeSessions: Session[]
  progress: SkillMapFull['progress']
  isLoading: boolean
  isBackgroundRefreshing: boolean
  error: string | null
}

const initialState: SkillMapTsState = {
  skillMap: null,
  nodes: [],
  currentNodeSessions: [],
  progress: { completed: 0, total: 0, percent: 0 },
  isLoading: false,
  isBackgroundRefreshing: false,
  error: null,
}

type Action =
  | { type: 'LOADING_START' }
  | { type: 'LOAD_SUCCESS'; payload: SkillMapFull }
  | { type: 'LOAD_ERROR'; payload: string }
  | { type: 'BACKGROUND_REFRESH_START' }
  | { type: 'APPLY_FULL'; payload: SkillMapFull }
  | { type: 'BACKGROUND_REFRESH_DONE'; payload: SkillMapFull }
  | { type: 'NODE_SESSIONS_LOADED'; payload: Session[] }
  | { type: 'SESSION_COMPLETED'; payload: Session }
  | { type: 'CLEAR_ERROR' }
  | { type: 'CLEAR_NODE_SESSIONS' }

/** Applies server payloads to React state without side effects. */
function reducer(state: SkillMapTsState, action: Action): SkillMapTsState {
  switch (action.type) {
    case 'LOADING_START':
      return { ...state, isLoading: true, error: null }

    case 'LOAD_SUCCESS':
      return {
        ...state,
        isLoading: false,
        skillMap: action.payload.skillMap,
        nodes: action.payload.nodes,
        progress: action.payload.progress,
        error: null,
      }

    case 'LOAD_ERROR':
      return { ...state, isLoading: false, error: action.payload }

    case 'BACKGROUND_REFRESH_START':
      return { ...state, isBackgroundRefreshing: true }

    case 'APPLY_FULL':
    case 'BACKGROUND_REFRESH_DONE':
      return {
        ...state,
        isBackgroundRefreshing: false,
        skillMap: action.payload.skillMap,
        nodes: action.payload.nodes,
        progress: action.payload.progress,
      }

    case 'NODE_SESSIONS_LOADED':
      return { ...state, currentNodeSessions: action.payload }

    case 'SESSION_COMPLETED':
      return {
        ...state,
        currentNodeSessions: state.currentNodeSessions.map((s) =>
          s.id === action.payload.id ? action.payload : s
        ),
      }

    case 'CLEAR_ERROR':
      return { ...state, error: null }

    case 'CLEAR_NODE_SESSIONS':
      return { ...state, currentNodeSessions: [] }

    default:
      return state
  }
}

interface SkillMapTsContextValue {
  state: SkillMapTsState
  loadMap: (skillMapId: string, userId: string) => Promise<void>
  loadNodeSessions: (nodeId: string) => Promise<void>
  clearNodeSessions: () => void
  startSession: (nodeId: string) => Promise<Session>
  endSession: (
    sessionId: string,
    durationSeconds: number,
    reflection?: Session['reflection']
  ) => Promise<void>
  abandonActiveSession: (sessionId: string) => Promise<void>
  markNodeComplete: (nodeId: string) => Promise<SkillMapFull>
  deleteNodeById: (nodeId: string) => Promise<void>
  updateNodeContent: (nodeId: string, data: { title?: string; description?: string }) => Promise<void>
}

const SkillMapTsContext = createContext<SkillMapTsContextValue | null>(null)

/** Wraps every gamified map route so screens share one reducer-driven store. */
export function SkillMapTsProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const userIdRef = useRef<string | null>(null)
  /** Dedupes StrictMode double mount so we only create one session per node at a time. */
  const startSessionInFlightRef = useRef<Map<string, Promise<Session>>>(new Map())

  /** Pulls the latest full map from the API and writes cache + state. */
  const applyFreshFull = useCallback(async (skillMapId: string) => {
    const userId = userIdRef.current
    if (!userId) return
    const fresh = await api.fetchSkillMapFull(skillMapId)
    cache.setCache(userId, skillMapId, fresh)
    dispatch({ type: 'APPLY_FULL', payload: fresh })
  }, [])

  const loadMap = useCallback(async (skillMapId: string, userId: string) => {
    userIdRef.current = userId
    const cachedData = cache.getCached(userId, skillMapId)

    if (cachedData) {
      dispatch({ type: 'LOAD_SUCCESS', payload: cachedData })
      dispatch({ type: 'BACKGROUND_REFRESH_START' })
      const token = cache.createFetchToken(userId, skillMapId)
      try {
        const freshData = await api.fetchSkillMapFull(skillMapId)
        if (cache.isFetchTokenValid(userId, skillMapId, token)) {
          cache.setCache(userId, skillMapId, freshData)
          dispatch({ type: 'BACKGROUND_REFRESH_DONE', payload: freshData })
        }
      } catch {
        /* keep cached UI */
      }
      return
    }

    dispatch({ type: 'LOADING_START' })
    try {
      const data = await api.fetchSkillMapFull(skillMapId)
      cache.setCache(userId, skillMapId, data)
      dispatch({ type: 'LOAD_SUCCESS', payload: data })
    } catch {
      dispatch({
        type: 'LOAD_ERROR',
        payload: 'Failed to load skill map. Please try again.',
      })
    }
  }, [])

  const loadNodeSessions = useCallback(async (nodeId: string) => {
    try {
      const sessions = await api.fetchNodeSessions(nodeId)
      dispatch({ type: 'NODE_SESSIONS_LOADED', payload: sessions })
    } catch {
      dispatch({ type: 'NODE_SESSIONS_LOADED', payload: [] })
    }
  }, [])

  const clearNodeSessions = useCallback(() => {
    dispatch({ type: 'CLEAR_NODE_SESSIONS' })
  }, [])

  const startSession = useCallback(
    async (nodeId: string) => {
      const userId = userIdRef.current
      const mapId = state.skillMap?.id
      if (!userId || !mapId) throw new Error('Map not ready')
      const existing = startSessionInFlightRef.current.get(nodeId)
      if (existing) return existing

      const promise = (async () => {
        cache.invalidateCache(userId, mapId)
        const session = await api.createSession(nodeId)
        await applyFreshFull(mapId)
        return session
      })()
      startSessionInFlightRef.current.set(nodeId, promise)
      try {
        return await promise
      } finally {
        startSessionInFlightRef.current.delete(nodeId)
      }
    },
    [applyFreshFull, state.skillMap?.id]
  )

  const endSession = useCallback(
    async (sessionId: string, durationSeconds: number, reflection?: Session['reflection']) => {
      const userId = userIdRef.current
      const mapId = state.skillMap?.id
      if (!userId || !mapId) return
      cache.invalidateCache(userId, mapId)
      if (reflection) {
        const updated = await api.completeSession(sessionId, { durationSeconds, reflection })
        dispatch({ type: 'SESSION_COMPLETED', payload: updated })
      }
      await applyFreshFull(mapId)
    },
    [applyFreshFull, state.skillMap?.id]
  )

  const abandonActiveSession = useCallback(
    async (sessionId: string) => {
      const userId = userIdRef.current
      const mapId = state.skillMap?.id
      if (!userId || !mapId) return
      cache.invalidateCache(userId, mapId)
      await api.abandonSession(sessionId)
      await applyFreshFull(mapId)
    },
    [applyFreshFull, state.skillMap?.id]
  )

  const markNodeComplete = useCallback(
    async (nodeId: string) => {
      const userId = userIdRef.current
      const mapId = state.skillMap?.id
      if (!userId || !mapId) throw new Error('Map not ready')
      cache.invalidateCache(userId, mapId)
      const full = await api.completeNode(nodeId, mapId)
      cache.setCache(userId, mapId, full)
      dispatch({ type: 'APPLY_FULL', payload: full })
      return full
    },
    [state.skillMap?.id]
  )

  const deleteNodeById = useCallback(
    async (nodeId: string) => {
      const userId = userIdRef.current
      const mapId = state.skillMap?.id
      if (!userId || !mapId) return
      cache.invalidateCache(userId, mapId)
      await api.deleteNode(nodeId)
      await applyFreshFull(mapId)
    },
    [applyFreshFull, state.skillMap?.id]
  )

  const updateNodeContent = useCallback(
    async (nodeId: string, data: { title?: string; description?: string }) => {
      const userId = userIdRef.current
      const mapId = state.skillMap?.id
      if (!userId || !mapId) return
      cache.invalidateCache(userId, mapId)
      await api.updateNode(nodeId, data)
      await applyFreshFull(mapId)
    },
    [applyFreshFull, state.skillMap?.id]
  )

  const value: SkillMapTsContextValue = {
    state,
    loadMap,
    loadNodeSessions,
    clearNodeSessions,
    startSession,
    endSession,
    abandonActiveSession,
    markNodeComplete,
    deleteNodeById,
    updateNodeContent,
  }

  return <SkillMapTsContext.Provider value={value}>{children}</SkillMapTsContext.Provider>
}

/** Typed access to the gamified skill map store. */
export function useSkillMapTs() {
  const ctx = useContext(SkillMapTsContext)
  if (!ctx) {
    throw new Error('useSkillMapTs must be used inside SkillMapTsProvider')
  }
  return ctx
}
