import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth, signInWithGoogle } from "../firebase.js";
import { signInWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import AuthLayout from "../components/AuthLayout.jsx";
import Input from "../components/Input.jsx";
import { Button, GhostButton } from "../components/Button.jsx";

export default function Login() {
  const nav = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    setErr("");
    setMsg("");
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      if (!userCredential.user.emailVerified) {
        await auth.signOut();
        setErr("Please verify your email before logging in. Check your inbox for the verification link.");
        return;
      }
      
      setMsg("Welcome back!");
      nav("/dashboard", { replace: true });
    } catch (e) {
      const code = e?.code || "";
      const map = {
        "auth/invalid-credential": "Incorrect email or password.",
        "auth/invalid-email": "Invalid email address.",
        "auth/user-not-found": "No account found with that email.",
        "auth/wrong-password": "Wrong password.",
      };
      setErr(map[code] || e.message || "Login failed.");
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
      setErr(e.message || "Google sign-in failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Log in to LearnLoop"
      subtitle="Welcome back! Enter your credentials to continue."
    >
      {err && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-4 text-sm animate-shake">
          {err}
        </div>
      )}
      {msg && (
        <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-lg mb-4 text-sm animate-slideDown">
          {msg}
        </div>
      )}

      <form className="space-y-5" onSubmit={handleLogin}>
        <div className="transform transition-all duration-200 hover:scale-[1.01]">
          <Input
            label="Email"
            type="email"
            value={email}
            required
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>
        <div className="transform transition-all duration-200 hover:scale-[1.01]">
          <Input
            label="Password"
            type="password"
            value={password}
            required
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
          />
        </div>
        <Button disabled={loading} className="transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]">
          {loading ? (
            <span className="flex items-center justify-center gap-2 text-white">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Signing in...
            </span>
          ) : (
            <span className="text-white">Sign In</span>
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
          <img
            src="https://www.svgrepo.com/show/475656/google-color.svg"
            alt=""
            className="w-5 h-5"
          />
          <span className="font-medium">Google</span>
        </span>
      </GhostButton>

      <div className="flex justify-between text-sm mt-6 pt-4 border-t border-gray-100">
        <Link to="/forgot" className="text-ll-700 hover:text-ll-800 font-medium transition-colors">
          Forgot password?
        </Link>
        <Link to="/signup" className="text-gray-600 hover:text-gray-900 font-medium transition-colors">
          Create account →
        </Link>
      </div>
    </AuthLayout>
  );
}
