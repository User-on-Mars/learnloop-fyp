# Requirements Document: RoomSpace

## Introduction

RoomSpace is a collaborative, competitive learning environment that enables users to create private rooms, invite friends, practice shared skill maps, and compete on XP-based leaderboards. The feature integrates into the existing LearnLoop application as a new top-level navigation item, providing isolated progress tracking and social learning mechanics.

## Glossary

- **RoomSpace_System**: The complete collaborative learning environment feature including rooms, memberships, invitations, skill maps, XP tracking, and leaderboards
- **Room**: A private collaborative space with a unique identifier, owner, members, skill maps, and leaderboard
- **Owner**: The user who created a room and has full administrative privileges
- **Member**: A user who has accepted an invitation and joined a room with view and practice privileges
- **Invitation**: A request sent by an owner to a registered user's email address to join a room
- **Room_Skill_Map**: A skill map scoped to a specific room, either created within the room or added from the global template library
- **Room_XP**: Experience points earned exclusively within a room's skill maps, separate from global XP
- **Room_Leaderboard**: A ranked display of all room members showing username, avatar, room XP, and current streak
- **Streak**: A count of consecutive days with practice activity within a room, reset weekly on Monday 00:00 UTC
- **Global_Template_Library**: The existing collection of skill map templates available system-wide
- **Registered_User**: A user with an active account in the system identified by email address
- **Navigation_Bar**: The application's main navigation menu containing links to primary features

## Requirements

### Requirement 1: RoomSpace Page and Navigation

**User Story:** As a user, I want to access RoomSpace from the main navigation, so that I can view and manage my collaborative learning rooms.

#### Acceptance Criteria

1. THE Navigation_Bar SHALL display a "RoomSpace" link positioned below "Skill Maps"
2. WHEN a user clicks the RoomSpace link, THE RoomSpace_System SHALL navigate to the RoomSpace page
3. WHEN a user has no rooms, THE RoomSpace_System SHALL display an empty state with a call-to-action button
4. WHEN a user has rooms, THE RoomSpace_System SHALL display a list of all rooms where the user is owner or member
5. THE RoomSpace_System SHALL display each room with name, member count, and role indicator (owner or member)

### Requirement 2: Room Creation

**User Story:** As a user, I want to create private rooms, so that I can invite friends to learn together.

#### Acceptance Criteria

1. THE RoomSpace_System SHALL provide a "Create Room" button on the RoomSpace page
2. WHEN a user clicks "Create Room", THE RoomSpace_System SHALL display a room creation form
3. THE Room creation form SHALL require a room name field with 1-50 character limit
4. THE Room creation form SHALL provide an optional description field with 0-200 character limit
5. WHEN a user submits the creation form, THE RoomSpace_System SHALL validate the room name is not empty
6. WHEN validation passes, THE RoomSpace_System SHALL create a new room with the user as owner
7. WHEN a room is created, THE RoomSpace_System SHALL assign a unique identifier to the room
8. WHEN a room is created, THE RoomSpace_System SHALL record the creation timestamp
9. WHEN a room is created, THE RoomSpace_System SHALL add the owner to room_members with role "owner"

### Requirement 3: Room Creation Limits

**User Story:** As a system administrator, I want to limit room creation per user, so that system resources are managed effectively.

#### Acceptance Criteria

1. THE RoomSpace_System SHALL enforce a hard limit of 3 rooms per user as owner
2. WHEN a user attempts to create a fourth room, THE RoomSpace_System SHALL display an error modal stating "You can only own up to 3 rooms"
3. WHEN a user attempts to create a fourth room, THE RoomSpace_System SHALL prevent room creation
4. THE RoomSpace_System SHALL count only non-deleted rooms toward the ownership limit

### Requirement 4: Room Membership Limits

**User Story:** As a room owner, I want rooms to have a maximum capacity, so that the learning environment remains manageable.

#### Acceptance Criteria

1. THE RoomSpace_System SHALL enforce a hard limit of 5 members per room including the owner
2. WHEN a room has 5 members, THE RoomSpace_System SHALL prevent new invitation acceptance
3. WHEN a room has 5 members, THE RoomSpace_System SHALL display "Room Full" status to the owner
4. THE RoomSpace_System SHALL count only active members toward the room capacity limit

### Requirement 5: Member Invitation by Email

**User Story:** As a room owner, I want to invite users by email address, so that I can add friends to my room.

#### Acceptance Criteria

1. THE RoomSpace_System SHALL provide an "Invite Member" button on the room detail page for owners
2. WHEN an owner clicks "Invite Member", THE RoomSpace_System SHALL display an email input form
3. THE RoomSpace_System SHALL validate the email address format before sending invitation
4. WHEN the email matches a registered user, THE RoomSpace_System SHALL create a pending invitation record
5. WHEN the email matches a registered user, THE RoomSpace_System SHALL send an in-app notification to the invited user
6. WHEN the email matches a registered user, THE RoomSpace_System SHALL send an email notification with accept and decline links
7. WHEN the email does not match a registered user, THE RoomSpace_System SHALL display error "No account found with this email"
8. WHEN the email does not match a registered user, THE RoomSpace_System SHALL not create an invitation record

### Requirement 6: Invitation Duplicate Prevention

**User Story:** As a room owner, I want to prevent duplicate invitations, so that users are not spammed with multiple requests.

#### Acceptance Criteria

1. WHEN an owner attempts to invite an email with a pending invitation, THE RoomSpace_System SHALL display error "Invitation already sent to this user"
2. WHEN an owner attempts to invite an email of an existing member, THE RoomSpace_System SHALL display error "User is already a member"
3. WHEN an owner attempts to invite their own email, THE RoomSpace_System SHALL display error "You cannot invite yourself"
4. THE RoomSpace_System SHALL allow re-invitation after a previous invitation expires or is declined

### Requirement 7: Invitation States and Expiration

**User Story:** As a user, I want invitations to expire after a reasonable time, so that stale invitations do not clutter the system.

#### Acceptance Criteria

1. WHEN an invitation is created, THE RoomSpace_System SHALL set the status to "pending"
2. WHEN an invitation is created, THE RoomSpace_System SHALL set expiration to 7 days from creation
3. WHEN an invited user accepts, THE RoomSpace_System SHALL update status to "accepted"
4. WHEN an invited user declines, THE RoomSpace_System SHALL update status to "declined"
5. WHEN an invitation reaches expiration date, THE RoomSpace_System SHALL update status to "expired"
6. THE RoomSpace_System SHALL run a daily background job to expire pending invitations past their expiration date
7. WHEN an invitation is expired, THE RoomSpace_System SHALL not allow acceptance

### Requirement 8: Invitation Acceptance

**User Story:** As an invited user, I want to accept room invitations, so that I can join collaborative learning rooms.

#### Acceptance Criteria

1. WHEN a user receives an invitation, THE RoomSpace_System SHALL display the invitation in the notifications area
2. THE Invitation notification SHALL display room name, owner name, and accept/decline buttons
3. WHEN a user clicks "Accept", THE RoomSpace_System SHALL verify the invitation is still pending
4. WHEN a user clicks "Accept", THE RoomSpace_System SHALL verify the room has fewer than 5 members
5. WHEN verification passes, THE RoomSpace_System SHALL add the user to room_members with role "member"
6. WHEN verification passes, THE RoomSpace_System SHALL update invitation status to "accepted"
7. WHEN verification passes, THE RoomSpace_System SHALL send notification to the owner stating "User X accepted your invitation"
8. WHEN the room is full during acceptance, THE RoomSpace_System SHALL display error "Room is full" and keep invitation pending

### Requirement 9: Invitation Decline

**User Story:** As an invited user, I want to decline room invitations, so that I can manage which rooms I join.

#### Acceptance Criteria

1. WHEN a user clicks "Decline", THE RoomSpace_System SHALL update invitation status to "declined"
2. WHEN a user declines, THE RoomSpace_System SHALL send notification to the owner stating "User X declined your invitation"
3. WHEN a user declines, THE RoomSpace_System SHALL remove the invitation from the user's notification list
4. THE RoomSpace_System SHALL not add the user to room_members when invitation is declined

### Requirement 10: Owner Privileges - Member Management

**User Story:** As a room owner, I want to remove members from my room, so that I can manage the room composition.

#### Acceptance Criteria

1. THE RoomSpace_System SHALL provide a "Kick Member" button next to each member for the owner
2. WHEN an owner clicks "Kick Member", THE RoomSpace_System SHALL display a confirmation dialog
3. WHEN the owner confirms, THE RoomSpace_System SHALL remove the member from room_members
4. WHEN a member is kicked, THE RoomSpace_System SHALL send notification to the kicked user stating "You were removed from Room X"
5. WHEN a member is kicked, THE RoomSpace_System SHALL retain the user's room XP and streak data with soft delete
6. THE RoomSpace_System SHALL not allow the owner to kick themselves

### Requirement 11: Owner Privileges - Room Deletion

**User Story:** As a room owner, I want to delete my room, so that I can remove rooms I no longer need.

#### Acceptance Criteria

1. THE RoomSpace_System SHALL provide a "Delete Room" button on the room settings page for owners
2. WHEN an owner clicks "Delete Room", THE RoomSpace_System SHALL display a confirmation dialog with warning text
3. THE Confirmation dialog SHALL state "This will permanently delete the room and remove all members"
4. WHEN the owner confirms deletion, THE RoomSpace_System SHALL soft delete the room by setting deleted_at timestamp
5. WHEN a room is deleted, THE RoomSpace_System SHALL send notification to all members stating "Room X was deleted by the owner"
6. WHEN a room is deleted, THE RoomSpace_System SHALL remove the room from all members' room lists
7. THE RoomSpace_System SHALL retain room data including XP and streak records for audit purposes

### Requirement 12: Owner Privileges - Room Details Editing

**User Story:** As a room owner, I want to edit room details, so that I can update room information as needed.

#### Acceptance Criteria

1. THE RoomSpace_System SHALL provide an "Edit Room" button on the room detail page for owners
2. WHEN an owner clicks "Edit Room", THE RoomSpace_System SHALL display an edit form with current room name and description
3. THE Edit form SHALL enforce the same validation as room creation (name 1-50 chars, description 0-200 chars)
4. WHEN the owner submits changes, THE RoomSpace_System SHALL update the room record
5. WHEN the owner submits changes, THE RoomSpace_System SHALL update the updated_at timestamp
6. THE RoomSpace_System SHALL not allow members to edit room details

### Requirement 13: Owner Privileges - Skill Map Management

**User Story:** As a room owner, I want to add skill maps to my room, so that members have content to practice.

#### Acceptance Criteria

1. THE RoomSpace_System SHALL provide an "Add Skill Map" button on the room detail page for owners
2. WHEN an owner clicks "Add Skill Map", THE RoomSpace_System SHALL display two options: "Create New" and "Add from Templates"
3. WHEN an owner selects "Create New", THE RoomSpace_System SHALL display the skill map creation wizard
4. WHEN an owner completes skill map creation, THE RoomSpace_System SHALL create the skill map scoped to the room
5. WHEN an owner selects "Add from Templates", THE RoomSpace_System SHALL display the global template library
6. WHEN an owner selects a template, THE RoomSpace_System SHALL create a room_skill_maps record linking the template to the room
7. THE RoomSpace_System SHALL record the owner's user ID as added_by for each skill map
8. THE RoomSpace_System SHALL allow multiple skill maps per room with no hard limit

### Requirement 14: Member Privileges - View Access

**User Story:** As a room member, I want to view room details and leaderboard, so that I can see my progress and compete with others.

#### Acceptance Criteria

1. WHEN a member accesses a room, THE RoomSpace_System SHALL display room name, description, and member list
2. WHEN a member accesses a room, THE RoomSpace_System SHALL display the room leaderboard
3. WHEN a member accesses a room, THE RoomSpace_System SHALL display all room skill maps
4. THE RoomSpace_System SHALL not display "Edit Room", "Delete Room", or "Kick Member" buttons to members
5. THE RoomSpace_System SHALL display "Leave Room" button to members

### Requirement 15: Member Privileges - Practice Access

**User Story:** As a room member, I want to practice room skill maps, so that I can earn XP and improve my ranking.

#### Acceptance Criteria

1. WHEN a member clicks a room skill map, THE RoomSpace_System SHALL navigate to the skill map practice interface
2. THE RoomSpace_System SHALL track member progress separately for each room skill map
3. WHEN a member completes a node, THE RoomSpace_System SHALL award XP according to the room XP rules
4. THE RoomSpace_System SHALL update the member's room XP total
5. THE RoomSpace_System SHALL update the member's streak if practice occurs on a new day

### Requirement 16: Member Privileges - Leave Room

**User Story:** As a room member, I want to leave a room, so that I can manage my room memberships.

#### Acceptance Criteria

1. WHEN a member clicks "Leave Room", THE RoomSpace_System SHALL display a confirmation dialog
2. WHEN the member confirms, THE RoomSpace_System SHALL remove the member from room_members
3. WHEN a member leaves, THE RoomSpace_System SHALL retain the member's room XP and streak data with soft delete
4. WHEN a member leaves, THE RoomSpace_System SHALL remove the room from the member's room list
5. THE RoomSpace_System SHALL not allow the owner to leave the room using "Leave Room" button

### Requirement 17: Owner Leave Prevention

**User Story:** As a system administrator, I want to prevent owners from leaving their rooms, so that rooms always have an owner.

#### Acceptance Criteria

1. WHEN an owner attempts to click "Leave Room", THE RoomSpace_System SHALL not display the "Leave Room" button
2. THE RoomSpace_System SHALL display message "Owners cannot leave rooms. Delete the room instead."
3. THE RoomSpace_System SHALL only allow owners to remove their ownership by deleting the room

### Requirement 18: Room Skill Map Progress Isolation

**User Story:** As a user, I want my room skill map progress to be separate from my personal progress, so that I can track learning in different contexts.

#### Acceptance Criteria

1. WHEN a user practices a room skill map, THE RoomSpace_System SHALL track progress in a room-specific record
2. WHEN a user practices a personal skill map with the same template, THE RoomSpace_System SHALL track progress in a separate personal record
3. THE RoomSpace_System SHALL not synchronize progress between room skill maps and personal skill maps
4. THE RoomSpace_System SHALL allow a user to have different completion percentages for the same skill map template in different rooms

### Requirement 19: Room XP Separation

**User Story:** As a user, I want room XP to be separate from my global XP, so that room competition does not affect my personal profile.

#### Acceptance Criteria

1. WHEN a user earns XP in a room skill map, THE RoomSpace_System SHALL record the XP in room_xp_ledger
2. THE RoomSpace_System SHALL not add room XP to the user's global XP total
3. THE RoomSpace_System SHALL not add room XP to the user's UserXpProfile
4. THE RoomSpace_System SHALL calculate room XP totals by summing room_xp_ledger entries per user per room
5. THE RoomSpace_System SHALL display room XP separately from global XP on the room leaderboard

### Requirement 20: Room XP Earning Rules

**User Story:** As a room member, I want to earn XP by completing nodes in room skill maps, so that I can compete on the leaderboard.

#### Acceptance Criteria

1. WHEN a member completes a node in a room skill map, THE RoomSpace_System SHALL award XP based on the existing XP calculation rules
2. THE RoomSpace_System SHALL record each XP transaction in room_xp_ledger with room_id, user_id, skill_map_id, xp_amount, and earned_at timestamp
3. THE RoomSpace_System SHALL only award room XP for node completions within room skill maps
4. THE RoomSpace_System SHALL not award room XP for reflections or admin adjustments
5. THE RoomSpace_System SHALL use the same base XP amounts as the global system for consistency

### Requirement 21: Room Leaderboard Display

**User Story:** As a room member, I want to see a leaderboard of all members, so that I can compare my progress with others.

#### Acceptance Criteria

1. THE RoomSpace_System SHALL display a leaderboard on each room detail page
2. THE Leaderboard SHALL display rank, avatar, username, room XP total, and current streak for each member
3. THE RoomSpace_System SHALL sort leaderboard entries by room XP total in descending order
4. WHEN multiple members have the same XP, THE RoomSpace_System SHALL sort by current streak in descending order
5. WHEN multiple members have the same XP and streak, THE RoomSpace_System SHALL sort by username alphabetically
6. THE RoomSpace_System SHALL highlight the current user's row with a distinct background color
7. THE RoomSpace_System SHALL display rank numbers starting from 1 for the highest XP

### Requirement 22: Room Leaderboard Real-Time Updates

**User Story:** As a room member, I want the leaderboard to update near real-time, so that I see current standings.

#### Acceptance Criteria

1. WHEN a member earns XP, THE RoomSpace_System SHALL update the leaderboard within 5 seconds
2. WHEN a member's streak changes, THE RoomSpace_System SHALL update the leaderboard within 5 seconds
3. THE RoomSpace_System SHALL use WebSocket connections for leaderboard updates when available
4. WHEN WebSocket is unavailable, THE RoomSpace_System SHALL poll for leaderboard updates every 30 seconds
5. THE RoomSpace_System SHALL update only the affected room's leaderboard, not all leaderboards

### Requirement 23: Room Streak Tracking

**User Story:** As a room member, I want to maintain a streak for consecutive days of practice, so that I can stay motivated.

#### Acceptance Criteria

1. WHEN a member practices a room skill map, THE RoomSpace_System SHALL check the member's last_activity_date in room_streaks
2. WHEN last_activity_date is yesterday, THE RoomSpace_System SHALL increment current_streak by 1
3. WHEN last_activity_date is today, THE RoomSpace_System SHALL not change current_streak
4. WHEN last_activity_date is more than 1 day ago, THE RoomSpace_System SHALL reset current_streak to 1
5. WHEN current_streak exceeds longest_streak, THE RoomSpace_System SHALL update longest_streak to current_streak
6. THE RoomSpace_System SHALL update last_activity_date to today's date after practice
7. THE RoomSpace_System SHALL track streaks separately for each room per user

### Requirement 24: Weekly Streak Reset

**User Story:** As a system administrator, I want streaks to reset weekly, so that competition remains fresh and engaging.

#### Acceptance Criteria

1. THE RoomSpace_System SHALL reset all room streaks every Monday at 00:00 UTC
2. WHEN the weekly reset occurs, THE RoomSpace_System SHALL set current_streak to 0 for all room_streaks records
3. WHEN the weekly reset occurs, THE RoomSpace_System SHALL retain longest_streak values
4. WHEN the weekly reset occurs, THE RoomSpace_System SHALL retain room XP totals
5. WHEN the weekly reset occurs, THE RoomSpace_System SHALL update last_reset_at timestamp
6. THE RoomSpace_System SHALL run the weekly reset as an automated background job
7. THE RoomSpace_System SHALL log each weekly reset execution for audit purposes

### Requirement 25: Database Schema - room_spaces Table

**User Story:** As a system administrator, I want room data stored persistently, so that rooms are available across sessions.

#### Acceptance Criteria

1. THE RoomSpace_System SHALL store room records in a room_spaces table
2. THE room_spaces table SHALL include id field as UUID primary key
3. THE room_spaces table SHALL include owner_id field as string foreign key to users
4. THE room_spaces table SHALL include name field as string with 1-50 character constraint
5. THE room_spaces table SHALL include description field as nullable string with 0-200 character constraint
6. THE room_spaces table SHALL include created_at field as timestamp
7. THE room_spaces table SHALL include updated_at field as timestamp
8. THE room_spaces table SHALL include deleted_at field as nullable timestamp for soft deletes

### Requirement 26: Database Schema - room_members Table

**User Story:** As a system administrator, I want membership data stored persistently, so that room access is maintained.

#### Acceptance Criteria

1. THE RoomSpace_System SHALL store membership records in a room_members table
2. THE room_members table SHALL include id field as UUID primary key
3. THE room_members table SHALL include room_id field as UUID foreign key to room_spaces
4. THE room_members table SHALL include user_id field as string foreign key to users
5. THE room_members table SHALL include role field as enum with values "owner" and "member"
6. THE room_members table SHALL include joined_at field as timestamp
7. THE room_members table SHALL enforce unique constraint on (room_id, user_id) combination

### Requirement 27: Database Schema - room_invitations Table

**User Story:** As a system administrator, I want invitation data stored persistently, so that invitation states are tracked.

#### Acceptance Criteria

1. THE RoomSpace_System SHALL store invitation records in a room_invitations table
2. THE room_invitations table SHALL include id field as UUID primary key
3. THE room_invitations table SHALL include room_id field as UUID foreign key to room_spaces
4. THE room_invitations table SHALL include invited_by field as string foreign key to users
5. THE room_invitations table SHALL include invited_email field as string
6. THE room_invitations table SHALL include invited_user_id field as nullable string foreign key to users
7. THE room_invitations table SHALL include status field as enum with values "pending", "accepted", "declined", "expired"
8. THE room_invitations table SHALL include expires_at field as timestamp
9. THE room_invitations table SHALL include created_at field as timestamp
10. THE room_invitations table SHALL include updated_at field as timestamp

### Requirement 28: Database Schema - room_skill_maps Table

**User Story:** As a system administrator, I want room skill map associations stored persistently, so that room content is maintained.

#### Acceptance Criteria

1. THE RoomSpace_System SHALL store room skill map records in a room_skill_maps table
2. THE room_skill_maps table SHALL include id field as UUID primary key
3. THE room_skill_maps table SHALL include room_id field as UUID foreign key to room_spaces
4. THE room_skill_maps table SHALL include skill_map_id field as UUID foreign key to skills
5. THE room_skill_maps table SHALL include added_by field as string foreign key to users
6. THE room_skill_maps table SHALL include created_at field as timestamp

### Requirement 29: Database Schema - room_xp_ledger Table

**User Story:** As a system administrator, I want room XP transactions stored persistently, so that XP totals can be calculated accurately.

#### Acceptance Criteria

1. THE RoomSpace_System SHALL store XP transactions in a room_xp_ledger table
2. THE room_xp_ledger table SHALL include id field as UUID primary key
3. THE room_xp_ledger table SHALL include room_id field as UUID foreign key to room_spaces
4. THE room_xp_ledger table SHALL include user_id field as string foreign key to users
5. THE room_xp_ledger table SHALL include skill_map_id field as UUID foreign key to skills
6. THE room_xp_ledger table SHALL include xp_amount field as positive integer
7. THE room_xp_ledger table SHALL include earned_at field as timestamp

### Requirement 30: Database Schema - room_streaks Table

**User Story:** As a system administrator, I want room streak data stored persistently, so that streaks are maintained across sessions.

#### Acceptance Criteria

1. THE RoomSpace_System SHALL store streak records in a room_streaks table
2. THE room_streaks table SHALL include id field as UUID primary key
3. THE room_streaks table SHALL include room_id field as UUID foreign key to room_spaces
4. THE room_streaks table SHALL include user_id field as string foreign key to users
5. THE room_streaks table SHALL include current_streak field as non-negative integer with default 0
6. THE room_streaks table SHALL include longest_streak field as non-negative integer with default 0
7. THE room_streaks table SHALL include last_activity_date field as nullable date
8. THE room_streaks table SHALL include last_reset_at field as nullable timestamp
9. THE room_streaks table SHALL enforce unique constraint on (room_id, user_id) combination

### Requirement 31: Notification System Integration

**User Story:** As a user, I want to receive notifications for room events, so that I stay informed about room activity.

#### Acceptance Criteria

1. THE RoomSpace_System SHALL integrate with the existing notification system
2. THE RoomSpace_System SHALL send in-app notifications for invitation received, invitation accepted, invitation declined, kicked from room, and room deleted events
3. THE RoomSpace_System SHALL send email notifications for invitation received events
4. THE Notification SHALL include room name, actor name, and action description
5. THE RoomSpace_System SHALL mark notifications as read when the user views them
6. THE RoomSpace_System SHALL retain notification history for 30 days

### Requirement 32: UI Design Consistency

**User Story:** As a user, I want RoomSpace to match the existing app design, so that the experience feels cohesive.

#### Acceptance Criteria

1. THE RoomSpace_System SHALL use the existing design system color palette defined in tailwind.config.js
2. THE RoomSpace_System SHALL use the existing component patterns from Sidebar.jsx, Dashboard.jsx, and CreateSkillMapWizard.jsx
3. THE RoomSpace_System SHALL use the existing icon library and styling conventions
4. THE RoomSpace_System SHALL use the existing button, input, and card component styles
5. THE RoomSpace_System SHALL follow the existing responsive layout patterns for mobile and desktop

### Requirement 33: Error Handling - Room Full on Invite

**User Story:** As a room owner, I want clear feedback when inviting to a full room, so that I understand why the invitation failed.

#### Acceptance Criteria

1. WHEN an owner attempts to invite a user to a room with 5 members, THE RoomSpace_System SHALL display error "Room is full (5/5 members)"
2. WHEN an owner attempts to invite a user to a room with 5 members, THE RoomSpace_System SHALL not create an invitation record
3. THE Error message SHALL include suggestion "Remove a member to invite new users"

### Requirement 34: Error Handling - Skill Map Removal

**User Story:** As a room owner, I want to remove skill maps from my room, so that I can manage room content.

#### Acceptance Criteria

1. THE RoomSpace_System SHALL provide a "Remove Skill Map" button next to each skill map for owners
2. WHEN an owner clicks "Remove Skill Map", THE RoomSpace_System SHALL display a confirmation dialog
3. THE Confirmation dialog SHALL state "This will remove the skill map from the room but retain member progress data"
4. WHEN the owner confirms, THE RoomSpace_System SHALL delete the room_skill_maps record
5. WHEN a skill map is removed, THE RoomSpace_System SHALL retain all room_xp_ledger entries for audit purposes
6. WHEN a skill map is removed, THE RoomSpace_System SHALL not delete the underlying skill map template

### Requirement 35: Confirmation Dialogs for Destructive Actions

**User Story:** As a user, I want confirmation prompts for destructive actions, so that I do not accidentally lose data.

#### Acceptance Criteria

1. THE RoomSpace_System SHALL display confirmation dialogs for "Delete Room", "Kick Member", "Remove Skill Map", and "Leave Room" actions
2. THE Confirmation dialog SHALL include action description and consequences
3. THE Confirmation dialog SHALL include "Cancel" and "Confirm" buttons
4. WHEN a user clicks "Cancel", THE RoomSpace_System SHALL close the dialog without performing the action
5. WHEN a user clicks "Confirm", THE RoomSpace_System SHALL perform the action and close the dialog

### Requirement 36: Optional Weekly Streak Reset Reminder Notification

**User Story:** As a room member, I want to receive a reminder before weekly streak reset, so that I can maintain my streak.

#### Acceptance Criteria

1. WHERE weekly reminder is enabled, THE RoomSpace_System SHALL send notification to all room members on Sunday at 20:00 UTC
2. WHERE weekly reminder is enabled, THE Notification SHALL state "Streaks reset in 4 hours! Practice now to maintain your streak."
3. WHERE weekly reminder is enabled, THE RoomSpace_System SHALL send the notification as in-app notification only
4. THE RoomSpace_System SHALL make the weekly reminder feature optional for future implementation
