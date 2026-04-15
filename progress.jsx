import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { TrendingUp, TrendingDown, Target, Award, Brain, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { PASS_THRESHOLD } from '@/components/shared/LevelXPBar';

export default function Progress() {
  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });

  const { data: submissions = [] } = useQuery({
    queryKey: ['mySubmissions'],
    queryFn: () => base44.entities.Submission.filter({ created_by: user?.email }, 'created_date', 100),
    enabled: !!user?.email,
  });

  const graded = submissions.filter(s => s.quiz_score != null);
  const avgScore = graded.length ? Math.round(graded.reduce((s, q) => s + q.quiz_score, 0) / graded.length) : 0;
  const best = graded.length ? Math.max(...graded.map(s => s.quiz_score)) : 0;
  const trend = graded.length >= 2 ? graded[graded.length - 1].quiz_score - graded[graded.length - 2].quiz_score : 0;
  const passedCount = submissions.filter(s => s.quiz_passed).length;

  // Subject averages
  const subjectScores = {};
  graded.forEach(s => {
    if (!subjectScores[s.subject]) subjectScores[s.subject] = [];
    subjectScores[s.subject].push(s.quiz_score);
  });
  const subjectAvg = Object.entries(subjectScores).map(([subject, scores]) => ({
    subject: subject.replace('_', ' '),
    avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    count: scores.length,
  })).sort((a, b) => b.avg - a.avg);

  const radarData = subjectAvg.map(s => ({ subject: s.subject.slice(0, 6), score: s.avg }));

  // Timeline
  const timeline = graded.slice(-12).map(s => ({
    name: format(new Date(s.created_date), 'MMM d'),
    score: s.quiz_score,
    subject: s.subject?.replace('_', ' '),
  }));

  const weakAreas = subjectAvg.filter(s => s.avg < 70);
  const strongAreas = subjectAvg.filter(s => s.avg >= 80);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-black text-foreground">My Progress</h1>
        <p className="text-muted-foreground text-sm mt-1">Track your improvement across subjects over time.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Avg Score', value: `${avgScore}%`, icon: Target, gradient: 'gradient-violet', bg: 'shadow-purple-200' },
          { label: 'Best Score', value: `${best}%`, icon: Award, gradient: 'gradient-amber', bg: 'shadow-amber-200' },
          { label: `Passed (≥${PASS_THRESHOLD}%)`, value: passedCount, icon: Brain, gradient: 'gradient-cyan', bg: 'shadow-cyan-200' },
          { label: 'Recent Trend', value: trend >= 0 ? `+${trend}%` : `${trend}%`, icon: trend >= 0 ? TrendingUp : TrendingDown, gradient: trend >= 0 ? 'gradient-emerald' : 'gradient-pink', bg: trend >= 0 ? 'shadow-emerald-200' : 'shadow-pink-200' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            className="bg-white rounded-2xl border border-border p-5 card-hover">
            <div className={`w-10 h-10 rounded-xl ${s.gradient} flex items-center justify-center mb-3 shadow-lg ${s.bg}`}>
              <s.icon className="w-5 h-5 text-white" />
            </div>
            <p className="text-xl font-black text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5 font-medium">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {graded.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border py-16 px-8 text-center">
          {/* Inline SVG illustration */}
          <svg width="120" height="100" viewBox="0 0 120 100" fill="none" className="mx-auto mb-6 opacity-80">
            <rect x="20" y="30" width="80" height="55" rx="8" fill="#f3f0ff" stroke="#c4b5fd" strokeWidth="2"/>
            <rect x="32" y="44" width="56" height="6" rx="3" fill="#c4b5fd"/>
            <rect x="32" y="56" width="40" height="6" rx="3" fill="#ddd6fe"/>
            <rect x="32" y="68" width="50" height="6" rx="3" fill="#ddd6fe"/>
            <circle cx="90" cy="28" r="14" fill="#7c3aed"/>
            <path d="M84 28 L88 32 L96 24" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <h3 className="font-black text-foreground text-lg mb-1">No quiz data yet</h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-5">
            Upload your notes and take your first quiz to start tracking your scores over time.
          </p>
          <a href="/quiz"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-bold shadow-md shadow-violet-200 hover:opacity-90 transition-opacity">
            Upload Notes →
          </a>
        </div>
      ) : (
        <>
          {/* Score Timeline */}
          {timeline.length > 1 && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="bg-white rounded-2xl border border-border p-6">
              <h2 className="font-black text-foreground mb-4">Score Timeline</h2>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={timeline}>
                  <defs>
                    <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(258,90%,60%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(258,90%,60%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(240,12%,92%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 600 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: '1px solid hsl(240,12%,89%)', fontSize: 12 }}
                    formatter={(v) => [`${v}%`, 'Score']}
                  />
                  <Area type="monotone" dataKey="score" stroke="hsl(258,90%,60%)" fill="url(#scoreGrad)" strokeWidth={3} dot={{ fill: 'hsl(258,90%,60%)', strokeWidth: 0, r: 4 }} />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>
          )}

          {/* Subject Breakdown */}
          <div className="grid md:grid-cols-2 gap-4">
            {radarData.length >= 3 && (
              <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}
                className="bg-white rounded-2xl border border-border p-6">
                <h2 className="font-black text-foreground mb-4">Subject Radar</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="hsl(240,12%,89%)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fontWeight: 600 }} />
                    <Radar dataKey="score" stroke="hsl(258,90%,60%)" fill="hsl(258,90%,60%)" fillOpacity={0.2} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </motion.div>
            )}

            <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.45 }}
              className="bg-white rounded-2xl border border-border p-6 space-y-3">
              <h2 className="font-black text-foreground">By Subject</h2>
              {subjectAvg.map(s => (
                <div key={s.subject}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold capitalize text-foreground">{s.subject}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.avg >= 80 ? 'bg-emerald-50 text-emerald-600' : s.avg >= 60 ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'}`}>
                      {s.avg}%
                    </span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <motion.div className={`h-full rounded-full ${s.avg >= 80 ? 'gradient-emerald' : s.avg >= 60 ? 'gradient-amber' : 'gradient-pink'}`}
                      initial={{ width: 0 }} animate={{ width: `${s.avg}%` }} transition={{ duration: 0.8, delay: 0.1 }} />
                  </div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Weak & Strong Areas */}
          <div className="grid md:grid-cols-2 gap-4">
            {weakAreas.length > 0 && (
              <div className="bg-rose-50 border border-rose-100 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-5 h-5 text-rose-500" />
                  <h3 className="font-black text-rose-700">Needs Work</h3>
                </div>
                <div className="space-y-1.5">
                  {weakAreas.map(a => (
                    <div key={a.subject} className="flex items-center justify-between bg-white/70 rounded-xl px-3 py-2">
                      <span className="text-sm font-semibold capitalize text-foreground">{a.subject}</span>
                      <span className="text-xs font-bold text-rose-600">{a.avg}% avg</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {strongAreas.length > 0 && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Award className="w-5 h-5 text-emerald-500" />
                  <h3 className="font-black text-emerald-700">Strengths</h3>
                </div>
                <div className="space-y-1.5">
                  {strongAreas.map(a => (
                    <div key={a.subject} className="flex items-center justify-between bg-white/70 rounded-xl px-3 py-2">
                      <span className="text-sm font-semibold capitalize text-foreground">{a.subject}</span>
                      <span className="text-xs font-bold text-emerald-600">{a.avg}% avg</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
