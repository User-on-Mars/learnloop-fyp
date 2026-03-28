
# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Slow Loading Without Skeleton UI
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: For deterministic bugs, scope the property to the concrete failing case(s) to ensure reproducibility
  - Test implementation details from Bug Condition in design:
    - Navigate to skill map (action === 'navigate_to_skill_map')
    - No fresh in-memory cache available (cacheState.hasCache === false OR cacheState.isStale === true)
    - Skeleton not yet shown (currentUI.showsSkeleton === false)
  - The test assertions should match the Expected Behavior Properties from design:
    - Skeleton UI appears within 50ms of navigation
    - Skeleton shows exactly 5 placeholder node circles
    - Data fetches via GET /api/skills/:id/full
    - Skeleton fades out over 150ms when data arrives
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found to understand root cause:
    - Time to first skeleton frame > 50ms (likely N/A - no skeleton exists)
    - Generic spinner shown instead of skeleton
    - Sequential API calls instead of unified /full endpoint
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 2.1, 2.2_

- [ ] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Existing Functionality Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs:
    - Skill map CRUD operations (create, update, delete)
    - Node status transitions and progression logic
    - Permission checks and user ownership validation
    - Progress calculation (completed nodes / total nodes)
    - GET /api/skills/:id response format
  - Write property-based tests capturing observed behavior patterns from Preservation Requirements:
    - All skill map CRUD operations continue to work correctly
    - Node status transitions remain unchanged
    - Permission checks continue to function
    - Progress calculation remains accurate
    - GET /api/skills/:id returns identical responses
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [ ] 3. Fix for skill map loading performance

  - [ ] 3.1 Implement in-memory caching with stale-while-revalidate
    - Create module-level cache in frontend/src/context/SkillMapContext.jsx:
      - `const skillMapCache = new Map()` for data storage
      - `const fetchTokens = new Map()` for race condition protection
    - Implement cache helper functions:
      - `getCachedSkillMap(skillId)` - check Map, validate timestamp (< 60s), return data or null
      - `setCachedSkillMap(skillId, data)` - store with Date.now() timestamp
      - `invalidateSkillMapCache(skillId)` - delete from both skillMapCache and fetchTokens
      - `backgroundRefresh(skillId)` - fetch fresh data with race condition guard using fetch tokens
    - Update loadSkillNodes function:
      - Check cache first: if age < 60s, serve cache immediately and trigger backgroundRefresh()
      - If age ≥ 60s or no cache, fetch fresh data and populate cache
    - Implement race condition guard:
      - Use Symbol() token per fetch to detect superseded fetches
      - Store token in fetchTokens Map before fetch
      - After fetch completes, check if token still matches - if not, discard result
    - Add cache invalidation calls to all 8 write operations:
      - updateNodeStatus(), updateNodeContent(), deleteNode(), addNode()
      - startSession(), completeSession(), updateSkillMap(), deleteSkillMap()
    - _Bug_Condition: isBugCondition(input) where input.action === 'navigate_to_skill_map' AND (input.cacheState.hasCache === false OR input.cacheState.isStale === true)_
    - _Expected_Behavior: Cached data (< 60s) renders instantly (0ms perceived load). Background fetch updates cache silently. Race condition guard prevents stale overwrites._
    - _Preservation: Cache invalidation on write operations must work correctly (Requirement 3.5)_
    - _Requirements: 2.5, 3.5_

  - [ ] 3.2 Implement skeleton loading UI
    - Update frontend/src/components/ProgressionPath.jsx:
      - Replace generic spinner with skeleton when isLoading && !cachedData
      - Show cached data immediately when isLoading && cachedData (background refresh running)
    - Skeleton specification:
      - Always render exactly 5 placeholder node circles (count unknown before load)
      - Top bar: grey rectangle placeholders for icon (40×40px) and title (120×16px)
      - Progress bar: full-width grey rectangle, 7px height
      - Node circles: 48px diameter grey circles connected by grey connector lines
      - Active card placeholder: grey header block (56px height) + grey body block (80px height)
      - Animation: CSS opacity pulse 0.4 → 0.9 → 0.4, 1.4s infinite, ease-in-out
      - Wrap animation in @media (prefers-reduced-motion: no-preference)
      - Transition out: fade skeleton opacity over 150ms when data arrives (no abrupt swap)
    - _Bug_Condition: isBugCondition(input) where currentUI.showsSkeleton === false_
    - _Expected_Behavior: Skeleton renders instantly (<50ms) with exactly 5 placeholder circles. Fades out over 150ms when data arrives._
    - _Preservation: All UI display correctness must remain unchanged (Requirement 3.1, 3.2)_
    - _Requirements: 2.2_

  - [ ] 3.3 Add unified backend endpoint with session metadata
    - Add NEW endpoint in backend/src/routes/skills.js: GET /api/skills/:id/full
    - **CRITICAL**: Do NOT modify existing GET /api/skills/:id - backward compatibility required
    - Response shape:
      ```javascript
      {
        skill_map: { id, title, icon, description, goal, status },
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
          percent: N           // computed server-side, integer 0–100
        }
      }
      ```
    - Add new function in backend/src/services/NodeService.js: getSkillNodesFull(skillId)
    - Use MongoDB aggregation pipeline:
      - $match nodes by skillId
      - $lookup sessions collection
      - $group by nodeId to compute sessions_count ($sum) and last_practiced_at ($max of startTime)
      - $project fields including computed session data
    - Return nodes array with session fields included (no separate queries)
    - _Bug_Condition: isBugCondition(input) where sequential API calls are made instead of unified endpoint_
    - _Expected_Behavior: Single /full endpoint returns skill_map, nodes with sessions_count and last_practiced_at, and computed progress in one response_
    - _Preservation: GET /api/skills/:id must continue to return identical responses (Requirement 3.6)_
    - _Requirements: 2.1, 2.3, 2.4, 2.6, 3.6_

  - [ ] 3.4 Implement error handling with retry
    - Update frontend/src/context/SkillMapContext.jsx:
      - Add error state management in loadSkillNodes
      - On fetch failure, set error state with retry callback
    - Update frontend/src/components/ProgressionPath.jsx:
      - Display error state with "Try again" retry button when fetch fails
      - If stale cache exists (>60s), MAY show it with "last updated X minutes ago" label
      - SHALL NOT show stale data without this label
    - _Bug_Condition: isBugCondition(input) where fetch fails_
    - _Expected_Behavior: Error state displays with retry button. Stale cache only shown with clear timestamp label._
    - _Preservation: Permission checks must continue to function (Requirement 3.2)_
    - _Requirements: 2.7_

  - [ ] 3.5 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Fast Loading With Skeleton UI
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied:
      - Skeleton UI appears within 50ms of navigation
      - Skeleton shows exactly 5 placeholder node circles
      - Data fetches via GET /api/skills/:id/full
      - Skeleton fades out over 150ms when data arrives
      - Cached data (< 60s) renders instantly with background refresh
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.5_

  - [ ] 3.6 Verify preservation tests still pass
    - **Property 2: Preservation** - Existing Functionality Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2:
      - Skill map CRUD operations work correctly
      - Node status transitions unchanged
      - Permission checks function correctly
      - Progress calculation accurate
      - GET /api/skills/:id returns identical responses
      - Cache invalidation fires for all 8 write operations
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [ ] 4. Checkpoint - Ensure all tests pass
  - Run all tests from tasks 1, 2, and 3
  - Verify performance acceptance criteria:
    - Time to first skeleton frame < 50ms
    - Time to content (cold cache) < 300ms
    - Time to content (cache hit, <60s) < 10ms
    - Session data requests per node = 0 (included in /full)
    - Background fetch discarded on write = 100% of cases
  - Ensure all tests pass, ask the user if questions arise
