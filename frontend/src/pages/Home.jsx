// src/pages/Home.jsx
import { Link } from "react-router-dom";
export default function Home() {
  return (
    <div className="min-h-screen grid place-items-center bg-gray-50">
      <div className="p-8 rounded-2xl shadow bg-white w-[420px] text-center space-y-4">
        <h1 className="text-2xl font-bold">Welcome to LearnLoop</h1>
        <Link className="block bg-black text-white py-2 rounded-lg" to="/login">
          Login
        </Link>
        <Link className="block border py-2 rounded-lg" to="/signup">
          Sign Up
        </Link>
      </div>
    </div>
  );
}
