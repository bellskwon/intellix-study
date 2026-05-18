import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { UserPlus, Check, X, Mail, Swords, UserMinus, Trophy, Crown, Star, Zap, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { calcLevelInfo, getLeague } from '@/components/shared/LevelXPBar';
import UserProfileModal from '@/pages/UserProfileModal';
import SubjectIcon from '@/pages/SubjectIcon';

const CHALLENGE_SUBJECTS = [
  { value: 'math', label: 'Math', emoji: '🔢' },
  { value: 'science', label: 'Science', emoji: '🔬' },
  { value: 'history', label: 'History', emoji: '📜' },
  { value: 'english', label: 'English', emoji: '📖' },
  { value: 'computer_science', label: 'CS', emoji: '💻' },
  { value: 'geography', label: 'Geography', emoji: '🌍' },
];

function FriendAvatar({ email, userMap, size = 'md' }) {
  const u = userMap[email];
  const name = u?.display_name || u?.full_name || email.split('@')[0];
  const initial = name[0]?.toUpperCase() || '?';
  const dim = size === 'sm' ? 'w-9 h-9 text-sm' : 'w-10 h-10 text-sm';
  const radius = size === 'sm' ? 'rounded-xl' : 'rounded-xl';
  if (u?.avatar_image_url) {
    return <img src={u.avatar_image_url} alt={name} className={`${dim} ${radius} object-cover shrink-0`} />;
  }
  return (
    <div className={`${dim} ${radius} gradient-violet flex items-center justify-center text-white font-black shrink-0`}>
      {u?.avatar_emoji || initial}
    </div>
  );
}

function ChallengeButton({ friendEmail }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const sendChallenge = (subject) => {
    const url = `${window.location.origin}/challenge?subject=${subject}&challenger=${encodeURIComponent(friendEmail)}`;
    try {
      navigator.clipboard.writeText(url);
      toast.success(`Challenge link copied! Send it to ${friendEmail.split('@')[0]}.`);
    } catch {
      toast.error('Could not copy link. Please copy it manually.');
    }
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        title="Challenge friend"
        className="p-1.5 rounded-lg text-muted-foreground hover:text-violet-600 hover:bg-violet-50 transition-colors">
        <Swords className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-20 bg-white rounded-xl border border-border shadow-xl p-3 w-44">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-2">Challenge subject</p>
          <div className="space-y-1">
            {CHALLENGE_SUBJECTS.map(s => (
              <button key={s.value} onClick={() => sendChallenge(s.value)}
                className="w-full text-left px-2 py-1.5 rounded-lg text-xs font-semibold text-foreground hover:bg-secondary transition-colors flex items-center gap-2">
                <span>{s.emoji}</span> {s.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const LB_TABS = [
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

export default function Friends() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('friends');
  const [lbTab, setLbTab] = useState('points');
  const [emailInput, setEmailInput] = useState('');
  const [selectedEmail, setSelectedEmail] = useState(null);

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });

  const { data: allFriendships = [] } = useQuery({
    queryKey: ['friendships'],
    queryFn: () => base44.entities.Friendship.list('-created_date', 100),
    enabled: !!user?.email,
  });

  const { data: allSubmissions = [] } = useQuery({
    queryKey: ['allSubmissionsLeaderboard'],
    queryFn: () => base44.entities.Submission.list('-created_date', 500),
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
  });

  const userMap = Object.fromEntries(allUsers.map(u => [u.email, u]));
  const getName = (email) => {
    const u = userMap[email];
    return u?.display_name || u?.full_name || email.split('@')[0];
  };
  // My sent requests
  const sentRequests = allFriendships.filter(f => f.requester_email === user?.email);
  // Requests I received
  const receivedRequests = allFriendships.filter(f => f.recipient_email === user?.email && f.status === 'pending');
  // Accepted friends
  const myFriends = allFriendships.filter(f =>
    f.status === 'accepted' && (f.requester_email === user?.email || f.recipient_email === user?.email)
  ).map(f => ({
    email: f.requester_email === user?.email ? f.recipient_email : f.requester_email,
    friendshipId: f.id,
  }));

  const sendRequest = useMutation({
    mutationFn: async (email) => {
      if (email === user?.email) throw new Error("You can't add yourself!");
      const existing = allFriendships.find(f =>
        (f.requester_email === user?.email && f.recipient_email === email) ||
        (f.requester_email === email && f.recipient_email === user?.email)
      );
      if (existing) throw new Error('Friend request already exists');
      return base44.entities.Friendship.create({ requester_email: user.email, recipient_email: email, status: 'pending' });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['friendships'] }); toast.success('Friend request sent!'); setEmailInput(''); },
    onError: (e) => toast.error(e.message || 'Could not send request'),
  });

  const respondRequest = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Friendship.update(id, { status }),
    onSuccess: (_, { status }) => { queryClient.invalidateQueries({ queryKey: ['friendships'] }); toast.success(status === 'accepted' ? 'Friend added!' : 'Request declined'); },
  });

  const removeFriend = useMutation({
    mutationFn: (id) => base44.entities.Friendship.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['friendships'] }); toast.success('Friend removed'); },
    onError: () => toast.error('Could not remove friend'),
  });

  const buildProfileData = (email) => {
    const u = userMap[email];
    const friendship = allFriendships.find(f =>
      (f.requester_email === user?.email && f.recipient_email === email) ||
      (f.requester_email === email && f.recipient_email === user?.email)
    ) || null;
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
      submissions: allSubmissions.filter(s => s.created_by === email),
      friendship,
    };
  };

  const getFriendStats = (email) => {
    const subs = allSubmissions.filter(s => s.created_by === email);
    const approved = subs.filter(s => s.status === 'approved');
    const points = approved.reduce((a, b) => a + (b.points_awarded || 0), 0);
    const { level } = calcLevelInfo(subs, userMap[email]?.xp_bonus || 0);
    const league = getLeague(level);
    return { points, level, league, quizCount: approved.length };
  };

  const lbBoard = allUsers.map(u => {
    const subs = allSubmissions.filter(s => s.created_by === u.email);
    const approved = subs.filter(s => s.status === 'approved');
    const points = approved.reduce((a, b) => a + (b.points_awarded || 0), 0);
    const correctAnswers = approved.reduce((a, b) => {
      if (b.quiz_score != null) return a + Math.round((b.quiz_score / 100) * 8);
      return a;
    }, 0);
    const { level } = calcLevelInfo(subs, u.xp_bonus || 0);
    const league = getLeague(level);
    const displayName = u.display_name || u.full_name || 'Anonymous';
    return { ...u, displayName, avatarLetter: displayName[0]?.toUpperCase() || '?', avatarImg: u.avatar_image_url || null, points, correctAnswers, level, league, quizCount: approved.length };
  }).filter(u => u.quizCount > 0 || u.email === user?.email);

  const lbSorted = [...lbBoard].sort((a, b) =>
    lbTab === 'points' ? b.points - a.points :
    lbTab === 'correct' ? b.correctAnswers - a.correctAnswers :
    b.level - a.level
  );
  const lbTop5 = lbSorted.slice(0, 5);
  const myRank = lbSorted.findIndex(u => u.email === user?.email) + 1;
  const myData = lbSorted.find(u => u.email === user?.email);
  const topPct = myRank > 0 && lbSorted.length > 0 ? Math.max(1, Math.round((myRank / lbSorted.length) * 100)) : null;
  const getLbValue = (u) =>
    lbTab === 'points' ? `${u.points.toLocaleString()} pts` :
    lbTab === 'correct' ? `${u.correctAnswers} correct` : `Lv.${u.level}`;
  const podiumSlots = lbTop5.length >= 3
    ? [{ user: lbTop5[1], rank: 2 }, { user: lbTop5[0], rank: 1 }, { user: lbTop5[2], rank: 3 }]
    : lbTop5.map((u, i) => ({ user: u, rank: i + 1 }));

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-8">
      <div>
        <h1 className="text-3xl font-black text-foreground tracking-tight font-sora">Social</h1>
        <p className="text-muted-foreground text-sm mt-1.5">Add friends, see what they're studying, and challenge each other.</p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1.5 p-1.5 bg-secondary rounded-2xl">
        <button onClick={() => setActiveTab('friends')}
          className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-bold py-2.5 rounded-xl transition-all ${activeTab === 'friends' ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
          <UserPlus className="w-3.5 h-3.5" /> Friends
        </button>
        <button onClick={() => setActiveTab('leaderboard')}
          className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-bold py-2.5 rounded-xl transition-all ${activeTab === 'leaderboard' ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
          <Trophy className="w-3.5 h-3.5" /> Leaderboard
        </button>
      </div>

      {activeTab === 'leaderboard' && (
        <div className="space-y-5">
          {/* Weekly prizes */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-muted-foreground mr-1">Weekly prizes:</span>
            {[{ place: '1st', pts: 5, color: 'text-amber-600 bg-amber-50' }, { place: '2nd', pts: 4, color: 'text-slate-600 bg-slate-50' }, { place: '3rd', pts: 3, color: 'text-orange-700 bg-orange-50' }, { place: '4th', pts: 2, color: 'text-violet-600 bg-violet-50' }, { place: '5th', pts: 1, color: 'text-cyan-600 bg-cyan-50' }].map(a => (
              <div key={a.place} className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${a.color}`}>{a.place} · +{a.pts} pts</div>
            ))}
          </div>
          {/* Stat tabs */}
          <div className="flex gap-1.5 p-1.5 bg-secondary rounded-2xl">
            {LB_TABS.map(t => (
              <button key={t.key} onClick={() => setLbTab(t.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-bold py-2.5 rounded-xl transition-all ${lbTab === t.key ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                <t.icon className="w-3.5 h-3.5" />{t.label}
              </button>
            ))}
          </div>
          {/* Podium */}
          {lbTop5.length > 0 && (
            <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-amber-50 dark:from-purple-950/20 dark:via-pink-950/10 dark:to-amber-950/20 rounded-3xl p-6 border border-purple-100 dark:border-purple-900/40">
              <p className="text-center text-xs font-black text-muted-foreground uppercase tracking-widest mb-6">Top 5</p>
              {lbTop5.length >= 3 && (
                <div className="flex items-end justify-center gap-3 mb-5">
                  {podiumSlots.map(({ user: u, rank }) => {
                    const s = RANK_STYLES[rank - 1];
                    const isMe = u?.email === user?.email;
                    return (
                      <motion.div key={u?.id} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: (rank - 1) * 0.12 }}
                        onClick={() => u?.email && setSelectedEmail(u.email)}
                        className="flex flex-col items-center gap-2 cursor-pointer">
                        {rank === 1 && <Crown className="w-6 h-6 text-amber-500 animate-bounce" />}
                        <div className={`${s.size} rounded-2xl bg-gradient-to-br ${s.bg} flex items-center justify-center text-white font-black text-xl shadow-lg overflow-hidden ${isMe ? 'ring-4 ring-white ring-offset-2' : ''}`}>
                          {u?.avatarImg ? <img src={u.avatarImg} alt={u.displayName} className="w-full h-full object-cover" /> : (u?.avatar_emoji || u?.avatarLetter || '?')}
                        </div>
                        <p className="text-xs font-black text-foreground text-center max-w-[72px] truncate">{u?.displayName?.split(' ')[0]}</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${s.badge} font-outfit font-black ${s.text}`}>{s.label}</span>
                        <p className="text-xs font-bebas tracking-wide text-muted-foreground">{getLbValue(u)}</p>
                        <div className={`bg-gradient-to-b ${s.bg} rounded-t-xl w-16 shadow-md`} style={{ height: s.podiumH }} />
                      </motion.div>
                    );
                  })}
                </div>
              )}
              {lbTop5.length >= 4 && (
                <div className="flex gap-3 mt-2">
                  {lbTop5.slice(3, 5).map((u, i) => {
                    const rank = i + 4;
                    const s = RANK_STYLES[rank - 1];
                    const isMe = u?.email === user?.email;
                    return (
                      <motion.div key={u?.id} initial={{ opacity: 0, x: i === 0 ? -20 : 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.1 }}
                        onClick={() => u?.email && setSelectedEmail(u.email)}
                        className={`flex-1 bg-white rounded-2xl border-2 p-3 flex items-center gap-3 cursor-pointer hover:border-primary/30 transition-colors ${isMe ? 'border-primary/40 bg-primary/5' : 'border-border'}`}>
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.bg} flex items-center justify-center text-white font-black text-sm shrink-0 overflow-hidden`}>
                          {u?.avatarImg ? <img src={u.avatarImg} alt={u.displayName} className="w-full h-full object-cover" /> : (u?.avatar_emoji || u?.avatarLetter || '?')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-black truncate">{u?.displayName?.split(' ')[0]}</p>
                          <p className="text-xs font-bebas tracking-wide text-muted-foreground">{getLbValue(u)}</p>
                        </div>
                        <span className={`text-xs font-outfit font-black ${s.text} ${s.badge} px-2 py-0.5 rounded-full`}>{s.label}</span>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          {/* My rank */}
          {myRank > 5 && myData && (
            <div className="bg-gradient-to-r from-violet-50 to-purple-50 border-2 border-primary/20 rounded-2xl px-4 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl gradient-violet flex items-center justify-center text-white font-black shadow-md overflow-hidden">
                    {myData?.avatarImg ? <img src={myData.avatarImg} alt={myData.displayName} className="w-full h-full object-cover" /> : (user?.avatar_emoji || user?.display_name?.[0] || '?')}
                  </div>
                  <div>
                    <p className="text-sm font-black text-foreground">Your Rank: <span className="text-primary">#{myRank}</span></p>
                    <p className="text-xs text-muted-foreground">{myData.league.emoji} {myData.league.name} · Top {topPct}%</p>
                  </div>
                </div>
                <p className="text-lg font-black text-primary">{getLbValue(myData)}</p>
              </div>
            </div>
          )}
          {/* Full list */}
          <div className="bg-white rounded-2xl border border-border overflow-hidden">
            <div className="px-5 py-3 border-b border-border flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground">{lbSorted.length} Students</p>
              <p className="text-xs text-muted-foreground">Sorted by {LB_TABS.find(t => t.key === lbTab)?.label}</p>
            </div>
            {lbSorted.length === 0 ? (
              <div className="text-center py-16">
                <Trophy className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-base font-bold text-foreground">No students yet</p>
                <p className="text-sm text-muted-foreground">Complete a quiz to appear here!</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {lbSorted.map((student, i) => {
                  const isMe = student.email === user?.email;
                  const rank = i + 1;
                  const s = rank <= 5 ? RANK_STYLES[rank - 1] : null;
                  return (
                    <motion.div key={student.id || student.email}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i * 0.02, 0.4) }}
                      onClick={() => setSelectedEmail(student.email)}
                      className={`px-5 py-3.5 flex items-center gap-4 transition-colors cursor-pointer ${isMe ? 'bg-primary/5' : 'hover:bg-secondary/30'}`}>
                      <div className="w-8 text-center shrink-0">
                        {s ? <span className={`text-xs font-black ${s.badge} ${s.text} px-1.5 py-0.5 rounded-full`}>{s.label}</span>
                           : <span className="text-sm font-bold text-muted-foreground">#{rank}</span>}
                      </div>
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 overflow-hidden ${s ? `bg-gradient-to-br ${s.bg} text-white` : isMe ? 'gradient-violet text-white' : 'bg-secondary text-foreground'}`}>
                        {student.avatarImg ? <img src={student.avatarImg} alt={student.displayName} className="w-full h-full object-cover" /> : (student.avatar_emoji || student.avatarLetter || '?')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold truncate ${isMe ? 'text-primary' : 'text-foreground'}`}>
                          {student.displayName || 'Anonymous'}{isMe && <span className="ml-1 text-xs font-normal opacity-60">(You)</span>}
                        </p>
                        <p className="text-xs text-muted-foreground">{student.league.emoji} {student.league.name} · Lv.{student.level}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-sm font-black ${rank <= 3 ? s.text : 'text-foreground'}`}>{getLbValue(student)}</p>
                        {lbSorted.length > 1 && <p className="text-[10px] text-muted-foreground mt-0.5">Top {Math.max(1, Math.round((rank / lbSorted.length) * 100))}%</p>}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'friends' && (<>

      {/* Add Friend */}
      <div className="bg-white rounded-2xl border border-border p-5">
        <h2 className="font-semibold text-sm text-muted-foreground mb-3">Add a Friend</h2>
        <div className="flex gap-2">
          <Input
            placeholder="Enter their Gmail address..."
            value={emailInput}
            onChange={e => setEmailInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && emailInput.trim()) sendRequest.mutate(emailInput.trim()); }}
            className="h-11 rounded-xl flex-1"
            type="email"
          />
          <Button
            onClick={() => emailInput.trim() && sendRequest.mutate(emailInput.trim())}
            disabled={sendRequest.isPending || !emailInput.trim()}
            className="rounded-xl font-bold h-11 px-5">
            <UserPlus className="w-4 h-4 mr-1.5" /> Add
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">They'll receive a friend request — once they accept, you'll both see each other here.</p>
      </div>

      {/* Pending Requests */}
      {receivedRequests.length > 0 && (
        <div className="bg-white rounded-2xl border border-amber-200 bg-amber-50/50 p-5">
          <h2 className="font-semibold text-sm text-muted-foreground mb-3">Friend Requests ({receivedRequests.length})</h2>
          <div className="space-y-2">
            {receivedRequests.map(req => (
              <div key={req.id} className="bg-white rounded-xl border border-border px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-secondary/20 transition-colors"
                onClick={() => setSelectedEmail(req.requester_email)}>
                <FriendAvatar email={req.requester_email} userMap={userMap} size="sm" />
                <p className="flex-1 text-sm font-semibold text-foreground truncate">{getName(req.requester_email)}</p>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" className="rounded-lg h-8 font-bold bg-emerald-500 hover:bg-emerald-600 text-white"
                    onClick={(e) => { e.stopPropagation(); respondRequest.mutate({ id: req.id, status: 'accepted' }); }}>
                    <Check className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" variant="outline" className="rounded-lg h-8"
                    onClick={(e) => { e.stopPropagation(); respondRequest.mutate({ id: req.id, status: 'declined' }); }}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Friends List */}
      <div className="bg-white rounded-2xl border border-border p-5">
        <h2 className="font-semibold text-sm text-muted-foreground mb-3">My Friends ({myFriends.length})</h2>
        {myFriends.length === 0 ? (
          <div className="text-center py-10">
            <svg width="120" height="80" viewBox="0 0 120 80" fill="none" className="mx-auto mb-4 opacity-80">
              {/* Person 1 */}
              <circle cx="38" cy="22" r="12" fill="#ede9fe" stroke="#c4b5fd" strokeWidth="2"/>
              <circle cx="38" cy="20" r="7" fill="#c4b5fd"/>
              <path d="M18 70 C18 54 28 47 38 47 C48 47 58 54 58 70" fill="#ede9fe" stroke="#c4b5fd" strokeWidth="2" strokeLinejoin="round"/>
              {/* Person 2 */}
              <circle cx="82" cy="22" r="12" fill="#fce7f3" stroke="#f9a8d4" strokeWidth="2"/>
              <circle cx="82" cy="20" r="7" fill="#f9a8d4"/>
              <path d="M62 70 C62 54 72 47 82 47 C92 47 102 54 102 70" fill="#fce7f3" stroke="#f9a8d4" strokeWidth="2" strokeLinejoin="round"/>
            </svg>
            <p className="font-bold text-foreground text-sm mb-1">No friends yet</p>
            <p className="text-xs text-muted-foreground">Add someone using their Gmail address above to see how you compare!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {myFriends.map(({ email, friendshipId }, i) => {
              const stats = getFriendStats(email);
              return (
                <motion.div key={email} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  onClick={() => setSelectedEmail(email)}
                  className="flex items-center gap-3 bg-secondary/30 rounded-xl px-4 py-3 cursor-pointer hover:bg-secondary/50 transition-colors">
                  <FriendAvatar email={email} userMap={userMap} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">{getName(email)}</p>
                    <p className="text-xs text-muted-foreground">{stats.league.emoji} Lv.{stats.level} · {stats.quizCount} quizzes</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-black text-amber-600">{stats.points.toLocaleString()} pts</p>
                    <p className="text-xs text-muted-foreground">{stats.league.name}</p>
                  </div>
                  <ChallengeButton friendEmail={email} />
                  <button
                    onClick={(e) => { e.stopPropagation(); removeFriend.mutate(friendshipId); }}
                    title="Remove friend"
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-50 transition-colors">
                    <UserMinus className="w-4 h-4" />
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pending Sent */}
      {sentRequests.filter(r => r.status === 'pending').length > 0 && (
        <div className="bg-white rounded-2xl border border-border p-5">
          <h2 className="font-black text-sm text-muted-foreground mb-3">Pending Sent Requests</h2>
          <div className="space-y-2">
            {sentRequests.filter(r => r.status === 'pending').map(req => (
              <div key={req.id} className="flex items-center gap-3 px-4 py-3 bg-secondary/30 rounded-xl">
                <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                <p className="text-sm text-muted-foreground flex-1 truncate">{getName(req.recipient_email)}</p>
                <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Pending</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Friends Activity Feed */}
      {(() => {
        const friendEmails = myFriends.map(f => f.email);
        const friendShareMap = Object.fromEntries(allUsers.map(u => [u.email, u.share_stats !== false]));
        const activity = allSubmissions
          .filter(s => friendEmails.includes(s.created_by) && s.quiz_score != null)
          .slice(0, 8);
        if (activity.length === 0) return null;
        return (
          <div className="bg-white rounded-2xl border border-border p-5">
            <h2 className="font-semibold text-sm text-muted-foreground mb-3">Friends Activity</h2>
            <div className="space-y-2">
              {activity.map((s, i) => (
                <motion.div key={s.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary/40 transition-colors cursor-pointer"
                  onClick={() => setSelectedEmail(s.created_by)}>
                  <FriendAvatar email={s.created_by} userMap={userMap} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">{getName(s.created_by)}</p>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1 flex-wrap">
                      <SubjectIcon subject={s.subject} size="xs" />
                      <span className="capitalize">{s.subject?.replace(/_/g, ' ')}</span>
                      <span>·</span>
                      <span>{formatDistanceToNow(new Date(s.created_date), { addSuffix: true })}</span>
                    </p>
                  </div>
                  {friendShareMap[s.created_by] ? (
                    <span className={`text-sm font-black shrink-0 px-2 py-0.5 rounded-full ${
                      s.quiz_score >= 80 ? 'bg-emerald-50 text-emerald-600' :
                      s.quiz_score >= 60 ? 'bg-amber-50 text-amber-600' :
                      'bg-rose-50 text-rose-500'}`}>
                      {s.quiz_score}%
                    </span>
                  ) : (
                    <span className="text-xs font-semibold shrink-0 px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">Studied</span>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        );
      })()}

      <div className="text-center py-4 border-t border-border">
        <p className="text-sm text-muted-foreground">Any questions? <a href="mailto:intellix.study.app@gmail.com" className="text-primary font-semibold hover:underline">intellix.study.app@gmail.com</a></p>
      </div>
      </>)}

      {selectedEmail && (
        <UserProfileModal
          {...buildProfileData(selectedEmail)}
          currentUserEmail={user?.email}
          onAddFriend={(email) => sendRequest.mutate(email)}
          onRemoveFriend={(id) => removeFriend.mutate(id)}
          onClose={() => setSelectedEmail(null)}
        />
      )}
    </div>
  );
}