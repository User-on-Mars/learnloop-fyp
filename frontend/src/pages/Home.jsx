import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, Crown, Zap, Trophy, Medal, Award,
  Check, X, Sparkles, BarChart3, Gift,
} from "lucide-react";
import axios from "axios";

const MEDALS = { 1: "🥇", 2: "🥈", 3: "🥉" };
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

/* ── Decorative leaf SVG for the hero — bold, large, layered ── */
function LeafDecoration({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 800 800" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Big background leaves — dark green */}
      <ellipse cx="250" cy="500" rx="280" ry="100" transform="rotate(-30 250 500)" fill="#2e5023" opacity="0.35" />
      <ellipse cx="180" cy="300" rx="240" ry="90" transform="rotate(-55 180 300)" fill="#2e5023" opacity="0.25" />
      {/* Mid-tone leaves */}
      <ellipse cx="350" cy="350" rx="220" ry="80" transform="rotate(-45 350 350)" fill="#4f7942" opacity="0.4" />
      <ellipse cx="120" cy="180" rx="200" ry="70" transform="rotate(-20 120 180)" fill="#4f7942" opacity="0.3" />
      <ellipse cx="400" cy="550" rx="180" ry="65" transform="rotate(-65 400 550)" fill="#4f7942" opacity="0.25" />
      {/* Light accent leaves */}
      <ellipse cx="300" cy="200" rx="180" ry="65" transform="rotate(-40 300 200)" fill="#a3c99a" opacity="0.5" />
      <ellipse cx="100" cy="420" rx="160" ry="55" transform="rotate(5 100 420)" fill="#a3c99a" opacity="0.35" />
      <ellipse cx="450" cy="180" rx="130" ry="50" transform="rotate(-50 450 180)" fill="#a3c99a" opacity="0.3" />
      {/* Small detail leaves */}
      <ellipse cx="500" cy="400" rx="100" ry="38" transform="rotate(-35 500 400)" fill="#2e5023" opacity="0.2" />
      <ellipse cx="50" cy="600" rx="120" ry="45" transform="rotate(15 50 600)" fill="#4f7942" opacity="0.2" />
      {/* Soft circles for depth */}
      <circle cx="550" cy="300" r="70" fill="#a3c99a" opacity="0.15" />
      <circle cx="80" cy="100" r="55" fill="#4f7942" opacity="0.2" />
      <circle cx="600" cy="600" r="50" fill="#2e5023" opacity="0.1" />
      <circle cx="350" cy="700" r="40" fill="#a3c99a" opacity="0.2" />
    </svg>
  );
}

function FeatureCarousel() {
  return (
    <section className="bg-[#f4f7f2] border-t border-[#e2e6dc]">
      <div className="max-w-5xl mx-auto px-5 py-20">
        <h2 className="font-[var(--font-display)] text-2xl sm:text-3xl font-bold text-[#1c1f1a] text-center mb-1">What you can do</h2>
        <p className="text-sm text-[#565c52] text-center mb-14">Everything you need for deliberate practice.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {[
            {
              title: "Skill Maps",
              desc: "Break big goals into visual paths with nodes you unlock as you progress.",
              gradient: "from-green-50 to-emerald-50",
              blob: "bg-green-200",
              illustration: (
                <svg className="w-28 h-28" viewBox="0 0 120 120" fill="none">
                  <path d="M20 100 Q35 70,60 65 Q85 60,60 35 Q35 10,100 20" stroke="#4f7942" strokeWidth="2.5" strokeDasharray="6 4" fill="none" opacity="0.4"/>
                  <circle cx="20" cy="100" r="12" fill="#a3c99a" opacity="0.25"/><circle cx="20" cy="100" r="7" fill="#4f7942"/>
                  <path d="M17 100 L19 102 L23 98" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="60" cy="65" r="12" fill="#a3c99a" opacity="0.25"/><circle cx="60" cy="65" r="7" fill="#4f7942"/>
                  <path d="M57 65 L59 67 L63 63" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="60" cy="35" r="12" fill="#e2e6dc" opacity="0.5"/><circle cx="60" cy="35" r="7" fill="#c8cec0"/>
                  <circle cx="100" cy="20" r="12" fill="#e2e6dc" opacity="0.3"/><circle cx="100" cy="20" r="7" fill="#c8cec0" opacity="0.6"/>
                  <path d="M100 16 L101.5 19 L105 19.5 L102.5 22 L103 25.5 L100 24 L97 25.5 L97.5 22 L95 19.5 L98.5 19Z" fill="#fbbf24" opacity="0.7"/>
                </svg>
              ),
            },
            {
              title: "Practice Tracking",
              desc: "Start a timer, log your session, and track how much time you put in each day.",
              gradient: "from-blue-50 to-sky-50",
              blob: "bg-blue-200",
              illustration: (
                <svg className="w-28 h-28" viewBox="0 0 100 100" fill="none">
                  <circle cx="50" cy="50" r="36" stroke="#93c5fd" strokeWidth="3" fill="white"/>
                  <circle cx="50" cy="50" r="32" stroke="#bfdbfe" strokeWidth="1" fill="white"/>
                  {[0,30,60,90,120,150,180,210,240,270,300,330].map(d=><line key={d} x1="50" y1="21" x2="50" y2="24" stroke="#93c5fd" strokeWidth="1.5" strokeLinecap="round" transform={`rotate(${d} 50 50)`}/>)}
                  <line x1="50" y1="50" x2="50" y2="30" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round"/>
                  <line x1="50" y1="50" x2="65" y2="45" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round"/>
                  <circle cx="50" cy="50" r="3.5" fill="#3b82f6"/>
                  <rect x="47" y="9" width="6" height="6" rx="2" fill="#93c5fd"/>
                </svg>
              ),
            },
            {
              title: "Reflections",
              desc: "Write what clicked and what didn't. Capture insights after every session.",
              gradient: "from-amber-50 to-orange-50",
              blob: "bg-amber-200",
              illustration: (
                <svg className="w-24 h-24" viewBox="0 0 80 80" fill="none">
                  <rect x="15" y="10" width="50" height="60" rx="4" fill="white" stroke="#fbbf24" strokeWidth="1.5"/>
                  <line x1="25" y1="10" x2="25" y2="70" stroke="#fbbf24" strokeWidth="1" opacity="0.3"/>
                  <line x1="30" y1="22" x2="55" y2="22" stroke="#fcd34d" strokeWidth="2.5" strokeLinecap="round"/>
                  <line x1="30" y1="30" x2="50" y2="30" stroke="#fcd34d" strokeWidth="2.5" strokeLinecap="round" opacity="0.7"/>
                  <line x1="30" y1="38" x2="58" y2="38" stroke="#fcd34d" strokeWidth="2.5" strokeLinecap="round" opacity="0.5"/>
                  <line x1="30" y1="46" x2="45" y2="46" stroke="#fcd34d" strokeWidth="2.5" strokeLinecap="round" opacity="0.3"/>
                  <g transform="translate(48,48) rotate(30)"><rect width="5" height="22" rx="1.5" fill="#f59e0b"/><polygon points="0,22 5,22 2.5,27" fill="#1c1f1a"/></g>
                  <circle cx="60" cy="14" r="6" fill="#fef3c7" stroke="#fbbf24" strokeWidth="1.2"/>
                  <line x1="60" y1="11.5" x2="60" y2="16.5" stroke="#f59e0b" strokeWidth="1.2" strokeLinecap="round"/>
                  <line x1="57.5" y1="14" x2="62.5" y2="14" stroke="#f59e0b" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
              ),
            },
            {
              title: "RoomSpace",
              desc: "Invite friends into shared rooms and learn through skill maps together.",
              gradient: "from-pink-50 to-rose-50",
              blob: "bg-pink-200",
              illustration: (
                <svg className="w-24 h-24" viewBox="0 0 80 80" fill="none">
                  <rect x="8" y="18" width="64" height="48" rx="10" fill="white" stroke="#f9a8d4" strokeWidth="1.5"/>
                  <circle cx="28" cy="38" r="8" fill="#fce7f3" stroke="#f9a8d4" strokeWidth="1.5"/>
                  <circle cx="28" cy="36" r="3" fill="#f9a8d4"/>
                  <path d="M22 46 Q28 42 34 46" fill="#fce7f3" stroke="#f9a8d4" strokeWidth="1.5"/>
                  <circle cx="52" cy="38" r="8" fill="#fce7f3" stroke="#ec4899" strokeWidth="1.5" opacity="0.6"/>
                  <circle cx="52" cy="36" r="3" fill="#ec4899" opacity="0.5"/>
                  <path d="M46 46 Q52 42 58 46" fill="#fce7f3" stroke="#ec4899" strokeWidth="1.5" opacity="0.5"/>
                  <line x1="36" y1="38" x2="44" y2="38" stroke="#f9a8d4" strokeWidth="2" strokeDasharray="3 3"/>
                </svg>
              ),
            },
            {
              title: "Weekly Summary",
              desc: "See your practice hours, reflections, and growth trends at a glance each week.",
              gradient: "from-violet-50 to-purple-50",
              blob: "bg-violet-200",
              illustration: (
                <svg className="w-28 h-28" viewBox="0 0 100 100" fill="none">
                  <rect x="12" y="12" width="76" height="76" rx="10" fill="white" stroke="#c4b5fd" strokeWidth="1.5"/>
                  <line x1="20" y1="30" x2="80" y2="30" stroke="#c4b5fd" strokeWidth="0.8" opacity="0.4"/>
                  <line x1="20" y1="48" x2="80" y2="48" stroke="#c4b5fd" strokeWidth="0.8" opacity="0.3"/>
                  <rect x="22" y="52" width="10" height="22" rx="3" fill="#c4b5fd" opacity="0.4"/>
                  <rect x="36" y="40" width="10" height="34" rx="3" fill="#c4b5fd" opacity="0.6"/>
                  <rect x="50" y="28" width="10" height="46" rx="3" fill="#8b5cf6" opacity="0.7"/>
                  <rect x="64" y="35" width="10" height="39" rx="3" fill="#c4b5fd" opacity="0.5"/>
                  <path d="M27 48 L41 36 L55 24 L69 31" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.6"/>
                  <circle cx="55" cy="24" r="3" fill="#8b5cf6" opacity="0.5"/>
                </svg>
              ),
            },
            {
              title: "XP & Leaderboard",
              desc: "Earn XP for every action. Climb the weekly board and win free Pro.",
              gradient: "from-emerald-50 to-teal-50",
              blob: "bg-emerald-200",
              illustration: (
                <svg className="w-24 h-24" viewBox="0 0 80 80" fill="none">
                  <rect x="8" y="48" width="12" height="22" rx="3" fill="#6ee7b7" opacity="0.4"/>
                  <rect x="24" y="34" width="12" height="36" rx="3" fill="#6ee7b7" opacity="0.6"/>
                  <rect x="40" y="22" width="12" height="48" rx="3" fill="#10b981" opacity="0.8"/>
                  <g transform="translate(56,10)">
                    <path d="M4 0H16V14Q10 20 4 14Z" fill="#fbbf24"/>
                    <path d="M0 2Q0 9 4 9" stroke="#fbbf24" strokeWidth="2" fill="none" opacity="0.5"/>
                    <path d="M20 2Q20 9 16 9" stroke="#fbbf24" strokeWidth="2" fill="none" opacity="0.5"/>
                    <rect x="7" y="20" width="6" height="3" rx="1" fill="#fbbf24" opacity="0.7"/>
                    <rect x="5" y="23" width="10" height="2.5" rx="1" fill="#fbbf24" opacity="0.5"/>
                    <path d="M10 5L11.5 8.5 15 9 12.5 11.5 13 15 10 13.5 7 15 7.5 11.5 5 9 8.5 8.5Z" fill="white" opacity="0.7"/>
                  </g>
                  <text x="10" y="78" fontSize="10" fill="#10b981" fontWeight="800">+XP</text>
                </svg>
              ),
            },
          ].map((card) => (
            <div key={card.title} className="bg-white rounded-2xl border border-[#e2e6dc] overflow-hidden group hover:shadow-lg hover:-translate-y-1 transition-all duration-200 min-h-[280px] flex flex-col">
              <div className={`h-44 bg-gradient-to-br ${card.gradient} flex items-center justify-center relative overflow-hidden flex-shrink-0`}>
                <div className={`absolute -right-4 -bottom-4 w-24 h-24 rounded-full ${card.blob} opacity-25 blur-xl`} />
                <div className="relative">{card.illustration}</div>
              </div>
              <div className="p-5 sm:p-6 flex-1 flex flex-col">
                <h3 className="text-base font-bold text-[#1c1f1a] mb-2">{card.title}</h3>
                <p className="text-[13px] sm:text-sm text-[#565c52] leading-relaxed">{card.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const PRO_PLANS = [
  { months: 1, label: "1 Month", price: 299, perMonth: 299, save: 0 },
  { months: 3, label: "3 Months", price: 749, perMonth: 250, save: 148, badge: "Popular" },
  { months: 6, label: "6 Months", price: 1299, perMonth: 217, save: 495, badge: "Best Value" },
];

function PricingSection() {
  const [selected, setSelected] = useState(1); // index into PRO_PLANS
  const plan = PRO_PLANS[selected];

  return (
    <section className="bg-white border-t border-[#e2e6dc]">
      <div className="max-w-4xl mx-auto px-5 py-20">
        <h2 className="font-[var(--font-display)] text-2xl sm:text-3xl font-bold text-[#1c1f1a] text-center mb-1">Simple pricing</h2>
        <p className="text-sm text-[#565c52] text-center mb-14">Free to start. Upgrade when you need more room.</p>

        <div className="flex flex-col md:flex-row gap-6 mb-14">

          {/* ── FREE ── */}
          <div className="w-full rounded-2xl border border-[#e2e6dc] bg-[#f8faf6] p-8 flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-xl bg-gray-200/60 flex items-center justify-center">
                <Zap className="w-5 h-5 text-gray-400" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Free Plan</span>
                <span className="text-lg font-extrabold text-[#1c1f1a]">Free</span>
              </div>
            </div>

            <p className="text-[40px] font-extrabold text-[#1c1f1a] leading-none mb-1">Rs. 0</p>
            <p className="text-sm text-gray-400 mb-8">Forever free</p>

            <ul className="space-y-3 mb-8 flex-1">
              {["3 Skill Maps", "5 Nodes / map", "5 Sessions / node", "1 Room · 3 members", "1 Publish request / mo"].map((t) => (
                <li key={t} className="flex items-start gap-2.5 text-sm text-[#3d4a38] font-medium">
                  <Check className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />{t}
                </li>
              ))}
              {["PDF Export"].map((t) => (
                <li key={t} className="flex items-start gap-2.5 text-sm text-[#9aa094]">
                  <X className="w-4 h-4 text-red-300 mt-0.5 flex-shrink-0" />{t}
                </li>
              ))}
            </ul>

            <Link to="/signup" className="block text-center py-3.5 min-h-[44px] text-[15px] font-bold text-[#565c52] bg-white border-2 border-[#e2e6dc] rounded-xl hover:bg-gray-100 hover:text-[#1c1f1a] hover:border-[#c8cec0] transition-all">
              Sign up free
            </Link>
          </div>

          {/* ── PRO ── */}
          <div className="w-full relative rounded-2xl border-2 border-[#2e5023] bg-white p-8 flex flex-col shadow-xl overflow-hidden">
            {/* Background art */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-[#a3c99a] opacity-20 blur-2xl" />
              <div className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full bg-[#4f7942] opacity-15 blur-2xl" />
            </div>

            <div className="relative z-10 flex flex-col flex-1">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-xl bg-[#2e5023] flex items-center justify-center shadow-md shadow-[#2e5023]/20">
                  <Crown className="w-5 h-5 text-white" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-[#2e5023] uppercase tracking-wider block">Pro Plan</span>
                  <span className="text-lg font-extrabold text-[#1c1f1a]">Pro</span>
                </div>
              </div>

              {/* Duration selector */}
              <div className="flex bg-[#f4f7f2] rounded-xl p-1 mb-6 border border-[#e2e6dc]">
                {PRO_PLANS.map((p, i) => (
                  <button
                    key={p.months}
                    onClick={() => setSelected(i)}
                    className={`flex-1 relative py-2.5 min-h-[44px] text-xs font-bold rounded-lg transition-all ${
                      selected === i
                        ? "bg-[#4f7942] text-white shadow-md"
                        : "text-[#565c52] hover:text-[#1c1f1a]"
                    }`}
                  >
                    {p.label}
                    {p.badge && (
                      <span className={`absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 text-[9px] font-bold rounded-full whitespace-nowrap ${
                        selected === i ? "bg-amber-400 text-amber-900" : "bg-amber-100 text-amber-600 border border-amber-200"
                      }`}>
                        {p.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Price display */}
              <div className="mb-6">
                <div className="flex items-baseline gap-2">
                  <p className="text-[40px] font-extrabold text-[#1c1f1a] leading-none">Rs. {plan.price.toLocaleString()}</p>
                </div>
                <p className="text-sm text-[#565c52] mt-1">
                  Rs. {plan.perMonth}/month
                  {plan.save > 0 && (
                    <span className="ml-2 text-[#2e5023] font-bold">· Save Rs. {plan.save}</span>
                  )}
                </p>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {["Unlimited Skill Maps", "15 Nodes / map", "Unlimited sessions", "Unlimited Rooms", "5 Publish requests / mo", "PDF Export"].map((t) => (
                  <li key={t} className="flex items-start gap-2.5 text-sm text-[#3d4a38] font-medium">
                    <Check className="w-4 h-4 text-[#2e5023] mt-0.5 flex-shrink-0" />{t}
                  </li>
                ))}
              </ul>

              <Link to="/signup"
                className="group relative block text-center py-3.5 min-h-[44px] text-[15px] font-bold rounded-xl overflow-hidden bg-gradient-to-r from-[#2e5023] via-[#3d6b30] to-[#4f7942] text-white shadow-lg shadow-[#2e5023]/25 hover:shadow-xl hover:shadow-[#2e5023]/30 transition-all"
              >
                <span className="absolute inset-0 bg-gradient-to-t from-transparent via-white/[0.08] to-white/[0.15] pointer-events-none" />
                <span className="relative z-10">Get Pro · {plan.label}</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Comparison table */}
        <div className="rounded-2xl border border-[#e2e6dc] overflow-hidden bg-white">
          <div className="grid grid-cols-3 bg-[#edf5e9] px-6 py-4 border-b border-[#d4e8cc]">
            <span className="text-[11px] font-bold text-[#4f7942] uppercase tracking-wider">Feature</span>
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider text-center">Free</span>
            <span className="text-[11px] font-bold text-[#2e5023] uppercase tracking-wider text-center flex items-center justify-center gap-1.5"><Crown className="w-3.5 h-3.5 text-[#2e5023]" /> Pro</span>
          </div>
          {[
            { name: "Skill Maps", free: "3", pro: "Unlimited" },
            { name: "Nodes per Map", free: "5", pro: "15" },
            { name: "Sessions per Node", free: "5", pro: "Unlimited" },
            { name: "Rooms", free: "1", pro: "Unlimited" },
            { name: "Room Members", free: "3", pro: "Unlimited" },
            { name: "Publish Requests / mo", free: "1", pro: "5" },
            { name: "PDF Export", free: false, pro: true },
          ].map((row, i) => (
            <div key={row.name} className={`grid grid-cols-3 px-6 py-4 items-center border-b border-[#e2e6dc] last:border-0 ${i % 2 === 0 ? "bg-white" : "bg-[#f8faf6]"}`}>
              <span className="text-sm font-medium text-[#1c1f1a]">{row.name}</span>
              <span className="text-center">
                {typeof row.free === "boolean"
                  ? row.free ? <Check className="w-5 h-5 text-gray-400 mx-auto" /> : <X className="w-5 h-5 text-red-400 mx-auto" />
                  : <span className="inline-block px-3 py-0.5 rounded-full bg-gray-100 text-sm text-gray-500 font-medium">{row.free}</span>}
              </span>
              <span className="text-center">
                {typeof row.pro === "boolean"
                  ? row.pro ? <Check className="w-5 h-5 text-[#2e5023] mx-auto" /> : <X className="w-5 h-5 text-red-400 mx-auto" />
                  : <span className="inline-block px-3 py-0.5 rounded-full bg-[#edf5e9] text-sm text-[#2e5023] font-bold border border-[#d4e8cc]">{row.pro}</span>}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const [winners, setWinners] = useState([]);

  useEffect(() => {
    axios.get(`${API_BASE}/subscription/rewards/latest`)
      .then((r) => setWinners(r.data.rewards || []))
      .catch(() => {});
  }, []);

  return (
    <div className="w-full">

      {/* ━━━━ HERO ━━━━ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#edf5e9] via-white to-[#f4f7f2]">
        {/* Left decorative leaves — big and bold */}
        <LeafDecoration className="absolute -left-10 -top-10 w-[650px] h-[650px] sm:w-[800px] sm:h-[800px] lg:w-[900px] lg:h-[900px] pointer-events-none opacity-30 md:opacity-100" />

        {/* Subtle bottom-right glow */}
        <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full bg-[#a3c99a] opacity-10 blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-5 py-16 sm:py-20 md:py-28 flex flex-col md:flex-row items-center">
          {/* Left spacer — takes up space where the leaves are on desktop */}
          <div className="hidden md:block md:w-[45%] lg:w-1/2" />

          {/* Content — centered on mobile, pushed right on desktop */}
          <div className="w-full md:w-[55%] lg:w-1/2 md:pl-10 lg:pl-20 text-center md:text-left">
            <h1 className="font-[var(--font-display)] text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#1c1f1a] leading-tight mb-3">
              Learn with<br className="hidden sm:block" /> structure.
            </h1>
            <p className="text-[#2e5023] font-semibold text-base sm:text-lg md:text-xl mb-4 sm:mb-5">
              Your personal skill-building companion
            </p>
            <p className="text-[#565c52] text-sm sm:text-[15px] leading-relaxed max-w-lg mb-6 mx-auto md:mx-0">
              Turn big goals into step-by-step skill maps. Track practice with timers, build daily streaks, earn XP, and compete on the weekly leaderboard. Learn solo or invite friends into shared rooms.
            </p>
            <Link
              to="/signup"
              className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-7 py-3 bg-[#2e5023] text-white text-sm font-semibold rounded-lg hover:bg-[#4f7942] transition-colors shadow-md min-h-[44px]"
            >
              GET STARTED
            </Link>
          </div>
        </div>
      </section>

      {/* ━━━━ FEATURES ━━━━ */}
      {/* ━━━━ FEATURES — auto-swipe carousel ━━━━ */}
      <FeatureCarousel />

      {/* ━━━━ PRICING ━━━━ */}
      <PricingSection />

      {/* ━━━━ WEEKLY REWARDS ━━━━ */}
      <section className="relative bg-gradient-to-br from-[#edf5e9] via-[#f4f7f2] to-white border-t border-[#e2e6dc] overflow-hidden">
        {/* Background decoration */}
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-[#a3c99a] opacity-[0.08] blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-[#4f7942] opacity-[0.06] blur-3xl pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-5 py-20">
          {/* Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 px-4 py-1.5 rounded-full text-sm font-bold mb-5">
              <Trophy className="w-4 h-4" /> Weekly Rewards
            </div>
            <h2 className="font-[var(--font-display)] text-2xl sm:text-3xl font-bold text-[#1c1f1a] mb-3">Earn XP. Win free Pro.</h2>
            <p className="text-sm text-[#565c52] max-w-md mx-auto leading-relaxed">
              Every Sunday, the top 3 XP earners win free Pro subscriptions. Practice more, climb higher, win bigger.
            </p>
          </div>

          {/* Podium */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-end justify-center gap-4 mb-14">
            {/* 2nd place */}
            <div className="w-full sm:w-56 text-center bg-white rounded-2xl border border-gray-200 p-6 order-2 sm:order-1 min-h-[200px] sm:min-h-0">
              <Award className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-xl font-extrabold text-[#1c1f1a]">2nd</p>
              <p className="text-sm text-[#565c52] font-semibold mt-1 mb-4">3 months Pro</p>
              <div className="h-14 sm:h-20 bg-gray-50 rounded-lg flex items-end justify-center">
                <div className="w-14 h-10 sm:h-14 bg-gradient-to-t from-gray-300 to-gray-200 rounded-t-md" />
              </div>
            </div>

            {/* 1st place */}
            <div className="w-full sm:w-64 text-center bg-gradient-to-b from-amber-50 to-white rounded-2xl border-2 border-amber-300 p-7 shadow-lg order-1 sm:order-2 min-h-[220px] sm:min-h-0">
              <Crown className="w-10 h-10 text-amber-500 mx-auto mb-2" />
              <p className="text-2xl font-extrabold text-[#1c1f1a]">1st</p>
              <p className="text-base font-bold text-amber-700 mt-1 mb-4">6 months Pro</p>
              <div className="h-20 sm:h-28 bg-amber-50 rounded-lg flex items-end justify-center">
                <div className="w-16 h-16 sm:h-[5.5rem] bg-gradient-to-t from-amber-400 to-amber-300 rounded-t-md" />
              </div>
            </div>

            {/* 3rd place */}
            <div className="w-full sm:w-56 text-center bg-white rounded-2xl border border-orange-200 p-6 order-3 min-h-[200px] sm:min-h-0">
              <Award className="w-8 h-8 text-orange-400 mx-auto mb-2" />
              <p className="text-xl font-extrabold text-[#1c1f1a]">3rd</p>
              <p className="text-sm text-[#565c52] font-semibold mt-1 mb-4">1 month Pro</p>
              <div className="h-10 sm:h-14 bg-orange-50 rounded-lg flex items-end justify-center">
                <div className="w-14 h-7 sm:h-10 bg-gradient-to-t from-orange-300 to-orange-200 rounded-t-md" />
              </div>
            </div>
          </div>

          {/* How it works */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {[
              { icon: Sparkles, color: "text-violet-500", bg: "bg-violet-100", cardBg: "bg-violet-50", border: "border-violet-200", t: "Earn XP", d: "Log practice, complete skill map nodes, and write reflections. Every action earns you XP." },
              { icon: BarChart3, color: "text-blue-500", bg: "bg-blue-100", cardBg: "bg-blue-50", border: "border-blue-200", t: "Climb the board", d: "Weekly XP resets every Sunday at midnight. Compete for the top 3 spots." },
              { icon: Gift, color: "text-emerald-500", bg: "bg-emerald-100", cardBg: "bg-emerald-50", border: "border-emerald-200", t: "Win Pro free", d: "Top 3 earners get free Pro subscriptions. Rewards stack on your existing plan." },
            ].map((s) => {
              const StepIcon = s.icon;
              return (
                <div key={s.t} className={`${s.cardBg} border ${s.border} rounded-2xl p-6 text-center`}>
                  <div className="flex items-center justify-center mb-4">
                    <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center`}>
                      <StepIcon className={`w-5 h-5 ${s.color}`} />
                    </div>
                  </div>
                  <p className="text-base font-bold text-[#1c1f1a] mb-1.5">{s.t}</p>
                  <p className="text-sm text-[#565c52] leading-relaxed">{s.d}</p>
                </div>
              );
            })}
          </div>

          {/* Last week's winners */}
          {winners.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#e2e6dc] overflow-hidden">
              <div className="flex items-center gap-3 px-8 py-5 border-b border-[#e2e6dc] bg-[#f8faf6]">
                <Trophy className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-bold text-[#1c1f1a]">Last week's winners</h3>
              </div>
              <div className="divide-y divide-[#e2e6dc]">
                {winners.map((r) => (
                  <div key={r._id} className="flex items-center gap-4 py-4 px-8">
                    <span className="text-2xl flex-shrink-0 w-8 text-center">{MEDALS[r.rank]}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[#1c1f1a] truncate">{r.userName}</p>
                      {r.userEmail && (
                        <p className="text-xs text-[#9aa094] truncate">{r.userEmail}</p>
                      )}
                      <p className="text-xs text-[#9aa094]">{r.weeklyXp.toLocaleString()} XP</p>
                    </div>
                    <span className="text-xs font-bold text-[#2e5023] bg-[#edf5e9] px-3 py-1.5 rounded-full border border-[#d4e8cc] flex-shrink-0">
                      {r.rewardLabel} Pro
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ━━━━ BOTTOM CTA ━━━━ */}
      <section className="relative overflow-hidden bg-[#4f7942] text-white">
        <div className="absolute -right-10 -bottom-10 w-40 h-40 rounded-full bg-[#4f7942] opacity-15 blur-2xl pointer-events-none" />
        <div className="absolute -left-10 -top-10 w-28 h-28 rounded-full bg-[#a3c99a] opacity-10 blur-2xl pointer-events-none" />

        <div className="relative max-w-lg mx-auto px-5 py-10 text-center">
          <h2 className="font-[var(--font-display)] text-lg font-bold mb-1.5">Start mapping your goals</h2>
          <p className="text-sm text-white/50 mb-5">Join learners building real skills every day.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/signup" className="px-5 py-2.5 bg-white text-[#2e5023] text-sm font-semibold rounded-lg hover:bg-[#a3c99a] transition-colors">
              Create an account
            </Link>
            <Link to="/contact" className="px-5 py-2.5 text-sm font-medium text-white/60 border border-white/15 rounded-lg hover:bg-white/10 transition-colors">
              Contact us
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
