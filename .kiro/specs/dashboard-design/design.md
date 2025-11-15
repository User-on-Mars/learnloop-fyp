# Dashboard Design Document

## Overview

The Dashboard Design feature transforms the current minimal dashboard into a comprehensive learning hub that provides users with actionable insights, quick access to key features, and visual feedback on their progress. The design leverages React, Tailwind CSS, Chart.js, and Firebase to create a responsive, performant, and visually appealing interface.

The dashboard follows a card-based layout pattern with a persistent sidebar navigation, ensuring consistency with modern web application design principles while maintaining the existing LearnLoop brand identity.

## Architecture

### Component Hierarchy

```
Dashboard (Page)
├── Sidebar Navigation (Persistent)
│   ├── Navigation Items (7 items with icons)
│   └── Active State Indicator
├── Main Content Area
│   ├── Header Section
│   │   └── Personalized Greeting
│   ├── Top Row (Grid Layout)
│   │   ├── Skill Progress Card
│   │   └── Today's Activity Card
│   ├── Quick Actions Section
│   │   ├── Log Practice Button
│   │   ├── Add Reflection Button
│   │   └── Log Blocker Button
│   ├── Weekly Performance Chart Card
│   ├── Recent Reflections Feed Card
│   └── Blockers Summary Card
```

### Technology Stack

- **Frontend Framework**: React 18.2.0 with React Router DOM 6.28.0
- **Styling**: Tailwind CSS 3.4.13 with custom LearnLoop color palette
- **Charts**: Chart.js 4.4.1 with react-chartjs-2 5.2.0
- **Authentication**: Firebase 12.5.0
- **HTTP Client**: Axios 1.7.2
- **Build Tool**: Vite 5.4.8

### Layout Strategy

The dashboard uses a two-column layout:
- **Left Column**: Fixed sidebar navigation (width: 240px)
- **Right Column**: Scrollable main content area (flex-1)

The main content uses CSS Grid for responsive card placement:
- Desktop (≥1024px): 2-column grid for top cards, single column for charts
- Tablet (768px-1023px): Single column layout with full-width cards
- Mobile (<768px): Stacked layout with collapsible sidebar

## Components and Interfaces

### 1. Sidebar Navigation Component

**File**: `frontend/src/components/Sidebar.jsx`

**Purpose**: Provides persistent navigation across all dashboard views

**Props Interface**:
```javascript
{
  activeSection: string // Current active route
}
```

**Navigation Items**:
```javascript
const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: HomeIcon, path: '/dashboard' },
  { id: 'practice', label: 'Practice', icon: ClockIcon, path: '/practice' },
  { id: 'reflections', label: 'Reflections', icon: BookIcon, path: '/reflections' },
  { id: 'blockers', label: 'Blockers', icon: AlertIcon, path: '/blockers' },
  { id: 'skill-map', label: 'Skill Map', icon: MapIcon, path: '/skill-map' },
  { id: 'recap', label: 'Recap', icon: ChartIcon, path: '/recap' },
  { id: 'settings', label: 'Settings', icon: SettingsIcon, path: '/settings' }
]
```

**Styling**:
- Fixed position with `sticky top-0`
- Background: `bg-white` with `border-r border-gray-200`
- Active state: `bg-ll-50 text-ll-700 border-l-4 border-ll-600`
- Hover state: `hover:bg-gray-50`

### 2. Personalized Greeting Component

**File**: `frontend/src/components/DashboardGreeting.jsx`

**Purpose**: Displays personalized welcome message

**Props Interface**:
```javascript
{
  userName: string | null
}
```

**Logic**:
- Retrieves user display name from Firebase auth context
- Falls back to "Welcome back" if name unavailable
- Time-based greeting (Good morning/afternoon/evening) optional enhancement

### 3. Skill Progress Card Component

**File**: `frontend/src/components/SkillProgressCard.jsx`

**Purpose**: Visualizes overall skill mastery progress

**Props Interface**:
```javascript
{
  progress: number,        // 0-100 percentage
  completedSkills: number,
  totalSkills: number,
  hoursLogged: number
}
```

**Visual Elements**:
- Circular progress ring using SVG or CSS conic-gradient
- Center text showing percentage
- Bottom metrics showing completed/total skills and hours
- Color scheme: `ll-600` for progress, `gray-200` for background

**Data Source**: API endpoint `/api/user/progress`

### 4. Today's Activity Card Component

**File**: `frontend/src/components/TodayActivityCard.jsx`

**Purpose**: Summarizes current day's learning activities

**Props Interface**:
```javascript
{
  minutesPracticed: number,
  notesAdded: number,
  lastUpdated: Date
}
```

**Layout**:
- Two-column grid showing metrics
- Icon + number + label for each metric
- Subtle animation on value updates

**Data Source**: API endpoint `/api/user/activity/today`

### 5. Quick Actions Component

**File**: `frontend/src/components/QuickActions.jsx`

**Purpose**: Provides one-click access to common actions

**Props Interface**:
```javascript
{
  onLogPractice: () => void,
  onAddReflection: () => void,
  onLogBlocker: () => void
}
```

**Button Styling**:
- Uses existing `Button` component from `components/Button.jsx`
- Three buttons in horizontal layout on desktop, stacked on mobile
- Icons from a lightweight icon library (Lucide React recommended)

**Interaction**:
- Opens modal dialogs or navigates to dedicated forms
- Provides immediate visual feedback on click

### 6. Weekly Performance Chart Component

**File**: `frontend/src/components/WeeklyPerformanceChart.jsx`

**Purpose**: Visualizes 7-day practice time trends

**Props Interface**:
```javascript
{
  weeklyData: Array<{
    date: string,      // ISO date string
    minutes: number,
    day: string        // Mon, Tue, etc.
  }>
}
```

**Chart Configuration**:
```javascript
{
  type: 'bar',
  data: {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [{
      label: 'Minutes Practiced',
      data: [/* minutes per day */],
      backgroundColor: '#0284c7', // ll-600
      borderRadius: 8
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: { beginAtZero: true }
    }
  }
}
```

**Data Source**: API endpoint `/api/user/activity/weekly`

### 7. Recent Reflections Feed Component

**File**: `frontend/src/components/RecentReflectionsFeed.jsx`

**Purpose**: Displays latest reflection entries

**Props Interface**:
```javascript
{
  reflections: Array<{
    id: string,
    title: string,
    excerpt: string,
    createdAt: Date,
    tags: string[]
  }>,
  maxItems: number // default: 5
}
```

**Layout**:
- List of reflection cards with hover effects
- Each card shows title, excerpt (truncated to 100 chars), and timestamp
- "View all" link at bottom

**Data Source**: API endpoint `/api/reflections?limit=5&sort=desc`

### 8. Blockers Summary Component

**File**: `frontend/src/components/BlockersSummary.jsx`

**Purpose**: Highlights active learning obstacles

**Props Interface**:
```javascript
{
  activeBlockers: number,
  recentBlockers: Array<{
    id: string,
    title: string,
    severity: 'low' | 'medium' | 'high',
    createdAt: Date
  }>
}
```

**Visual Design**:
- Badge showing count of active blockers
- Color-coded severity indicators (red/yellow/gray)
- List of top 3 most recent blockers
- Click to navigate to full blockers page

**Data Source**: API endpoint `/api/blockers?status=active`

## Data Models

### User Progress Model
```typescript
interface UserProgress {
  userId: string;
  overallProgress: number;        // 0-100
  completedSkills: number;
  totalSkills: number;
  totalHoursLogged: number;
  lastUpdated: Date;
}
```

### Activity Summary Model
```typescript
interface ActivitySummary {
  userId: string;
  date: string;                   // ISO date
  minutesPracticed: number;
  notesAdded: number;
  reflectionsCreated: number;
  blockersLogged: number;
}
```

### Weekly Activity Model
```typescript
interface WeeklyActivity {
  userId: string;
  weekStart: string;              // ISO date
  dailyData: Array<{
    date: string;
    dayOfWeek: string;
    minutes: number;
  }>;
}
```

### Reflection Model
```typescript
interface Reflection {
  id: string;
  userId: string;
  title: string;
  content: string;
  excerpt: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}
```

### Blocker Model
```typescript
interface Blocker {
  id: string;
  userId: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  status: 'active' | 'resolved';
  createdAt: Date;
  resolvedAt: Date | null;
}
```

## API Endpoints

### GET /api/user/progress
**Response**:
```json
{
  "overallProgress": 65,
  "completedSkills": 13,
  "totalSkills": 20,
  "totalHoursLogged": 47.5
}
```

### GET /api/user/activity/today
**Response**:
```json
{
  "date": "2025-11-15",
  "minutesPracticed": 45,
  "notesAdded": 3
}
```

### GET /api/user/activity/weekly
**Response**:
```json
{
  "weekStart": "2025-11-09",
  "dailyData": [
    { "date": "2025-11-09", "dayOfWeek": "Sat", "minutes": 30 },
    { "date": "2025-11-10", "dayOfWeek": "Sun", "minutes": 45 }
  ]
}
```

### GET /api/reflections?limit=5&sort=desc
**Response**:
```json
{
  "reflections": [
    {
      "id": "ref_123",
      "title": "Understanding React Hooks",
      "excerpt": "Today I learned about useEffect and its cleanup function...",
      "createdAt": "2025-11-15T10:30:00Z",
      "tags": ["react", "hooks"]
    }
  ]
}
```

### GET /api/blockers?status=active
**Response**:
```json
{
  "activeCount": 2,
  "blockers": [
    {
      "id": "block_456",
      "title": "Struggling with async/await",
      "severity": "medium",
      "createdAt": "2025-11-14T15:20:00Z"
    }
  ]
}
```

## Error Handling

### Network Errors
- Display toast notifications for failed API calls
- Show skeleton loaders while data is loading
- Provide retry buttons for failed requests
- Cache last successful data in localStorage as fallback

### Authentication Errors
- Redirect to login if Firebase token expires
- Show appropriate error messages for permission issues

### Data Validation
- Validate all API responses against expected schemas
- Handle missing or malformed data gracefully
- Display placeholder content when data is unavailable

### Error Component
```javascript
// frontend/src/components/ErrorBoundary.jsx
class ErrorBoundary extends React.Component {
  // Catches rendering errors and displays fallback UI
}
```

## Testing Strategy

### Unit Tests
- Test individual components in isolation using React Testing Library
- Mock API calls and Firebase auth
- Test component rendering with various prop combinations
- Verify event handlers and user interactions

**Key Test Files**:
- `SkillProgressCard.test.jsx`: Progress ring calculations and rendering
- `WeeklyPerformanceChart.test.jsx`: Chart data transformation
- `QuickActions.test.jsx`: Button click handlers

### Integration Tests
- Test data flow from API to components
- Verify navigation between dashboard sections
- Test sidebar active state updates

### Visual Regression Tests
- Capture screenshots of dashboard in different states
- Test responsive layouts at various breakpoints
- Verify dark mode compatibility (future enhancement)

### Accessibility Tests
- Verify keyboard navigation works for all interactive elements
- Test screen reader compatibility
- Ensure color contrast meets WCAG AA standards
- Validate ARIA labels and roles

### Performance Tests
- Measure initial load time (target: <2s)
- Test chart rendering performance with large datasets
- Verify smooth scrolling and animations
- Monitor bundle size (target: <500KB gzipped)

## Styling and Design System

### Color Palette
Using existing LearnLoop colors from `tailwind.config.js`:
- Primary: `ll-600` (#0284c7)
- Primary Hover: `ll-700` (#0369a1)
- Primary Active: `ll-800` (#075985)
- Background: `gray-50` (#f9fafb)
- Card Background: `white`
- Text Primary: `gray-900`
- Text Secondary: `gray-600`
- Border: `gray-200`

### Spacing System
- Card padding: `p-6` (24px)
- Section spacing: `space-y-6` (24px vertical gap)
- Grid gap: `gap-6` (24px)
- Component internal spacing: `space-y-4` (16px)

### Typography
- Page title: `text-3xl font-bold`
- Card title: `text-xl font-semibold`
- Body text: `text-base`
- Secondary text: `text-sm text-gray-600`
- Metrics: `text-2xl font-bold`

### Card Styling
```css
.dashboard-card {
  @apply bg-white rounded-xl shadow-sm border border-gray-200 p-6;
}

.dashboard-card:hover {
  @apply shadow-md transition-shadow duration-200;
}
```

### Responsive Breakpoints
- Mobile: `< 768px`
- Tablet: `768px - 1023px`
- Desktop: `≥ 1024px`

## Implementation Notes

### State Management
- Use React Context for user authentication state
- Use local component state for UI interactions
- Consider React Query for API data caching and synchronization

### Performance Optimizations
- Lazy load chart library (Chart.js) using React.lazy()
- Implement virtual scrolling for long reflection lists
- Debounce API calls for real-time updates
- Use React.memo() for expensive components

### Accessibility Considerations
- All interactive elements must be keyboard accessible
- Provide ARIA labels for icon-only buttons
- Ensure focus indicators are visible
- Use semantic HTML elements
- Provide text alternatives for charts

### Browser Compatibility
- Target: Modern browsers (Chrome, Firefox, Safari, Edge)
- Minimum versions: Last 2 major versions
- Graceful degradation for older browsers
