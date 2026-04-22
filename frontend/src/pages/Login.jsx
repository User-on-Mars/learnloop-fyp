import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth, signInWithGoogle } from "../firebase.js";
import { signInWithEmailAndPassword } from "firebase/auth";
import { LogIn, Loader, ArrowRight, Eye, EyeOff } from "lucide-react";
import LogoMark from "../components/LogoMark";

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
    setErr(""); setMsg(""); setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      if (!cred.user.emailVerified) {
        await auth.signOut();
        setErr("Please verify your email before logging in. Check your inbox for the verification link.");
        setLoading(false);
        return;
      }
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
        "auth/too-many-requests": "Too many failed attempts. Try again later.",
      };
      setErr(map[code] || "Login failed. Please try again.");
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
      setErr(map[code] || "Google sign-in failed. Please try again.");
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-[#e8f5e2] via-[#f0f7ec] to-[#dcefd4]">

      {/* ── Animated background illustrations ── */}

      {/* Large floating circles */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#4f7942]/10 animate-pulse" style={{ animationDuration: "6s" }} />
      <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-[#2e5023]/8 animate-pulse" style={{ animationDuration: "8s" }} />
      <div className="absolute top-1/4 -right-20 w-72 h-72 rounded-full bg-[#a3c99a]/15 animate-pulse" style={{ animationDuration: "7s" }} />
      <div className="absolute bottom-1/4 -left-16 w-56 h-56 rounded-full bg-[#4f7942]/8 animate-pulse" style={{ animationDuration: "5s" }} />

      {/* Floating book illustration — top right */}
      <svg className="absolute top-16 right-[12%] w-20 h-20 opacity-20 animate-bounce" style={{ animationDuration: "4s" }} viewBox="0 0 80 80" fill="none">
        <rect x="10" y="15" width="60" height="50" rx="4" fill="#2e5023" />
        <rect x="14" y="19" width="24" height="42" rx="2" fill="#4f7942" />
        <rect x="42" y="19" width="24" height="42" rx="2" fill="#4f7942" />
        <line x1="40" y1="15" x2="40" y2="65" stroke="#2e5023" strokeWidth="2" />
        <line x1="20" y1="28" x2="32" y2="28" stroke="#a3c99a" strokeWidth="2" strokeLinecap="round" />
        <line x1="20" y1="34" x2="30" y2="34" stroke="#a3c99a" strokeWidth="2" strokeLinecap="round" />
        <line x1="48" y1="28" x2="60" y2="28" stroke="#a3c99a" strokeWidth="2" strokeLinecap="round" />
        <line x1="48" y1="34" x2="58" y2="34" stroke="#a3c99a" strokeWidth="2" strokeLinecap="round" />
      </svg>

      {/* Floating pencil — bottom left */}
      <svg className="absolute bottom-24 left-[8%] w-16 h-16 opacity-15 animate-bounce" style={{ animationDuration: "5s", animationDelay: "1s" }} viewBox="0 0 60 60" fill="none">
        <rect x="22" y="5" width="12" height="40" rx="2" fill="#f59e0b" transform="rotate(15 28 25)" />
        <polygon points="22,45 28,55 34,45" fill="#1c1f1a" transform="rotate(15 28 50)" />
        <rect x="22" y="5" width="12" height="6" rx="1" fill="#e88c0a" transform="rotate(15 28 8)" />
      </svg>

      {/* Floating lightbulb — top left */}
      <svg className="absolute top-28 left-[15%] w-14 h-14 opacity-15 animate-bounce" style={{ animationDuration: "6s", animationDelay: "2s" }} viewBox="0 0 50 50" fill="none">
        <path d="M25 8C18 8 12 14 12 21c0 5 3 9 7 11v4h12v-4c4-2 7-6 7-11 0-7-6-13-13-13Z" fill="#f59e0b" />
        <rect x="19" y="38" width="12" height="4" rx="2" fill="#d97706" />
        <line x1="25" y1="2" x2="25" y2="5" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
        <line x1="38" y1="10" x2="36" y2="12" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
        <line x1="12" y1="10" x2="14" y2="12" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
      </svg>

      {/* Floating target — right middle */}
      <svg className="absolute top-[55%] right-[10%] w-16 h-16 opacity-15 animate-bounce" style={{ animationDuration: "5.5s", animationDelay: "0.5s" }} viewBox="0 0 60 60" fill="none">
        <circle cx="30" cy="30" r="24" stroke="#4f7942" strokeWidth="3" fill="none" />
        <circle cx="30" cy="30" r="16" stroke="#4f7942" strokeWidth="2.5" fill="none" />
        <circle cx="30" cy="30" r="8" stroke="#4f7942" strokeWidth="2" fill="none" />
        <circle cx="30" cy="30" r="3" fill="#2e5023" />
      </svg>

      {/* Dot grid pattern */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.035]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="login-grid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="#2e5023" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#login-grid)" />
      </svg>

      {/* ── Top bar ── */}
      <header className="relative z-20 w-full px-6 lg:px-10 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center">
          <LogoMark size={48} />
        </Link>
        <Link
          to="/"
          className="px-4 py-2 text-sm font-semibold text-[#2e5023] hover:bg-[#2e5023]/10 rounded-lg transition-colors"
        >
          Home
        </Link>
      </header>

      {/* ── Centered form card ── */}
      <div className="relative z-10 flex items-center justify-center px-5 py-8" style={{ minHeight: "calc(100vh - 4rem)" }}>
        <div className="w-full max-w-[420px]">
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-[#2e5023]/10 border border-white/60 p-8 sm:p-10">

            {/* Logo + heading */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#edf5e9] to-[#d4e8cc] flex items-center justify-center shadow-sm">
                <LogoMark size={40} />
              </div>
              <h1 className="text-2xl font-extrabold text-[#1c1f1a] tracking-tight">Welcome back</h1>
              <p className="text-sm text-[#9aa094] mt-1">Sign in to your account</p>
            </div>

            {err && (
              <div className="mb-5 px-4 py-3 rounded-xl bg-red-50/80 border border-red-200/60 text-sm text-red-600 backdrop-blur-sm">
                {err}
              </div>
            )}
            {msg && (
              <div className="mb-5 px-4 py-3 rounded-xl bg-green-50/80 border border-green-200/60 text-sm text-green-600 backdrop-blur-sm">
                {msg}
              </div>
            )}

            {/* Google first */}
            <button
              type="button"
              onClick={handleGoogle}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 bg-white border border-[#e2e6dc] text-[#1c1f1a] text-sm font-semibold rounded-2xl hover:bg-[#f8faf6] hover:border-[#c8cec0] hover:shadow-sm disabled:opacity-60 transition-all"
            >
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="" width={18} height={18} />
              Continue with Google
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-[#e2e6dc]" />
              <span className="text-xs font-medium text-[#c8cec0] uppercase tracking-wider">or</span>
              <div className="flex-1 h-px bg-[#e2e6dc]" />
            </div>

            <form onSubmit={handleLogin} autoComplete="off" className="space-y-4">
              {/* Email */}
              <div>
                <label htmlFor="login-email" className="block text-sm font-semibold text-[#1c1f1a] mb-2">
                  Email
                </label>
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full px-4 py-3.5 bg-white/70 border border-[#e2e6dc] text-[#1c1f1a] text-sm rounded-2xl outline-none placeholder:text-[#c8cec0] focus:border-[#4f7942] focus:ring-2 focus:ring-[#4f7942]/15 hover:border-[#c8cec0] transition-all"
                  autoComplete="email"
                />
              </div>

              {/* Password */}
              <div>
                <label htmlFor="login-password" className="block text-sm font-semibold text-[#1c1f1a] mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="login-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full px-4 py-3.5 pr-12 bg-white/70 border border-[#e2e6dc] text-[#1c1f1a] text-sm rounded-2xl outline-none placeholder:text-[#c8cec0] focus:border-[#4f7942] focus:ring-2 focus:ring-[#4f7942]/15 hover:border-[#c8cec0] transition-all"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-[#9aa094] hover:text-[#1c1f1a] hover:bg-[#f4f7f2] transition-all"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3.5 mt-2 bg-gradient-to-r from-[#2e5023] to-[#4f7942] text-white text-sm font-bold rounded-2xl hover:from-[#3d6b30] hover:to-[#5C8A4D] disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-lg shadow-[#2e5023]/20 active:scale-[0.98]"
              >
                {loading ? (
                  <><Loader className="animate-spin" size={18} /> Signing in…</>
                ) : (
                  <><LogIn size={18} /> Sign in</>
                )}
              </button>
            </form>

            {/* Links */}
            <div className="flex items-center justify-between mt-6 pt-5 border-t border-[#e2e6dc]/60">
              <Link to="/forgot" className="text-sm font-semibold text-[#4f7942] hover:text-[#2e5023] transition-colors">
                Forgot password?
              </Link>
              <Link to="/signup" className="text-sm font-semibold text-[#4f7942] hover:text-[#2e5023] transition-colors inline-flex items-center gap-1">
                Create account <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
