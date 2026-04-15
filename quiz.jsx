import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FlaskConical, Upload, CheckCircle2, XCircle, Trophy,
  RotateCcw, Loader2, ArrowRight, BookOpen, Zap, Star, Flag, ChevronDown, ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { format } from 'date-fns';
import SubmitStudy from '@/pages/SubmitStudy';
import { PASS_THRESHOLD } from '@/components/shared/LevelXPBar';

const subjectEmoji = {
  math: '🔢', science: '🔬', history: '📜', geography: '🌍',
  english: '📖', foreign_language: '🗣️', computer_science: '💻',
  art: '🎨', music: '🎵', other: '📌',
};

export default function Quiz() {
  const queryClient = useQueryClient();
  const [view, setView] = useState('list'); // list | submit | taking | results
  const [activeSubmission, setActiveSubmission] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [currentQ, setCurrentQ] = useState(0);
  const [results, setResults] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [grading, setGrading] = useState(false);
  const [reportedQuestions, setReportedQuestions] = useState(new Set());
  const [expandedExplanations, setExpandedExplanations] = useState(new Set());

  const reportQuestion = async (q, i) => {
    try {
      await base44.moderation.reportQuestion({
        questionText: q.question_text,
        correctAnswer: q.correct_answer,
        submissionTitle: activeSubmission?.title || '',
      });
      setReportedQuestions(prev => new Set([...prev, i]));
    } catch {
      toast.error('Could not send report. Please try again.');
    }
  };

  const toggleExplanation = (i) => {
    setExpandedExplanations(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });

  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ['mySubmissions'],
    queryFn: () => base44.entities.Submission.filter({ created_by: user?.email }, '-created_date', 100),
    enabled: !!user?.email,
  });

  // Submissions that haven't been quizzed yet
  const pending = submissions.filter(s => s.quiz_score == null && s.status !== 'rejected');
  // Submissions that have been quizzed
  const completed = submissions.filter(s => s.quiz_score != null);

  // ── Generate quiz from a submission's notes ──────────────────────────────
  const startQuiz = async (submission) => {
    setActiveSubmission(submission);
    setGenerating(true);
    setView('taking');

    try {
      const gradeNote = submission.grade_level ? `Grade level: ${submission.grade_level}.` : '';
      const mathNote = submission.subject === 'math'
        ? ' IMPORTANT: Verify ALL math calculations are correct.'
        : '';

      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a strict quiz generator. Create a 5-question quiz ONLY from the student's notes below.
Subject: ${submission.subject}. ${gradeNote}${mathNote}

RULES:
- Every question and answer MUST be directly supported by the notes. Do NOT add facts, dates, or details not present in the notes.
- If the notes are too thin to support 5 questions, generate fewer rather than inventing content.
- For each question, include a brief source_quote (the exact phrase from the notes that supports the answer).
- For each question, include a 1-2 sentence explanation of WHY the correct answer is right (used to teach the student after the quiz).
- Mix types: 2-3 short answer, 1-2 fill-in-the-blank, 1 multiple choice (exactly 4 options).
- If no valid content is found, return an empty questions array.

Notes:
${submission.notes_text || '(see attached file)'}`,
        file_urls: submission.file_url ? [submission.file_url] : undefined,
        response_json_schema: {
          type: 'object',
          properties: {
            questions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  question_text: { type: 'string' },
                  question_type: { type: 'string', enum: ['short_answer', 'fill_blank', 'multiple_choice'] },
                  options: { type: 'array', items: { type: 'string' } },
                  correct_answer: { type: 'string' },
                  hint: { type: 'string' },
                  source_quote: { type: 'string' },
                  explanation: { type: 'string' },
                },
              },
            },
          },
        },
      });

      if (!res.questions?.length) {
        toast.error("Couldn't generate questions for this submission.");
        setView('list');
        setGenerating(false);
        return;
      }

      setQuestions(res.questions);
      setAnswers({});
      setCurrentQ(0);
    } catch {
      toast.error('Failed to generate quiz. Please try again.');
      setView('list');
    }
    setGenerating(false);
  };

  // ── Grade & save results ─────────────────────────────────────────────────
  const submitQuiz = async () => {
    setGrading(true);
    let correct = 0;

    try {
      const graded = await Promise.all(
        questions.map(async (q, i) => {
          const ans = answers[i] || '';
          if (q.question_type === 'multiple_choice') {
            const isCorrect = ans.trim().toLowerCase() === q.correct_answer.trim().toLowerCase();
            if (isCorrect) correct++;
            return { ...q, studentAnswer: ans, isCorrect };
          }
          // Use AI to grade open answers leniently
          try {
            const check = await base44.integrations.Core.InvokeLLM({
              prompt: `Grade this student answer. Be lenient: allow minor spelling errors, abbreviations, and synonyms. If the student clearly demonstrates understanding of the core concept, mark it correct.
Question: "${q.question_text}"
Expected answer: "${q.correct_answer}"
Student answer: "${ans}"

Reply with ONLY one word: "correct" or "incorrect". Do not add any explanation.`,
            });
            const normalized = (typeof check === 'string' ? check : JSON.stringify(check)).toLowerCase().trim();
            const isCorrect = normalized.startsWith('correct');
            if (isCorrect) correct++;
            return { ...q, studentAnswer: ans, isCorrect };
          } catch {
            // If grading this question fails, count it incorrect but don't fail the whole quiz
            return { ...q, studentAnswer: ans, isCorrect: false };
          }
        })
      );

      const score = Math.round((correct / questions.length) * 100);
      const passed = score >= PASS_THRESHOLD;
      const difficulty = activeSubmission?.ai_difficulty_score ?? 5;
      const pointsAwarded = passed ? Math.max(1, Math.round(difficulty)) : 0;

      // Update the submission with quiz results
      await base44.entities.Submission.update(activeSubmission.id, {
        quiz_score: score,
        quiz_passed: passed,
        points_awarded: pointsAwarded,
        status: passed ? 'approved' : 'rejected',
      });

      queryClient.invalidateQueries({ queryKey: ['mySubmissions'] });
      setResults({ score, correct, total: questions.length, graded, pointsAwarded, passed });
      setView('results');
    } catch {
      toast.error('Failed to grade quiz. Please try again.');
    } finally {
      setGrading(false);
    }
  };

  const reset = () => {
    setView('list');
    setActiveSubmission(null);
    setQuestions([]);
    setAnswers({});
    setResults(null);
  };

  // ── Views ─────────────────────────────────────────────────────────────────

  if (view === 'submit') {
    return (
      <div>
        <button onClick={() => setView('list')} className="text-sm text-muted-foreground hover:text-foreground mb-4 flex items-center gap-1 font-semibold">
          ← Back to quizzes
        </button>
        <SubmitStudy />
      </div>
    );
  }

  if (view === 'taking') {
    if (generating) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-xl shadow-purple-300/50">
            <Zap className="w-7 h-7 text-white" />
          </motion.div>
          <h2 className="text-lg font-black text-foreground">Generating your quiz...</h2>
          <p className="text-sm text-muted-foreground">Analysing your notes with AI</p>
        </div>
      );
    }

    const q = questions[currentQ];
    const progress = (currentQ / questions.length) * 100;
    const answered = answers[currentQ] !== undefined && answers[currentQ] !== '';

    return (
      <div className="max-w-xl mx-auto space-y-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-muted-foreground">
              Question {currentQ + 1} of {questions.length} · {activeSubmission?.title}
            </span>
            <span className="text-sm font-bold text-primary">{Math.round(progress)}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
            <motion.div className="h-full bg-gradient-to-r from-violet-500 to-purple-400 rounded-full"
              initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }} />
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={currentQ} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.25 }}
            className="bg-white rounded-2xl border border-border p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                q.question_type === 'multiple_choice' ? 'bg-blue-50 text-blue-600' :
                q.question_type === 'fill_blank' ? 'bg-purple-50 text-purple-600' :
                'bg-emerald-50 text-emerald-600'}`}>
                {q.question_type === 'multiple_choice' ? 'Multiple Choice' :
                 q.question_type === 'fill_blank' ? 'Fill in Blank' : 'Short Answer'}
              </span>
            </div>
            <p className="text-base font-bold text-foreground mb-5 leading-relaxed">{q.question_text}</p>

            {q.question_type === 'multiple_choice' && q.options?.length > 0 ? (
              <div className="space-y-2">
                {q.options.map((opt, i) => (
                  <button key={i} onClick={() => setAnswers(a => ({ ...a, [currentQ]: opt }))}
                    className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                      answers[currentQ] === opt
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border hover:border-primary/40 text-foreground hover:bg-secondary/50'}`}>
                    <span className="inline-block w-6 h-6 rounded-lg bg-secondary text-xs font-bold mr-3 text-center leading-6">
                      {String.fromCharCode(65 + i)}
                    </span>
                    {opt}
                  </button>
                ))}
              </div>
            ) : (
              <Textarea
                placeholder={q.question_type === 'fill_blank' ? 'Fill in the blank...' : 'Write your answer...'}
                value={answers[currentQ] || ''}
                onChange={e => setAnswers(a => ({ ...a, [currentQ]: e.target.value }))}
                className="min-h-[100px] rounded-xl resize-none text-sm font-medium"
              />
            )}

            {q.hint && (
              <p className="mt-3 text-xs text-muted-foreground bg-secondary/50 rounded-lg px-3 py-2">
                💡 <span className="font-medium">Hint:</span> {q.hint}
              </p>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="flex gap-3">
          {currentQ > 0 && (
            <Button variant="outline" className="rounded-xl flex-1 h-11 font-semibold"
              onClick={() => setCurrentQ(q => q - 1)}>Back</Button>
          )}
          {currentQ < questions.length - 1 ? (
            <Button className="rounded-xl flex-1 h-11 font-bold" disabled={!answered}
              onClick={() => setCurrentQ(q => q + 1)}>
              Next <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button className="rounded-xl flex-1 h-11 font-bold bg-gradient-to-r from-violet-600 to-purple-700 text-white border-0 shadow-lg hover:opacity-90"
              disabled={grading} onClick={submitQuiz}>
              {grading
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Grading...</>
                : <><Trophy className="w-4 h-4 mr-2" /> Submit Quiz</>}
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (view === 'results') {
    const { score, correct, total, graded, pointsAwarded, passed } = results;
    return (
      <div className="max-w-xl mx-auto space-y-5">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className={`rounded-3xl p-8 text-white text-center ${passed ? 'bg-gradient-to-br from-emerald-400 to-teal-500' : 'bg-gradient-to-br from-pink-500 to-rose-600'}`}>
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring' }}
            className="text-6xl mb-3">{passed ? '🏆' : '💪'}</motion.div>
          <h2 className="text-2xl font-black">{passed ? 'Crushed it!' : 'Keep grinding!'}</h2>
          <p className="text-6xl font-black mt-2">{score}%</p>
          <p className="opacity-75 mt-1 text-sm">{correct} of {total} correct · {activeSubmission?.title}</p>
          {passed && pointsAwarded > 0 && (
            <div className="mt-3 inline-flex items-center gap-1.5 bg-white/20 rounded-full px-4 py-1.5">
              <Star className="w-4 h-4 text-yellow-300 fill-yellow-300" />
              <span className="text-sm font-black">+{pointsAwarded} points earned!</span>
            </div>
          )}
        </motion.div>

        <div className="space-y-3">
          {graded.map((q, i) => {
            const showExp = expandedExplanations.has(i);
            const reported = reportedQuestions.has(i);
            return (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white rounded-xl border border-border p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${q.isCorrect ? 'bg-emerald-100' : 'bg-rose-100'}`}>
                    {q.isCorrect
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      : <XCircle className="w-4 h-4 text-rose-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{q.question_text}</p>
                    <div className="mt-2 space-y-1">
                      <p className="text-xs text-muted-foreground">
                        Your answer: <span className={`font-semibold ${q.isCorrect ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {q.studentAnswer || '(no answer)'}
                        </span>
                      </p>
                      {!q.isCorrect && (
                        <p className="text-xs text-muted-foreground">
                          Correct: <span className="font-semibold text-emerald-600">{q.correct_answer}</span>
                        </p>
                      )}
                    </div>

                    {/* Explanation toggle */}
                    {q.explanation && (
                      <div className="mt-2">
                        <button
                          onClick={() => toggleExplanation(i)}
                          className="flex items-center gap-1 text-xs font-semibold text-violet-600 hover:text-violet-800 transition-colors"
                        >
                          {showExp ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          {showExp ? 'Hide explanation' : 'Why is this the answer?'}
                        </button>
                        {showExp && (
                          <p className="mt-1.5 text-xs text-slate-600 bg-violet-50 border border-violet-100 rounded-lg px-3 py-2 leading-relaxed">
                            {q.explanation}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Report button */}
                  <button
                    onClick={() => reportQuestion(q, i)}
                    disabled={reported}
                    title={reported ? 'Reported' : 'Report this question as inaccurate'}
                    className={`shrink-0 p-1.5 rounded-lg transition-colors ${reported ? 'text-rose-400 bg-rose-50 cursor-default' : 'text-muted-foreground hover:text-rose-500 hover:bg-rose-50'}`}
                  >
                    <Flag className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="flex gap-3">
          <Button onClick={reset} className="flex-1 h-12 rounded-xl font-bold bg-gradient-to-r from-violet-600 to-purple-700 text-white border-0 shadow-lg hover:opacity-90">
            <RotateCcw className="w-4 h-4 mr-2" /> Back to Quizzes
          </Button>
        </div>
      </div>
    );
  }

  // ── Default: list view ───────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="relative rounded-3xl overflow-hidden text-white p-7"
        style={{ background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)' }}>
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-10 translate-x-10" />
        <div className="relative z-10">
          <h1 className="text-2xl font-black mb-1">Study Quiz</h1>
          <p className="text-pink-200 text-sm">Upload notes → AI generates a quiz → earn points</p>
        </div>
      </div>

      {/* Upload CTA */}
      <button onClick={() => setView('submit')}
        className="w-full bg-white rounded-2xl border-2 border-dashed border-violet-200 hover:border-violet-400 hover:bg-violet-50/50 transition-all p-5 text-center group">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center mx-auto mb-3 shadow-md group-hover:scale-105 transition-transform">
          <Upload className="w-6 h-6 text-white" />
        </div>
        <p className="font-black text-foreground">Upload New Notes</p>
        <p className="text-xs text-muted-foreground mt-1">PDF, image, or paste text — get a quiz in seconds</p>
      </button>

      {/* Pending quizzes */}
      {pending.length > 0 && (
        <div>
          <h2 className="font-black text-foreground text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-pink-500" /> Ready to Quiz ({pending.length})
          </h2>
          <div className="space-y-3">
            {pending.map((sub, i) => (
              <motion.div key={sub.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white rounded-2xl border border-border p-4 flex items-center gap-4">
                <span className="text-2xl shrink-0">{subjectEmoji[sub.subject] || '📌'}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-foreground truncate">{sub.title}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {sub.subject?.replace(/_/g, ' ')} · {sub.grade_level} · {format(new Date(sub.created_date), 'MMM d')}
                  </p>
                </div>
                <Button size="sm" onClick={() => startQuiz(sub)}
                  className="rounded-xl font-bold bg-gradient-to-r from-violet-500 to-purple-600 text-white border-0 hover:opacity-90 shrink-0">
                  Take Quiz
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Completed quizzes */}
      {completed.length > 0 && (
        <div>
          <h2 className="font-black text-foreground text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-emerald-500" /> Completed ({completed.length})
          </h2>
          <div className="space-y-2">
            {completed.slice(0, 10).map(sub => (
              <div key={sub.id} className="bg-white rounded-xl border border-border px-4 py-3 flex items-center gap-3">
                <span className="text-lg shrink-0">{subjectEmoji[sub.subject] || '📌'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{sub.title}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {sub.subject?.replace(/_/g, ' ')} · {format(new Date(sub.created_date), 'MMM d')}
                  </p>
                </div>
                <span className={`text-xs font-black px-2.5 py-1 rounded-full shrink-0 ${
                  sub.quiz_score >= PASS_THRESHOLD ? 'bg-emerald-50 text-emerald-600' :
                  sub.quiz_score >= 60 ? 'bg-amber-50 text-amber-600' :
                  'bg-rose-50 text-rose-600'}`}>
                  {sub.quiz_score}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && submissions.length === 0 && (
        <div className="bg-white rounded-2xl border border-border py-14 px-8 text-center">
          <svg width="110" height="90" viewBox="0 0 110 90" fill="none" className="mx-auto mb-5 opacity-80">
            <rect x="15" y="20" width="80" height="58" rx="8" fill="#fdf4ff" stroke="#e879f9" strokeWidth="2"/>
            <rect x="27" y="34" width="56" height="5" rx="2.5" fill="#f0abfc"/>
            <rect x="27" y="45" width="38" height="5" rx="2.5" fill="#f5d0fe"/>
            <rect x="27" y="56" width="48" height="5" rx="2.5" fill="#f5d0fe"/>
            <circle cx="85" cy="20" r="13" fill="#a855f7"/>
            <path d="M79.5 20 L83.5 24 L90.5 16" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <h3 className="font-black text-foreground text-lg mb-1">No notes uploaded yet</h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-5">
            Upload your class notes above and get an AI-generated quiz in seconds. Score 80%+ to earn points.
          </p>
          <button onClick={() => setView('submit')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 text-white text-sm font-bold shadow-md shadow-pink-200 hover:opacity-90 transition-opacity">
            Upload Your First Notes →
          </button>
        </div>
      )}
    </div>
  );
}
