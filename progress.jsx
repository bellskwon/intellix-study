import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { TrendingUp, TrendingDown, Target, Award, AlertTriangle, BookOpen, Trophy, BarChart3, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import SubjectIcon from '@/pages/SubjectIcon';

export default function Progress() {
  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const { data: submissions = [] } = useQuery({
    queryKey: ['mySubmissions'],
    queryFn: () => base44.entities.Submission.filter({ created_by: user?.email }, 'created_date', 100),
    enabled: !!user?.email,
  });

  const NON_QUIZ_TYPES = new Set(['xp_boost', 'referral', 'points_pack', 'comeback_bonus']);
  const visibleSubmissions = submissions.filter(s => !NON_QUIZ_TYPES.has(s.type));
  const graded = visibleSubmissions.filter(s => s.quiz_score != null);
  const approved = visibleSubmissions.filter(s => s.status === 'approved');
  const totalPoints = approved.reduce((a, b) => a + (b.points_awarded || 0), 0);
  const avgScore = graded.length ? Math.round(graded.reduce((s, q) => s + q.quiz_score, 0) / graded.length) : 0;
  const best = graded.length ? Math.max(...graded.map(s => s.quiz_score)) : 0;
  const passed = visibleSubmissions.filter(s => s.quiz_passed).length;

  const last5 = graded.slice(-5);
  const prev5 = graded.slice(-10, -5);
  const avgLast5 = last5.length ? Math.round(last5.reduce((s, q) => s + q.quiz_score, 0) / last5.length) : 0;
  const avgPrev5 = prev5.length ? Math.round(prev5.reduce((s, q) => s + q.quiz_score, 0) / prev5.length) : 0;
  const trend = graded.length >= 2 ? avgLast5 - avgPrev5 : 0;

  const timeline = graded.slice(-12).map(s => ({
    name: format(new Date(s.created_date), 'MMM d'),
    score: s.quiz_score,
  }));

  const subjectScores = {};
  graded.forEach(s => {
    if (!subjectScores[s.subject]) subjectScores[s.subject] = [];
    subjectScores[s.subject].push(s.quiz_score);
  });
  const subjectMap = {};
  submissions.forEach(s => { subjectMap[s.subject] = (subjectMap[s.subject] || 0) + 1; });
  const sortedSubjects = Object.entries(subjectMap).sort((a, b) => b[1] - a[1]);

  const subjectAvg = Object.entries(subjectScores).map(([subject, scores]) => ({
    subject: subject.replace(/_/g, ' '),
    avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
  })).sort((a, b) => b.avg - a.avg);
  const radarData = subjectAvg.map(s => ({ subject: s.subject.slice(0, 6), score: s.avg }));
  const weakAreas = subjectAvg.filter(s => s.avg < 70);
  const strongAreas = subjectAvg.filter(s => s.avg >= 80);

  return (
    <div className="pb-8">
      {/* Dark Hero */}
      <div className="-mx-4 -mt-4 lg:-mx-8 lg:-mt-8 mb-6">
        <div className="bg-[#130d25] px-6 pt-7 pb-8">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 bg-rose-500/20 text-rose-300 text-xs font-bold px-3 py-1 rounded-full border border-rose-500/30">
                <TrendingUp className="w-3 h-3" /> Analytics
              </span>
            </div>
            <h1 className="font-black text-white" style={{ fontSize: 'clamp(3rem, 12vw, 5rem)', lineHeight: 0.92 }}>My</h1>
            <h1 className="font-black text-red-400" style={{ fontSize: 'clamp(3rem, 12vw, 5rem)', lineHeight: 0.92 }}>Progress</h1>
            <p className="text-slate-400 text-sm mt-3">Track your improvement across subjects over time.</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto space-y-5">

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Points', value: totalPoints.toLocaleString(), gradient: 'from-amber-400 to-orange-500', Icon: Star },
            { label: 'Avg Score',    value: `${avgScore}%`,              gradient: 'from-violet-500 to-purple-600', Icon: Target },
            { label: 'Best Score',  value: `${best}%`,                  gradient: 'from-emerald-400 to-teal-500',  Icon: Trophy },
            { label: 'Recent Trend',value: graded.length >= 2 ? (trend >= 0 ? `+${trend}%` : `${trend}%`) : '—',
              gradient: trend >= 0 ? 'from-emerald-400 to-teal-500' : 'from-rose-400 to-pink-500',
              Icon: trend >= 0 ? TrendingUp : TrendingDown },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.07 }}
              className="bg-[#1a1035] rounded-2xl border border-white/10 p-4 text-center">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center mx-auto mb-2 shadow-md`}>
                <s.Icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-xl font-black text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground font-medium">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {graded.length === 0 ? (
          <div className="bg-[#1a1035] rounded-2xl border border-white/10 py-16 px-8 text-center">
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
            <Link to="/quiz"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-bold shadow-md shadow-violet-200 hover:opacity-90 transition-opacity">
              Upload Notes →
            </Link>
          </div>
        ) : (
          <>
            {/* Score Timeline */}
            {timeline.length > 1 && (
              <div className="bg-[#1a1035] rounded-2xl border border-white/10 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-sm text-muted-foreground">Score Timeline</h2>
                  {graded.length >= 2 && (
                    <span className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${trend >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                      {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {trend >= 0 ? `+${trend}%` : `${trend}%`} recent
                    </span>
                  )}
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={timeline}>
                    <defs>
                      <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(258,90%,60%)" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="hsl(258,90%,60%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(240,12%,93%)" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 600 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} width={28} />
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: '1px solid hsl(240,12%,89%)', fontSize: 12 }}
                      formatter={(v) => [`${v}%`, 'Score']}
                    />
                    <Area type="monotone" dataKey="score" stroke="hsl(258,90%,60%)" fill="url(#scoreGrad)"
                      strokeWidth={2.5} dot={{ fill: 'hsl(258,90%,60%)', strokeWidth: 0, r: 3.5 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Next Goals */}
            <div className="bg-[#1a1035] rounded-2xl border border-white/10 p-5">
              <h2 className="font-semibold text-sm text-muted-foreground mb-3">Next Goals</h2>
              <div className="space-y-3">
                {[
                  { label: 'Reach 10 quizzes', target: 10, current: visibleSubmissions.length, Icon: BookOpen },
                  { label: 'Avg score 80%',    target: 80, current: avgScore,                  Icon: BarChart3 },
                  { label: 'Pass 5 quizzes',   target: 5,  current: passed,                    Icon: Trophy },
                ].map(g => {
                  const pct = Math.min(Math.round((g.current / g.target) * 100), 100);
                  const done = pct >= 100;
                  return (
                    <div key={g.label}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-semibold text-foreground flex items-center gap-1.5">
                          <g.Icon className="w-3.5 h-3.5 text-primary" /> {g.label}
                        </span>
                        <span className={`font-bold ${done ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                          {done ? '✓ Done!' : `${g.current} / ${g.target}`}
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${done ? 'bg-emerald-400' : 'bg-gradient-to-r from-violet-500 to-purple-400'}`}
                          initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                          transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Subject Breakdown */}
            <div className="grid md:grid-cols-2 gap-4">
              {radarData.length >= 3 && (
                <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}
                  className="bg-[#1a1035] rounded-2xl border border-white/10 p-5">
                  <h2 className="font-semibold text-sm text-muted-foreground mb-4">Subject Radar</h2>
                  <ResponsiveContainer width="100%" height={220}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="hsl(240,12%,89%)" />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fontWeight: 600 }} />
                      <Radar dataKey="score" stroke="hsl(258,90%,60%)" fill="hsl(258,90%,60%)" fillOpacity={0.2} strokeWidth={2} />
                    </RadarChart>
                  </ResponsiveContainer>
                </motion.div>
              )}
              <div className="bg-[#1a1035] rounded-2xl border border-white/10 p-5 space-y-3">
                <h2 className="font-semibold text-sm text-muted-foreground mb-1">By Subject</h2>
                {sortedSubjects.slice(0, 5).map(([subj, count]) => {
                  const scores = subjectScores[subj];
                  const avg = scores ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
                  const pct = Math.round((count / (visibleSubmissions.length || 1)) * 100);
                  return (
                    <div key={subj} className="flex items-center gap-3">
                      <SubjectIcon subject={subj} size="xs" />
                      <div className="flex-1">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-semibold capitalize">{subj.replace(/_/g, ' ')}</span>
                          <span className="text-muted-foreground">
                            {count} quiz{count !== 1 ? 'zes' : ''}{avg != null ? ` · ${avg}%` : ''}
                          </span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <motion.div className="h-full bg-gradient-to-r from-violet-400 to-purple-500 rounded-full"
                            initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Weak & Strong Areas */}
            {(weakAreas.length > 0 || strongAreas.length > 0) && (
              <div className="grid grid-cols-2 gap-3">
                {strongAreas.length > 0 && (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Award className="w-4 h-4 text-emerald-500" />
                      <h3 className="font-black text-sm text-emerald-700">Strengths</h3>
                    </div>
                    <div className="space-y-1.5">
                      {strongAreas.map(a => (
                        <div key={a.subject} className="flex items-center justify-between bg-white/70 rounded-xl px-3 py-1.5">
                          <span className="text-xs font-semibold capitalize text-foreground">{a.subject}</span>
                          <span className="text-xs font-bold text-emerald-600">{a.avg}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {weakAreas.length > 0 && (
                  <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className="w-4 h-4 text-rose-500" />
                      <h3 className="font-black text-sm text-rose-700">Needs Work</h3>
                    </div>
                    <div className="space-y-1.5">
                      {weakAreas.map(a => (
                        <div key={a.subject} className="flex items-center justify-between bg-white/70 rounded-xl px-3 py-1.5">
                          <span className="text-xs font-semibold capitalize text-foreground">{a.subject}</span>
                          <span className="text-xs font-bold text-rose-600">{a.avg}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
