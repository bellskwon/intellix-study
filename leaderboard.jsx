import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Trophy, Crown, TrendingUp, Star, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { calcLevelInfo, getLeague } from '@/components/shared/LevelXPBar';
import UserProfileModal from '@/pages/UserProfileModal';
import { toast } from 'sonner';

const TABS = [
  { key: 'points', label: 'Points', icon: Star },
  { key: 'correct', label: 'Correct Answers', icon: Zap },
  { key: 'level', label: 'Level', icon: TrendingUp },
];

const RANK_STYLES = [
  { bg: 'from-amber-400 to-yellow-500', text: 'text-amber-600', badge: 'bg-amber-100', label: '1st', size: 'w-16 h-16', podiumH: 120 },
  { bg: 'from-slate-300 to-slate-400', text: 'text-slate-600', badge: 'bg-slate-100', label: '2nd', size: 'w-14 h-14', podiumH: 90 },
  { bg: 'from-amber-600 to-orange-700', text: 'text-amber-800', badge: 'bg-amber-50', label: '3rd', size: 'w-12 h-12', podiumH: 70 },
  { bg: 'from-violet-400 to-purple-500', text: 'text-violet-600', badge: 'bg-violet-50', label: '4th', size: 'w-12 h-12', podiumH: 0 },
  { bg: 'from-cyan-400 to-teal-500', text: 'text-cyan-600', badge: 'bg-cyan-50', label: '5th', size: 'w-12 h-12', podiumH: 0 },
];

export default function Leaderboard() {
  const [tab, setTab] = useState('points');
  const [selectedEmail, setSelectedEmail] = useState(null);
  const queryClient = useQueryClient();

  const { data: users = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
  });
  const { data: submissions = [] } = useQuery({
    queryKey: ['allSubmissionsLeaderboard'],
    queryFn: () => base44.entities.Submission.list('-created_date', 500),
  });
  const { data: me } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });
  const { data: allFriendships = [] } = useQuery({
    queryKey: ['friendships'],
    queryFn: () => base44.entities.Friendship.list('-created_date', 100),
    enabled: !!me?.email,
  });

  const sendRequest = useMutation({
    mutationFn: (email) => base44.entities.Friendship.create({ requester_email: me.email, recipient_email: email, status: 'pending' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['friendships'] }); toast.success('Friend request sent!'); },
    onError: (e) => toast.error(e.message || 'Could not send request'),
  });

  const removeFriend = useMutation({
    mutationFn: (id) => base44.entities.Friendship.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['friendships'] }); toast.success('Friend removed'); },
  });

  const userMap = Object.fromEntries(users.map(u => [u.email, u]));

  const buildProfileData = (email) => {
    const u = userMap[email];
    return {
      targetUser: {
        email,
        displayName: u?.display_name || u?.full_name || email.split('@')[0],
        avatar_emoji: u?.avatar_emoji,
        avatar_color: u?.avatar_color,
        avatar_image_url: u?.avatar_image_url,
        xp_bonus: u?.xp_bonus,
        share_stats: u?.share_stats,
      },
      submissions: submissions.filter(s => s.created_by === email),
      friendship: allFriendships.find(f =>
        (f.requester_email === me?.email && f.recipient_email === email) ||
        (f.requester_email === email && f.recipient_email === me?.email)
      ) || null,
    };
  };

  const board = users.map(u => {
    const subs = submissions.filter(s => s.created_by === u.email);
    const approvedSubs = subs.filter(s => s.status === 'approved');
    const points = approvedSubs.reduce((a, b) => a + (b.points_awarded || 0), 0);
    const correctAnswers = approvedSubs.reduce((a, b) => {
      if (b.quiz_score != null) {
        const approxCorrect = Math.round((b.quiz_score / 100) * 8);
        return a + approxCorrect;
      }
      return a;
    }, 0);
    const { level } = calcLevelInfo(subs, u.xp_bonus || 0);
    const league = getLeague(level);
    // Use display_name if available, fallback to full_name
    const displayName = u.display_name || u.full_name || 'Anonymous';
    const avatarLetter = displayName[0]?.toUpperCase() || '?';
    const avatarImg = u.avatar_image_url || null;
    return { ...u, displayName, avatarLetter, avatarImg, points, correctAnswers, level, league, quizCount: approvedSubs.length };
  }).filter(u => u.quizCount > 0 || u.email === me?.email);

  const sorted = [...board].sort((a, b) =>
    tab === 'points' ? b.points - a.points :
    tab === 'correct' ? b.correctAnswers - a.correctAnswers :
    b.level - a.level
  );

  const top5 = sorted.slice(0, 5);
  const myRank = sorted.findIndex(u => u.email === me?.email) + 1;
  const myData = sorted.find(u => u.email === me?.email);
  const topPct = myRank > 0 && sorted.length > 0 ? Math.max(1, Math.round((myRank / sorted.length) * 100)) : null;

  const getValue = (u) =>
    tab === 'points' ? `${u.points.toLocaleString()} pts` :
    tab === 'correct' ? `${u.correctAnswers} correct` :
    `Lv.${u.level}`;

  const WEEKLY_AWARDS = [
    { place: '1st', pts: 5, color: 'text-amber-600 bg-amber-50' },
    { place: '2nd', pts: 4, color: 'text-slate-600 bg-slate-50' },
    { place: '3rd', pts: 3, color: 'text-orange-700 bg-orange-50' },
    { place: '4th', pts: 2, color: 'text-violet-600 bg-violet-50' },
    { place: '5th', pts: 1, color: 'text-cyan-600 bg-cyan-50' },
  ];

  // Podium order: 2nd, 1st, 3rd (display)
  const podiumSlots = top5.length >= 3
    ? [{ user: top5[1], rank: 2 }, { user: top5[0], rank: 1 }, { user: top5[2], rank: 3 }]
    : top5.map((u, i) => ({ user: u, rank: i + 1 }));

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight font-sora">Leaderboard</h1>
          <p className="text-muted-foreground text-sm mt-1.5">Top 5 earn bonus points every week.</p>
        </div>
        {myRank > 0 && topPct && (
          <div className="flex items-center gap-2 bg-primary/10 rounded-xl px-3 py-2 shrink-0">
            <span className="text-sm font-black text-primary">#{myRank}</span>
            <span className="text-xs text-muted-foreground">Top {topPct}%</span>
          </div>
        )}
      </div>

      {/* Weekly Awards */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold text-muted-foreground mr-1">Weekly prizes:</span>
        {WEEKLY_AWARDS.map(a => (
          <div key={a.place} className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${a.color}`}>
            {a.place} · +{a.pts} pts
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 p-1.5 bg-secondary rounded-2xl">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-bold py-2.5 rounded-xl transition-all ${
              tab === t.key ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}>
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Top 5 Podium */}
      {top5.length > 0 && (
        <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-amber-50 dark:from-purple-950/20 dark:via-pink-950/10 dark:to-amber-950/20 rounded-3xl p-6 border border-purple-100 dark:border-purple-900/40">
          <p className="text-center text-xs font-black text-muted-foreground uppercase tracking-widest mb-6">Top 5</p>

          {/* Top 3 podium */}
          {top5.length >= 3 && (
            <div className="flex items-end justify-center gap-3 mb-5">
              {podiumSlots.map(({ user, rank }) => {
                const style = RANK_STYLES[rank - 1];
                const isMe = user?.email === me?.email;
                return (
                  <motion.div key={user?.id} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: (rank - 1) * 0.12 }}
                    onClick={() => user?.email && setSelectedEmail(user.email)}
                    className="flex flex-col items-center gap-2 cursor-pointer group">
                    {rank === 1 && <Crown className="w-6 h-6 text-amber-500 animate-bounce" />}
                    <div className={`${style.size} rounded-2xl bg-gradient-to-br ${style.bg} flex items-center justify-center text-white font-black text-xl shadow-lg overflow-hidden ${isMe ? 'ring-4 ring-white ring-offset-2' : ''}`}>
                      {user?.avatarImg ? (
                        <img src={user.avatarImg} alt={user.displayName} className="w-full h-full object-cover" />
                      ) : (user?.avatar_emoji || user?.avatarLetter || '?')}
                    </div>
                    <p className="text-xs font-black text-foreground text-center max-w-[72px] truncate">
                      {user?.displayName?.split(' ')[0] || user?.full_name?.split(' ')[0]}
                    </p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${style.badge} font-outfit font-black ${style.text}`}>
                      {style.label}
                    </span>
                    <p className="text-xs font-bebas tracking-wide text-muted-foreground">{getValue(user)}</p>
                    {/* Podium bar */}
                    <div className={`bg-gradient-to-b ${style.bg} rounded-t-xl w-16 shadow-md`}
                      style={{ height: style.podiumH }} />
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* 4th and 5th */}
          {top5.length >= 4 && (
            <div className="flex gap-3 mt-2">
              {top5.slice(3, 5).map((user, i) => {
                const rank = i + 4;
                const style = RANK_STYLES[rank - 1];
                const isMe = user?.email === me?.email;
                return (
                  <motion.div key={user?.id} initial={{ opacity: 0, x: i === 0 ? -20 : 20 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.1 }}
                    onClick={() => user?.email && setSelectedEmail(user.email)}
                    className={`flex-1 bg-white rounded-2xl border-2 p-3 flex items-center gap-3 cursor-pointer hover:border-primary/30 transition-colors ${isMe ? 'border-primary/40 bg-primary/5' : 'border-border'}`}>
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${style.bg} flex items-center justify-center text-white font-black text-sm shrink-0 overflow-hidden`}>
                      {user?.avatarImg ? (
                        <img src={user.avatarImg} alt={user.displayName} className="w-full h-full object-cover" />
                      ) : (user?.avatar_emoji || user?.avatarLetter || '?')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black truncate">{user?.displayName?.split(' ')[0] || user?.full_name?.split(' ')[0]}</p>
                      <p className="text-xs font-bebas tracking-wide text-muted-foreground">{getValue(user)}</p>
                    </div>
                    <span className={`text-xs font-outfit font-black ${style.text} ${style.badge} px-2 py-0.5 rounded-full`}>{style.label}</span>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* My rank banner */}
      {myRank > 5 && myData && (
        <div className="bg-gradient-to-r from-violet-50 to-purple-50 border-2 border-primary/20 rounded-2xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gradient-violet flex items-center justify-center text-white font-black shadow-md overflow-hidden">
                {myData?.avatarImg ? (
                  <img src={myData.avatarImg} alt={myData.displayName} className="w-full h-full object-cover" />
                ) : (me?.avatar_emoji || me?.display_name?.[0] || me?.full_name?.[0] || '?')}
              </div>
              <div>
                <p className="text-sm font-black text-foreground">Your Rank: <span className="text-primary">#{myRank}</span></p>
                <p className="text-xs text-muted-foreground">{myData.league.emoji} {myData.league.name} · Top {topPct}%</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-black text-primary">{getValue(myData)}</p>
            </div>
          </div>
          {myRank > 1 && sorted[myRank - 2] && (
            <div className="mt-2 pt-2 border-t border-primary/10">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-primary" />
                {(() => {
                  const above = sorted[myRank - 2];
                  const diffPts = above.points - myData.points;
                  const diffCorrect = above.correctAnswers - myData.correctAnswers;
                  const diffLv = above.level - myData.level;
                  const diff = tab === 'points' ? diffPts : tab === 'correct' ? diffCorrect : diffLv;
                  return diff > 0
                    ? `${diff} ${tab === 'correct' ? 'correct answers' : tab} behind rank #${myRank - 1} — keep going!`
                    : `You're tied with rank #${myRank - 1}!`;
                })()}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Full list */}
      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <p className="text-xs font-semibold text-muted-foreground">{sorted.length} Students</p>
          <p className="text-xs text-muted-foreground">Sorted by {TABS.find(t => t.key === tab)?.label}</p>
        </div>
        {sorted.length === 0 ? (
          <div className="text-center py-16">
            <Trophy className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-base font-bold text-foreground">No students yet</p>
            <p className="text-sm text-muted-foreground">Complete a quiz to appear here!</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {sorted.map((student, i) => {
              const isMe = student.email === me?.email;
              const rank = i + 1;
              const style = rank <= 5 ? RANK_STYLES[rank - 1] : null;
              return (
                <motion.div key={student.id || student.email}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i * 0.02, 0.4) }}
                  onClick={() => setSelectedEmail(student.email)}
                  className={`px-5 py-3.5 flex items-center gap-4 transition-colors cursor-pointer ${isMe ? 'bg-primary/5' : 'hover:bg-secondary/30'}`}>
                  {/* Rank */}
                  <div className="w-8 text-center shrink-0">
                    {style ? (
                      <span className={`text-xs font-black ${style.badge} ${style.text} px-1.5 py-0.5 rounded-full`}>{style.label}</span>
                    ) : (
                      <span className="text-sm font-bold text-muted-foreground">#{rank}</span>
                    )}
                  </div>
                  {/* Avatar */}
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 overflow-hidden ${
                    style ? `bg-gradient-to-br ${style.bg} text-white` : isMe ? 'gradient-violet text-white' : 'bg-secondary text-foreground'
                  }`}>
                    {student.avatarImg ? (
                      <img src={student.avatarImg} alt={student.displayName} className="w-full h-full object-cover" />
                    ) : (student.avatar_emoji || student.avatarLetter || '?')}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold truncate ${isMe ? 'text-primary' : 'text-foreground'}`}>
                      {student.displayName || 'Anonymous'}
                      {isMe && <span className="ml-1 text-xs font-normal opacity-60">(You)</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {student.league.emoji} {student.league.name} · Lv.{student.level}
                    </p>
                  </div>
                  {/* Value */}
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-black ${rank <= 3 ? style.text : 'text-foreground'}`}>
                      {getValue(student)}
                    </p>
                    {rank <= sorted.length && sorted.length > 1 && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Top {Math.max(1, Math.round((rank / sorted.length) * 100))}%
                      </p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <div className="text-center py-4 border-t border-border">
        <p className="text-xs text-muted-foreground">
          Questions?{' '}
          <a href="mailto:intellix.study.app@gmail.com" className="text-primary font-semibold hover:underline">
            intellix.study.app@gmail.com
          </a>
        </p>
      </div>

      {selectedEmail && (
        <UserProfileModal
          {...buildProfileData(selectedEmail)}
          currentUserEmail={me?.email}
          onAddFriend={(email) => sendRequest.mutate(email)}
          onRemoveFriend={(id) => removeFriend.mutate(id)}
          onClose={() => setSelectedEmail(null)}
        />
      )}
    </div>
  );
}