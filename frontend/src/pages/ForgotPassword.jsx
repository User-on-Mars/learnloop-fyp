import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { auth } from "../firebase";
import { sendPasswordResetEmail } from "firebase/auth";
import { Mail, ArrowLeft, Sparkles } from "lucide-react";
import Logo from "../components/Logo";
import Input from "../components/Input";
import { Button } from "../components/Button";

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
    <div className="min-h-screen bg-gradient-to-br from-ll-50 via-white to-ll-100 relative overflow-hidden">
      {/* Animated Background Blobs */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 left-10 w-72 h-72 bg-ll-300 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-ll-400 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-20 left-1/2 w-72 h-72 bg-ll-200 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
      </div>

      {/* Top bar */}
      <motion.div 
        className="max-w-6xl mx-auto px-4 pt-10 relative z-10"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Logo size={44} />
      </motion.div>

      {/* Main Content */}
      <div className="min-h-[calc(100vh-120px)] grid place-items-center px-4 relative z-10">
        <motion.div 
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
        >
          <motion.div 
            className="bg-white/90 backdrop-blur-xl shadow-2xl rounded-2xl p-8 border border-gray-200"
            whileHover={{ boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)" }}
            transition={{ duration: 0.3 }}
          >
            {/* Icon */}
            <div className="w-16 h-16 bg-gradient-to-br from-ll-500 to-ll-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Mail className="w-8 h-8 text-white" />
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">Reset Password</h1>
            <p className="text-sm text-gray-600 text-center mb-6">
              Enter your email and we'll send you a link to reset your password
            </p>

            {/* Messages */}
            {err && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-4 text-sm animate-shake">
                {err}
              </div>
            )}
            {msg && (
              <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-lg mb-4 text-sm animate-slideDown flex items-start gap-2">
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
                <span>Back to <span className="text-ll-700">Login</span></span>
              </Link>
            </div>
          </motion.div>

          {/* Additional Help */}
          <p className="text-xs text-gray-500 mt-4 text-center">
            Need help? Contact support at support@learnloop.com
          </p>
        </motion.div>
      </div>
    </div>
  );
}
