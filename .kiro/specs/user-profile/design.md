# User Profile Design Document

## Overview

The User Profile feature provides a dedicated page for users to view and manage their account information. The design focuses on simplicity and security, allowing users to update their display name and change their password through intuitive forms with clear validation and feedback. The implementation leverages Firebase Authentication's built-in methods for secure credential management.

## Architecture

### Component Hierarchy

```
Profile (Page)
├── Sidebar Navigation (Shared)
├── Main Content Area
│   ├── Page Header
│   │   └── Title ("Profile Settings")
│   ├── Profile Information Card
│   │   ├── Avatar Display
│   │   ├── Email Display (Read-only)
│   │   ├── Display Name Field (Editable)
│   │   ├── Edit/Save Button
│   │   └── Status Messages
│   └── Password Change Card
│       ├── Current Password Field
│       ├── New Password Field
│       ├── Confirm Password Field
│       ├── Change Password Button
│       └── Status Messages
```

### Technology Stack

- **Frontend Framework**: React 18.2.0 with React Router DOM 6.28.0
- **Styling**: Tailwind CSS 3.4.13
- **Authentication**: Firebase 12.5.0 (updateProfile, updatePassword, reauthenticateWithCredential)
- **Form Handling**: React useState hooks for local state management
- **Validation**: Client-side validation with Firebase error handling

### State Management

The Profile page manages local state for:
- Form input values (displayName, currentPassword, newPassword, confirmPassword)
- Loading states (isUpdatingName, isChangingPassword)
- Success/error messages
- Edit mode toggles

## Components and Interfaces

### 1. Profile Page Component

**File**: `frontend/src/pages/Profile.jsx`

**Purpose**: Main container for profile management functionality

**State Interface**:
```javascript
{
  // Display Name State
  displayName: string,
  isEditingName: boolean,
  isUpdatingName: boolean,
  nameUpdateMessage: { type: 'success' | 'error', text: string } | null,
  
  // Password Change State
  currentPassword: string,
  newPassword: string,
  confirmPassword: string,
  isChangingPassword: boolean,
  passwordChangeMessage: { type: 'success' | 'error', text: string } | null
}
```

**Key Methods**:
```javascript
// Display Name Management
const handleEditName = () => void
const handleSaveName = async () => Promise<void>
const handleCancelEdit = () => void

// Password Management
const handlePasswordChange = async (e: Event) => Promise<void>
const validatePasswordForm = () => boolean

// Message Management
const clearMessages = () => void
```

### 2. Profile Information Card

**Purpose**: Displays and allows editing of user profile information

**Layout Structure**:
```jsx
<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
  <h2 className="text-xl font-semibold mb-6">Profile Information</h2>
  
  {/* Avatar Section */}
  <div className="flex items-center gap-4 mb-6">
    <div className="w-20 h-20 rounded-full bg-ll-600 text-white flex items-center justify-center text-2xl font-semibold">
      {/* Initials or Photo */}
    </div>
    <div>
      <p className="text-sm text-gray-600">Profile Picture</p>
      <p className="text-xs text-gray-500">Avatar based on your initials</p>
    </div>
  </div>
  
  {/* Email Field (Read-only) */}
  <div className="mb-4">
    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
    <input type="email" value={user.email} disabled className="..." />
  </div>
  
  {/* Display Name Field (Editable) */}
  <div className="mb-4">
    <label className="block text-sm font-medium text-gray-700 mb-2">Display Name</label>
    <div className="flex gap-2">
      <input 
        type="text" 
        value={displayName} 
        disabled={!isEditingName}
        onChange={(e) => setDisplayName(e.target.value)}
        className="..."
      />
      {isEditingName ? (
        <>
          <Button onClick={handleSaveName} loading={isUpdatingName}>Save</Button>
          <Button onClick={handleCancelEdit} variant="secondary">Cancel</Button>
        </>
      ) : (
        <Button onClick={handleEditName}>Edit</Button>
      )}
    </div>
  </div>
  
  {/* Status Message */}
  {nameUpdateMessage && (
    <Alert type={nameUpdateMessage.type} message={nameUpdateMessage.text} />
  )}
</div>
```

**Styling**:
- Card: `bg-white rounded-xl shadow-sm border border-gray-200 p-6`
- Avatar: `w-20 h-20 rounded-full bg-ll-600 text-white`
- Input fields: `w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ll-600`
- Disabled input: `bg-gray-50 text-gray-500 cursor-not-allowed`

### 3. Password Change Card

**Purpose**: Allows users to securely change their password

**Layout Structure**:
```jsx
<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
  <h2 className="text-xl font-semibold mb-6">Change Password</h2>
  
  <form onSubmit={handlePasswordChange}>
    {/* Current Password */}
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Current Password
      </label>
      <input 
        type="password" 
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
        required
        className="..."
      />
    </div>
    
    {/* New Password */}
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        New Password
      </label>
      <input 
        type="password" 
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        required
        minLength={6}
        className="..."
      />
      <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
    </div>
    
    {/* Confirm Password */}
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Confirm New Password
      </label>
      <input 
        type="password" 
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        required
        className="..."
      />
    </div>
    
    {/* Submit Button */}
    <Button 
      type="submit" 
      loading={isChangingPassword}
      className="w-full"
    >
      Change Password
    </Button>
  </form>
  
  {/* Status Message */}
  {passwordChangeMessage && (
    <Alert 
      type={passwordChangeMessage.type} 
      message={passwordChangeMessage.text} 
      className="mt-4"
    />
  )}
</div>
```

**Validation Rules**:
- Current password: Required, non-empty
- New password: Required, minimum 6 characters
- Confirm password: Required, must match new password
- All fields must be filled before submission

## Data Models

### User Profile Model
```typescript
interface UserProfile {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
}
```

### Form State Models
```typescript
interface DisplayNameForm {
  displayName: string;
  isEditing: boolean;
  isLoading: boolean;
  message: StatusMessage | null;
}

interface PasswordChangeForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  isLoading: boolean;
  message: StatusMessage | null;
}

interface StatusMessage {
  type: 'success' | 'error';
  text: string;
}
```

## Firebase Authentication Methods

### Update Display Name
```javascript
import { updateProfile } from 'firebase/auth';

const handleSaveName = async () => {
  try {
    setIsUpdatingName(true);
    await updateProfile(auth.currentUser, {
      displayName: displayName.trim()
    });
    setNameUpdateMessage({ 
      type: 'success', 
      text: 'Display name updated successfully!' 
    });
    setIsEditingName(false);
  } catch (error) {
    setNameUpdateMessage({ 
      type: 'error', 
      text: error.message 
    });
  } finally {
    setIsUpdatingName(false);
  }
};
```

### Change Password
```javascript
import { 
  updatePassword, 
  reauthenticateWithCredential, 
  EmailAuthProvider 
} from 'firebase/auth';

const handlePasswordChange = async (e) => {
  e.preventDefault();
  
  // Validation
  if (newPassword !== confirmPassword) {
    setPasswordChangeMessage({ 
      type: 'error', 
      text: 'New passwords do not match' 
    });
    return;
  }
  
  if (newPassword.length < 6) {
    setPasswordChangeMessage({ 
      type: 'error', 
      text: 'Password must be at least 6 characters' 
    });
    return;
  }
  
  try {
    setIsChangingPassword(true);
    
    // Re-authenticate user
    const credential = EmailAuthProvider.credential(
      auth.currentUser.email,
      currentPassword
    );
    await reauthenticateWithCredential(auth.currentUser, credential);
    
    // Update password
    await updatePassword(auth.currentUser, newPassword);
    
    setPasswordChangeMessage({ 
      type: 'success', 
      text: 'Password changed successfully!' 
    });
    
    // Clear form
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    
  } catch (error) {
    let errorMessage = 'Failed to change password';
    
    if (error.code === 'auth/wrong-password') {
      errorMessage = 'Current password is incorrect';
    } else if (error.code === 'auth/weak-password') {
      errorMessage = 'New password is too weak';
    } else if (error.code === 'auth/requires-recent-login') {
      errorMessage = 'Please log out and log back in before changing password';
    }
    
    setPasswordChangeMessage({ 
      type: 'error', 
      text: errorMessage 
    });
  } finally {
    setIsChangingPassword(false);
  }
};
```

## Error Handling

### Display Name Update Errors
- **Network Error**: "Unable to update name. Please check your connection."
- **Permission Error**: "You don't have permission to update this profile."
- **Empty Name**: "Display name cannot be empty."

### Password Change Errors
- **Wrong Current Password**: "Current password is incorrect"
- **Weak Password**: "New password is too weak. Use at least 6 characters."
- **Password Mismatch**: "New passwords do not match"
- **Recent Login Required**: "Please log out and log back in before changing password"
- **Network Error**: "Unable to change password. Please check your connection."

### Error Display
- Errors appear below the relevant form section
- Errors persist until user takes action (new submission or dismissal)
- Success messages auto-dismiss after 3 seconds
- Use Alert component for consistent styling

## Testing Strategy

### Unit Tests
- Test display name validation (empty, whitespace-only)
- Test password validation (length, match confirmation)
- Test form state management (edit mode, loading states)
- Test error message display and clearing
- Mock Firebase auth methods for isolated testing

### Integration Tests
- Test complete display name update flow
- Test complete password change flow
- Test error handling for various Firebase error codes
- Test form reset after successful password change
- Test navigation and sidebar integration

### Manual Testing Checklist
- [ ] Display name updates reflect immediately in sidebar
- [ ] Password change requires correct current password
- [ ] Password mismatch shows appropriate error
- [ ] Success messages appear and auto-dismiss
- [ ] Loading states disable buttons during operations
- [ ] Form fields clear after successful password change
- [ ] Page is responsive on mobile, tablet, desktop
- [ ] Keyboard navigation works for all form fields

## Styling and Design System

### Color Palette
- Primary: `ll-600` (#0284c7)
- Success: `green-600` (#16a34a)
- Error: `red-600` (#dc2626)
- Background: `gray-50` (#f9fafb)
- Card Background: `white`
- Text Primary: `gray-900`
- Text Secondary: `gray-600`
- Border: `gray-300`
- Disabled: `gray-50` background, `gray-500` text

### Form Styling
- Input fields: `px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ll-600 focus:border-transparent`
- Labels: `text-sm font-medium text-gray-700 mb-2`
- Helper text: `text-xs text-gray-500 mt-1`
- Buttons: Use existing Button component with variants

### Responsive Design
- Mobile (<768px): Single column, full-width cards, stacked buttons
- Tablet (768px-1023px): Single column, max-width container
- Desktop (≥1024px): Two-column layout with sidebar, max-width 800px for forms

## Security Considerations

### Password Security
- Never display current or new passwords in plain text
- Clear password fields after successful change
- Require re-authentication for password changes
- Enforce minimum password length (6 characters)
- Use Firebase's built-in password strength validation

### Data Privacy
- Email address is read-only (cannot be changed in profile)
- Display name is optional and can be cleared
- No sensitive data stored in local state beyond session
- All authentication operations use secure Firebase methods

### Session Management
- Password changes do not log user out
- Display name changes do not require re-authentication
- Handle "requires-recent-login" error gracefully
- Maintain user session throughout profile updates
