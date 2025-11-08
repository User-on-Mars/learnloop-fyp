import { useState } from "react";
import { Link } from "react-router-dom";
import { auth } from "../firebase";
import { sendPasswordResetEmail } from "firebase/auth";

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
      setMsg("If that email exists, we sent you a reset link.");
    } catch (e) {
      const code = e?.code || "";
      const map = {
        "auth/invalid-email": "Enter a valid email address.",
        "auth/user-not-found":
          "If that email exists, a reset link will be sent.",
      };
      setErr(map[code] || e.message || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-gray-50">
      <div className="p-8 rounded-2xl shadow bg-white w-[420px]">
        <h1 className="text-xl font-bold mb-6">Reset password</h1>

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

        <form className="space-y-4" onSubmit={onSubmit}>
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

          <button
            disabled={loading}
            className="w-full bg-black text-white py-2 rounded-lg"
          >
            {loading ? "Sending..." : "Send reset link"}
          </button>
        </form>

        <div className="text-sm mt-4">
          <Link to="/login" className="text-gray-600">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
