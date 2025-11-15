import { Link } from "react-router-dom";
import Logo from "../components/Logo";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-ll-50">
      {/* Header */}
      <div className="mx-auto max-w-6xl px-4 py-6 flex items-center justify-between">
        <Logo size={48} />
        <div className="hidden sm:flex gap-3">
          <Link
            to="/login"
            className="rounded-lg px-4 py-2 font-medium border hover:bg-gray-50"
          >
            Login
          </Link>
          <Link
            to="/signup"
            className="rounded-lg px-4 py-2 font-medium bg-ll-600 text-white hover:bg-ll-700"
          >
            Create account
          </Link>
        </div>
      </div>

      {/* Hero */}
      <div className="mx-auto max-w-6xl px-4 py-16 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <h1 className="text-4xl md:text-5xl font-extrabold leading-tight text-ll-900">
            Welcome to <span className="text-ll-600">Learn</span>
            <span className="text-ll-900">Loop</span>
          </h1>
          <p className="mt-4 text-lg text-gray-700 max-w-xl">
            Plan your learning nodes, track progress, and build a visual skill
            map. Designed for students to stay consistent and improve faster.
          </p>

          <div className="mt-8 flex gap-3">
            <Link
              to="/signup"
              className="rounded-lg px-5 py-3 font-semibold bg-ll-600 text-black hover:bg-ll-700 shadow"
            >
              Get started
            </Link>
            <Link
              to="/login"
              className="rounded-lg px-5 py-3 font-semibold border hover:bg-gray-50"
            >
              I already have an account
            </Link>
          </div>

          <div className="mt-6 text-sm text-gray-600">
            <span className="inline-block mr-3">✅ Email & Google sign-in</span>
          </div>
        </div>

        {/* Right-side illustration (simple placeholder) */}
        <div className="hidden md:block">
          <div className="rounded-2xl border bg-white shadow p-6">
            <div className="h-40 rounded-xl bg-gradient-to-r from-ll-200 to-ll-400" />
            <div className="mt-6 grid grid-cols-3 gap-3">
              <div className="h-24 rounded-lg bg-ll-50 border" />
              <div className="h-24 rounded-lg bg-ll-50 border" />
              <div className="h-24 rounded-lg bg-ll-50 border" />
            </div>
            <p className="mt-4 text-sm text-gray-600">
              (Space to add charts or a preview of skill map here later.)
            </p>
          </div>
        </div>
      </div>

      {/* Mobile CTA */}
      <div className="sm:hidden px-4 pb-10">
        <Link
          to="/signup"
          className="block text-center rounded-lg px-5 py-3 font-semibold bg-ll-600 text-white hover:bg-ll-700 shadow"
        >
          Create account
        </Link>
        <Link
          to="/login"
          className="block text-center mt-2 rounded-lg px-5 py-3 font-semibold border hover:bg-gray-50"
        >
          Login
        </Link>
      </div>
    </div>
  );
}
