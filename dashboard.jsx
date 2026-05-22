import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Upload, Brain, BarChart3, ArrowRight, Flame, Star, Trophy, CheckCircle2, X, Users, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StreakNotification from '@/components/dashboard/StreakNotification';
import { calcLevelInfo, getLeague } from '@/components/shared/LevelXPBar';
import LevelUpModal from '@/components/shared/LevelUpModal';
import { toast } from 'sonner';
import MiniCalendar from '@/pages/MiniCalendar';

const EXPLORE_FEATURES = [
  { label: 'Upload notes',     icon: Upload,   to: '/quiz',       bg: 'bg-violet-100',  iconBg: 'bg-white', color: 'text-violet-600', desc: 'Generate a quiz' },
  { label: 'Quick challenge',  icon: Zap,      to: '/challenge',  bg: 'bg-amber-100',   iconBg: 'bg-white', color: 'text-amber-500',  desc: '5 questions fast' },
  { label: 'Study tools',      icon: BookOpen, to: '/questions',  bg: 'bg-emerald-100', iconBg: 'bg-white', color: 'text-emerald-600',desc: 'Flashcards & more' },
  { label: 'Progress',         icon: BarChart3,to: '/progress',   bg: 'bg-rose-100',    iconBg: 'bg-white', color: 'text-rose-500',   desc: 'See your trends' },
  { label: 'Leaderboard',      icon: Trophy,   to: '/friends',    bg: 'bg-pink-100',    iconBg: 'bg-white', color: 'text-pink-500',   desc: 'Top students' },
  { label: 'Social',           icon: Users,    to: '/friends',    bg: 'bg-blue-100',    iconBg: 'bg-white', color: 'text-blue-500',   desc: 'Friends & activity' },
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
    { label: 'Try a Quick Challenge', desc: 'Test yourself on any topic in 60 seconds', done: hasChallenged, to: '/challenge', cta: 'Go', icon: Zap },
    { label: 'Build a 3-day streak', desc: 'Study 3 days in a row to earn bonus XP and badges', done: hasStreak3, to: '/quiz', cta: 'Go', icon: Flame },
    { label: 'Explore Study Tools', desc: 'Flashcards, key concepts, vocab helpers & more', done: false, to: '/questions', cta: 'Go', icon: Brain },
    { label: 'Share with a friend', desc: 'Invite a friend and both of you earn bonus points', done: hasShared, to: '/profile', cta: 'Get Link', icon: Users },
  ];

  const doneCount = tasks.filter(t => t.done).length;
  if (doneCount === tasks.length) return null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">
            Getting Started · {doneCount}/{tasks.length}
          </p>
          <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="space-y-2">
          {tasks.map((task) => (
            <div key={task.label}
              className={`flex items-center gap-3 p-3 rounded-2xl transition-colors ${task.done ? 'opacity-40' : 'bg-white border border-border hover:shadow-sm'}`}>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${task.done ? 'bg-emerald-100' : 'bg-secondary'}`}>
                {task.done
                  ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  : <task.icon className="w-4 h-4 text-muted-foreground" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-bold leading-tight ${task.done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{task.label}</p>
                {!task.done && <p className="text-xs text-muted-foreground mt-0.5">{task.desc}</p>}
              </div>
              {!task.done && (
                <Link to={task.to} className="text-xs font-black text-primary hover:underline shrink-0 whitespace-nowrap">
                  {task.cta} →
                </Link>
              )}
            </div>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function Dashboard() {
  const [showChecklist, setShowChecklist] = useState(() => {
    try { return localStorage.getItem('intellix_checklist_dismissed') !== 'true'; } catch { return true; }
  });

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });

  const { data: submissions = [], isSuccess: submissionsLoaded } = useQuery({
    queryKey: ['mySubmissions'],
    queryFn: () => base44.entities.Submission.filter({ created_by: user?.email }, '-created_date', 2000),
    enabled: !!user?.email,
  });

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

  const { level, xpInLevel, xpPct } = calcLevelInfo(submissions, user?.xp_bonus || 0);
  const league = getLeague(level);
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

  const displayName = user?.display_name?.split(' ')[0] || user?.full_name?.split(' ')[0] || 'Student';
  const quizCount = submissions.filter(s => s.type !== 'xp_boost').length;
  const passedCount = submissions.filter(s => s.quiz_passed).length;


  return (
    <div className="max-w-2xl mx-auto pb-8 space-y-5">
      <LevelUpModal level={level} isLoaded={submissionsLoaded} />
      <StreakNotification streak={streak} lastActivity={lastActivity} />

      {/* Greeting + badge bar */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-lg font-black text-foreground">Hey, <span className="text-primary">{displayName}</span></p>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-full">
            <Star className="w-3 h-3" /> {earned.toLocaleString()} pts
          </span>
          <span className="flex items-center gap-1 bg-orange-50 border border-orange-200 text-orange-700 text-xs font-bold px-2.5 py-1 rounded-full">
            <Flame className="w-3 h-3" /> {streak} streak
          </span>
          <span className="flex items-center gap-1 bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold px-2.5 py-1 rounded-full">
            {league.emoji} {league.name}
          </span>
        </div>
      </motion.div>

      {/* Big title */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-1">Online Study Platform</p>
        <h1 className="font-serif font-black leading-none" style={{ fontSize: 'clamp(2.8rem, 9vw, 5rem)', letterSpacing: '0.03em' }}>
          <span className="text-foreground">Intellix </span>
          <span className="text-primary">Study</span>
        </h1>
      </motion.div>

      {/* XP bar card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
        className="bg-violet-50 border border-violet-100 rounded-2xl px-5 py-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-sm">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-black text-foreground">{league.emoji} {league.name} · Lv. {level}</span>
          </div>
          <span className="text-xs font-bold text-muted-foreground">{xpInLevel} / 200 XP</span>
        </div>
        <div className="h-2 rounded-full bg-violet-200 overflow-hidden">
          <motion.div className="h-full rounded-full bg-primary"
            initial={{ width: 0 }} animate={{ width: `${xpPct}%` }} transition={{ duration: 0.7, ease: 'easeOut' }} />
        </div>
      </motion.div>

      {/* 4 stat cards */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="grid grid-cols-4 gap-3">
        {[
          { label: 'POINTS',  value: earned.toLocaleString(), bg: 'bg-violet-50',  text: 'text-violet-700' },
          { label: 'QUIZZES', value: quizCount,               bg: 'bg-emerald-50', text: 'text-emerald-700' },
          { label: 'PASSED',  value: passedCount,             bg: 'bg-rose-50',    text: 'text-rose-700' },
          { label: 'STREAK',  value: streak,                  bg: 'bg-amber-50',   text: 'text-amber-700' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-4 text-center`}>
            <p className={`text-2xl font-black ${s.text}`}>{s.value}</p>
            <p className={`text-[10px] font-black uppercase tracking-wider mt-0.5 ${s.text} opacity-70`}>{s.label}</p>
          </div>
        ))}
      </motion.div>

      {/* Streak at risk banner */}
      {streakAtRisk && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-orange-50 border-2 border-orange-200 rounded-2xl px-5 py-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
            <Flame className="w-5 h-5 text-orange-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-orange-800 text-sm">Your {streak}-day streak is at risk!</p>
            <p className="text-orange-600 text-xs mt-0.5">Study something today to keep it alive.</p>
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
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 border-2 border-amber-200 rounded-2xl px-5 py-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
            <Trophy className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-amber-800 text-sm">{pendingQuizzes} quiz{pendingQuizzes > 1 ? 'zes' : ''} ready to take</p>
            <p className="text-amber-600 text-xs mt-0.5">Earn points for every correct answer</p>
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

      {/* Explore */}
      <div>
        <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-3">Explore</p>
        <div className="grid grid-cols-3 gap-3">
          {EXPLORE_FEATURES.map((f, i) => (
            <motion.div key={f.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Link to={f.to}
                className={`flex flex-col items-center gap-2 p-5 rounded-2xl ${f.bg} hover:shadow-md transition-all duration-200 group`}>
                <div className={`w-10 h-10 rounded-xl ${f.iconBg} flex items-center justify-center shadow-sm`}>
                  <f.icon className={`w-5 h-5 ${f.color}`} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-black text-foreground">{f.label}</p>
                  <p className={`text-xs font-semibold mt-0.5 ${f.color}`}>{f.desc}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Calendar */}
      <MiniCalendar userEmail={user?.email} />
    </div>
  );
}
