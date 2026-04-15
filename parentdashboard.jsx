import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const subjectLabel = {
  math: 'Math', science: 'Science', history: 'History', geography: 'Geography',
  english: 'English', foreign_language: 'Foreign Language', computer_science: 'CS',
  art: 'Art', music: 'Music', other: 'Other',
};

export default function ParentDashboard() {
  const { shareCode } = useParams();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['shared', shareCode],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/auth/shared/${shareCode}`);
      if (!res.ok) throw new Error('Not found');
      return res.json();
    },
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center max-w-sm">
          <p className="text-4xl mb-4">🔍</p>
          <h2 className="font-sora text-xl font-bold text-foreground mb-2">Profile not found</h2>
          <p className="text-sm text-muted-foreground">This share link may be invalid or the user's profile may no longer be public.</p>
        </div>
      </div>
    );
  }

  const passRate = data.total_quizzes > 0 ? Math.round((data.passed_quizzes / data.total_quizzes) * 100) : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header band */}
      <div className="w-full py-10 px-4 text-white text-center"
        style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 60%, #ec4899 100%)' }}>
        <div className="w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center text-4xl shadow-xl"
          style={{ background: data.avatar_color || '#7c3aed' }}>
          {data.avatar_emoji || '🎓'}
        </div>
        <h1 className="font-sora text-2xl font-bold">{data.display_name}'s Study Progress</h1>
        <p className="text-purple-200 text-sm mt-1">
          Member since {format(new Date(data.member_since), 'MMMM yyyy')} · Shared via Intellix
        </p>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Quizzes Taken', value: data.total_quizzes, color: 'text-violet-600', bg: 'bg-violet-50' },
            { label: 'Quizzes Passed', value: data.passed_quizzes, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Avg Score', value: data.avg_score != null ? `${data.avg_score}%` : '—', color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Pass Rate', value: `${passRate}%`, color: 'text-fuchsia-600', bg: 'bg-fuchsia-50' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-2xl p-5 text-center`}>
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1 font-medium">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Subjects */}
        {data.subjects_studied.length > 0 && (
          <div className="bg-white rounded-2xl border border-border p-5">
            <h2 className="font-black text-sm text-foreground mb-3">Subjects Studied</h2>
            <div className="flex flex-wrap gap-2">
              {data.subjects_studied.map(s => (
                <span key={s} className="bg-secondary text-secondary-foreground text-xs font-semibold px-3 py-1.5 rounded-full capitalize">
                  {subjectLabel[s] || s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Recent activity */}
        {data.recent_activity.length > 0 && (
          <div className="bg-white rounded-2xl border border-border p-5">
            <h2 className="font-black text-sm text-foreground mb-3">Recent Activity</h2>
            <div className="space-y-2">
              {data.recent_activity.map((a, i) => (
                <div key={i} className="flex items-center gap-3 py-1.5">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${a.passed ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                  <span className="flex-1 text-sm text-foreground capitalize">{subjectLabel[a.subject] || a.subject}</span>
                  <span className={`text-sm font-black ${a.passed ? 'text-emerald-600' : 'text-rose-500'}`}>{a.score}%</span>
                  <span className="text-xs text-muted-foreground">{format(new Date(a.date), 'MMM d')}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground pt-2">
          Powered by <span className="font-semibold text-violet-600">Intellix</span> — AI-powered study platform
        </p>
      </div>
    </div>
  );
}
