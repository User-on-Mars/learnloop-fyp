   # Requirements Document

## Introduction

The Dashboard Design feature provides users with a comprehensive, personalized overview of their learning progress and activities within the LearnLoop application. The dashboard serves as the primary landing page after authentication, displaying key metrics, recent activities, and quick access to core functionality. It enables users to monitor their skill development, track practice sessions, review reflections, and identify blockers in their learning journey.

## Glossary

- **Dashboard**: The main landing page that displays an overview of user learning activities and progress
- **Skill Progress Card**: A visual component displaying the user's progress toward skill mastery using a progress ring and numerical indicators
- **Activity Log**: A chronological record of user actions including practice time and notes added
- **Quick Actions**: Shortcut buttons providing immediate access to frequently used features
- **Performance Chart**: A visual representation of weekly learning metrics
- **Reflections Feed**: A list of recent user reflections on their learning experiences
- **Blockers Summary**: An overview of obstacles or challenges the user has encountered
- **Sidebar Navigation**: A persistent navigation menu with icons for accessing different sections of the application
- **User Profile Section**: A component in the sidebar displaying the authenticated user's identity information including name, email, and avatar
- **Practice Session**: A timed learning activity logged by the user
- **Blocker**: An obstacle or challenge that impedes learning progress
- **Reflection**: A user's written thoughts or insights about their learning experience

## Requirements

### Requirement 1

**User Story:** As a learner, I want to see a personalized greeting when I access the dashboard, so that I feel welcomed and the experience feels tailored to me

#### Acceptance Criteria

1. WHEN the Dashboard loads, THE Dashboard SHALL display a greeting message containing the authenticated user's name
2. THE Dashboard SHALL retrieve the user's display name from the authentication system
3. IF the user's name is unavailable, THEN THE Dashboard SHALL display a generic greeting message

### Requirement 2

**User Story:** As a learner, I want to view my skill progress at a glance, so that I can quickly understand how far I've advanced in my learning goals

#### Acceptance Criteria

1. THE Dashboard SHALL display a Skill Progress Card containing a circular progress indicator
2. THE Skill Progress Card SHALL show numerical progress metrics including percentage completion
3. THE Dashboard SHALL calculate progress based on completed practice sessions and logged activities
4. THE Skill Progress Card SHALL update in real-time when new progress data becomes available

### Requirement 3

**User Story:** As a learner, I want to see today's activity summary, so that I can track what I've accomplished during the current day

#### Acceptance Criteria

1. THE Dashboard SHALL display an Activity Log section showing today's activities
2. THE Activity Log SHALL show the total minutes practiced during the current day
3. THE Activity Log SHALL show the count of notes added during the current day
4. THE Dashboard SHALL filter activities to include only those with timestamps from the current calendar day

### Requirement 4

**User Story:** As a learner, I want quick access buttons for common actions, so that I can efficiently log my learning activities without navigating through multiple pages

#### Acceptance Criteria

1. THE Dashboard SHALL display a Quick Actions section containing action buttons
2. THE Quick Actions section SHALL include a button labeled "Log Practice"
3. THE Quick Actions section SHALL include a button labeled "Add Reflection"
4. THE Quick Actions section SHALL include a button labeled "Log Blocker"
5. WHEN a user clicks a Quick Action button, THE Dashboard SHALL navigate to the corresponding feature or display the appropriate input form

### Requirement 5

**User Story:** As a learner, I want to view my weekly performance trends, so that I can identify patterns in my learning habits and adjust my approach accordingly

#### Acceptance Criteria

1. THE Dashboard SHALL display a Weekly Performance Chart showing learning metrics over the past seven days
2. THE Weekly Performance Chart SHALL visualize practice time data using a line or bar chart format
3. THE Weekly Performance Chart SHALL label each day of the week on the horizontal axis
4. THE Weekly Performance Chart SHALL display metric values on the vertical axis with appropriate scale
5. THE Dashboard SHALL aggregate user activity data by day to populate the chart

### Requirement 6

**User Story:** As a learner, I want to see my recent reflections on the dashboard, so that I can quickly review my latest thoughts and insights without navigating away

#### Acceptance Criteria

1. THE Dashboard SHALL display a Recent Reflections Feed section
2. THE Recent Reflections Feed SHALL show the most recent reflection entries in reverse chronological order
3. THE Recent Reflections Feed SHALL limit the display to a maximum of five reflection entries
4. WHEN a user clicks on a reflection entry, THE Dashboard SHALL navigate to the full reflection details

### Requirement 7

**User Story:** As a learner, I want to see a summary of my current blockers, so that I remain aware of obstacles I need to address in my learning journey

#### Acceptance Criteria

1. THE Dashboard SHALL display a Blockers Summary section
2. THE Blockers Summary SHALL show active blockers that have not been marked as resolved
3. THE Blockers Summary SHALL display the count of active blockers
4. WHEN a user clicks on the Blockers Summary, THE Dashboard SHALL navigate to the detailed blockers view

### Requirement 8

**User Story:** As a learner, I want a persistent sidebar navigation, so that I can easily access different sections of the application from any page

#### Acceptance Criteria

1. THE Dashboard SHALL display a Sidebar Navigation component that remains visible while scrolling
2. THE Sidebar Navigation SHALL include icon-based navigation items for Dashboard, Practice, Reflections, Blockers, Skill Map, Recap, and Settings
3. WHEN a user clicks a navigation item, THE Dashboard SHALL navigate to the corresponding section
4. THE Sidebar Navigation SHALL highlight the currently active section
5. THE Sidebar Navigation SHALL maintain a fixed position on the left side of the viewport

### Requirement 9

**User Story:** As a learner, I want to see my profile information in the sidebar, so that I can quickly identify my account and access profile-related actions

#### Acceptance Criteria

1. THE Sidebar Navigation SHALL display a user profile section above the logout button
2. THE user profile section SHALL show the authenticated user's display name
3. THE user profile section SHALL show the authenticated user's email address
4. THE user profile section SHALL display a user avatar or initials-based placeholder
5. IF the user's display name is unavailable, THEN THE Sidebar Navigation SHALL display the email address as the primary identifier

### Requirement 10

**User Story:** As a learner, I want the dashboard to have consistent visual design, so that the interface feels cohesive and professional

#### Acceptance Criteria

1. THE Dashboard SHALL apply consistent padding values to all card components
2. THE Dashboard SHALL apply consistent spacing between dashboard sections
3. THE Dashboard SHALL use a card-based layout for grouping related information
4. THE Dashboard SHALL apply consistent border radius, shadow, and background styling to all cards
5. THE Dashboard SHALL maintain visual hierarchy through consistent typography sizing and weight
