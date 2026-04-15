import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Upload, Brain, BarChart3, ArrowRight, Flame, Star, Trophy, BookOpen, CheckCircle2, Circle, X, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StatsRow from '@/components/dashboard/StatsRow';
import RecentSubmissions from '@/components/dashboard/RecentSubmissions';
import StreakNotification from '@/components/dashboard/StreakNotification';
import LevelXPBar, { calcLevelInfo, getLeague } from '@/components/shared/LevelXPBar';
import LevelUpModal from '@/components/shared/LevelUpModal';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

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

function GettingStarted({ user, submissions, onDismiss }) {
  const hasAvatar = !!(user?.avatar_emoji || user?.avatar_image_url);
  const hasSubmitted = submissions.length > 0;
  const hasTakenQuiz = submissions.some(s => s.quiz_score != null);
  const hasShared = (() => { try { return !!localStorage.getItem('intellix_shared_referral'); } catch { return false; } })();

  const tasks = [
    { label: 'Set your avatar', done: hasAvatar, to: '/profile', cta: 'Go to Profile' },
    { label: 'Upload your first notes', done: hasSubmitted, to: '/quiz', cta: 'Upload Notes' },
    { label: 'Take your first quiz', done: hasTakenQuiz, to: '/quiz', cta: 'Take a Quiz' },
    { label: 'Share your referral link', done: hasShared, to: '/profile', cta: 'Get Link' },
  ];

  const doneCount = tasks.filter(t => t.done).length;
  const allDone = doneCount === tasks.length;
  if (allDone) return null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
        className="bg-white rounded-2xl border border-border p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-black text-sm text-foreground">Getting Started</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{doneCount} of {tasks.length} complete</p>
          </div>
          <button onClick={onDismiss} className="p-1 hover:bg-secondary rounded-lg transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        {/* Progress bar */}
        <div className="h-1.5 bg-secondary rounded-full mb-4 overflow-hidden">
          <motion.div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
            initial={{ width: 0 }} animate={{ width: `${(doneCount / tasks.length) * 100}%` }} transition={{ duration: 0.5 }} />
        </div>
        <div className="space-y-2">
          {tasks.map((task) => (
            <div key={task.label} className="flex items-center gap-3">
              {task.done
                ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                : <Circle className="w-5 h-5 text-muted-foreground/40 shrink-0" />}
              <span className={`flex-1 text-sm ${task.done ? 'line-through text-muted-foreground' : 'font-medium text-foreground'}`}>
                {task.label}
              </span>
              {!task.done && (
                <Link to={task.to} className="text-xs font-bold text-primary hover:underline shrink-0">
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

const subjectEmoji = {
  math: '🔢', science: '🔬', history: '📜', geography: '🌍',
  english: '📖', foreign_language: '🗣️', computer_science: '💻',
  art: '🎨', music: '🎵', other: '📌',
};

export default function Dashboard() {
  const [showChecklist, setShowChecklist] = useState(() => {
    try { return localStorage.getItem('intellix_checklist_dismissed') !== 'true'; } catch { return true; }
  });

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

  // Friends + their activity
  const { data: allFriendships = [] } = useQuery({
    queryKey: ['friendships'],
    queryFn: () => base44.entities.Friendship.list('-created_date', 100),
    enabled: !!user?.email,
  });
  const friendEmails = allFriendships
    .filter(f => f.status === 'accepted' && (f.requester_email === user?.email || f.recipient_email === user?.email))
    .map(f => f.requester_email === user?.email ? f.recipient_email : f.requester_email);

  const { data: allRecentSubs = [] } = useQuery({
    queryKey: ['allRecentSubs'],
    queryFn: () => base44.entities.Submission.list('-created_date', 200),
    enabled: friendEmails.length > 0,
  });
  const friendActivity = allRecentSubs
    .filter(s => friendEmails.includes(s.created_by) && s.quiz_score != null)
    .slice(0, 6);

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
      <LevelUpModal level={level} />
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
            {league.name} League · Lv.{level}
          </p>
          <h1 className="text-2xl font-black mb-1 font-sora">
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

      {/* Getting Started checklist — hidden after dismiss or all tasks done */}
      {showChecklist && (
        <GettingStarted
          user={user}
          submissions={submissions}
          onDismiss={() => {
            setShowChecklist(false);
            try { localStorage.setItem('intellix_checklist_dismissed', 'true'); } catch {}
          }}
        />
      )}

      {/* Stats */}
      <StatsRow submissions={submissions} streak={streak} />

      {/* Quick Actions */}
      <div>
        <h2 className="font-black font-sora text-foreground text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
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

      {/* Friends Activity Feed */}
      {friendActivity.length > 0 && (
        <div>
          <h2 className="font-black font-sora text-foreground text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-500" /> Friends Activity
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {friendActivity.map((s, i) => (
              <motion.div key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="bg-white rounded-2xl border border-border px-4 py-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-sm font-black text-primary shrink-0">
                  {s.created_by[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-foreground truncate">{s.created_by.split('@')[0]}</p>
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <span>{subjectEmoji[s.subject] || '📌'}</span>
                    <span className="capitalize">{s.subject?.replace(/_/g, ' ')}</span>
                    <span>·</span>
                    <span>{formatDistanceToNow(new Date(s.created_date), { addSuffix: true })}</span>
                  </p>
                </div>
                <span className={`text-sm font-black shrink-0 px-2 py-0.5 rounded-full ${
                  s.quiz_score >= 80 ? 'bg-emerald-50 text-emerald-600' :
                  s.quiz_score >= 60 ? 'bg-amber-50 text-amber-600' :
                  'bg-rose-50 text-rose-500'}`}>
                  {s.quiz_score}%
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Submissions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-black font-sora text-foreground text-sm uppercase tracking-wider flex items-center gap-2">
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
