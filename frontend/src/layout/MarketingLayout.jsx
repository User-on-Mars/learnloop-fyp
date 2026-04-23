import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { Menu, X } from "lucide-react";
import Logo from "../components/Logo";
import LogoMark from "../components/LogoMark";

const NAV = [
  { to: "/", label: "Home", end: true },
  { to: "/features", label: "Features" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

export default function MarketingLayout() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <div className="min-h-screen flex flex-col bg-[#f4f7f2] text-site-ink font-[var(--font-body)]">
      {/* ── Navbar ── */}
      <header className="sticky top-0 z-50 bg-[#4f7942] text-white shadow-sm">
        <div className="w-full px-6 lg:px-10 h-16 flex items-center justify-between">
          {/* Logo — far left */}
          <Link to="/" className="flex items-center" onClick={close}>
            <Logo size={48} />
          </Link>

          {/* Desktop nav + auth — far right */}
          <div className="hidden md:flex items-center gap-6">
            <nav className="flex items-center gap-1" aria-label="Primary">
              {NAV.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={n.end}
                  className={({ isActive }) =>
                    `px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "text-white/70 hover:text-white hover:bg-white/10"
                    }`
                  }
                >
                  {n.label}
                </NavLink>
              ))}
            </nav>

            <div className="flex items-center gap-2.5">
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-medium text-white/80 hover:text-white rounded-lg transition-colors"
              >
                Log in
              </Link>
              <Link
                to="/signup"
                className="px-5 py-2 text-sm font-semibold bg-white text-[#3d6b30] rounded-lg hover:bg-white/90 transition-colors shadow-sm"
              >
                Sign up
              </Link>
            </div>
          </div>

          {/* Mobile toggle */}
          <button
            type="button"
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg border border-white/20 text-white"
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="w-[18px] h-[18px]" /> : <Menu className="w-[18px] h-[18px]" />}
          </button>
        </div>

        {/* Mobile menu */}
        {open && (
          <div className="md:hidden bg-[#4f7942] border-t border-white/10 px-5 pb-4 pt-2">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                onClick={close}
                className={({ isActive }) =>
                  `block py-2.5 text-sm font-medium border-b border-white/10 last:border-0 ${
                    isActive ? "text-white" : "text-white/60"
                  }`
                }
              >
                {n.label}
              </NavLink>
            ))}
            <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-white/10">
              <Link to="/login" onClick={close} className="text-center py-2 text-sm font-medium text-white border border-white/20 rounded-lg">
                Log in
              </Link>
              <Link to="/signup" onClick={close} className="text-center py-2 text-sm font-semibold bg-white text-[#3d6b30] rounded-lg">
                Sign up
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ── Main ── */}
      <main className="flex-1 w-full">
        <Outlet />
      </main>

      {/* ── Footer ── */}
      <footer className="bg-[#4f7942] relative overflow-hidden">
        {/* Decorative leaf shapes */}
        <div className="absolute right-0 top-0 w-64 h-full pointer-events-none opacity-[0.06]">
          <svg className="w-full h-full" viewBox="0 0 300 200" fill="none">
            <ellipse cx="200" cy="60" rx="120" ry="50" transform="rotate(-30 200 60)" fill="#a3c99a" />
            <ellipse cx="250" cy="140" rx="100" ry="40" transform="rotate(-50 250 140)" fill="#4f7942" />
            <ellipse cx="150" cy="160" rx="80" ry="35" transform="rotate(10 150 160)" fill="#a3c99a" />
          </svg>
        </div>

        <div className="relative max-w-6xl mx-auto px-5 pt-12 pb-6">
          {/* Top section */}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8 mb-10">
            {/* Brand */}
            <div className="max-w-xs">
              <div className="flex items-center gap-2.5 mb-3">
                <LogoMark size={30} />
                <span className="text-lg font-bold text-white tracking-tight leading-none">
                  <span className="text-white">Learn</span><span className="text-white/70">Loop</span>
                </span>
              </div>
              <p className="text-sm text-white/50 leading-relaxed">
                Map your goals, practice with intention, and track real progress. Built for learners who want structure.
              </p>
            </div>

            {/* Links */}
            <div className="flex gap-16">
              <div>
                <p className="text-xs font-semibold text-white/80 uppercase tracking-wider mb-3">Site Map</p>
                <div className="flex flex-col gap-2">
                  <Link to="/" className="text-sm text-white/50 hover:text-white transition-colors">Homepage</Link>
                  <Link to="/features" className="text-sm text-white/50 hover:text-white transition-colors">Features</Link>
                  <Link to="/about" className="text-sm text-white/50 hover:text-white transition-colors">About</Link>
                  <Link to="/contact" className="text-sm text-white/50 hover:text-white transition-colors">Contact</Link>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-white/80 uppercase tracking-wider mb-3">Account</p>
                <div className="flex flex-col gap-2">
                  <Link to="/login" className="text-sm text-white/50 hover:text-white transition-colors">Log in</Link>
                  <Link to="/signup" className="text-sm text-white/50 hover:text-white transition-colors">Sign up</Link>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-white/15 pt-4">
            <p className="text-xs text-white/40 text-center">
              Copyright © {new Date().getFullYear()} LearnLoop. All Rights Reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
