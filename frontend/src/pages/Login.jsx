import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth, signInWithGoogle } from "../firebase.js";
import { signInWithEmailAndPassword } from "firebase/auth";

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
      setMsg("Login successful!");
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

  async function handleGoogleLogin() {
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
    <div className="min-h-screen grid place-items-center bg-gray-50">
      <div className="p-8 rounded-2xl shadow bg-white w-[420px]">
        <h1 className="text-2xl font-bold mb-6 text-center">Log in</h1>

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
          <div>
            <label className="text-sm font-medium">Email</label>
            <input
              className="w-full border rounded-lg px-3 py-2"
              type="email"
              value={email}
              required
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Password</label>
            <input
              className="w-full border rounded-lg px-3 py-2"
              type="password"
              value={password}
              required
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            disabled={loading}
            className="w-full bg-black text-white py-2 rounded-lg"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="text-center mt-4">
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full border py-2 rounded-lg flex items-center justify-center gap-2"
          >
            <img
              src="https://www.svgrepo.com/show/475656/google-color.svg"
              alt="Google"
              className="w-5 h-5"
            />
            Continue with Google
          </button>
        </div>

        <div className="flex justify-between text-sm mt-4">
          <Link to="/forgot" className="text-gray-600">
            Forgot password?
          </Link>
          <Link to="/signup" className="text-gray-600">
            Create account
          </Link>
        </div>
      </div>
    </div>
  );
}
