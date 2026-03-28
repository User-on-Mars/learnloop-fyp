import type { SkillMapFull } from '../types/skillmap'

interface CacheEntry {
  data: SkillMapFull
  cachedAt: number
}

const cache = new Map<string, CacheEntry>()
const fetchTokens = new Map<string, symbol>()

const CACHE_TTL_MS = 60 * 1000

/** Returns cached data if it exists and is still within the TTL window. */
export function getCached(userId: string, skillMapId: string): SkillMapFull | null {
  const key = `${userId}:${skillMapId}`
  const entry = cache.get(key)
  if (!entry) return null
  const age = Date.now() - entry.cachedAt
  if (age >= CACHE_TTL_MS) return null
  return entry.data
}

/** Stores a full map payload with the current timestamp. */
export function setCache(userId: string, skillMapId: string, data: SkillMapFull): void {
  const key = `${userId}:${skillMapId}`
  cache.set(key, { data, cachedAt: Date.now() })
}

/** Clears cache and drops any in-flight fetch token for this map. */
export function invalidateCache(userId: string, skillMapId: string): void {
  const key = `${userId}:${skillMapId}`
  cache.delete(key)
  fetchTokens.delete(key)
}

/** Creates a token used to ignore stale background responses after a write. */
export function createFetchToken(userId: string, skillMapId: string): symbol {
  const key = `${userId}:${skillMapId}`
  const token = Symbol()
  fetchTokens.set(key, token)
  return token
}

/** True when the token still matches the latest fetch for this map. */
export function isFetchTokenValid(userId: string, skillMapId: string, token: symbol): boolean {
  const key = `${userId}:${skillMapId}`
  return fetchTokens.get(key) === token
}
