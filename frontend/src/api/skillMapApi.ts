import axios, { type AxiosInstance } from 'axios'
import type { Mood, Session, SkillMapFull, SkillNode, NodeState, NodeType } from '../types/skillmap'
import { auth } from '../firebase.js'

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

/** Builds an axios instance with Firebase auth header. */
function buildHttpClient(): AxiosInstance {
  const client = axios.create({
    baseURL,
    headers: { 'Content-Type': 'application/json' },
  })
  client.interceptors.request.use(async (config) => {
    const user = auth.currentUser
    if (user) {
      const token = await user.getIdToken()
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  })
  return client
}

const client = buildHttpClient()

/** Maps backend node status strings to UI NodeState. */
function mapStatus(status: string): NodeState {
  switch (status) {
    case 'Locked':
      return 'locked'
    case 'Unlocked':
      return 'not_started'
    case 'In_Progress':
      return 'in_progress'
    case 'Completed':
      return 'completed'
    default:
      return 'locked'
  }
}

/** Maps backend node flags to NodeType. */
function mapNodeType(isStart?: boolean, isGoal?: boolean): NodeType {
  if (isStart) return 'start'
  if (isGoal) return 'goal'
  return 'content'
}

/** Converts one API node document into SkillNode. */
function mapApiNode(raw: Record<string, unknown>, skillMapId: string): SkillNode {
  const order = typeof raw.order === 'number' ? raw.order : Number(raw.order)
  return {
    id: String(raw._id),
    skillMapId,
    title: String(raw.title ?? ''),
    description: raw.description ? String(raw.description) : undefined,
    position: Math.max(0, order - 1),
    state: mapStatus(String(raw.status)),
    type: mapNodeType(Boolean(raw.isStart), Boolean(raw.isGoal)),
    sessionsCount: typeof raw.sessions_count === 'number' ? raw.sessions_count : 0,
    lastPracticedAt: raw.last_practiced_at
      ? new Date(raw.last_practiced_at as string).toISOString()
      : undefined,
  }
}

/** Converts GET /skills/maps/:id/full JSON into SkillMapFull. */
function mapFullResponse(data: Record<string, unknown>): SkillMapFull {
  const sm = data.skill_map as Record<string, unknown>
  const skillMapId = String(sm.id)
  const nodesRaw = (data.nodes as Record<string, unknown>[]) ?? []
  const nodes = nodesRaw.map((n) => mapApiNode(n, skillMapId))

  const contentNodes = nodes.filter((n) => n.type === 'content')
  const completedContent = contentNodes.filter((n) => n.state === 'completed').length
  const totalContent = contentNodes.length
  const percent =
    totalContent === 0 ? 0 : Math.round((completedContent / totalContent) * 100)

  return {
    skillMap: {
      id: skillMapId,
      title: String(sm.title ?? ''),
      description: sm.description ? String(sm.description) : undefined,
      icon: String(sm.icon ?? '🗺️'),
      goal: String(sm.goal ?? ''),
      status: sm.status === 'completed' ? 'completed' : 'active',
      createdAt: sm.createdAt ? new Date(sm.createdAt as string).toISOString() : new Date().toISOString(),
      updatedAt: sm.updatedAt ? new Date(sm.updatedAt as string).toISOString() : new Date().toISOString(),
    },
    nodes,
    progress: {
      completed: completedContent,
      total: totalContent,
      percent,
    },
  }
}

/** Fetches normalized skill map + nodes + progress in one request. */
export async function fetchSkillMapFull(skillMapId: string): Promise<SkillMapFull> {
  const { data } = await client.get(`/skills/maps/${skillMapId}/full`)
  return mapFullResponse(data as Record<string, unknown>)
}

/** Maps UI mood to numeric scores expected by the backend reflection schema. */
function moodToScores(mood: Mood): { understanding: number; difficulty: number; completionConfidence: number } {
  const map: Record<Mood, number> = {
    great: 5,
    good: 4,
    okay: 3,
    tough: 2,
    lost: 1,
  }
  const u = map[mood] ?? 3
  return { understanding: u, difficulty: 3, completionConfidence: u }
}

/** Builds backend reflection payload from the simplified UI form. */
function buildBackendReflection(reflection: NonNullable<Session['reflection']>) {
  const scores = moodToScores(reflection.mood)
  const notes = [reflection.whatIPracticed, reflection.blockers].filter(Boolean).join('\n---\n').slice(0, 500)
  return {
    understanding: scores.understanding,
    difficulty: scores.difficulty,
    notes,
    completionConfidence: scores.completionConfidence,
    wouldRecommend: true,
    tags: [reflection.mood],
  }
}

/** Starts a practice session for a node (backend: POST /nodes/:id/sessions). */
export async function createSession(nodeId: string): Promise<Session> {
  const { data } = await client.post(`/nodes/${nodeId}/sessions`, {})
  const body = data as Record<string, unknown>
  return {
    id: String(body.sessionId),
    nodeId: String(body.nodeId ?? nodeId),
    startedAt: body.startTime ? new Date(body.startTime as string).toISOString() : new Date().toISOString(),
  }
}

/** Completes a session with reflection (backend: POST /sessions/:id/complete). */
export async function completeSession(
  sessionId: string,
  data: { durationSeconds: number; reflection?: Session['reflection'] }
): Promise<Session> {
  if (!data.reflection) {
    throw new Error('Reflection is required to complete a session on the server')
  }
  const { data: res } = await client.post(`/sessions/${sessionId}/complete`, {
    reflection: buildBackendReflection(data.reflection),
  })
  const body = res as Record<string, unknown>
  return {
    id: sessionId,
    nodeId: '',
    startedAt: '',
    completedAt: new Date().toISOString(),
    durationSeconds: typeof body.duration === 'number' ? body.duration : data.durationSeconds,
    reflection: data.reflection,
  }
}

/** Abandons an active session without reflection. */
export async function abandonSession(sessionId: string): Promise<void> {
  await client.post(`/sessions/${sessionId}/abandon`, {})
}

/** Marks a node completed and returns the refreshed map payload. */
export async function completeNode(nodeId: string, skillMapId: string): Promise<SkillMapFull> {
  await client.patch(`/nodes/${nodeId}/status`, { status: 'Completed' })
  return fetchSkillMapFull(skillMapId)
}

/** Loads session rows for one node (lazy). */
export async function fetchNodeSessions(nodeId: string): Promise<Session[]> {
  const { data } = await client.get(`/sessions/history/${nodeId}`)
  const body = data as { sessions?: Record<string, unknown>[] }
  const rows = body.sessions ?? []
  return rows.map((s) => mapHistoryRowToSession(s, nodeId))
}

/** Converts a row from session history API into Session. */
function mapHistoryRowToSession(row: Record<string, unknown>, nodeId: string): Session {
  const ref = row.reflection as Record<string, unknown> | undefined
  let reflection: Session['reflection'] | undefined
  if (ref) {
    const tags = (ref.tags as string[]) || []
    const mood = (tags[0] as Mood) || 'okay'
    reflection = {
      mood,
      whatIPracticed: String(ref.notes ?? ''),
      blockers: undefined,
    }
  }
  return {
    id: String(row.sessionId),
    nodeId,
    startedAt: row.startTime ? new Date(row.startTime as string).toISOString() : '',
    completedAt: row.endTime ? new Date(row.endTime as string).toISOString() : undefined,
    durationSeconds: typeof row.duration === 'number' ? row.duration : undefined,
    reflection,
  }
}

/** Updates node title or description (backend: PATCH /nodes/:id/content). */
export async function updateNode(
  nodeId: string,
  data: { title?: string; description?: string }
): Promise<SkillNode> {
  const { data: res } = await client.patch(`/nodes/${nodeId}/content`, data)
  const body = res as { node: Record<string, unknown> }
  const skillMapId = String(body.node.skillId ?? body.node.skillMapId ?? '')
  return mapApiNode(body.node, skillMapId)
}

/** Deletes a node. */
export async function deleteNode(nodeId: string): Promise<void> {
  await client.delete(`/nodes/${nodeId}`)
}

/** Adds a node — not supported by current API; reserved for future use. */
export async function addNode(_skillMapId: string, _title: string): Promise<SkillNode> {
  throw new Error('Adding nodes from the map is not available yet.')
}
