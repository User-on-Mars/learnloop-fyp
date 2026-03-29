import { useState } from "react";
import { Link } from "react-router-dom";
import { auth } from "../firebase";
import { sendPasswordResetEmail } from "firebase/auth";
import { Mail, ArrowLeft, Sparkles, Lock } from "lucide-react";

// Logo component
const Logo = ({ size = 40, wordmark = true, className = "" }) => {
  return (
    <div className={`flex items-center gap-2 select-none ${className}`}>
      <div
        className="grid place-items-center rounded-lg shadow-md bg-indigo-600"
        style={{
          width: size,
          height: size,
        }}
      >
        <Lock className="w-5 h-5 text-white" />
      </div>

      {wordmark && (
        <span className="text-2xl font-extrabold tracking-tight">
          <span className="text-indigo-600">Learn</span>
          <span className="text-gray-900">Loop</span>
        </span>
      )}
    </div>
  );
};

// Input component
const Input = ({ label, type, value, onChange, placeholder, required }) => (
  <div>
    <label htmlFor={label.toLowerCase()} className="block text-sm font-medium text-gray-700 mb-1">
      {label}
    </label>
    <div className="relative">
      <input
        id={label.toLowerCase()}
        name={label.toLowerCase()}
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        className="w-full pl-3 pr-10 py-2.5 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
        autoComplete={type === 'email' ? 'email' : 'off'}
      />
      {label === "Email Address" && <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />}
    </div>
  </div>
);

// Button component
const Button = ({ children, disabled, className = "" }) => (
  <button
    type="submit"
    disabled={disabled}
    className={`group relative w-full flex justify-center py-2.5 px-4 border border-transparent text-base font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all shadow-md shadow-indigo-200 ${disabled ? "opacity-60 cursor-not-allowed" : ""} ${className}`}
  >
    {children}
  </button>
);

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
      setMsg("If that email exists, we sent you a reset link. Check your inbox!");
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 bg-white p-8 sm:p-10 rounded-xl shadow-2xl border border-gray-100">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <Logo size={40} wordmark={true} />
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900">Reset Password</h2>
          <p className="mt-2 text-sm text-gray-600">
            Enter your email and we'll send you a link to reset your password
          </p>
        </div>

        {/* Messages */}
        {err && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">
            {err}
          </div>
        )}
        {msg && (
          <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-lg text-sm flex items-start gap-2">
            <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{msg}</span>
          </div>
        )}

        {/* Form */}
        <form className="space-y-5" onSubmit={onSubmit}>
          <div className="transform transition-all duration-200 hover:scale-[1.01]">
            <Input
              label="Email Address"
              type="email"
              value={email}
              required
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          <Button 
            disabled={loading} 
            className="transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Sending...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Mail className="w-4 h-4" />
                Send Reset Link
              </span>
            )}
          </Button>
        </form>

        {/* Back to Login */}
        <div className="text-sm mt-6 text-center pt-4 border-t border-gray-100">
          <Link 
            to="/login" 
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to <span className="text-indigo-700">Login</span></span>
          </Link>
        </div>

        {/* Additional Help */}
        <p className="text-xs text-gray-500 mt-4 text-center">
          Need help? Contact support at support@learnloop.com
        </p>
      </div>
    </div>
  );
}
