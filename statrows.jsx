import React from 'react';
import { Trophy, Flame, BookOpen, Star } from 'lucide-react';

const stats = [
  { label: 'Points Earned', key: 'points', icon: Star, color: 'text-accent', bg: 'bg-accent/10' },
  { label: 'Submissions', key: 'submissions', icon: BookOpen, color: 'text-primary', bg: 'bg-primary/10' },
  { label: 'Quizzes Passed', key: 'quizzes', icon: Trophy, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  { label: 'Day Streak', key: 'streak', icon: Flame, color: 'text-orange-500', bg: 'bg-orange-50' },
];

export default function StatsRow({ submissions = [], streak = 0 }) {
  const approved = submissions.filter(s => s.status === 'approved');
  const quizzesPassed = submissions.filter(s => s.quiz_passed).length;
  const totalPoints = approved.reduce((sum, s) => sum + (s.points_awarded || 0), 0);

  const values = {
    points: totalPoints,
    submissions: submissions.filter(s => s.type !== 'xp_boost').length,
    quizzes: quizzesPassed,
    streak,
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map(stat => (
        <div key={stat.key} className="bg-card rounded-2xl border border-border p-5 flex items-start gap-4">
          <div className={`w-11 h-11 rounded-xl ${stat.bg} flex items-center justify-center shrink-0`}>
            <stat.icon className={`w-5 h-5 ${stat.color}`} />
          </div>
          <div>
            <p className="text-2xl font-bold font-bebas tracking-wide text-foreground">{values[stat.key]}</p>
            <p className="text-xs font-outfit font-semibold text-muted-foreground mt-0.5 uppercase tracking-wide">{stat.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}