import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Alert from "../components/Alert";
import { Avatar } from "../components/Avatar";
import Modal, { ModalButton } from "../components/Modal";
import { useAuth } from "../useAuth";
import { updateProfile, updatePassword, reauthenticateWithCredential, EmailAuthProvider, linkWithCredential, deleteUser } from "firebase/auth";
import { auth } from "../firebase";
import { authAPI } from "../api/client";
import {
  Eye, EyeOff, Camera, User, Mail, Shield, Key, Trash2, LogOut,
  CheckCircle, AlertTriangle, X, Loader2, ChevronRight, Settings,
  Bell, BellOff, Volume2, VolumeX, Monitor, Clock,
} from "lucide-react";
import AvatarPicker from "../components/AvatarPicker";
import { useCustomAvatar } from "../context/AvatarContext";
import MyPublishRequests from "../components/MyPublishRequests";

export default function Profile() {
  const user = useAuth();
  const navigate = useNavigate();
  const { customAvatar, setCustomAvatar } = useCustomAvatar();

  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState(null);

  const [displayName, setDisplayName] = useState("");
  const [originalDisplayName, setOriginalDisplayName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [nameUpdateMessage, setNameUpdateMessage] = useState(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordChangeMessage, setPasswordChangeMessage] = useState(null);

  const [hasPasswordProvider, setHasPasswordProvider] = useState(false);
  const [hasGoogleProvider, setHasGoogleProvider] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Settings state (persisted to localStorage)
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem("learnloop_settings");
      return saved ? JSON.parse(saved) : {
        emailNotifications: true,
        practiceReminders: true,
        weeklyDigest: true,
        streakAlerts: true,
        xpNotifications: true,
        soundEffects: true,
        timerSound: true,
        darkMode: false,
        compactView: false,
      };
    } catch { return { emailNotifications: true, practiceReminders: true, weeklyDigest: true, streakAlerts: true, xpNotifications: true, soundEffects: true, timerSound: true, darkMode: false, compactView: false }; }
  });

  const updateSetting = (key, value) => {
    setSettings(prev => {
      const next = { ...prev, [key]: value };
      localStorage.setItem("learnloop_settings", JSON.stringify(next));
      return next;
    });
  };

  useEffect(() => {
    if (user) {
      const name = user.displayName || "";
      setDisplayName(name);
      setOriginalDisplayName(name);
      const providers = user.providerData || [];
      setHasPasswordProvider(providers.some(p => p.providerId === "password"));
      setHasGoogleProvider(providers.some(p => p.providerId === "google.com"));
    }
  }, [user]);

  useEffect(() => {
    setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    const t = setTimeout(() => { setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); }, 100);
    return () => clearTimeout(t);
  }, []);

  const handleEditName = () => { setIsEditingName(true); setNameUpdateMessage(null); };
  const handleCancelEdit = () => { setDisplayName(originalDisplayName); setIsEditingName(false); setNameUpdateMessage(null); };

  const handleSaveName = async () => {
    const trimmedName = displayName.trim();
    if (!trimmedName) { setNameUpdateMessage({ variant: "error", text: "Display name cannot be empty." }); return; }
    try {
      setIsUpdatingName(true); setNameUpdateMessage(null);
      await updateProfile(auth.currentUser, { displayName: trimmedName });
      try { await authAPI.syncProfile({ email: auth.currentUser.email, displayName: trimmedName, firebaseUid: auth.currentUser.uid }); } catch {}
      setOriginalDisplayName(trimmedName); setDisplayName(trimmedName); setIsEditingName(false);
      setNameUpdateMessage({ variant: "success", text: "Display name updated!" });
      setTimeout(() => setNameUpdateMessage(null), 3000);
    } catch (error) {
      setNameUpdateMessage({ variant: "error", text: error.code === "auth/network-request-failed" ? "Check your connection." : "Failed to update name." });
    } finally { setIsUpdatingName(false); }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault(); setPasswordChangeMessage(null);
    if (newPassword !== confirmPassword) { setPasswordChangeMessage({ variant: "error", text: "Passwords do not match" }); return; }
    if (newPassword.length < 6) { setPasswordChangeMessage({ variant: "error", text: "Password must be at least 6 characters" }); return; }
    try {
      setIsChangingPassword(true);
      if (hasPasswordProvider) {
        const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
        await reauthenticateWithCredential(auth.currentUser, credential);
        await updatePassword(auth.currentUser, newPassword);
        setPasswordChangeMessage({ variant: "success", text: "Password changed!" });
      } else {
        const credential = EmailAuthProvider.credential(auth.currentUser.email, newPassword);
        await linkWithCredential(auth.currentUser, credential);
        setHasPasswordProvider(true);
        setPasswordChangeMessage({ variant: "success", text: "Password set! You can now log in with email." });
      }
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      setTimeout(() => setPasswordChangeMessage(null), 3000);
    } catch (error) {
      const msgs = {
        "auth/wrong-password": "Current password is incorrect",
        "auth/invalid-credential": "Current password is incorrect",
        "auth/weak-password": "Password is too weak",
        "auth/requires-recent-login": "Please log out and log back in first",
        "auth/provider-already-linked": "Password already set",
      };
      setPasswordChangeMessage({ variant: "error", text: msgs[error.code] || "Failed to change password" });
      if (error.code === "auth/provider-already-linked") setHasPasswordProvider(true);
    } finally { setIsChangingPassword(false); }
  };

  const handleAvatarSelect = async ({ id }) => {
    try {
      await setCustomAvatar(id);
      setShowAvatarPicker(false);
      setAvatarMessage({ variant: "success", text: id ? "Avatar updated!" : "Avatar removed." });
      setTimeout(() => setAvatarMessage(null), 3000);
    } catch { setAvatarMessage({ variant: "error", text: "Failed to update avatar." }); }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmInput !== "DELETE") return;
    setIsDeleting(true); setDeleteError("");
    try {
      // Re-authenticate if password provider
      if (hasPasswordProvider && deletePassword) {
        const credential = EmailAuthProvider.credential(auth.currentUser.email, deletePassword);
        await reauthenticateWithCredential(auth.currentUser, credential);
      }
      // Step 1: Soft delete on backend (keeps data for admin)
      try { await authAPI.deleteAccount(); } catch (e) {
        // If backend fails with 403 (requires-recent-login on backend side), continue
        // The important thing is Firebase auth deletion
        console.warn("Backend soft-delete failed:", e);
      }
      // Step 2: Delete Firebase auth account
      await deleteUser(auth.currentUser);
      navigate("/login");
    } catch (error) {
      const msgs = {
        "auth/requires-recent-login": "Please log out and log back in, then try again.",
        "auth/wrong-password": "Incorrect password.",
        "auth/invalid-credential": "Incorrect password.",
      };
      setDeleteError(msgs[error.code] || "Failed to delete account. Try logging out and back in first.");
    } finally { setIsDeleting(false); }
  };

  const handleLogout = async () => {
    try { await auth.signOut(); navigate("/login"); } catch {}
  };

  if (user === undefined) {
    return (
      <main className="flex-1 overflow-y-auto flex items-center justify-center">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center animate-pulse"><User className="w-6 h-6 text-white" /></div>
      </main>
    );
  }
  if (!user) {
    return (
      <main className="flex-1 overflow-y-auto flex items-center justify-center">
        <p className="text-[#9aa094]">Please log in to view your profile.</p>
      </main>
    );
  }

  return (
    <div className="px-4 sm:px-6 py-6 lg:py-8 space-y-6">

      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-rose-50 via-white to-pink-50 rounded-2xl border border-rose-100 p-6 sm:p-7">
            <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-rose-200 opacity-15 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-36 h-36 rounded-full bg-pink-200 opacity-10 blur-2xl pointer-events-none" />

            <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-5">
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <Avatar photoURL={user?.photoURL} displayName={user?.displayName} email={user?.email} size="xl" />
                <button onClick={() => setShowAvatarPicker(true)}
                  className="absolute -bottom-1 -right-1 w-7 h-7 bg-gradient-to-br from-rose-600 to-pink-600 rounded-full flex items-center justify-center shadow-md border-2 border-white cursor-pointer hover:scale-110 transition-transform">
                  <Camera className="w-3 h-3 text-white" />
                </button>
              </div>

              <div className="flex-1 min-w-0 text-center sm:text-left">
                <h1 className="text-2xl sm:text-3xl font-bold text-[#1c1f1a] truncate">{user.displayName || "Learner"}</h1>
                <p className="text-sm text-rose-600 font-medium">{user.email}</p>
                <div className="flex items-center justify-center sm:justify-start gap-2 mt-2">
                  {hasGoogleProvider && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-rose-200 rounded-full text-[10px] font-semibold text-rose-700">
                      <svg className="w-3 h-3" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                      Google
                    </span>
                  )}
                  {hasPasswordProvider && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-rose-200 rounded-full text-[10px] font-semibold text-rose-700">
                      <Mail className="w-3 h-3" /> Email
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {avatarMessage && <Alert variant={avatarMessage.variant} description={avatarMessage.text} />}

          {/* Profile Information */}
          <div className="bg-white rounded-2xl border border-[#e2e6dc] overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-[#e8ece3] flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-600 to-pink-600 flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#1c1f1a]">Profile Information</h2>
                <p className="text-[11px] text-[#9aa094]">Manage your display name</p>
              </div>
            </div>
            <div className="p-5 space-y-4">
              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-[#1c1f1a] mb-2">Email</label>
                <div className="flex items-center gap-3 px-4 py-3 bg-[#f8faf6] border border-[#e2e6dc] rounded-xl">
                  <Mail className="w-4 h-4 text-[#9aa094]" />
                  <span className="text-sm text-[#565c52]">{user.email}</span>
                </div>
              </div>

              {/* Display Name */}
              <div>
                <label className="block text-sm font-semibold text-[#1c1f1a] mb-2">Display Name</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input type="text" value={displayName} disabled={!isEditingName} onChange={(e) => setDisplayName(e.target.value)}
                    placeholder={!displayName && !isEditingName ? "No name set" : ""}
                    className={`flex-1 px-4 py-3 border-2 rounded-xl outline-none transition-all text-sm ${
                      isEditingName ? "border-rose-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-400/15 bg-white text-[#1c1f1a]" : "border-[#e2e6dc] bg-[#f8faf6] text-[#565c52] cursor-not-allowed"
                    }`} />
                  {isEditingName ? (
                    <div className="flex gap-2">
                      <button onClick={handleCancelEdit} disabled={isUpdatingName}
                        className="px-4 py-3 min-h-[44px] border border-[#e2e6dc] text-[#565c52] rounded-xl font-semibold text-sm hover:bg-[#f4f7f2] transition-all disabled:opacity-50">Cancel</button>
                      <button onClick={handleSaveName} disabled={isUpdatingName}
                        className="px-5 py-3 min-h-[44px] bg-gradient-to-r from-rose-600 to-pink-600 text-white rounded-xl font-semibold text-sm hover:from-rose-700 hover:to-pink-700 transition-all disabled:opacity-50 shadow-sm">
                        {isUpdatingName ? "Saving..." : "Save"}
                      </button>
                    </div>
                  ) : (
                    <button onClick={handleEditName}
                      className="px-5 py-3 min-h-[44px] bg-gradient-to-r from-rose-600 to-pink-600 text-white rounded-xl font-semibold text-sm hover:from-rose-700 hover:to-pink-700 transition-all shadow-sm">Edit</button>
                  )}
                </div>
              </div>
              {nameUpdateMessage && <Alert variant={nameUpdateMessage.variant} description={nameUpdateMessage.text} />}
            </div>
          </div>

          {/* My Publish Requests */}
          <MyPublishRequests />

          {/* Security - Password */}
          <div className="bg-white rounded-2xl border border-[#e2e6dc] overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-[#e8ece3] flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#1c1f1a]">{hasPasswordProvider ? "Change Password" : "Set Password"}</h2>
                <p className="text-[11px] text-[#9aa094]">{hasPasswordProvider ? "Update your login password" : "Add email/password login"}</p>
              </div>
            </div>
            <div className="p-5">
              {!hasPasswordProvider && (
                <p className="text-sm text-[#565c52] mb-4 bg-amber-50 border border-amber-200 rounded-xl p-3">
                  Set a password to enable email/password login in addition to Google sign-in.
                </p>
              )}
              <form onSubmit={handlePasswordChange} autoComplete="off" className="space-y-4">
                <input type="text" style={{display: 'none'}} />
                <input type="password" style={{display: 'none'}} />

                {hasPasswordProvider && (
                  <div>
                    <label className="block text-sm font-semibold text-[#1c1f1a] mb-2">Current Password</label>
                    <div className="relative">
                      <input type={showCurrentPassword ? "text" : "password"} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
                        required disabled={isChangingPassword} autoComplete="new-password" placeholder="Enter current password"
                        className="w-full px-4 py-3 pr-10 border-2 border-[#e2e6dc] rounded-xl outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/15 bg-[#f8faf6] focus:bg-white text-sm transition-all disabled:opacity-50" />
                      <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] text-[#9aa094] hover:text-[#565c52] flex items-center justify-center" aria-label={showCurrentPassword ? "Hide password" : "Show password"}>
                        {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-[#1c1f1a] mb-2">{hasPasswordProvider ? "New Password" : "Password"}</label>
                  <div className="relative">
                    <input type={showNewPassword ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                      required minLength={6} disabled={isChangingPassword} autoComplete="new-password" placeholder="Min 6 characters"
                      className="w-full px-4 py-3 pr-10 border-2 border-[#e2e6dc] rounded-xl outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/15 bg-[#f8faf6] focus:bg-white text-sm transition-all disabled:opacity-50" />
                    <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] text-[#9aa094] hover:text-[#565c52] flex items-center justify-center" aria-label={showNewPassword ? "Hide password" : "Show password"}>
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#1c1f1a] mb-2">{hasPasswordProvider ? "Confirm New Password" : "Confirm Password"}</label>
                  <div className="relative">
                    <input type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                      required disabled={isChangingPassword} autoComplete="new-password" placeholder="Re-enter password"
                      className="w-full px-4 py-3 pr-10 border-2 border-[#e2e6dc] rounded-xl outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/15 bg-[#f8faf6] focus:bg-white text-sm transition-all disabled:opacity-50" />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] text-[#9aa094] hover:text-[#565c52] flex items-center justify-center" aria-label={showConfirmPassword ? "Hide password" : "Show password"}>
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={isChangingPassword}
                  className="w-full py-3 min-h-[44px] bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold text-sm hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-50 shadow-sm flex items-center justify-center gap-2">
                  <Key className="w-4 h-4" />
                  {isChangingPassword ? (hasPasswordProvider ? "Changing..." : "Setting...") : (hasPasswordProvider ? "Change Password" : "Set Password")}
                </button>
              </form>
              {passwordChangeMessage && <div className="mt-4"><Alert variant={passwordChangeMessage.variant} description={passwordChangeMessage.text} /></div>}
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-white rounded-2xl border border-[#e2e6dc] overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-[#e8ece3] flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                <Bell className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#1c1f1a]">Notifications</h2>
                <p className="text-[11px] text-[#9aa094]">Control what alerts you receive</p>
              </div>
            </div>
            <div className="divide-y divide-[#f0f2eb]">
              <ToggleRow icon={<Mail className="w-4 h-4 text-blue-500" />} label="Email Notifications" desc="Receive updates and announcements via email" checked={settings.emailNotifications} onChange={v => updateSetting('emailNotifications', v)} />
              <ToggleRow icon={<Clock className="w-4 h-4 text-orange-500" />} label="Practice Reminders" desc="Daily reminders to keep your streak alive" checked={settings.practiceReminders} onChange={v => updateSetting('practiceReminders', v)} />
              <ToggleRow icon={<Bell className="w-4 h-4 text-violet-500" />} label="Weekly Digest" desc="Summary of your weekly progress every Sunday" checked={settings.weeklyDigest} onChange={v => updateSetting('weeklyDigest', v)} />
              <ToggleRow icon={<AlertTriangle className="w-4 h-4 text-amber-500" />} label="Streak Alerts" desc="Get notified when your streak is about to expire" checked={settings.streakAlerts} onChange={v => updateSetting('streakAlerts', v)} />
              <ToggleRow icon={<CheckCircle className="w-4 h-4 text-emerald-500" />} label="XP Notifications" desc="Show XP earned popups after actions" checked={settings.xpNotifications} onChange={v => updateSetting('xpNotifications', v)} />
            </div>
          </div>

          {/* Preferences */}
          <div className="bg-white rounded-2xl border border-[#e2e6dc] overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-[#e8ece3] flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                <Monitor className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#1c1f1a]">Preferences</h2>
                <p className="text-[11px] text-[#9aa094]">Customize your experience</p>
              </div>
            </div>
            <div className="divide-y divide-[#f0f2eb]">
              <ToggleRow icon={<Volume2 className="w-4 h-4 text-blue-500" />} label="Sound Effects" desc="Play sounds for achievements and actions" checked={settings.soundEffects} onChange={v => updateSetting('soundEffects', v)} />
              <ToggleRow icon={<Clock className="w-4 h-4 text-teal-500" />} label="Timer Sound" desc="Play sound when practice timer completes" checked={settings.timerSound} onChange={v => updateSetting('timerSound', v)} />
            </div>
          </div>

          {/* Account Actions */}
          <div className="bg-white rounded-2xl border border-[#e2e6dc] overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-[#e8ece3] flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gray-500 to-slate-600 flex items-center justify-center">
                <Settings className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#1c1f1a]">Account</h2>
                <p className="text-[11px] text-[#9aa094]">Manage your account</p>
              </div>
            </div>
            <div className="p-5 space-y-3">
              {/* Log Out */}
              <button onClick={() => setShowLogoutModal(true)}
                className="w-full flex items-center gap-4 p-4 min-h-[44px] rounded-xl border border-[#e2e6dc] hover:bg-[#f8faf6] transition-all group">
                <div className="w-10 h-10 rounded-xl bg-[#f8faf6] flex items-center justify-center group-hover:bg-white transition-colors">
                  <LogOut className="w-5 h-5 text-[#565c52]" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-[#1c1f1a]">Log Out</p>
                  <p className="text-[11px] text-[#9aa094]">Sign out of your account</p>
                </div>
                <ChevronRight className="w-4 h-4 text-[#c8cec0] group-hover:text-[#9aa094] transition-colors" />
              </button>

              {/* Delete Account */}
              <button onClick={() => { setShowDeleteModal(true); setDeleteConfirmInput(""); setDeletePassword(""); setDeleteError(""); }}
                className="w-full flex items-center gap-4 p-4 min-h-[44px] rounded-xl border border-red-200 hover:bg-red-50 transition-all group">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center group-hover:bg-red-100 transition-colors">
                  <Trash2 className="w-5 h-5 text-red-500" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-red-600">Delete Account</p>
                  <p className="text-[11px] text-red-400">Permanently delete your account and all data</p>
                </div>
                <ChevronRight className="w-4 h-4 text-red-300 group-hover:text-red-400 transition-colors" />
              </button>
            </div>
          </div>

      {/* Avatar Picker */}
      <AvatarPicker isOpen={showAvatarPicker} onClose={() => setShowAvatarPicker(false)} onSelect={handleAvatarSelect} currentAvatar={customAvatar} />

      {/* Logout Confirmation Modal */}
      <Modal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        maxWidth="max-w-sm"
        showCloseButton={false}
        footer={
          <>
            <ModalButton
              variant="secondary"
              onClick={() => setShowLogoutModal(false)}
            >
              Stay
            </ModalButton>
            <ModalButton
              variant="primary"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4" /> Log Out
            </ModalButton>
          </>
        }
      >
        {/* Header with gradient background */}
        <div className="bg-gradient-to-r from-gray-600 to-slate-700 -mx-5 sm:-mx-6 -mt-4 sm:-mt-5 px-5 sm:px-6 py-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <LogOut className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Log Out</h2>
              <p className="text-white/70 text-xs">Are you sure?</p>
            </div>
          </div>
        </div>

        {/* Message */}
        <p className="text-sm text-[#565c52]">You'll need to sign in again to access your account.</p>
      </Modal>

      {/* Delete Account Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        maxWidth="max-w-md"
        showCloseButton={false}
        preventBackdropClose={isDeleting}
        footer={
          <>
            <ModalButton
              variant="secondary"
              onClick={() => setShowDeleteModal(false)}
              disabled={isDeleting}
            >
              Cancel
            </ModalButton>
            <ModalButton
              variant="danger"
              onClick={handleDeleteAccount}
              disabled={isDeleting || deleteConfirmInput !== "DELETE" || (hasPasswordProvider && !deletePassword)}
            >
              {isDeleting ? <><Loader2 className="w-4 h-4 animate-spin" /> Deleting...</> : <><Trash2 className="w-4 h-4" /> Delete Forever</>}
            </ModalButton>
          </>
        }
      >
        {/* Header with gradient background */}
        <div className="bg-gradient-to-r from-red-500 to-rose-500 -mx-5 sm:-mx-6 -mt-4 sm:-mt-5 px-5 sm:px-6 py-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Delete Account</h2>
              <p className="text-white/70 text-xs">This is permanent</p>
            </div>
          </div>
        </div>

        {/* Warning Box */}
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
          <p className="text-sm text-red-800 font-medium mb-1">This will permanently:</p>
          <ul className="text-xs text-red-700 space-y-1 ml-4 list-disc">
            <li>Delete your login account (you won't be able to sign in)</li>
            <li>Remove your access to all skill maps and rooms</li>
            <li>Your practice history and reflections will be archived</li>
            <li>This action cannot be reversed</li>
          </ul>
        </div>

        {/* Password Input (if needed) */}
        {hasPasswordProvider && (
          <div className="mb-4">
            <label className="block text-sm font-semibold text-[#1c1f1a] mb-2">Enter your password</label>
            <input 
              type="password" 
              value={deletePassword} 
              onChange={e => setDeletePassword(e.target.value)} 
              placeholder="Your password"
              className="w-full px-4 py-3 min-h-[44px] border-2 border-[#e2e6dc] rounded-xl outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/15 text-sm transition-all" 
            />
          </div>
        )}

        {/* Confirmation Input */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-[#1c1f1a] mb-2">
            Type <span className="font-mono bg-red-50 text-red-600 px-1.5 py-0.5 rounded">DELETE</span> to confirm
          </label>
          <input 
            type="text" 
            value={deleteConfirmInput} 
            onChange={e => setDeleteConfirmInput(e.target.value)} 
            placeholder="Type DELETE"
            className="w-full px-4 py-3 min-h-[44px] border-2 border-[#e2e6dc] rounded-xl outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/15 font-mono text-sm transition-all" 
          />
        </div>

        {/* Error Message */}
        {deleteError && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2.5 rounded-xl text-[12px] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />{deleteError}
          </div>
        )}
      </Modal>
    </div>
  );
}


function ToggleRow({ icon, label, desc, checked, onChange }) {
  return (
    <div className="flex items-center gap-4 px-5 py-4 hover:bg-[#f8faf6] transition-colors">
      <div className="w-9 h-9 rounded-xl bg-[#f8faf6] flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#1c1f1a]">{label}</p>
        <p className="text-[11px] text-[#9aa094]">{desc}</p>
      </div>
      <button 
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${checked ? 'bg-gradient-to-r from-rose-500 to-pink-500' : 'bg-[#d0d5ca]'}`}
        aria-label={`Toggle ${label}`}
      >
        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${checked ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}