# Implementation Plan

- [x] 1. Set up dashboard layout structure and navigation









  - Create the main dashboard layout with sidebar and content area using Tailwind grid/flex
  - Implement responsive breakpoints for mobile, tablet, and desktop views
  - _Requirements: 1.1, 8.1, 8.5, 9.1, 9.2, 9.3_

- [x] 1.1 Create Sidebar Navigation component



  - Build `frontend/src/components/Sidebar.jsx` with navigation items array
  - Implement icon placeholders for each nav item (Dashboard, Practice, Reflections, Blockers, Skill Map, Recap, Settings)
  - Add active state highlighting using React Router's useLocation hook
  - Apply sticky positioning and styling with Tailwind classes
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 1.3 Add User Profile Section to Sidebar



  - Integrate user profile section into `frontend/src/components/Sidebar.jsx` above the logout button
  - Retrieve user data (displayName, email, photoURL) from Firebase auth context
  - Implement avatar display with photo or initials-based fallback
  - Display user's display name with truncation for long names
  - Display user's email address in secondary text style
  - Apply styling with gray background, rounded corners, and proper spacing
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 1.2 Update Dashboard page layout



  - Modify `frontend/src/pages/Dashboard.jsx` to use two-column layout (sidebar + main content)
  - Add responsive grid container for dashboard cards
  - Remove existing placeholder content
  - _Requirements: 9.1, 9.2, 9.3_

- [x] 2. Implement personalized greeting and header section





  - Create `frontend/src/components/DashboardGreeting.jsx` component
  - Retrieve user display name from Firebase auth using useAuth hook
  - Display "Welcome back, [Name]" with fallback to generic greeting
  - Style header section with appropriate typography
  - _Requirements: 1.1, 1.2, 1.3, 9.5_

- [x] 3. Build Skill Progress Card component





  - Create `frontend/src/components/SkillProgressCard.jsx` with circular progress indicator
  - Implement SVG-based progress ring or CSS conic-gradient for visual progress
  - Display percentage, completed skills, total skills, and hours logged
  - Add loading skeleton state for data fetching
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 9.3, 9.4_

- [x] 4. Build Today's Activity Card component





  - Create `frontend/src/components/TodayActivityCard.jsx` showing daily metrics
  - Display minutes practiced and notes added with icons
  - Implement two-column grid layout for metrics
  - Add subtle animation for value updates using CSS transitions
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 9.3, 9.4_

- [x] 5. Implement Quick Actions section




  - Create `frontend/src/components/QuickActions.jsx` with three action buttons
  - Add "Log Practice", "Add Reflection", and "Log Blocker" buttons using existing Button component
  - Implement click handlers that navigate to appropriate routes or open modals
  - Make layout responsive (horizontal on desktop, stacked on mobile)
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 9.3_

- [ ] 6. Create Weekly Performance Chart component
  - Create `frontend/src/components/WeeklyPerformanceChart.jsx` using Chart.js
  - Configure bar chart with 7-day data (Mon-Sun labels)
  - Set up chart options for responsive behavior and styling
  - Apply LearnLoop color scheme (ll-600 for bars)
  - Add loading state and empty state handling
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 9.3, 9.4_

- [ ] 7. Build Recent Reflections Feed component
  - Create `frontend/src/components/RecentReflectionsFeed.jsx` displaying reflection list
  - Show title, excerpt (truncated to 100 chars), and timestamp for each reflection
  - Limit display to 5 most recent items
  - Add click handler to navigate to full reflection details
  - Include "View all" link at bottom
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 9.3, 9.4_

- [ ] 8. Build Blockers Summary component
  - Create `frontend/src/components/BlockersSummary.jsx` showing active blockers
  - Display count badge for active blockers
  - Show list of top 3 recent blockers with severity indicators
  - Implement color-coded severity (red/yellow/gray)
  - Add click handler to navigate to blockers page
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 9.3, 9.4_

- [ ] 9. Set up API integration and data fetching
  - Create API service functions in `frontend/src/lib/api.js` for dashboard endpoints
  - Implement `/api/user/progress` endpoint call
  - Implement `/api/user/activity/today` endpoint call
  - Implement `/api/user/activity/weekly` endpoint call
  - Implement `/api/reflections?limit=5&sort=desc` endpoint call
  - Implement `/api/blockers?status=active` endpoint call
  - Add error handling and retry logic for failed requests
  - _Requirements: 2.3, 2.4, 3.4, 5.5, 6.2, 7.2_

- [ ] 10. Integrate all components into Dashboard page
  - Import all created components into `frontend/src/pages/Dashboard.jsx`
  - Implement data fetching using useEffect hooks
  - Pass fetched data as props to child components
  - Add loading states with skeleton loaders
  - Implement error boundaries for graceful error handling
  - _Requirements: All requirements_

- [ ] 11. Add responsive design and polish
  - Test and refine responsive breakpoints for mobile, tablet, desktop
  - Ensure consistent spacing and padding across all cards
  - Add hover effects and transitions to interactive elements
  - Verify color contrast and accessibility
  - Test keyboard navigation for all interactive elements
  - _Requirements: 8.5, 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ]* 12. Create mock API endpoints for development
  - Set up mock data generators for testing dashboard components
  - Create temporary mock responses for all API endpoints
  - Add delay simulation for realistic loading states
  - _Requirements: 2.3, 3.4, 5.5, 6.2, 7.2_
