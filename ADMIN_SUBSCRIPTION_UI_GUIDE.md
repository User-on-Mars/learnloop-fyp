# Admin Subscription Management UI Guide

## Page Layout

### Header Section
```
Subscriptions
Manage user subscription tiers
```

### Stats Cards (Top Row)
```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ 👥 Total Users  │  │ 👑 Pro Users    │  │ ✓ Free Users    │
│      150        │  │       25        │  │      125        │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

### Filter Buttons
```
[ All ]  [ Pro Only ]  [ Free Only ]
```

### User List
Each user card shows:
```
┌────────────────────────────────────────────────────────────┐
│ John Doe 👑                                    [ Actions ▼ ]│
│ john@example.com                                            │
│ [Pro] [Expires Dec 31, 2026]                               │
└────────────────────────────────────────────────────────────┘
```

## Action Buttons

### For Free Users:
```
┌────────────────────────────────────────────────────────────┐
│ Actions expanded:                                           │
│ [ 👑 Give Pro (30 days) ]                                  │
│ [ 👑 Give Pro (90 days) ]                                  │
│ [ 👑 Give Pro (1 year) ]                                   │
└────────────────────────────────────────────────────────────┘
```

### For Active Pro Users:
```
┌────────────────────────────────────────────────────────────┐
│ Actions expanded:                                           │
│ [ 👑 Extend +30 days ]  [ 👑 Extend +90 days ]            │
│ [ 👑 Extend +1 year ]                                      │
│ ─────────────────────────────────────────────────────────  │
│ [ ⚠️ Cancel (keep until expiry) ]  [ ✕ Revoke (immediate) ]│
└────────────────────────────────────────────────────────────┘
```

### For Canceled Pro Users:
```
┌────────────────────────────────────────────────────────────┐
│ Jane Smith 👑                                  [ Actions ▼ ]│
│ jane@example.com                                            │
│ [Pro] [Canceled] [Expires Dec 31, 2026]                    │
│                                                             │
│ Actions expanded:                                           │
│ [ 👑 Reactivate +30 days ]  [ ✕ Revoke Now ]              │
└────────────────────────────────────────────────────────────┘
```

## User Flow Examples

### Example 1: Give Pro to Free User
1. Admin clicks "Actions" on a Free user
2. Sees three options: 30 days, 90 days, or 1 year
3. Clicks "Give Pro (90 days)"
4. Confirmation dialog: "Upgrade John Doe to Pro for 90 days?"
5. Clicks "Yes"
6. User immediately gets Pro access for 90 days
7. Badge changes from "Free" to "Pro"
8. Expiry date shows: "Expires [90 days from now]"

### Example 2: Extend Pro Subscription
1. Admin clicks "Actions" on a Pro user (expires Dec 31, 2026)
2. Sees extend options: +30 days, +90 days, +1 year
3. Clicks "Extend +90 days"
4. Confirmation: "Extend John Doe's Pro subscription by 90 days?"
5. Clicks "Yes"
6. Expiry date updates to: "Expires Mar 31, 2027" (90 days after Dec 31)
7. Success message: "Extended by 90 days"

### Example 3: Cancel Pro Subscription
1. Admin clicks "Actions" on a Pro user
2. Clicks "Cancel (keep until expiry)"
3. Confirmation: "Cancel John Doe's Pro subscription? They will keep Pro access until Dec 31, 2026."
4. Clicks "Yes"
5. User keeps Pro access until expiry date
6. Badge shows: "Pro" + "Canceled"
7. After expiry date, automatically becomes Free

### Example 4: Reactivate Canceled Subscription
1. Admin clicks "Actions" on a canceled Pro user
2. Clicks "Reactivate +30 days"
3. Confirmation: "Extend John Doe's Pro subscription by 30 days?"
4. Clicks "Yes"
5. Subscription reactivated, 30 days added to current expiry
6. "Canceled" badge removed
7. New expiry date shown

### Example 5: Revoke Pro Immediately
1. Admin clicks "Actions" on a Pro user
2. Clicks "Revoke (immediate)"
3. Confirmation: "Downgrade John Doe to Free? This will remove Pro access immediately."
4. Clicks "Yes"
5. User immediately loses Pro access
6. Badge changes to "Free"
7. All Pro features become unavailable

## Status Indicators

### Badges:
- **Pro** (amber background) - Active Pro subscription
- **Free** (gray background) - Free tier
- **Canceled** (red background) - Pro subscription canceled, active until expiry

### Icons:
- 👑 Crown icon - Indicates Pro user
- 📅 Calendar icon - Shows expiry date

## Pagination
```
[ ← Previous ]  Page 1 of 5  [ Next → ]
```
- Shows 20 users per page
- Navigate between pages
- Maintains filter selection

## Color Coding
- **Amber/Gold** - Pro tier (premium)
- **Gray** - Free tier (default)
- **Red** - Canceled/Revoked (warning)
- **Green** - Success messages
- **Orange** - Cancel action (warning but not destructive)

## Confirmation Dialogs
All actions require confirmation to prevent accidents:
- Clear description of what will happen
- User name shown in confirmation
- "Yes" / "No" buttons
- Loading state during processing

## Success/Error Messages
Inline feedback after each action:
- ✓ "Upgraded to Pro" (green)
- ✓ "Subscription canceled" (green)
- ✓ "Downgraded to Free" (green)
- ✗ "Error: [message]" (red)

## Responsive Design
- Desktop: Full layout with all features
- Tablet: Stacked cards, full functionality
- Mobile: Optimized for touch, scrollable list
