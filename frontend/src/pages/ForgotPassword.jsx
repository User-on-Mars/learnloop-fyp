import { useState } from "react";
import { Link } from "react-router-dom";
import { auth } from "../firebase";
import { sendPasswordResetEmail } from "firebase/auth";
import { Mail, ArrowLeft, Sparkles, Loader } from "lucide-react";
import { AuthShell } from "../layout/AuthShell";
import s from "../styles/authPages.module.css";

/** Password reset request — same shell and theme as login/signup. */
export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setMsg("");
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setMsg("If that email exists, we sent you a reset link. Check your inbox.");
    } catch (e) {
      const code = e?.code || "";
      const map = {
        "auth/invalid-email": "Enter a valid email address.",
        "auth/user-not-found": "If that email exists, a reset link will be sent.",
      };
      setErr(map[code] || e.message || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell>
      <div className={s.card}>
        <div className={s.headerBlock}>
          <h1 className={s.title}>Reset password</h1>
          <p className={s.subtitle}>Enter your email and we&apos;ll send you a link to choose a new password.</p>
        </div>

        {err && <div className={s.alertError}>{err}</div>}
        {msg && (
          <div className={`${s.alertSuccess} ${s.alertRow}`}>
            <Sparkles size={16} className={s.alertIcon} aria-hidden />
            <span>{msg}</span>
          </div>
        )}

        <form className={s.form} onSubmit={onSubmit}>
          <div className={s.field}>
            <label className={s.label} htmlFor="forgot-email">
              Email
            </label>
            <div className={s.inputWrap}>
              <input
                id="forgot-email"
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

          <button type="submit" className={s.btnPrimary} disabled={loading}>
            {loading ? (
              <>
                <Loader className="animate-spin" size={20} />
                Sending…
              </>
            ) : (
              <>
                <Mail size={18} />
                Send reset link
              </>
            )}
          </button>
        </form>

        <div className={s.centerLink}>
          <Link to="/login" className={s.linkAccent}>
            <ArrowLeft size={16} />
            Back to log in
          </Link>
        </div>

        <p className={s.hint}>Need help? Contact hello@learnloop.app</p>
      </div>
    </AuthShell>
  );
}
