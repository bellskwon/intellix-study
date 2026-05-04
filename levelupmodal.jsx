import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getLeague } from '@/components/shared/LevelXPBar';

const LEVEL_KEY = 'intellix_known_level';

/**
 * Shows a full-screen celebration when the user's level increases.
 * Uses localStorage to track the last seen level so it only fires on actual upgrades.
 * Usage: <LevelUpModal level={level} />
 */
export default function LevelUpModal({ level, isLoaded }) {
  const [show, setShow] = useState(false);
  const [celebratedLevel, setCelebratedLevel] = useState(null);

  useEffect(() => {
    if (!isLoaded || !level || level < 1) return;
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
  }, [level, isLoaded]);

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
              animate={{ rotate: [0, -8, 8, -8, 8, 0], scale: [1, 1.15, 1] }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="flex justify-center mb-3"
            >
              <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Outer glow ring */}
                <circle cx="40" cy="40" r="38" fill="url(#glowRing)" opacity="0.2" />
                {/* Star burst rays */}
                {[0,45,90,135,180,225,270,315].map((deg, i) => (
                  <line key={i}
                    x1="40" y1="40"
                    x2={40 + Math.cos((deg * Math.PI) / 180) * 36}
                    y2={40 + Math.sin((deg * Math.PI) / 180) * 36}
                    stroke={i % 2 === 0 ? '#f59e0b' : '#fcd34d'}
                    strokeWidth={i % 2 === 0 ? "3" : "2"}
                    strokeLinecap="round"
                    opacity="0.7"
                  />
                ))}
                {/* Trophy cup */}
                <rect x="28" y="42" width="24" height="4" rx="2" fill="#7c3aed" />
                <rect x="34" y="46" width="12" height="8" rx="2" fill="#7c3aed" />
                <rect x="28" y="54" width="24" height="3" rx="1.5" fill="#7c3aed" />
                <path d="M28 26 Q28 42 40 42 Q52 42 52 26 Z" fill="url(#cupGrad)" />
                {/* Handles */}
                <path d="M28 28 Q20 28 20 34 Q20 40 28 40" stroke="#a78bfa" strokeWidth="3" strokeLinecap="round" fill="none" />
                <path d="M52 28 Q60 28 60 34 Q60 40 52 40" stroke="#a78bfa" strokeWidth="3" strokeLinecap="round" fill="none" />
                {/* Cup shine */}
                <path d="M33 29 Q36 27 36 36" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
                {/* Star on cup */}
                <path d="M40 30 L41.5 34 L46 34 L42.5 36.5 L44 40.5 L40 38 L36 40.5 L37.5 36.5 L34 34 L38.5 34 Z" fill="#fde68a" />
                <defs>
                  <linearGradient id="cupGrad" x1="28" y1="26" x2="52" y2="42" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#7c3aed" />
                  </linearGradient>
                  <radialGradient id="glowRing" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                  </radialGradient>
                </defs>
              </svg>
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
