Skill Map Loading Performance Bugfix Design
Overview
The skill map loading experience suffers from a performance bottleneck caused by sequential data fetching and lack of optimistic UI patterns. When a user navigates from the library to a skill map, the frontend makes sequential API calls and displays a blank screen during loading. Additionally, the backend lacks a unified endpoint for fetching all required data in one request, and there's no caching mechanism to avoid redundant fetches.
This bugfix implements parallel data fetching, skeleton loading UI, in-memory caching with stale-while-revalidate, backend endpoint consolidation, and race condition protection to dramatically improve perceived and actual load times.
Glossary

Bug_Condition (C): User navigates to a skill map — no fresh in-memory cache available, skeleton not yet shown
Property (P): Skill map data loads quickly with immediate skeleton UI feedback and parallel data fetching
Preservation: Existing functionality that must remain unchanged — all CRUD operations, data accuracy, permission checks, and UI display correctness
loadSkillNodes: The function in frontend/src/context/SkillMapContext.jsx that fetches skill and node data
GET /api/skills/:id: The existing backend endpoint in backend/src/routes/skills.js — do NOT modify, backward compatibility must be preserved
GET /api/skills/:id/full: NEW endpoint returning skill map, nodes with session metadata, and computed progress in one response
Sequential Loading: The pattern where data requests wait for previous requests to complete before starting
Skeleton UI: A placeholder loading state that shows the structure of content before data arrives
Stale-While-Revalidate: A caching strategy that serves cached data immediately while fetching fresh data in the background
In-Memory Cache: A module-level Map (not localStorage) storing skill map data keyed by userId + skillId
Race Condition: A background fetch completing after a write operation and overwriting fresh data with stale data

Bug Details
Bug Condition
The bug manifests when a user clicks on a skill map card in the library and navigates to the skill map detail view. The system currently makes API calls and displays a generic loading spinner with no structural feedback. While the backend endpoint is already optimized to fetch skill and nodes in parallel, the frontend doesn't provide immediate visual feedback, and there's no caching to avoid redundant fetches when users navigate back and forth.
Formal Specification:
FUNCTION isBugCondition(input)
  INPUT: input of type { action: string, skillId: string, cacheState: object }
  OUTPUT: boolean
  
  RETURN input.action === 'navigate_to_skill_map'
         AND input.skillId EXISTS
         AND (input.cacheState.hasCache === false OR input.cacheState.isStale === true)
         AND currentUI.showsSkeleton === false
END FUNCTION
Examples

Example 1 — Initial Load: User clicks skill card → sees blank screen with spinner for ~800ms → content appears

Before (broken): ~800ms blank screen, no structural feedback
After (fixed): Skeleton renders instantly (<50ms) → data loads → skeleton fades out over 150ms → real content appears


Example 2 — Back Navigation: User views skill map → navigates back to library → clicks same skill again

Before (broken): Waits another ~800ms. No caching benefit
After (fixed): Cached data (< 60s old) renders instantly (0ms perceived load). Background fetch updates cache silently


Example 3 — Session Data: User opens skill map, nodes render without session counts

Before (broken): Separate requests per node for session data
After (fixed): sessions_count and last_practiced_at are computed fields in /full response. No separate requests


Edge Case — Network Failure: Fetch fails

After (fixed): Error state with "Try again" button. If stale cache exists (>60s), it MAY be shown with a clearly visible "last updated X minutes ago" label. It SHALL NOT be shown without this label



Critical Changes from v1.0

⚠️ The previous design doc specified localStorage for caching and a conflicting two-tier TTL model. Both have been corrected below. Do not implement the v1.0 caching approach.

Change 1 — Cache Storage: In-Memory Map (NOT localStorage)
v1.0 specified localStorage. This is wrong for three reasons:

localStorage is synchronous and blocks the main thread on every read/write
With a 60s TTL, persistence across page reloads provides no benefit
Stale entries accumulate across sessions — a different user on the same device could be exposed to another user's cached data if logout doesn't clean up

Correct implementation:
javascript// Module-level cache — lives in memory, cleared on page reload
const skillMapCache = new Map();
// Cache key format: `skillmap:${userId}:${skillId}`
// Cache value: { data: { skillMap, nodes }, cachedAt: Date.now() }
Change 2 — Cache TTL: Simple 60s Hard Limit (NOT two-tier)
v1.0 introduced a two-tier model (fresh: <60s, stale: 60–300s, expired: >300s) that conflicts with the requirements doc and leaves the "stale" UX undefined.
Correct model (single tier):

Age < 60s → Serve from cache instantly. Trigger background re-fetch in parallel
Age ≥ 60s → Cache miss. Show skeleton, fetch fresh data, populate cache

Change 3 — Race Condition Guard (NEW — not in v1.0)
Scenario: user opens map (cache served, background fetch starts) → user completes a node (write + cache invalidation) → background fetch finishes and overwrites with stale data.
Required behavior: IF a write operation occurs while a background fetch is in-flight THEN the background fetch result SHALL be discarded. Do not update the cache or UI from a superseded fetch.
Implementation pattern:
javascript// Use a fetch token per skill map to detect superseded fetches
const fetchTokens = new Map(); // skillId → token

async function backgroundRefresh(skillId) {
  const token = Symbol();
  fetchTokens.set(skillId, token);
  const data = await fetchFull(skillId);
  if (fetchTokens.get(skillId) !== token) return; // superseded, discard
  updateCache(skillId, data);
}

function invalidateCache(skillId) {
  skillMapCache.delete(skillId);
  fetchTokens.delete(skillId); // cancels any in-flight background fetch
}
Expected Behavior
Preservation Requirements
Unchanged Behaviors:

All skill map CRUD operations (create, update, delete) must continue to work correctly
Node status transitions and progression logic must remain unchanged
Permission checks and user ownership validation must continue to function
Progress calculation (completed nodes / total nodes) must remain accurate
GET /api/skills/:id must continue to return identical responses — no existing callers should be affected
Cache invalidation on write operations must work correctly

Scope: All inputs that do NOT involve initial skill map loading should be completely unaffected by this fix.
Hypothesized Root Cause

Missing Skeleton UI: The frontend displays a generic spinner instead of a skeleton that shows the structure of the skill map
No In-Memory Caching: loadSkillNodes always fetches fresh data, even when the user navigates back to a recently viewed skill map
No Stale-While-Revalidate: When cached data exists, the system doesn't serve it immediately while fetching fresh data in the background
Missing Unified Backend Endpoint: The current GET /api/skills/:id does not include session metadata (sessions_count, last_practiced_at) in the node response

Correctness Properties
Property 1 — Fast Loading with Skeleton UI (Bug Condition)
For any navigation to a skill map where the bug condition holds, the fixed system SHALL immediately display a skeleton UI with exactly 5 placeholder node circles, fetch data via GET /api/skills/:id/full, and fade out the skeleton over 150ms when data arrives.
Measured as: performance.now() from navigation event to first skeleton frame rendered. Target: < 50ms.
Validates: Requirements 2.1, 2.2

Property 2 — Stale-While-Revalidate Caching (Bug Condition)
For any navigation where in-memory cached data exists and is less than 60 seconds old, the fixed system SHALL render the cached data instantly (0ms perceived load time) and fetch fresh data in the background to update the cache. IF a write operation occurs during the background fetch, the fetch result SHALL be discarded.
Validates: Requirement 2.5

Property 3 — Session Data Inclusion (Bug Condition)
For any skill map data fetch via the /full endpoint, the response SHALL include sessions_count and last_practiced_at as computed fields within each node object. No separate per-node session requests shall be made.
Validates: Requirements 2.3, 2.4

Property 4 — Error Handling (Bug Condition)
For any skill map data fetch that fails, the fixed system SHALL display an error state with a "Try again" retry button. If stale cache exists (>60s), it MAY be shown with a "last updated X minutes ago" label. It SHALL NOT be shown without this label.
Validates: Requirement 2.7

Property 5 — CRUD Operations Unchanged (Preservation)
For any write operation (see Cache Invalidation list below), the fixed system SHALL produce exactly the same behavior as the original system for the write itself, AND shall invalidate the in-memory cache for that skill map.
Validates: Requirements 3.1, 3.2, 3.3, 3.4

Property 6 — Backward Compatibility (Preservation)
GET /api/skills/:id SHALL continue to return identical responses to today. The new GET /api/skills/:id/full endpoint is additive only and does not modify any existing endpoint.
Validates: Requirement 3.6
Fix Implementation
Changes Required
File 1: frontend/src/context/SkillMapContext.jsx
Function: loadSkillNodes + new helper functions
Specific changes:

Replace localStorage with in-memory Map — module-level const skillMapCache = new Map() and const fetchTokens = new Map()
Add cache check in loadSkillNodes — if age < 60s, serve cache immediately and trigger backgroundRefresh(); if age ≥ 60s, fetch fresh
Implement race condition guard — fetch token pattern (see Change 3 above)
Add cache invalidation calls — call invalidateCache(skillId) in every write operation listed below

New helper functions:

getCachedSkillMap(skillId) — check Map, validate timestamp, return data or null
setCachedSkillMap(skillId, data) — store with Date.now() timestamp
invalidateSkillMapCache(skillId) — delete from skillMapCache AND fetchTokens
backgroundRefresh(skillId) — fetch fresh data with race condition guard


File 2: frontend/src/components/ProgressionPath.jsx
Function: Component render logic
Specific changes:

Replace generic spinner with skeleton — render when isLoading && !cachedData
Show cached data immediately — when isLoading && cachedData, render cached data (background refresh running)
Skeleton specification:

Always render exactly 5 placeholder node circles regardless of actual node count (count unknown before load)
Top bar: grey rectangle placeholders for icon (40×40px) and title (120×16px)
Progress bar: full-width grey rectangle, 7px height
Node circles: 48px diameter grey circles connected by grey connector lines
Active card placeholder: grey header block (56px height) + grey body block (80px height)
Animation: CSS opacity pulse 0.4 → 0.9 → 0.4, 1.4s infinite, ease-in-out, wrapped in @media (prefers-reduced-motion: no-preference)
Transition out: fade skeleton opacity over 150ms when data arrives. Do not abruptly swap.




File 3: backend/src/routes/skills.js
Add NEW endpoint: GET /api/skills/:id/full
Do NOT modify the existing GET /api/skills/:id — backward compatibility must be preserved for all existing callers.
Response shape:
javascript{
  skill_map: {
    id, title, icon, description, goal, status
  },
  nodes: [
    {
      id, title, position, state, type,
      sessions_count,      // computed server-side
      last_practiced_at    // computed server-side, null if no sessions
    }
  ],
  progress: {
    completed: N,
    total: N,
    percent: N             // computed server-side, integer 0–100
  }
}

File 4: backend/src/services/NodeService.js
Add new function: getSkillNodesFull(skillId)
Specific changes:

Use MongoDB aggregation pipeline instead of simple find query
Pipeline: match nodes by skillId → $lookup sessions → $group by nodeId → $project fields
Compute sessions_count using $sum in $group stage
Compute last_practiced_at using $max of startTime in $group stage
Return nodes array with session fields included — no separate queries


Cache Invalidation — Authoritative List
The following write operations MUST call invalidateSkillMapCache(skillId). This is the single authoritative list:

updateNodeStatus() — node state change
updateNodeContent() — node title or description edit
deleteNode() — node deletion
addNode() — new node added to map
startSession() — session created
completeSession() — session marked complete
updateSkillMap() — skill map title, description, goal, or icon edited
deleteSkillMap() — full map deletion (also remove from cache entirely)

Testing Strategy
Phase 1 — Confirm the Bug (Run on Unfixed Code First)
Run these tests BEFORE implementing the fix to establish baseline and confirm the bug exists.
T1.1 — Initial load time > 500ms: Navigate to skill map, measure time-to-content. Expected on unfixed code: >500ms with no visual feedback.
T1.2 — No skeleton present: Verify unfixed code shows generic spinner, not skeleton. Expected: no skeleton element in DOM during loading.
T1.3 — No caching benefit: Navigate to same map twice, compare load times. Expected: same load time both navigations — no caching benefit.
Phase 2 — Verify the Fix
T2.1 — Skeleton appears < 50ms: performance.now() from navigation click to first skeleton frame. Must be < 50ms.
T2.2 — Cache hit renders < 10ms: Navigate to same map within 60s. Verify in-memory cache hit, no network request fired, content renders in < 10ms.
T2.3 — Stale-while-revalidate: Serve cached data immediately. Verify background fetch fires. Verify cache updates on background fetch completion.
T2.4 — Race condition guard: Start a background fetch. Trigger a write operation + cache invalidation before fetch completes. Verify background fetch result is discarded and does not update cache or UI.
T2.5 — Session fields in /full response: Call GET /api/skills/:id/full. Assert each node object has sessions_count (integer ≥ 0) and last_practiced_at (timestamp or null).
T2.6 — Skeleton fade-out is 150ms: Measure CSS transition duration when data arrives. Must be 150ms, not an abrupt DOM swap.
T2.7 — Error state shows retry button: Mock fetch failure. Verify error UI renders with "Try again" button. Verify no stale data is shown without a "last updated X minutes ago" label.
Phase 3 — Preservation (Regression Prevention)
T3.1 — All 8 cache invalidations fire: Trigger each write operation from the authoritative list. Assert skillMapCache is empty for that skillId after each operation.
T3.2 — GET /api/skills/:id unchanged: Compare response before and after fix. Must be byte-identical. No existing callers affected.
T3.3 — Progress calculation unchanged: Property-based testing — generate random node sets, assert completed/total/percent matches pre-fix calculation for all inputs.
T3.4 — Write operations unchanged: Node status update, session create, node delete — assert same API calls, state updates, and side effects as original system.
T3.5 — Permission checks unchanged: Unauthorized skill map access still returns 403. Caching must not bypass authentication.
Unit Tests

Test getCachedSkillMap() returns null when cache is empty
Test getCachedSkillMap() returns data when age < 60s
Test getCachedSkillMap() returns null when age ≥ 60s
Test invalidateSkillMapCache() removes entry from both skillMapCache and fetchTokens
Test race condition guard: fetch token mismatch causes result to be discarded
Test skeleton always renders exactly 5 placeholder circles
Test fade-out animation timing is 150ms
Test MongoDB aggregation returns correct sessions_count and last_practiced_at

Property-Based Tests

Generate random cache timestamps, verify correct cache behavior across all age ranges
Generate random sequences of read/write operations, verify cache invalidation fires correctly in all cases
Generate random node sets (0–10 nodes), verify skeleton always shows exactly 5 placeholders regardless of count
Generate random write operation sequences, verify all 8 invalidation triggers work correctly

Performance Acceptance Criteria
MetricBeforeAfter (target)Time to first skeleton frameN/A (no skeleton)< 50msTime to content (cold cache)~800ms< 300msTime to content (cache hit, <60s)~800ms< 10msSession data requests per node1 separate request0 (included in /full)Background fetch discarded on writeN/A100% of cases