import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth, signInWithGoogle } from "../firebase.js";
import { createUserWithEmailAndPassword } from "firebase/auth";

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
    setErr("");
    setMsg("");
    setLoading(true);

    try {
      if (password !== confirm) throw new Error("Passwords do not match");
      await createUserWithEmailAndPassword(auth, email, password);
      setMsg("Account created successfully! Please log in.");
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

  async function handleGoogleSignup() {
    setErr("");
    setMsg("");
    setLoading(true);
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
    <div className="min-h-screen grid place-items-center bg-gray-50">
      <div className="p-8 rounded-2xl shadow bg-white w-[420px]">
        <h1 className="text-2xl font-bold mb-6 text-center">Create account</h1>

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

        <form className="space-y-4" onSubmit={handleSignup}>
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

          <div>
            <label className="text-sm font-medium">Confirm password</label>
            <input
              className="w-full border rounded-lg px-3 py-2"
              type="password"
              value={confirm}
              required
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>

          <button
            disabled={loading}
            className="w-full bg-black text-white py-2 rounded-lg"
          >
            {loading ? "Creating..." : "Create account"}
          </button>
        </form>

        <div className="text-center mt-4">
          <button
            type="button"
            onClick={handleGoogleSignup}
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

        <div className="text-sm mt-4 text-center">
          <Link to="/login" className="text-gray-600">
            Already have an account? Log in
          </Link>
        </div>
      </div>
    </div>
  );
}
