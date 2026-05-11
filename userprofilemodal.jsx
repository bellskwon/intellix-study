import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserPlus, UserMinus, UserCheck, Clock } from 'lucide-react';
import { calcLevelInfo, getLeague } from '@/components/shared/LevelXPBar';

const SUBJECT_COLORS = {
  math:             'bg-blue-100 text-blue-700',
  science:          'bg-green-100 text-green-700',
  history:          'bg-amber-100 text-amber-700',
  english:          'bg-violet-100 text-violet-700',
  geography:        'bg-teal-100 text-teal-700',
  foreign_language: 'bg-pink-100 text-pink-700',
  computer_science: 'bg-cyan-100 text-cyan-700',
  art:              'bg-rose-100 text-rose-700',
  music:            'bg-purple-100 text-purple-700',
  other:            'bg-gray-100 text-gray-600',
};

function Avatar({ user, size = 'lg' }) {
  const cls = size === 'lg'
    ? 'w-20 h-20 text-4xl rounded-2xl'
    : 'w-14 h-14 text-2xl rounded-xl';
  if (user?.avatar_image_url) {
    return <img src={user.avatar_image_url} alt="" className={`${cls} object-cover shrink-0`} />;
  }
  return (
    <div className={`${cls} flex items-center justify-center text-white font-black shrink-0`}
      style={{ background: user?.avatar_color || '#7c3aed' }}>
      {user?.avatar_emoji || (user?.displayName?.[0]?.toUpperCase() ?? '?')}
    </div>
  );
}

// targetUser: { email, displayName, avatar_emoji, avatar_color, avatar_image_url, xp_bonus }
// submissions: already filtered for targetUser
// friendship: the friendship row between currentUser and targetUser (or null)
// currentUserEmail: the logged-in user's email
// onAddFriend(email), onRemoveFriend(friendshipId): callbacks
export default function UserProfileModal({
  targetUser, submissions, friendship, currentUserEmail,
  onAddFriend, onRemoveFriend, onClose,
}) {
  if (!targetUser) return null;

  const isMe = targetUser.email === currentUserEmail;
  const showStats = isMe || targetUser.share_stats !== false;
  const { level } = calcLevelInfo(submissions, targetUser.xp_bonus || 0);
  const league = getLeague(level);

  const approved = submissions.filter(s => s.status === 'approved');
  const points = approved.reduce((a, b) => a + (b.points_awarded || 0), 0);
  const passed = submissions.filter(s => s.quiz_passed).length;
  const NON_QUIZ_TYPES = new Set(['xp_boost', 'referral', 'points_pack', 'comeback_bonus']);
  const subjects = [...new Set(
    submissions.filter(s => !NON_QUIZ_TYPES.has(s.type)).map(s => s.subject).filter(Boolean)
  )];

  const isFriends     = friendship?.status === 'accepted';
  const iSentRequest  = friendship?.status === 'pending' && friendship?.requester_email === currentUserEmail;
  const theyRequested = friendship?.status === 'pending' && friendship?.requester_email !== currentUserEmail;

  const accentColor = targetUser.avatar_color || '#7c3aed';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(15,10,40,0.65)', backdropFilter: 'blur(4px)' }}
        onClick={e => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="relative px-6 pt-6 pb-5"
            style={{ background: `linear-gradient(135deg, ${accentColor}18, #ffffff 70%)` }}>
            <button onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:bg-black/5 transition-colors">
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-4">
              <Avatar user={targetUser} size="lg" />
              <div className="min-w-0">
                <p className="font-black text-lg text-foreground leading-tight truncate">
                  {targetUser.displayName}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-xs font-black px-2 py-0.5 rounded-full text-white"
                    style={{ background: accentColor }}>
                    Lv.{level}
                  </span>
                  <span className="text-xs text-muted-foreground font-semibold">
                    {league.emoji} {league.name}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          {showStats ? (
            <div className="grid grid-cols-3 divide-x divide-border border-y border-border">
              {[
                { label: 'Points', value: points.toLocaleString() },
                { label: 'Passed', value: passed },
                { label: 'Subjects', value: subjects.length },
              ].map(s => (
                <div key={s.label} className="py-4 text-center">
                  <p className="text-xl font-black text-foreground">{s.value}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="border-y border-border py-4 px-6 text-center">
              <p className="text-xs text-muted-foreground">This user keeps their stats private.</p>
            </div>
          )}

          {/* Subjects */}
          {showStats && subjects.length > 0 && (
            <div className="px-6 py-4 border-b border-border">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">
                Subjects studied
              </p>
              <div className="flex flex-wrap gap-1.5">
                {subjects.map(s => (
                  <span key={s}
                    className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full capitalize ${SUBJECT_COLORS[s] ?? SUBJECT_COLORS.other}`}>
                    {s.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Friend action */}
          <div className="px-6 py-4">
            {isMe ? (
              <p className="text-center text-xs text-muted-foreground py-1">This is your profile</p>
            ) : isFriends ? (
              <div className="flex gap-2">
                <div className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-semibold">
                  <UserCheck className="w-4 h-4" /> Friends
                </div>
                <button
                  onClick={() => { onRemoveFriend(friendship.id); onClose(); }}
                  className="px-3 py-2.5 rounded-xl border border-border text-muted-foreground hover:text-rose-500 hover:bg-rose-50 transition-colors"
                  title="Remove friend">
                  <UserMinus className="w-4 h-4" />
                </button>
              </div>
            ) : iSentRequest ? (
              <div className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-secondary text-muted-foreground text-sm font-semibold">
                <Clock className="w-4 h-4" /> Request Sent
              </div>
            ) : theyRequested ? (
              <div className="py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm font-semibold text-center">
                They sent you a request — check Friends page
              </div>
            ) : (
              <button
                onClick={() => { onAddFriend(targetUser.email); onClose(); }}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition-colors">
                <UserPlus className="w-4 h-4" /> Add Friend
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
