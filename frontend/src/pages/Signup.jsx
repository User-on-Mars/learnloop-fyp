import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth, signInWithGoogle } from "../firebase.js";
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { Mail, UserPlus, Loader, ArrowRight, Eye, EyeOff } from "lucide-react";
import { AuthShell } from "../layout/AuthShell";
import s from "../styles/authPages.module.css";

/** Registration with email/password or Google, matching marketing theme. */
export default function Signup() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  async function handleSignup(e) {
    e.preventDefault();
    setErr("");
    setMsg("");
    setLoading(true);
    try {
      if (password !== confirm) {
        setErr("Passwords do not match.");
        setLoading(false);
        return;
      }

      // Create Firebase account and send verification email
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(userCredential.user);
      
      // Sign out immediately - user must verify email first
      await auth.signOut();
      
      setMsg("Verification email sent! Please check your inbox and verify your email before logging in.");
      
      // Redirect to login after 3 seconds
      setTimeout(() => nav("/login"), 3000);
    } catch (e) {
      const code = e?.code || "";
      const map = {
        "auth/email-already-in-use": "This email is already registered. Please login instead.",
        "auth/invalid-email": "Please enter a valid email address from a recognized provider (Gmail, Yahoo, Outlook, etc.).",
        "auth/weak-password": "Password should be at least 6 characters.",
        "auth/operation-not-allowed": "Email/password accounts are not enabled.",
      };
      setErr(map[code] || e.message || "Sign-up failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setErr("");
    setMsg("");
    setLoading(true);
    try {
      await signInWithGoogle();
      nav("/dashboard", { replace: true });
    } catch (e) {
      const code = e?.code || "";
      const map = {
        "auth/popup-closed-by-user": "Sign-in was cancelled.",
        "auth/popup-blocked": "Please allow popups for this site.",
        "auth/cancelled-popup-request": "Sign-in was cancelled.",
      };
      setErr(map[code] || "Google sign-up failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell>
      <div className={s.card}>
        <div className={s.headerBlock}>
          <h1 className={s.title}>Create account</h1>
          <p className={s.subtitle}>Start mapping your skills and tracking progress.</p>
        </div>

        {err && <div className={s.alertError}>{err}</div>}
        {msg && <div className={s.alertSuccess}>{msg}</div>}

        <form className={s.form} onSubmit={handleSignup} autoComplete="off">
          <div className={s.field}>
            <label className={s.label} htmlFor="signup-email">
              Email
            </label>
            <div className={s.inputWrap}>
              <input
                id="signup-email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className={s.input}
                autoComplete="email"
              />
              <Mail className={s.inputIcon} aria-hidden />
            </div>
          </div>

          <div className={s.field}>
            <label className={s.label} htmlFor="signup-password">
              Password
            </label>
            <div className={s.inputWrap}>
              <input
                id="signup-password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="At least 6 characters"
                className={`${s.input} ${s.inputWithToggle}`}
                autoComplete="new-password"
              />
              <button
                type="button"
                className={s.togglePw}
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className={s.field}>
            <label className={s.label} htmlFor="signup-confirm">
              Confirm password
            </label>
            <div className={s.inputWrap}>
              <input
                id="signup-confirm"
                name="confirm"
                type={showConfirm ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                placeholder="Re-enter password"
                className={`${s.input} ${s.inputWithToggle}`}
                autoComplete="new-password"
              />
              <button
                type="button"
                className={s.togglePw}
                onClick={() => setShowConfirm(!showConfirm)}
                aria-label={showConfirm ? "Hide password" : "Show password"}
              >
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" className={s.btnPrimary} disabled={loading}>
            {loading ? (
              <>
                <Loader className="animate-spin" size={20} />
                Creating account…
              </>
            ) : (
              <>
                <UserPlus size={20} />
                Create account
              </>
            )}
          </button>
        </form>

        <div className={s.divider}>or continue with</div>

        <button type="button" className={s.btnGhost} onClick={handleGoogle} disabled={loading}>
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="" width={20} height={20} />
          Google
        </button>

        <p className={`${s.centerLink} ${s.centerLinkPlain}`}>
          <span className={s.link}>Already have an account? </span>
          <Link to="/login" className={s.linkAccent}>
            Log in
            <ArrowRight size={16} />
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
