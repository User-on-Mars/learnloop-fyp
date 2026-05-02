# Skillmap Publish Request Feature

## Overview
This feature allows users to submit their skillmaps for publication as templates. Admins can review, approve, or reject submissions through a dedicated admin panel.

## Features Implemented

### 1. Data Models

#### PublishRequest Model (`backend/src/models/PublishRequest.js`)
- Tracks publish request lifecycle
- Fields: userId, skillmapId, status, adminNote, submittedAt, reviewedAt, reviewedBy
- Includes skillmap snapshot at submission time
- Static methods for querying pending requests and user quotas

#### User Model Updates
- `publishRequestsThisMonth`: Number of submissions in current 30-day window
- `pendingRequestCount`: Number of pending requests (max 1)
- `monthlyQuotaReset`: Timestamp for quota reset

#### Skill Model Updates
- `publishStatus`: 'draft' | 'pending' | 'published' | 'rejected'
- `publishedAt`: Publication timestamp
- `authorCredit`: Display name shown on published template

#### SkillMapTemplate Model Updates
- `sourceSkillmapId`: Reference to original user skillmap
- `authorCredit`: User's display name

### 2. Rate Limiting Rules
- **Max 1 pending request** at a time per user
- **Max 3 submission attempts** per rolling 30-day window
- Rejected submissions count toward quota
- Approved submissions do NOT consume extra quota
- Clear error messages with reset dates

### 3. Backend Services

#### PublishRequestService (`backend/src/services/PublishRequestService.js`)
- `checkSubmissionEligibility()`: Validates user can submit
- `validateSkillmapCompleteness()`: Ensures skillmap has ≥5 nodes
- `submitPublishRequest()`: Creates new request
- `getPendingRequests()`: Admin view of pending requests
- `getUserRequests()`: User's request history
- `approveRequest()`: Approves and creates template
- `rejectRequest()`: Rejects with feedback
- `cancelRequest()`: User or system cancellation
- `handleSkillmapDeletion()`: Auto-cancels requests when skillmap deleted

#### NotificationService Updates
- `sendPublishRequestApprovedNotification()`: Email + in-app notification
- `sendPublishRequestRejectedNotification()`: Email + in-app notification with feedback

### 4. Backend Routes (`backend/src/routes/publishRequests.js`)

#### User Endpoints
- `GET /api/publish-requests/eligibility` - Check if user can submit
- `POST /api/publish-requests` - Submit publish request
- `GET /api/publish-requests/my-requests` - Get user's request history
- `DELETE /api/publish-requests/:requestId` - Cancel pending request

#### Admin Endpoints
- `GET /api/publish-requests/admin/pending` - Get all pending requests
- `POST /api/publish-requests/admin/:requestId/approve` - Approve request
- `POST /api/publish-requests/admin/:requestId/reject` - Reject request (requires reason)

### 5. Frontend Components

#### User Components
- **PublishRequestButton** (`frontend/src/components/PublishRequestButton.jsx`)
  - Shows eligibility status
  - Handles submission
  - Displays status badges (Draft, Under Review, Published, Not Approved)
  
- **MyPublishRequests** (`frontend/src/components/MyPublishRequests.jsx`)
  - Shows user's request history
  - Displays admin feedback
  - Allows cancellation of pending requests

- **PublishStatusBadge** (`frontend/src/components/PublishStatusBadge.jsx`)
  - Visual status indicators with color coding

#### Admin Components
- **AdminPublishRequests** (`frontend/src/pages/admin/AdminPublishRequests.jsx`)
  - Queue of pending requests (oldest first)
  - User avatar + display name
  - Skillmap preview with completeness score
  - Approve/Reject actions with modal dialogs
  - Optional admin notes on approval
  - Required rejection reason

### 6. UI Integration
- Added "Publish Requests" to admin sidebar navigation
- Added route `/admin/publish-requests` to main router
- Updated TemplateGallery to show author credit
- Status badges integrated into skillmap views

### 7. Notifications
- **On Approval**: Email + in-app notification with link to templates
- **On Rejection**: Email + in-app notification with feedback and resubmission tips
- Beautiful HTML email templates with brand styling

### 8. Edge Cases Handled
- ✅ User deletes skillmap while request pending → auto-cancel
- ✅ Skillmap doesn't meet minimum requirements → clear error
- ✅ User exceeds quota → show reset date
- ✅ User already has pending request → prevent duplicate
- ✅ Request already reviewed → prevent duplicate action
- ✅ Resubmission after rejection → allowed within quota

## Installation & Setup

### 1. Run Migration Script
```bash
node backend/scripts/initializePublishRequestFields.js
```

This initializes the new fields on existing users and skillmaps.

### 2. Environment Variables
No new environment variables required. Uses existing SMTP configuration for email notifications.

### 3. Database Indexes
The PublishRequest model automatically creates indexes on:
- `userId` + `status`
- `status` + `submittedAt`
- `skillmapId`

## Usage

### For Users

1. **Submit a Publish Request**
   - Navigate to your skillmap
   - Click "Request Publish" button
   - System checks eligibility (≥5 nodes, no pending requests, within quota)
   - Skillmap status changes to "Under Review"

2. **Track Request Status**
   - View "My Publish Requests" section
   - See submission date, status, and admin feedback
   - Cancel pending requests if needed

3. **After Approval**
   - Receive email + in-app notification
   - Skillmap appears in Templates section with your name
   - Status badge shows "Published"

4. **After Rejection**
   - Receive email with feedback
   - Review admin's reason
   - Revise skillmap and resubmit (within quota)

### For Admins

1. **Review Pending Requests**
   - Navigate to Admin Panel → Publish Requests
   - See queue sorted by submission date (oldest first)
   - View user info, skillmap details, completeness score

2. **Approve Request**
   - Click "Approve" button
   - Optionally add a note for the user
   - System creates template and notifies user

3. **Reject Request**
   - Click "Reject" button
   - **Must provide rejection reason** (required)
   - User receives feedback via email + in-app notification

## API Examples

### Check Eligibility
```javascript
GET /api/publish-requests/eligibility

Response:
{
  "canSubmit": true
}
// or
{
  "canSubmit": false,
  "reason": "You already have a pending publish request.",
  "resetDate": "2026-06-01T00:00:00.000Z"
}
```

### Submit Request
```javascript
POST /api/publish-requests
Body: { "skillmapId": "507f1f77bcf86cd799439011" }

Response:
{
  "message": "Publish request submitted successfully",
  "request": { ... }
}
```

### Get Pending Requests (Admin)
```javascript
GET /api/publish-requests/admin/pending

Response:
{
  "requests": [
    {
      "_id": "...",
      "userId": "...",
      "skillmapId": "...",
      "status": "pending",
      "submittedAt": "2026-05-02T...",
      "user": {
        "name": "John Doe",
        "email": "john@example.com",
        "avatar": "..."
      },
      "skillmap": {
        "name": "JavaScript Mastery",
        "description": "...",
        "nodeCount": 8,
        "completionPercentage": 75
      }
    }
  ]
}
```

### Approve Request (Admin)
```javascript
POST /api/publish-requests/admin/:requestId/approve
Body: { "adminNote": "Great work! Your skillmap is now live." }

Response:
{
  "message": "Request approved successfully",
  "request": { ... },
  "template": { ... }
}
```

### Reject Request (Admin)
```javascript
POST /api/publish-requests/admin/:requestId/reject
Body: { 
  "adminNote": "The skillmap needs clearer node descriptions and a more logical learning path."
}

Response:
{
  "message": "Request rejected successfully",
  "request": { ... }
}
```

## Status Badge Colors

- **Draft** (gray): Skillmap not yet submitted
- **Under Review** (amber): Request pending admin review
- **Published** (green): Approved and live in templates
- **Not Approved** (red): Rejected by admin

## Testing Checklist

### User Flow
- [ ] Submit publish request with valid skillmap (≥5 nodes)
- [ ] Try to submit with incomplete skillmap (<5 nodes) → error
- [ ] Try to submit with pending request → error
- [ ] Try to submit after reaching quota (3 in 30 days) → error
- [ ] View request history
- [ ] Cancel pending request
- [ ] Receive approval notification
- [ ] Receive rejection notification
- [ ] Resubmit after rejection

### Admin Flow
- [ ] View pending requests queue
- [ ] Approve request with optional note
- [ ] Reject request with required reason
- [ ] Verify template created on approval
- [ ] Verify user notified on approval/rejection
- [ ] Try to review already-reviewed request → error

### Edge Cases
- [ ] Delete skillmap with pending request → auto-cancel
- [ ] Quota resets after 30 days
- [ ] Multiple users submitting simultaneously
- [ ] Network errors during submission
- [ ] Email delivery failures (graceful degradation)

## Future Enhancements

1. **Bulk Actions**: Approve/reject multiple requests at once
2. **Request Versioning**: Show diff between rejected and resubmitted versions
3. **Template Categories**: Allow admins to categorize published templates
4. **Usage Analytics**: Track how many users apply each template
5. **Featured Templates**: Highlight top-quality submissions
6. **User Reputation**: Track approval rate, reward quality contributors
7. **Preview Mode**: Let admins preview skillmap before approval
8. **Automated Checks**: AI-powered quality checks before submission

## Files Modified/Created

### Backend
- ✅ `backend/src/models/PublishRequest.js` (new)
- ✅ `backend/src/models/User.js` (updated)
- ✅ `backend/src/models/Skill.js` (updated)
- ✅ `backend/src/models/SkillMapTemplate.js` (updated)
- ✅ `backend/src/services/PublishRequestService.js` (new)
- ✅ `backend/src/services/NotificationService.js` (updated)
- ✅ `backend/src/services/SkillService.js` (updated)
- ✅ `backend/src/routes/publishRequests.js` (new)
- ✅ `backend/src/server.js` (updated)
- ✅ `backend/scripts/initializePublishRequestFields.js` (new)

### Frontend
- ✅ `frontend/src/api/client.ts` (updated)
- ✅ `frontend/src/components/PublishRequestButton.jsx` (new)
- ✅ `frontend/src/components/MyPublishRequests.jsx` (new)
- ✅ `frontend/src/components/PublishStatusBadge.jsx` (new)
- ✅ `frontend/src/components/TemplateGallery.jsx` (updated)
- ✅ `frontend/src/components/admin/AdminSidebar.jsx` (updated)
- ✅ `frontend/src/pages/admin/AdminPublishRequests.jsx` (new)
- ✅ `frontend/src/main.jsx` (updated)

## Support

For issues or questions about this feature, contact the development team or create an issue in the repository.
