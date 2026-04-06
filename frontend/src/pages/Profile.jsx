import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Alert from "../components/Alert";
import { Avatar } from "../components/Avatar";
import { useAuth } from "../useAuth";
import { updateProfile, updatePassword, reauthenticateWithCredential, EmailAuthProvider, linkWithCredential } from "firebase/auth";
import { auth } from "../firebase";
import { authAPI } from "../api/client";
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
    
    // Auth Provider State
    const [hasPasswordProvider, setHasPasswordProvider] = useState(false);
    const [hasGoogleProvider, setHasGoogleProvider] = useState(false);
    const [authProviders, setAuthProviders] = useState([]);
    
    // Initialize display name from user and check auth providers
    useEffect(() => {
        if (user) {
            const name = user.displayName || "";
            setDisplayName(name);
            setOriginalDisplayName(name);
            
            // Check authentication providers
            const providers = user.providerData || [];
            const hasPassword = providers.some(p => p.providerId === 'password');
            const hasGoogle = providers.some(p => p.providerId === 'google.com');
            
            setHasPasswordProvider(hasPassword);
            setHasGoogleProvider(hasGoogle);
            setAuthProviders(providers.map(p => p.providerId));
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
            
            // Sync profile to backend using API client
            try {
                await authAPI.syncProfile({
                    email: auth.currentUser.email,
                    displayName: trimmedName,
                    firebaseUid: auth.currentUser.uid
                });
                console.log('✅ Profile synced to backend');
            } catch (syncError) {
                console.warn('⚠️ Failed to sync profile to backend:', syncError);
            }
            
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
    
    // Handle password change or set
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
            
            if (hasPasswordProvider) {
                // User already has password - change it
                // Re-authenticate user with current password
                const credential = EmailAuthProvider.credential(
                    auth.currentUser.email,
                    currentPassword
                );
                await reauthenticateWithCredential(auth.currentUser, credential);
                
                // Update password
                await updatePassword(auth.currentUser, newPassword);
                
                setPasswordChangeMessage({
                    variant: "success",
                    text: "Password changed successfully!"
                });
            } else {
                // User doesn't have password (Google-only) - set it
                const credential = EmailAuthProvider.credential(
                    auth.currentUser.email,
                    newPassword
                );
                await linkWithCredential(auth.currentUser, credential);
                
                // Update local state
                setHasPasswordProvider(true);
                
                setPasswordChangeMessage({
                    variant: "success",
                    text: "Password set successfully! You can now log in with email and password."
                });
            }
            
            // Clear form fields after successful operation
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            
            // Auto-dismiss success message after 3 seconds
            setTimeout(() => {
                setPasswordChangeMessage(null);
            }, 3000);
            
        } catch (error) {
            let errorMessage = hasPasswordProvider ? "Failed to change password" : "Failed to set password";
            
            if (error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
                errorMessage = "Current password is incorrect";
            } else if (error.code === "auth/weak-password") {
                errorMessage = "New password is too weak";
            } else if (error.code === "auth/requires-recent-login") {
                errorMessage = "Please log out and log back in before changing password";
            } else if (error.code === "auth/network-request-failed") {
                errorMessage = "Unable to change password. Please check your connection.";
            } else if (error.code === "auth/email-already-in-use") {
                errorMessage = "This email is already associated with another account";
            } else if (error.code === "auth/provider-already-linked") {
                errorMessage = "Password is already set for this account";
                setHasPasswordProvider(true);
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
            <div className="flex min-h-screen bg-site-bg">
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
            <div className="flex min-h-screen bg-site-bg">
                <Sidebar />
                <main className="flex-1 overflow-y-auto flex items-center justify-center">
                    <p className="text-gray-600">Please log in to view your profile.</p>
                </main>
            </div>
        );
    }
    
    return (
        <div className="flex min-h-screen bg-site-bg">
            {/* Sidebar Navigation - Hidden on mobile */}
            <Sidebar />
            
            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto w-full">
                {/* Mobile Header - Only visible on mobile */}
                <div className="md:hidden bg-white border-b border-gray-100 p-4 sticky top-0 z-10 shadow-sm">
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

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* Page Header - Hidden on mobile, shown on desktop */}
                    <div className="mb-6 sm:mb-8 hidden md:block">
                        <h1 className="text-2xl sm:text-3xl font-bold text-site-ink">Profile Settings</h1>
                        <p className="text-sm sm:text-base text-site-muted mt-2">Manage your account information and preferences</p>
                    </div>
                    
                    {/* Profile content */}
                    <div className="space-y-4 sm:space-y-6">
                        {/* Profile Information Card - Consistent Card Style */}
                        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4 sm:p-6">
                            <h2 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6 text-site-ink">Profile Information</h2>
                            
                            {/* Avatar Section - Styled with Indigo theme */}
                            <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                                <Avatar
                                  photoURL={user?.photoURL}
                                  displayName={user?.displayName}
                                  email={user?.email}
                                  size="lg"
                                  className="shadow-lg"
                                />
                                <div className="min-w-0">
                                    <p className="text-sm text-gray-600 font-medium">Account Profile</p>
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
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
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
                                        // Use site-accent focus border
                                        className={`flex-1 px-4 py-2 border-2 border-transparent rounded-lg outline-none focus:border-site-accent transition-colors bg-gray-50 focus:bg-white ${
                                            !isEditingName ? "bg-gray-100 text-gray-600 cursor-not-allowed" : "text-gray-900"
                                        }`}
                                    />
                                    {isEditingName ? (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={handleCancelEdit}
                                                disabled={isUpdatingName}
                                                className="flex-1 sm:flex-none px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-100 transition disabled:opacity-60 shadow-sm"
                                            >
                                                Cancel
                                            </button>
                                            {/* Save Button - Primary Indigo */}
                                            <button
                                                onClick={handleSaveName}
                                                disabled={isUpdatingName}
                                                className="flex-1 sm:flex-none px-4 py-2 bg-site-accent text-white rounded-lg font-medium hover:bg-site-accent-hover transition disabled:opacity-60 shadow-md"
                                            >
                                                {isUpdatingName ? "Saving..." : "Save"}
                                            </button>
                                        </div>
                                    ) : (
                                        // Edit Button - Primary Indigo
                                        <button
                                            onClick={handleEditName}
                                            className="w-full sm:w-auto px-4 py-2 bg-site-accent text-white rounded-lg font-medium hover:bg-site-accent-hover transition shadow-md"
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
                        
                        {/* Password Change Card - Consistent Card Style */}
                        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4 sm:p-6">
                            <h2 className="text-lg sm:text-xl font-bold mb-2 text-site-ink">
                                {hasPasswordProvider ? 'Change Password' : 'Set Password'}
                            </h2>
                            
                            {/* Login Methods Info */}
                            {(hasGoogleProvider || hasPasswordProvider) && (
                                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                                    <p className="text-sm text-green-800 font-medium mb-1">Login methods:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {hasGoogleProvider && (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-green-300 rounded text-xs text-green-700">
                                                <svg className="w-4 h-4" viewBox="0 0 24 24">
                                                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                                </svg>
                                                Google
                                            </span>
                                        )}
                                        {hasPasswordProvider && (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-green-300 rounded text-xs text-green-700">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                </svg>
                                                Email
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}
                            
                            {!hasPasswordProvider && (
                                <p className="text-sm text-gray-600 mb-4">
                                    Set a password to enable email/password login in addition to Google sign-in.
                                </p>
                            )}
                            
                            <form onSubmit={handlePasswordChange} autoComplete="off">
                                {/* Hidden dummy fields to prevent autofill */}
                                <input type="text" style={{display: 'none'}} />
                                <input type="password" style={{display: 'none'}} />
                                
                                {/* Current Password - Only show if user has password */}
                                {hasPasswordProvider && (
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
                                                className="w-full px-4 py-2 pr-10 border-2 border-transparent rounded-lg outline-none focus:border-site-accent transition-colors bg-gray-50 focus:bg-white disabled:opacity-60 disabled:cursor-not-allowed"
                                                placeholder="Enter your current password"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                                disabled={isChangingPassword}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-site-accent disabled:opacity-60"
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
                                )}
                                
                                {/* New Password */}
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        {hasPasswordProvider ? 'New Password' : 'Password'}
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
                                            className="w-full px-4 py-2 pr-10 border-2 border-transparent rounded-lg outline-none focus:border-site-accent transition-colors bg-gray-50 focus:bg-white disabled:opacity-60 disabled:cursor-not-allowed"
                                            placeholder={hasPasswordProvider ? "Enter your new password" : "Enter your password"}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowNewPassword(!showNewPassword)}
                                            disabled={isChangingPassword}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-site-accent disabled:opacity-60"
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
                                        {hasPasswordProvider ? 'Confirm New Password' : 'Confirm Password'}
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showConfirmPassword ? "text" : "password"}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            required
                                            disabled={isChangingPassword}
                                            autoComplete="new-password"
                                            className="w-full px-4 py-2 pr-10 border-2 border-transparent rounded-lg outline-none focus:border-site-accent transition-colors bg-gray-50 focus:bg-white disabled:opacity-60 disabled:cursor-not-allowed"
                                            placeholder={hasPasswordProvider ? "Confirm your new password" : "Confirm your password"}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            disabled={isChangingPassword}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-site-accent disabled:opacity-60"
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
                                    className="w-full px-4 py-3 bg-site-accent text-white rounded-lg font-semibold hover:bg-site-accent-hover transition disabled:opacity-60 disabled:cursor-not-allowed shadow-md"
                                >
                                    {isChangingPassword 
                                        ? (hasPasswordProvider ? "Changing Password..." : "Setting Password...") 
                                        : (hasPasswordProvider ? "Change Password" : "Set Password")
                                    }
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