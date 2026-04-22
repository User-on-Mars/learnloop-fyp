import { Link } from "react-router-dom";
import { Heart, Compass, Users, Lightbulb, Target, Leaf } from "lucide-react";
import LogoMark from "../components/LogoMark";

export default function AboutPage() {
  return (
    <div className="w-full">

      {/* Hero */}
      <section className="bg-gradient-to-b from-[#edf5e9] to-white">
        <div className="max-w-3xl mx-auto px-5 pt-16 pb-12 text-center">
          <LogoMark size={48} className="mx-auto mb-5" />
          <h1 className="font-[var(--font-display)] text-3xl sm:text-4xl font-bold text-[#1c1f1a] tracking-tight mb-3">
            About LearnLoop
          </h1>
          <p className="text-base text-[#565c52] leading-relaxed max-w-xl mx-auto">
            We believe learning works best when it's visible, structured, and yours. No noisy feeds — just your path, your practice, and honest reflection.
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="max-w-3xl mx-auto px-5 py-14">
        <div className="flex flex-col md:flex-row gap-10">
          <div className="md:w-1/2">
            <div className="w-11 h-11 rounded-xl bg-[#edf5e9] flex items-center justify-center mb-4">
              <Lightbulb className="w-5 h-5 text-[#2e5023]" />
            </div>
            <h2 className="text-xl font-bold text-[#1c1f1a] mb-3">Why we built it</h2>
            <p className="text-sm text-[#565c52] leading-relaxed mb-3">
              Most tools optimize for engagement metrics. We wanted something quieter — a place to map what you're trying to learn, show up for short sessions, and see the next step unlock.
            </p>
            <p className="text-sm text-[#565c52] leading-relaxed">
              LearnLoop is for students, self-taught builders, and anyone who learns in the real world — not only in a classroom. We built it because we needed it ourselves.
            </p>
          </div>
          <div className="md:w-1/2">
            <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center mb-4">
              <Target className="w-5 h-5 text-amber-500" />
            </div>
            <h2 className="text-xl font-bold text-[#1c1f1a] mb-3">What we're building</h2>
            <p className="text-sm text-[#565c52] leading-relaxed mb-3">
              A structured practice system. You create skill maps, log timed sessions, write reflections, and track your growth with XP and streaks. You can learn solo or invite friends into shared rooms.
            </p>
            <p className="text-sm text-[#565c52] leading-relaxed">
              Every week, the top learners on the leaderboard win free Pro subscriptions. It's learning with just enough gamification to keep you going — without turning it into a game.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-[#f4f7f2] border-t border-[#e2e6dc]">
        <div className="max-w-3xl mx-auto px-5 py-14">
          <h2 className="text-xl font-bold text-[#1c1f1a] text-center mb-10">What we care about</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: Compass, color: "text-[#2e5023]", bg: "bg-[#edf5e9]", cardBg: "bg-white", border: "border-[#e2e6dc]", title: "Clarity", desc: "One map, one direction. You always know what's next and where you stand." },
              { icon: Heart, color: "text-rose-500", bg: "bg-rose-50", cardBg: "bg-white", border: "border-[#e2e6dc]", title: "Reflection", desc: "Understanding how you felt and what blocked you matters as much as checking boxes." },
              { icon: Leaf, color: "text-emerald-500", bg: "bg-emerald-50", cardBg: "bg-white", border: "border-[#e2e6dc]", title: "Your pace", desc: "No streak shaming. Progress is allowed to be uneven. Show up when you can." },
            ].map((v) => {
              const Icon = v.icon;
              return (
                <div key={v.title} className={`${v.cardBg} border ${v.border} rounded-2xl p-6 text-center`}>
                  <div className={`w-10 h-10 rounded-lg ${v.bg} flex items-center justify-center mx-auto mb-3`}>
                    <Icon className={`w-5 h-5 ${v.color}`} />
                  </div>
                  <h3 className="text-base font-bold text-[#1c1f1a] mb-1.5">{v.title}</h3>
                  <p className="text-sm text-[#565c52] leading-relaxed">{v.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-white border-t border-[#e2e6dc]">
        <div className="max-w-lg mx-auto px-5 py-12 text-center">
          <p className="text-sm text-[#565c52] mb-4">Questions, feedback, or just want to say hi?</p>
          <Link to="/contact" className="inline-block px-6 py-2.5 bg-[#2e5023] text-white text-sm font-semibold rounded-lg hover:bg-[#4f7942] transition-colors">
            Contact us
          </Link>
        </div>
      </section>
    </div>
  );
}
