import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth, signInWithGoogle } from "../firebase.js";
import { signInWithEmailAndPassword } from "firebase/auth";
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
      await signInWithEmailAndPassword(auth, email, password);
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
        <div className="bg-red-50 border border-red-200 text-red-700 p-2 rounded mb-3">
          {err}
        </div>
      )}
      {msg && (
        <div className="bg-green-50 border border-green-200 text-green-700 p-2 rounded mb-3">
          {msg}
        </div>
      )}

      <form className="space-y-4" onSubmit={handleLogin}>
        <Input
          label="Email"
          type="email"
          value={email}
          required
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label="Password"
          type="password"
          value={password}
          required
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </Button>
      </form>

      <div className="my-4 flex items-center gap-3 text-xs text-gray-500">
        <div className="h-px bg-gray-200 flex-1" />
        or continue with
        <div className="h-px bg-gray-200 flex-1" />
      </div>

      <GhostButton onClick={handleGoogle}>
        <span className="inline-flex items-center gap-2 justify-center">
          <img
            src="https://www.svgrepo.com/show/475656/google-color.svg"
            alt=""
            className="w-5 h-5"
          />
          Google
        </span>
      </GhostButton>

      <div className="flex justify-between text-sm mt-4">
        <Link to="/forgot" className="text-ll-700 hover:underline">
          Forgot password?
        </Link>
        <Link to="/signup" className="text-gray-600 hover:underline">
          Create account
        </Link>
      </div>
    </AuthLayout>
  );
}
