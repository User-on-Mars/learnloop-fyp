# Requirements Document

## Introduction

The Skill Map Progression feature is a gamified learning progression system that enables users to create skills with sequential nodes (2-16 nodes per skill). Nodes unlock sequentially as previous nodes are completed, displayed in a zig-zag visual path from START to GOAL. The system integrates with existing practice session, reflection, and blocker features to provide a structured learning journey.

## Glossary

- **Skill_Map_System**: The complete gamified learning progression system
- **Skill**: A learning objective containing 2-16 sequential nodes
- **Node**: A single step in a skill's progression path with title, description, status, and order
- **START_Node**: The first node in a skill, always unlocked by default
- **GOAL_Node**: The final node in a skill, unlocks when all other nodes are completed
- **Practice_Session**: A timed learning session linked to a specific node
- **Reflection**: User-created note about learning experience, linked to a session
- **Blocker**: User-reported obstacle or challenge, linked to a session
- **Node_Status**: The current state of a node (Locked, Unlocked, In_Progress, Completed)
- **Progression_Path**: The sequential zig-zag visual display of all nodes in a skill
- **Session_Manager**: Existing system component that handles practice session timing and tracking

## Requirements

### Requirement 1: Create Skill with Node Configuration

**User Story:** As a learner, I want to create a new skill with a specified number of nodes, so that I can structure my learning path.

#### Acceptance Criteria

1. WHEN a user creates a skill, THE Skill_Map_System SHALL accept a skill name with 1 to 100 characters
2. WHEN a user creates a skill, THE Skill_Map_System SHALL accept a node count between 2 and 16 inclusive
3. WHEN a skill is created, THE Skill_Map_System SHALL generate exactly the specified number of nodes
4. WHEN nodes are generated, THE Skill_Map_System SHALL designate the first node as START_Node with status Unlocked
5. WHEN nodes are generated, THE Skill_Map_System SHALL designate the last node as GOAL_Node with status Locked
6. WHEN nodes are generated, THE Skill_Map_System SHALL set all middle nodes to status Locked
7. WHEN nodes are generated, THE Skill_Map_System SHALL assign sequential order numbers from 1 to N where N is the node count
8. WHEN a skill is created, THE Skill_Map_System SHALL persist the skill and all nodes to the database
9. IF a skill name exceeds 100 characters, THEN THE Skill_Map_System SHALL return an error message
10. IF a node count is less than 2 or greater than 16, THEN THE Skill_Map_System SHALL return an error message

### Requirement 2: Display Skill List

**User Story:** As a learner, I want to view all my skills with progress indicators, so that I can track my learning journey.

#### Acceptance Criteria

1. THE Skill_Map_System SHALL display all skills belonging to the authenticated user
2. FOR EACH skill displayed, THE Skill_Map_System SHALL show the skill name
3. FOR EACH skill displayed, THE Skill_Map_System SHALL calculate and show completion progress as "X/Y nodes completed" where X is completed nodes and Y is total nodes
4. FOR EACH skill displayed, THE Skill_Map_System SHALL calculate and show completion percentage
5. WHEN a user clicks a skill, THE Skill_Map_System SHALL navigate to the Progression_Path view for that skill
6. THE Skill_Map_System SHALL sort skills by creation date with newest first

### Requirement 3: Delete Skill

**User Story:** As a learner, I want to delete a skill I no longer need, so that I can keep my skill list organized.

#### Acceptance Criteria

1. WHEN a user requests to delete a skill, THE Skill_Map_System SHALL prompt for confirmation
2. WHEN deletion is confirmed, THE Skill_Map_System SHALL remove the skill from the database
3. WHEN a skill is deleted, THE Skill_Map_System SHALL remove all associated nodes from the database
4. WHEN a skill is deleted, THE Skill_Map_System SHALL remove all links between Practice_Sessions and the deleted nodes
5. WHEN a skill is deleted, THE Skill_Map_System SHALL preserve the Practice_Sessions, Reflections, and Blockers in the database
6. WHEN deletion completes, THE Skill_Map_System SHALL refresh the skill list view

### Requirement 4: Display Progression Path

**User Story:** As a learner, I want to see a visual zig-zag path of all nodes in a skill, so that I can understand my progression journey.

#### Acceptance Criteria

1. WHEN a user opens a skill, THE Skill_Map_System SHALL display all nodes in sequential order
2. THE Skill_Map_System SHALL arrange nodes in a zig-zag pattern alternating left and right positions
3. THE Skill_Map_System SHALL display connecting lines between consecutive nodes
4. FOR EACH node with status Locked, THE Skill_Map_System SHALL display a lock icon
5. FOR EACH node with status Completed, THE Skill_Map_System SHALL display a checkmark icon
6. THE Skill_Map_System SHALL display "START" label on the first node
7. THE Skill_Map_System SHALL display "GOAL" label on the last node
8. THE Skill_Map_System SHALL display a progress bar showing completion percentage at the top of the view
9. THE Skill_Map_System SHALL provide a back button to return to the skill list
10. WHEN a user clicks an Unlocked, In_Progress, or Completed node, THE Skill_Map_System SHALL open the node detail modal
11. WHEN a user clicks a Locked node, THE Skill_Map_System SHALL display a message indicating the node is locked

### Requirement 5: Node Status Transitions

**User Story:** As a learner, I want nodes to unlock sequentially as I complete them, so that I can progress through my learning path.

#### Acceptance Criteria

1. WHEN a node with status Unlocked or In_Progress is marked Completed, THE Skill_Map_System SHALL change the node status to Completed
2. WHEN a node is marked Completed, THE Skill_Map_System SHALL identify the next node in sequential order
3. WHEN the next node exists and has status Locked, THE Skill_Map_System SHALL change the next node status to Unlocked
4. WHEN the GOAL_Node is the next node and all other nodes have status Completed, THE Skill_Map_System SHALL change GOAL_Node status to Unlocked
5. THE Skill_Map_System SHALL prevent changing a node status from Locked to In_Progress or Completed
6. THE Skill_Map_System SHALL allow changing a node status from Unlocked to In_Progress
7. THE Skill_Map_System SHALL allow changing a node status from In_Progress to Completed
8. THE Skill_Map_System SHALL allow changing a node status from Completed back to In_Progress or Unlocked
9. WHEN a node status changes, THE Skill_Map_System SHALL update the skill completion progress

### Requirement 6: Start Practice Session from Node

**User Story:** As a learner, I want to start a practice session from an unlocked node, so that I can work on that specific learning step.

#### Acceptance Criteria

1. WHEN a user views a node with status Unlocked or In_Progress, THE Skill_Map_System SHALL display a "Start Practice Session" button
2. WHEN a user clicks "Start Practice Session", THE Skill_Map_System SHALL invoke the Session_Manager to start a new timed session
3. WHEN a Practice_Session starts, THE Skill_Map_System SHALL link the session to the specific node
4. WHEN a Practice_Session starts and the node status is Unlocked, THE Skill_Map_System SHALL change the node status to In_Progress
5. WHEN a user views a node with status Locked or Completed, THE Skill_Map_System SHALL not display the "Start Practice Session" button

### Requirement 7: Session Completion Workflow

**User Story:** As a learner, I want to be prompted to add reflections and report blockers after a session ends, so that I can capture my learning insights.

#### Acceptance Criteria

1. WHEN a Practice_Session linked to a node ends, THE Skill_Map_System SHALL display a session completion prompt
2. THE Skill_Map_System SHALL provide an option to add a Reflection with the prompt pre-linked to the node
3. THE Skill_Map_System SHALL provide an option to report a Blocker with the prompt pre-linked to the node
4. THE Skill_Map_System SHALL allow the user to skip adding Reflection or Blocker
5. WHEN a user adds a Reflection, THE Skill_Map_System SHALL link the Reflection to both the Practice_Session and the node
6. WHEN a user reports a Blocker, THE Skill_Map_System SHALL link the Blocker to both the Practice_Session and the node
7. WHEN the user completes or skips the prompts, THE Skill_Map_System SHALL close the session completion prompt

### Requirement 8: View Node Details

**User Story:** As a learner, I want to view detailed information about a node, so that I can see my progress and linked content.

#### Acceptance Criteria

1. WHEN a user opens a node detail modal, THE Skill_Map_System SHALL display the node title
2. WHEN a user opens a node detail modal, THE Skill_Map_System SHALL display the node description
3. WHEN a user opens a node detail modal, THE Skill_Map_System SHALL display the current node status
4. WHEN a user opens a node detail modal, THE Skill_Map_System SHALL display the node order number
5. WHEN a user opens a node detail modal, THE Skill_Map_System SHALL display a list of all Practice_Sessions linked to the node
6. FOR EACH Practice_Session displayed, THE Skill_Map_System SHALL show the session duration and date
7. WHEN a user opens a node detail modal, THE Skill_Map_System SHALL display all Reflections linked to the node
8. WHEN a user opens a node detail modal, THE Skill_Map_System SHALL display all Blockers linked to the node
9. THE Skill_Map_System SHALL provide a close button to dismiss the node detail modal

### Requirement 9: Edit Node Content

**User Story:** As a learner, I want to edit a node's title and description, so that I can refine my learning objectives.

#### Acceptance Criteria

1. WHEN a user views a node with status Unlocked, In_Progress, or Completed, THE Skill_Map_System SHALL provide an edit option
2. WHEN a user edits a node, THE Skill_Map_System SHALL allow modification of the node title up to 200 characters
3. WHEN a user edits a node, THE Skill_Map_System SHALL allow modification of the node description up to 2000 characters
4. WHEN a user saves node edits, THE Skill_Map_System SHALL persist the changes to the database
5. THE Skill_Map_System SHALL prevent editing nodes with status Locked
6. IF a node title exceeds 200 characters, THEN THE Skill_Map_System SHALL return an error message
7. IF a node description exceeds 2000 characters, THEN THE Skill_Map_System SHALL return an error message

### Requirement 10: Manual Node Status Management

**User Story:** As a learner, I want to manually change a node's status, so that I can control my progression through the skill.

#### Acceptance Criteria

1. WHEN a user views a node with status Unlocked, THE Skill_Map_System SHALL provide options to change status to In_Progress or Completed
2. WHEN a user views a node with status In_Progress, THE Skill_Map_System SHALL provide options to change status to Unlocked or Completed
3. WHEN a user views a node with status Completed, THE Skill_Map_System SHALL provide options to change status to Unlocked or In_Progress
4. WHEN a user changes node status, THE Skill_Map_System SHALL apply the status transition rules from Requirement 5
5. THE Skill_Map_System SHALL prevent manual status changes to Locked nodes
6. THE Skill_Map_System SHALL prevent manual status changes that would violate sequential progression rules

### Requirement 11: Delete Node

**User Story:** As a learner, I want to delete a node that has no logged sessions, so that I can restructure my skill path.

#### Acceptance Criteria

1. WHEN a user requests to delete a node with zero linked Practice_Sessions, THE Skill_Map_System SHALL prompt for confirmation
2. WHEN deletion is confirmed, THE Skill_Map_System SHALL remove the node from the database
3. WHEN a node is deleted, THE Skill_Map_System SHALL recalculate order numbers for remaining nodes to maintain sequential numbering
4. WHEN a node is deleted, THE Skill_Map_System SHALL update the skill's total node count
5. IF a user requests to delete a node with one or more linked Practice_Sessions, THEN THE Skill_Map_System SHALL display an error message and prevent deletion
6. THE Skill_Map_System SHALL prevent deletion of START_Node or GOAL_Node
7. IF deleting a node would result in fewer than 2 nodes, THEN THE Skill_Map_System SHALL display an error message and prevent deletion

### Requirement 12: Responsive Visual Design

**User Story:** As a learner, I want the skill map to work on mobile and desktop devices, so that I can access my learning path anywhere.

#### Acceptance Criteria

1. THE Skill_Map_System SHALL render the Progression_Path view on screens with width 320 pixels or greater
2. WHEN screen width is less than 768 pixels, THE Skill_Map_System SHALL adjust the zig-zag pattern for mobile viewing
3. WHEN screen width is less than 768 pixels, THE Skill_Map_System SHALL adjust node size and spacing for touch interaction
4. THE Skill_Map_System SHALL ensure all interactive elements have minimum touch target size of 44x44 pixels on mobile devices
5. THE Skill_Map_System SHALL maintain visual hierarchy and readability across all supported screen sizes

### Requirement 13: Real-Time Status Updates

**User Story:** As a learner, I want to see immediate updates when node status changes, so that I have accurate progression information.

#### Acceptance Criteria

1. WHEN a node status changes, THE Skill_Map_System SHALL update the visual display within 500 milliseconds
2. WHEN a node is marked Completed, THE Skill_Map_System SHALL update the next node's visual state within 500 milliseconds
3. WHEN a Practice_Session is linked to a node, THE Skill_Map_System SHALL update the node detail view within 500 milliseconds
4. WHEN skill completion progress changes, THE Skill_Map_System SHALL update the progress bar within 500 milliseconds
5. THE Skill_Map_System SHALL update the skill list progress indicators within 500 milliseconds of any node status change

### Requirement 14: Data Persistence and Integrity

**User Story:** As a learner, I want my skill map data to be reliably saved, so that I don't lose my progress.

#### Acceptance Criteria

1. WHEN any skill or node data changes, THE Skill_Map_System SHALL persist the changes to MongoDB within 1000 milliseconds
2. THE Skill_Map_System SHALL maintain referential integrity between skills and nodes
3. THE Skill_Map_System SHALL maintain referential integrity between nodes and Practice_Sessions
4. IF a database write operation fails, THEN THE Skill_Map_System SHALL display an error message to the user
5. IF a database write operation fails, THEN THE Skill_Map_System SHALL log the error with timestamp and user context
6. WHEN a user reloads the application, THE Skill_Map_System SHALL retrieve and display the most recent saved state

### Requirement 15: Integration with Existing Systems

**User Story:** As a learner, I want the skill map to work seamlessly with my existing practice sessions, reflections, and blockers, so that all my learning data is connected.

#### Acceptance Criteria

1. THE Skill_Map_System SHALL use the existing Session_Manager API to start and track Practice_Sessions
2. THE Skill_Map_System SHALL use the existing Reflection system API to create and retrieve Reflections
3. THE Skill_Map_System SHALL use the existing Blocker system API to create and retrieve Blockers
4. WHEN linking a Practice_Session to a node, THE Skill_Map_System SHALL store the node identifier in the Practice_Session record
5. WHEN linking a Reflection to a node, THE Skill_Map_System SHALL store the node identifier in the Reflection record
6. WHEN linking a Blocker to a node, THE Skill_Map_System SHALL store the node identifier in the Blocker record
7. THE Skill_Map_System SHALL retrieve Practice_Sessions, Reflections, and Blockers using the node identifier as a query parameter
