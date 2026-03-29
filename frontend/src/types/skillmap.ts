/** All possible states a node can be in (UI model). */
export type NodeState =
  | 'not_started'
  | 'in_progress'
  | 'completed'
  | 'locked'

/** The two special node types plus regular content nodes. */
export type NodeType = 'start' | 'content' | 'goal'

/** Mood options for session reflection. */
export type Mood = 'great' | 'good' | 'okay' | 'tough' | 'lost'

/** A skill map created by the user. */
export interface SkillMap {
  id: string
  title: string
  description?: string
  icon: string
  goal: string
  status: 'active' | 'completed'
  createdAt: string
  updatedAt: string
}

/** A single node on the skill map path. */
export interface SkillNode {
  id: string
  skillMapId: string
  title: string
  description?: string
  position: number
  state: NodeState
  type: NodeType
  sessionsCount: number
  lastPracticedAt?: string
}

/** One practice session on a node. */
export interface Session {
  id: string
  nodeId: string
  startedAt: string
  completedAt?: string
  durationSeconds?: number
  reflection?: {
    whatIPracticed: string
    blockers?: string
    mood: Mood
  }
}

/** What the full endpoint returns (normalized for the app). */
export interface SkillMapFull {
  skillMap: SkillMap
  nodes: SkillNode[]
  progress: {
    completed: number
    total: number
    percent: number
  }
}
