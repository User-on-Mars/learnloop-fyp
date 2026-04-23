import { useState } from "react";
import { Link } from "react-router-dom";
import { auth } from "../firebase";
import { sendPasswordResetEmail } from "firebase/auth";
import { Mail, ArrowLeft, Loader, CheckCircle } from "lucide-react";
import LogoMark from "../components/LogoMark";

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

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [sent, setSent] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr(""); setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setSent(true);
    } catch (e) {
      const code = e?.code || "";
      const map = {
        "auth/invalid-email": "Enter a valid email address.",
        "auth/user-not-found": "If that email exists, a reset link will be sent.",
      };
      setErr(map[code] || e.message || "Failed to send reset email.");
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#edf5e9] via-white to-[#f4f7f2] relative overflow-hidden">
      <LeafDecoration className="absolute -left-10 -top-10 w-[600px] h-[600px] sm:w-[750px] sm:h-[750px] pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-72 h-72 rounded-full bg-[#a3c99a] opacity-10 blur-3xl pointer-events-none" />

      {/* Navbar */}
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

      {/* Main */}
      <div className="relative z-10 flex-1 flex items-center">
        <div className="w-full max-w-7xl mx-auto px-5 py-12 sm:py-16 flex flex-col md:flex-row items-center gap-10 lg:gap-16">

          {/* Left — copy */}
          <div className="hidden md:block md:w-[45%] lg:w-1/2 md:pl-6 lg:pl-10">
            <h2 className="font-[var(--font-display)] text-4xl lg:text-5xl font-extrabold tracking-tight text-[#1c1f1a] leading-tight mb-3">
              Forgot your<br />password?
            </h2>
            <p className="text-[#2e5023] font-bold text-lg sm:text-xl mb-4">
              No worries, we've got you
            </p>
            <p className="text-[#3d4a38] text-[15px] leading-relaxed max-w-sm font-medium">
              Enter your email and we'll send you a secure link to reset your password. You'll be back in no time.
            </p>
          </div>

          {/* Right — card */}
          <div className="w-full md:w-[55%] lg:w-1/2 flex justify-center md:justify-end md:pr-6 lg:pr-10">
            <div className="w-full max-w-[420px]">
              <div className="relative bg-white rounded-2xl border border-[#e2e6dc] overflow-hidden shadow-xl">

                {/* Card background art */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute -top-14 -right-14 w-64 h-64 rounded-full bg-[#a3c99a] opacity-25 blur-2xl" />
                  <div className="absolute -bottom-10 -left-10 w-52 h-52 rounded-full bg-[#4f7942] opacity-20 blur-2xl" />
                  <div className="absolute top-1/2 -translate-y-1/2 right-0 w-32 h-32 rounded-full bg-[#fbbf24] opacity-[0.07] blur-xl" />
                  <svg className="absolute -top-4 -right-4 w-56 h-56" viewBox="0 0 200 200" fill="none">
                    <ellipse cx="130" cy="50" rx="80" ry="30" transform="rotate(-30 130 50)" fill="#4f7942" opacity="0.18" />
                    <ellipse cx="80" cy="90" rx="65" ry="22" transform="rotate(-50 80 90)" fill="#a3c99a" opacity="0.22" />
                    <ellipse cx="150" cy="110" rx="50" ry="18" transform="rotate(15 150 110)" fill="#2e5023" opacity="0.12" />
                    <circle cx="170" cy="30" r="16" fill="#a3c99a" opacity="0.18" />
                  </svg>
                  <svg className="absolute -bottom-6 -left-6 w-48 h-48" viewBox="0 0 180 180" fill="none">
                    <ellipse cx="60" cy="110" rx="70" ry="25" transform="rotate(20 60 110)" fill="#4f7942" opacity="0.15" />
                    <ellipse cx="100" cy="70" rx="55" ry="20" transform="rotate(-25 100 70)" fill="#a3c99a" opacity="0.2" />
                    <circle cx="20" cy="140" r="12" fill="#2e5023" opacity="0.1" />
                  </svg>
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 420 500" fill="none" preserveAspectRatio="none">
                    <path d="M420 60 Q320 100 360 200 Q400 300 350 350" stroke="#a3c99a" strokeWidth="1.5" fill="none" opacity="0.15" />
                    <path d="M0 400 Q100 340 70 240 Q40 140 120 100" stroke="#4f7942" strokeWidth="1.5" fill="none" opacity="0.12" />
                  </svg>
                  <svg className="absolute inset-0 w-full h-full opacity-[0.045]">
                    <defs>
                      <pattern id="forgot-dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                        <circle cx="2" cy="2" r="0.8" fill="#2e5023" />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#forgot-dots)" />
                  </svg>
                </div>

                {/* Form content */}
                <div className="relative z-10 p-7 sm:p-8">

                  {sent ? (
                    /* ── Success state ── */
                    <div className="text-center py-4">
                      <div className="w-16 h-16 rounded-full bg-[#edf5e9] flex items-center justify-center mx-auto mb-5">
                        <CheckCircle className="w-8 h-8 text-[#4f7942]" />
                      </div>
                      <h1 className="font-[var(--font-display)] text-2xl font-extrabold text-[#1c1f1a] tracking-tight mb-2">
                        Check your email
                      </h1>
                      <p className="text-sm text-[#3d4a38] font-medium mb-2 leading-relaxed">
                        We sent a password reset link to
                      </p>
                      <p className="text-sm font-bold text-[#2e5023] mb-6">{email}</p>
                      <p className="text-xs text-[#9aa094] mb-6">
                        Didn't receive it? Check your spam folder or try again.
                      </p>
                      <button
                        type="button"
                        onClick={() => { setSent(false); setEmail(""); }}
                        className="group w-full relative flex items-center justify-center gap-2.5 py-3.5 rounded-xl text-[15px] font-bold transition-all overflow-hidden bg-gradient-to-r from-[#2e5023] via-[#3d6b30] to-[#4f7942] text-white shadow-lg shadow-[#2e5023]/25 hover:shadow-xl hover:shadow-[#2e5023]/30 hover:scale-[1.01] active:scale-[0.99]"
                      >
                        <span className="absolute inset-0 bg-gradient-to-t from-transparent via-white/[0.08] to-white/[0.15] pointer-events-none" />
                        <Mail className="relative z-10" size={18} />
                        <span className="relative z-10">Try another email</span>
                      </button>
                      <Link to="/login" className="inline-flex items-center gap-1.5 mt-5 text-sm font-bold text-[#4f7942] hover:text-[#2e5023] transition-colors">
                        <ArrowLeft size={16} /> Back to log in
                      </Link>
                    </div>
                  ) : (
                    /* ── Form state ── */
                    <>
                      <h1 className="md:hidden font-[var(--font-display)] text-2xl font-extrabold text-[#1c1f1a] tracking-tight mb-1">
                        Reset password
                      </h1>
                      <h1 className="hidden md:block font-[var(--font-display)] text-2xl font-extrabold text-[#1c1f1a] tracking-tight mb-1.5">
                        Reset your password
                      </h1>
                      <p className="text-sm text-[#3d4a38] font-medium mb-6">
                        Enter your email and we'll send you a reset link.
                      </p>

                      {err && (
                        <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">{err}</div>
                      )}

                      <form onSubmit={onSubmit} className="space-y-4">
                        <div>
                          <label htmlFor="forgot-email" className="block text-sm font-bold text-[#1c1f1a] mb-1.5">Email</label>
                          <input
                            id="forgot-email" type="email" value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required placeholder="you@example.com"
                            className="w-full px-4 py-3 bg-white/90 border border-[#d4d9cf] text-[#1c1f1a] text-sm rounded-xl outline-none placeholder:text-[#9aa094] focus:border-[#4f7942] focus:ring-2 focus:ring-[#4f7942]/15 hover:border-[#c8cec0] transition-all backdrop-blur-sm"
                            autoComplete="email"
                          />
                        </div>

                        <button type="submit" disabled={loading}
                          className="group w-full relative flex items-center justify-center gap-2.5 py-3.5 rounded-xl text-[15px] font-bold transition-all disabled:opacity-50 overflow-hidden bg-gradient-to-r from-[#2e5023] via-[#3d6b30] to-[#4f7942] text-white shadow-lg shadow-[#2e5023]/25 hover:shadow-xl hover:shadow-[#2e5023]/30 hover:scale-[1.01] active:scale-[0.99]"
                        >
                          <span className="absolute inset-0 bg-gradient-to-t from-transparent via-white/[0.08] to-white/[0.15] pointer-events-none" />
                          {loading
                            ? <><Loader className="animate-spin relative z-10" size={18} /> <span className="relative z-10">Sending…</span></>
                            : <><Mail className="relative z-10" size={18} /> <span className="relative z-10">Send reset link</span></>
                          }
                        </button>
                      </form>

                      <div className="mt-6 pt-5 border-t border-[#e2e6dc] text-center">
                        <Link to="/login" className="inline-flex items-center gap-1.5 text-sm font-bold text-[#4f7942] hover:text-[#2e5023] transition-colors">
                          <ArrowLeft size={16} /> Back to log in
                        </Link>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <p className="text-xs text-[#9aa094] mt-4 text-center">
                Need help? Contact hello@learnloop.app
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
