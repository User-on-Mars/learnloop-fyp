# Profile Page Responsive Visual Test Guide

## How to Test Responsive Design

### Using Browser DevTools

1. **Open the Profile Page**
   - Navigate to `/profile` in your browser
   - Open DevTools (F12 or Right-click → Inspect)
   - Click the device toolbar icon (Ctrl+Shift+M or Cmd+Shift+M)

2. **Test Mobile Viewport (< 768px)**
   - Set viewport to 375x667 (iPhone SE)
   - Set viewport to 390x844 (iPhone 12 Pro)
   - Set viewport to 360x740 (Samsung Galaxy S20)

3. **Test Tablet Viewport (768px - 1023px)**
   - Set viewport to 768x1024 (iPad Mini)
   - Set viewport to 820x1180 (iPad Air)
   - Set viewport to 1024x768 (iPad landscape)

4. **Test Desktop Viewport (≥ 1024px)**
   - Set viewport to 1280x720 (HD)
   - Set viewport to 1920x1080 (Full HD)
   - Set viewport to 2560x1440 (2K)

## Visual Checklist by Viewport

### Mobile (< 768px) - Expected Behavior

#### Header
- [ ] Mobile header is visible at top
- [ ] "Profile Settings" title is displayed
- [ ] Back arrow button is visible on the left
- [ ] Header is sticky when scrolling
- [ ] Desktop page header is hidden

#### Sidebar
- [ ] Sidebar is completely hidden
- [ ] No sidebar space is reserved
- [ ] Content uses full width

#### Profile Information Card
- [ ] Card has 16px padding (p-4)
- [ ] Avatar is 64px × 64px (w-16 h-16)
- [ ] Avatar text is text-xl size
- [ ] Email field is full width
- [ ] Display name field is full width
- [ ] Edit button is full width
- [ ] When editing:
  - [ ] Input field is full width
  - [ ] Save and Cancel buttons stack vertically
  - [ ] Both buttons are full width
  - [ ] Buttons have equal width

#### Password Change Card
- [ ] Card has 16px padding (p-4)
- [ ] All password fields are full width
- [ ] Password visibility toggles are visible
- [ ] Helper text "Minimum 6 characters" is visible
- [ ] Submit button is full width
- [ ] All fields are easily tappable (44px+ height)

#### Spacing
- [ ] Cards have 16px spacing between them (space-y-4)
- [ ] Content has 16px padding from edges (p-4)
- [ ] No horizontal scrolling occurs
- [ ] All text is readable without zooming

### Tablet (768px - 1023px) - Expected Behavior

#### Header
- [ ] Mobile header is hidden
- [ ] Desktop page header is visible
- [ ] "Profile Settings" title is displayed
- [ ] Subtitle "Manage your account..." is visible

#### Sidebar
- [ ] Sidebar is visible on the left
- [ ] Sidebar is 240px wide (w-60)
- [ ] Dashboard link is visible
- [ ] User profile section is visible at bottom
- [ ] Logout button is visible

#### Layout
- [ ] Two-column layout (sidebar + content)
- [ ] Content area has proper spacing
- [ ] Content is not too wide

#### Profile Information Card
- [ ] Card has 24px padding (p-6)
- [ ] Avatar is 80px × 80px (w-20 h-20)
- [ ] Avatar text is text-2xl size
- [ ] Display name field and Edit button are on same row
- [ ] Edit button is auto-width (not full width)
- [ ] When editing:
  - [ ] Input and buttons are on same row
  - [ ] Buttons are auto-width
  - [ ] Layout is horizontal (flex-row)

#### Password Change Card
- [ ] Card has 24px padding (p-6)
- [ ] Form fields maintain proper width
- [ ] All elements are properly spaced

#### Spacing
- [ ] Cards have 24px spacing between them (space-y-6)
- [ ] Content has 24px padding (p-6)
- [ ] Headings are text-xl size

### Desktop (≥ 1024px) - Expected Behavior

#### Layout
- [ ] Sidebar is visible and functional
- [ ] Content area has max-width constraint
- [ ] Content is centered (mx-auto)
- [ ] Proper padding on all sides (lg:p-8)
- [ ] White space is well-balanced

#### Profile Information Card
- [ ] Card maintains readable width
- [ ] All elements are properly aligned
- [ ] Hover states work on buttons
- [ ] Focus states are visible

#### Password Change Card
- [ ] Form is not too wide
- [ ] Fields are appropriately sized
- [ ] Submit button is full width within card

#### Interactions
- [ ] Hover effects work on all buttons
- [ ] Focus rings are visible
- [ ] Cursor changes to pointer on interactive elements
- [ ] Transitions are smooth

## Keyboard Navigation Test

### Tab Order Test
1. Click in the browser address bar
2. Press Tab repeatedly and verify order:
   - [ ] Back button (mobile only)
   - [ ] Email field (disabled, should skip)
   - [ ] Display name field
   - [ ] Edit/Save/Cancel button
   - [ ] Current password field
   - [ ] Current password visibility toggle
   - [ ] New password field
   - [ ] New password visibility toggle
   - [ ] Confirm password field
   - [ ] Confirm password visibility toggle
   - [ ] Change Password button

### Focus Visibility Test
- [ ] All focused elements have visible focus ring
- [ ] Focus ring is blue (ring-ll-600)
- [ ] Focus ring is 2px wide (ring-2)
- [ ] Focus doesn't break layout

### Keyboard Shortcuts Test
- [ ] Enter submits password change form
- [ ] Tab moves forward through fields
- [ ] Shift+Tab moves backward through fields
- [ ] Space activates buttons when focused

## Interactive Elements Test

### Display Name Editing
1. **Edit Mode**
   - [ ] Click Edit button
   - [ ] Input field becomes enabled
   - [ ] Save and Cancel buttons appear
   - [ ] Edit button disappears

2. **Save Changes**
   - [ ] Enter new name
   - [ ] Click Save
   - [ ] Loading state shows "Saving..."
   - [ ] Success message appears
   - [ ] Edit mode exits
   - [ ] New name is displayed

3. **Cancel Changes**
   - [ ] Click Edit
   - [ ] Change name
   - [ ] Click Cancel
   - [ ] Original name is restored
   - [ ] Edit mode exits

### Password Change
1. **Form Validation**
   - [ ] Try submitting with empty fields → Required validation
   - [ ] Enter mismatched passwords → Error message
   - [ ] Enter password < 6 chars → Error message

2. **Successful Change**
   - [ ] Fill all fields correctly
   - [ ] Click Change Password
   - [ ] Loading state shows "Changing Password..."
   - [ ] Success message appears
   - [ ] Form fields are cleared

3. **Password Visibility Toggles**
   - [ ] Click eye icon on current password → Shows password
   - [ ] Click again → Hides password
   - [ ] Repeat for new password field
   - [ ] Repeat for confirm password field

## Alert Messages Test

### Success Messages
- [ ] Display name success message appears
- [ ] Message has green background
- [ ] Message auto-dismisses after 3 seconds
- [ ] Password change success message appears
- [ ] Message is properly styled

### Error Messages
- [ ] Error messages have red background
- [ ] Error text is readable
- [ ] Messages persist until dismissed or new action
- [ ] Multiple errors don't stack awkwardly

## Cross-Browser Testing

### Chrome/Edge
- [ ] All features work correctly
- [ ] Styling is consistent
- [ ] No console errors

### Firefox
- [ ] All features work correctly
- [ ] Styling is consistent
- [ ] No console errors

### Safari (if available)
- [ ] All features work correctly
- [ ] Styling is consistent
- [ ] No console errors

## Performance Test

### Resize Behavior
1. Start at mobile width (375px)
2. Slowly drag to desktop width (1920px)
3. Verify:
   - [ ] No layout jumps or shifts
   - [ ] Smooth transitions between breakpoints
   - [ ] No horizontal scrolling at any width
   - [ ] Content remains readable throughout

### Loading States
- [ ] Loading indicators are visible
- [ ] Buttons are disabled during loading
- [ ] No double-submission possible
- [ ] Loading states clear properly

## Accessibility Test

### Screen Reader Simulation
- [ ] All form labels are present
- [ ] Required fields are marked
- [ ] Error messages are descriptive
- [ ] Button purposes are clear

### Color Contrast
- [ ] Text is readable on all backgrounds
- [ ] Disabled states are distinguishable
- [ ] Focus indicators are visible
- [ ] Error/success colors are distinct

## Edge Cases Test

### Long Content
- [ ] Very long email addresses don't break layout
- [ ] Very long display names are handled
- [ ] Long error messages wrap properly

### Empty States
- [ ] No display name shows placeholder
- [ ] Empty form fields show placeholders

### Network Errors
- [ ] Error messages are user-friendly
- [ ] UI remains functional after errors
- [ ] Retry is possible

## Sign-Off Checklist

- [ ] All mobile viewport tests passed
- [ ] All tablet viewport tests passed
- [ ] All desktop viewport tests passed
- [ ] Keyboard navigation works correctly
- [ ] All interactive elements function properly
- [ ] Alert messages display correctly
- [ ] Cross-browser testing completed
- [ ] Performance is acceptable
- [ ] Accessibility requirements met
- [ ] Edge cases handled gracefully

## Test Completion

**Tester Name**: _________________
**Test Date**: _________________
**Browser(s) Tested**: _________________
**Device(s) Tested**: _________________

**Overall Result**: ☐ PASS  ☐ FAIL  ☐ NEEDS REVIEW

**Notes**:
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
