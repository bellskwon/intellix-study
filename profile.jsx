import React, { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Trophy, Flame, BookOpen, Target, LogOut, Star, Zap, BarChart3, Pencil, Upload, Smile, Check, X, Edit2, Copy, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import LevelXPBar, { calcLevelInfo, getLeague, PASS_THRESHOLD } from '@/components/shared/LevelXPBar';
import { toast } from 'sonner';

const AVATARS = ['🐯','🦊','🐼','🦁','🐺','🦋','🐉','🦄','🐸','🤖','👾','🎭','🐨','🐧','🦅','🐬'];
const COLORS = ['#7c3aed','#ec4899','#06b6d4','#10b981','#f59e0b','#ef4444','#8b5cf6','#3b82f6'];

const subjectEmoji = {
  math:'🔢', science:'🔬', history:'📜', geography:'🌍',
  english:'📖', foreign_language:'🗣️', computer_science:'💻',
  art:'🎨', music:'🎵', other:'📌'
};

export default function Profile() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);

  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [avatarTab, setAvatarTab] = useState('emoji');
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const { data: user, refetch: refetchUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: submissions = [] } = useQuery({
    queryKey: ['mySubmissions'],
    queryFn: () => base44.entities.Submission.filter({ created_by: user?.email }, '-created_date', 100),
    enabled: !!user?.email,
  });

  // Saved avatar/color from user data
  const savedAvatar = user?.avatar_emoji || null;
  const savedColor = user?.avatar_color || null;
  const savedImageUrl = user?.avatar_image_url || null;
  const displayName = user?.display_name || user?.full_name || 'Student';

  const graded = submissions.filter(s => s.quiz_score != null);
  const approved = submissions.filter(s => s.status === 'approved');
  const totalPoints = approved.reduce((a, b) => a + (b.points_awarded || 0), 0);
  const avgScore = graded.length ? Math.round(graded.reduce((s, q) => s + q.quiz_score, 0) / graded.length) : 0;
  const best = graded.length ? Math.max(...graded.map(s => s.quiz_score)) : 0;
  const passed = submissions.filter(s => s.quiz_passed).length;

  const { level } = calcLevelInfo(submissions);
  const league = getLeague(level);

  const subjectMap = {};
  submissions.forEach(s => { subjectMap[s.subject] = (subjectMap[s.subject] || 0) + 1; });
  const sortedSubjects = Object.entries(subjectMap).sort((a, b) => b[1] - a[1]);

  const streak = user?.streak_count ?? 0;
  const subjectCount = Object.keys(subjectMap).length;
  const perfectScores = graded.filter(s => s.quiz_score === 100).length;
  const sharedProfile = (() => { try { return !!localStorage.getItem('intellix_shared_referral'); } catch { return false; } })();

  const badgeGroups = [
    {
      label: 'Study Milestones',
      badges: [
        { label: 'First Quiz',   icon: '🎯', earned: submissions.length >= 1,   desc: 'Complete your first quiz' },
        { label: '5 Quizzes',    icon: '📚', earned: submissions.length >= 5,   desc: 'Complete 5 quizzes' },
        { label: '25 Quizzes',   icon: '🔟', earned: submissions.length >= 25,  desc: 'Complete 25 quizzes' },
        { label: '50 Quizzes',   icon: '💯', earned: submissions.length >= 50,  desc: 'Complete 50 quizzes' },
      ],
    },
    {
      label: 'Performance',
      badges: [
        { label: 'Score 80%+',    icon: '⭐', earned: graded.some(s => s.quiz_score >= 80), desc: 'Ace a quiz with 80%+' },
        { label: 'Perfect Score', icon: '🏆', earned: perfectScores >= 1,  desc: 'Score 100% on a quiz' },
        { label: 'Hat Trick',     icon: '🎩', earned: perfectScores >= 3,  desc: 'Score 100% three times' },
        { label: 'High Avg',      icon: '📈', earned: graded.length >= 5 && avgScore >= 85, desc: 'Maintain 85%+ average (5+ quizzes)' },
      ],
    },
    {
      label: 'Streaks',
      badges: [
        { label: '7-Day Streak',   icon: '🔥', earned: streak >= 7,   desc: 'Study 7 days in a row' },
        { label: '30-Day Streak',  icon: '⚡', earned: streak >= 30,  desc: 'Study 30 days in a row' },
        { label: '100-Day Streak', icon: '💎', earned: streak >= 100, desc: 'Study 100 days in a row' },
      ],
    },
    {
      label: 'Explorer',
      badges: [
        { label: '3 Subjects',   icon: '🌍', earned: subjectCount >= 3, desc: 'Study 3 different subjects' },
        { label: '5 Subjects',   icon: '🗺️', earned: subjectCount >= 5, desc: 'Study 5 different subjects' },
        { label: 'Level 10',     icon: '🚀', earned: level >= 10,       desc: 'Reach Level 10' },
        { label: 'Level 50',     icon: '🌟', earned: level >= 50,       desc: 'Reach Level 50' },
      ],
    },
    {
      label: 'Social',
      badges: [
        { label: 'Shared Profile', icon: '👨‍👩‍👧', earned: sharedProfile, desc: 'Share your progress with a parent' },
        { label: '500 Points',     icon: '💰', earned: totalPoints >= 500,  desc: 'Earn 500 total points' },
        { label: '1,000 Points',   icon: '💎', earned: totalPoints >= 1000, desc: 'Earn 1,000 total points' },
      ],
    },
  ];

  // Referral link
  const referralCode = user?.referral_code || '';
  const referralLink = referralCode ? `${window.location.origin}?ref=${referralCode}` : '';

  // Avatar display logic
  const getAvatarDisplay = () => {
    if (savedImageUrl) return { type: 'image', value: savedImageUrl };
    if (savedAvatar) return { type: 'emoji', value: savedAvatar };
    if (savedColor) return { type: 'color', value: savedColor };
    return { type: 'initial', value: displayName[0] || '?' };
  };
  const avatar = getAvatarDisplay();

  const saveAvatar = async (updates) => {
    await base44.auth.updateMe(updates);
    await refetchUser();
    queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    setShowAvatarPicker(false);
    toast.success('Avatar updated!');
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingAvatar(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await saveAvatar({ avatar_image_url: file_url, avatar_emoji: null, avatar_color: null });
    setUploadingAvatar(false);
  };

  const handleSaveName = async () => {
    if (!nameInput.trim()) return;
    setSavingName(true);
    await base44.auth.updateMe({ display_name: nameInput.trim() });
    await refetchUser();
    queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    setSavingName(false);
    setEditingName(false);
    toast.success('Name updated!');
  };

  const AvatarCircle = ({ size = 'lg' }) => {
    const sz = size === 'lg' ? 'w-20 h-20 text-3xl' : 'w-10 h-10 text-base';
    if (avatar.type === 'image') return (
      <div className={`${sz} rounded-3xl overflow-hidden border-2 border-white/30 shadow-xl`}>
        <img src={avatar.value} alt="avatar" className="w-full h-full object-cover" />
      </div>
    );
    if (avatar.type === 'emoji') return (
      <div className={`${sz} rounded-3xl flex items-center justify-center bg-white/20 border-2 border-white/30 shadow-xl`}>
        {avatar.value}
      </div>
    );
    if (avatar.type === 'color') return (
      <div className={`${sz} rounded-3xl flex items-center justify-center border-2 border-white/30 shadow-xl font-black text-white`}
        style={{ background: avatar.value }}>
        {displayName[0] || '?'}
      </div>
    );
    return (
      <div className={`${sz} rounded-3xl flex items-center justify-center bg-white/20 border-2 border-white/30 shadow-xl font-black text-white`}>
        {displayName[0] || '?'}
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-8">

      {/* Profile Hero */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="relative rounded-3xl overflow-hidden text-white"
        style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 60%, #ec4899 100%)' }}>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute bottom-0 left-10 w-32 h-32 rounded-full bg-pink-400/20 blur-2xl" />
        </div>

        <div className="relative z-10 p-7">
          <div className="flex items-start gap-5">
            {/* Avatar */}
            <div className="relative shrink-0">
              <AvatarCircle size="lg" />
              <button onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-xl bg-white/30 backdrop-blur-sm flex items-center justify-center hover:bg-white/50 transition-all border border-white/40">
                <Pencil className="w-3 h-3 text-white" />
              </button>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                {editingName ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      value={nameInput}
                      onChange={e => setNameInput(e.target.value)}
                      className="h-8 text-sm bg-white/20 border-white/30 text-white placeholder:text-white/50 rounded-lg"
                      placeholder="Your name..."
                      onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false); }}
                      autoFocus
                    />
                    <button onClick={handleSaveName} disabled={savingName}
                      className="w-7 h-7 rounded-lg bg-emerald-400/80 flex items-center justify-center hover:bg-emerald-400">
                      <Check className="w-3.5 h-3.5 text-white" />
                    </button>
                    <button onClick={() => setEditingName(false)}
                      className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center hover:bg-white/30">
                      <X className="w-3.5 h-3.5 text-white" />
                    </button>
                  </div>
                ) : (
                  <>
                    <h1 className="text-xl font-black truncate">{displayName}</h1>
                    <button onClick={() => { setNameInput(displayName); setEditingName(true); }}
                      className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center hover:bg-white/30 shrink-0">
                      <Edit2 className="w-3 h-3 text-white" />
                    </button>
                    <span className={`text-xs px-2 py-0.5 rounded-full bg-gradient-to-r ${league.color} text-white font-bold shrink-0`}>
                      {league.emoji} {league.name}
                    </span>
                  </>
                )}
              </div>
              <p className="text-purple-200 text-xs mb-3">{user?.email}</p>
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <span className="flex items-center gap-1 bg-white/15 px-2.5 py-1 rounded-full text-xs font-bold">
                  <Flame className="w-3 h-3 text-amber-300" /> {user?.streak_count ?? 0} day streak
                </span>
                <span className="flex items-center gap-1 bg-white/15 px-2.5 py-1 rounded-full text-xs font-bold">
                  <Star className="w-3 h-3 text-yellow-300" /> {totalPoints} pts
                </span>
              </div>
              <LevelXPBar submissions={submissions} dark />
            </div>
          </div>

          {/* Avatar Picker */}
          <AnimatePresence>
            {showAvatarPicker && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="mt-4 bg-white/20 backdrop-blur-sm rounded-2xl p-4 border border-white/30">
                {/* Tabs */}
                <div className="flex gap-2 mb-3">
                  {[
                    { key: 'emoji', label: 'Emoji', Icon: Smile },
                    { key: 'color', label: 'Color', Icon: null },
                    { key: 'image', label: 'Upload', Icon: Upload },
                  ].map(t => (
                    <button key={t.key} onClick={() => setAvatarTab(t.key)}
                      className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${avatarTab === t.key ? 'bg-white text-purple-700' : 'bg-white/20 text-white hover:bg-white/30'}`}>
                      {t.label}
                    </button>
                  ))}
                </div>

                {avatarTab === 'emoji' && (
                  <div className="flex flex-wrap gap-2">
                    {AVATARS.map(e => (
                      <button key={e} onClick={() => saveAvatar({ avatar_emoji: e, avatar_color: null, avatar_image_url: null })}
                        className={`w-9 h-9 rounded-xl text-xl flex items-center justify-center transition-all hover:scale-110 ${savedAvatar === e ? 'bg-white/40 ring-2 ring-white' : 'bg-white/20 hover:bg-white/30'}`}>
                        {e}
                      </button>
                    ))}
                  </div>
                )}

                {avatarTab === 'color' && (
                  <div className="flex flex-wrap gap-2">
                    {COLORS.map(c => (
                      <button key={c} onClick={() => saveAvatar({ avatar_color: c, avatar_emoji: null, avatar_image_url: null })}
                        className={`w-9 h-9 rounded-xl transition-all hover:scale-110 ${savedColor === c ? 'ring-2 ring-white ring-offset-1 ring-offset-transparent' : ''}`}
                        style={{ background: c }} />
                    ))}
                  </div>
                )}

                {avatarTab === 'image' && (
                  <div className="text-center">
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    <button onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingAvatar}
                      className="w-full py-3 rounded-xl bg-white/20 hover:bg-white/30 text-white text-sm font-bold flex items-center justify-center gap-2 transition-all">
                      {uploadingAvatar ? <Zap className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {uploadingAvatar ? 'Uploading...' : 'Choose from device'}
                    </button>
                    <p className="text-white/50 text-xs mt-2">PNG, JPG — max 5MB</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Points', value: totalPoints, gradient: 'from-amber-400 to-orange-500', Icon: Star },
          { label: 'Avg Score', value: `${avgScore}%`, gradient: 'from-violet-500 to-purple-600', Icon: Target },
          { label: 'Best Score', value: `${best}%`, gradient: 'from-emerald-400 to-teal-500', Icon: Trophy },
          { label: 'Quizzes', value: submissions.length, gradient: 'from-cyan-400 to-blue-500', Icon: Zap },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.07 }}
            className="bg-white rounded-2xl border border-border p-4 text-center card-hover">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center mx-auto mb-2 shadow-md`}>
              <s.Icon className="w-5 h-5 text-white" />
            </div>
            <p className="text-xl font-black text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground font-medium">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Next Goal Panel */}
      <div className="bg-white rounded-2xl border border-border p-5">
        <h2 className="font-black text-sm text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" /> Next Goals
        </h2>
        <div className="space-y-3">
          {[
            { label: 'Reach 10 quizzes', target: 10, current: submissions.length, Icon: BookOpen },
            { label: 'Avg score 80%', target: 80, current: avgScore, Icon: BarChart3 },
            { label: 'Pass 5 quizzes', target: 5, current: passed, Icon: Trophy },
          ].map(g => {
            const pct = Math.min(Math.round((g.current / g.target) * 100), 100);
            const done = pct >= 100;
            return (
              <div key={g.label}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <g.Icon className="w-3.5 h-3.5 text-primary" /> {g.label}
                  </span>
                  <span className={`font-bold ${done ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                    {done ? '✓ Done!' : `${g.current} / ${g.target}`}
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div className={`h-full rounded-full ${done ? 'bg-emerald-400' : 'bg-gradient-to-r from-violet-500 to-purple-400'}`}
                    initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Subject Breakdown */}
      {sortedSubjects.length > 0 && (
        <div className="bg-white rounded-2xl border border-border p-5">
          <h2 className="font-black text-sm text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-cyan-500" /> Subject Breakdown
          </h2>
          <div className="space-y-2.5">
            {sortedSubjects.slice(0, 5).map(([subj, count]) => {
              const pct = Math.round((count / submissions.length) * 100);
              return (
                <div key={subj} className="flex items-center gap-3">
                  <span className="text-base w-6 shrink-0">{subjectEmoji[subj] || '📌'}</span>
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold capitalize">{subj.replace(/_/g, ' ')}</span>
                      <span className="text-muted-foreground">{count} quiz{count !== 1 ? 'zes' : ''}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <motion.div className="h-full bg-gradient-to-r from-violet-400 to-purple-500 rounded-full"
                        initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Achievements */}
      <div className="bg-white rounded-2xl border border-border p-5 space-y-5">
        <h2 className="font-black text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-500" /> Achievements
        </h2>
        {badgeGroups.map(group => {
          const earnedCount = group.badges.filter(b => b.earned).length;
          return (
            <div key={group.label}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-black text-muted-foreground uppercase tracking-wider">{group.label}</p>
                <p className="text-[10px] font-bold text-muted-foreground">{earnedCount}/{group.badges.length}</p>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {group.badges.map(b => (
                  <div key={b.label} className={`rounded-xl p-2.5 text-center transition-all border ${
                    b.earned ? 'bg-violet-50 border-violet-200' : 'bg-muted/20 border-dashed border-muted/50 opacity-40 grayscale'}`}>
                    <div className="text-xl mb-1">{b.icon}</div>
                    <p className="text-[10px] font-black text-foreground leading-tight">{b.label}</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5 leading-tight">{b.earned ? '✓ Earned' : b.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Referral Section */}
      <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl border border-violet-200 p-5">
        <h2 className="font-black text-sm text-foreground mb-1 flex items-center gap-2">
          <Users className="w-4 h-4 text-violet-500" /> Refer a Friend — Earn Bonus XP
        </h2>
        <p className="text-xs text-muted-foreground mb-3">Share your Intellix referral link. When a new friend signs up using your link and completes their first quiz, you both earn bonus XP!</p>
        {referralLink ? (
          <div className="flex items-center gap-2 bg-white rounded-xl border border-violet-200 px-3 py-2 mb-2">
            <span className="flex-1 text-xs font-mono text-foreground truncate select-all">{referralLink}</span>
            <button onClick={() => { navigator.clipboard.writeText(referralLink); toast.success('Referral link copied!'); }}
              className="shrink-0 flex items-center gap-1 text-xs font-bold text-violet-600 hover:text-violet-800 transition-colors">
              <Copy className="w-3.5 h-3.5" /> Copy
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-violet-200 px-3 py-2 mb-2">
            <p className="text-xs text-muted-foreground">Loading your referral link...</p>
          </div>
        )}
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 space-y-1">
          <p className="text-[11px] font-bold text-amber-800">Important rules:</p>
          <p className="text-[11px] text-amber-700">• You cannot click your own referral link to earn rewards — it only works for new users</p>
          <p className="text-[11px] text-amber-700">• Each new user can only register once — the bonus is only awarded on first sign-up</p>
          <p className="text-[11px] text-amber-700">• The link opens <strong>Intellix</strong> — make sure you share the correct link above</p>
        </div>
      </div>

      {/* Share with Parent */}
      <div className="bg-white rounded-2xl border border-border p-5">
        <h2 className="font-black text-sm text-foreground mb-1 flex items-center gap-2">
          👨‍👩‍👧 Share Progress with a Parent
        </h2>
        <p className="text-xs text-muted-foreground mb-3">
          Generate a read-only link your parent or guardian can bookmark to see your scores, subjects, and activity — without needing an account.
        </p>
        {user?.referral_code ? (
          <div className="flex items-center gap-2 bg-slate-50 rounded-xl border border-border px-3 py-2">
            <span className="flex-1 text-xs font-mono text-foreground truncate select-all">
              {`${window.location.origin}/shared/${user.referral_code}`}
            </span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/shared/${user.referral_code}`);
                try { localStorage.setItem('intellix_shared_referral', 'true'); } catch {}
                toast.success('Parent link copied!');
              }}
              className="shrink-0 flex items-center gap-1 text-xs font-bold text-violet-600 hover:text-violet-800 transition-colors">
              <Copy className="w-3.5 h-3.5" /> Copy
            </button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Loading...</p>
        )}
        <p className="text-[11px] text-muted-foreground mt-2">This link only shows your public stats — no personal details or account access.</p>
      </div>

      {/* Quiz History */}
      {submissions.length > 0 && (
        <div className="bg-white rounded-2xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="font-black text-foreground">Quiz History</h2>
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="divide-y divide-border">
            {submissions.slice(0, 8).map(s => (
              <div key={s.id} className="px-5 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-lg shrink-0">{subjectEmoji[s.subject] || '📌'}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate text-foreground">{s.title}</p>
                    <p className="text-xs text-muted-foreground capitalize mt-0.5">{s.subject?.replace(/_/g, ' ')} · {format(new Date(s.created_date), 'MMM d')}</p>
                  </div>
                </div>
                {s.quiz_score != null ? (
                  <span className={`text-xs font-black px-2.5 py-1 rounded-full shrink-0 ${
                    s.quiz_score >= PASS_THRESHOLD ? 'bg-emerald-50 text-emerald-600' :
                    s.quiz_score >= 60 ? 'bg-amber-50 text-amber-600' :
                    'bg-rose-50 text-rose-600'}`}>{s.quiz_score}%</span>
                ) : <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full shrink-0">—</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contact */}
      <div className="text-center py-2 space-y-1">
        <p className="text-sm text-muted-foreground">
          Any questions?{' '}
          <a href="mailto:intellixapp.team@gmail.com" className="text-primary font-semibold hover:underline">
            intellixapp.team@gmail.com
          </a>
        </p>
        <p className="text-xs text-muted-foreground">
          <Link to="/terms" className="hover:underline text-primary/70">Terms &amp; Conditions</Link>
        </p>
      </div>

      <Button variant="outline" className="w-full rounded-xl h-11 font-bold text-destructive hover:text-destructive border-destructive/20 hover:bg-destructive/5"
        onClick={() => base44.auth.logout()}>
        <LogOut className="w-4 h-4 mr-2" /> Sign Out
      </Button>
    </div>
  );
}