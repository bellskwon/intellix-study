import React from 'react';
import { motion } from 'framer-motion';

/**
 * Reusable Level + XP bar component
 * Usage: <LevelXPBar submissions={submissions} />
 */
export function calcLevelInfo(submissions = []) {
  const passed = submissions.filter(s => s.quiz_passed).length;
  const xpTotal = submissions.length * 40 + passed * 20;
  const level = Math.floor(xpTotal / 200) + 1;
  const xpInLevel = xpTotal % 200;
  const xpPct = Math.round((xpInLevel / 200) * 100);
  return { level, xpInLevel, xpTotal, xpPct };
}

export function getLeague(level) {
  if (level >= 200) return { name: 'Diamond', emoji: '💎', color: 'from-cyan-400 to-blue-500' };
  if (level >= 150) return { name: 'Platinum', emoji: '🥇', color: 'from-slate-300 to-slate-500' };
  if (level >= 100) return { name: 'Gold', emoji: '🏆', color: 'from-amber-400 to-yellow-500' };
  if (level >= 50)  return { name: 'Silver', emoji: '🥈', color: 'from-slate-300 to-slate-400' };
  return { name: 'Bronze', emoji: '🥉', color: 'from-amber-600 to-orange-700' };
}

export default function LevelXPBar({ submissions = [], className = '', dark = false }) {
  const { level, xpInLevel, xpPct } = calcLevelInfo(submissions);
  const league = getLeague(level);
  const nextUnlock = level < 50 ? 50 : level < 100 ? 100 : level < 150 ? 150 : level < 350 ? 350 : null;

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <span className={`text-sm font-black px-2 py-0.5 rounded-full bg-gradient-to-r ${league.color} text-white shadow-sm`}>
            {league.emoji} Lv.{level}
          </span>
          <span className={dark ? 'text-white/60' : 'text-muted-foreground'}>{league.name} League</span>
        </div>
        <span className={`font-semibold ${dark ? 'text-white/70' : 'text-muted-foreground'}`}>
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