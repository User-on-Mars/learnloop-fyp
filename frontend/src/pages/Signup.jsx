import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth, signInWithGoogle } from "../firebase.js";
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import AuthLayout from "../components/AuthLayout.jsx";
import Input from "../components/Input.jsx";
import { Button, GhostButton } from "../components/Button.jsx";

export default function Signup() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  async function handleSignup(e) {
    e.preventDefault();
    setErr(""); setMsg(""); setLoading(true);
    try {
      if (password !== confirm) throw new Error("Passwords do not match");
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(userCredential.user);
      setMsg("Account created! Please check your email to verify your account before logging in.");
      nav("/login", { replace: true });
    } catch (e) {
      const code = e?.code || "";
      const map = {
        "auth/email-already-in-use": "This email is already registered.",
        "auth/invalid-email": "Enter a valid email address.",
        "auth/weak-password": "Password should be at least 6 characters.",
      };
      setErr(map[code] || e.message || "Sign-up failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setErr(""); setMsg(""); setLoading(true);
    try {
      await signInWithGoogle();
      nav("/dashboard", { replace: true });
    } catch (e) {
      setErr(e.message || "Google sign-up failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Create your LearnLoop account"
      subtitle="Start mapping your skills and tracking progress."
    >
      {err && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-4 text-sm animate-shake">{err}</div>}
      {msg && <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-lg mb-4 text-sm animate-slideDown">{msg}</div>}

      <form className="space-y-5" onSubmit={handleSignup}>
        <div className="transform transition-all duration-200 hover:scale-[1.01]">
          <Input label="Email" type="email" value={email} required onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" />
        </div>
        <div className="transform transition-all duration-200 hover:scale-[1.01]">
          <Input label="Password" type="password" value={password} required onChange={e=>setPassword(e.target.value)} placeholder="At least 6 characters" />
        </div>
        <div className="transform transition-all duration-200 hover:scale-[1.01]">
          <Input label="Confirm password" type="password" value={confirm} required onChange={e=>setConfirm(e.target.value)} placeholder="Re-enter your password" />
        </div>
        <Button disabled={loading} className="transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]">
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Creating account...
            </span>
          ) : (
            "Create account"
          )}
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3 text-xs text-gray-500">
        <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent flex-1" />
        <span className="font-medium">or continue with</span>
        <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent flex-1" />
      </div>

      <GhostButton onClick={handleGoogle} className="transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] hover:border-ll-300 hover:bg-ll-50">
        <span className="inline-flex items-center gap-2 justify-center">
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="" className="w-5 h-5" />
          <span className="font-medium">Google</span>
        </span>
      </GhostButton>

      <div className="text-sm mt-6 text-center pt-4 border-t border-gray-100">
        <Link to="/login" className="text-gray-600 hover:text-gray-900 font-medium transition-colors">
          Already have an account? <span className="text-ll-700">Log in →</span>
        </Link>
      </div>
    </AuthLayout>
  );
}
