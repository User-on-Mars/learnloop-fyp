import { Link } from "react-router-dom";
import {
  Map, Clock, BookOpen, Users, Trophy, Flame,
  BarChart3, Crown, Lock, Zap, Target, ArrowRight,
} from "lucide-react";

export default function FeaturesPage() {
  return (
    <div className="w-full">

      {/* Hero */}
      <section className="bg-gradient-to-b from-[#edf5e9] to-white">
        <div className="max-w-3xl mx-auto px-5 pt-16 pb-12 text-center">
          <h1 className="font-[var(--font-display)] text-3xl sm:text-4xl font-bold text-[#1c1f1a] tracking-tight mb-3">
            Built for how you actually learn
          </h1>
          <p className="text-base text-[#565c52] leading-relaxed max-w-xl mx-auto">
            LearnLoop isn't another to-do app. It's a structured practice system — designed around skill maps, timed sessions, reflections, and real accountability.
          </p>
        </div>
      </section>

      {/* Feature sections — alternating layout */}
      <section className="max-w-5xl mx-auto px-5 py-16 space-y-20">

        {/* 1. Skill Maps */}
        <div className="flex flex-col md:flex-row items-center gap-10">
          <div className="md:w-1/2">
            <div className="w-11 h-11 rounded-xl bg-[#edf5e9] flex items-center justify-center mb-4">
              <Map className="w-5 h-5 text-[#2e5023]" />
            </div>
            <h2 className="text-xl font-bold text-[#1c1f1a] mb-2">Visual skill maps</h2>
            <p className="text-sm text-[#565c52] leading-relaxed mb-3">
              Every skill starts as a map — a series of nodes from start to goal. You decide the steps, name each node, and work through them in order. Completed nodes show checkmarks, locked ones show what's next.
            </p>
            <p className="text-sm text-[#565c52] leading-relaxed">
              It's like a roadmap you build yourself. Whether it's learning guitar chords, mastering React, or studying for exams — you see the full picture and your place in it.
            </p>
          </div>
          <div className="md:w-1/2">
            <div className="bg-[#f4f7f2] rounded-2xl border border-[#e2e6dc] p-8 flex items-center justify-center">
              <svg className="w-full max-w-[280px] h-auto" viewBox="0 0 280 160" fill="none">
                <path d="M40 130 Q80 80,140 90 Q200 100,180 50 Q160 10,240 30" stroke="#a3c99a" strokeWidth="3" strokeDasharray="8 5" fill="none"/>
                <circle cx="40" cy="130" r="14" fill="#a3c99a" opacity="0.2"/><circle cx="40" cy="130" r="8" fill="#4f7942"/>
                <path d="M37 130 L39 132 L43 128" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="140" cy="90" r="14" fill="#a3c99a" opacity="0.2"/><circle cx="140" cy="90" r="8" fill="#4f7942"/>
                <path d="M137 90 L139 92 L143 88" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="180" cy="50" r="14" fill="#e2e6dc" opacity="0.5"/><circle cx="180" cy="50" r="8" fill="#c8cec0"/>
                <Lock className="w-3 h-3" x="176" y="46" />
                <circle cx="240" cy="30" r="14" fill="#e2e6dc" opacity="0.3"/><circle cx="240" cy="30" r="8" fill="#c8cec0" opacity="0.6"/>
              </svg>
            </div>
          </div>
        </div>

        {/* 2. Timed Practice */}
        <div className="flex flex-col md:flex-row-reverse items-center gap-10">
          <div className="md:w-1/2">
            <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
              <Clock className="w-5 h-5 text-blue-500" />
            </div>
            <h2 className="text-xl font-bold text-[#1c1f1a] mb-2">Timed practice sessions</h2>
            <p className="text-sm text-[#565c52] leading-relaxed mb-3">
              Open any node and start a timer. Practice for as long as you want — the timer tracks it all. Pause when you need a break, resume when you're ready. When you're done, your time is logged automatically.
            </p>
            <p className="text-sm text-[#565c52] leading-relaxed">
              You can also set countdown timers for focused bursts. Every session feeds into your daily stats, weekly summary, and XP earnings.
            </p>
          </div>
          <div className="md:w-1/2">
            <div className="bg-blue-50 rounded-2xl border border-blue-100 p-8 flex items-center justify-center">
              <svg className="w-40 h-40" viewBox="0 0 120 120" fill="none">
                <circle cx="60" cy="60" r="48" stroke="#93c5fd" strokeWidth="4" fill="white"/>
                <circle cx="60" cy="60" r="42" stroke="#bfdbfe" strokeWidth="1" fill="white"/>
                {[0,30,60,90,120,150,180,210,240,270,300,330].map(d=><line key={d} x1="60" y1="20" x2="60" y2="24" stroke="#93c5fd" strokeWidth="2" strokeLinecap="round" transform={`rotate(${d} 60 60)`}/>)}
                <line x1="60" y1="60" x2="60" y2="32" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round"/>
                <line x1="60" y1="60" x2="80" y2="52" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round"/>
                <circle cx="60" cy="60" r="4" fill="#3b82f6"/>
                <rect x="56" y="8" width="8" height="7" rx="2.5" fill="#93c5fd"/>
              </svg>
            </div>
          </div>
        </div>

        {/* 3. Reflections */}
        <div className="flex flex-col md:flex-row items-center gap-10">
          <div className="md:w-1/2">
            <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center mb-4">
              <BookOpen className="w-5 h-5 text-amber-500" />
            </div>
            <h2 className="text-xl font-bold text-[#1c1f1a] mb-2">Reflections after every session</h2>
            <p className="text-sm text-[#565c52] leading-relaxed mb-3">
              After you finish practicing, write a quick reflection. What went well? What blocked you? What will you try differently next time? These notes build up over time into a personal learning journal.
            </p>
            <p className="text-sm text-[#565c52] leading-relaxed">
              Reflections are tied to specific nodes, so when you revisit a topic you can see exactly what you thought last time. Patterns emerge. Growth becomes visible.
            </p>
          </div>
          <div className="md:w-1/2">
            <div className="bg-amber-50 rounded-2xl border border-amber-100 p-8 flex items-center justify-center">
              <svg className="w-36 h-36" viewBox="0 0 100 100" fill="none">
                <rect x="18" y="12" width="64" height="76" rx="5" fill="white" stroke="#fbbf24" strokeWidth="2"/>
                <line x1="30" y1="12" x2="30" y2="88" stroke="#fbbf24" strokeWidth="1" opacity="0.3"/>
                <line x1="36" y1="26" x2="70" y2="26" stroke="#fcd34d" strokeWidth="3" strokeLinecap="round"/>
                <line x1="36" y1="36" x2="62" y2="36" stroke="#fcd34d" strokeWidth="3" strokeLinecap="round" opacity="0.7"/>
                <line x1="36" y1="46" x2="72" y2="46" stroke="#fcd34d" strokeWidth="3" strokeLinecap="round" opacity="0.5"/>
                <line x1="36" y1="56" x2="55" y2="56" stroke="#fcd34d" strokeWidth="3" strokeLinecap="round" opacity="0.3"/>
                <circle cx="74" cy="16" r="8" fill="#fef3c7" stroke="#fbbf24" strokeWidth="1.5"/>
                <line x1="74" y1="13" x2="74" y2="19" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="71" y1="16" x2="77" y2="16" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
          </div>
        </div>

        {/* 4. RoomSpace */}
        <div className="flex flex-col md:flex-row-reverse items-center gap-10">
          <div className="md:w-1/2">
            <div className="w-11 h-11 rounded-xl bg-pink-50 flex items-center justify-center mb-4">
              <Users className="w-5 h-5 text-pink-500" />
            </div>
            <h2 className="text-xl font-bold text-[#1c1f1a] mb-2">Learn together in RoomSpace</h2>
            <p className="text-sm text-[#565c52] leading-relaxed mb-3">
              Create a room, invite friends, and share skill maps. Everyone works through the same nodes at their own pace. You can see who's ahead, who's stuck, and keep each other motivated.
            </p>
            <p className="text-sm text-[#565c52] leading-relaxed">
              Rooms have their own XP ledger, streaks, and progress tracking. It's collaborative learning without the noise of a group chat.
            </p>
          </div>
          <div className="md:w-1/2">
            <div className="bg-pink-50 rounded-2xl border border-pink-100 p-8 flex items-center justify-center">
              <svg className="w-36 h-36" viewBox="0 0 100 100" fill="none">
                <rect x="10" y="22" width="80" height="56" rx="12" fill="white" stroke="#f9a8d4" strokeWidth="2"/>
                <circle cx="35" cy="45" r="10" fill="#fce7f3" stroke="#f9a8d4" strokeWidth="2"/>
                <circle cx="35" cy="43" r="4" fill="#f9a8d4"/>
                <path d="M27 58 Q35 52 43 58" fill="#fce7f3" stroke="#f9a8d4" strokeWidth="2"/>
                <circle cx="65" cy="45" r="10" fill="#fce7f3" stroke="#ec4899" strokeWidth="2" opacity="0.6"/>
                <circle cx="65" cy="43" r="4" fill="#ec4899" opacity="0.5"/>
                <path d="M57 58 Q65 52 73 58" fill="#fce7f3" stroke="#ec4899" strokeWidth="2" opacity="0.5"/>
                <line x1="45" y1="45" x2="55" y2="45" stroke="#f9a8d4" strokeWidth="2" strokeDasharray="4 3"/>
              </svg>
            </div>
          </div>
        </div>

        {/* 5. XP, Streaks & Leaderboard */}
        <div className="flex flex-col md:flex-row items-center gap-10">
          <div className="md:w-1/2">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center mb-4">
              <Trophy className="w-5 h-5 text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold text-[#1c1f1a] mb-2">XP, streaks & leaderboard</h2>
            <p className="text-sm text-[#565c52] leading-relaxed mb-3">
              Every action earns XP — logging practice, completing nodes, writing reflections. Keep a daily streak alive and your XP multiplier grows (1.5× at 5 days, 2× at 7+).
            </p>
            <p className="text-sm text-[#565c52] leading-relaxed">
              Compete on the weekly leaderboard. The top 3 XP earners each week win free Pro subscriptions — 6 months for 1st, 3 months for 2nd, 1 month for 3rd.
            </p>
          </div>
          <div className="md:w-1/2">
            <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-8 flex items-center justify-center">
              <svg className="w-36 h-36" viewBox="0 0 100 100" fill="none">
                <rect x="10" y="58" width="16" height="28" rx="4" fill="#6ee7b7" opacity="0.4"/>
                <rect x="30" y="42" width="16" height="44" rx="4" fill="#6ee7b7" opacity="0.6"/>
                <rect x="50" y="26" width="16" height="60" rx="4" fill="#10b981" opacity="0.8"/>
                <g transform="translate(70, 12)">
                  <path d="M5 0H17V16Q11 22 5 16Z" fill="#fbbf24"/>
                  <rect x="8" y="22" width="6" height="3" rx="1" fill="#fbbf24" opacity="0.7"/>
                  <rect x="6" y="25" width="10" height="3" rx="1" fill="#fbbf24" opacity="0.5"/>
                  <path d="M11 5L12.5 9 16 9.5 13.5 12 14 16 11 14.5 8 16 8.5 12 6 9.5 9.5 9Z" fill="white" opacity="0.7"/>
                </g>
                <text x="12" y="96" fontSize="12" fill="#10b981" fontWeight="800">+XP</text>
              </svg>
            </div>
          </div>
        </div>

        {/* 6. Weekly Summary */}
        <div className="flex flex-col md:flex-row-reverse items-center gap-10">
          <div className="md:w-1/2">
            <div className="w-11 h-11 rounded-xl bg-violet-50 flex items-center justify-center mb-4">
              <BarChart3 className="w-5 h-5 text-violet-500" />
            </div>
            <h2 className="text-xl font-bold text-[#1c1f1a] mb-2">Weekly summary & insights</h2>
            <p className="text-sm text-[#565c52] leading-relaxed mb-3">
              Every week you get a clear breakdown — total practice hours, sessions completed, reflections written, and how your XP compares to the previous week.
            </p>
            <p className="text-sm text-[#565c52] leading-relaxed">
              Spot trends in your learning. See which days you're most productive. Understand where your time actually goes. No guessing — just data.
            </p>
          </div>
          <div className="md:w-1/2">
            <div className="bg-violet-50 rounded-2xl border border-violet-100 p-8 flex items-center justify-center">
              <svg className="w-40 h-32" viewBox="0 0 160 100" fill="none">
                <rect x="10" y="10" width="140" height="80" rx="10" fill="white" stroke="#c4b5fd" strokeWidth="2"/>
                <rect x="22" y="55" width="14" height="24" rx="3" fill="#c4b5fd" opacity="0.4"/>
                <rect x="42" y="40" width="14" height="39" rx="3" fill="#c4b5fd" opacity="0.6"/>
                <rect x="62" y="28" width="14" height="51" rx="3" fill="#8b5cf6" opacity="0.7"/>
                <rect x="82" y="35" width="14" height="44" rx="3" fill="#c4b5fd" opacity="0.5"/>
                <rect x="102" y="22" width="14" height="57" rx="3" fill="#8b5cf6" opacity="0.8"/>
                <path d="M29 50 L49 36 L69 24 L89 31 L109 18" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
                <circle cx="69" cy="24" r="3" fill="#8b5cf6" opacity="0.5"/>
                <circle cx="109" cy="18" r="3" fill="#8b5cf6" opacity="0.5"/>
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* Pro upgrade nudge */}
      <section className="bg-[#f4f7f2] border-t border-[#e2e6dc]">
        <div className="max-w-3xl mx-auto px-5 py-12 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Crown className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-bold text-[#1c1f1a]">Want unlimited access?</h2>
          </div>
          <p className="text-sm text-[#565c52] mb-5 max-w-md mx-auto">
            Free accounts get 3 skill maps and 5 nodes each. Upgrade to Pro for unlimited maps, rooms, sessions, and PDF export.
          </p>
          <Link to="/signup" className="inline-block px-6 py-2.5 bg-[#2e5023] text-white text-sm font-semibold rounded-lg hover:bg-[#4f7942] transition-colors">
            Get started
          </Link>
        </div>
      </section>
    </div>
  );
}
