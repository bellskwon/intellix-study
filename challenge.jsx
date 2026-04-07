import React, { useState } from 'react';
// React is used in ResultsStep via React.useState
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Zap, Loader2, ArrowRight, CheckCircle2, XCircle, Trophy, RotateCcw, Flame, Timer } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const subjects = [
  { value: 'math', label: 'Mathematics' },
  { value: 'science', label: 'Science' },
  { value: 'history', label: 'History' },
  { value: 'geography', label: 'Geography' },
  { value: 'english', label: 'English' },
  { value: 'foreign_language', label: 'Foreign Language' },
  { value: 'computer_science', label: 'Computer Science' },
  { value: 'art', label: 'Art' },
  { value: 'music', label: 'Music' },
  { value: 'other', label: 'Other' },
];

const grades = ['1st','2nd','3rd','4th','5th','6th','7th','8th','9th','10th','11th','12th','college'];
const PASS_THRESHOLD = 80;

export default function Challenge() {
  const [step, setStep] = useState('setup'); // setup | generating | quiz | results
  const [topic, setTopic] = useState('');
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState('');
  const [specificTopic, setSpecificTopic] = useState('');
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [currentQ, setCurrentQ] = useState(0);
  const [results, setResults] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const isPremium = user?.premium_plan && user.premium_plan !== 'free' && user?.trial_end_date && new Date(user.trial_end_date) > new Date();

  const challengeDayKey = `intellix_challenge_uses_${new Date().toISOString().slice(0,10)}`;
  const getChallengeUses = () => { try { return parseInt(localStorage.getItem(challengeDayKey) || '0'); } catch { return 0; } };
  const incrementChallengeUses = () => { try { localStorage.setItem(challengeDayKey, String(getChallengeUses() + 1)); } catch {} };
  const FREE_CHALLENGE_DAILY = 3;

  const generate = async () => {
    if (!topic.trim() || !subject || !grade) { toast.error('Fill in all fields first!'); return; }
    if (!isPremium && getChallengeUses() >= FREE_CHALLENGE_DAILY) {
      toast.error(`You've used all ${FREE_CHALLENGE_DAILY} free challenges for today!`, { action: { label: 'Upgrade', onClick: () => window.location.href = '/premium' } });
      return;
    }
    const usedSoFar = getChallengeUses();
    incrementChallengeUses();
    const remaining = FREE_CHALLENGE_DAILY - usedSoFar - 1;
    if (!isPremium && remaining >= 0) {
      if (remaining === 0) toast.warning(`Last free challenge today! Upgrade to Pro for unlimited.`, { action: { label: 'Upgrade', onClick: () => window.location.href = '/premium' } });
      else toast.info(`${remaining} free challenge${remaining !== 1 ? 's' : ''} remaining today.`);
    }
    setStep('generating');
    const topicDetail = specificTopic ? `Specifically about: ${specificTopic}.` : '';

    const mathNote = subject === 'math' ? ' IMPORTANT: Verify ALL math calculations are correct before including. Double-check arithmetic using a step-by-step approach. Never include a wrong answer.' : '';
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Create a 5-question challenge quiz for a ${grade} grade student on: "${topic}" (subject: ${subject}). ${topicDetail}
Mix types: 2-3 short answer, 1-2 fill-in-the-blank, 1 multiple choice.
Questions should test real understanding for the grade level. Make multiple choice have exactly 4 options.${mathNote}
IMPORTANT: If the topic is blank, nonsensical, or clearly not a real school subject, return an empty questions array.`,
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
    });

    if (!res.questions || res.questions.length === 0) {
      toast.error("We couldn't generate questions for that topic. Please enter a real study subject!");
      setStep('setup');
      return;
    }
    setQuestions(res.questions);
    setAnswers({});
    setCurrentQ(0);
    setStep('quiz');
  };

  const submitQuiz = async () => {
    setSubmitting(true);
    let correct = 0;

    const graded = await Promise.all(questions.map(async (q, i) => {
      const ans = answers[i] || '';
      if (q.question_type === 'multiple_choice') {
        const isCorrect = ans.trim().toLowerCase() === q.correct_answer.trim().toLowerCase();
        if (isCorrect) correct++;
        return { ...q, studentAnswer: ans, isCorrect };
      }
      const check = await base44.integrations.Core.InvokeLLM({
        prompt: `Grade this student answer leniently. Allow abbreviations (bc, cuz, etc.), minor spelling errors, informal phrasing, and synonymous expressions. If the student clearly understands the concept, mark correct.
Question: "${q.question_text}"
Correct answer: "${q.correct_answer}"
Student answer: "${ans}"
Reply with only "correct" or "incorrect".`
      });
      const isCorrect = check.toLowerCase().includes('correct') && !check.toLowerCase().includes('incorrect');
      if (isCorrect) correct++;
      return { ...q, studentAnswer: ans, isCorrect };
    }));

    const score = Math.round((correct / questions.length) * 100);

    // 1 point per completed daily challenge (only if score ≥ 80%)
    await base44.entities.Submission.create({
      title: topic,
      subject,
      grade_level: grade,
      type: 'video',
      status: score >= PASS_THRESHOLD ? 'approved' : 'rejected',
      quiz_score: score,
      quiz_passed: score >= PASS_THRESHOLD,
      points_awarded: score >= PASS_THRESHOLD ? 1 : 0,
      ai_difficulty_score: 5,
    });

    setResults({ score, correct, total: questions.length, graded });
    setSubmitting(false);
    setStep('results');
    queryClient.invalidateQueries({ queryKey: ['mySubmissions'] });
  };

  if (step === 'setup') return <SetupStep topic={topic} setTopic={setTopic} subject={subject} setSubject={setSubject} grade={grade} setGrade={setGrade} specificTopic={specificTopic} setSpecificTopic={setSpecificTopic} onStart={generate} />;
  if (step === 'generating') return <GeneratingStep />;
  if (step === 'quiz') return <QuizStep questions={questions} currentQ={currentQ} setCurrentQ={setCurrentQ} answers={answers} setAnswers={setAnswers} onSubmit={submitQuiz} submitting={submitting} />;
  if (step === 'results') return <ResultsStep results={results} topic={topic} subject={subject} grade={grade} onRetry={() => { setStep('setup'); setResults(null); }} />;
}

function SetupStep({ topic, setTopic, subject, setSubject, grade, setGrade, specificTopic, setSpecificTopic, onStart }) {
  const isMath = subject === 'math';
  return (
    <div className="max-w-xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 gradient-amber rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-amber-300/40 animate-float">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-black text-foreground tracking-tight font-sora">Quick Challenge</h1>
          <p className="text-muted-foreground text-sm mt-1.5">Enter a topic and get a 5-question challenge instantly</p>
        </div>

        <div className="bg-white rounded-2xl border border-border p-6 space-y-4 shadow-sm">
          <div>
            <label className="text-sm font-bold text-foreground mb-1.5 block">What are you studying? <span className="text-rose-500">*</span></label>
            <Input
              placeholder="e.g. Photosynthesis, World War II, Quadratic Formula..."
              value={topic}
              onChange={e => setTopic(e.target.value)}
              className="h-11 rounded-xl border-border font-medium"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-bold text-foreground mb-1.5 block">Subject <span className="text-rose-500">*</span></label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>
                  {subjects.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-bold text-foreground mb-1.5 block">Grade <span className="text-rose-500">*</span></label>
              <Select value={grade} onValueChange={setGrade}>
                <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Select grade" /></SelectTrigger>
                <SelectContent>
                  {grades.map(g => <SelectItem key={g} value={g}>{g} Grade</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-sm font-bold text-foreground mb-1.5 block">
              {isMath ? 'Type of Math (required)' : 'Specific topic or notes (optional)'}
              {isMath && <span className="text-rose-500 ml-1">*</span>}
            </label>
            <Input
              placeholder={isMath
                ? 'e.g. Algebra, Fractions, Long Division, Geometry...'
                : 'e.g. Chapter 3, pages 45-60, the water cycle...'}
              value={specificTopic}
              onChange={e => setSpecificTopic(e.target.value)}
              className="h-11 rounded-xl border-border"
            />
          </div>

          <Button onClick={onStart} className="w-full h-12 rounded-xl font-bold text-base gradient-amber border-0 shadow-lg shadow-amber-300/40 text-white hover:opacity-90">
            <Zap className="w-5 h-5 mr-2" /> Start Challenge
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            { icon: <Zap className="w-5 h-5 text-amber-500 mx-auto" />, label: '5 Questions', sub: 'Focused & fast' },
            { icon: <Trophy className="w-5 h-5 text-violet-500 mx-auto" />, label: 'Instant Score', sub: 'Lenient grading' },
            { icon: <Timer className="w-5 h-5 text-cyan-500 mx-auto" />, label: 'Tracks Progress', sub: 'See improvement' },
          ].map(f => (
            <div key={f.label} className="bg-white rounded-xl border border-border p-3 hover:shadow-sm transition-all">
              <div className="mb-1.5">{f.icon}</div>
              <p className="text-xs font-bold text-foreground">{f.label}</p>
              <p className="text-xs text-muted-foreground">{f.sub}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

function GeneratingStep() {
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
      <p className="text-sm text-muted-foreground">Building your personalized questions...</p>
      <div className="flex gap-1 mt-2">
        {[0, 1, 2].map(i => (
          <motion.div key={i} className="w-2 h-2 rounded-full bg-primary"
            animate={{ y: [0, -8, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.2 }} />
        ))}
      </div>
    </div>
  );
}

function QuizStep({ questions, currentQ, setCurrentQ, answers, setAnswers, onSubmit, submitting }) {
  const q = questions[currentQ];
  const progress = ((currentQ) / questions.length) * 100;
  const answered = answers[currentQ] !== undefined && answers[currentQ] !== '';

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold text-muted-foreground">Question {currentQ + 1} of {questions.length}</span>
          <span className="text-sm font-bold text-primary">{Math.round(progress)}%</span>
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
          <p className="text-base font-bold text-foreground mb-5 leading-relaxed select-none">{q.question_text}</p>

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
            <p className="mt-3 text-xs text-muted-foreground bg-secondary/50 rounded-lg px-3 py-2">
              💡 <span className="font-medium">Hint:</span> {q.hint}
            </p>
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

function ResultsStep({ results, topic, subject, grade, onRetry }) {
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
          className="text-6xl mb-3">{passed ? '🏆' : '💪'}</motion.div>
        <h2 className="text-2xl font-black font-sora">{passed ? 'Crushed it!' : 'Keep grinding!'}</h2>
        <p className="text-6xl font-black mt-2">{score}%</p>
        <p className="opacity-75 mt-1 text-sm">{correct} of {total} correct on "{topic}"</p>
      </motion.div>

      {/* AI Explanation Panel */}
      {!showAI ? (
        <motion.button
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          onClick={fetchExplanation}
          className="w-full rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors p-5 text-center cursor-pointer">
          <p className="text-sm font-black text-primary">Ask AI to explain this topic</p>
          <p className="text-xs text-muted-foreground mt-1">Get a personalized explanation based on your results</p>
        </motion.button>
      ) : (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-primary/20 p-5 shadow-sm">
          <p className="text-xs font-black text-primary mb-3 uppercase tracking-wide">AI Explanation</p>
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
                <p className="text-sm font-semibold text-foreground">{q.question_text}</p>
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-muted-foreground">Your answer: <span className={`font-semibold ${q.isCorrect ? 'text-emerald-600' : 'text-rose-600'}`}>{q.studentAnswer || '(no answer)'}</span></p>
                  {!q.isCorrect && <p className="text-xs text-muted-foreground">Correct: <span className="font-semibold text-emerald-600">{q.correct_answer}</span></p>}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <Button onClick={onRetry} className="w-full h-12 rounded-xl font-bold gradient-violet border-0 text-white shadow-lg hover:opacity-90">
        <RotateCcw className="w-4 h-4 mr-2" /> Try Another Challenge
      </Button>
    </div>
  );
}