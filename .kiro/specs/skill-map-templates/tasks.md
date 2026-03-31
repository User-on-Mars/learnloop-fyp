


# Implementation Plan: Skill Map Templates

## Overview

Implement the Skill Map Templates feature: five pre-built skill map blueprints that users can browse, preview, and apply to instantly create a fully populated skill map with pre-built active sessions. The implementation covers frontend template data, a new backend endpoint for atomic template application, UI components (gallery + preview), integration into the creation flow, removal of the 6-session hard limit, and active session pagination.

## Tasks

- [x] 1. Create template data module and types
  - [x] 1.1 Create `frontend/src/data/templates.ts` with `SessionDefinition`, `NodeDefinition`, and `SkillMapTemplate` interfaces, and the `TEMPLATES` array containing all 5 templates (Web Dev Fundamentals, Guitar Practice Path, Spanish Basics, Data Science Intro, UI Design Basics) with Session_Definitions for each node
    - Each template must have 4-8 nodes, each node with 1-3 sessions
    - All field lengths must conform to existing model constraints (Skill name 1-30, description 0-120, goal 1-16, Node title 1-16, Node description 0-2000, Session title 1-100, Session description 0-500)
    - Icons must reference valid identifiers from `frontend/src/utils/iconLibrary`
    - Export a `deduplicateTitle(title, existingTitles)` helper function for title uniqueness
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

  - [ ]* 1.2 Write property tests for template data (`frontend/src/data/__tests__/templates.property.test.ts`)
    - **Property 1: Template structure conforms to model constraints**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 2.7, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6**

  - [ ]* 1.3 Write property test for template ID uniqueness
    - **Property 2: Template IDs are unique**
    - **Validates: Requirements 1.6**

  - [ ]* 1.4 Write property test for JSON round-trip
    - **Property 3: Template JSON round-trip**
    - **Validates: Requirements 1.7**

  - [ ]* 1.5 Write property test for title deduplication
    - **Property 6: Title deduplication produces unique titles**
    - **Validates: Requirements 5.4**

  - [ ]* 1.6 Write unit tests for template data (`frontend/src/data/__tests__/templates.test.ts`)
    - Test that TEMPLATES array has exactly 5 entries
    - Test that each domain template exists (web dev, guitar, language, data science, design)
    - Test deduplicateTitle edge cases (empty set, single collision, multiple collisions)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 5.4_

- [x] 2. Implement backend endpoint for template application
  - [x] 2.1 Add `createSkillMapFromTemplate` method to `backend/src/services/SkillService.js`
    - Accept `userId` and `template` object
    - Deduplicate title using `skillTitleExistsForUser` with numeric suffix (e.g., "Web Dev Basics (2)")
    - Create Skill, Nodes, and ActiveSession records in a single MongoDB transaction
    - First node status Unlocked, rest Locked; no isGoal nodes
    - ActiveSession records: `skillName` = `"{title} — {nodeTitle}"`, `notes` = session description, `targetTime` = 1500, `isCountdown` = true
    - Roll back entire transaction on any failure
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.7, 6.1, 6.2, 6.3, 6.4, 12.4_

  - [x] 2.2 Add `POST /api/skills/maps/from-template` route in `backend/src/routes/skills.js`
    - Zod validation for template body (title 1-30, description 0-120, icon 1-30, goal 1-16, nodes 2-15 with session definitions)
    - Call `SkillService.createSkillMapFromTemplate`
    - Return 201 with `{ skill, nodes, activeSessions }`
    - _Requirements: 5.1, 11.7_

  - [ ]* 2.3 Write property tests for template application (`backend/src/services/__tests__/templateApplication.property.test.js`)
    - **Property 4: Template application produces a valid skill map with correct nodes**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.7, 11.7**

  - [ ]* 2.4 Write property test for session creation correctness
    - **Property 5: Template application creates correct sessions for all nodes**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4**

  - [ ]* 2.5 Write property test for rollback on failure
    - **Property 9: Rollback on partial failure leaves no orphaned data**
    - **Validates: Requirements 12.4**

  - [ ]* 2.6 Write unit tests for backend template application
    - Test that existing `createSkillMap` does NOT auto-create sessions (Requirement 6.6 preserved)
    - Test validation error responses for malformed template data
    - _Requirements: 6.6_

- [ ] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Add frontend API function and build UI components
  - [x] 4.1 Add `createSkillMapFromTemplate` function to `frontend/src/api/skillMapApi.ts`
    - POST to `/skills/maps/from-template` with `{ template }` body
    - Return `{ skill, nodes, activeSessions }` response
    - _Requirements: 5.1_

  - [x] 4.2 Create `TemplateGallery` component (`frontend/src/components/TemplateGallery.jsx`)
    - Props: `isOpen`, `onClose`, `onCreated`, `onSwitchToWizard`
    - Modal dialog rendering template cards in a grid (icon, title, description, node count)
    - Clicking a card shows TemplatePreview for that template
    - "Create from scratch" link calls `onSwitchToWizard`
    - Loading spinner while applying, error message with retry on failure
    - Disable apply button during `isApplying`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 12.1, 12.2, 12.3_

  - [x] 4.3 Create `TemplatePreview` component (`frontend/src/components/TemplatePreview.jsx`)
    - Props: `template`, `onBack`, `onApply`, `isApplying`, `error`
    - Display template title, description, icon, goal
    - List all node definitions in order with titles, descriptions, and session definitions
    - Display total node count and total session count
    - "Use this template" button triggers `onApply`
    - "Back" button triggers `onBack`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [ ]* 4.4 Write property test for TemplatePreview rendering
    - **Property 7: Template preview displays all template data**
    - **Validates: Requirements 3.2, 4.1, 4.2, 4.3, 4.6**

  - [ ]* 4.5 Write unit tests for TemplateGallery and TemplatePreview
    - Test gallery renders all 5 template cards
    - Test gallery shows "Create from scratch" link
    - Test preview shows apply and back buttons
    - Test apply button disabled during loading
    - Test error message displayed on failure
    - Test loading skeleton shown while loading
    - _Requirements: 3.2, 3.4, 4.4, 4.5, 5.6, 12.1, 12.2, 12.3_

- [x] 5. Integrate TemplateGallery into skill map creation flow
  - [x] 5.1 Update `frontend/src/components/SkillList.jsx` to offer two creation options
    - Add state for choosing between template gallery and wizard
    - "Use a template" opens TemplateGallery modal
    - "Start from scratch" opens CreateSkillMapWizard modal
    - Wire `onCreated` callback to navigate to the new skill map view
    - Wire `onSwitchToWizard` to close gallery and open wizard
    - _Requirements: 3.1, 5.5_

- [x] 6. Remove 6-session hard limit and add active session pagination
  - [x] 6.1 Remove the 6-session limit from `frontend/src/context/ActiveSessionContext.jsx`
    - Remove the `if (activeSessions.length >= 6)` guard in `addSession`
    - Remove the `return null` for exceeding limit
    - _Requirements: 10.1, 10.2_

  - [x] 6.2 Update `frontend/src/pages/LogPractice.jsx` to remove 6-session limit and add pagination
    - Remove the `activeSessions.length >= 6` check in `tryStart`
    - Remove the blockMsg about "at most 6 active sessions"
    - Update count display from `({activeSessions.length}/6)` to `({activeSessions.length} total)`
    - Add `SESSIONS_PER_PAGE` constant (default 6) and `sessionPage` state
    - Slice active sessions by page for rendering
    - Add pagination controls (prev/next, page indicator) below active sessions grid when needed
    - Display total active session count
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 10.1, 10.2, 10.3, 10.4_

  - [ ]* 6.3 Write property test for active session pagination
    - **Property 8: Active session pagination correctness**
    - **Validates: Requirements 9.1**

  - [ ]* 6.4 Write unit tests for session limit removal and pagination
    - Test that more than 6 sessions are allowed in ActiveSessionContext
    - Test total session count is displayed
    - Test pagination controls shown when sessions exceed page size
    - _Requirements: 10.1, 10.2, 9.2, 9.3, 9.4, 10.4_

- [ ] 7. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- Templates are static frontend data — no database migrations needed
- The existing `createSkillMap` wizard flow is unchanged; template application uses a new dedicated endpoint
