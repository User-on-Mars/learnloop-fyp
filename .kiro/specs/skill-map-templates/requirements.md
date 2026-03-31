# Requirements Document

## Introduction

The Skill Map Templates feature provides five pre-built skill map templates that users can select to quickly create a new skill map with pre-defined nodes, titles, descriptions, icons, goals, and pre-built learning sessions. Instead of building a skill map from scratch using the CreateSkillMapWizard, users can browse a template gallery, preview template contents, and apply a template to instantly generate a fully populated skill map with sessions ready to start. Templates cover common learning domains and serve as starting points. Once applied, a template creates a real, user-specific skill map in the database that the user can edit like any normal skill map. Only the template the user selects is created — the other templates remain available in the gallery but do not appear on the user's skill map list.

## Glossary

- **Template**: A read-only, pre-defined skill map blueprint containing a title, description, icon, goal, an ordered list of Node_Definitions, and Session_Definitions for each node
- **Template_Gallery**: A UI component that displays all available Templates as selectable cards for the user to browse
- **Node_Definition**: A pre-defined node within a Template, consisting of a title, description, and a list of Session_Definitions
- **Session_Definition**: A pre-defined learning session within a Node_Definition, consisting of a title and description, used to auto-create sessions when a Template is applied
- **Template_Preview**: A UI component that shows the full details of a selected Template including all Node_Definitions and Session_Definitions before the user applies the Template
- **Skill_Map**: A user-created learning plan consisting of ordered nodes representing topics to learn
- **Node**: A single learning topic within a Skill_Map, having a title, description, status, and sequential order
- **Active_Session**: A practice session displayed on the LogPractice page that the user can start, pause, and complete
- **Active_Sessions_List**: The section on the LogPractice page that displays all Active_Sessions for the current user
- **CreateSkillMapWizard**: The existing multi-step wizard component used to create skill maps from scratch
- **SkillService**: The backend service responsible for creating and managing skill maps and their nodes

## Requirements

### Requirement 1: Template Data Definition

**User Story:** As a developer, I want templates defined as structured data, so that the application can render and apply them consistently.

#### Acceptance Criteria

1. THE Template SHALL contain a title (1-30 characters), a description (0-120 characters), an icon identifier, a goal (1-16 characters), and an ordered list of Node_Definitions
2. THE Template SHALL contain between 2 and 15 Node_Definitions
3. EACH Node_Definition SHALL contain a title (1-16 characters), a description (0-2000 characters), and a list of Session_Definitions
4. EACH Session_Definition SHALL contain a title (1-100 characters) and a description (0-500 characters)
5. EACH Node_Definition SHALL contain at least one Session_Definition
6. THE Template SHALL have a unique identifier string for referencing
7. FOR ALL Templates, serializing a Template to JSON then parsing the JSON back SHALL produce an equivalent Template object (round-trip property)

### Requirement 2: Five Pre-Built Templates

**User Story:** As a learner, I want a selection of templates covering different skill domains, so that I can quickly start learning without designing a skill map from scratch.

#### Acceptance Criteria

1. THE Template_Gallery SHALL contain exactly five Templates
2. THE Template_Gallery SHALL include a Template for web development fundamentals
3. THE Template_Gallery SHALL include a Template for a musical instrument practice path
4. THE Template_Gallery SHALL include a Template for a spoken language learning path
5. THE Template_Gallery SHALL include a Template for a data science or analytics learning path
6. THE Template_Gallery SHALL include a Template for a design or creative skills learning path
7. EACH Template SHALL contain between 4 and 8 Node_Definitions representing a logical learning progression from beginner to intermediate concepts

### Requirement 3: Template Gallery Display

**User Story:** As a learner, I want to browse available templates in a visual gallery, so that I can find a template that matches my learning goal.

#### Acceptance Criteria

1. THE Template_Gallery SHALL be accessible from the skill map creation flow as an alternative to the CreateSkillMapWizard
2. THE Template_Gallery SHALL display each Template as a card showing the Template icon, title, description, and node count
3. WHEN the user selects a Template card, THE Template_Gallery SHALL display the Template_Preview for that Template
4. THE Template_Gallery SHALL display a button or link to switch to the CreateSkillMapWizard for users who prefer to create a skill map from scratch

### Requirement 4: Template Preview

**User Story:** As a learner, I want to preview a template before applying it, so that I can verify the template content matches my learning needs.

#### Acceptance Criteria

1. THE Template_Preview SHALL display the Template title, description, icon, and goal
2. THE Template_Preview SHALL display all Node_Definitions in order with their titles and descriptions
3. THE Template_Preview SHALL display the Session_Definitions for each Node_Definition, showing session titles and descriptions
4. THE Template_Preview SHALL display an "Use this template" action to apply the Template
5. THE Template_Preview SHALL display a "Back" action to return to the Template_Gallery
6. THE Template_Preview SHALL display the total number of nodes and total number of sessions in the Template

### Requirement 5: Template Application and Skill Map Creation

**User Story:** As a learner, I want to apply a template to create a new skill map, so that I get a fully populated skill map with sessions ready to practice without manual setup.

#### Acceptance Criteria

1. WHEN the user applies a Template, THE SkillService SHALL create a new Skill_Map using the Template title, description, icon, and goal, owned by the applying user only
2. WHEN the user applies a Template, THE SkillService SHALL create Node records for each Node_Definition in the Template, preserving the defined order
3. WHEN the user applies a Template, THE SkillService SHALL set the first Node status to Unlocked and all subsequent Node statuses to Locked
4. IF a Skill_Map with the same title already exists for the user, THEN THE SkillService SHALL append a numeric suffix to the title to ensure uniqueness (e.g., "Web Dev Basics (2)")
5. WHEN the Template is applied successfully, THE Template_Gallery SHALL navigate the user to the newly created Skill_Map view
6. IF the Template application fails due to a server error, THEN THE Template_Gallery SHALL display an error message and allow the user to retry
7. WHEN the user applies a Template, THE SkillService SHALL create only the selected Template as a Skill_Map; the remaining Templates SHALL remain in the gallery and SHALL NOT appear on the user's skill map list

### Requirement 6: Pre-Built Session Auto-Creation

**User Story:** As a learner, I want sessions to be automatically created when I apply a template, so that I can start practicing immediately without manually creating sessions for each node.

#### Acceptance Criteria

1. WHEN the user applies a Template, THE SkillService SHALL create Active_Session records for each Session_Definition in each Node_Definition of the Template
2. EACH auto-created Active_Session SHALL have the title and description from the corresponding Session_Definition
3. EACH auto-created Active_Session SHALL be associated with the correct Node and Skill_Map created from the Template
4. EACH auto-created Active_Session SHALL be owned by the applying user only
5. THE auto-created Active_Sessions SHALL appear in the Active_Sessions_List on the LogPractice page after Template application
6. FOR user-created (non-template) Skill_Maps, THE SkillService SHALL continue to require users to create sessions manually one at a time (existing behavior unchanged)

### Requirement 7: Template-Created Skill Map Editability

**User Story:** As a learner, I want to edit a skill map created from a template just like any normal skill map, so that I can customize it to my specific learning needs.

#### Acceptance Criteria

1. WHEN a Skill_Map is created from a Template, THE Skill_Map SHALL be fully editable by the owning user
2. THE user SHALL be able to rename nodes on a template-created Skill_Map using the same editing interface as regular Skill_Maps
3. THE user SHALL be able to change node descriptions on a template-created Skill_Map using the same editing interface as regular Skill_Maps
4. THE user SHALL be able to add new nodes to a template-created Skill_Map using the same interface as regular Skill_Maps
5. THE user SHALL be able to remove nodes from a template-created Skill_Map using the same interface as regular Skill_Maps
6. THE user SHALL be able to rename the Skill_Map title, description, icon, and goal on a template-created Skill_Map using the same editing interface as regular Skill_Maps

### Requirement 8: Progress and Completion Tracking

**User Story:** As a learner, I want progress and completion tracking to work the same on template-created skill maps as on regular skill maps, so that my learning progress is tracked consistently.

#### Acceptance Criteria

1. THE progress calculation for a template-created Skill_Map SHALL use the same formula as regular Skill_Maps (completed nodes divided by total nodes)
2. WHEN a user completes a Node on a template-created Skill_Map, THE SkillService SHALL unlock the next Node using the same auto-unlock logic as regular Skill_Maps
3. THE Dashboard SHALL display template-created Skill_Maps with the same progress indicators and completion percentages as regular Skill_Maps
4. THE template-created Skill_Map SHALL support the same session lifecycle (start, pause, complete, abandon) as regular Skill_Maps

### Requirement 9: Active Session Pagination on LogPractice Page

**User Story:** As a learner, I want to see all my active sessions on the LogPractice page with pagination, so that I can manage sessions even when templates create many sessions at once.

#### Acceptance Criteria

1. THE Active_Sessions_List on the LogPractice page SHALL support pagination when the number of Active_Sessions exceeds the display limit per page
2. THE Active_Sessions_List SHALL display pagination controls (next page, previous page, and current page indicator) when multiple pages of Active_Sessions exist
3. THE Active_Sessions_List SHALL display a configurable number of Active_Sessions per page
4. WHEN the user navigates between pages, THE Active_Sessions_List SHALL update to show the corresponding Active_Sessions without a full page reload

### Requirement 10: Active Session Display Limit Expansion

**User Story:** As a learner, I want the active session limit to accommodate template-created sessions, so that I can have all my template sessions available without hitting an artificial cap.

#### Acceptance Criteria

1. THE LogPractice page SHALL remove the existing 6-session hard limit on the number of Active_Sessions a user can have
2. THE LogPractice page SHALL allow users to create and maintain more than 6 Active_Sessions simultaneously
3. WHEN a Template is applied and creates multiple Active_Sessions, THE LogPractice page SHALL display all created sessions through the paginated Active_Sessions_List
4. THE Active_Sessions_List SHALL display the total count of Active_Sessions to the user

### Requirement 11: Template Data Integrity

**User Story:** As a developer, I want template data to conform to existing model constraints, so that template-created skill maps are indistinguishable from manually created ones.

#### Acceptance Criteria

1. THE Template title SHALL conform to the Skill model name constraint of 1-30 characters
2. THE Template description SHALL conform to the Skill model description constraint of 0-120 characters
3. THE Template goal SHALL conform to the Skill model goal constraint of 1-16 characters
4. EACH Node_Definition title SHALL conform to the Node model title constraint of 1-16 characters
5. EACH Node_Definition description SHALL conform to the Node model description constraint of 0-2000 characters
6. THE Template icon SHALL reference a valid icon identifier from the existing icon library
7. FOR ALL Templates, applying a Template SHALL produce a Skill_Map and Nodes that pass the same validation rules as skill maps created through the CreateSkillMapWizard

### Requirement 12: Loading and Error States

**User Story:** As a learner, I want clear feedback during template browsing and application, so that I understand the current state of the interface.

#### Acceptance Criteria

1. WHILE a Template is being applied (including session auto-creation), THE Template_Gallery SHALL display a loading indicator and disable the apply action to prevent duplicate submissions
2. IF the Template data fails to load, THEN THE Template_Gallery SHALL display an error message with a retry option
3. WHILE the Template_Gallery is loading, THE Template_Gallery SHALL display a loading skeleton or spinner
4. IF session auto-creation partially fails during Template application, THEN THE SkillService SHALL roll back the entire operation (Skill_Map, Nodes, and Sessions) and display an error message
