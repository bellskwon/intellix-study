import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Users, UserPlus, Check, X, Mail, Swords } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { calcLevelInfo, getLeague } from '@/components/shared/LevelXPBar';

const CHALLENGE_SUBJECTS = [
  { value: 'math', label: 'Math', emoji: '🔢' },
  { value: 'science', label: 'Science', emoji: '🔬' },
  { value: 'history', label: 'History', emoji: '📜' },
  { value: 'english', label: 'English', emoji: '📖' },
  { value: 'computer_science', label: 'CS', emoji: '💻' },
  { value: 'geography', label: 'Geography', emoji: '🌍' },
];

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
    navigator.clipboard.writeText(url);
    toast.success(`Challenge link copied! Send it to ${friendEmail.split('@')[0]}.`);
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

export default function Friends() {
  const queryClient = useQueryClient();
  const [emailInput, setEmailInput] = useState('');

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

  // My sent requests
  const sentRequests = allFriendships.filter(f => f.requester_email === user?.email);
  // Requests I received
  const receivedRequests = allFriendships.filter(f => f.recipient_email === user?.email && f.status === 'pending');
  // Accepted friends
  const myFriends = allFriendships.filter(f =>
    f.status === 'accepted' && (f.requester_email === user?.email || f.recipient_email === user?.email)
  ).map(f => f.requester_email === user?.email ? f.recipient_email : f.requester_email);

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

  const getFriendStats = (email) => {
    const subs = allSubmissions.filter(s => s.created_by === email);
    const approved = subs.filter(s => s.status === 'approved');
    const points = approved.reduce((a, b) => a + (b.points_awarded || 0), 0);
    const { level } = calcLevelInfo(subs);
    const league = getLeague(level);
    return { points, level, league, quizCount: approved.length };
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-8">
      <div>
        <h1 className="text-3xl font-black text-foreground tracking-tight">Friends</h1>
        <p className="text-muted-foreground text-sm mt-1.5">Add friends by Gmail, compete on leaderboards together.</p>
      </div>

      {/* Add Friend */}
      <div className="bg-white rounded-2xl border border-border p-5">
        <h2 className="font-black text-sm text-foreground mb-3 flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-primary" /> Add a Friend
        </h2>
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
          <h2 className="font-black text-sm text-foreground mb-3 flex items-center gap-2">
            <Mail className="w-4 h-4 text-amber-500" /> Friend Requests ({receivedRequests.length})
          </h2>
          <div className="space-y-2">
            {receivedRequests.map(req => (
              <div key={req.id} className="bg-white rounded-xl border border-border px-4 py-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl gradient-violet flex items-center justify-center text-white font-black text-sm shrink-0">
                  {req.requester_email[0].toUpperCase()}
                </div>
                <p className="flex-1 text-sm font-semibold text-foreground truncate">{req.requester_email}</p>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" className="rounded-lg h-8 font-bold bg-emerald-500 hover:bg-emerald-600 text-white"
                    onClick={() => respondRequest.mutate({ id: req.id, status: 'accepted' })}>
                    <Check className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" variant="outline" className="rounded-lg h-8"
                    onClick={() => respondRequest.mutate({ id: req.id, status: 'declined' })}>
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
        <h2 className="font-black text-sm text-foreground mb-3 flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" /> My Friends ({myFriends.length})
        </h2>
        {myFriends.length === 0 ? (
          <div className="text-center py-10">
            <svg width="100" height="80" viewBox="0 0 100 80" fill="none" className="mx-auto mb-4 opacity-80">
              <circle cx="36" cy="28" r="14" fill="#ede9fe" stroke="#c4b5fd" strokeWidth="2"/>
              <path d="M36 20 L36 36 M28 28 L44 28" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round"/>
              <circle cx="64" cy="28" r="14" fill="#fce7f3" stroke="#f9a8d4" strokeWidth="2"/>
              <path d="M64 20 L64 36 M56 28 L72 28" stroke="#ec4899" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M22 68 C22 56 30 50 36 50 C42 50 48 54 50 58 C52 54 58 50 64 50 C70 50 78 56 78 68" stroke="#c4b5fd" strokeWidth="2" fill="#ede9fe" strokeLinejoin="round"/>
            </svg>
            <p className="font-bold text-foreground text-sm mb-1">No friends yet</p>
            <p className="text-xs text-muted-foreground">Add someone using their Gmail address above to see how you compare!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {myFriends.map((email, i) => {
              const stats = getFriendStats(email);
              return (
                <motion.div key={email} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3 bg-secondary/30 rounded-xl px-4 py-3">
                  <div className="w-10 h-10 rounded-xl gradient-violet flex items-center justify-center text-white font-black text-sm shrink-0">
                    {email[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">{email}</p>
                    <p className="text-xs text-muted-foreground">{stats.league.emoji} Lv.{stats.level} · {stats.quizCount} quizzes</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-black text-amber-600">{stats.points.toLocaleString()} pts</p>
                    <p className="text-xs text-muted-foreground">{stats.league.name}</p>
                  </div>
                  <ChallengeButton friendEmail={email} />
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
                <p className="text-sm text-muted-foreground flex-1 truncate">{req.recipient_email}</p>
                <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Pending</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-center py-4 border-t border-border">
        <p className="text-sm text-muted-foreground">Any questions? <a href="mailto:intellixapp.team@gmail.com" className="text-primary font-semibold hover:underline">intellixapp.team@gmail.com</a></p>
      </div>
    </div>
  );
}