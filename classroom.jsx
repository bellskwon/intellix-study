import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  GraduationCap, Plus, Users, Copy, Trash2, LogOut, BookOpen, Hash, X,
  ArrowLeft, BarChart2, ClipboardList, Layers, Sparkles, Loader2,
  CheckCircle2, XCircle, ChevronDown, ChevronUp, Trophy, RotateCcw,
  Play, Eye, UserCheck, TrendingUp, Award, ChevronRight,
} from 'lucide-react';

const PASS_SCORE = 70;

// ── Helpers ───────────────────────────────────────────────────────────────────
function avg(arr) { return arr.length ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length) : null; }
function pct(n, d) { return d ? Math.round((n / d) * 100) : 0; }

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
export default function Classroom() {
  const queryClient = useQueryClient();
  const [joinCode, setJoinCode] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newGrade, setNewGrade] = useState('');
  const [selected, setSelected] = useState(null); // classroom object

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const { data: classrooms, isLoading } = useQuery({
    queryKey: ['classrooms'],
    queryFn: () => base44.classroom.list(),
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: () => base44.classroom.create({ name: newName, subject: newSubject, grade_level: newGrade }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classrooms'] });
      toast.success('Classroom created!');
      setShowCreate(false); setNewName(''); setNewSubject(''); setNewGrade('');
    },
    onError: (e) => toast.error(e.message),
  });

  const joinMutation = useMutation({
    mutationFn: (code) => base44.classroom.join(code),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['classrooms'] }); toast.success('Joined!'); setJoinCode(''); },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.classroom.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['classrooms'] }); toast.success('Deleted'); },
    onError: (e) => toast.error(e.message),
  });

  const removeMember = useMutation({
    mutationFn: ({ id, email }) => base44.classroom.removeMember(id, email),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['classrooms'] }),
    onError: (e) => toast.error(e.message),
  });

  // ── Detail view ─────────────────────────────────────────────────────────────
  if (selected) {
    const isTeacher = selected.teacher_email === user?.email;
    return isTeacher
      ? <TeacherView classroom={selected} user={user} onBack={() => setSelected(null)} />
      : <StudentView classroom={selected} user={user} onBack={() => setSelected(null)} />;
  }

  // ── List view ───────────────────────────────────────────────────────────────
  const owned = classrooms?.owned || [];
  const joined = classrooms?.joined || [];

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-8">
      <div>
        <h1 className="text-3xl font-black text-foreground tracking-tight font-sora">Classrooms</h1>
        <p className="text-muted-foreground text-sm mt-1.5">Create a classroom or enter a code to join one.</p>
      </div>

      {/* Join */}
      <div className="bg-white rounded-2xl border border-border p-5">
        <h2 className="font-black text-sm text-foreground mb-3 flex items-center gap-2">
          <Hash className="w-4 h-4 text-primary" /> Join a Classroom
        </h2>
        <div className="flex gap-2">
          <Input placeholder="6-character join code" value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            onKeyDown={e => { if (e.key === 'Enter' && joinCode.length === 6) joinMutation.mutate(joinCode); }}
            className="h-11 rounded-xl flex-1 font-mono tracking-widest uppercase" maxLength={6} />
          <Button onClick={() => joinCode.length === 6 && joinMutation.mutate(joinCode)}
            disabled={joinMutation.isPending || joinCode.length !== 6}
            className="rounded-xl font-bold h-11 px-6">Join</Button>
        </div>
      </div>

      {/* My classrooms */}
      <div className="bg-white rounded-2xl border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-black text-sm text-foreground flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-primary" /> My Classrooms ({owned.length})
          </h2>
          <Button size="sm" className="rounded-xl font-bold h-8 px-3 gap-1" onClick={() => setShowCreate(s => !s)}>
            <Plus className="w-3.5 h-3.5" /> Create
          </Button>
        </div>

        {showCreate && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="bg-secondary/30 rounded-xl p-4 mb-4 space-y-3">
            <Input placeholder="Classroom name *" value={newName} onChange={e => setNewName(e.target.value)} className="h-10 rounded-xl" />
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Subject (e.g. Math)" value={newSubject} onChange={e => setNewSubject(e.target.value)} className="h-10 rounded-xl" />
              <Input placeholder="Grade (e.g. 8th)" value={newGrade} onChange={e => setNewGrade(e.target.value)} className="h-10 rounded-xl" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowCreate(false)} className="flex-1 rounded-xl h-9">Cancel</Button>
              <Button onClick={() => newName.trim() && createMutation.mutate()}
                disabled={!newName.trim() || createMutation.isPending}
                className="flex-1 rounded-xl h-9 font-bold">
                {createMutation.isPending ? 'Creating…' : 'Create Classroom'}
              </Button>
            </div>
          </motion.div>
        )}

        {!isLoading && owned.length === 0 && !showCreate ? (
          <div className="text-center py-10">
            <GraduationCap className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="font-bold text-foreground text-sm mb-1">No classrooms yet</p>
            <p className="text-xs text-muted-foreground">Create a classroom and share the join code with students.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {owned.map((cls, i) => (
              <motion.div key={cls.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="border border-border rounded-xl p-4 hover:border-primary/40 transition-colors cursor-pointer group"
                onClick={() => setSelected(cls)}>
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-foreground group-hover:text-primary transition-colors">{cls.name}</p>
                    {(cls.subject || cls.grade_level) && (
                      <p className="text-xs text-muted-foreground mt-0.5">{[cls.subject, cls.grade_level].filter(Boolean).join(' · ')}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="text-xs font-mono font-black bg-primary/10 text-primary px-2.5 py-1 rounded-lg tracking-widest">{cls.join_code}</span>
                      <button onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(cls.join_code); toast.success('Copied!'); }}
                        className="text-muted-foreground hover:text-foreground" title="Copy join code">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Users className="w-3 h-3" /> {cls.members.length} student{cls.members.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={e => { e.stopPropagation(); toast(`Delete "${cls.name}"?`, { action: { label: 'Delete', onClick: () => deleteMutation.mutate(cls.id) }, cancel: { label: 'Cancel' }, duration: 5000 }); }}
                      className="text-muted-foreground hover:text-rose-500 transition-colors p-1" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Enrolled */}
      {(joined.length > 0 || isLoading) && (
        <div className="bg-white rounded-2xl border border-border p-5">
          <h2 className="font-black text-sm text-foreground mb-4 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-500" /> Enrolled Classrooms ({joined.length})
          </h2>
          <div className="space-y-3">
            {joined.map((cls, i) => (
              <motion.div key={cls.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 bg-secondary/30 rounded-xl px-4 py-3 cursor-pointer hover:bg-secondary/60 transition-colors group"
                onClick={() => setSelected(cls)}>
                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                  <BookOpen className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-foreground text-sm">{cls.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {cls.teacher_email}{cls.subject ? ` · ${cls.subject}` : ''} · {cls.members.length} student{cls.members.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={e => { e.stopPropagation(); toast(`Leave "${cls.name}"?`, { action: { label: 'Leave', onClick: () => removeMember.mutate({ id: cls.id, email: user?.email }) }, cancel: { label: 'Cancel' }, duration: 5000 }); }}
                    className="text-muted-foreground hover:text-rose-500 transition-colors p-1" title="Leave">
                    <LogOut className="w-4 h-4" />
                  </button>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {isLoading && <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Teacher detail view
// ─────────────────────────────────────────────────────────────────────────────
function TeacherView({ classroom, user, onBack }) {
  const [tab, setTab] = useState('overview');
  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart2 },
    { id: 'assignments', label: 'Assignments', icon: ClipboardList },
    { id: 'decks', label: 'Flashcards', icon: Layers },
    { id: 'students', label: 'Students', icon: UserCheck },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-8">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm font-semibold">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-black text-foreground truncate">{classroom.name}</h1>
          {(classroom.subject || classroom.grade_level) && (
            <p className="text-xs text-muted-foreground">{[classroom.subject, classroom.grade_level].filter(Boolean).join(' · ')}</p>
          )}
        </div>
        <span className="text-xs font-mono font-black bg-primary/10 text-primary px-2.5 py-1 rounded-lg tracking-widest">{classroom.join_code}</span>
      </div>

      <div className="flex gap-1 p-1.5 bg-secondary rounded-2xl">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 text-xs font-bold py-2 px-1 rounded-xl transition-all flex items-center justify-center gap-1.5 ${tab === t.id ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview'    && <TeacherOverview classroom={classroom} />}
      {tab === 'assignments' && <TeacherAssignments classroom={classroom} />}
      {tab === 'decks'       && <TeacherDecks classroom={classroom} />}
      {tab === 'students'    && <TeacherStudents classroom={classroom} />}
    </div>
  );
}

// ── Teacher: Overview ─────────────────────────────────────────────────────────
function TeacherOverview({ classroom }) {
  const { data: progress, isLoading } = useQuery({
    queryKey: ['classProgress', classroom.id],
    queryFn: () => base44.classroom.getProgress(classroom.id),
  });

  if (isLoading) return <LoadingSpinner />;

  const assignments = progress?.assignments || [];
  const members = progress?.members || [];
  const totalStudents = members.length;

  // Per-student stats
  const studentStats = members.map(m => {
    const results = assignments.flatMap(a => a.results.filter(r => r.student_email === m.student_email));
    const scores = results.map(r => r.score);
    return {
      email: m.student_email,
      completed: results.length,
      total: assignments.length,
      avgScore: avg(scores),
    };
  });

  const classAvg = avg(studentStats.flatMap(s => s.avgScore != null ? [s.avgScore] : []));
  const totalCompleted = assignments.reduce((sum, a) => sum + a.results.length, 0);
  const completionRate = assignments.length && totalStudents ? pct(totalCompleted, assignments.length * totalStudents) : 0;

  return (
    <div className="space-y-5">
      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Students', value: totalStudents, icon: Users, color: 'text-violet-500', bg: 'bg-violet-50' },
          { label: 'Class Avg', value: classAvg != null ? `${classAvg}%` : '—', icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-50' },
          { label: 'Completion', value: `${completionRate}%`, icon: Award, color: 'text-amber-500', bg: 'bg-amber-50' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-border p-4 text-center">
            <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center mx-auto mb-2`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <p className="text-xl font-black text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Per-student table */}
      {totalStudents === 0 ? (
        <EmptyState icon={Users} title="No students yet" desc="Share your join code to get students enrolled." />
      ) : (
        <div className="bg-white rounded-2xl border border-border overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <p className="font-black text-sm text-foreground">Student Progress</p>
          </div>
          <div className="divide-y divide-border">
            {studentStats.map(s => (
              <div key={s.email} className="flex items-center gap-4 px-5 py-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-black text-primary shrink-0">
                  {s.email[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{s.email}</p>
                  <p className="text-xs text-muted-foreground">{s.completed}/{s.total} assignments done</p>
                </div>
                <div className="text-right shrink-0">
                  {s.avgScore != null ? (
                    <span className={`text-sm font-black ${s.avgScore >= PASS_SCORE ? 'text-emerald-600' : 'text-rose-500'}`}>{s.avgScore}%</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">No scores yet</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per-assignment breakdown */}
      {assignments.length > 0 && (
        <div className="bg-white rounded-2xl border border-border overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <p className="font-black text-sm text-foreground">Assignment Breakdown</p>
          </div>
          <div className="divide-y divide-border">
            {assignments.map(a => {
              const scores = a.results.map(r => r.score);
              const aAvg = avg(scores);
              return (
                <div key={a.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{a.title}</p>
                    <p className="text-xs text-muted-foreground">{a.results.length}/{totalStudents} submitted</p>
                  </div>
                  <span className={`text-sm font-black shrink-0 ${aAvg != null ? (aAvg >= PASS_SCORE ? 'text-emerald-600' : 'text-rose-500') : 'text-muted-foreground'}`}>
                    {aAvg != null ? `${aAvg}% avg` : '—'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Teacher: Assignments ──────────────────────────────────────────────────────
const blankQuestion = () => ({ question_text: '', options: ['', '', '', ''], correct_answer: '', explanation: '' });

function TeacherAssignments({ classroom }) {
  const queryClient = useQueryClient();
  const [view, setView] = useState('list'); // list | create | results
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [questions, setQuestions] = useState([blankQuestion()]);
  // AI assistant panel
  const [showAI, setShowAI] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);

  const resetCreate = () => { setTitle(''); setSubject(''); setQuestions([blankQuestion()]); setShowAI(false); setAiPrompt(''); setAiSuggestions([]); };

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['classAssignments', classroom.id],
    queryFn: () => base44.classroom.getAssignments(classroom.id),
  });

  const createMutation = useMutation({
    mutationFn: () => base44.classroom.createAssignment(classroom.id, { title, subject, questions: questions.filter(q => q.question_text.trim() && q.correct_answer) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classAssignments', classroom.id] });
      queryClient.invalidateQueries({ queryKey: ['classProgress', classroom.id] });
      toast.success('Assignment published!');
      setView('list'); resetCreate();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.classroom.deleteAssignment(classroom.id, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classAssignments', classroom.id] });
      queryClient.invalidateQueries({ queryKey: ['classProgress', classroom.id] });
    },
    onError: (e) => toast.error(e.message),
  });

  const updateQuestion = (i, field, value) =>
    setQuestions(qs => qs.map((q, j) => j === i ? { ...q, [field]: value } : q));
  const updateOption = (qi, oi, value) =>
    setQuestions(qs => qs.map((q, j) => j !== qi ? q : { ...q, options: q.options.map((o, k) => k === oi ? value : o) }));

  const fetchAISuggestions = async () => {
    if (!aiPrompt.trim()) { toast.error('Describe a topic first.'); return; }
    setAiLoading(true);
    setAiSuggestions([]);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Suggest 3 multiple-choice practice questions for: "${aiPrompt}". Subject: ${subject || 'general'}.
Each question has exactly 4 options labelled A), B), C), D).
correct_answer must be the full text of the correct option. Include a 1-sentence explanation.`,
        response_json_schema: {
          type: 'object',
          properties: {
            questions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  question_text: { type: 'string' },
                  options: { type: 'array', items: { type: 'string' } },
                  correct_answer: { type: 'string' },
                  explanation: { type: 'string' },
                },
              },
            },
          },
        },
      });
      setAiSuggestions(res.questions || []);
    } catch (e) { toast.error(e.message || 'AI failed. Try again.'); }
    setAiLoading(false);
  };

  const addSuggestion = (q) => {
    setQuestions(qs => {
      const last = qs[qs.length - 1];
      const hasEmpty = !last.question_text.trim() && !last.correct_answer;
      return hasEmpty ? [...qs.slice(0, -1), q] : [...qs, q];
    });
    setAiSuggestions(s => s.filter(x => x !== q));
    toast.success('Question added!');
  };

  const validQuestions = questions.filter(q => q.question_text.trim() && q.correct_answer);

  // ── Results view ─────────────────────────────────────────────────────────
  if (view === 'results' && selectedAssignment) {
    const results = selectedAssignment.results || [];
    return (
      <div className="space-y-4">
        <button onClick={() => { setView('list'); setSelectedAssignment(null); }}
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 font-semibold">
          <ArrowLeft className="w-4 h-4" /> Back to assignments
        </button>
        <div>
          <h2 className="font-black text-foreground">{selectedAssignment.title}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{results.length} submissions · avg {avg(results.map(r => r.score)) ?? '—'}%</p>
        </div>
        {results.length === 0 ? (
          <EmptyState icon={ClipboardList} title="No submissions yet" desc="Students haven't taken this assignment yet." />
        ) : (
          <div className="space-y-2">
            {results.map(r => (
              <div key={r.id} className="bg-white rounded-xl border border-border px-4 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-black text-primary shrink-0">
                  {r.student_email[0].toUpperCase()}
                </div>
                <p className="flex-1 text-sm font-semibold text-foreground truncate">{r.student_email}</p>
                <span className={`text-sm font-black shrink-0 ${r.score >= PASS_SCORE ? 'text-emerald-600' : 'text-rose-500'}`}>{r.score}%</span>
                {r.passed ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <XCircle className="w-4 h-4 text-rose-400 shrink-0" />}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Create view ──────────────────────────────────────────────────────────
  if (view === 'create') {
    return (
      <div className="space-y-4">
        {/* Header row */}
        <div className="flex items-center gap-3">
          <button onClick={() => { setView('list'); resetCreate(); }}
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 font-semibold">
            <ArrowLeft className="w-4 h-4" /> Cancel
          </button>
          <h2 className="font-black text-foreground flex-1">Create Assignment</h2>
          <button
            onClick={() => setShowAI(s => !s)}
            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition-all ${showAI ? 'bg-violet-100 border-violet-300 text-violet-700' : 'border-border text-muted-foreground hover:border-violet-300 hover:text-violet-600'}`}>
            <Sparkles className="w-3.5 h-3.5" /> AI Help
          </button>
        </div>

        {/* Title + subject */}
        <div className="bg-white rounded-2xl border border-border p-4 grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="text-xs font-black text-muted-foreground uppercase tracking-wide mb-1 block">Title *</label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Chapter 5 Quiz" className="h-10 rounded-xl" />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-black text-muted-foreground uppercase tracking-wide mb-1 block">Subject</label>
            <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Biology" className="h-10 rounded-xl" />
          </div>
        </div>

        {/* AI assistant panel */}
        <AnimatePresence>
          {showAI && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              className="bg-violet-50 border border-violet-200 rounded-2xl p-4 space-y-3">
              <p className="text-xs font-black text-violet-700 uppercase tracking-wide flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> AI Question Assistant
              </p>
              <p className="text-xs text-violet-600">Type a topic or concept and get 3 suggested questions. Add the ones you like.</p>
              <div className="flex gap-2">
                <Input value={aiPrompt} onChange={e => setAiPrompt(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && fetchAISuggestions()}
                  placeholder="e.g. photosynthesis, World War II causes…"
                  className="h-9 rounded-xl text-sm flex-1 bg-white" />
                <Button onClick={fetchAISuggestions} disabled={aiLoading || !aiPrompt.trim()}
                  size="sm" className="rounded-xl font-bold h-9 px-3 shrink-0 bg-violet-600 hover:bg-violet-700 text-white border-0">
                  {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Suggest'}
                </Button>
              </div>
              {aiSuggestions.length > 0 && (
                <div className="space-y-2">
                  {aiSuggestions.map((s, i) => (
                    <div key={i} className="bg-white rounded-xl border border-violet-200 p-3 flex gap-2 items-start">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">{s.question_text}</p>
                        <p className="text-xs text-emerald-600 font-semibold mt-1">✓ {s.correct_answer}</p>
                        {s.explanation && <p className="text-xs text-muted-foreground mt-0.5 italic">{s.explanation}</p>}
                      </div>
                      <button onClick={() => addSuggestion(s)}
                        className="shrink-0 w-7 h-7 rounded-lg bg-violet-100 hover:bg-violet-200 text-violet-700 flex items-center justify-center font-black text-base transition-colors">
                        +
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Question builder */}
        <div className="space-y-3">
          <p className="text-xs font-black text-muted-foreground uppercase tracking-wide">{validQuestions.length} question{validQuestions.length !== 1 ? 's' : ''}</p>
          {questions.map((q, qi) => (
            <div key={qi} className="bg-white rounded-2xl border border-border p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-primary w-6 shrink-0">Q{qi + 1}</span>
                <Input value={q.question_text} onChange={e => updateQuestion(qi, 'question_text', e.target.value)}
                  placeholder="Question text…" className="h-9 rounded-xl text-sm flex-1" />
                {questions.length > 1 && (
                  <button onClick={() => setQuestions(qs => qs.filter((_, j) => j !== qi))}
                    className="text-muted-foreground hover:text-rose-500 shrink-0"><X className="w-4 h-4" /></button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 pl-8">
                {q.options.map((opt, oi) => (
                  <div key={oi} className="flex items-center gap-1.5">
                    <button
                      onClick={() => updateQuestion(qi, 'correct_answer', opt)}
                      className={`w-4 h-4 rounded-full border-2 shrink-0 transition-colors ${q.correct_answer === opt && opt.trim() ? 'border-emerald-500 bg-emerald-500' : 'border-border'}`}
                      title="Mark as correct" />
                    <Input value={opt} onChange={e => updateOption(qi, oi, e.target.value)}
                      placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                      className={`h-8 rounded-lg text-xs ${q.correct_answer === opt && opt.trim() ? 'border-emerald-300 bg-emerald-50' : ''}`} />
                  </div>
                ))}
              </div>

              <div className="pl-8">
                <Input value={q.explanation} onChange={e => updateQuestion(qi, 'explanation', e.target.value)}
                  placeholder="Explanation (optional — shown to students after they answer)"
                  className="h-8 rounded-lg text-xs text-muted-foreground" />
              </div>
            </div>
          ))}

          <button onClick={() => setQuestions(qs => [...qs, blankQuestion()])}
            className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" /> Add question
          </button>
        </div>

        <Button onClick={() => createMutation.mutate()}
          disabled={!title.trim() || validQuestions.length === 0 || createMutation.isPending}
          className="w-full h-12 rounded-xl font-bold gradient-violet border-0 text-white">
          {createMutation.isPending
            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Publishing…</>
            : `📤 Publish ${validQuestions.length} Question${validQuestions.length !== 1 ? 's' : ''} to Class`}
        </Button>
      </div>
    );
  }

  // ── List view ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-black text-muted-foreground uppercase tracking-wide">{assignments.length} assignments</p>
        <Button size="sm" className="rounded-xl font-bold h-8 px-3 gap-1" onClick={() => setView('create')}>
          <Plus className="w-3.5 h-3.5" /> Create
        </Button>
      </div>

      {isLoading && <LoadingSpinner />}
      {!isLoading && assignments.length === 0 && (
        <EmptyState icon={ClipboardList} title="No assignments yet" desc="Create an assignment and it will be visible to all students in this classroom." />
      )}

      {assignments.map((a, i) => {
        const scores = a.results.map(r => r.score);
        const aAvg = avg(scores);
        return (
          <motion.div key={a.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            className="bg-white rounded-xl border border-border p-4">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-black text-foreground">{a.title}</p>
                {a.subject && <p className="text-xs text-muted-foreground">{a.subject}</p>}
                <p className="text-xs text-muted-foreground mt-1">
                  {a.questions.length} questions · {a.results.length} submissions {aAvg != null ? `· avg ${aAvg}%` : ''}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="sm" variant="outline" className="rounded-lg h-8 px-2.5 gap-1 text-xs font-bold"
                  onClick={() => { setSelectedAssignment(a); setView('results'); }}>
                  <Eye className="w-3.5 h-3.5" /> Results
                </Button>
                <button onClick={() => toast(`Delete "${a.title}"?`, { action: { label: 'Delete', onClick: () => deleteMutation.mutate(a.id) }, cancel: { label: 'Cancel' }, duration: 5000 })}
                  className="text-muted-foreground hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-50 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ── Teacher: Flashcard Decks ──────────────────────────────────────────────────
function TeacherDecks({ classroom }) {
  const queryClient = useQueryClient();
  const [view, setView] = useState('list'); // list | create
  const [deckName, setDeckName] = useState('');
  const [deckSubject, setDeckSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [cards, setCards] = useState([{ front: '', back: '' }]);
  const [generating, setGenerating] = useState(false);

  const { data: decks = [], isLoading } = useQuery({
    queryKey: ['classDecks', classroom.id],
    queryFn: () => base44.classroom.getDecks(classroom.id),
  });

  const createMutation = useMutation({
    mutationFn: () => base44.classroom.createDeck(classroom.id, {
      deck_name: deckName, subject: deckSubject,
      cards: cards.filter(c => c.front.trim() && c.back.trim()),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classDecks', classroom.id] });
      toast.success('Deck shared!');
      setView('list'); setDeckName(''); setDeckSubject(''); setTopic(''); setCards([{ front: '', back: '' }]);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (deckId) => base44.classroom.deleteDeck(classroom.id, deckId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['classDecks', classroom.id] }),
    onError: (e) => toast.error(e.message),
  });

  const generateCards = async () => {
    if (!topic.trim()) { toast.error('Enter a topic first.'); return; }
    setGenerating(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Create 8-12 flashcards for: "${topic}". Subject: ${deckSubject || 'general'}.
Each card has a concise front (term or question) and clear back (definition or answer).
All cards must be unique.`,
        response_json_schema: {
          type: 'object',
          properties: {
            flashcards: {
              type: 'array',
              items: { type: 'object', properties: { front: { type: 'string' }, back: { type: 'string' } } },
            },
          },
        },
      });
      if (!res.flashcards?.length) { toast.error('Could not generate cards.'); return; }
      setCards(res.flashcards);
    } catch (e) { toast.error(e.message || 'Generation failed.'); }
    setGenerating(false);
  };

  if (view === 'create') {
    const validCards = cards.filter(c => c.front.trim() && c.back.trim());
    return (
      <div className="space-y-4">
        <button onClick={() => { setView('list'); setCards([{ front: '', back: '' }]); }}
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 font-semibold">
          <ArrowLeft className="w-4 h-4" /> Cancel
        </button>
        <h2 className="font-black text-foreground">Share Flashcard Deck</h2>

        <div className="bg-white rounded-2xl border border-border p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-black text-muted-foreground uppercase tracking-wide mb-1 block">Deck Name *</label>
              <Input value={deckName} onChange={e => setDeckName(e.target.value)} placeholder="e.g. Cell Biology Terms" className="h-10 rounded-xl" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-black text-muted-foreground uppercase tracking-wide mb-1 block">Subject</label>
              <Input value={deckSubject} onChange={e => setDeckSubject(e.target.value)} placeholder="e.g. Biology" className="h-10 rounded-xl" />
            </div>
          </div>
          <div>
            <label className="text-xs font-black text-muted-foreground uppercase tracking-wide mb-1 block">Topic / Notes for AI</label>
            <Textarea value={topic} onChange={e => setTopic(e.target.value)}
              placeholder="Describe the topic or paste notes — AI will generate flashcards."
              className="min-h-[80px] rounded-xl resize-none text-sm" />
          </div>
          <Button onClick={generateCards} disabled={generating || !topic.trim()} variant="outline" className="w-full rounded-xl font-bold h-10 gap-2">
            {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</> : <><Sparkles className="w-4 h-4 text-violet-500" /> Generate with AI</>}
          </Button>
        </div>

        {/* Card editor */}
        <div className="space-y-2">
          <p className="text-xs font-black text-muted-foreground uppercase tracking-wide">{validCards.length} cards</p>
          {cards.map((c, i) => (
            <div key={i} className="bg-white rounded-xl border border-border p-3 flex gap-2 items-start">
              <div className="flex-1 space-y-2">
                <Input placeholder="Front (term / question)" value={c.front}
                  onChange={e => setCards(cs => cs.map((x, j) => j === i ? { ...x, front: e.target.value } : x))}
                  className="h-9 rounded-lg text-sm" />
                <Input placeholder="Back (definition / answer)" value={c.back}
                  onChange={e => setCards(cs => cs.map((x, j) => j === i ? { ...x, back: e.target.value } : x))}
                  className="h-9 rounded-lg text-sm" />
              </div>
              <button onClick={() => setCards(cs => cs.filter((_, j) => j !== i))}
                className="text-muted-foreground hover:text-rose-500 mt-1 shrink-0"><X className="w-4 h-4" /></button>
            </div>
          ))}
          <button onClick={() => setCards(cs => [...cs, { front: '', back: '' }])}
            className="text-xs font-bold text-primary hover:underline">+ Add card</button>
        </div>

        {validCards.length > 0 && (
          <Button onClick={() => createMutation.mutate()} disabled={!deckName.trim() || createMutation.isPending}
            className="w-full h-12 rounded-xl font-bold gradient-violet border-0 text-white">
            {createMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sharing…</> : `📤 Share ${validCards.length} Cards with Class`}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-black text-muted-foreground uppercase tracking-wide">{decks.length} decks shared</p>
        <Button size="sm" className="rounded-xl font-bold h-8 px-3 gap-1" onClick={() => setView('create')}>
          <Plus className="w-3.5 h-3.5" /> Share Deck
        </Button>
      </div>
      {isLoading && <LoadingSpinner />}
      {!isLoading && decks.length === 0 && (
        <EmptyState icon={Layers} title="No decks shared yet" desc="Share a flashcard deck and students can study it right here." />
      )}
      {decks.map((d, i) => (
        <motion.div key={d.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
          className="bg-white rounded-xl border border-border p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5 text-violet-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-foreground truncate">{d.deck_name}</p>
            <p className="text-xs text-muted-foreground">{d.subject || 'General'} · {d.cards.length} cards</p>
          </div>
          <button onClick={() => toast(`Delete "${d.deck_name}"?`, { action: { label: 'Delete', onClick: () => deleteMutation.mutate(d.id) }, cancel: { label: 'Cancel' }, duration: 5000 })}
            className="text-muted-foreground hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-50 transition-colors shrink-0">
            <Trash2 className="w-4 h-4" />
          </button>
        </motion.div>
      ))}
    </div>
  );
}

// ── Teacher: Students ─────────────────────────────────────────────────────────
function TeacherStudents({ classroom }) {
  const queryClient = useQueryClient();
  const removeMember = useMutation({
    mutationFn: ({ id, email }) => base44.classroom.removeMember(id, email),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['classrooms'] }),
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <p className="text-xs font-black text-muted-foreground uppercase tracking-wide">{classroom.members.length} students</p>
      {classroom.members.length === 0 ? (
        <EmptyState icon={Users} title="No students yet" desc={`Share code ${classroom.join_code} to invite students.`} />
      ) : (
        <div className="bg-white rounded-2xl border border-border divide-y divide-border overflow-hidden">
          {classroom.members.map(m => (
            <div key={m.id} className="flex items-center gap-3 px-4 py-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-black text-primary shrink-0">
                {m.student_email[0].toUpperCase()}
              </div>
              <p className="flex-1 text-sm font-semibold text-foreground truncate">{m.student_email}</p>
              <button onClick={() => removeMember.mutate({ id: classroom.id, email: m.student_email })}
                className="text-muted-foreground hover:text-rose-500 transition-colors" title="Remove student">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Student detail view
// ─────────────────────────────────────────────────────────────────────────────
function StudentView({ classroom, user, onBack }) {
  const [tab, setTab] = useState('assignments');
  const tabs = [
    { id: 'assignments', label: 'Assignments', icon: ClipboardList },
    { id: 'decks', label: 'Flashcards', icon: Layers },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-8">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm font-semibold">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-black text-foreground truncate">{classroom.name}</h1>
          <p className="text-xs text-muted-foreground">{classroom.teacher_email}{classroom.subject ? ` · ${classroom.subject}` : ''}</p>
        </div>
      </div>

      <div className="flex gap-1 p-1.5 bg-secondary rounded-2xl">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 text-xs font-bold py-2.5 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${tab === t.id ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'assignments' && <StudentAssignments classroom={classroom} user={user} />}
      {tab === 'decks'       && <StudentDecks classroom={classroom} />}
    </div>
  );
}

// ── Student: Assignments ──────────────────────────────────────────────────────
function StudentAssignments({ classroom, user }) {
  const queryClient = useQueryClient();
  const [view, setView] = useState('list'); // list | taking | results
  const [activeAssignment, setActiveAssignment] = useState(null);
  const [answers, setAnswers] = useState({});
  const [currentQ, setCurrentQ] = useState(0);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['classAssignments', classroom.id],
    queryFn: () => base44.classroom.getAssignments(classroom.id),
  });

  const pending = assignments.filter(a => !a.results?.length);
  const completed = assignments.filter(a => a.results?.length > 0);

  const startAssignment = (a) => {
    setActiveAssignment(a); setAnswers({}); setCurrentQ(0); setResult(null); setView('taking');
  };

  const submitAssignment = async () => {
    setSubmitting(true);
    try {
      const answersArr = activeAssignment.questions.map((_, i) => answers[i] ?? '');
      const res = await base44.classroom.submitAssignment(activeAssignment.id, answersArr);
      queryClient.invalidateQueries({ queryKey: ['classAssignments', classroom.id] });
      setResult(res); setView('results');
    } catch (e) { toast.error(e.message || 'Submission failed.'); }
    setSubmitting(false);
  };

  // ── Results view ─────────────────────────────────────────────────────────
  if (view === 'results' && result) {
    const graded = result.answers || [];
    return (
      <div className="space-y-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className={`rounded-3xl p-7 text-white text-center ${result.passed ? 'bg-gradient-to-br from-emerald-400 to-teal-500' : 'bg-gradient-to-br from-pink-500 to-rose-600'}`}>
          <p className="text-5xl font-black font-space">{result.score}%</p>
          <p className="mt-1 font-black text-lg">{result.passed ? '🎉 Passed!' : 'Keep studying!'}</p>
          <p className="opacity-75 text-sm mt-1">{activeAssignment?.title}</p>
        </motion.div>
        <div className="space-y-2">
          {graded.map((q, i) => (
            <div key={i} className="bg-white rounded-xl border border-border p-4">
              <div className="flex gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${q.is_correct ? 'bg-emerald-100' : 'bg-rose-100'}`}>
                  {q.is_correct ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-rose-600" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">{q.question_text}</p>
                  <p className="text-xs text-muted-foreground mt-1">Your answer: <span className={q.is_correct ? 'text-emerald-600 font-semibold' : 'text-rose-600 font-semibold'}>{q.student_answer || '(blank)'}</span></p>
                  {!q.is_correct && <p className="text-xs text-muted-foreground">Correct: <span className="text-emerald-600 font-semibold">{q.correct_answer}</span></p>}
                  {q.explanation && <p className="text-xs text-muted-foreground mt-1 italic">{q.explanation}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
        <Button onClick={() => { setView('list'); setActiveAssignment(null); }} variant="outline" className="w-full rounded-xl font-bold h-11">
          <RotateCcw className="w-4 h-4 mr-2" /> Back to Assignments
        </Button>
      </div>
    );
  }

  // ── Taking view ──────────────────────────────────────────────────────────
  if (view === 'taking' && activeAssignment) {
    const questions = activeAssignment.questions;
    const q = questions[currentQ];
    const progress = (currentQ / questions.length) * 100;
    const answered = answers[currentQ] !== undefined && answers[currentQ] !== '';

    return (
      <div className="space-y-5">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-muted-foreground">Question {currentQ + 1} of {questions.length} · {activeAssignment.title}</span>
            <span className="text-sm font-bold text-primary">{Math.round(progress)}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
            <motion.div className="h-full bg-gradient-to-r from-violet-500 to-purple-400 rounded-full"
              initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }} />
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={currentQ} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.22 }}
            className="bg-white rounded-2xl border border-border p-6 shadow-sm">
            <p className="text-base font-bold text-foreground mb-5 leading-relaxed">{q.question_text}</p>
            <div className="space-y-2">
              {(q.options ?? []).map((opt, i) => (
                <button key={i} onClick={() => setAnswers(a => ({ ...a, [currentQ]: opt }))}
                  className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${answers[currentQ] === opt ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/40 text-foreground hover:bg-secondary/50'}`}>
                  {opt}
                </button>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="flex gap-3">
          {currentQ > 0 && (
            <Button variant="outline" className="rounded-xl flex-1 h-11 font-semibold" onClick={() => setCurrentQ(q => q - 1)}>Back</Button>
          )}
          {currentQ < questions.length - 1 ? (
            <Button className="rounded-xl flex-1 h-11 font-bold" disabled={!answered} onClick={() => setCurrentQ(q => q + 1)}>Next →</Button>
          ) : (
            <Button className="rounded-xl flex-1 h-11 font-bold bg-gradient-to-r from-violet-600 to-purple-700 text-white border-0" disabled={submitting} onClick={submitAssignment}>
              {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Grading…</> : <><Trophy className="w-4 h-4 mr-2" /> Submit</>}
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ── List view ─────────────────────────────────────────────────────────────
  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-5">
      {pending.length > 0 && (
        <div>
          <p className="text-xs font-black text-muted-foreground uppercase tracking-wide mb-3">To Do ({pending.length})</p>
          <div className="space-y-2">
            {pending.map((a, i) => (
              <motion.div key={a.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="bg-white rounded-xl border border-border p-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-foreground text-sm">{a.title}</p>
                  <p className="text-xs text-muted-foreground">{a.questions.length} questions{a.subject ? ` · ${a.subject}` : ''}</p>
                </div>
                <Button size="sm" onClick={() => startAssignment(a)}
                  className="rounded-xl font-bold bg-gradient-to-r from-violet-500 to-purple-600 text-white border-0 hover:opacity-90 shrink-0 gap-1">
                  <Play className="w-3.5 h-3.5" /> Take
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {completed.length > 0 && (
        <div>
          <p className="text-xs font-black text-muted-foreground uppercase tracking-wide mb-3">Completed ({completed.length})</p>
          <div className="space-y-2">
            {completed.map((a, i) => {
              const r = a.results[0];
              return (
                <motion.div key={a.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className="bg-white rounded-xl border border-border px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm truncate">{a.title}</p>
                    {a.subject && <p className="text-xs text-muted-foreground">{a.subject}</p>}
                  </div>
                  <span className={`text-sm font-black shrink-0 ${r.score >= PASS_SCORE ? 'text-emerald-600' : 'text-rose-500'}`}>{r.score}%</span>
                  {r.passed ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <XCircle className="w-4 h-4 text-rose-400 shrink-0" />}
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {assignments.length === 0 && (
        <EmptyState icon={ClipboardList} title="No assignments yet" desc="Your teacher hasn't posted any assignments yet." />
      )}
    </div>
  );
}

// ── Student: Flashcard Decks ──────────────────────────────────────────────────
function StudentDecks({ classroom }) {
  const [browsing, setBrowsing] = useState(null); // deck object
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const { data: decks = [], isLoading } = useQuery({
    queryKey: ['classDecks', classroom.id],
    queryFn: () => base44.classroom.getDecks(classroom.id),
  });

  if (browsing) {
    const card = browsing.cards[cardIndex];
    return (
      <div className="space-y-4">
        <button onClick={() => { setBrowsing(null); setCardIndex(0); setFlipped(false); }}
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 font-semibold">
          <ArrowLeft className="w-4 h-4" /> Back to decks
        </button>
        <div className="flex items-center justify-between">
          <p className="font-black text-foreground">{browsing.deck_name}</p>
          <span className="text-xs text-muted-foreground">{cardIndex + 1} / {browsing.cards.length}</span>
        </div>

        <motion.div onClick={() => setFlipped(f => !f)} className="cursor-pointer" whileTap={{ scale: 0.98 }}>
          <AnimatePresence mode="wait">
            <motion.div key={`${cardIndex}-${flipped}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className={`rounded-2xl border-2 p-8 min-h-[180px] flex flex-col justify-center text-center transition-colors ${flipped ? 'bg-primary/5 border-primary/30' : 'bg-white border-border'}`}>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">{flipped ? '✅ Answer' : '❓ Question'}</p>
              <p className="text-lg font-bold text-foreground">{flipped ? card.back : card.front}</p>
              <p className="text-xs text-muted-foreground mt-4">Tap to flip</p>
            </motion.div>
          </AnimatePresence>
        </motion.div>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1 rounded-xl h-11 font-semibold"
            disabled={cardIndex === 0} onClick={() => { setCardIndex(i => i - 1); setFlipped(false); }}>← Prev</Button>
          <Button className="flex-1 rounded-xl h-11 font-semibold"
            disabled={cardIndex === browsing.cards.length - 1} onClick={() => { setCardIndex(i => i + 1); setFlipped(false); }}>Next →</Button>
        </div>
        {cardIndex === browsing.cards.length - 1 && (
          <Button variant="outline" className="w-full rounded-xl h-11 font-bold gap-2" onClick={() => { setCardIndex(0); setFlipped(false); }}>
            <RotateCcw className="w-4 h-4" /> Start Over
          </Button>
        )}
      </div>
    );
  }

  if (isLoading) return <LoadingSpinner />;
  if (decks.length === 0) return <EmptyState icon={Layers} title="No flashcard decks yet" desc="Your teacher hasn't shared any decks yet." />;

  return (
    <div className="space-y-3">
      {decks.map((d, i) => (
        <motion.div key={d.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
          className="bg-white rounded-xl border border-border p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5 text-violet-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-foreground truncate">{d.deck_name}</p>
            <p className="text-xs text-muted-foreground">{d.subject || 'General'} · {d.cards.length} cards</p>
          </div>
          <Button size="sm" onClick={() => { setBrowsing(d); setCardIndex(0); setFlipped(false); }}
            className="rounded-xl font-bold bg-gradient-to-r from-violet-500 to-purple-600 text-white border-0 hover:opacity-90 shrink-0 gap-1">
            <BookOpen className="w-3.5 h-3.5" /> Study
          </Button>
        </motion.div>
      ))}
    </div>
  );
}

// ── Shared UI helpers ─────────────────────────────────────────────────────────
function LoadingSpinner() {
  return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
}

function EmptyState({ icon: Icon, title, desc }) {
  return (
    <div className="bg-white rounded-2xl border border-border py-14 px-8 text-center">
      <Icon className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
      <p className="font-bold text-foreground text-sm mb-1">{title}</p>
      <p className="text-xs text-muted-foreground max-w-xs mx-auto">{desc}</p>
    </div>
  );
}
