import React, { useState, useEffect } from 'react';
// React is used in ResultsStep via React.useState
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Zap, Loader2, ArrowRight, CheckCircle2, XCircle, Trophy, RotateCcw, Flame, Timer, FlaskConical, Globe, BookOpen, Code2, Music, Palette, Scroll, Star, Languages } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import SaveToFolderModal from '@/pages/SaveToFolder';
import { renderWithSubscripts } from '@/lib/utils';

const subjects = [
  { value: 'math',             label: 'Math',            icon: Zap,          color: 'bg-blue-100 text-blue-700',    card: 'from-blue-500 to-indigo-600',   pill: 'border-blue-400 bg-blue-50 text-blue-700' },
  { value: 'science',          label: 'Science',         icon: FlaskConical, color: 'bg-emerald-100 text-emerald-700', card: 'from-emerald-500 to-teal-600', pill: 'border-emerald-400 bg-emerald-50 text-emerald-700' },
  { value: 'history',          label: 'History',         icon: Scroll,       color: 'bg-amber-100 text-amber-700',  card: 'from-amber-500 to-orange-600',  pill: 'border-amber-400 bg-amber-50 text-amber-700' },
  { value: 'geography',        label: 'Geography',       icon: Globe,        color: 'bg-teal-100 text-teal-700',    card: 'from-teal-500 to-cyan-600',     pill: 'border-teal-400 bg-teal-50 text-teal-700' },
  { value: 'english',          label: 'English',         icon: BookOpen,     color: 'bg-violet-100 text-violet-700',card: 'from-violet-500 to-purple-600', pill: 'border-violet-400 bg-violet-50 text-violet-700' },
  { value: 'foreign_language', label: 'Languages',       icon: Languages,    color: 'bg-pink-100 text-pink-700',    card: 'from-pink-500 to-rose-600',     pill: 'border-pink-400 bg-pink-50 text-pink-700' },
  { value: 'computer_science', label: 'CS',              icon: Code2,        color: 'bg-cyan-100 text-cyan-700',    card: 'from-cyan-500 to-blue-600',     pill: 'border-cyan-400 bg-cyan-50 text-cyan-700' },
  { value: 'art',              label: 'Art',             icon: Palette,      color: 'bg-rose-100 text-rose-700',    card: 'from-rose-500 to-pink-600',     pill: 'border-rose-400 bg-rose-50 text-rose-700' },
  { value: 'music',            label: 'Music',           icon: Music,        color: 'bg-orange-100 text-orange-700',card: 'from-orange-500 to-amber-600',  pill: 'border-orange-400 bg-orange-50 text-orange-700' },
  { value: 'other',            label: 'Other',           icon: Star,         color: 'bg-slate-100 text-slate-700',  card: 'from-slate-500 to-gray-600',    pill: 'border-slate-400 bg-slate-50 text-slate-700' },
];

const grades = ['1st','2nd','3rd','4th','5th','6th','7th','8th','9th','10th','11th','12th','college'];
const PASS_THRESHOLD = 80;

export default function Challenge() {
  const [step, setStep] = useState('setup'); // setup | generating | quiz | results
  const [generateError, setGenerateError] = useState(null);
  const [topic, setTopic] = useState('');
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [specificTopic, setSpecificTopic] = useState('');
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [currentQ, setCurrentQ] = useState(0);
  const [results, setResults] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showHints, setShowHints] = useState({});
  const queryClient = useQueryClient();

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });

  const { data: challengeHistory = [] } = useQuery({
    queryKey: ['challengeHistory', user?.email],
    queryFn: () => base44.entities.Submission.filter({ created_by: user?.email, type: 'video' }, '-created_date', 30),
    enabled: !!user?.email,
  });

  const todayStr = new Date().toDateString();
  const alreadyPassedToday = challengeHistory.some(s =>
    s.quiz_passed && new Date(s.created_date).toDateString() === todayStr
  );

  // Pre-select subject from a challenge link: /challenge?subject=math&challenger=friend@email.com
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const subjectParam = params.get('subject');
    const challenger = params.get('challenger');
    if (subjectParam && subjects.some(s => s.value === subjectParam)) {
      setSubject(subjectParam);
    }
    if (challenger) {
      toast.info(`${challenger.split('@')[0]} challenged you to a ${subjectParam || 'knowledge'} quiz! Good luck!`, { duration: 5000 });
      // Clean the URL without refreshing
      window.history.replaceState({}, '', '/challenge');
    }
  }, []);


  const generate = async () => {
    if (!topic.trim() || !subject || !grade) { toast.error('Fill in all fields first!'); return; }
    if (subject === 'math' && !specificTopic.trim()) { toast.error('Please specify the type of math (e.g. Algebra, Fractions).'); return; }
    setGenerateError(null);
    setStep('generating');
    try {
    const topicDetail = specificTopic ? `Specifically about: ${specificTopic}.` : '';
    const difficultyNote = difficulty === 'easy' ? ' Use straightforward recall questions appropriate for beginners.' : difficulty === 'hard' ? ' Use challenging questions that require deep understanding, multi-step reasoning, or application of concepts.' : ' Use moderate difficulty questions.';
    const mathNote = subject === 'math' ? ' IMPORTANT: Verify ALL math calculations are correct before including. Double-check arithmetic using a step-by-step approach. Never include a wrong answer.' : '';

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Generation timed out — the AI took too long. Please try again.')), 30000)
    );
    const res = await Promise.race([
      base44.integrations.Core.InvokeLLM({
        prompt: `You are an expert curriculum writer creating a quiz for a ${grade} grade student.
Topic: "${topic}" (subject: ${subject}). ${topicDetail}${mathNote}${difficultyNote}

RULES:
- Only include questions whose answers are factually certain and verifiable (no opinion, no ambiguity).
- Use standard academic consensus — no niche interpretations or regional variations.
- CRITICAL: Before finalising each question, verify the correct_answer is accurate. If you are not certain, omit the question.
- For math: write out the full worked answer in correct_answer (e.g. "3x + 6 = 15 → 3x = 9 → x = 3"). This lets the grader verify your arithmetic.
- For multiple_choice questions: correct_answer MUST be an exact copy of one of the strings in the options array — same words, same capitalisation. Double-check this before returning.
- Calibrate difficulty exactly to ${grade} grade. Do not include content beyond that level.
- Mix types: 2-3 short answer, 1-2 fill-in-the-blank, 1 multiple choice (exactly 4 options).
- If the topic is blank, nonsensical, or not a real school subject, return an empty questions array.`,
        response_json_schema: {
          type: "object",
          properties: {
            questions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  question_text: { type: "string" },
                  question_type: { type: "string", enum: ["short_answer","fill_blank","multiple_choice"] },
                  options: { type: "array", items: { type: "string" } },
                  correct_answer: { type: "string" },
                  hint: { type: "string" }
                }
              }
            }
          }
        }
      }),
      timeoutPromise,
    ]);

    if (!res.questions || res.questions.length === 0) {
      setGenerateError("That doesn't look like a real study topic. Please enter something you're actually studying (e.g. Photosynthesis, World War II, Algebra).");
      return;
    }

    // Validate MC questions: correct_answer must match an option exactly
    const validated = res.questions.map(q => {
      if (q.question_type !== 'multiple_choice' || !q.options?.length) return q;
      const match = q.options.find(o => o.trim().toLowerCase() === q.correct_answer?.trim().toLowerCase());
      if (match) return { ...q, correct_answer: match };
      // No exact match — demote to short_answer so the AI grader handles it
      const { options: _o, ...rest } = q;
      return { ...rest, question_type: 'short_answer' };
    });

    setQuestions(validated);
    setAnswers({});
    setCurrentQ(0);
    setStep('quiz');
    } catch (err) {
      setGenerateError(err?.message || 'Something went wrong generating your challenge. Please try again.');
    }
  };

  const submitQuiz = async () => {
    setSubmitting(true);
    let correct = 0;

    try {
      const graded = [];
      for (const [i, q] of questions.entries()) {
        const ans = answers[i] || '';
        // Blank answers are always incorrect — don't waste an AI call
        if (!ans.trim()) {
          graded.push({ ...q, studentAnswer: ans, isCorrect: false });
          continue;
        }
        if (q.question_type === 'multiple_choice') {
          const isCorrect = ans.trim().toLowerCase() === q.correct_answer.trim().toLowerCase();
          if (isCorrect) correct++;
          graded.push({ ...q, studentAnswer: ans, isCorrect });
          continue;
        }
        const check = await base44.integrations.Core.InvokeLLM({
          prompt: `Grade this student answer leniently. Allow abbreviations (bc, cuz, etc.), minor spelling errors, informal phrasing, and synonymous expressions. If the student clearly understands the concept, mark correct.
Question: "${q.question_text}"
Correct answer: "${q.correct_answer}"
Student answer: "${ans}"
Reply with only "correct" or "incorrect".`
        });
        const isCorrect = (typeof check === 'string' ? check : JSON.stringify(check)).toLowerCase().trim().startsWith('correct');
        if (isCorrect) correct++;
        graded.push({ ...q, studentAnswer: ans, isCorrect });
      }

      const score = Math.round((correct / questions.length) * 100);
      const passed = score >= PASS_THRESHOLD;

      // 1 point per daily challenge pass — zero if they already passed one today
      await base44.entities.Submission.create({
        title: topic,
        subject,
        grade_level: grade,
        type: 'video',
        status: passed ? 'approved' : 'rejected',
        quiz_score: score,
        quiz_passed: passed,
        points_awarded: passed && !alreadyPassedToday ? 1 : 0,
        ai_difficulty_score: 5,
      });

      setResults({ score, correct, total: questions.length, graded, passed });
      setStep('results');
      setShowSaveModal(true);
      queryClient.invalidateQueries({ queryKey: ['mySubmissions'] });
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    } catch (err) {
      toast.error(err?.message?.includes('Rate limit') ? 'AI is busy — wait a moment and try again.' : `Grading failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (step === 'setup') return <SetupStep topic={topic} setTopic={setTopic} subject={subject} setSubject={setSubject} grade={grade} setGrade={setGrade} difficulty={difficulty} setDifficulty={setDifficulty} specificTopic={specificTopic} setSpecificTopic={setSpecificTopic} onStart={generate} alreadyPassedToday={alreadyPassedToday} />;
  if (step === 'generating') return <GeneratingStep error={generateError} onCancel={() => { setStep('setup'); setGenerateError(null); }} />;
  if (step === 'quiz') return <QuizStep questions={questions} currentQ={currentQ} setCurrentQ={setCurrentQ} answers={answers} setAnswers={setAnswers} onSubmit={submitQuiz} submitting={submitting} showHints={showHints} setShowHints={setShowHints} />;
  if (step === 'results') return <ResultsStep results={results} topic={topic} subject={subject} grade={grade} onRetry={() => { setStep('setup'); setResults(null); }} showSaveModal={showSaveModal} setShowSaveModal={setShowSaveModal} />;
}

const DIFFICULTY = [
  { value: 'easy',   label: 'Easy',   active: 'bg-emerald-500 text-white border-emerald-500', hover: 'hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-400' },
  { value: 'medium', label: 'Medium', active: 'bg-amber-400 text-white border-amber-400',     hover: 'hover:bg-amber-50 hover:text-amber-700 hover:border-amber-400' },
  { value: 'hard',   label: 'Hard',   active: 'bg-rose-500 text-white border-rose-500',       hover: 'hover:bg-rose-50 hover:text-rose-700 hover:border-rose-400' },
];

function SetupStep({ topic, setTopic, subject, setSubject, grade, setGrade, difficulty, setDifficulty, specificTopic, setSpecificTopic, onStart, alreadyPassedToday }) {
  const [hoveredSubject, setHoveredSubject] = React.useState(null);
  const isMath = subject === 'math';
  const selected = subjects.find(s => s.value === subject);
  const SubjectIcon = selected?.icon || Zap;

  return (
    <div className="pb-8">
      {/* Dark hero — full width */}
      <div className="-mx-4 -mt-4 lg:-mx-8 lg:-mt-8 mb-6">
        <div className="bg-[#130d25] px-6 pt-7 pb-8">
          <div className="max-w-xl mx-auto">
            <div className="flex items-center justify-end mb-5">
              <span className="flex items-center gap-1.5 bg-white/10 text-white/70 text-xs font-bold px-3 py-1.5 rounded-full">
                <Timer className="w-3 h-3 text-amber-400" />
                <span className="text-white/80 font-black">AI Graded</span>
              </span>
            </div>
            <div className="leading-none mb-3">
              <h1 className="font-black text-white" style={{ fontSize: 'clamp(3rem, 12vw, 5rem)', lineHeight: 0.92 }}>Quick</h1>
              <h1 className="font-black text-amber-400" style={{ fontSize: 'clamp(3rem, 12vw, 5rem)', lineHeight: 0.92 }}>Challenge</h1>
            </div>
            <p className="text-white/50 text-sm">Pick a subject, choose your difficulty, and test your knowledge.</p>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

        {/* Subject preview card */}
        <div className={`rounded-2xl p-5 flex items-center justify-between bg-gradient-to-br ${selected ? selected.card : 'from-slate-100 to-slate-200'}`}>
          <div>
            <p className={`text-lg font-black ${selected ? 'text-white' : 'text-foreground'}`}>
              {selected ? `${selected.label} challenge` : 'Pick a subject'}
            </p>
            <p className={`text-sm mt-0.5 ${selected ? 'text-white/70' : 'text-muted-foreground'}`}>5 questions · AI graded</p>
          </div>
          <SubjectIcon className={`w-12 h-12 ${selected ? 'text-white/80' : 'text-muted-foreground'}`} strokeWidth={1.2} />
        </div>

        {alreadyPassedToday && (
          <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            <p className="text-sm text-emerald-800"><span className="font-bold">Daily point earned!</span> Extra attempts are great practice but won't award more points until tomorrow.</p>
          </div>
        )}

        {/* Subject pills */}
        <div>
          <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-2">Subject</p>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {subjects.map(s => {
              const Icon = s.icon;
              const isActive = subject === s.value;
              const isHovered = hoveredSubject === s.value;
              return (
                <button key={s.value}
                  onClick={() => setSubject(s.value)}
                  onMouseEnter={() => setHoveredSubject(s.value)}
                  onMouseLeave={() => setHoveredSubject(null)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-full border-2 text-sm font-bold whitespace-nowrap transition-all shrink-0 ${
                    isActive || isHovered ? `${s.pill} border-current shadow-sm` : 'border-border text-muted-foreground'
                  }`}>
                  <Icon className="w-3.5 h-3.5" />
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Difficulty */}
        <div>
          <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-2">Difficulty</p>
          <div className="flex gap-2">
            {DIFFICULTY.map(d => (
              <button key={d.value} onClick={() => setDifficulty(d.value)}
                className={`flex-1 py-2.5 rounded-2xl border-2 text-sm font-black transition-all ${
                  difficulty === d.value ? d.active : `border-border text-muted-foreground ${d.hover}`
                }`}>
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Grade pills */}
        <div>
          <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-2">Grade</p>
          <div className="flex flex-wrap gap-2">
            {grades.map(g => (
              <button key={g} onClick={() => setGrade(g)}
                className={`px-3.5 py-1.5 rounded-full border-2 text-sm font-bold transition-all ${
                  grade === g
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border text-muted-foreground hover:border-foreground/40'
                }`}>
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Topic input */}
        <div>
          <Input
            placeholder={isMath ? 'What type of math? e.g. Algebra, Fractions...' : 'What topic? e.g. Photosynthesis, WW2...'}
            value={topic}
            onChange={e => setTopic(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && onStart()}
            className="h-14 rounded-2xl text-sm font-medium bg-foreground text-background placeholder:text-background/40 border-0 px-5"
          />
        </div>

        {/* Specific topic for math */}
        {isMath && (
          <Input
            placeholder="Specific type of math, e.g. Quadratic equations..."
            value={specificTopic}
            onChange={e => setSpecificTopic(e.target.value)}
            className="h-11 rounded-xl border-border"
          />
        )}

        {/* Start button */}
        <Button onClick={onStart} className={`w-full h-14 rounded-2xl font-black text-base border-0 text-white shadow-lg hover:opacity-90 bg-gradient-to-r ${selected ? selected.card : 'from-violet-500 to-purple-600'}`}>
          <Zap className="w-5 h-5 mr-2" /> Start Challenge
        </Button>
      </motion.div>
    </div>
  </div>
  );
}

function GeneratingStep({ error, onCancel }) {
  if (error) {
    return (
      <div className="max-w-md mx-auto flex flex-col items-center justify-center min-h-[60vh] gap-5 text-center px-4">
        <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center">
          <XCircle className="w-8 h-8 text-rose-500" />
        </div>
        <div>
          <h2 className="text-lg font-black text-foreground">Couldn't build your challenge</h2>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{error}</p>
        </div>
        <Button onClick={onCancel} className="rounded-xl font-bold bg-gradient-to-r from-violet-500 to-purple-600 border-0 text-white px-8">
          <RotateCcw className="w-4 h-4 mr-2" /> Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        className="w-16 h-16 rounded-full gradient-violet flex items-center justify-center shadow-xl shadow-purple-300/50"
      >
        <Zap className="w-7 h-7 text-white" />
      </motion.div>
      <h2 className="text-lg font-black text-foreground">Building your challenge...</h2>
      <p className="text-sm text-muted-foreground">Generating your personalized questions...</p>
      <div className="flex gap-1 mt-2">
        {[0, 1, 2].map(i => (
          <motion.div key={i} className="w-2 h-2 rounded-full bg-primary"
            animate={{ y: [0, -8, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.2 }} />
        ))}
      </div>
      <button onClick={onCancel}
        className="mt-4 text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline transition-colors">
        Cancel
      </button>
    </div>
  );
}

const QUESTION_TIMER = 60;

function QuizStep({ questions, currentQ, setCurrentQ, answers, setAnswers, onSubmit, submitting, showHints, setShowHints }) {
  const q = questions[currentQ];
  const progress = ((currentQ) / questions.length) * 100;
  const answered = answers[currentQ] !== undefined && answers[currentQ] !== '';

  const [timeLeft, setTimeLeft] = useState(QUESTION_TIMER);

  useEffect(() => {
    setTimeLeft(QUESTION_TIMER);
  }, [currentQ]);

  useEffect(() => {
    if (submitting) return;
    if (timeLeft <= 0) {
      if (currentQ < questions.length - 1) {
        setCurrentQ(q => q + 1);
      } else {
        onSubmit();
      }
      return;
    }
    const id = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(id);
  }, [timeLeft, currentQ, questions.length, setCurrentQ, submitting]);

  const timerColor = timeLeft <= 5 ? 'text-rose-500' : timeLeft <= 15 ? 'text-amber-500' : 'text-muted-foreground';

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold text-muted-foreground">Question {currentQ + 1} of {questions.length}</span>
          <div className="flex items-center gap-2">
            <Timer className={`w-3.5 h-3.5 ${timerColor}`} />
            <span className={`text-sm font-black tabular-nums ${timerColor}`}>{timeLeft}s</span>
          </div>
        </div>
        <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
          <motion.div className="h-full gradient-violet rounded-full" initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }} />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={currentQ} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.25 }}
          className="bg-white rounded-2xl border border-border p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <span className={`text-xs font-bold px-2 py-1 rounded-full ${
              q.question_type === 'multiple_choice' ? 'bg-blue-50 text-blue-600' :
              q.question_type === 'fill_blank' ? 'bg-purple-50 text-purple-600' :
              'bg-emerald-50 text-emerald-600'
            }`}>
              {q.question_type === 'multiple_choice' ? 'Multiple Choice' : q.question_type === 'fill_blank' ? 'Fill in Blank' : 'Short Answer'}
            </span>
          </div>
          <p className="text-base font-bold text-foreground mb-5 leading-relaxed select-none">{renderWithSubscripts(q.question_text)}</p>

          {q.question_type === 'multiple_choice' && q.options?.length > 0 ? (
            <div className="space-y-2">
              {q.options.map((opt, i) => (
                <button key={i} onClick={() => setAnswers(a => ({ ...a, [currentQ]: opt }))}
                  className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all duration-200 ${
                    answers[currentQ] === opt
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border hover:border-primary/40 text-foreground hover:bg-secondary/50'
                  }`}>
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
            <div className="mt-3">
              {!showHints[currentQ] ? (
                <button
                  className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline transition-colors"
                  onClick={() => setShowHints(h => ({ ...h, [currentQ]: true }))}
                >
                  Need a hint?
                </button>
              ) : (
                <p className="text-xs text-muted-foreground/70 italic">{q.hint}</p>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="flex gap-3">
        {currentQ > 0 && (
          <Button variant="outline" className="rounded-xl flex-1 h-11 font-semibold" onClick={() => setCurrentQ(q => q - 1)}>
            Back
          </Button>
        )}
        {currentQ < questions.length - 1 ? (
          <Button className="rounded-xl flex-1 h-11 font-bold" disabled={!answered} onClick={() => setCurrentQ(q => q + 1)}>
            Next <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button className="rounded-xl flex-1 h-11 font-bold gradient-violet border-0 text-white shadow-lg shadow-purple-300/40 hover:opacity-90"
            disabled={submitting} onClick={onSubmit}>
            {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Grading...</> : <><Trophy className="w-4 h-4 mr-2" /> Submit Quiz</>}
          </Button>
        )}
      </div>
    </div>
  );
}

function ResultsStep({ results, topic, subject, grade, onRetry, showSaveModal, setShowSaveModal }) {
  const { score, correct, total, graded } = results;
  const passed = score >= PASS_THRESHOLD;
  const [aiExplanation, setAiExplanation] = React.useState('');
  const [loadingAI, setLoadingAI] = React.useState(false);
  const [showAI, setShowAI] = React.useState(false);

  const fetchExplanation = async () => {
    setLoadingAI(true);
    setShowAI(true);
    const wrongOnes = graded.filter(q => !q.isCorrect).map(q => `Q: ${q.question_text}\nCorrect: ${q.correct_answer}`).join('\n\n');
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `A ${grade} grade student just completed a quiz on "${topic}" (${subject}). They scored ${score}%.
${wrongOnes ? `They got these questions wrong:\n${wrongOnes}\n\n` : 'They got everything right!\n\n'}
Write a clear, encouraging, student-friendly explanation to help them understand the topic better. 
${wrongOnes ? 'Focus on clarifying the concepts they missed.' : 'Reinforce why they got things right and give them a fun fact to go deeper.'}
Keep it concise (3-5 short paragraphs), use simple language appropriate for the grade level.`
    });
    setAiExplanation(typeof res === 'string' ? res : JSON.stringify(res));
    setLoadingAI(false);
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        className={`rounded-3xl p-8 text-white text-center ${passed ? 'gradient-emerald' : 'gradient-pink'}`}>
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring' }}
          className="flex items-center justify-center mb-3">
          {passed ? (
            <svg viewBox="0 0 80 80" className="w-20 h-20 drop-shadow-lg" fill="none">
              <circle cx="40" cy="40" r="38" fill="rgba(255,255,255,0.2)" />
              <path d="M26 22h28v6c0 8-6 14-14 14s-14-6-14-14v-6z" fill="#fbbf24" stroke="#f59e0b" strokeWidth="2"/>
              <path d="M26 24c-4 2-8 6-8 10 0 5 4 9 8 9" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M54 24c4 2 8 6 8 10 0 5-4 9-8 9" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round"/>
              <rect x="34" y="42" width="12" height="8" rx="2" fill="#fcd34d"/>
              <rect x="28" y="50" width="24" height="5" rx="2.5" fill="#f59e0b"/>
              <circle cx="40" cy="32" r="5" fill="#fef3c7"/>
              <path d="M37 32l2 2 4-4" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : (
            <svg viewBox="0 0 80 80" className="w-20 h-20 drop-shadow-lg" fill="none">
              <circle cx="40" cy="40" r="38" fill="rgba(255,255,255,0.2)" />
              <path d="M28 52c0-8 4-14 12-18 8 4 12 10 12 18" fill="#a78bfa" stroke="#8b5cf6" strokeWidth="2"/>
              <path d="M34 34c0-4 3-6 6-6s6 2 6 6-3 8-6 10c-3-2-6-6-6-10z" fill="#c4b5fd" stroke="#8b5cf6" strokeWidth="1.5"/>
              <path d="M32 46c-3 1-6 4-6 8" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round"/>
              <path d="M48 46c3 1 6 4 6 8" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round"/>
              <path d="M36 26l-4-4M44 26l4-4M40 24v-5" stroke="#c4b5fd" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          )}
        </motion.div>
        <h2 className="text-2xl font-black font-sora">{passed ? 'Crushed it!' : 'Keep grinding!'}</h2>
        <p className="text-7xl font-bebas tracking-wide mt-2">{score}%</p>
        <p className="opacity-75 mt-1 text-sm font-outfit">{correct} of {total} correct on "{topic}"</p>
      </motion.div>

      {/* Explanation Panel */}
      {!showAI ? (
        <motion.button
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          onClick={fetchExplanation}
          className="w-full rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors p-5 text-center cursor-pointer">
          <p className="text-sm font-black text-primary">Get an explanation of this topic</p>
          <p className="text-xs text-muted-foreground mt-1">Get a personalized explanation based on your results</p>
        </motion.button>
      ) : (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-primary/20 p-5 shadow-sm">
          <p className="text-xs font-black text-primary mb-3 uppercase tracking-wide">Topic Explanation</p>
          {loadingAI ? (
            <div className="flex items-center gap-3 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="text-sm">Generating explanation...</span>
            </div>
          ) : (
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{aiExplanation}</p>
          )}
        </motion.div>
      )}

      <div className="space-y-3">
        {graded.map((q, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-white rounded-xl border border-border p-4">
            <div className="flex items-start gap-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${q.isCorrect ? 'bg-emerald-100' : 'bg-rose-100'}`}>
                {q.isCorrect ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-rose-600" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{renderWithSubscripts(q.question_text)}</p>
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-muted-foreground">Your answer: <span className={`font-semibold ${q.isCorrect ? 'text-emerald-600' : 'text-rose-600'}`}>{q.studentAnswer || '(no answer)'}</span></p>
                  {!q.isCorrect && <p className="text-xs text-muted-foreground">Correct: <span className="font-semibold text-emerald-600">{q.correct_answer}</span></p>}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex gap-3">
        <Button onClick={() => setShowSaveModal(true)} variant="outline" className="flex-1 h-12 rounded-xl font-bold border-2">
          Save Result
        </Button>
        <Button onClick={onRetry} className="flex-1 h-12 rounded-xl font-bold gradient-violet border-0 text-white shadow-lg hover:opacity-90">
          <RotateCcw className="w-4 h-4 mr-2" /> Try Another
        </Button>
      </div>

      <SaveToFolderModal
        open={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        type="challenge"
        title={`${topic} Challenge`}
        subject={subject}
        grade={grade}
        data={results}
      />
    </div>
  );
}