import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const STREAK_MILESTONES = [7, 14, 30, 60, 100, 200, 365];
const MILESTONE_KEY = 'intellix_celebrated_streaks'; // JSON array of celebrated milestone values

function getMilestoneInfo(streak) {
  if (streak >= 365) return { label: '1 Year Streak!', emoji: '🌟', bg: 'bg-gradient-to-r from-yellow-400 to-amber-500' };
  if (streak >= 200) return { label: '200-Day Streak!', emoji: '💎', bg: 'bg-gradient-to-r from-cyan-500 to-blue-600' };
  if (streak >= 100) return { label: '100-Day Streak!', emoji: '🏆', bg: 'bg-gradient-to-r from-amber-400 to-orange-500' };
  if (streak >= 60)  return { label: '60-Day Streak!',  emoji: '🔥', bg: 'bg-gradient-to-r from-rose-500 to-pink-600' };
  if (streak >= 30)  return { label: '30-Day Streak!',  emoji: '⚡', bg: 'bg-gradient-to-r from-violet-500 to-purple-600' };
  if (streak >= 14)  return { label: '2-Week Streak!',  emoji: '✨', bg: 'bg-gradient-to-r from-indigo-500 to-violet-600' };
  if (streak >= 7)   return { label: '7-Day Streak!',   emoji: '🎯', bg: 'bg-gradient-to-r from-emerald-500 to-teal-600' };
  return null;
}

/**
 * Shows:
 * 1. A streak milestone celebration banner when a milestone streak is hit (7, 14, 30… days).
 * 2. A streak-at-risk alert if the user hasn't studied today and has an active streak.
 *
 * Usage: <StreakNotification streak={streak} lastActivity={lastActivity} />
 */
export default function StreakNotification({ streak = 0, lastActivity }) {
  const [showAlert, setShowAlert] = useState(false);
  const [showMilestone, setShowMilestone] = useState(false);
  const [milestone, setMilestone] = useState(null);

  // Check for a newly hit milestone
  useEffect(() => {
    if (!streak || streak < 7) return;
    // Find the highest uncelebrated milestone the user has reached
  const celebrated = (() => { try { return JSON.parse(localStorage.getItem(MILESTONE_KEY) || '[]'); } catch { return []; } })();
  const hit = [...STREAK_MILESTONES].reverse().find(m => streak >= m && !celebrated.includes(m));
    if (!hit) return;

    try {
      const info = getMilestoneInfo(hit);
      if (!info) return;

      setMilestone({ ...info, streak });
      const timer = setTimeout(() => setShowMilestone(true), 1000);
      const autoClose = setTimeout(() => setShowMilestone(false), 6000);
      localStorage.setItem(MILESTONE_KEY, JSON.stringify([...celebrated, hit]));
      return () => { clearTimeout(timer); clearTimeout(autoClose); };
    } catch {}
  }, [streak]);

  // Streak-at-risk alert (only when not showing a milestone)
  useEffect(() => {
    if (showMilestone) return;
    const today = new Date().toDateString();
    const lastDate = lastActivity ? new Date(lastActivity).toDateString() : null;
    if (lastDate !== today && streak > 0) {
      const timer = setTimeout(() => setShowAlert(true), 2500);
      return () => clearTimeout(timer);
    }
  }, [streak, lastActivity, showMilestone]);

  return (
    <>
      {/* Milestone celebration banner */}
      <AnimatePresence>
        {showMilestone && milestone && (
          <motion.div
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] w-[calc(100vw-2rem)] max-w-md">
            <div className={`${milestone.bg} text-white rounded-2xl shadow-2xl px-5 py-4 flex items-center gap-3`}>
              <motion.div
                animate={{ rotate: [0, -15, 15, -15, 15, 0], scale: [1, 1.3, 1] }}
                transition={{ duration: 0.7, delay: 0.2 }}
                className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-2xl shrink-0">
                {milestone.emoji}
              </motion.div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-sm">{milestone.label}</p>
                <p className="text-white/80 text-xs mt-0.5">
                  {milestone.streak} days in a row — you're incredible! Keep it up!
                </p>
              </div>
              <button onClick={() => setShowMilestone(false)} className="text-white/70 hover:text-white shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Streak-at-risk alert */}
      <AnimatePresence>
        {showAlert && !showMilestone && (
          <motion.div
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] w-[calc(100vw-2rem)] max-w-md">
            <div className="bg-orange-500 text-white rounded-2xl shadow-2xl shadow-orange-500/40 px-5 py-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                <Flame className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-sm">⚠️ Streak Alert!</p>
                <p className="text-orange-100 text-xs mt-0.5">Your {streak}-day streak ends tonight — complete a challenge to keep it alive!</p>
              </div>
              <Link to="/challenge" onClick={() => setShowAlert(false)}>
                <Button size="sm" className="bg-white text-orange-600 hover:bg-orange-50 font-black rounded-xl shrink-0 h-8">
                  Go!
                </Button>
              </Link>
              <button onClick={() => setShowAlert(false)} className="text-white/70 hover:text-white shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
