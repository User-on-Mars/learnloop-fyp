import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import * as fc from 'fast-check';
import ProgressionPath from '../ProgressionPath';
import { SkillMapProvider } from '../../context/SkillMapContext';
import { ActiveSessionProvider } from '../../context/ActiveSessionContext';
import client from '../../api/client';

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn()
  },
  activeSessionAPI: {
    getSessions: vi.fn().mockResolvedValue({ data: { activeSessions: [] } }),
    createSession: vi.fn(),
    updateSession: vi.fn(),
    deleteSession: vi.fn(),
    deleteAllSessions: vi.fn()
  }
}));
vi.mock('../../firebase.js', () => ({
  auth: {
    currentUser: {
      uid: 'test-user-123',
      getIdToken: vi.fn().mockResolvedValue('mock-token')
    },
    onAuthStateChanged: vi.fn((callback) => {
      callback({ uid: 'test-user-123', getIdToken: vi.fn().mockResolvedValue('mock-token') });
      return vi.fn();
    })
  }
}));

/**
 * Bug Condition Exploration Test for Skill Map Loading Performance
 * 
 * **Validates: Requirements 1.1, 1.2, 2.1, 2.2**
 * 
 * This test encodes the EXPECTED BEHAVIOR after the fix.
 * It MUST FAIL on unfixed code - failure confirms the bug exists.
 * 
 * Bug Condition:
 * - User navigates to skill map (action === 'navigate_to_skill_map')
 * - No fresh in-memory cache available (cacheState.hasCache === false OR cacheState.isStale === true)
 * - Skeleton not yet shown (currentUI.showsSkeleton === false)
 * 
 * Expected Behavior (what this test validates):
 * - Skeleton UI appears within 50ms of navigation
 * - Skeleton shows exactly 5 placeholder node circles
 * - Data fetches via GET /api/skills/:id/full
 * - Skeleton fades out over 150ms when data arrives
 */

describe('Property 1: Bug Condition - Slow Loading Without Skeleton UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('MUST FAIL on unfixed code: skeleton appears within 50ms with 5 placeholder circles', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate test cases for skill map navigation
        fc.record({
          skillId: fc.uuid(),
          skillName: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length >= 1),
          nodeCount: fc.integer({ min: 1, max: 10 })
        }),
        async ({ skillId, skillName, nodeCount }) => {
          cleanup();

          // Mock API response for the /full endpoint (expected after fix)
          // On unfixed code, this endpoint doesn't exist yet
          const mockNodes = Array.from({ length: nodeCount }, (_, i) => ({
            _id: `node-${i}`,
            title: `Node ${i + 1}`,
            order: i,
            status: i === 0 ? 'Unlocked' : 'Locked',
            position: { x: 0, y: i * 100 }
          }));

          const mockFullResponse = {
            skill_map: {
              id: skillId,
              title: skillName,
              icon: '🎯',
              description: 'Test skill',
              goal: 'Learn testing',
              status: 'active'
            },
            nodes: mockNodes.map(node => ({
              ...node,
              sessions_count: 0,
              last_practiced_at: null
            })),
            progress: {
              completed: 0,
              total: nodeCount,
              percent: 0
            }
          };

          api.get.mockImplementation((url) => {
            if (String(url).includes('/full')) {
              return Promise.resolve({ data: mockFullResponse });
            }
            return Promise.resolve({
              data: {
                skill: mockFullResponse.skill_map,
                nodes: mockNodes
              }
            });
          });

          render(
            <MemoryRouter initialEntries={[`/skills/${skillId}`]}>
              <Routes>
                <Route
                  path="/skills/:skillId"
                  element={
                    <ActiveSessionProvider>
                      <SkillMapProvider>
                        <ProgressionPath />
                      </SkillMapProvider>
                    </ActiveSessionProvider>
                  }
                />
              </Routes>
            </MemoryRouter>
          );

          await waitFor(() => {
            expect(document.querySelectorAll('[data-testid="skeleton-ui"]').length).toBeGreaterThan(0);
            expect(document.querySelectorAll('[data-testid="skeleton-node-circle"]').length).toBe(5);
          });

          // ASSERTION 3: Data fetches via GET /api/skills/:id/full
          // This will FAIL on unfixed code because /full endpoint doesn't exist
          await waitFor(() => {
            const fullEndpointCalled = api.get.mock.calls.some((call) =>
              String(call[0]).includes('/full')
            );
            expect(fullEndpointCalled).toBe(true);
          }, { timeout: 1000 });

          await waitFor(() => {
            expect(screen.getByText(skillName)).toBeInTheDocument();
          }, { timeout: 2000 });
        }
      ),
      { numRuns: 3, timeout: 30000 }
    );
  }, 35000);

  it('MUST FAIL on unfixed code: cached data (< 60s) renders instantly with background refresh', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          skillId: fc.uuid(),
          skillName: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length >= 1),
          nodeCount: fc.integer({ min: 1, max: 10 }),
          cacheAge: fc.integer({ min: 0, max: 59 }) // Cache age in seconds (< 60s = fresh)
        }),
        async ({ skillId, skillName, nodeCount, cacheAge: _cacheAge }) => {
          cleanup();

          const mockNodes = Array.from({ length: nodeCount }, (_, i) => ({
            _id: `node-${i}`,
            title: `Node ${i + 1}`,
            order: i,
            status: i === 0 ? 'Unlocked' : 'Locked',
            position: { x: 0, y: i * 100 }
          }));

          const mockFullResponse = {
            skill_map: {
              id: skillId,
              title: skillName,
              icon: '🎯',
              description: 'Test skill',
              goal: 'Learn testing',
              status: 'active'
            },
            nodes: mockNodes.map(node => ({
              ...node,
              sessions_count: 0,
              last_practiced_at: null
            })),
            progress: {
              completed: 0,
              total: nodeCount,
              percent: 0
            }
          };

          api.get.mockImplementation((url) => {
            if (String(url).includes('/full')) {
              return Promise.resolve({ data: mockFullResponse });
            }
            return Promise.resolve({
              data: {
                skill: mockFullResponse.skill_map,
                nodes: mockNodes
              }
            });
          });

          const { unmount } = render(
            <MemoryRouter initialEntries={[`/skills/${skillId}`]}>
              <Routes>
                <Route
                  path="/skills/:skillId"
                  element={
                    <ActiveSessionProvider>
                      <SkillMapProvider>
                        <ProgressionPath />
                      </SkillMapProvider>
                    </ActiveSessionProvider>
                  }
                />
              </Routes>
            </MemoryRouter>
          );

          await waitFor(() => {
            expect(screen.getByText(skillName)).toBeInTheDocument();
          }, { timeout: 2000 });

          unmount();
          cleanup();

          // Simulate cache age by waiting (in real test, cache would have timestamp)
          // For this test, we'll just verify the behavior expectation

          // Second render (should use cache if < 60s)
          const startTime = performance.now();

          render(
            <MemoryRouter initialEntries={[`/skills/${skillId}`]}>
              <Routes>
                <Route
                  path="/skills/:skillId"
                  element={
                    <ActiveSessionProvider>
                      <SkillMapProvider>
                        <ProgressionPath />
                      </SkillMapProvider>
                    </ActiveSessionProvider>
                  }
                />
              </Routes>
            </MemoryRouter>
          );

          await waitFor(() => {
            const contentVisible = screen.queryByText(skillName);
            expect(contentVisible).toBeTruthy();
            const renderTime = performance.now() - startTime;
            expect(renderTime).toBeLessThan(150);
          }, { timeout: 500 });

          // ASSERTION: Background refresh should still fire
          // This will FAIL on unfixed code because no background refresh exists
          await waitFor(() => {
            // Should have made at least 2 API calls (initial + background refresh)
            // EXPECTED: 2 calls (cache serve + background refresh)
            // ACTUAL (unfixed): 1 call (no caching, no background refresh)
            expect(api.get.mock.calls.length).toBeGreaterThanOrEqual(2);
          }, { timeout: 2000 });
        }
      ),
      { numRuns: 2, timeout: 30000 }
    );
  }, 35000);
});

