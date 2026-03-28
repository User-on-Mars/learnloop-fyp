import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth, signInWithGoogle } from "../firebase.js";
import { signInWithEmailAndPassword } from "firebase/auth";
import { Mail, LogIn, Loader, ArrowRight, Eye, EyeOff } from "lucide-react";
import { AuthShell } from "../layout/AuthShell";
import s from "../styles/authPages.module.css";

/** Email / password + Google sign-in using the site marketing theme. */
export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    setErr("");
    setMsg("");
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setMsg("Welcome back!");
      nav("/dashboard", { replace: true });
    } catch (e) {
      const code = e?.code || "";
      const map = {
        "auth/invalid-credential": "Incorrect email or password.",
        "auth/user-not-found": "No account found with this email.",
        "auth/wrong-password": "Incorrect password.",
        "auth/invalid-email": "Please enter a valid email address.",
        "auth/user-disabled": "This account has been disabled.",
        "auth/too-many-requests": "Too many failed attempts. Please try again later.",
      };
      setErr(map[code] || "Login failed. Please try again.");
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
      setErr(map[code] || "Google sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell>
      <div className={s.card}>
        <div className={s.headerBlock}>
          <h1 className={s.title}>Log in</h1>
          <p className={s.subtitle}>Welcome back. Enter your credentials to continue.</p>
        </div>

        {err && <div className={s.alertError}>{err}</div>}
        {msg && <div className={s.alertSuccess}>{msg}</div>}

        <form className={s.form} onSubmit={handleLogin} autoComplete="off">
          <div className={s.field}>
            <label className={s.label} htmlFor="login-email">
              Email
            </label>
            <div className={s.inputWrap}>
              <input
                id="login-email"
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
            <label className={s.label} htmlFor="login-password">
              Password
            </label>
            <div className={s.inputWrap}>
              <input
                id="login-password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className={`${s.input} ${s.inputWithToggle}`}
                autoComplete="current-password"
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

          <button type="submit" className={s.btnPrimary} disabled={loading}>
            {loading ? (
              <>
                <Loader className="animate-spin" size={20} />
                Signing in…
              </>
            ) : (
              <>
                <LogIn size={20} />
                Sign in
              </>
            )}
          </button>
        </form>

        <div className={s.divider}>or continue with</div>

        <button type="button" className={s.btnGhost} onClick={handleGoogle} disabled={loading}>
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="" width={20} height={20} />
          Google
        </button>

        <div className={s.linksRow}>
          <Link to="/forgot" className={s.linkAccent}>
            Forgot password?
          </Link>
          <Link to="/signup" className={s.linkAccent}>
            Create account
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}
