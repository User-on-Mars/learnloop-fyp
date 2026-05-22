import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { ArrowLeft, CheckCircle, Eye, EyeOff, KeyRound, Loader } from "lucide-react";
import { auth } from "../firebase";
import LogoMark from "../components/LogoMark";
import PasswordStrengthMeter from "../components/PasswordStrengthMeter";
import { validatePassword } from "../utils/passwordValidator";

function LeafDecoration({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 800 800" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="250" cy="500" rx="280" ry="100" transform="rotate(-30 250 500)" fill="#2e5023" opacity="0.35" />
      <ellipse cx="180" cy="300" rx="240" ry="90" transform="rotate(-55 180 300)" fill="#2e5023" opacity="0.25" />
      <ellipse cx="350" cy="350" rx="220" ry="80" transform="rotate(-45 350 350)" fill="#4f7942" opacity="0.4" />
      <ellipse cx="120" cy="180" rx="200" ry="70" transform="rotate(-20 120 180)" fill="#4f7942" opacity="0.3" />
      <ellipse cx="300" cy="200" rx="180" ry="65" transform="rotate(-40 300 200)" fill="#a3c99a" opacity="0.5" />
      <circle cx="550" cy="300" r="70" fill="#a3c99a" opacity="0.15" />
    </svg>
  );
}

export default function ResetPassword() {
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const oobCode = searchParams.get("oobCode");
  const emailFromLink = searchParams.get("email") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  const canSubmit = useMemo(() => Boolean(oobCode && password && confirm), [oobCode, password, confirm]);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");

    if (!oobCode) {
      setErr("This reset link is missing its verification code. Request a new password reset link.");
      return;
    }
    if (password !== confirm) {
      setErr("Passwords do not match.");
      return;
    }

    const validation = validatePassword(password);
    if (!validation.isValid) {
      setErr(validation.errors[0]);
      return;
    }

    setLoading(true);
    try {
      await verifyPasswordResetCode(auth, oobCode);
      await confirmPasswordReset(auth, oobCode, password);
      setDone(true);
      setTimeout(() => nav("/login", { replace: true }), 2500);
    } catch (error) {
      const map = {
        "auth/expired-action-code": "This reset link has expired. Request a new one.",
        "auth/invalid-action-code": "This reset link is invalid or has already been used.",
        "auth/user-disabled": "This account is disabled.",
        "auth/weak-password": "Choose a stronger password.",
      };
      setErr(map[error?.code] || "Unable to reset password. Request a new link and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#edf5e9] via-white to-[#f4f7f2] relative overflow-hidden">
      <LeafDecoration className="absolute -left-10 -top-10 w-[650px] h-[650px] pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-72 h-72 rounded-full bg-[#a3c99a] opacity-10 blur-3xl pointer-events-none" />

      <header className="relative z-20 sticky top-0 bg-[#4f7942] text-white shadow-sm">
        <div className="w-full px-6 lg:px-10 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center min-h-[44px]">
            <LogoMark size={48} />
          </Link>
          <Link to="/login" className="px-5 py-2.5 min-h-[44px] flex items-center text-sm font-semibold bg-white text-[#3d6b30] rounded-lg hover:bg-white/90 transition-colors shadow-sm">
            Log in
          </Link>
        </div>
      </header>

      <main className="relative z-10 flex-1 flex items-center">
        <div className="w-full max-w-7xl mx-auto px-5 py-12 sm:py-16 flex flex-col md:flex-row items-center gap-10 lg:gap-16">
          <div className="hidden md:block md:w-[45%] lg:w-1/2 md:pl-6 lg:pl-10">
            <h1 className="font-[var(--font-display)] text-4xl lg:text-5xl font-extrabold tracking-tight text-[#1c1f1a] leading-tight mb-3">
              Create a<br />new password.
            </h1>
            <p className="text-[#2e5023] font-bold text-lg sm:text-xl mb-4">Keep your progress protected</p>
            <p className="text-[#3d4a38] text-[15px] leading-relaxed max-w-sm font-medium">
              Use a strong password with uppercase, lowercase, number, and special character.
            </p>
          </div>

          <div className="w-full md:w-[55%] lg:w-1/2 flex justify-center md:justify-end md:pr-6 lg:pr-10">
            <div className="w-full max-w-[440px]">
              <div className="relative bg-white rounded-2xl border border-[#e2e6dc] overflow-hidden shadow-xl">
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute -top-14 -right-14 w-64 h-64 rounded-full bg-[#a3c99a] opacity-25 blur-2xl" />
                  <div className="absolute -bottom-10 -left-10 w-52 h-52 rounded-full bg-[#4f7942] opacity-20 blur-2xl" />
                  <svg className="absolute inset-0 w-full h-full opacity-[0.045]">
                    <defs>
                      <pattern id="reset-dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                        <circle cx="2" cy="2" r="0.8" fill="#2e5023" />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#reset-dots)" />
                  </svg>
                </div>

                <div className="relative z-10 p-6 sm:p-7 md:p-8">
                  {done ? (
                    <div className="text-center py-5">
                      <div className="w-16 h-16 rounded-full bg-[#edf5e9] flex items-center justify-center mx-auto mb-5">
                        <CheckCircle className="w-8 h-8 text-[#4f7942]" />
                      </div>
                      <h2 className="font-[var(--font-display)] text-2xl font-extrabold text-[#1c1f1a] mb-2">Password updated</h2>
                      <p className="text-sm text-[#3d4a38] font-medium mb-6">You can now log in with your new password.</p>
                      <Link to="/login" className="inline-flex items-center justify-center w-full min-h-[44px] rounded-xl bg-[#2e5023] text-white font-bold hover:bg-[#24441b] transition-colors">
                        Go to log in
                      </Link>
                    </div>
                  ) : (
                    <>
                      <h2 className="font-[var(--font-display)] text-2xl lg:text-3xl font-extrabold text-[#1c1f1a] tracking-tight mb-1.5">
                        Reset password
                      </h2>
                      <p className="text-sm text-[#3d4a38] font-medium mb-6">
                        {emailFromLink ? `For ${emailFromLink}` : "Enter a new password for your account."}
                      </p>

                      {err && <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">{err}</div>}
                      {!oobCode && <div className="mb-4 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-700">This reset link is missing a code. Request a fresh link.</div>}

                      <form onSubmit={onSubmit} className="space-y-4">
                        <div>
                          <label htmlFor="reset-pw" className="block text-sm font-bold text-[#1c1f1a] mb-1.5">New password</label>
                          <div className="relative">
                            <input
                              id="reset-pw"
                              type={showPassword ? "text" : "password"}
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              required
                              placeholder="Create a strong password"
                              className="w-full px-4 py-3 pr-12 min-h-[44px] bg-white/90 border border-[#d4d9cf] text-[#1c1f1a] text-sm rounded-xl outline-none placeholder:text-[#9aa094] focus:border-[#4f7942] focus:ring-2 focus:ring-[#4f7942]/15 hover:border-[#c8cec0] transition-all"
                              autoComplete="new-password"
                            />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-[#9aa094] hover:text-[#565c52]" aria-label={showPassword ? "Hide password" : "Show password"}>
                              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          </div>
                          {password && <div className="mt-3"><PasswordStrengthMeter password={password} /></div>}
                        </div>

                        <div>
                          <label htmlFor="reset-confirm" className="block text-sm font-bold text-[#1c1f1a] mb-1.5">Confirm password</label>
                          <div className="relative">
                            <input
                              id="reset-confirm"
                              type={showConfirm ? "text" : "password"}
                              value={confirm}
                              onChange={(e) => setConfirm(e.target.value)}
                              required
                              placeholder="Re-enter password"
                              className="w-full px-4 py-3 pr-12 min-h-[44px] bg-white/90 border border-[#d4d9cf] text-[#1c1f1a] text-sm rounded-xl outline-none placeholder:text-[#9aa094] focus:border-[#4f7942] focus:ring-2 focus:ring-[#4f7942]/15 hover:border-[#c8cec0] transition-all"
                              autoComplete="new-password"
                            />
                            <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-[#9aa094] hover:text-[#565c52]" aria-label={showConfirm ? "Hide password" : "Show password"}>
                              {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          </div>
                        </div>

                        <button type="submit" disabled={loading || !canSubmit} className="group w-full relative flex items-center justify-center gap-2.5 py-3.5 min-h-[44px] rounded-xl text-[15px] font-bold transition-all disabled:opacity-50 overflow-hidden bg-gradient-to-r from-[#2e5023] via-[#3d6b30] to-[#4f7942] text-white shadow-lg shadow-[#2e5023]/25 hover:shadow-xl hover:shadow-[#2e5023]/30 active:scale-[0.99]">
                          {loading ? <><Loader className="animate-spin" size={18} /> Updating...</> : <><KeyRound size={18} /> Update password</>}
                        </button>
                      </form>

                      <Link to="/login" className="inline-flex items-center gap-1.5 mt-5 text-sm font-bold text-[#4f7942] hover:text-[#2e5023] transition-colors">
                        <ArrowLeft size={16} /> Back to log in
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
