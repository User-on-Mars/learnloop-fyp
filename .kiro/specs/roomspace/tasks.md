 # Implementation Plan: RoomSpace

## Overview

This implementation plan follows the 6-phase approach outlined in the design document. RoomSpace is a collaborative learning feature that enables users to create private rooms, invite friends, practice shared skill maps, and compete on XP-based leaderboards. The feature integrates seamlessly into the existing LearnLoop application with isolated progress tracking and real-time updates.

**Key Implementation Principles:**
- Build incrementally with validation at each checkpoint
- Reuse existing patterns from the codebase (models, services, components)
- Maintain data isolation between room XP and global XP
- Implement real-time features with WebSocket fallback to polling
- Follow existing UI/UX patterns for consistency

## Tasks

### Phase 1: Core Infrastructure

- [ ] 1. Create backend database models
  - [x] 1.1 Create Room model (`backend/src/models/Room.js`)
    - Define schema with ownerId, name, description, deletedAt fields
    - Add indexes for ownerId and deletedAt
    - Add virtual for memberCount
    - _Requirements: 2.6, 2.7, 2.8, 25.1-25.8_
  
  - [x] 1.2 Create RoomMember model (`backend/src/models/RoomMember.js`)
    - Define schema with roomId, userId, role, joinedAt fields
    - Add compound unique index on (roomId, userId)
    - Add indexes for efficient queries
    - _Requirements: 8.5, 26.1-26.7_
  
  - [x] 1.3 Create RoomInvitation model (`backend/src/models/RoomInvitation.js`)
    - Define schema with roomId, invitedBy, invitedEmail, invitedUserId, status, expiresAt fields
    - Add compound indexes for invitation queries
    - Add index for expiry job
    - _Requirements: 7.1-7.7, 27.1-27.10_
  
  - [x] 1.4 Create RoomSkillMap model (`backend/src/models/RoomSkillMap.js`)
    - Define schema with roomId, skillMapId, addedBy, createdAt fields
    - Add compound unique index on (roomId, skillMapId)
    - _Requirements: 13.6, 28.1-28.6_
  
  - [x] 1.5 Create RoomXpLedger model (`backend/src/models/RoomXpLedger.js`)
    - Define schema with roomId, userId, skillMapId, xpAmount, earnedAt fields
    - Add compound indexes for aggregation queries
    - _Requirements: 19.2, 20.2, 29.1-29.7_
  
  - [x] 1.6 Create RoomStreak model (`backend/src/models/RoomStreak.js`)
    - Define schema with roomId, userId, currentStreak, longestStreak, lastActivityDate, lastResetAt fields
    - Add compound unique index on (roomId, userId)
    - _Requirements: 23.1-23.7, 30.1-30.9_

- [ ] 2. Implement RoomService with core operations
  - [x] 2.1 Create RoomService class (`backend/src/services/RoomService.js`)
    - Implement createRoom method with ownership limit validation (3 rooms max)
    - Implement getRoomById method with membership verification
    - Implement getUserRooms method to fetch all rooms where user is owner or member
    - Implement updateRoom method (owner only)
    - Implement deleteRoom method with soft delete
    - _Requirements: 2.1-2.9, 3.1-3.4, 11.1-11.7, 12.1-12.6_
  
  - [x] 2.2 Add member management methods to RoomService
    - Implement getRoomMembers method
    - Implement kickMember method (owner only, cannot kick self)
    - Implement leaveRoom method (members only, not owners)
    - _Requirements: 10.1-10.6, 16.1-16.5, 17.1-17.3_
  
  - [x] 2.3 Add skill map management methods to RoomService
    - Implement addSkillMap method
    - Implement removeSkillMap method with confirmation
    - Implement getRoomSkillMaps method
    - _Requirements: 13.1-13.8, 34.1-34.6_

- [ ] 3. Create Room API endpoints
  - [x] 3.1 Create room routes file (`backend/src/routes/rooms.js`)
    - POST /api/rooms - Create room
    - GET /api/rooms - Get user's rooms
    - GET /api/rooms/:roomId - Get room details
    - PATCH /api/rooms/:roomId - Update room (owner only)
    - DELETE /api/rooms/:roomId - Delete room (owner only)
    - _Requirements: 2.1-2.9, 3.1-3.4, 11.1-11.7, 12.1-12.6_
  
  - [x] 3.2 Add member management endpoints to room routes
    - GET /api/rooms/:roomId/members - Get room members
    - DELETE /api/rooms/:roomId/members/:userId - Kick member (owner only)
    - POST /api/rooms/:roomId/leave - Leave room (members only)
    - _Requirements: 10.1-10.6, 16.1-16.5, 17.1-17.3_
  
  - [x] 3.3 Add skill map management endpoints to room routes
    - GET /api/rooms/:roomId/skill-maps - Get room skill maps
    - POST /api/rooms/:roomId/skill-maps - Add skill map to room
    - DELETE /api/rooms/:roomId/skill-maps/:skillMapId - Remove skill map from room
    - _Requirements: 13.1-13.8, 34.1-34.6_
  
  - [x] 3.4 Register room routes in server.js
    - Import room routes
    - Mount routes at /api/rooms
    - Add audit logging middleware
    - _Requirements: 2.1-2.9_

- [x] 4. Create basic frontend pages and navigation
  - [x] 4.1 Create RoomSpace page (`frontend/src/pages/RoomSpace.jsx`)
    - Display list of user's rooms (owner + member)
    - Show empty state with "Create Room" CTA
    - Provide "Create Room" button
    - Navigate to room detail on click
    - _Requirements: 1.1-1.5_
  
  - [x] 4.2 Create RoomDetail page (`frontend/src/pages/RoomDetail.jsx`)
    - Display room name, description, member count
    - Show placeholder for leaderboard (to be implemented in Phase 3)
    - List skill maps with progress
    - Provide owner controls (edit, delete, kick, invite, add skill maps)
    - Provide member controls (leave room)
    - _Requirements: 12.1-12.6, 14.1-14.5_
  
  - [x] 4.3 Add RoomSpace navigation link to Sidebar
    - Add "RoomSpace" link below "Skill Maps" in Sidebar.jsx
    - Use appropriate icon (e.g., Users icon)
    - Navigate to /roomspace on click
    - _Requirements: 1.1-1.2_
  
  - [x] 4.4 Create room routes in frontend
    - Add /roomspace route to App.jsx
    - Add /roomspace/:roomId route to App.jsx
    - Ensure routes are protected with authentication
    - _Requirements: 1.1-1.2_

- [ ] 5. Checkpoint - Core infrastructure validation
  - Ensure all models are created and indexed correctly
  - Verify RoomService methods work with test data
  - Test API endpoints with Postman or similar tool
  - Verify frontend pages render and navigate correctly
  - Ensure all tests pass, ask the user if questions arise

### Phase 2: Invitations

- [x] 6. Implement InvitationService
  - [x] 6.1 Create InvitationService class (`backend/src/services/InvitationService.js`)
    - Implement createInvitation method with validation (email format, user exists, no duplicates, not self, not existing member)
    - Implement acceptInvitation method with room capacity check
    - Implement declineInvitation method
    - Implement getUserInvitations method
    - Implement getRoomInvitations method
    - _Requirements: 5.1-5.8, 6.1-6.4, 8.1-8.8, 9.1-9.4_
  
  - [x] 6.2 Add invitation expiry logic to InvitationService
    - Implement expireInvitations method for background job
    - Set 7-day expiration on invitation creation
    - Update status to "expired" for pending invitations past expiration date
    - _Requirements: 7.1-7.7_

- [x] 7. Create Invitation API endpoints
  - [x] 7.1 Create invitation routes file (`backend/src/routes/invitations.js`)
    - POST /api/rooms/:roomId/invitations - Create invitation (owner only)
    - GET /api/invitations - Get user's pending invitations
    - GET /api/rooms/:roomId/invitations - Get room's invitations (owner only)
    - PATCH /api/invitations/:invitationId/accept - Accept invitation
    - PATCH /api/invitations/:invitationId/decline - Decline invitation
    - _Requirements: 5.1-5.8, 8.1-8.8, 9.1-9.4_
  
  - [x] 7.2 Register invitation routes in server.js
    - Import invitation routes
    - Mount routes at /api/invitations and /api/rooms/:roomId/invitations
    - Add audit logging middleware
    - _Requirements: 5.1-5.8_

- [x] 8. Integrate with notification system
  - [x] 8.1 Add notification triggers to InvitationService
    - Send in-app notification when invitation is created
    - Send email notification when invitation is created
    - Send notification to owner when invitation is accepted
    - Send notification to owner when invitation is declined
    - _Requirements: 5.5-5.6, 8.7, 9.2, 31.1-31.6_
  
  - [x] 8.2 Add notification triggers to RoomService
    - Send notification when member is kicked
    - Send notification to all members when room is deleted
    - _Requirements: 10.4, 11.5, 31.1-31.6_

- [x] 9. Build invitation UI components
  - [x] 9.1 Create InvitationList component (`frontend/src/components/InvitationList.jsx`)
    - Display pending invitations
    - Show room name, owner name, expiration
    - Provide accept/decline buttons
    - _Requirements: 8.1-8.2_
  
  - [x] 9.2 Add invitation modal to RoomDetail page
    - Create "Invite Member" button for owners
    - Display email input form
    - Validate email format
    - Show error messages for validation failures
    - _Requirements: 5.1-5.8, 6.1-6.4_
  
  - [x] 9.3 Integrate InvitationList into Dashboard or Notifications area
    - Display pending invitations in notifications area
    - Show invitation count badge
    - Navigate to invitation detail on click
    - _Requirements: 8.1-8.2_

- [ ] 10. Checkpoint - Invitation flow validation
  - Test full invitation flow: create → send → accept → verify membership
  - Test invitation validation: duplicate prevention, self-invitation, room capacity
  - Test invitation expiry logic
  - Verify notifications are sent correctly
  - Ensure all tests pass, ask the user if questions arise

### Phase 3: Skill Maps & XP

- [x] 11. Implement RoomXpService
  - [x] 11.1 Create RoomXpService class (`backend/src/services/RoomXpService.js`)
    - Implement awardXp method to record XP transactions
    - Implement getRoomLeaderboard method with sorting (XP desc → streak desc → username asc)
    - Implement getUserRoomXp method to get user's total XP in room
    - _Requirements: 19.1-19.5, 20.1-20.5, 21.1-21.7_
  
  - [x] 11.2 Add streak tracking methods to RoomXpService
    - Implement updateStreak method (check last activity, increment/reset streak)
    - Implement resetWeeklyStreaks method for background job
    - _Requirements: 23.1-23.7, 24.1-24.7_

- [x] 12. Create Room XP and Leaderboard API endpoints
  - [x] 12.1 Create room XP routes file (`backend/src/routes/roomXp.js`)
    - POST /api/rooms/:roomId/xp - Award XP (internal use, triggered by node completion)
    - GET /api/rooms/:roomId/leaderboard - Get room leaderboard
    - GET /api/rooms/:roomId/xp/:userId - Get user's room XP
    - _Requirements: 20.1-20.5, 21.1-21.7_
  
  - [x] 12.2 Register room XP routes in server.js
    - Import room XP routes
    - Mount routes at /api/rooms/:roomId/xp and /api/rooms/:roomId/leaderboard
    - Add audit logging middleware
    - _Requirements: 20.1-20.5_

- [-] 13. Integrate with existing skill map practice flow
  - [x] 13.1 Modify node completion handler to detect room skill maps
    - Check if node belongs to a room skill map
    - If yes, call RoomXpService.awardXp instead of global XpService
    - Update room streak if new day
    - _Requirements: 15.1-15.5, 19.1-19.5, 20.1-20.5_
  
  - [x] 13.2 Ensure room skill map progress is isolated from personal progress
    - Store room skill map progress in separate records
    - Do not synchronize with personal skill map progress
    - _Requirements: 18.1-18.4_

- [x] 14. Build Leaderboard component
  - [x] 14.1 Create RoomLeaderboard component (`frontend/src/components/RoomLeaderboard.jsx`)
    - Display ranked list of members
    - Show avatar, username, XP, streak
    - Highlight current user's row
    - Sort by XP desc → streak desc → username asc
    - _Requirements: 21.1-21.7_
  
  - [x] 14.2 Integrate RoomLeaderboard into RoomDetail page
    - Replace placeholder with RoomLeaderboard component
    - Pass roomId and currentUserId as props
    - _Requirements: 14.2, 21.1-21.7_

- [ ] 15. Checkpoint - XP and leaderboard validation
  - Test XP earning flow: complete node → verify ledger entry → check leaderboard
  - Test leaderboard sorting with multiple members
  - Test streak tracking: consecutive days, gaps, weekly reset
  - Verify room XP is isolated from global XP
  - Ensure all tests pass, ask the user if questions arise

### Phase 4: Real-time Updates

- [x] 16. Extend WebSocketService for room events
  - [x] 16.1 Add room leaderboard event handlers to WebSocketService
    - Implement join_room_leaderboard event handler
    - Implement leave_room_leaderboard event handler
    - Maintain room-specific socket rooms
    - _Requirements: 22.1-22.5_
  
  - [x] 16.2 Add leaderboard broadcast logic to RoomXpService
    - Broadcast room_leaderboard_update event when XP is awarded
    - Broadcast room_xp_earned event with XP details
    - Broadcast room_streak_updated event when streak changes
    - _Requirements: 22.1-22.5_

- [x] 17. Add WebSocket client to RoomLeaderboard component
  - [x] 17.1 Connect to WebSocket in RoomLeaderboard component
    - Import Socket.IO client
    - Connect to WebSocket on component mount
    - Join room leaderboard channel with roomId
    - Disconnect and leave channel on component unmount
    - _Requirements: 22.1-22.5_
  
  - [x] 17.2 Handle real-time leaderboard updates
    - Listen for room_leaderboard_update event
    - Update leaderboard state when event is received
    - Show visual feedback for XP changes (e.g., animation)
    - _Requirements: 22.1-22.5_
  
  - [x] 17.3 Implement polling fallback for WebSocket unavailability
    - Poll for leaderboard updates every 30 seconds if WebSocket is unavailable
    - Use exponential backoff for WebSocket reconnection
    - _Requirements: 22.3-22.4_

- [ ] 18. Checkpoint - Real-time updates validation
  - Test WebSocket connection and disconnection
  - Test leaderboard updates in real-time with multiple clients
  - Test polling fallback when WebSocket is unavailable
  - Verify broadcast latency is < 100ms
  - Ensure all tests pass, ask the user if questions arise

### Phase 5: Background Jobs

- [x] 19. Implement invitation expiry background job
  - [x] 19.1 Create invitation expiry cron job
    - Create cron job file or add to existing scheduler
    - Schedule job to run daily at 00:00 UTC
    - Call InvitationService.expireInvitations method
    - Log job execution for audit purposes
    - _Requirements: 7.6-7.7_
  
  - [x] 19.2 Add error handling and monitoring to expiry job
    - Catch and log errors
    - Send alerts if job fails
    - Retry logic for transient failures
    - _Requirements: 7.6-7.7_

- [x] 20. Implement weekly streak reset background job
  - [x] 20.1 Create weekly streak reset cron job
    - Create cron job file or add to existing scheduler
    - Schedule job to run every Monday at 00:00 UTC
    - Call RoomXpService.resetWeeklyStreaks method
    - Log job execution for audit purposes
    - _Requirements: 24.1-24.7_
  
  - [x] 20.2 Add error handling and monitoring to streak reset job
    - Catch and log errors
    - Send alerts if job fails
    - Retry logic for transient failures
    - _Requirements: 24.1-24.7_

- [x] 21. Register background jobs in server startup
  - [x] 21.1 Import and start background jobs in server.js
    - Import invitation expiry job
    - Import weekly streak reset job
    - Start jobs on server startup
    - Stop jobs on graceful shutdown
    - _Requirements: 7.6-7.7, 24.1-24.7_

- [ ] 22. Checkpoint - Background jobs validation
  - Test invitation expiry job manually (adjust time for testing)
  - Test weekly streak reset job manually (adjust time for testing)
  - Verify jobs log execution correctly
  - Test error handling and retry logic
  - Ensure all tests pass, ask the user if questions arise

### Phase 6: Polish & Testing

- [x] 23. Add confirmation dialogs for destructive actions
  - [x] 23.1 Create ConfirmationDialog component (`frontend/src/components/ConfirmationDialog.jsx`)
    - Reusable modal component with title, message, cancel, confirm buttons
    - Support for custom button labels and colors
    - _Requirements: 35.1-35.5_
  
  - [x] 23.2 Add confirmation dialogs to RoomDetail page
    - "Delete Room" confirmation with warning text
    - "Kick Member" confirmation with member name
    - "Remove Skill Map" confirmation with skill map name
    - "Leave Room" confirmation
    - _Requirements: 10.2, 11.2-11.3, 16.1, 34.2-34.3, 35.1-35.5_

- [x] 24. Implement comprehensive error handling
  - [x] 24.1 Add error handling to RoomService
    - Validate ownership limits (3 rooms max)
    - Validate room capacity (5 members max)
    - Validate ownership for privileged operations
    - Return descriptive error messages
    - _Requirements: 3.1-3.4, 4.1-4.4, 33.1-33.3_
  
  - [x] 24.2 Add error handling to InvitationService
    - Validate email format
    - Validate user exists
    - Prevent duplicate invitations
    - Prevent self-invitation
    - Prevent invitation to existing members
    - Check room capacity before acceptance
    - _Requirements: 5.7-5.8, 6.1-6.4, 8.8, 33.1-33.3_
  
  - [x] 24.3 Add error handling to frontend
    - Display error toasts for API failures
    - Show validation errors inline in forms
    - Provide retry buttons for transient failures
    - Rollback optimistic UI updates on failure
    - _Requirements: 33.1-33.3_

- [ ] 25. Write comprehensive test suite
  - [ ]* 25.1 Write unit tests for RoomService
    - Test createRoom with ownership limit
    - Test updateRoom with ownership validation
    - Test deleteRoom with soft delete
    - Test kickMember with ownership validation
    - Test leaveRoom with owner prevention
    - _Requirements: 2.1-2.9, 3.1-3.4, 10.1-10.6, 11.1-11.7, 16.1-16.5, 17.1-17.3_
  
  - [ ]* 25.2 Write unit tests for InvitationService
    - Test createInvitation with duplicate prevention
    - Test acceptInvitation with room capacity check
    - Test declineInvitation
    - Test expireInvitations
    - _Requirements: 5.1-5.8, 6.1-6.4, 7.1-7.7, 8.1-8.8, 9.1-9.4_
  
  - [ ]* 25.3 Write unit tests for RoomXpService
    - Test awardXp with ledger entry creation
    - Test getRoomLeaderboard with sorting
    - Test updateStreak with consecutive days and gaps
    - Test resetWeeklyStreaks
    - _Requirements: 19.1-19.5, 20.1-20.5, 21.1-21.7, 23.1-23.7, 24.1-24.7_
  
  - [ ]* 25.4 Write integration tests for API endpoints
    - Test full room creation flow
    - Test full invitation flow (create → accept → verify membership)
    - Test full XP earning flow (award XP → verify ledger → check leaderboard)
    - _Requirements: 2.1-2.9, 5.1-5.8, 8.1-8.8, 20.1-20.5_
  
  - [ ]* 25.5 Write integration tests for WebSocket
    - Test connection/disconnection handling
    - Test room join/leave events
    - Test leaderboard update broadcasts
    - _Requirements: 22.1-22.5_
  
  - [ ]* 25.6 Write integration tests for background jobs
    - Test invitation expiry job marks expired invitations
    - Test weekly streak reset job zeros current_streak
    - Test jobs handle errors gracefully
    - _Requirements: 7.6-7.7, 24.1-24.7_

- [ ] 26. Performance optimization and load testing
  - [ ]* 26.1 Optimize database queries
    - Verify indexes are used (explain plan analysis)
    - Add missing indexes if needed
    - Optimize aggregation queries for leaderboard
    - _Requirements: 21.1-21.7_
  
  - [ ]* 26.2 Test WebSocket scalability
    - Test 100 concurrent connections to same room
    - Test broadcast latency (should be < 100ms)
    - Test reconnection storm (many clients reconnecting simultaneously)
    - _Requirements: 22.1-22.5_
  
  - [ ]* 26.3 Load test API endpoints
    - Test room creation with concurrent requests
    - Test invitation acceptance with concurrent requests
    - Test XP award with concurrent requests
    - _Requirements: 2.1-2.9, 8.1-8.8, 20.1-20.5_

- [x] 27. UI/UX polish and consistency
  - [x] 27.1 Ensure UI design consistency
    - Use existing design system color palette from tailwind.config.js
    - Use existing component patterns from Sidebar.jsx, Dashboard.jsx
    - Use existing icon library and styling conventions
    - Follow existing responsive layout patterns
    - _Requirements: 32.1-32.5_
  
  - [x] 27.2 Add loading states and skeletons
    - Show loading skeletons for room list
    - Show loading skeletons for leaderboard
    - Show loading spinners for API requests
    - _Requirements: 32.1-32.5_
  
  - [x] 27.3 Add empty states with CTAs
    - Empty state for no rooms
    - Empty state for no skill maps in room
    - Empty state for no members in room
    - _Requirements: 1.3, 32.1-32.5_

- [ ] 28. Final checkpoint - End-to-end validation
  - Test complete user flow: create room → invite user → accept invitation → add skill map → practice → earn XP → view leaderboard
  - Test owner flow: edit room → kick member → delete room
  - Test member flow: leave room
  - Test WebSocket disconnection during XP award (should reconnect and update)
  - Verify all error messages are user-friendly
  - Verify all confirmation dialogs work correctly
  - Ensure all tests pass, ask the user if questions arise

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Unit tests validate specific examples and edge cases
- Integration tests validate end-to-end flows
- Performance tests validate scalability and responsiveness
- The implementation follows the existing codebase patterns (Mongoose models, Express routes, React components)
- Real-time features use WebSocket with polling fallback for reliability
- Background jobs use cron scheduling for invitation expiry and weekly streak reset
- All destructive actions require confirmation dialogs
- Error handling provides descriptive messages and retry options
- UI/UX follows existing design system for consistency

## Implementation Order

The tasks are ordered to build incrementally:
1. **Phase 1** establishes the data layer and basic CRUD operations
2. **Phase 2** adds invitation flow and notifications
3. **Phase 3** integrates XP tracking and leaderboards
4. **Phase 4** adds real-time updates for competitive engagement
5. **Phase 5** implements background jobs for maintenance
6. **Phase 6** polishes the feature with error handling, testing, and UX improvements

Each phase ends with a checkpoint to validate progress before moving forward.
