import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth, signInWithGoogle } from "../firebase.js";
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { UserPlus, Loader, Eye, EyeOff } from "lucide-react";
import LogoMark from "../components/LogoMark";

/* Same leaf decoration used on the landing-page hero */
function LeafDecoration({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 800 800" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="250" cy="500" rx="280" ry="100" transform="rotate(-30 250 500)" fill="#2e5023" opacity="0.35" />
      <ellipse cx="180" cy="300" rx="240" ry="90" transform="rotate(-55 180 300)" fill="#2e5023" opacity="0.25" />
      <ellipse cx="350" cy="350" rx="220" ry="80" transform="rotate(-45 350 350)" fill="#4f7942" opacity="0.4" />
      <ellipse cx="120" cy="180" rx="200" ry="70" transform="rotate(-20 120 180)" fill="#4f7942" opacity="0.3" />
      <ellipse cx="400" cy="550" rx="180" ry="65" transform="rotate(-65 400 550)" fill="#4f7942" opacity="0.25" />
      <ellipse cx="300" cy="200" rx="180" ry="65" transform="rotate(-40 300 200)" fill="#a3c99a" opacity="0.5" />
      <ellipse cx="100" cy="420" rx="160" ry="55" transform="rotate(5 100 420)" fill="#a3c99a" opacity="0.35" />
      <ellipse cx="450" cy="180" rx="130" ry="50" transform="rotate(-50 450 180)" fill="#a3c99a" opacity="0.3" />
      <ellipse cx="500" cy="400" rx="100" ry="38" transform="rotate(-35 500 400)" fill="#2e5023" opacity="0.2" />
      <ellipse cx="50" cy="600" rx="120" ry="45" transform="rotate(15 50 600)" fill="#4f7942" opacity="0.2" />
      <circle cx="550" cy="300" r="70" fill="#a3c99a" opacity="0.15" />
      <circle cx="80" cy="100" r="55" fill="#4f7942" opacity="0.2" />
    </svg>
  );
}

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
    setErr(""); setMsg(""); setLoading(true);
    try {
      if (password !== confirm) {
        setErr("Passwords do not match.");
        setLoading(false); return;
      }
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(userCredential.user);
      await auth.signOut();
      setMsg("Verification email sent! Please check your inbox and verify your email before logging in.");
      setTimeout(() => nav("/login"), 3000);
    } catch (e) {
      const code = e?.code || "";
      const map = {
        "auth/email-already-in-use": "This email is already registered. Please login instead.",
        "auth/invalid-email": "Please enter a valid email address.",
        "auth/weak-password": "Password should be at least 6 characters.",
        "auth/operation-not-allowed": "Email/password accounts are not enabled.",
      };
      setErr(map[code] || e.message || "Sign-up failed. Please try again.");
    } finally { setLoading(false); }
  }

  async function handleGoogle() {
    setErr(""); setMsg(""); setLoading(true);
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
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#edf5e9] via-white to-[#f4f7f2] relative overflow-hidden">
      {/* Decorative leaves — same as landing hero */}
      <LeafDecoration className="absolute -left-10 -top-10 w-[600px] h-[600px] sm:w-[750px] sm:h-[750px] pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-72 h-72 rounded-full bg-[#a3c99a] opacity-10 blur-3xl pointer-events-none" />

      {/* Navbar — matches landing page */}
      <header className="relative z-20 sticky top-0 bg-[#4f7942] text-white shadow-sm">
        <div className="w-full px-6 lg:px-10 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <LogoMark size={48} />
          </Link>
          <div className="flex items-center gap-2.5">
            <Link to="/" className="px-3.5 py-2 rounded-lg text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors">
              Home
            </Link>
            <Link to="/login" className="px-5 py-2 text-sm font-semibold bg-white text-[#3d6b30] rounded-lg hover:bg-white/90 transition-colors shadow-sm">
              Log in
            </Link>
          </div>
        </div>
      </header>

      {/* Main — two-column like landing hero */}
      <div className="relative z-10 flex-1 flex items-center">
        <div className="w-full max-w-7xl mx-auto px-5 py-10 sm:py-14 flex flex-col md:flex-row items-center gap-10 lg:gap-16">

          {/* Left — marketing copy (hidden on mobile) */}
          <div className="hidden md:block md:w-[45%] lg:w-1/2 md:pl-6 lg:pl-10">
            <h2 className="font-[var(--font-display)] text-4xl lg:text-5xl font-extrabold tracking-tight text-[#1c1f1a] leading-tight mb-3">
              Start your<br />journey.
            </h2>
            <p className="text-[#2e5023] font-bold text-lg sm:text-xl mb-4">
              Your personal skill-building companion
            </p>
            <p className="text-[#3d4a38] text-[15px] leading-relaxed max-w-sm mb-6 font-medium">
              Turn big goals into step-by-step skill maps. Track practice with timers, build daily streaks, earn XP, and compete on the weekly leaderboard.
            </p>
            <div className="flex items-center gap-5 text-sm text-[#565c52]">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#4f7942]" /> Free to start
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#4f7942]" /> No credit card
              </span>
            </div>
          </div>

          {/* Right — form card */}
          <div className="w-full md:w-[55%] lg:w-1/2 flex justify-center md:justify-end md:pr-6 lg:pr-10">
            <div className="w-full max-w-[420px]">
              <div className="relative bg-white rounded-2xl border border-[#e2e6dc] overflow-hidden shadow-xl">

                {/* ── Card background art ── */}
                <div className="absolute inset-0 pointer-events-none">
                  {/* Big green blob — top right */}
                  <div className="absolute -top-14 -right-14 w-64 h-64 rounded-full bg-[#a3c99a] opacity-25 blur-2xl" />
                  {/* Green blob — bottom left */}
                  <div className="absolute -bottom-10 -left-10 w-52 h-52 rounded-full bg-[#4f7942] opacity-20 blur-2xl" />
                  {/* Warm accent — center left */}
                  <div className="absolute top-1/3 -left-4 w-32 h-32 rounded-full bg-[#fbbf24] opacity-[0.07] blur-xl" />

                  {/* Large leaf cluster — top right */}
                  <svg className="absolute -top-4 -right-4 w-56 h-56" viewBox="0 0 200 200" fill="none">
                    <ellipse cx="130" cy="50" rx="80" ry="30" transform="rotate(-30 130 50)" fill="#4f7942" opacity="0.18" />
                    <ellipse cx="80" cy="90" rx="65" ry="22" transform="rotate(-50 80 90)" fill="#a3c99a" opacity="0.22" />
                    <ellipse cx="150" cy="110" rx="50" ry="18" transform="rotate(15 150 110)" fill="#2e5023" opacity="0.12" />
                    <circle cx="170" cy="30" r="16" fill="#a3c99a" opacity="0.18" />
                    <circle cx="100" cy="40" r="10" fill="#4f7942" opacity="0.1" />
                  </svg>

                  {/* Leaf cluster — bottom left */}
                  <svg className="absolute -bottom-6 -left-6 w-48 h-48" viewBox="0 0 180 180" fill="none">
                    <ellipse cx="60" cy="110" rx="70" ry="25" transform="rotate(20 60 110)" fill="#4f7942" opacity="0.15" />
                    <ellipse cx="100" cy="70" rx="55" ry="20" transform="rotate(-25 100 70)" fill="#a3c99a" opacity="0.2" />
                    <ellipse cx="40" cy="60" rx="40" ry="15" transform="rotate(40 40 60)" fill="#2e5023" opacity="0.1" />
                    <circle cx="20" cy="140" r="12" fill="#2e5023" opacity="0.1" />
                  </svg>

                  {/* Flowing curves */}
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 420 700" fill="none" preserveAspectRatio="none">
                    <path d="M420 60 Q320 100 360 200 Q400 300 350 350" stroke="#a3c99a" strokeWidth="1.5" fill="none" opacity="0.15" />
                    <path d="M0 600 Q100 540 70 440 Q40 340 120 300" stroke="#4f7942" strokeWidth="1.5" fill="none" opacity="0.12" />
                    <path d="M350 0 Q330 80 400 140" stroke="#a3c99a" strokeWidth="1" fill="none" opacity="0.1" />
                    <path d="M70 700 Q90 620 30 560" stroke="#4f7942" strokeWidth="1" fill="none" opacity="0.08" />
                  </svg>

                  {/* Dot grid */}
                  <svg className="absolute inset-0 w-full h-full opacity-[0.045]">
                    <defs>
                      <pattern id="signup-dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                        <circle cx="2" cy="2" r="0.8" fill="#2e5023" />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#signup-dots)" />
                  </svg>
                </div>

                {/* ── Form content ── */}
                <div className="relative z-10 p-7 sm:p-8">
                <h1 className="md:hidden font-[var(--font-display)] text-xl sm:text-2xl font-extrabold text-[#1c1f1a] tracking-tight mb-1">
                  Create account
                </h1>
                <h1 className="hidden md:block font-[var(--font-display)] text-xl sm:text-2xl lg:text-3xl font-extrabold text-[#1c1f1a] tracking-tight mb-1.5">
                  Create your account
                </h1>
                <p className="text-sm text-[#3d4a38] font-medium mb-6">
                  Already have an account?{" "}
                  <Link to="/login" className="text-[#2e5023] font-bold hover:underline">Log in</Link>
                </p>

                {err && (
                  <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">{err}</div>
                )}
                {msg && (
                  <div className="mb-4 px-4 py-3 rounded-xl bg-[#edf5e9] border border-[#a3c99a] text-sm text-[#2e5023]">{msg}</div>
                )}

                {/* Google first — quick path */}
                <button type="button" onClick={handleGoogle} disabled={loading}
                  className="group w-full h-11 flex items-center justify-center gap-3 mb-5 bg-white border-2 border-[#e2e6dc] text-[#1c1f1a] text-[15px] font-bold rounded-xl hover:border-[#c8cec0] hover:bg-[#f8faf6] hover:shadow-md disabled:opacity-50 transition-all active:scale-[0.99]"
                >
                  <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#f4f7f2]">
                    <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google logo" width={18} height={18} className="w-full h-auto" loading="lazy" />
                  </span>
                  Sign up with Google
                </button>

                <div className="flex items-center gap-3 mb-5">
                  <div className="flex-1 h-px bg-[#e2e6dc]" />
                  <span className="text-[11px] font-bold text-[#9aa094] uppercase tracking-widest">or with email</span>
                  <div className="flex-1 h-px bg-[#e2e6dc]" />
                </div>

                <form onSubmit={handleSignup} autoComplete="off" className="space-y-4">
                  <div>
                    <label htmlFor="signup-email" className="block text-sm font-bold text-[#1c1f1a] mb-1.5">Email</label>
                    <input
                      id="signup-email" type="email" value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required placeholder="you@example.com"
                      className="w-full h-11 px-4 bg-white/90 border border-[#d4d9cf] text-[#1c1f1a] text-sm rounded-xl outline-none placeholder:text-[#9aa094] focus:border-[#4f7942] focus:ring-2 focus:ring-[#4f7942]/15 hover:border-[#c8cec0] transition-all backdrop-blur-sm"
                      autoComplete="email"
                    />
                  </div>

                  <div>
                    <label htmlFor="signup-pw" className="block text-sm font-bold text-[#1c1f1a] mb-1.5">Password</label>
                    <div className="relative">
                      <input
                        id="signup-pw" type={showPassword ? "text" : "password"} value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required placeholder="At least 6 characters"
                        className="w-full h-11 px-4 pr-12 bg-white/90 border border-[#d4d9cf] text-[#1c1f1a] text-sm rounded-xl outline-none placeholder:text-[#9aa094] focus:border-[#4f7942] focus:ring-2 focus:ring-[#4f7942]/15 hover:border-[#c8cec0] transition-all backdrop-blur-sm"
                        autoComplete="new-password"
                      />
                      <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center rounded-lg text-[#9aa094] hover:text-[#565c52] hover:bg-[#f8faf6] transition-colors"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="signup-confirm" className="block text-sm font-bold text-[#1c1f1a] mb-1.5">Confirm password</label>
                    <div className="relative">
                      <input
                        id="signup-confirm" type={showConfirm ? "text" : "password"} value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        required placeholder="Re-enter password"
                        className="w-full h-11 px-4 pr-12 bg-white/90 border border-[#d4d9cf] text-[#1c1f1a] text-sm rounded-xl outline-none placeholder:text-[#9aa094] focus:border-[#4f7942] focus:ring-2 focus:ring-[#4f7942]/15 hover:border-[#c8cec0] transition-all backdrop-blur-sm"
                        autoComplete="new-password"
                      />
                      <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center rounded-lg text-[#9aa094] hover:text-[#565c52] hover:bg-[#f8faf6] transition-colors"
                        onClick={() => setShowConfirm(!showConfirm)}
                        aria-label={showConfirm ? "Hide password" : "Show password"}
                      >
                        {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <button type="submit" disabled={loading}
                    className="group w-full h-11 relative flex items-center justify-center gap-2.5 rounded-xl text-[15px] font-bold transition-all disabled:opacity-50 overflow-hidden bg-gradient-to-r from-[#2e5023] via-[#3d6b30] to-[#4f7942] text-white shadow-lg shadow-[#2e5023]/25 hover:shadow-xl hover:shadow-[#2e5023]/30 hover:scale-[1.01] active:scale-[0.99]"
                  >
                    <span className="absolute inset-0 bg-gradient-to-t from-transparent via-white/[0.08] to-white/[0.15] pointer-events-none" />
                    {loading ? <><Loader className="animate-spin relative z-10" size={18} /> <span className="relative z-10">Creating account…</span></> : <><UserPlus className="relative z-10" size={18} /> <span className="relative z-10">Create account</span></>}
                  </button>
                </form>
                </div>
              </div>

              <p className="text-xs text-[#9aa094] mt-4 text-center">
                By continuing you agree to our Terms and Privacy Policy.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
