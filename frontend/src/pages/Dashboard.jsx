import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase.js";

export default function Dashboard() {
  const nav = useNavigate();
  async function onLogout() {
    await signOut(auth);
    nav("/login", { replace: true });
  }
  return (
    <div className="min-h-screen grid place-items-center bg-gray-50">
      <div className="p-8 rounded-2xl shadow bg-white w-[420px]">
        <h1 className="text-xl font-bold mb-4">Dashboard</h1>
        <p className="text-gray-700 mb-6">You're logged in 🎉</p>
        <button onClick={onLogout} className="w-full bg-black text-white py-2 rounded-lg">
          Log out
        </button>
      </div>
    </div>
  );
}
