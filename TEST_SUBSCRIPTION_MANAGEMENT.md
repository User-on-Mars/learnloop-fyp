# Testing Admin Subscription Management

## Prerequisites
1. Backend server running on port 4000
2. Frontend dev server running
3. Admin user account (use `backend/scripts/makeAdmin.js` if needed)
4. MongoDB running with test data

## Test Scenarios

### Test 1: View Subscriptions Page
**Steps:**
1. Login as admin
2. Navigate to `/admin/subscriptions`
3. Verify page loads without errors

**Expected:**
- Stats cards show correct counts
- User list displays with names and emails
- Filter buttons are visible
- Pagination works if more than 20 users

### Test 2: Give Pro to Free User
**Steps:**
1. Find a Free user in the list
2. Click "Actions" button
3. Click "Give Pro (30 days)"
4. Confirm the action

**Expected:**
- Confirmation dialog appears with user name
- After confirmation, success message shows
- User badge changes from "Free" to "Pro"
- Expiry date shows ~30 days from now
- Stats update (Pro count +1, Free count -1)

**Backend Verification:**
```bash
# Check subscription in MongoDB
mongo learnloop
db.subscriptions.findOne({ userId: "USER_ID" })
```

Should show:
- `tier: "pro"`
- `status: "active"`
- `currentPeriodEnd: [date ~30 days from now]`

### Test 3: Cancel Pro Subscription
**Steps:**
1. Find an active Pro user
2. Click "Actions"
3. Click "Cancel (keep until expiry)"
4. Confirm the action

**Expected:**
- Confirmation shows expiry date
- Success message appears
- "Canceled" badge appears
- User still shows as Pro
- Expiry date remains visible

**Backend Verification:**
```javascript
// Should show:
{
  tier: "pro",
  status: "canceled",
  canceledAt: [current date],
  currentPeriodEnd: [original expiry date]
}
```

### Test 4: Revoke Pro Immediately
**Steps:**
1. Find a Pro user (active or canceled)
2. Click "Actions"
3. Click "Revoke (immediate)"
4. Confirm the action

**Expected:**
- Warning confirmation dialog
- Success message appears
- Badge changes to "Free"
- Expiry date disappears
- Stats update immediately

**Backend Verification:**
```javascript
// Should show:
{
  tier: "free",
  status: "active",
  currentPeriodEnd: null,
  canceledAt: null
}
```

### Test 5: Filter by Tier
**Steps:**
1. Click "Pro Only" filter
2. Verify only Pro users shown
3. Click "Free Only" filter
4. Verify only Free users shown
5. Click "All" filter
6. Verify all users shown

**Expected:**
- List updates immediately
- Stats remain accurate
- Pagination resets to page 1
- No errors in console

### Test 6: Pagination
**Steps:**
1. If more than 20 users exist, test pagination
2. Click "Next" button
3. Verify page 2 loads
4. Click "Previous" button
5. Verify page 1 loads

**Expected:**
- Page number updates
- Different users shown
- Buttons disable at boundaries
- Filter persists across pages

### Test 7: Audit Log Verification
**Steps:**
1. Perform any subscription action
2. Navigate to `/admin/audit-log`
3. Search for recent actions

**Expected:**
- Action logged with:
  - Admin ID
  - Action type (subscription_upgrade, subscription_cancel, subscription_downgrade)
  - Target user ID
  - Timestamp
  - Details

### Test 8: Error Handling
**Steps:**
1. Stop backend server
2. Try to perform any action
3. Restart backend
4. Try again

**Expected:**
- Error message shows: "Error: [message]"
- No page crash
- Action can be retried after backend restart

### Test 9: Concurrent Actions
**Steps:**
1. Open two browser tabs as admin
2. In tab 1, upgrade a user to Pro
3. In tab 2, refresh and verify change
4. In tab 2, cancel the subscription
5. In tab 1, refresh and verify change

**Expected:**
- Changes reflect across tabs after refresh
- No data inconsistencies
- Latest action wins

### Test 10: Mobile Responsiveness
**Steps:**
1. Open page on mobile device or resize browser
2. Test all actions
3. Verify UI is usable

**Expected:**
- Cards stack vertically
- Buttons are touch-friendly
- Text doesn't overflow
- All features accessible

## API Testing with curl

### Get all subscriptions:
```bash
TOKEN="your-admin-token"
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/api/admin/subscriptions
```

### Get specific user subscription:
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/api/admin/subscription/USER_ID
```

### Upgrade to Pro:
```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"periodEnd":"2027-01-31T00:00:00.000Z"}' \
  http://localhost:4000/api/admin/subscription/USER_ID/upgrade
```

### Cancel subscription:
```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/api/admin/subscription/USER_ID/cancel
```

### Downgrade to Free:
```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/api/admin/subscription/USER_ID/downgrade
```

## Performance Testing

### Load Test:
1. Create 100+ test users
2. Navigate to subscriptions page
3. Verify page loads in < 2 seconds
4. Test pagination performance
5. Test filter switching speed

### Expected Performance:
- Initial load: < 2 seconds
- Filter switch: < 500ms
- Action execution: < 1 second
- Page navigation: < 500ms

## Security Testing

### Test 1: Non-admin Access
**Steps:**
1. Login as regular user
2. Try to access `/admin/subscriptions`

**Expected:**
- Redirect to dashboard or 403 error
- No subscription data visible

### Test 2: Unauthenticated Access
**Steps:**
1. Logout
2. Try to access `/admin/subscriptions`

**Expected:**
- Redirect to login page
- No data accessible

### Test 3: API Direct Access
**Steps:**
1. Try API calls without token
2. Try API calls with regular user token

**Expected:**
- 401 Unauthorized for no token
- 403 Forbidden for non-admin token

## Cleanup After Testing
```bash
# Reset test user subscriptions
mongo learnloop
db.subscriptions.updateMany(
  { userId: { $in: ["test_user_1", "test_user_2"] } },
  { $set: { tier: "free", status: "active", currentPeriodEnd: null, canceledAt: null } }
)
```

## Known Issues / Edge Cases
1. **Expired subscriptions**: System should auto-downgrade on next access
2. **Concurrent updates**: Last write wins (consider adding optimistic locking)
3. **Timezone handling**: All dates in UTC, display in user's timezone
4. **Bulk operations**: Not yet implemented (future enhancement)
