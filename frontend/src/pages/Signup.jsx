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
      {err && <div className="bg-red-50 border border-red-200 text-red-700 p-2 rounded mb-3">{err}</div>}
      {msg && <div className="bg-green-50 border border-green-200 text-green-700 p-2 rounded mb-3">{msg}</div>}

      <form className="space-y-4" onSubmit={handleSignup}>
        <Input label="Email" type="email" value={email} required onChange={e=>setEmail(e.target.value)} />
        <Input label="Password" type="password" value={password} required onChange={e=>setPassword(e.target.value)} />
        <Input label="Confirm password" type="password" value={confirm} required onChange={e=>setConfirm(e.target.value)} />
        <Button disabled={loading}>{loading ? "Creating..." : "Create account"}</Button>
      </form>

      <div className="my-4 flex items-center gap-3 text-xs text-gray-500">
        <div className="h-px bg-gray-200 flex-1" />
        or continue with
        <div className="h-px bg-gray-200 flex-1" />
      </div>

      <GhostButton onClick={handleGoogle}>
        <span className="inline-flex items-center gap-2 justify-center">
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="" className="w-5 h-5" />
          Google
        </span>
      </GhostButton>

      <div className="text-sm mt-4 text-center">
        <Link to="/login" className="text-gray-600 hover:underline">
          Already have an account? Log in
        </Link>
      </div>
    </AuthLayout>
  );
}
