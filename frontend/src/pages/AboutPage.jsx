import { Link } from "react-router-dom";
import { Heart, Lightbulb, Target, ArrowRight, Eye, Footprints, Map } from "lucide-react";
import LogoMark from "../components/LogoMark";

/* Leaf decoration — same as landing hero */
function LeafDecoration({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 800 800" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="250" cy="500" rx="280" ry="100" transform="rotate(-30 250 500)" fill="#2e5023" opacity="0.35" />
      <ellipse cx="180" cy="300" rx="240" ry="90" transform="rotate(-55 180 300)" fill="#2e5023" opacity="0.25" />
      <ellipse cx="350" cy="350" rx="220" ry="80" transform="rotate(-45 350 350)" fill="#4f7942" opacity="0.4" />
      <ellipse cx="120" cy="180" rx="200" ry="70" transform="rotate(-20 120 180)" fill="#4f7942" opacity="0.3" />
      <ellipse cx="400" cy="550" rx="180" ry="65" transform="rotate(-65 400 550)" fill="#4f7942" opacity="0.25" />
      <ellipse cx="300" cy="200" rx="180" ry="65" transform="rotate(-40 300 200)" fill="#a3c99a" opacity="0.5" />
      <ellipse cx="100" cy="420" rx="160" ry="55" transform="rotate(5 100 420)" fill="#a3c99a" opacity="0.35" />
      <ellipse cx="450" cy="180" rx="130" ry="50" transform="rotate(-50 450 180)" fill="#a3c99a" opacity="0.3" />
      <ellipse cx="500" cy="400" rx="100" ry="38" transform="rotate(-35 500 400)" fill="#2e5023" opacity="0.2" />
      <ellipse cx="50" cy="600" rx="120" ry="45" transform="rotate(15 50 600)" fill="#4f7942" opacity="0.2" />
      <circle cx="550" cy="300" r="70" fill="#a3c99a" opacity="0.15" />
      <circle cx="80" cy="100" r="55" fill="#4f7942" opacity="0.2" />
    </svg>
  );
}

export default function AboutPage() {
  return (
    <div className="w-full">

      {/* ━━━━ HERO ━━━━ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#edf5e9] via-white to-[#f4f7f2] min-h-[420px] sm:min-h-[480px]">
        <LeafDecoration className="absolute -left-10 -top-10 w-[600px] h-[600px] sm:w-[800px] sm:h-[800px] pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full bg-[#a3c99a] opacity-10 blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-5 py-20 sm:py-28 flex flex-col md:flex-row items-center">
          <div className="hidden md:block md:w-[40%] lg:w-[45%]" />
          <div className="md:w-[60%] lg:w-[55%] md:pl-10 lg:pl-16 text-center md:text-left">
            <div className="inline-flex items-center gap-2 bg-[#edf5e9] border border-[#d4e8cc] text-[#2e5023] px-4 py-1.5 rounded-full text-sm font-semibold mb-5">
              <LogoMark size={20} /> About LearnLoop
            </div>
            <h1 className="font-[var(--font-display)] text-4xl sm:text-5xl lg:text-[3.4rem] font-extrabold tracking-tight text-[#1c1f1a] leading-[1.1] mb-4">
              Built for learners<br className="hidden sm:block" /> who want structure.
            </h1>
            <p className="text-[#3d4a38] text-base sm:text-lg leading-relaxed max-w-lg mb-6 mx-auto md:mx-0 font-medium">
              No noisy feeds. No engagement tricks. Just your path, your practice, and honest reflection — visible and yours.
            </p>
          </div>
        </div>
      </section>

      {/* ━━━━ STORY — two cards ━━━━ */}
      <section className="bg-white border-t border-[#e2e6dc]">
        <div className="max-w-5xl mx-auto px-5 py-20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Why we built it */}
            <div className="relative bg-white rounded-2xl border border-[#e2e6dc] overflow-hidden group hover:shadow-lg transition-all">
              {/* Card background art */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-[#a3c99a] opacity-20 blur-2xl" />
                <div className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full bg-[#4f7942] opacity-15 blur-2xl" />
                <svg className="absolute top-2 right-2 w-32 h-32" viewBox="0 0 120 120" fill="none">
                  <ellipse cx="80" cy="40" rx="45" ry="16" transform="rotate(-30 80 40)" fill="#4f7942" opacity="0.12" />
                  <ellipse cx="50" cy="70" rx="35" ry="12" transform="rotate(-50 50 70)" fill="#a3c99a" opacity="0.15" />
                </svg>
              </div>
              <div className="relative z-10 p-8">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#edf5e9] to-[#d4e8cc] flex items-center justify-center mb-5">
                  <Lightbulb className="w-6 h-6 text-[#2e5023]" />
                </div>
                <h2 className="font-[var(--font-display)] text-xl font-extrabold text-[#1c1f1a] mb-3">Why we built it</h2>
                <p className="text-[15px] text-[#3d4a38] leading-relaxed mb-3 font-medium">
                  Most tools optimize for engagement metrics. We wanted something quieter — a place to map what you're trying to learn, show up for short sessions, and see the next step unlock.
                </p>
                <p className="text-[15px] text-[#565c52] leading-relaxed">
                  LearnLoop is for students, self-taught builders, and anyone who learns in the real world — not only in a classroom. We built it because we needed it ourselves.
                </p>
              </div>
            </div>

            {/* What we're building */}
            <div className="relative bg-white rounded-2xl border border-[#e2e6dc] overflow-hidden group hover:shadow-lg transition-all">
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute -top-10 -left-10 w-44 h-44 rounded-full bg-[#fbbf24] opacity-[0.1] blur-2xl" />
                <div className="absolute -bottom-8 -right-8 w-36 h-36 rounded-full bg-[#4f7942] opacity-15 blur-2xl" />
                <svg className="absolute bottom-2 left-2 w-28 h-28" viewBox="0 0 110 110" fill="none">
                  <ellipse cx="40" cy="70" rx="40" ry="14" transform="rotate(20 40 70)" fill="#4f7942" opacity="0.1" />
                  <ellipse cx="70" cy="40" rx="30" ry="11" transform="rotate(-25 70 40)" fill="#a3c99a" opacity="0.12" />
                </svg>
              </div>
              <div className="relative z-10 p-8">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 flex items-center justify-center mb-5">
                  <Target className="w-6 h-6 text-amber-600" />
                </div>
                <h2 className="font-[var(--font-display)] text-xl font-extrabold text-[#1c1f1a] mb-3">What we're building</h2>
                <p className="text-[15px] text-[#3d4a38] leading-relaxed mb-3 font-medium">
                  A structured practice system. You create skill maps, log timed sessions, write reflections, and track your growth with XP and streaks. Learn solo or invite friends into shared rooms.
                </p>
                <p className="text-[15px] text-[#565c52] leading-relaxed">
                  Every week, the top learners on the leaderboard win free Pro subscriptions. It's learning with just enough gamification to keep you going — without turning it into a game.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ━━━━ VALUES ━━━━ */}
      <section className="bg-[#f4f7f2] border-t border-[#e2e6dc]">
        <div className="max-w-5xl mx-auto px-5 py-20">
          <h2 className="font-[var(--font-display)] text-2xl sm:text-3xl font-bold text-[#1c1f1a] text-center mb-2">What we care about</h2>
          <p className="text-sm text-[#565c52] text-center mb-14">The principles behind every feature we ship.</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">

            {/* Clarity */}
            <div className="bg-white rounded-2xl border border-[#e2e6dc] overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all duration-200">
              <div className="h-44 bg-gradient-to-br from-[#edf5e9] to-[#d4e8cc] flex items-center justify-center relative overflow-hidden">
                <div className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full bg-[#4f7942] opacity-10 blur-xl" />
                <svg className="relative w-28 h-28" viewBox="0 0 120 120" fill="none">
                  {/* Map with path */}
                  <rect x="20" y="20" width="80" height="80" rx="12" fill="white" stroke="#4f7942" strokeWidth="2.5" opacity="0.9" />
                  <path d="M35 85 Q50 55 60 60 Q70 65 75 40 Q80 25 95 35" stroke="#2e5023" strokeWidth="3" strokeLinecap="round" strokeDasharray="0" fill="none" />
                  <circle cx="35" cy="85" r="6" fill="#4f7942" />
                  <path d="M32 85 L34 87 L38 83" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="60" cy="60" r="5" fill="#4f7942" opacity="0.7" />
                  <circle cx="95" cy="35" r="6" fill="#fbbf24" />
                  <path d="M92 33 L93.5 36 L97 36.5 L94.5 39 L95 42.5 L92 41 L89 42.5 L89.5 39 L87 36.5 L90.5 36Z" fill="white" opacity="0.9" />
                  {/* Grid lines */}
                  <line x1="20" y1="50" x2="100" y2="50" stroke="#a3c99a" strokeWidth="0.8" opacity="0.3" />
                  <line x1="20" y1="70" x2="100" y2="70" stroke="#a3c99a" strokeWidth="0.8" opacity="0.3" />
                  <line x1="50" y1="20" x2="50" y2="100" stroke="#a3c99a" strokeWidth="0.8" opacity="0.3" />
                  <line x1="75" y1="20" x2="75" y2="100" stroke="#a3c99a" strokeWidth="0.8" opacity="0.3" />
                </svg>
              </div>
              <div className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-11 h-11 rounded-xl bg-[#2e5023] flex items-center justify-center shadow-md shadow-[#2e5023]/20">
                    <Map className="w-5.5 h-5.5 text-white" />
                  </div>
                  <h3 className="text-lg font-extrabold text-[#1c1f1a]">Clarity</h3>
                </div>
                <p className="text-sm text-[#3d4a38] leading-relaxed font-medium">One map, one direction. You always know what's next and where you stand.</p>
              </div>
            </div>

            {/* Reflection */}
            <div className="bg-white rounded-2xl border border-[#e2e6dc] overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all duration-200">
              <div className="h-44 bg-gradient-to-br from-rose-50 to-pink-50 flex items-center justify-center relative overflow-hidden">
                <div className="absolute -left-6 -top-6 w-28 h-28 rounded-full bg-rose-300 opacity-10 blur-xl" />
                <svg className="relative w-28 h-28" viewBox="0 0 120 120" fill="none">
                  {/* Journal book */}
                  <rect x="22" y="15" width="76" height="90" rx="6" fill="white" stroke="#ec4899" strokeWidth="2.5" opacity="0.9" />
                  <rect x="22" y="15" width="12" height="90" rx="0" fill="#fce7f3" stroke="#ec4899" strokeWidth="0" />
                  <line x1="34" y1="15" x2="34" y2="105" stroke="#f9a8d4" strokeWidth="1.5" />
                  {/* Writing lines */}
                  <line x1="42" y1="35" x2="85" y2="35" stroke="#ec4899" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
                  <line x1="42" y1="47" x2="78" y2="47" stroke="#ec4899" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
                  <line x1="42" y1="59" x2="82" y2="59" stroke="#ec4899" strokeWidth="3" strokeLinecap="round" opacity="0.35" />
                  <line x1="42" y1="71" x2="65" y2="71" stroke="#ec4899" strokeWidth="3" strokeLinecap="round" opacity="0.25" />
                  {/* Heart bookmark */}
                  <path d="M88 12 L88 30 L93 25 L98 30 L98 12" fill="#ec4899" opacity="0.6" />
                  {/* Sparkle */}
                  <circle cx="80" cy="85" r="8" fill="#fce7f3" stroke="#ec4899" strokeWidth="1.5" />
                  <path d="M80 80 L80 90 M75 85 L85 85" stroke="#ec4899" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <div className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-11 h-11 rounded-xl bg-rose-500 flex items-center justify-center shadow-md shadow-rose-500/20">
                    <Eye className="w-5.5 h-5.5 text-white" />
                  </div>
                  <h3 className="text-lg font-extrabold text-[#1c1f1a]">Reflection</h3>
                </div>
                <p className="text-sm text-[#3d4a38] leading-relaxed font-medium">Understanding how you felt and what blocked you matters as much as checking boxes.</p>
              </div>
            </div>

            {/* Your pace */}
            <div className="bg-white rounded-2xl border border-[#e2e6dc] overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all duration-200">
              <div className="h-44 bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center relative overflow-hidden">
                <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-emerald-300 opacity-10 blur-xl" />
                <svg className="relative w-28 h-28" viewBox="0 0 120 120" fill="none">
                  {/* Winding path with footsteps */}
                  <path d="M20 100 Q40 80 35 60 Q30 40 50 35 Q70 30 75 50 Q80 70 100 55" stroke="#10b981" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.4" strokeDasharray="8 6" />
                  {/* Footstep dots along path */}
                  <circle cx="25" cy="92" r="4" fill="#10b981" opacity="0.6" />
                  <circle cx="35" cy="72" r="4" fill="#10b981" opacity="0.5" />
                  <circle cx="38" cy="50" r="4" fill="#10b981" opacity="0.4" />
                  <circle cx="55" cy="37" r="4" fill="#10b981" opacity="0.5" />
                  <circle cx="72" cy="38" r="4" fill="#10b981" opacity="0.6" />
                  <circle cx="80" cy="52" r="4" fill="#10b981" opacity="0.7" />
                  {/* Current position — larger */}
                  <circle cx="95" cy="55" r="8" fill="#10b981" opacity="0.2" />
                  <circle cx="95" cy="55" r="5" fill="#10b981" />
                  {/* Small leaves */}
                  <ellipse cx="55" cy="20" rx="12" ry="5" transform="rotate(-30 55 20)" fill="#a3c99a" opacity="0.4" />
                  <ellipse cx="15" cy="70" rx="10" ry="4" transform="rotate(15 15 70)" fill="#a3c99a" opacity="0.3" />
                  <ellipse cx="100" cy="80" rx="11" ry="4" transform="rotate(-20 100 80)" fill="#a3c99a" opacity="0.35" />
                </svg>
              </div>
              <div className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-11 h-11 rounded-xl bg-emerald-600 flex items-center justify-center shadow-md shadow-emerald-600/20">
                    <Footprints className="w-5.5 h-5.5 text-white" />
                  </div>
                  <h3 className="text-lg font-extrabold text-[#1c1f1a]">Your pace</h3>
                </div>
                <p className="text-sm text-[#3d4a38] leading-relaxed font-medium">No streak shaming. Progress is allowed to be uneven. Show up when you can.</p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ━━━━ CTA ━━━━ */}
      <section className="relative overflow-hidden bg-[#4f7942] text-white">
        <div className="absolute -right-10 -bottom-10 w-40 h-40 rounded-full bg-[#a3c99a] opacity-15 blur-2xl pointer-events-none" />
        <div className="absolute -left-10 -top-10 w-28 h-28 rounded-full bg-[#a3c99a] opacity-10 blur-2xl pointer-events-none" />

        <div className="relative max-w-lg mx-auto px-5 py-14 text-center">
          <h2 className="font-[var(--font-display)] text-xl font-bold mb-2">Ready to start learning with structure?</h2>
          <p className="text-sm text-white/60 mb-6">Join learners building real skills every day.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/signup" className="group relative inline-flex items-center gap-2 px-7 py-3 rounded-lg text-sm font-bold overflow-hidden bg-white text-[#2e5023] hover:bg-[#edf5e9] transition-colors shadow-md">
              Get started free <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link to="/contact" className="px-6 py-3 text-sm font-medium text-white/70 border border-white/20 rounded-lg hover:bg-white/10 hover:text-white transition-colors">
              Contact us
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
