import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Upload, Brain, BarChart3, ArrowRight, Flame, Star, Trophy, CheckCircle2, X, Users, ShoppingBag, GraduationCap, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StreakNotification from '@/components/dashboard/StreakNotification';
import { calcLevelInfo } from '@/components/shared/LevelXPBar';
import LevelUpModal from '@/components/shared/LevelUpModal';
import { toast } from 'sonner';
import MiniCalendar from '@/pages/MiniCalendar';

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

const EXPLORE_FEATURES = [
  { label: 'Progress', icon: BarChart3, to: '/progress', color: 'text-emerald-500', bg: 'bg-emerald-50', desc: 'Track your accuracy & trends over time' },
  { label: 'Leaderboard', icon: Trophy, to: '/leaderboard', color: 'text-amber-500', bg: 'bg-amber-50', desc: 'See how you rank against other students' },
  { label: 'Shop', icon: ShoppingBag, to: '/shop', color: 'text-rose-500', bg: 'bg-rose-50', desc: 'Spend earned points on rewards' },
  { label: 'Friends', icon: Users, to: '/friends', color: 'text-blue-500', bg: 'bg-blue-50', desc: 'Add friends and see their activity' },
  { label: 'Classroom', icon: GraduationCap, to: '/classroom', color: 'text-violet-500', bg: 'bg-violet-50', desc: 'Join or create a study group' },
  { label: 'Flashcards', icon: BookOpen, to: '/storage', color: 'text-cyan-500', bg: 'bg-cyan-50', desc: 'Save and review your study cards' },
];

function GettingStarted({ submissions, streak, onDismiss }) {
  const NON_STUDY = new Set(['xp_boost', 'referral', 'points_pack', 'comeback_bonus']);
  const studySubs = submissions.filter(s => !NON_STUDY.has(s.type));
  const hasSubmitted = studySubs.length > 0;
  const hasTakenQuiz = submissions.some(s => s.quiz_score != null);
  const hasChallenged = submissions.some(s => s.type === 'challenge');
  const hasStreak3 = (streak ?? 0) >= 3;
  const hasShared = submissions.some(s => s.type === 'referral') ||
    (() => { try { return !!localStorage.getItem('intellix_shared_referral'); } catch { return false; } })();

  const tasks = [
    { label: 'Upload notes & take a quiz', desc: 'Turn your study materials into an AI-generated quiz', done: hasSubmitted && hasTakenQuiz, to: '/quiz', cta: 'Upload Notes', icon: Upload },
    { label: 'Try a Quick Challenge', desc: 'Test yourself on any topic in 60 seconds', done: hasChallenged, to: '/challenge', cta: 'Challenge', icon: Zap },
    { label: 'Explore Study Tools', desc: 'Flashcards, key concepts, vocab helpers & more', done: false, to: '/questions', cta: 'Explore', icon: Brain },
    { label: 'Build a 3-day streak', desc: 'Study 3 days in a row to earn bonus XP and badges', done: hasStreak3, to: '/quiz', cta: 'Study Now', icon: Flame },
    { label: 'Share with a friend', desc: 'Invite a friend and both of you earn bonus points', done: hasShared, to: '/profile', cta: 'Get Link', icon: Users },
  ];

  const doneCount = tasks.filter(t => t.done).length;
  if (doneCount === tasks.length) return null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
        className="rounded-2xl overflow-hidden border border-border shadow-sm">
        {/* Gradient header */}
        <div className="p-5 text-white" style={{ background: 'linear-gradient(135deg,#7c3aed 0%,#a855f7 60%,#ec4899 100%)' }}>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-black text-base">Welcome to Intellix!</h2>
              <p className="text-white/80 text-xs mt-0.5">Complete these steps to unlock everything — {doneCount}/{tasks.length} done</p>
            </div>
            <button onClick={onDismiss} className="p-1 rounded-lg hover:bg-white/10 transition-colors mt-0.5">
              <X className="w-4 h-4 text-white/70" />
            </button>
          </div>
          <div className="mt-3 h-1.5 bg-white/20 rounded-full overflow-hidden">
            <motion.div className="h-full rounded-full bg-white"
              initial={{ width: 0 }} animate={{ width: `${(doneCount / tasks.length) * 100}%` }} transition={{ duration: 0.6, ease: 'easeOut' }} />
          </div>
        </div>

        {/* Tasks */}
        <div className="bg-white p-4 space-y-2">
          {tasks.map((task) => (
            <div key={task.label}
              className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${task.done ? 'opacity-50' : 'bg-secondary/40 hover:bg-secondary/70'}`}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${task.done ? 'bg-emerald-100' : 'bg-primary/10'}`}>
                {task.done
                  ? <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500" />
                  : <task.icon className="w-4 h-4 text-primary" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-bold leading-tight ${task.done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{task.label}</p>
                {!task.done && <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{task.desc}</p>}
              </div>
              {!task.done && (
                <Link to={task.to} className="text-xs font-bold text-primary hover:underline shrink-0 whitespace-nowrap">
                  {task.cta} →
                </Link>
              )}
            </div>
          ))}

          {/* Feature discovery */}
          <div className="pt-3 border-t border-border mt-1">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Explore the App</p>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {EXPLORE_FEATURES.map(f => (
                <Link key={f.label} to={f.to}
                  className="group flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-secondary transition-colors text-center"
                  title={f.desc}>
                  <div className={`w-9 h-9 rounded-xl ${f.bg} flex items-center justify-center`}>
                    <f.icon className={`w-4 h-4 ${f.color}`} />
                  </div>
                  <span className="text-[10px] font-bold text-muted-foreground group-hover:text-foreground transition-colors">{f.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}


export default function Dashboard() {
  const [showChecklist, setShowChecklist] = useState(() => {
    try { return localStorage.getItem('intellix_checklist_dismissed') !== 'true'; } catch { return true; }
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: submissions = [], isSuccess: submissionsLoaded } = useQuery({
    queryKey: ['mySubmissions'],
    queryFn: () => base44.entities.Submission.filter(
      { created_by: user?.email }, '-created_date', 2000
    ),
    enabled: !!user?.email,
  });

  // Comeback bonus — check once per session
  useEffect(() => {
    if (!user?.email) return;
    const key = `intellix_comeback_checked_${new Date().toDateString()}`;
    try { if (localStorage.getItem(key)) return; } catch {}
    base44.notifications.checkComeback().then(r => {
      if (r?.bonus) {
        toast.success(`Welcome back! +${r.points} bonus points for returning 🎉`, { duration: 5000 });
        try { localStorage.setItem(key, '1'); } catch {}
      }
    }).catch(() => {});
  }, [user?.email]);

  const { level } = calcLevelInfo(submissions, user?.xp_bonus || 0);

  const earned = submissions.filter(s => s.status === 'approved').reduce((a, s) => a + (s.points_awarded || 0), 0);


  const NON_STREAK_TYPES = new Set(['xp_boost', 'referral', 'points_pack', 'comeback_bonus']);
  const studySubmissions = submissions.filter(s => !NON_STREAK_TYPES.has(s.type));
  const lastActivity = studySubmissions[0]?.created_date || null;
  const streak = user?.streak_count ?? 0;
  const today = new Date().toISOString().slice(0, 10);
  const lastActivityDay = lastActivity ? new Date(lastActivity).toISOString().slice(0, 10) : null;
  const streakAtRisk = streak > 0 && lastActivityDay !== today;

  const NON_QUIZ_TYPES = new Set(['xp_boost', 'referral', 'points_pack', 'comeback_bonus', 'video']);
  const pendingQuizzes = submissions.filter(s => !NON_QUIZ_TYPES.has(s.type) && s.quiz_score == null && s.status !== 'rejected').length;

  const statsSidebar = [
    { label: 'Points', value: earned.toLocaleString(), Icon: Star, color: 'text-amber-500', bg: 'bg-amber-50' },
    { label: 'Quizzes', value: submissions.filter(s => s.type !== 'xp_boost').length, Icon: BookOpen, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Passed', value: submissions.filter(s => s.quiz_passed).length, Icon: Trophy, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { label: 'Streak', value: streak, Icon: Flame, color: 'text-orange-500', bg: 'bg-orange-50' },
  ];

  return (
    <div className="max-w-5xl mx-auto pb-8">
      <LevelUpModal level={level} isLoaded={submissionsLoaded} />
      <StreakNotification streak={streak} lastActivity={lastActivity} />

      <div className="flex gap-5 items-start">
        {/* Main content column */}
        <div className="flex-1 min-w-0 space-y-6">

          {/* Hero banner */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="relative rounded-3xl overflow-hidden bg-white dark:bg-card border border-violet-100 dark:border-violet-900/30 px-6 py-8 flex flex-col items-center gap-5"
          >
            <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-xl shadow-purple-500/25 bg-violet-600 shrink-0">
              <img src="/logo.png" alt="Intellix" className="w-full h-full object-cover scale-[1.18]" />
            </div>
            <h1 className="font-montserrat text-5xl sm:text-6xl font-black tracking-tight text-foreground uppercase w-full text-center leading-none">
              Intellix Study
            </h1>
          </motion.div>

          {/* Streak at risk banner */}
          {streakAtRisk && (
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-orange-50 dark:bg-orange-950/30 border-2 border-orange-200 dark:border-orange-800/40 rounded-2xl px-5 py-4 flex items-center gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center shrink-0">
                <Flame className="w-5 h-5 text-orange-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-orange-800 dark:text-orange-200 text-sm">
                  Your {streak}-day streak is at risk!
                </p>
                <p className="text-orange-600 dark:text-orange-400 text-xs mt-0.5">Study something today to keep it alive.</p>
              </div>
              <Link to="/quiz">
                <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold shrink-0">
                  Study Now <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
            </motion.div>
          )}

          {/* Pending quiz banner */}
          {pendingQuizzes > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-200 dark:border-amber-800/40 rounded-2xl px-5 py-4 flex items-center gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shrink-0">
                <Trophy className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-amber-800 dark:text-amber-200 text-sm">
                  {pendingQuizzes} quiz{pendingQuizzes > 1 ? 'zes' : ''} ready to take!
                </p>
                <p className="text-amber-600 dark:text-amber-400 text-xs mt-0.5">Take them to earn points and track your progress.</p>
              </div>
              <Link to="/quiz">
                <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold shrink-0">
                  Take Now <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
            </motion.div>
          )}

          {/* Getting Started checklist */}
          {showChecklist && (
            <GettingStarted
              submissions={submissions}
              streak={streak}
              onDismiss={() => {
                setShowChecklist(false);
                try { localStorage.setItem('intellix_checklist_dismissed', 'true'); } catch {}
              }}
            />
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {quickActions.map((action, i) => (
              <motion.div
                key={action.label}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.06 }}
              >
                <Link to={action.to}
                  className="block bg-white rounded-2xl border border-border p-4 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 group overflow-hidden relative">
                  <div className={`absolute inset-0 bg-gradient-to-br ${action.gradient} opacity-0 group-hover:opacity-[0.04] transition-opacity duration-200 pointer-events-none`} />
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center mb-3 shadow-lg ${action.shadow} group-hover:scale-110 transition-transform duration-200`}>
                    <action.icon className="w-5 h-5 text-white" />
                  </div>
                  <p className="font-black text-sm text-foreground group-hover:text-primary transition-colors">{action.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{action.desc}</p>
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Mini Calendar — at the bottom */}
          <MiniCalendar userEmail={user?.email} />

        </div>

        {/* Slim stats sidebar — desktop only */}
        <div className="hidden lg:flex flex-col gap-3 w-[76px] shrink-0 sticky top-24">
          {statsSidebar.map(stat => (
            <div key={stat.label} className="bg-white rounded-2xl border border-border p-3 flex flex-col items-center gap-1.5 text-center">
              <div className={`w-9 h-9 rounded-xl ${stat.bg} flex items-center justify-center`}>
                <stat.Icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <p className="text-xl font-black font-bebas tracking-wide text-foreground leading-none">{stat.value}</p>
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider leading-tight">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
