# Reflection Page - Complete Layout

## Page Structure

```
┌─────────────────────────────────────────────────────────────────┐
│  [Sidebar]  │                                                    │
│             │  Reflect                                           │
│  Dashboard  │  Capture your thoughts and insights about your    │
│  Log        │  practice                                          │
│  Reflect    │                                                    │
│  Profile    │  ┌─────────────────────────────────────────────┐  │
│             │  │ ✅ Reflection saved successfully!           │  │
│             │  └─────────────────────────────────────────────┘  │
│             │                                                    │
│             │  ┌──────────────────────┐  ┌──────────────────┐  │
│             │  │ Your Reflection      │  │ Reflection       │  │
│             │  │ ┌──────────────────┐ │  │ Preview          │  │
│             │  │ │ What did you     │ │  │                  │  │
│             │  │ │ learn today?     │ │  │ Last updated:    │  │
│             │  │ │                  │ │  │ just now         │  │
│             │  │ │                  │ │  │                  │  │
│             │  │ │                  │ │  │ Your reflection  │  │
│             │  │ │                  │ │  │ will appear here │  │
│             │  │ └──────────────────┘ │  │ as you type.     │  │
│             │  │ 0 / 10,000 chars    │  │                  │  │
│             │  │                      │  │ Mood: 😊 Neutral │  │
│             │  │ How are you feeling? │  │                  │  │
│             │  │ 😊 😐 😢 ⚡ 🤔      │  │ Tags:            │  │
│             │  │                      │  │ learning         │  │
│             │  │ Add Tags             │  │ challenge        │  │
│             │  │ [learning] [x]       │  │ progress         │  │
│             │  │ [challenge] [x]      │  │                  │  │
│             │  │                      │  └──────────────────┘  │
│             │  │ [Save Reflection]    │                        │
│             │  └──────────────────────┘                        │
│             │                                                    │
│             │  Your Reflections                                 │
│             │  View and manage your past reflections            │
│             │                                                    │
│             │  ┌─────────────────────────────────────────────┐  │
│             │  │ 😊 Mon, Feb 8, 2026  3:45 PM  (just now)   │  │
│             │  │                                             │  │
│             │  │ Tags: learning  challenge  progress        │  │
│             │  │                                             │  │
│             │  │ Today I practiced scales for 30 minutes    │  │
│             │  │ and noticed significant improvement...     │  │
│             │  │                                             │  │
│             │  │                          [Export] [Delete]  │  │
│             │  └─────────────────────────────────────────────┘  │
│             │                                                    │
│             │  ┌─────────────────────────────────────────────┐  │
│             │  │ 🤔 Sun, Feb 7, 2026  8:30 PM  (19 hrs ago) │  │
│             │  │                                             │  │
│             │  │ Tags: technique  breakthrough              │  │
│             │  │                                             │  │
│             │  │ Had a breakthrough with my bowing          │  │
│             │  │ technique today. Finally understood...     │  │
│             │  │                                             │  │
│             │  │                          [Export] [Delete]  │  │
│             │  └─────────────────────────────────────────────┘  │
│             │                                                    │
│             │  ┌─────────────────────────────────────────────┐  │
│             │  │ ⚡ Sat, Feb 6, 2026  2:15 PM  (2 days ago) │  │
│             │  │                                             │  │
│             │  │ Tags: performance  confidence              │  │
│             │  │                                             │  │
│             │  │ Performed in front of a small audience...  │  │
│             │  │                                             │  │
│             │  │                          [Export] [Delete]  │  │
│             │  └─────────────────────────────────────────────┘  │
│             │                                                    │
└─────────────────────────────────────────────────────────────────┘
```

## Expanded Reflection View

When you click on a reflection, it expands to show the full content:

```
┌─────────────────────────────────────────────────────────────────┐
│ 😊 Mon, Feb 8, 2026  3:45 PM  (just now)                       │
│                                                                  │
│ Tags: learning  challenge  progress                             │
│                                                                  │
│ Today I practiced scales for 30 minutes and noticed significant │
│ improvement in my finger dexterity. I struggled with the F#     │
│ major scale but managed to play it cleanly by the end of the    │
│ session.                                                         │
│                                                                  │
│ The key was to slow down and focus on each note individually    │
│ rather than trying to rush through the entire scale. I also     │
│ noticed that my posture was affecting my playing - when I sat   │
│ up straighter, the notes came out clearer.                      │
│                                                                  │
│ Next time I'll focus on the G major scale and try to apply      │
│ the same technique. I'm feeling more confident about my         │
│ progress and excited to continue practicing.                    │
│                                                                  │
│ ─────────────────────────────────────────────────────────────── │
│ Created: Monday, February 8, 2026 at 03:45:30 PM                │
│                                                                  │
│                                          [Export] [Delete]       │
└─────────────────────────────────────────────────────────────────┘
```

## Date & Time Formats

### In List View (Collapsed)
- **Date**: "Mon, Feb 8, 2026" (Short weekday, month, day, year)
- **Time**: "3:45 PM" (12-hour format with AM/PM)
- **Relative**: "(just now)" or "(2 hours ago)" or "(3 days ago)"

### In Expanded View
- **Full Timestamp**: "Monday, February 8, 2026 at 03:45:30 PM"
- Shows both created and updated times if they differ

### Relative Time Examples
- Less than 1 minute: "just now"
- 1-59 minutes: "5 minutes ago", "30 minutes ago"
- 1-23 hours: "2 hours ago", "12 hours ago"
- 1+ days: "1 day ago", "3 days ago", "7 days ago"

## Features

### Create New Reflection
1. Type your reflection in the text area
2. Select a mood (optional)
3. Add tags (optional)
4. See live preview on the right
5. Click "Save Reflection"
6. See success message
7. Form clears automatically
8. New reflection appears at top of history

### View Reflections
1. Scroll down to "Your Reflections" section
2. See all reflections in chronological order (newest first)
3. Each card shows:
   - Mood emoji
   - Exact date and time
   - Relative time
   - Tags
   - Preview of content (first 150 characters)
   - Export and Delete buttons

### Expand Reflection
1. Click anywhere on a reflection card
2. Card expands to show full content
3. See complete timestamp at bottom
4. Click again to collapse

### Export to PDF
1. Click the download icon on any reflection
2. PDF file downloads automatically
3. Filename: "reflection-2026-02-08.pdf"

### Delete Reflection
1. Click the trash icon on any reflection
2. Confirmation dialog appears
3. Click "Delete" to confirm
4. Reflection is removed from list and database

## Responsive Design

### Desktop (Large Screens)
- Two-column layout for form and preview
- Reflections shown in full width below
- Sidebar always visible

### Tablet (Medium Screens)
- Two-column layout maintained
- Slightly narrower spacing
- Sidebar collapsible

### Mobile (Small Screens)
- Single column layout
- Form stacks vertically
- Preview below form
- Reflections stack vertically
- Sidebar becomes hamburger menu

## Color Scheme

- **Primary**: Indigo/Purple (ll-600, ll-700)
- **Success**: Green (green-50, green-700)
- **Error**: Red (red-50, red-700)
- **Background**: Gray (gray-50, gray-100)
- **Text**: Gray (gray-700, gray-900)
- **Borders**: Gray (gray-200, gray-300)

## Mood Emojis

- 😊 Happy
- 😐 Neutral
- 😢 Sad
- ⚡ Energized
- 🤔 Thoughtful

## Tag Styling

Tags appear as rounded pills with:
- Background: Light purple (ll-100)
- Text: Dark purple (ll-800)
- Small font size
- Padding: 2.5px horizontal, 1px vertical
