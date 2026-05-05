import React from 'react';
import { motion } from 'framer-motion';

/**
 * Reusable Level + XP bar component
 * Usage: <LevelXPBar submissions={submissions} />
 */

// Single source of truth for the quiz pass threshold — import this everywhere
export const PASS_THRESHOLD = 80;

export function calcLevelInfo(submissions = [], xpBonus = 0) {
  const passed = submissions.filter(s => s.quiz_passed).length;
  const xpTotal = submissions.length * 40 + passed * 20 + (xpBonus || 0);
  const level = Math.floor(xpTotal / 200) + 1;
  const xpInLevel = xpTotal % 200;
  const xpPct = Math.round((xpInLevel / 200) * 100);
  return { level, xpInLevel, xpTotal, xpPct };
}

export function getLeague(level) {
  if (level >= 200) return { name: 'Diamond', emoji: '💎', color: 'from-cyan-300 via-blue-400 to-violet-500',   glow: 'rgba(34,211,238,0.55)' };
  if (level >= 150) return { name: 'Platinum', emoji: '🌟', color: 'from-sky-200 via-slate-300 to-slate-400',  glow: 'rgba(148,163,184,0.45)' };
  if (level >= 100) return { name: 'Gold',    emoji: '🏆', color: 'from-yellow-300 via-amber-400 to-orange-400', glow: 'rgba(251,191,36,0.55)' };
  if (level >= 50)  return { name: 'Silver',  emoji: '🥈', color: 'from-slate-300 via-slate-400 to-slate-500',  glow: 'rgba(148,163,184,0.35)' };
  return                   { name: 'Bronze',  emoji: '🥉', color: 'from-amber-500 via-orange-500 to-red-400',   glow: 'rgba(245,158,11,0.45)' };
}

export default function LevelXPBar({ submissions = [], xpBonus = 0, className = '', dark = false }) {
  const { level, xpInLevel, xpPct } = calcLevelInfo(submissions, xpBonus);
  const league = getLeague(level);
  const nextUnlock = level < 50 ? 50 : level < 100 ? 100 : level < 150 ? 150 : level < 350 ? 350 : null;

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <motion.span
            whileHover={{ scale: 1.06 }}
            className={`inline-flex items-center gap-1.5 text-sm font-black font-space px-3 py-1 rounded-full bg-gradient-to-r ${league.color} text-white select-none`}
            style={{ boxShadow: `0 0 14px ${league.glow}, 0 2px 6px rgba(0,0,0,0.25)` }}
          >
            <span className="text-base leading-none">{league.emoji}</span>
            <span className="tracking-tight">Lv.{level}</span>
          </motion.span>
          <span className={`font-nunito font-semibold text-xs ${dark ? 'text-white/60' : 'text-muted-foreground'}`}>{league.name} League</span>
        </div>
        <span className={`font-space font-semibold text-xs ${dark ? 'text-white/70' : 'text-muted-foreground'}`}>
          {xpInLevel} / 200 XP
        </span>
      </div>
      <div className={`h-2.5 rounded-full overflow-hidden ${dark ? 'bg-white/20' : 'bg-muted'}`}>
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-400"
          initial={{ width: 0 }}
          animate={{ width: `${xpPct}%` }}
          transition={{ duration: 1.1, ease: 'easeOut', delay: 0.2 }}
        />
      </div>
      {nextUnlock && level < 50 && (
        <p className={`text-[11px] ${dark ? 'text-white/50' : 'text-muted-foreground'}`}>
          Store unlocks at Level 50 (Level 35 for paid plans) · {50 - level} levels away
        </p>
      )}
    </div>
  );
}