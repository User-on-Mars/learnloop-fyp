/**
 * HeroSection Component Demo
 * 
 * This file demonstrates various usage patterns for the HeroSection component.
 * Use these examples as a reference when implementing hero sections across pages.
 */

import HeroSection from '../HeroSection';
import { 
  LayoutDashboard, 
  Play, 
  Users, 
  Zap, 
  TrendingUp, 
  Flame, 
  Trophy,
  Target,
  Award,
  BookOpen,
  MessageSquare
} from 'lucide-react';

// Example 1: Dashboard Hero (4-column stats)
export function DashboardHeroExample() {
  const stats = [
    { icon: Zap, label: 'Total XP', value: '12,450', color: '#f59e0b', bg: 'bg-amber-100' },
    { icon: TrendingUp, label: 'Weekly XP', value: '850', color: '#10b981', bg: 'bg-emerald-100' },
    { icon: Flame, label: 'Streak', value: '7d', color: '#ef4444', bg: 'bg-red-100' },
    { icon: Trophy, label: 'League', value: 'Gold', color: '#8b5cf6', bg: 'bg-purple-100' },
  ];

  const actions = [
    { 
      label: 'Log Practice', 
      icon: Play, 
      onClick: () => console.log('Navigate to log practice'), 
      variant: 'primary' 
    },
    { 
      label: 'RoomSpace', 
      icon: Users, 
      onClick: () => console.log('Navigate to roomspace'), 
      variant: 'secondary' 
    },
  ];

  return (
    <HeroSection
      title="Good morning, Learner"
      subtitle="Your Learning Dashboard"
      description="Here's your learning overview. Track progress, review sessions, and keep building your skills."
      icon={LayoutDashboard}
      gradientFrom="sky-50"
      gradientVia="white"
      gradientTo="blue-50"
      borderColor="sky-100"
      iconGradientFrom="sky-600"
      iconGradientTo="blue-600"
      subtitleColor="sky-600"
      decorColor1="sky-200"
      decorColor2="blue-200"
      actions={actions}
      stats={stats}
      statsColumns="grid-cols-2 sm:grid-cols-4"
    />
  );
}

// Example 2: Leaderboard Hero (5-column stats)
export function LeaderboardHeroExample() {
  const stats = [
    { icon: Zap, label: 'Total XP', value: '12,450', color: '#f59e0b', bg: 'bg-amber-100' },
    { icon: TrendingUp, label: 'Weekly XP', value: '850', color: '#10b981', bg: 'bg-emerald-100' },
    { icon: Flame, label: 'Streak', value: '7d', color: '#ef4444', bg: 'bg-red-100' },
    { icon: Trophy, label: 'League', value: 'Gold', color: '#8b5cf6', bg: 'bg-purple-100' },
    { icon: Target, label: 'Rank', value: '#42', color: '#3b82f6', bg: 'bg-blue-100' },
  ];

  return (
    <HeroSection
      title="Leaderboard"
      subtitle="Compete & Climb"
      description="See how you stack up against other learners. Earn XP, maintain streaks, and climb the ranks!"
      icon={Trophy}
      gradientFrom="amber-50/50"
      gradientVia="[#f8faf6]"
      gradientTo="orange-50/30"
      borderColor="[#e2e6dc]"
      iconGradientFrom="amber-600"
      iconGradientTo="orange-600"
      subtitleColor="amber-600"
      decorColor1="amber-100/30"
      decorColor2="orange-100/20"
      stats={stats}
      statsColumns="grid-cols-2 sm:grid-cols-5"
    />
  );
}

// Example 3: LogPractice Hero (3-column stats)
export function LogPracticeHeroExample() {
  const stats = [
    { icon: Target, label: 'Today', value: '45min', color: '#f59e0b', bg: 'bg-amber-100' },
    { icon: TrendingUp, label: 'This Week', value: '3h 20m', color: '#10b981', bg: 'bg-emerald-100' },
    { icon: Flame, label: 'Streak', value: '7d', color: '#ef4444', bg: 'bg-red-100' },
  ];

  const actions = [
    { 
      label: 'Start Session', 
      icon: Play, 
      onClick: () => console.log('Start new session'), 
      variant: 'primary' 
    },
  ];

  return (
    <HeroSection
      title="Practice Sessions"
      subtitle="Track Your Learning"
      description="Log your practice sessions and track your progress across all skills."
      icon={Play}
      gradientFrom="orange-50"
      gradientVia="white"
      gradientTo="amber-50"
      borderColor="orange-100"
      iconGradientFrom="orange-600"
      iconGradientTo="amber-600"
      subtitleColor="orange-600"
      decorColor1="orange-200"
      decorColor2="amber-200"
      actions={actions}
      stats={stats}
      statsColumns="grid-cols-1 sm:grid-cols-3"
    />
  );
}

// Example 4: ReflectPage Hero (3-column stats)
export function ReflectPageHeroExample() {
  const stats = [
    { icon: MessageSquare, label: 'Total', value: '24', color: '#10b981', bg: 'bg-emerald-100' },
    { icon: Award, label: 'This Week', value: '5', color: '#3b82f6', bg: 'bg-blue-100' },
    { icon: TrendingUp, label: 'Streak', value: '3d', color: '#f59e0b', bg: 'bg-amber-100' },
  ];

  const actions = [
    { 
      label: 'New Reflection', 
      icon: MessageSquare, 
      onClick: () => console.log('Open reflection modal'), 
      variant: 'primary' 
    },
  ];

  return (
    <HeroSection
      title="Reflections"
      subtitle="Journal Your Learning"
      description="Capture insights, track your mood, and reflect on your learning journey."
      icon={MessageSquare}
      gradientFrom="emerald-50"
      gradientVia="white"
      gradientTo="teal-50"
      borderColor="emerald-100"
      iconGradientFrom="emerald-600"
      iconGradientTo="teal-600"
      subtitleColor="emerald-600"
      decorColor1="emerald-200"
      decorColor2="teal-200"
      actions={actions}
      stats={stats}
      statsColumns="grid-cols-1 sm:grid-cols-3"
    />
  );
}

// Example 5: RoomSpace Hero (3-column stats)
export function RoomSpaceHeroExample() {
  const stats = [
    { icon: Users, label: 'My Rooms', value: '3', color: '#ec4899', bg: 'bg-pink-100' },
    { icon: Target, label: 'Active', value: '2', color: '#10b981', bg: 'bg-emerald-100' },
    { icon: Award, label: 'Completed', value: '12', color: '#8b5cf6', bg: 'bg-purple-100' },
  ];

  const actions = [
    { 
      label: 'Create Room', 
      icon: Users, 
      onClick: () => console.log('Open create room modal'), 
      variant: 'primary' 
    },
    { 
      label: 'Browse Rooms', 
      icon: BookOpen, 
      onClick: () => console.log('Browse rooms'), 
      variant: 'secondary' 
    },
  ];

  return (
    <HeroSection
      title="RoomSpace"
      subtitle="Collaborative Learning"
      description="Join or create learning rooms to collaborate with others and track group progress."
      icon={Users}
      gradientFrom="pink-50"
      gradientVia="white"
      gradientTo="rose-50"
      borderColor="pink-100"
      iconGradientFrom="pink-600"
      iconGradientTo="rose-600"
      subtitleColor="pink-600"
      decorColor1="pink-200"
      decorColor2="rose-200"
      actions={actions}
      stats={stats}
      statsColumns="grid-cols-1 sm:grid-cols-3"
    />
  );
}

// Example 6: Minimal Hero (no stats, no actions)
export function MinimalHeroExample() {
  return (
    <HeroSection
      title="Profile Settings"
      subtitle="Manage Your Account"
      description="Update your profile information, preferences, and account settings."
      icon={Users}
      gradientFrom="rose-50"
      gradientVia="white"
      gradientTo="pink-50"
      borderColor="rose-100"
      iconGradientFrom="rose-600"
      iconGradientTo="pink-600"
      subtitleColor="rose-600"
      decorColor1="rose-200"
      decorColor2="pink-200"
    />
  );
}

// Example 7: Hero with Extra Content
export function HeroWithExtraContentExample() {
  const stats = [
    { icon: Zap, label: 'Total XP', value: '12,450', color: '#f59e0b', bg: 'bg-amber-100' },
    { icon: Flame, label: 'Streak', value: '7d', color: '#ef4444', bg: 'bg-red-100' },
  ];

  const extraContent = (
    <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-sky-100">
      <p className="text-sm text-[#565c52]">
        <strong>Pro Tip:</strong> Complete daily practice to maintain your streak and earn bonus XP!
      </p>
    </div>
  );

  return (
    <HeroSection
      title="Dashboard"
      subtitle="Your Progress"
      description="Track your learning journey and stay motivated."
      icon={LayoutDashboard}
      gradientFrom="sky-50"
      gradientVia="white"
      gradientTo="blue-50"
      borderColor="sky-100"
      iconGradientFrom="sky-600"
      iconGradientTo="blue-600"
      subtitleColor="sky-600"
      decorColor1="sky-200"
      decorColor2="blue-200"
      stats={stats}
      statsColumns="grid-cols-1 sm:grid-cols-2"
      extraContent={extraContent}
    />
  );
}

// Example 8: Mobile-First 2-Column Stats
export function MobileOptimizedHeroExample() {
  const stats = [
    { icon: Zap, label: 'XP', value: '1,250', color: '#f59e0b', bg: 'bg-amber-100' },
    { icon: Flame, label: 'Streak', value: '7d', color: '#ef4444', bg: 'bg-red-100' },
  ];

  return (
    <HeroSection
      title="Quick Stats"
      subtitle="At a Glance"
      icon={Target}
      gradientFrom="sky-50"
      gradientVia="white"
      gradientTo="blue-50"
      borderColor="sky-100"
      iconGradientFrom="sky-600"
      iconGradientTo="blue-600"
      subtitleColor="sky-600"
      decorColor1="sky-200"
      decorColor2="blue-200"
      stats={stats}
      statsColumns="grid-cols-2"
    />
  );
}
