import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { updateProfile, updateEmail, updatePassword } from "firebase/auth";
import { useAuth } from "../useAuth";
import Sidebar from "../components/Sidebar";
import { Button } from "../components/Button";
import Input from "../components/Input";

export default function Profile() {
  const navigate = useNavigate();
  const user = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  // Update form fields when user data loads
  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || "");
      setEmail(user.email || "");
    }
  }, [user]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      // Update display name
      if (displayName !== user?.displayName) {
        await updateProfile(user, { displayName });
      }

      // Update email
      if (email !== user?.email) {
        await updateEmail(user, email);
      }

      // Update password if provided
      if (newPassword) {
        if (newPassword !== confirmPassword) {
          setMessage({ type: "error", text: "Passwords do not match" });
          setLoading(false);
          return;
        }
        if (newPassword.length < 6) {
          setMessage({ type: "error", text: "Password must be at least 6 characters" });
          setLoading(false);
          return;
        }
        await updatePassword(user, newPassword);
      }

      setMessage({ type: "success", text: "Profile updated successfully!" });
      setIsEditing(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error("Profile update error:", error);
      setMessage({ 
        type: "error", 
        text: error.message || "Failed to update profile. Please try again." 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setDisplayName(user?.displayName || "");
    setEmail(user?.email || "");
    setNewPassword("");
    setConfirmPassword("");
    setIsEditing(false);
    setMessage({ type: "", text: "" });
  };

  const getInitials = () => {
    if (user?.displayName) {
      return user.displayName.charAt(0).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return "U";
  };

  // Show loading state while user data is being fetched
  if (user === undefined) {
    return (
      <div className="flex min-h-screen bg-gray-50 items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-ll-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  // Redirect if no user (shouldn't happen with Protected route, but just in case)
  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      
      <main className="flex-1 p-8">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
            <p className="text-gray-600 mt-2">Manage your account information and preferences</p>
          </div>

          {/* Profile Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Avatar Section */}
            <div className="bg-gradient-to-r from-ll-600 to-ll-700 p-8">
              <div className="flex items-center gap-6">
                <div className="relative group">
                  {user?.photoURL ? (
                    <img 
                      src={user.photoURL} 
                      alt="Profile" 
                      className="w-24 h-24 rounded-full object-cover border-4 border-white"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-white border-4 border-white flex items-center justify-center">
                      <div className="w-full h-full rounded-full bg-gray-200 border-2 border-dashed border-gray-400 flex items-center justify-center">
                        <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                    </div>
                  )}
                  <button className="absolute bottom-0 right-0 bg-white rounded-full p-2 shadow-lg hover:bg-gray-50 transition-colors">
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                </div>
                <div className="text-white">
                  <h2 className="text-2xl font-bold">{user?.displayName || "User"}</h2>
                  <p className="text-ll-100 mt-1">{user?.email}</p>
                  <p className="text-ll-200 text-sm mt-2">Member since {new Date(user?.metadata?.creationTime).toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            {/* Form Section */}
            <div className="p-8">
              {message.text && (
                <div className={`mb-6 p-4 rounded-lg ${
                  message.type === "success" 
                    ? "bg-green-50 text-green-800 border border-green-200" 
                    : "bg-red-50 text-red-800 border border-red-200"
                }`}>
                  {message.text}
                </div>
              )}

              <form onSubmit={handleSaveProfile}>
                <div className="space-y-6">
                  {/* Display Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Display Name
                    </label>
                    <Input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      disabled={!isEditing}
                      placeholder="Enter your display name"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={!isEditing}
                      placeholder="Enter your email"
                    />
                  </div>

                  {/* Password Section - Only show when editing */}
                  {isEditing && (
                    <>
                      <div className="border-t border-gray-200 pt-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Change Password</h3>
                        <p className="text-sm text-gray-600 mb-4">Leave blank to keep your current password</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          New Password
                        </label>
                        <Input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Enter new password (min 6 characters)"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Confirm New Password
                        </label>
                        <Input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm new password"
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 mt-8 pt-6 border-t border-gray-200">
                  {!isEditing ? (
                    <Button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="bg-ll-600 hover:bg-ll-700"
                    >
                      Edit Profile
                    </Button>
                  ) : (
                    <>
                      <Button
                        type="submit"
                        disabled={loading}
                        className="bg-ll-600 hover:bg-ll-700"
                      >
                        {loading ? "Saving..." : "Save Changes"}
                      </Button>
                      <Button
                        type="button"
                        onClick={handleCancel}
                        disabled={loading}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-700"
                      >
                        Cancel
                      </Button>
                    </>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* Account Info Card */}
          <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h3>
            <div className="space-y-3 text-sm">
              {/* <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Account ID</span>
                <span className="font-mono text-gray-900">{user?.uid?.slice(0, 12)}...</span>
              </div> */}
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Email Verified</span>
                <span className={user?.emailVerified ? "text-green-600" : "text-orange-600"}>
                  {user?.emailVerified ? "✓ Verified" : "⚠ Not Verified"}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-600">Last Sign In</span>
                <span className="text-gray-900">
                  {new Date(user?.metadata?.lastSignInTime).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
