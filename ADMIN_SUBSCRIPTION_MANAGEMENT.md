# Admin Subscription Management

## Overview
Admins can now manage user subscriptions with these key actions:
- **Give Pro**: Upgrade a free user to Pro tier (30 days, 90 days, or 1 year)
- **Extend Pro**: Add more time to existing Pro subscriptions (30 days, 90 days, or 1 year)
- **Reactivate**: Reactivate a canceled Pro subscription with additional time
- **Cancel**: Mark subscription as canceled (user keeps Pro until expiry)
- **Revoke**: Immediately downgrade user to Free tier

## Backend Changes

### New Endpoint
Added `POST /api/admin/subscription/:userId/cancel` to cancel subscriptions while keeping Pro access until period end.

**File**: `backend/src/routes/admin.js`

### Existing Endpoints
- `GET /api/admin/subscriptions` - List all subscriptions with filtering
- `GET /api/admin/subscription/:userId` - Get specific user subscription
- `POST /api/admin/subscription/:userId/upgrade` - Upgrade to Pro
- `POST /api/admin/subscription/:userId/downgrade` - Downgrade to Free
- `POST /api/admin/subscription/:userId/cancel` - Cancel (new)

## Frontend Changes

### New Page: AdminSubscriptions
**File**: `frontend/src/pages/admin/AdminSubscriptions.jsx`

Features:
- View all user subscriptions with pagination
- Filter by tier (All, Pro, Free)
- Stats cards showing total, pro, and free users
- Per-user action buttons:
  
  **For Free Users:**
  - **Give Pro (30 days)** - Upgrades to Pro for 30 days
  - **Give Pro (90 days)** - Upgrades to Pro for 90 days
  - **Give Pro (1 year)** - Upgrades to Pro for 365 days
  
  **For Active Pro Users:**
  - **Extend +30 days** - Adds 30 days to current expiry
  - **Extend +90 days** - Adds 90 days to current expiry
  - **Extend +1 year** - Adds 365 days to current expiry
  - **Cancel (keep until expiry)** - Cancels but keeps access until period end
  - **Revoke (immediate)** - Immediately removes Pro access
  
  **For Canceled Pro Users:**
  - **Reactivate +30 days** - Reactivates and extends by 30 days
  - **Revoke Now** - Immediately removes Pro access

### API Updates
**File**: `frontend/src/api/adminApi.js`

Added methods:
- `getUserSubscription(userId)` - Get user subscription details
- `upgradeSubscription(userId, periodEnd)` - Upgrade to Pro
- `downgradeSubscription(userId)` - Downgrade to Free
- `cancelSubscription(userId)` - Cancel subscription

### Navigation
The "Subscriptions" link is already added to the admin sidebar with Crown icon.

**File**: `frontend/src/components/admin/AdminSidebar.jsx`

## Usage

### For Admins:
1. Navigate to Admin Panel → Subscriptions
2. View all users and their subscription status
3. Use filters to find Pro or Free users
4. Click "Actions" on any user to:
   
   **Free Users:**
   - Give Pro access (choose 30 days, 90 days, or 1 year)
   
   **Active Pro Users:**
   - Extend their subscription (adds time to current expiry)
   - Cancel their subscription (keeps Pro until expiry)
   - Revoke Pro immediately (downgrades to Free)
   
   **Canceled Pro Users:**
   - Reactivate with additional time
   - Revoke immediately

### Subscription States:
- **Free** - Default tier with limited features
- **Pro** - Premium tier with expanded limits
- **Pro (Canceled)** - Pro tier that won't renew, active until expiry date
- **Expired** - Pro subscription past expiry date (automatically becomes Free)

## Audit Logging
All subscription actions are logged in the audit log:
- `subscription_upgrade` - User upgraded to Pro
- `subscription_downgrade` - User downgraded to Free
- `subscription_cancel` - Subscription canceled

## Security
- All endpoints require authentication (`requireAuth`)
- All endpoints require admin role (`requireAdmin`)
- Actions are logged with admin ID and timestamp
- Confirmation dialogs prevent accidental changes

## Testing
To test the implementation:
1. Start the backend: `cd backend && npm start`
2. Start the frontend: `cd frontend && npm run dev`
3. Login as an admin user
4. Navigate to `/admin/subscriptions`
5. Test giving Pro, canceling, and revoking subscriptions
