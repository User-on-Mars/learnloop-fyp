import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Alert from "../components/Alert";
import { useAuth } from "../useAuth";
import { updateProfile, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { auth } from "../firebase";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";

export default function Profile() {
  const user = useAuth();
  const navigate = useNavigate();
  
  // Display Name State
  const [displayName, setDisplayName] = useState("");
  const [originalDisplayName, setOriginalDisplayName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [nameUpdateMessage, setNameUpdateMessage] = useState(null);
  
  // Password Change State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordChangeMessage, setPasswordChangeMessage] = useState(null);
  
  // Initialize display name from user
  useEffect(() => {
    if (user) {
      const name = user.displayName || "";
      setDisplayName(name);
      setOriginalDisplayName(name);
    }
  }, [user]);

  // Clear password fields on component mount to prevent autofill
  useEffect(() => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    
    // Additional clearing after a delay to override persistent autofill
    const timer = setTimeout(() => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Handle edit mode
  const handleEditName = () => {
    setIsEditingName(true);
    setNameUpdateMessage(null);
  };
  
  // Handle cancel edit
  const handleCancelEdit = () => {
    setDisplayName(originalDisplayName);
    setIsEditingName(false);
    setNameUpdateMessage(null);
  };
  
  // Handle save display name
  const handleSaveName = async () => {
    // Validate display name is not empty
    const trimmedName = displayName.trim();
    if (!trimmedName) {
      setNameUpdateMessage({
        variant: "error",
        text: "Display name cannot be empty."
      });
      return;
    }
    
    try {
      setIsUpdatingName(true);
      setNameUpdateMessage(null);
      
      // Update display name in Firebase
      await updateProfile(auth.currentUser, {
        displayName: trimmedName
      });
      
      // Update local state
      setOriginalDisplayName(trimmedName);
      setDisplayName(trimmedName);
      setIsEditingName(false);
      
      // Show success message
      setNameUpdateMessage({
        variant: "success",
        text: "Display name updated successfully!"
      });
      
      // Auto-dismiss success message after 3 seconds
      setTimeout(() => {
        setNameUpdateMessage(null);
      }, 3000);
      
    } catch (error) {
      let errorMessage = "Failed to update display name.";
      
      if (error.code === "auth/network-request-failed") {
        errorMessage = "Unable to update name. Please check your connection.";
      } else if (error.code === "auth/permission-denied") {
        errorMessage = "You don't have permission to update this profile.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setNameUpdateMessage({
        variant: "error",
        text: errorMessage
      });
    } finally {
      setIsUpdatingName(false);
    }
  };
  
  // Handle password change
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    // Clear any previous messages
    setPasswordChangeMessage(null);
    
    // Client-side validation: Check if new password matches confirmation
    if (newPassword !== confirmPassword) {
      setPasswordChangeMessage({
        variant: "error",
        text: "New passwords do not match"
      });
      return;
    }
    
    // Client-side validation: Check minimum length requirement
    if (newPassword.length < 6) {
      setPasswordChangeMessage({
        variant: "error",
        text: "Password must be at least 6 characters"
      });
      return;
    }
    
    try {
      setIsChangingPassword(true);
      
      // Re-authenticate user with current password
      const credential = EmailAuthProvider.credential(
        auth.currentUser.email,
        currentPassword
      );
      await reauthenticateWithCredential(auth.currentUser, credential);
      
      // Update password
      await updatePassword(auth.currentUser, newPassword);
      
      // Show success message
      setPasswordChangeMessage({
        variant: "success",
        text: "Password changed successfully!"
      });
      
      // Clear form fields after successful password change
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      
      // Auto-dismiss success message after 3 seconds
      setTimeout(() => {
        setPasswordChangeMessage(null);
      }, 3000);
      
    } catch (error) {
      let errorMessage = "Failed to change password";
      
      if (error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
        errorMessage = "Current password is incorrect";
      } else if (error.code === "auth/weak-password") {
        errorMessage = "New password is too weak";
      } else if (error.code === "auth/requires-recent-login") {
        errorMessage = "Please log out and log back in before changing password";
      } else if (error.code === "auth/network-request-failed") {
        errorMessage = "Unable to change password. Please check your connection.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setPasswordChangeMessage({
        variant: "error",
        text: errorMessage
      });
    } finally {
      setIsChangingPassword(false);
    }
  };
  
  // Get user initials for avatar
  const getInitials = () => {
    if (!user) return "";
    if (user.displayName) {
      const names = user.displayName.trim().split(" ");
      if (names.length >= 2) {
        return (names[0][0] + names[names.length - 1][0]).toUpperCase();
      }
      return names[0][0].toUpperCase();
    }
    if (user.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };
  
  // Show loading state while user is being fetched
  if (user === undefined) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 overflow-y-auto flex items-center justify-center">
          <p className="text-gray-600">Loading...</p>
        </main>
      </div>
    );
  }
  
  // Show message if no user is logged in
  if (!user) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 overflow-y-auto flex items-center justify-center">
          <p className="text-gray-600">Please log in to view your profile.</p>
        </main>
      </div>
    );
  }
  
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar Navigation - Hidden on mobile */}
      <Sidebar />
      
      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto w-full">
        {/* Mobile Header - Only visible on mobile */}
        <div className="md:hidden bg-white border-b border-gray-200 p-4 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
            <h1 className="text-lg font-bold text-gray-900">Profile Settings</h1>
          </div>
        </div>

        <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
          {/* Page Header - Hidden on mobile, shown on desktop */}
          <div className="mb-6 sm:mb-8 hidden md:block">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Profile Settings</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-2">Manage your account information and preferences</p>
          </div>
          
          {/* Profile content */}
          <div className="space-y-4 sm:space-y-6">
            {/* Profile Information Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6">Profile Information</h2>
              
              {/* Avatar Section */}
              <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-ll-600 text-white flex items-center justify-center text-xl sm:text-2xl font-semibold flex-shrink-0">
                  {getInitials()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-gray-600">Profile Picture</p>
                  <p className="text-xs text-gray-500">Avatar based on your initials</p>
                </div>
              </div>
              
              {/* Email Field (Read-only) */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={user.email || ""}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                />
              </div>
              
              {/* Display Name Field (Editable) */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Display Name
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={displayName}
                    disabled={!isEditingName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder={!displayName && !isEditingName ? "No name set" : ""}
                    className={`flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ll-600 focus:border-transparent ${
                      !isEditingName ? "bg-gray-50 text-gray-500 cursor-not-allowed" : ""
                    }`}
                  />
                  {isEditingName ? (
                    <div className="flex gap-2">
                      <button
                        onClick={handleCancelEdit}
                        disabled={isUpdatingName}
                        className="flex-1 sm:flex-none px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition disabled:opacity-60"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveName}
                        disabled={isUpdatingName}
                        className="flex-1 sm:flex-none px-4 py-2 bg-ll-600 text-black rounded-lg font-medium hover:bg-ll-700 transition disabled:opacity-60"
                      >
                        {isUpdatingName ? "Saving..." : "Save"}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleEditName}
                      className="w-full sm:w-auto px-4 py-2 bg-ll-600 text-black rounded-lg font-medium hover:bg-ll-700 transition"
                    >
                      Edit
                    </button>
                  )}
                </div>
              </div>
              
              {/* Status Message */}
              {nameUpdateMessage && (
                <Alert
                  variant={nameUpdateMessage.variant}
                  description={nameUpdateMessage.text}
                />
              )}
            </div>
            
            {/* Password Change Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6">Change Password</h2>
              
              <form onSubmit={handlePasswordChange} autoComplete="off">
                {/* Hidden dummy fields to prevent autofill */}
                <input type="text" style={{display: 'none'}} />
                <input type="password" style={{display: 'none'}} />
                
                {/* Current Password */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                      disabled={isChangingPassword}
                      autoComplete="new-password"
                      data-lpignore="true"
                      name={`current-pwd-${Date.now()}`}
                      className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ll-600 focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed"
                      placeholder="Enter your current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      disabled={isChangingPassword}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 disabled:opacity-60"
                      aria-label={showCurrentPassword ? "Hide current password" : "Show current password"}
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
                
                {/* New Password */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={6}
                      disabled={isChangingPassword}
                      autoComplete="new-password"
                      className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ll-600 focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed"
                      placeholder="Enter your new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      disabled={isChangingPassword}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 disabled:opacity-60"
                      aria-label={showNewPassword ? "Hide new password" : "Show new password"}
                    >
                      {showNewPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
                </div>
                
                {/* Confirm Password */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      disabled={isChangingPassword}
                      autoComplete="new-password"
                      className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ll-600 focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed"
                      placeholder="Confirm your new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      disabled={isChangingPassword}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 disabled:opacity-60"
                      aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
                
                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="w-full px-4 py-2 bg-ll-600 text-black rounded-lg font-medium hover:bg-ll-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isChangingPassword ? "Changing Password..." : "Change Password"}
                </button>
              </form>
              
              {/* Status Message */}
              {passwordChangeMessage && (
                <div className="mt-4">
                  <Alert
                    variant={passwordChangeMessage.variant}
                    description={passwordChangeMessage.text}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
