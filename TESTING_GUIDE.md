# Publish Request Feature - Testing Guide

## ✅ Migration Completed
- Updated 12 users with publish request fields
- Updated 31 skillmaps with publish status fields

## Quick Test Scenarios

### 1. User Flow - Submit a Publish Request

**Prerequisites:**
- Have a skillmap with at least 5 nodes
- Be logged in as a regular user (not admin)

**Steps:**
1. Navigate to your skillmap detail page
2. Look for the "Request Publish" button
3. Click the button
4. Verify you see a success message
5. Check that the skillmap status changes to "Under Review" (amber badge)

**Expected Result:**
- Request submitted successfully
- Skillmap shows "Under Review" status
- You cannot submit another request (button disabled with message)

### 2. User Flow - View Request History

**Steps:**
1. Navigate to the "My Publish Requests" section (you may need to add this to your UI)
2. Verify you see your submitted request
3. Check the submission date and status

**Expected Result:**
- Request appears in history
- Shows correct status and date
- Can cancel if still pending

### 3. Admin Flow - Review Pending Requests

**Prerequisites:**
- Be logged in as an admin user
- Have at least one pending publish request

**Steps:**
1. Navigate to Admin Panel → Publish Requests
2. Verify you see the pending request queue
3. Check that requests show:
   - User avatar and name
   - Skillmap name and description
   - Node count and completion percentage
   - Submission date

**Expected Result:**
- Pending requests displayed oldest first
- All user and skillmap details visible
- Approve and Reject buttons available

### 4. Admin Flow - Approve a Request

**Steps:**
1. In Admin Panel → Publish Requests
2. Click "Approve" on a pending request
3. Optionally add an approval note
4. Click "Confirm Approval"
5. Wait for success message

**Expected Result:**
- Request approved successfully
- Template created in Templates section
- User receives email notification (check console if SMTP not configured)
- Request removed from pending queue

**Verify:**
- Go to Templates section
- Find the newly published template
- Check that author credit shows user's name

### 5. Admin Flow - Reject a Request

**Steps:**
1. In Admin Panel → Publish Requests
2. Click "Reject" on a pending request
3. Enter a rejection reason (required)
4. Click "Confirm Rejection"
5. Wait for success message

**Expected Result:**
- Request rejected successfully
- User receives email notification with feedback
- Request removed from pending queue
- User can see rejection reason in their request history

### 6. Rate Limiting - Test Quota

**Steps:**
1. As a user, submit a publish request (1st)
2. Try to submit another request immediately
3. Verify you get an error: "You already have a pending request"
4. Wait for admin to approve/reject
5. Submit 2 more requests (2nd and 3rd)
6. Try to submit a 4th request
7. Verify you get quota exceeded error with reset date

**Expected Result:**
- Max 1 pending request enforced
- Max 3 submissions per 30 days enforced
- Clear error messages with reset dates

### 7. Validation - Incomplete Skillmap

**Steps:**
1. Create a new skillmap with only 2-3 nodes
2. Try to submit a publish request
3. Verify you get an error about minimum nodes

**Expected Result:**
- Error: "Skillmap must have at least 5 skills. Currently has X."
- Request not submitted

### 8. Edge Case - Delete Skillmap with Pending Request

**Steps:**
1. Submit a publish request for a skillmap
2. Delete that skillmap
3. Check admin panel - request should be auto-cancelled

**Expected Result:**
- Request automatically cancelled
- Reason: "Skillmap was deleted by user"
- No longer appears in pending queue

## API Testing with cURL

### Check Eligibility
```bash
curl -X GET http://localhost:4000/api/publish-requests/eligibility \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Submit Request
```bash
curl -X POST http://localhost:4000/api/publish-requests \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"skillmapId": "YOUR_SKILLMAP_ID"}'
```

### Get My Requests
```bash
curl -X GET http://localhost:4000/api/publish-requests/my-requests \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Admin - Get Pending (requires admin token)
```bash
curl -X GET http://localhost:4000/api/publish-requests/admin/pending \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### Admin - Approve Request
```bash
curl -X POST http://localhost:4000/api/publish-requests/admin/REQUEST_ID/approve \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"adminNote": "Great work!"}'
```

### Admin - Reject Request
```bash
curl -X POST http://localhost:4000/api/publish-requests/admin/REQUEST_ID/reject \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"adminNote": "Needs more detailed descriptions"}'
```

## Email Notifications

If SMTP is configured, check your email for:
- **Approval Email**: Green gradient header, celebration emoji, link to templates
- **Rejection Email**: Gray header, feedback section, tips for resubmission

If SMTP is not configured, check the console logs for:
```
[DEV EMAIL] { to: '...', subject: '...', ... }
```

## Database Verification

### Check User Fields
```javascript
db.users.findOne({ email: "test@example.com" }, {
  publishRequestsThisMonth: 1,
  pendingRequestCount: 1,
  monthlyQuotaReset: 1
})
```

### Check Skillmap Fields
```javascript
db.skills.findOne({ _id: ObjectId("...") }, {
  publishStatus: 1,
  publishedAt: 1,
  authorCredit: 1
})
```

### Check Publish Requests
```javascript
db.publishrequests.find({ status: "pending" })
```

### Check Templates
```javascript
db.skillmaptemplates.find({ 
  sourceSkillmapId: { $exists: true } 
}, {
  title: 1,
  authorCredit: 1,
  sourceSkillmapId: 1
})
```

## Common Issues & Solutions

### Issue: "Request Publish" button not showing
**Solution:** Make sure you've integrated `PublishRequestButton` component into your skillmap detail page

### Issue: Admin panel shows empty queue
**Solution:** Submit a publish request as a regular user first

### Issue: Email notifications not received
**Solution:** Check SMTP configuration in .env file, or check console logs for [DEV EMAIL] messages

### Issue: "User not found" error
**Solution:** Ensure the user has a `firebaseUid` field in the database

### Issue: Template not appearing after approval
**Solution:** Check that the template was created successfully in the database and has `isPublished: true`

## Success Criteria

✅ Users can submit publish requests for valid skillmaps  
✅ Rate limiting works (1 pending, 3 per month)  
✅ Admins can see pending requests in queue  
✅ Admins can approve requests (creates template)  
✅ Admins can reject requests (with required reason)  
✅ Users receive email notifications  
✅ Status badges display correctly  
✅ Author credit shows on published templates  
✅ Auto-cancellation works when skillmap deleted  
✅ Resubmission works after rejection  

## Next Steps

After testing, consider:
1. Adding the `PublishRequestButton` to your skillmap detail pages
2. Adding the `MyPublishRequests` component to user profile or dashboard
3. Customizing email templates with your branding
4. Setting up proper SMTP for production
5. Adding analytics to track template usage

Happy testing! 🚀
