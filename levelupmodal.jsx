import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getLeague } from '@/components/shared/LevelXPBar';

const LEVEL_KEY = 'intellix_known_level';

/**
 * Shows a full-screen celebration when the user's level increases.
 * Uses localStorage to track the last seen level so it only fires on actual upgrades.
 * Usage: <LevelUpModal level={level} />
 */
export default function LevelUpModal({ level }) {
  const [show, setShow] = useState(false);
  const [celebratedLevel, setCelebratedLevel] = useState(null);

  useEffect(() => {
    if (!level || level < 1) return;
    try {
      const stored = parseInt(localStorage.getItem(LEVEL_KEY) || '0', 10);
      if (stored === 0) {
        // First visit — just record the level, don't celebrate
        localStorage.setItem(LEVEL_KEY, String(level));
        return;
      }
      if (level > stored) {
        localStorage.setItem(LEVEL_KEY, String(level));
        setCelebratedLevel(level);
        setShow(true);
        const timer = setTimeout(() => setShow(false), 4500);
        return () => clearTimeout(timer);
      }
    } catch {}
  }, [level]);

  if (!celebratedLevel) return null;
  const league = getLeague(celebratedLevel);

  // Generate random particles
  const particles = Array.from({ length: 18 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.6,
    size: Math.random() * 10 + 6,
    color: ['#7c3aed', '#a855f7', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'][Math.floor(Math.random() * 6)],
    rotate: Math.random() * 360,
  }));

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setShow(false)}
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm cursor-pointer"
        >
          {/* Particles */}
          {particles.map(p => (
            <motion.div
              key={p.id}
              className="absolute top-0 rounded-sm pointer-events-none"
              style={{ left: `${p.x}%`, width: p.size, height: p.size, background: p.color, rotate: p.rotate }}
              initial={{ y: -20, opacity: 1 }}
              animate={{ y: '110vh', opacity: [1, 1, 0] }}
              transition={{ duration: 2.5 + Math.random(), delay: p.delay, ease: 'easeIn' }}
            />
          ))}

          {/* Card */}
          <motion.div
            initial={{ scale: 0.5, y: 60, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-3xl p-8 text-center max-w-xs w-full mx-4 shadow-2xl"
          >
            <motion.div
              animate={{ rotate: [0, -10, 10, -10, 10, 0], scale: [1, 1.2, 1] }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-6xl mb-3"
            >
              🎉
            </motion.div>
            <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-1">Level Up!</p>
            <motion.p
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.15 }}
              className="text-6xl font-black text-foreground mb-2"
            >
              {celebratedLevel}
            </motion.p>
            <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r ${league.color} text-white text-sm font-black shadow-lg mb-4`}>
              {league.emoji} {league.name} League
            </span>
            <p className="text-sm text-muted-foreground">You're on a roll — keep studying to reach the next level!</p>
            <button onClick={() => setShow(false)}
              className="mt-5 w-full py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors">
              Awesome!
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
