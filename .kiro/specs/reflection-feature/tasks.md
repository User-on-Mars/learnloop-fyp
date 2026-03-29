# Implementation Plan: Reflection Feature

## Overview

This implementation plan breaks down the Reflection feature into discrete coding tasks that build incrementally. The plan follows a bottom-up approach: starting with the database layer, then building the backend API, and finally implementing the frontend components. Each task includes property-based tests and unit tests to validate correctness early in the development process.

## Tasks

- [x] 1. Set up MongoDB schema and model
  - Create Reflection model with schema definition in `backend/src/models/Reflection.js`
  - Define fields: userId, content, mood, tags, createdAt, updatedAt
  - Add validation rules and indexes
  - Set up enum for mood values
  - _Requirements: 1.5, 8.1, 8.5, 9.2, 10.1_

- [x] 1.1 Write property test for reflection model
  - **Property 1: Reflection Persistence Round Trip**
  - **Validates: Requirements 1.5, 3.5**
  - Test that saving and retrieving reflections preserves all data

- [x] 1.2 Write unit tests for model validation
  - Test content length validation (max 10000 chars)
  - Test mood enum validation
  - Test tag length validation (max 50 chars per tag)
  - Test required fields
  - _Requirements: 1.5_

- [x] 2. Implement backend API routes and controller
  - [x] 2.1 Create reflection controller in `backend/src/controllers/reflectionController.js`
    - Implement createReflection method
    - Implement getReflections method
    - Implement getReflectionById method
    - Implement deleteReflection method
    - Add authentication and authorization checks
    - _Requirements: 1.5, 1.6, 4.1, 4.3, 4.5, 5.3, 9.1, 9.2, 9.3, 9.4_

  - [x] 2.2 Create API routes in `backend/src/routes/reflections.js`
    - POST /api/reflections - create reflection
    - GET /api/reflections - get all user reflections
    - GET /api/reflections/:id - get single reflection
    - DELETE /api/reflections/:id - delete reflection
    - Add Firebase authentication middleware
    - _Requirements: 1.5, 4.1, 5.3, 9.1_

  - [x] 2.3 Register routes in `backend/src/server.js`
    - Import and mount reflection routes
    - _Requirements: 10.3_

  - [x] 2.4 Write property tests for API endpoints
    - **Property 6: User Data Isolation**
    - **Validates: Requirements 4.5, 9.3**
    - **Property 11: Authentication Required for All Operations**
    - **Validates: Requirements 9.1, 9.5**
    - **Property 12: Cross-User Access Denied**
    - **Validates: Requirements 9.4**

  - [x] 2.5 Write unit tests for controller methods
    - Test createReflection with valid data
    - Test getReflections returns sorted results
    - Test getReflectionById with valid and invalid IDs
    - Test deleteReflection with valid and invalid IDs
    - Test authorization failures
    - _Requirements: 1.5, 4.1, 4.3, 5.3, 9.3, 9.4_

- [x] 3. Checkpoint - Ensure backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement PDF export functionality
  - [x] 4.1 Create PDF generator service in `backend/src/services/pdfGenerator.js`
    - Install PDFKit library
    - Implement generateReflectionPDF method
    - Format PDF with reflection content, mood, tags, timestamp
    - _Requirements: 6.2, 6.3_

  - [x] 4.2 Add PDF export route to `backend/src/routes/reflections.js`
    - GET /api/reflections/:id/pdf - export reflection as PDF
    - Add authentication and authorization checks
    - Set proper content-type and content-disposition headers
    - _Requirements: 6.1, 6.2, 6.3, 9.1_

  - [x] 4.3 Write property test for PDF export
    - **Property 8: PDF Export Contains All Reflection Data**
    - **Validates: Requirements 6.2**

  - [x] 4.4 Write unit tests for PDF generation
    - Test PDF generation with complete reflection data
    - Test PDF generation with missing optional fields (mood, tags)
    - Test error handling for PDF generation failures
    - _Requirements: 6.2, 6.5_

- [x] 5. Implement frontend reflection form components
  - [x] 5.1 Create MoodSelector component in `frontend/src/components/MoodSelector.jsx`
    - Display five mood options with emoji icons
    - Handle mood selection with visual feedback
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 5.2 Create TagManager component in `frontend/src/components/TagManager.jsx`
    - Input field for adding tags
    - Display list of added tags
    - Handle tag addition on Enter key
    - Handle tag removal
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 5.3 Create LivePreview component in `frontend/src/components/LivePreview.jsx`
    - Display reflection content in real-time
    - Show mood emoji if selected
    - Display tags as styled badges
    - Show timestamp with relative time formatting
    - _Requirements: 1.2, 7.1, 7.2, 7.4, 7.5, 8.2, 8.3, 8.4_

  - [x] 5.4 Write property tests for form components
    - **Property 3: Tag Management Consistency**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4**
    - **Property 4: Mood Selection Updates State**
    - **Validates: Requirements 1.3, 2.4, 7.5**

  - [x] 5.5 Write unit tests for form components
    - Test MoodSelector renders all five moods
    - Test MoodSelector selection and visual feedback
    - Test TagManager adds tags on Enter
    - Test TagManager removes tags on click
    - Test LivePreview displays content correctly
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 7.2_

- [x] 6. Implement main Reflect page
  - [x] 6.1 Create ReflectPage component in `frontend/src/pages/ReflectPage.jsx`
    - Set up component state (content, mood, tags, lastUpdated, isSaving, error)
    - Implement large text area for reflection content
    - Integrate MoodSelector component
    - Integrate TagManager component
    - Integrate LivePreview component
    - Implement handleSave method with API call
    - Add success confirmation message
    - Add error handling and display
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.5, 7.2_

  - [x] 6.2 Write property tests for ReflectPage
    - **Property 2: Live Preview Updates in Real-Time**
    - **Validates: Requirements 1.2, 7.1**
    - **Property 13: Scroll Position Preserved During Preview Updates**
    - **Validates: Requirements 7.3**
    - **Property 15: Error Handling Maintains State**
    - **Validates: Requirements 5.5, 6.5**

  - [x] 6.3 Write unit tests for ReflectPage
    - Test form renders with all components
    - Test save button triggers API call
    - Test success message displays after save
    - Test error message displays on save failure
    - Test form state updates on user input
    - _Requirements: 1.1, 1.5, 1.6_

- [x] 7. Implement reflection history view
  - [x] 7.1 Create ReflectionHistory component in `frontend/src/components/ReflectionHistory.jsx`
    - Fetch reflections from API on mount
    - Display list of reflections with timestamp, mood, and preview
    - Implement reflection selection to show full content
    - Add delete button with confirmation dialog
    - Add export to PDF button
    - Handle loading and error states
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 6.1_

  - [x] 7.2 Write property tests for ReflectionHistory
    - **Property 5: Reflection History Sorted by Timestamp**
    - **Validates: Requirements 4.3**
    - **Property 7: Deletion Removes from Database and UI**
    - **Validates: Requirements 5.3, 5.4**
    - **Property 14: Relative Time Display Accuracy**
    - **Validates: Requirements 8.4**

  - [x] 7.3 Write unit tests for ReflectionHistory
    - Test component fetches reflections on mount
    - Test reflections display with correct data
    - Test delete confirmation dialog appears
    - Test delete removes reflection from list
    - Test export triggers PDF download
    - Test loading state displays
    - Test error state displays
    - _Requirements: 4.1, 4.2, 5.1, 5.2, 6.1_

- [x] 8. Checkpoint - Ensure frontend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Integrate with existing navigation
  - [x] 9.1 Update Sidebar component in `frontend/src/components/Sidebar.jsx`
    - Add "Reflect" navigation link
    - Add appropriate icon for reflection feature
    - _Requirements: 10.4_

  - [x] 9.2 Add route in `frontend/src/App.jsx` or routing configuration
    - Add route for /reflect path pointing to ReflectPage
    - Add route for /reflections path pointing to ReflectionHistory
    - Ensure routes are protected with authentication
    - _Requirements: 9.5, 10.4_

  - [x] 9.3 Write integration test for navigation
    - Test sidebar link navigates to Reflect page
    - Test unauthenticated users redirect to login
    - _Requirements: 9.5, 10.4_

- [x] 10. Implement timestamp utilities
  - [x] 10.1 Create timestamp utility functions in `frontend/src/utils/timeUtils.js`
    - Implement getRelativeTime function (just now, X minutes ago, X hours ago, X days ago)
    - Implement formatTimestamp function for human-readable dates
    - _Requirements: 8.2, 8.3, 8.4_

  - [x] 10.2 Write property test for timestamp utilities
    - **Property 10: Timestamps Stored in UTC**
    - **Validates: Requirements 8.5**
    - Test relative time calculations with random timestamps

  - [x] 10.3 Write unit tests for timestamp utilities
    - Test "just now" for recent timestamps (< 1 minute)
    - Test "X minutes ago" for timestamps 1-59 minutes old
    - Test "X hours ago" for timestamps 1-23 hours old
    - Test "X days ago" for older timestamps
    - _Requirements: 8.3, 8.4_

- [x] 11. Add styling and responsive design
  - [x] 11.1 Style ReflectPage with Tailwind CSS
    - Style text area with appropriate sizing and padding
    - Style mood selector with hover and selected states
    - Style tag manager with input and tag badges
    - Style live preview panel
    - Ensure responsive layout for mobile and desktop
    - _Requirements: 1.1, 2.2, 2.3, 7.2_

  - [x] 11.2 Style ReflectionHistory with Tailwind CSS
    - Style reflection list items
    - Style delete and export buttons
    - Style confirmation dialog
    - Ensure responsive layout
    - _Requirements: 4.2, 5.1, 6.1_

- [x] 12. Final integration and testing
  - [x] 12.1 Test complete create-save-retrieve flow
    - Create a reflection with all fields
    - Save to database
    - Retrieve from history
    - Verify all data is correct
    - _Requirements: 1.5, 4.1, 4.4_

  - [x] 12.2 Test complete delete flow
    - Create a reflection
    - Delete with confirmation
    - Verify removal from database and UI
    - _Requirements: 5.2, 5.3, 5.4_

  - [x] 12.3 Test complete export flow
    - Create a reflection
    - Export to PDF
    - Verify PDF contains all data
    - _Requirements: 6.2, 6.3_

  - [x] 12.4 Write property test for complete workflow
    - **Property 9: Preview Formatting Matches Saved State**
    - **Validates: Requirements 7.4**
    - Test that preview matches saved reflection for random content

- [x] 13. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties with minimum 100 iterations each
- Unit tests validate specific examples and edge cases
- The implementation follows a bottom-up approach: database → backend API → frontend components → integration
- All property tests must include comment tags: `// Feature: reflection-feature, Property {number}: {property_text}`
