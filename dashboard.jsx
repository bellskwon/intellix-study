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
    { label: 'Upload notes & take a quiz', desc: 'Turn your notes into an AI quiz', done: hasSubmitted && hasTakenQuiz, to: '/quiz', cta: 'Upload', icon: Upload },
    { label: 'Try a Quick Challenge', desc: 'Test yourself in 60 seconds', done: hasChallenged, to: '/challenge', cta: 'Go', icon: Zap },
    { label: 'Build a 3-day streak', desc: 'Study 3 days in a row for bonus XP', done: hasStreak3, to: '/quiz', cta: 'Go', icon: Flame },
    { label: 'Explore Study Tools', desc: 'Flashcards, vocab helpers & more', done: false, to: '/questions', cta: 'Go', icon: Brain },
    { label: 'Share with a friend', desc: 'Invite a friend and both earn points', done: hasShared, to: '/profile', cta: 'Get Link', icon: Users },
  ];

  const doneCount = tasks.filter(t => t.done).length;
  if (doneCount === tasks.length) return null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
        className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-black text-blue-700 uppercase tracking-wider border-b-2 border-blue-500 pb-0.5 inline-block">
              Getting Started
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{doneCount} / {tasks.length} done</span>
            <button onClick={onDismiss} className="text-blue-400 hover:text-blue-600 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <div className="space-y-2">
          {tasks.map((task) => (
            <div key={task.label}
              className={`flex items-center gap-3 p-2.5 rounded-xl transition-colors ${task.done ? 'opacity-40' : 'bg-white border border-blue-100'}`}>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${task.done ? 'bg-emerald-100' : 'bg-blue-50'}`}>
                {task.done
                  ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  : <task.icon className="w-3.5 h-3.5 text-blue-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-bold leading-tight ${task.done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{task.label}</p>
                {!task.done && <p className="text-[10px] text-muted-foreground mt-0.5">{task.desc}</p>}
              </div>
              {!task.done && (
                <Link to={task.to} className="text-xs font-black text-blue-600 hover:underline shrink-0 whitespace-nowrap">
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
    <div className="max-w-2xl mx-auto pb-8">
      <LevelUpModal level={level} isLoaded={submissionsLoaded} />
      <StreakNotification streak={streak} lastActivity={lastActivity} />

      {/* Dark hero — breaks out of p-4/p-8 wrapper */}
      <div className="-mx-4 -mt-4 lg:-mx-8 lg:-mt-8 mb-6">
        <div className="bg-[#130d25] px-6 pt-7 pb-8 space-y-5">
          {/* Greeting row */}
          <div className="flex items-start justify-between gap-3">
            <p className="text-white/70 text-sm font-semibold">Welcome back, {displayName} 👋</p>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="flex items-center gap-1 bg-white/10 text-white/80 text-xs font-bold px-2 py-1 rounded-full">
                <Star className="w-3 h-3 text-amber-400" /> {earned.toLocaleString()}
              </span>
              <span className="flex items-center gap-1 bg-white/10 text-white/80 text-xs font-bold px-2 py-1 rounded-full">
                <Flame className="w-3 h-3 text-orange-400" /> {streak}
              </span>
              <span className="bg-white/10 text-white/80 text-xs font-bold px-2 py-1 rounded-full">
                {league.name}
              </span>
            </div>
          </div>

          {/* Big heading */}
          <div className="leading-none">
            <h1 className="font-black text-white" style={{ fontSize: 'clamp(3.2rem, 13vw, 5.5rem)', lineHeight: 0.95 }}>
              Intellix
            </h1>
            <h1 className="font-black text-violet-400" style={{ fontSize: 'clamp(3.2rem, 13vw, 5.5rem)', lineHeight: 0.95 }}>
              Study
            </h1>
          </div>

          {/* XP bar card */}
          <div className="bg-white/10 rounded-2xl px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center">
                  <Zap className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-sm font-bold text-white">{league.name} · Lv. {level}</span>
              </div>
              <span className="text-xs text-white/50">{xpInLevel} / 200 XP</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/20 overflow-hidden">
              <motion.div className="h-full rounded-full bg-violet-400"
                initial={{ width: 0 }} animate={{ width: `${xpPct}%` }} transition={{ duration: 0.7, ease: 'easeOut' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Content below hero */}
      <div className="space-y-5">

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

        {/* 4 stat cards */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'POINTS',  value: earned.toLocaleString(), icon: Star,    iconColor: 'text-violet-500', bg: 'bg-white' },
            { label: 'QUIZZES', value: quizCount,               icon: BookOpen, iconColor: 'text-emerald-500', bg: 'bg-white' },
            { label: 'PASSED',  value: passedCount,             icon: Trophy,   iconColor: 'text-rose-500',   bg: 'bg-white' },
            { label: 'STREAK',  value: streak,                  icon: Flame,    iconColor: 'text-amber-500',  bg: 'bg-white' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} border border-border rounded-2xl p-3 text-center shadow-sm`}>
              <s.icon className={`w-4 h-4 ${s.iconColor} mx-auto mb-1.5`} />
              <p className="text-xl font-black text-foreground">{s.value}</p>
              <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

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
            className="bg-slate-900 rounded-2xl px-5 py-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-white text-sm">{pendingQuizzes} quiz{pendingQuizzes > 1 ? 'zes' : ''} ready to take</p>
              <p className="text-white/50 text-xs mt-0.5">Earn points for every correct answer</p>
            </div>
            <Link to="/quiz">
              <Button size="sm" className="bg-white text-slate-900 hover:bg-white/90 rounded-xl font-bold shrink-0">
                Take now <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </motion.div>
        )}

        {/* Explore */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-base font-black text-foreground">Explore</p>
            <Link to="/quiz" className="text-xs font-bold text-muted-foreground hover:text-foreground">See all →</Link>
          </div>
          <div className="space-y-3">
            {/* Featured card */}
            <Link to="/quiz">
              <div className="bg-violet-100 rounded-2xl p-5 relative overflow-hidden hover:shadow-md transition-shadow">
                <div className="absolute top-4 right-4 w-8 h-8 rounded-xl bg-violet-200 flex items-center justify-center">
                  <Upload className="w-4 h-4 text-violet-600" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-violet-500 mb-1">AI Powered</p>
                <p className="text-xl font-black text-foreground">Upload your notes</p>
              </div>
            </Link>
            {/* Two medium cards */}
            <div className="grid grid-cols-2 gap-3">
              <Link to="/challenge">
                <div className="bg-amber-50 rounded-2xl p-4 hover:shadow-md transition-shadow">
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-1">Timed</p>
                  <p className="text-base font-black text-foreground">Quick challenge</p>
                </div>
              </Link>
              <Link to="/questions">
                <div className="bg-emerald-50 rounded-2xl p-4 hover:shadow-md transition-shadow">
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">Learn</p>
                  <p className="text-base font-black text-foreground">Study tools</p>
                </div>
              </Link>
            </div>
            {/* Three small cards */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Progress', sub: 'My stats', to: '/progress', color: 'text-rose-500', bg: 'bg-rose-50', icon: BarChart3 },
                { label: 'Rankings', sub: 'Leaderboard', to: '/friends', color: 'text-amber-500', bg: 'bg-amber-50', icon: Trophy },
                { label: 'Friends', sub: 'Invite & earn', to: '/friends', color: 'text-blue-500', bg: 'bg-blue-50', icon: Users },
              ].map(card => (
                <Link key={card.label} to={card.to}>
                  <div className={`${card.bg} rounded-2xl p-3 text-center hover:shadow-md transition-shadow`}>
                    <card.icon className={`w-4 h-4 ${card.color} mx-auto mb-1.5`} />
                    <p className="text-xs font-black text-foreground">{card.label}</p>
                    <p className={`text-[10px] font-semibold ${card.color} mt-0.5`}>{card.sub}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Calendar */}
        <MiniCalendar userEmail={user?.email} />
      </div>
    </div>
  );
}
