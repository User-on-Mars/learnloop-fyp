2# Implementation Plan: Skill Map Progression

## Overview

This implementation plan creates a gamified learning progression system with sequential skill maps. Each skill contains 2-16 nodes arranged in a zig-zag visual path. The system integrates with existing Session Manager, Reflection, and Blocker systems to provide a cohesive learning experience.

## Tasks

- [x] 1. Create backend data models and database schemas
  - [x] 1.1 Create Skill model with validation
    - Define Mongoose schema with userId, name (1-100 chars), nodeCount (2-16)
    - Add indexes for userId and name lookups
    - Implement validation middleware
    - _Requirements: 1.1, 1.2, 1.9, 1.10_
  
  - [ ]* 1.2 Write property tests for Skill model validation
    - **Property 1: Skill Name Validation**
    - **Property 2: Node Count Validation**
    - **Validates: Requirements 1.1, 1.2, 1.9, 1.10**
  
  - [x] 1.3 Create Node model with status management
    - Define Mongoose schema with skillId, userId, order, title, description, status, isStart, isGoal
    - Add compound indexes for efficient queries
    - Implement status enum validation
    - _Requirements: 1.3, 1.4, 1.5, 1.6, 1.7_
  
  - [ ]* 1.4 Write property tests for Node model
    - **Property 7: Sequential Order Assignment**
    - **Property 20: Status Transition Validation**
    - **Validates: Requirements 1.7, 5.5, 5.6, 5.7, 5.8**
  
  - [x] 1.5 Update LearningSession model references
    - Verify nodeId and skillId fields exist in LearningSession schema
    - Add any missing indexes for node/skill queries
    - _Requirements: 15.4_

- [x] 2. Implement backend services layer
  - [x] 2.1 Create SkillService with CRUD operations
    - Implement createSkill method with node generation logic
    - Implement getUserSkills with progress calculation
    - Implement deleteSkill with cascade logic
    - _Requirements: 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 2.1, 2.3, 2.4, 3.2, 3.3, 3.4, 3.5_
  
  - [ ]* 2.2 Write property tests for SkillService
    - **Property 3: Exact Node Generation**
    - **Property 4: START Node Initialization**
    - **Property 5: GOAL Node Initialization**
    - **Property 6: Middle Nodes Initialization**
    - **Property 8: Skill Creation Persistence Round-Trip**
    - **Property 12: Skill Deletion Cascade**
    - **Property 13: Session Link Removal on Skill Deletion**
    - **Validates: Requirements 1.3, 1.4, 1.5, 1.6, 1.8, 3.2, 3.3, 3.4, 3.5**
  
  - [x] 2.3 Create NodeService with status transitions
    - Implement updateNodeStatus with transition validation
    - Implement auto-unlock logic for next node
    - Implement getNodeDetails with linked content aggregation
    - Implement updateNodeContent with validation
    - Implement deleteNode with validation and order recalculation
    - _Requirements: 5.1, 5.2, 5.3, 5.5, 5.6, 5.7, 5.8, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 9.2, 9.3, 9.4, 9.5, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7_
  
  - [ ] 2.4 Write property tests for NodeService
    - **Property 19: Node Completion Triggers Next Unlock**
    - **Property 28: Node Title Validation**
    - **Property 29: Node Description Validation**
    - **Property 30: Node Edit Persistence Round-Trip**
    - **Property 35: Order Recalculation After Node Deletion**
    - **Property 36: Node Count Update After Deletion**
    - **Validates: Requirements 5.1, 5.2, 5.3, 9.2, 9.3, 9.4, 11.3, 11.4**
  
  - [x] 2.5 Create SessionLinkingService
    - Implement linkSessionToNode method
    - Implement updateNodeStatusOnSessionStart method
    - Implement getNodeLinkedContent method
    - _Requirements: 6.2, 6.3, 6.4, 15.4, 15.5, 15.6, 15.7_

- [ ] 3. Checkpoint - Ensure backend models and services are complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement backend API routes
  - [x] 4.1 Create skill routes
    - POST /api/skills - Create skill with nodes
    - GET /api/skills - List user skills with progress
    - GET /api/skills/:id - Get skill with all nodes
    - DELETE /api/skills/:id - Delete skill with cascade
    - Add authentication and validation middleware
    - _Requirements: 1.1, 1.2, 1.3, 1.8, 2.1, 2.2, 2.3, 2.4, 2.6, 3.1, 3.2_
  
  - [ ]* 4.2 Write integration tests for skill routes
    - Test skill creation workflow
    - Test skill list with progress calculation
    - Test skill deletion cascade
    - _Requirements: 1.8, 2.1, 3.2, 3.3_
  
  - [x] 4.3 Create node routes
    - GET /api/skills/:skillId/nodes - Get progression path
    - PATCH /api/nodes/:id/status - Update node status
    - PATCH /api/nodes/:id/content - Update node title/description
    - DELETE /api/nodes/:id - Delete node with validation
    - GET /api/nodes/:id/details - Get node with linked content
    - POST /api/nodes/:id/sessions - Start session from node
    - Add authentication and validation middleware
    - _Requirements: 4.1, 5.1, 6.1, 6.2, 8.1, 9.1, 9.2, 9.3, 10.1, 11.1_
  
  - [ ]* 4.4 Write integration tests for node routes
    - Test node status transitions
    - Test node content updates
    - Test node deletion validation
    - Test session linking
    - _Requirements: 5.1, 6.2, 9.4, 11.2_

- [x] 5. Implement frontend state management
  - [x] 5.1 Create SkillMapContext with state and actions
    - Define context shape with skills, nodes, loading, error states
    - Implement createSkill action
    - Implement loadSkills action
    - Implement loadSkillNodes action
    - Implement deleteSkill action
    - Implement updateNodeStatus action
    - Implement updateNodeContent action
    - Implement deleteNode action
    - Implement startSession action
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 6.1, 9.1, 10.1, 11.1_
  
  - [ ]* 5.2 Write property tests for SkillMapContext
    - **Property 9: User Data Isolation**
    - **Property 45: Application State Persistence Round-Trip**
    - **Validates: Requirements 2.1, 14.6**

- [ ] 6. Checkpoint - Ensure backend API and frontend state management are complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Create frontend UI components for skill list
  - [x] 7.1 Create SkillMapPage container component
    - Implement routing between list and path views
    - Add loading and error states
    - _Requirements: 2.1, 4.1_
  
  - [x] 7.2 Create SkillList component
    - Display all user skills with progress indicators
    - Show completion count and percentage
    - Add click handlers for navigation
    - Implement delete skill with confirmation
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.6_
  
  - [ ]* 7.3 Write component tests for SkillList
    - Test skill display with progress
    - Test navigation on click
    - Test delete confirmation flow
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1_
  
  - [x] 7.4 Create CreateSkillModal component
    - Add form with name input (1-100 chars validation)
    - Add node count input (2-16 validation)
    - Implement form submission with error handling
    - _Requirements: 1.1, 1.2, 1.9, 1.10_
  
  - [ ]* 7.5 Write property tests for CreateSkillModal validation
    - **Property 1: Skill Name Validation**
    - **Property 2: Node Count Validation**
    - **Validates: Requirements 1.1, 1.2, 1.9, 1.10**

- [x] 8. Create frontend UI components for progression path
  - [x] 8.1 Create ProgressionPath component
    - Implement zig-zag layout algorithm
    - Render nodes in sequential order
    - Display connecting lines between nodes
    - Show progress bar at top
    - Add back button to skill list
    - _Requirements: 4.1, 4.2, 4.3, 4.8, 4.9_
  
  - [ ]* 8.2 Write property tests for ProgressionPath
    - **Property 14: Node Display Ordering**
    - **Property 15: Zig-Zag Layout Pattern**
    - **Property 18: Progress Bar Accuracy**
    - **Validates: Requirements 4.1, 4.2, 4.8**
  
  - [x] 8.3 Create NodeCard component
    - Display node title, order, status
    - Render status icons (lock, checkmark)
    - Show START/GOAL labels
    - Add click handlers for unlocked/in-progress/completed nodes
    - Show locked message for locked nodes
    - _Requirements: 4.4, 4.5, 4.6, 4.7, 4.10, 4.11_
  
  - [ ]* 8.4 Write component tests for NodeCard
    - **Property 16: Status Icon Rendering**
    - **Property 17: START and GOAL Label Display**
    - **Validates: Requirements 4.4, 4.5, 4.6, 4.7**

- [x] 9. Create frontend UI components for node details
  - [x] 9.1 Create NodeDetailModal component
    - Display node title, description, status, order
    - Show list of linked sessions with duration and date
    - Show list of linked reflections
    - Show list of linked blockers
    - Add close button
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9_
  
  - [ ]* 9.2 Write property tests for NodeDetailModal
    - **Property 26: Node Detail Modal Content Completeness**
    - **Property 27: Session Display Information**
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8**
  
  - [x] 9.3 Create EditNodeForm component
    - Add title input with 200 char validation
    - Add description textarea with 2000 char validation
    - Implement save with error handling
    - Disable for locked nodes
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_
  
  - [ ]* 9.4 Write property tests for EditNodeForm validation
    - **Property 28: Node Title Validation**
    - **Property 29: Node Description Validation**
    - **Property 31: Locked Node Edit Prevention**
    - **Validates: Requirements 9.2, 9.3, 9.5, 9.6, 9.7**
  
  - [x] 9.5 Create NodeStatusManager component
    - Show current status
    - Display status change options based on current status
    - Implement status change with validation
    - Disable for locked nodes
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_
  
  - [ ]* 9.6 Write component tests for NodeStatusManager
    - **Property 32: Status Change Options by Current Status**
    - **Property 33: Locked Node Manual Status Change Prevention**
    - **Validates: Requirements 10.1, 10.2, 10.3, 10.5**

- [ ] 10. Checkpoint - Ensure frontend components are complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Implement session integration
  - [x] 11.1 Add "Start Practice Session" button to NodeCard
    - Show button only for Unlocked and In_Progress nodes
    - Hide button for Locked and Completed nodes
    - Wire to session start action
    - _Requirements: 6.1, 6.5_
  
  - [ ]* 11.2 Write property tests for session button visibility
    - **Property 22: Session Button Visibility**
    - **Validates: Requirements 6.1, 6.5**
  
  - [x] 11.3 Implement session start integration
    - Call SessionManager API with nodeId
    - Update node status from Unlocked to In_Progress
    - Handle errors and display messages
    - _Requirements: 6.2, 6.3, 6.4, 15.1_
  
  - [ ]* 11.4 Write integration tests for session start
    - **Property 23: Session Creation Links to Node**
    - **Property 24: Session Start Updates Node Status**
    - **Property 46: Session Manager Integration**
    - **Validates: Requirements 6.2, 6.3, 6.4, 15.1, 15.4**
  
  - [x] 11.5 Create SessionCompletionPrompt component
    - Display after session ends
    - Provide option to add reflection (pre-linked to node)
    - Provide option to report blocker (pre-linked to node)
    - Allow skip
    - Close on completion or skip
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.7_
  
  - [ ]* 11.6 Write integration tests for session completion
    - **Property 25: Reflection and Blocker Node Linking**
    - **Validates: Requirements 7.5, 7.6, 15.5, 15.6**

- [x] 12. Implement responsive design and mobile optimization
  - [x] 12.1 Add responsive styles to ProgressionPath
    - Implement mobile zig-zag layout (< 768px)
    - Adjust node size and spacing for touch
    - Ensure 44x44px minimum touch targets
    - Test on 320px minimum width
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_
  
  - [ ]* 12.2 Write property tests for responsive design
    - **Property 40: Touch Target Size Compliance**
    - **Validates: Requirements 12.4**
  
  - [x] 12.3 Add responsive styles to SkillList
    - Optimize card layout for mobile
    - Ensure touch-friendly interactions
    - _Requirements: 12.1, 12.5_
  
  - [x] 12.4 Add responsive styles to modals
    - Optimize NodeDetailModal for mobile
    - Optimize CreateSkillModal for mobile
    - Ensure forms are touch-friendly
    - _Requirements: 12.1, 12.5_

- [x] 13. Implement real-time updates and performance optimization
  - [x] 13.1 Add optimistic UI updates
    - Update node status immediately on change
    - Update progress bar immediately
    - Update skill list progress immediately
    - Rollback on error
    - _Requirements: 13.1, 13.2, 13.4, 13.5_
  
  - [ ]* 13.2 Write property tests for real-time updates
    - **Property 41: Real-Time Update Performance**
    - **Validates: Requirements 13.1, 13.2, 13.3, 13.4, 13.5**
  
  - [x] 13.3 Implement data persistence monitoring
    - Add database write timeout handling
    - Ensure writes complete within 1000ms
    - Log slow queries
    - _Requirements: 14.1_
  
  - [ ]* 13.4 Write property tests for data persistence
    - **Property 42: Database Write Performance**
    - **Validates: Requirements 14.1**

- [ ] 14. Checkpoint - Ensure integration and performance features are complete
  - Ensure all tests pass, ask the user if questions arise.

- [-] 15. Implement error handling and data integrity
  - [ ] 15.1 Add comprehensive error handling to backend
    - Implement validation error responses
    - Implement state transition error responses
    - Implement referential integrity checks
    - Implement permission checks
    - Add error logging with context
    - _Requirements: 1.9, 1.10, 9.6, 9.7, 11.5, 14.4, 14.5_
  
  - [ ]* 15.2 Write property tests for error handling
    - **Property 44: Database Failure Error Logging**
    - **Validates: Requirements 14.5**
  
  - [ ] 15.3 Add comprehensive error handling to frontend
    - Display inline validation errors
    - Display toast notifications for state errors
    - Display error banners with retry for database errors
    - Implement error boundaries
    - _Requirements: 1.9, 1.10, 9.6, 9.7, 14.4_
  
  - [ ] 15.4 Implement referential integrity maintenance
    - Add pre-delete hooks to verify relationships
    - Implement cascade delete logic
    - Add orphan cleanup for deleted nodes
    - _Requirements: 14.2, 14.3_
  
  - [ ]* 15.5 Write property tests for referential integrity
    - **Property 43: Referential Integrity Maintenance**
    - **Validates: Requirements 14.2, 14.3**

- [-] 16. Integration testing and final wiring
  - [x] 16.1 Wire all components together in SkillMapPage
    - Connect SkillList to ProgressionPath navigation
    - Connect NodeCard to NodeDetailModal
    - Connect session start to SessionCompletionPrompt
    - Ensure all state updates propagate correctly
    - _Requirements: 2.5, 4.10, 6.1, 7.1_
  
  - [ ]* 16.2 Write end-to-end integration tests
    - **Property 10: Completion Progress Calculation**
    - **Property 11: Skill List Ordering**
    - **Property 21: Skill Progress Update on Node Status Change**
    - **Property 47: Content Retrieval by Node ID**
    - **Validates: Requirements 2.3, 2.4, 2.6, 5.9, 15.7**
  
  - [ ] 16.3 Test complete user workflows
    - Test skill creation → node editing → session start → completion → reflection
    - Test node status transitions and unlocking
    - Test skill deletion with cascade
    - Test node deletion with validation
    - _Requirements: All requirements_

- [ ] 17. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The implementation uses JavaScript/TypeScript with React frontend and Express/MongoDB backend
- Integration with existing Session Manager, Reflection, and Blocker systems is c2\r
 it`                                           41
0ical
