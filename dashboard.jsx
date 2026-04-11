import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, Upload, Brain, BarChart3, ArrowRight, Flame, Star, Trophy, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StatsRow from '@/components/dashboard/StatsRow';
import RecentSubmissions from '@/components/dashboard/RecentSubmissions';
import StreakNotification from '@/components/dashboard/StreakNotification';
import LevelXPBar, { calcLevelInfo, getLeague } from '@/components/shared/LevelXPBar';

const quickActions = [
  {
    label: 'Upload Notes',
    desc: 'Generate a quiz from your notes',
    icon: Upload,
    to: '/quiz',
    gradient: 'from-violet-500 to-purple-700',
    shadow: 'shadow-purple-300/40',
  },
  {
    label: 'Quick Challenge',
    desc: 'Test any topic in 5 questions',
    icon: Zap,
    to: '/challenge',
    gradient: 'from-amber-400 to-orange-500',
    shadow: 'shadow-amber-300/40',
  },
  {
    label: 'Study Tools',
    desc: 'Key points, flashcards & more',
    icon: Brain,
    to: '/questions',
    gradient: 'from-cyan-400 to-blue-500',
    shadow: 'shadow-cyan-300/40',
  },
  {
    label: 'My Progress',
    desc: 'Track accuracy over time',
    icon: BarChart3,
    to: '/progress',
    gradient: 'from-emerald-400 to-teal-500',
    shadow: 'shadow-emerald-300/40',
  },
];

export default function Dashboard() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: submissions = [] } = useQuery({
    queryKey: ['mySubmissions'],
    queryFn: () => base44.entities.Submission.filter(
      { created_by: user?.email }, '-created_date', 100
    ),
    enabled: !!user?.email,
  });

  const { data: redemptions = [] } = useQuery({
    queryKey: ['myRedemptions'],
    queryFn: () => base44.entities.Redemption.filter({ created_by: user?.email }),
    enabled: !!user?.email,
  });

  const { level } = calcLevelInfo(submissions);
  const league = getLeague(level);

  const earned = submissions.filter(s => s.status === 'approved').reduce((a, s) => a + (s.points_awarded || 0), 0);
  const spent = redemptions.reduce((a, r) => a + (r.points_spent || 0), 0);
  const availablePoints = earned - spent;

  const displayName = user?.display_name?.split(' ')[0] || user?.full_name?.split(' ')[0] || 'Student';

  const lastActivity = submissions[0]?.created_date || null;
  const streak = user?.streak_count ?? 0;

  const pendingQuizzes = submissions.filter(s => s.quiz_score == null && s.status !== 'rejected').length;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-8">
      <StreakNotification streak={streak} lastActivity={lastActivity} />

      {/* Hero greeting */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="relative rounded-3xl overflow-hidden text-white p-7"
        style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 60%, #ec4899 100%)' }}
      >
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-8 -right-8 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute bottom-0 left-10 w-32 h-32 bg-pink-400/20 rounded-full blur-2xl" />
        </div>
        <div className="relative z-10">
          <p className="text-purple-200 text-xs font-bold uppercase tracking-widest mb-1">
            {league.emoji} {league.name} League · Lv.{level}
          </p>
          <h1 className="text-2xl font-black mb-1">
            Hey, {displayName}! 👋
          </h1>
          <p className="text-purple-200 text-sm mb-4">
            {submissions.length === 0
              ? 'Upload your first notes to get started.'
              : pendingQuizzes > 0
              ? `You have ${pendingQuizzes} quiz${pendingQuizzes > 1 ? 'zes' : ''} waiting to be taken!`
              : 'Keep the momentum going — great work!'}
          </p>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5 bg-white/15 rounded-full px-3 py-1.5">
              <Star className="w-3.5 h-3.5 text-amber-300" />
              <span className="text-sm font-black">{availablePoints.toLocaleString()} pts</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/15 rounded-full px-3 py-1.5">
              <Flame className="w-3.5 h-3.5 text-orange-300" />
              <span className="text-sm font-black">{streak} day streak</span>
            </div>
          </div>
          <div className="mt-4">
            <LevelXPBar submissions={submissions} dark />
          </div>
        </div>
      </motion.div>

      {/* Pending quiz banner */}
      {pendingQuizzes > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 border-2 border-amber-200 rounded-2xl px-5 py-4 flex items-center gap-4"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
            <Trophy className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-amber-800 text-sm">
              {pendingQuizzes} quiz{pendingQuizzes > 1 ? 'zes' : ''} ready to take!
            </p>
            <p className="text-amber-600 text-xs mt-0.5">Take them to earn points and track your progress.</p>
          </div>
          <Link to="/quiz">
            <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold shrink-0">
              Take Now <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </Link>
        </motion.div>
      )}

      {/* Stats */}
      <StatsRow submissions={submissions} streak={streak} />

      {/* Quick Actions */}
      <div>
        <h2 className="font-black text-foreground text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" /> Quick Actions
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickActions.map((action, i) => (
            <motion.div
              key={action.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.06 }}
            >
              <Link to={action.to}
                className="block bg-white rounded-2xl border border-border p-4 hover:shadow-lg hover:-translate-y-0.5 transition-all group">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center mb-3 shadow-md ${action.shadow}`}>
                  <action.icon className="w-5 h-5 text-white" />
                </div>
                <p className="font-black text-sm text-foreground group-hover:text-primary transition-colors">{action.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{action.desc}</p>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Recent Submissions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-black text-foreground text-sm uppercase tracking-wider flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-violet-500" /> Recent Activity
          </h2>
          {submissions.length > 5 && (
            <Link to="/storage" className="text-xs text-primary font-bold hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </div>
        <RecentSubmissions submissions={submissions} />
      </div>
    </div>
  );
}
