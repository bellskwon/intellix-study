import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Brain, Layers, Star, ChevronDown, ChevronUp, Loader2, RotateCcw, Upload, Calendar, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import MiniCalendar from '@/components/dashboard/MiniCalendar';

const TABS = [
  { id: 'analyze', label: 'Key Points', icon: Star },
  { id: 'questions', label: 'Practice Questions', icon: Brain },
  { id: 'flashcards', label: 'Flashcards', icon: Layers },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
];

const subjects = ['math','science','history','geography','english','foreign_language','computer_science','other'];
const grades = ['6th','7th','8th','9th','10th','11th','12th','college'];
const FREE_QUESTIONS_LIMIT = 5;
const PREMIUM_QUESTIONS_LIMIT = 50;

export default function Questions() {
  const [activeTab, setActiveTab] = useState('analyze');
  const [notes, setNotes] = useState('');
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState('');
  const [file, setFile] = useState(null);
  const [numQuestions, setNumQuestions] = useState(5);
  const [difficulty, setDifficulty] = useState('mixed');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [expandedHints, setExpandedHints] = useState({});

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const isPremium = user?.premium_plan && user.premium_plan !== 'free' && user?.trial_end_date && new Date(user.trial_end_date) > new Date();

  // Count today's tool uses from localStorage
  const todayKey = `intellix_tool_uses_${new Date().toISOString().slice(0,10)}`;
  const getTodayUses = () => { try { return parseInt(localStorage.getItem(todayKey) || '0'); } catch { return 0; } };
  const incrementUses = () => { try { localStorage.setItem(todayKey, String(getTodayUses() + 1)); } catch {} };

  const FREE_DAILY_LIMIT = 3; // 3 tool uses per day on free
  const maxQuestions = isPremium ? PREMIUM_QUESTIONS_LIMIT : FREE_QUESTIONS_LIMIT;

  const uploadAndGetContext = async () => {
    let context = notes;
    if (file) {
      const res = await base44.integrations.Core.UploadFile({ file });
      return { file_url: res.file_url, context };
    }
    return { file_url: null, context };
  };

  const checkAndIncrementUses = () => {
    if (!isPremium && getTodayUses() >= FREE_DAILY_LIMIT) {
      toast.error(`You've used all ${FREE_DAILY_LIMIT} free uses for today!`, { action: { label: 'Upgrade', onClick: () => window.location.href = '/premium' } });
      return false;
    }
    const usedSoFar = getTodayUses();
    incrementUses();
    const remaining = FREE_DAILY_LIMIT - usedSoFar - 1;
    if (!isPremium && remaining >= 0) {
      if (remaining === 0) toast.warning(`Last free use today! Upgrade to Pro for $5.99/month.`, { action: { label: 'Upgrade', onClick: () => window.location.href = '/premium' } });
      else toast.info(`${remaining} free use${remaining !== 1 ? 's' : ''} remaining today.`);
    }
    return true;
  };

  const handleAnalyze = async () => {
    if (!notes.trim() && !file) { toast.error('Paste your notes or upload a file first!'); return; }
    if (!checkAndIncrementUses()) return;
    setLoading(true); setResult(null);
    const { file_url, context } = await uploadAndGetContext();
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an expert study coach. Analyze these student notes and:
1. Identify the 5-8 most important key points most likely to appear on a test.
2. For each key point, explain WHY it's important.
3. Generate a brief summary of the main topic.
Notes: ${context || '(see attached file)'}
Subject: ${subject || 'general'}, Grade: ${grade || 'high school'}
IMPORTANT: If the notes are blank, nonsensical, unrelated to any academic subject, or contain no real study content (e.g. a blank image), return key_points as an empty array and topic_summary as an empty string.`,
      file_urls: file_url ? [file_url] : undefined,
      response_json_schema: {
        type: 'object',
        properties: {
          topic_summary: { type: 'string' },
          key_points: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                point: { type: 'string' },
                importance: { type: 'string' },
                likely_on_test: { type: 'boolean' },
              }
            }
          }
        }
      }
    });
    if (!res.key_points?.length || !res.topic_summary?.trim()) {
      toast.error("We couldn't find any study content. Please submit real notes or a valid topic!");
      setLoading(false); return;
    }
    setResult({ type: 'analyze', data: res });
    setLoading(false);
  };

  const handleGenerateQuestions = async () => {
    if (!notes.trim() && !file) { toast.error('Paste your notes or upload a file first!'); return; }
    if (!checkAndIncrementUses()) return;
    const count = Math.min(numQuestions, maxQuestions);
    setLoading(true); setResult(null);
    const { file_url, context } = await uploadAndGetContext();
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Generate exactly ${count} practice questions based on these study notes.
Difficulty: ${difficulty === 'mixed' ? 'mix of easy, medium, and hard' : difficulty}.
For each question include: question text, difficulty level, a hint, and the full answer explanation.
Subject: ${subject || 'general'}, Grade: ${grade || 'high school'}
Notes: ${context || '(see attached file)'}
IMPORTANT: If the notes contain no real study content, return an empty questions array.`,
      file_urls: file_url ? [file_url] : undefined,
      response_json_schema: {
        type: 'object',
        properties: {
          questions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                question: { type: 'string' },
                difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
                hint: { type: 'string' },
                answer: { type: 'string' },
              }
            }
          }
        }
      }
    });
    if (!res.questions?.length) {
      toast.error("No questions could be generated. Please submit real notes or a valid study topic!");
      setLoading(false); return;
    }
    setResult({ type: 'questions', data: res });
    setLoading(false);
  };

  const handleGenerateFlashcards = async () => {
    if (!notes.trim() && !file) { toast.error('Paste your notes or upload a file first!'); return; }
    if (!checkAndIncrementUses()) return;
    setLoading(true); setResult(null);
    const { file_url, context } = await uploadAndGetContext();
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Create flashcards from these study notes. Generate 8-15 flashcards.
Each flashcard has a concise front (term/question) and clear back (definition/answer).
Subject: ${subject || 'general'}, Grade: ${grade || 'high school'}
Notes: ${context || '(see attached file)'}
IMPORTANT: If the notes contain no real study content, return an empty flashcards array.`,
      file_urls: file_url ? [file_url] : undefined,
      response_json_schema: {
        type: 'object',
        properties: {
          deck_name: { type: 'string' },
          flashcards: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                front: { type: 'string' },
                back: { type: 'string' },
              }
            }
          }
        }
      }
    });

    if (!res.flashcards?.length) {
      toast.error("No flashcards could be created. Please submit real notes or a valid study topic!");
      setLoading(false); return;
    }
    // Save to StudyCard entity
    if (res.flashcards?.length && subject) {
      await Promise.all(res.flashcards.map(fc =>
        base44.entities.StudyCard.create({
          deck_name: res.deck_name || 'My Flashcards',
          subject: subject || 'other',
          front: fc.front,
          back: fc.back,
        })
      ));
      toast.success(`✅ ${res.flashcards.length} flashcards saved!`);
    }

    setResult({ type: 'flashcards', data: res });
    setLoading(false);
  };

  const handleSubmit = () => {
    if (activeTab === 'analyze') handleAnalyze();
    else if (activeTab === 'questions') handleGenerateQuestions();
    else handleGenerateFlashcards();
  };

  const diffColors = { easy: 'bg-emerald-50 text-emerald-700 border-emerald-200', medium: 'bg-amber-50 text-amber-700 border-amber-200', hard: 'bg-rose-50 text-rose-700 border-rose-200' };

  const todayUses = getTodayUses();
  const usesLeft = Math.max(0, FREE_DAILY_LIMIT - todayUses);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-black text-foreground tracking-tight">Study Tools</h1>
        <p className="text-muted-foreground text-sm mt-1.5">Paste your notes — get key points, practice questions, or instant flashcards.</p>
      </div>

      {/* Free plan usage warning */}
      {!isPremium && activeTab !== 'calendar' && (
        <div className={`flex items-center gap-3 rounded-2xl px-4 py-3 border ${usesLeft === 0 ? 'bg-rose-50 border-rose-200' : usesLeft <= 1 ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'}`}>
          <AlertTriangle className={`w-4 h-4 shrink-0 ${usesLeft === 0 ? 'text-rose-500' : 'text-amber-500'}`} />
          <div className="flex-1">
            {usesLeft === 0 ? (
              <p className="text-sm font-bold text-rose-800">You've used all {FREE_DAILY_LIMIT} free uses today. Come back tomorrow or <a href="/premium" className="underline">upgrade to Pro</a>.</p>
            ) : (
              <p className="text-sm font-semibold text-foreground">{usesLeft} of {FREE_DAILY_LIMIT} free uses left today · <a href="/premium" className="text-primary font-bold hover:underline">Upgrade for $5.99/month</a></p>
            )}
          </div>
        </div>
      )}

      {/* Premium upsell banner */}
      {false && (
        <div className="flex items-center gap-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl px-4 py-3">
          <Crown className="w-5 h-5 text-amber-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-amber-800">Free plan: up to {FREE_QUESTIONS_LIMIT} questions</p>
            <p className="text-xs text-amber-600">Upgrade to Premium for up to {PREMIUM_QUESTIONS_LIMIT} questions + unlimited uploads</p>
          </div>
          <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold shrink-0" onClick={() => window.location.href = '/premium'}>
            Upgrade
          </Button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1.5 p-1.5 bg-secondary rounded-2xl">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => { setActiveTab(tab.id); setResult(null); }}
            className={`flex-1 text-xs font-bold py-2.5 px-2 rounded-xl transition-all ${activeTab === tab.id ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Input area - hide for calendar */}
      {activeTab !== 'calendar' && <div className="bg-white rounded-2xl border border-border p-5 space-y-4">
        <div>
          <label className="text-sm font-bold text-foreground mb-2 block">📋 Paste Notes or Study Guide</label>
          <Textarea
            placeholder="Paste your notes, textbook excerpt, or study guide here..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="min-h-[140px] rounded-xl resize-none text-sm"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground font-semibold">OR</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <label className="block">
          <input type="file" accept="image/*,.pdf" onChange={e => setFile(e.target.files[0])} className="hidden" id="q-upload" />
          <div className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all hover:border-primary/40 hover:bg-primary/5 ${file ? 'border-primary bg-primary/5' : 'border-border'}`}
            onClick={() => document.getElementById('q-upload').click()}>
            {file ? (
              <p className="text-sm font-semibold text-primary">📎 {file.name}</p>
            ) : (
              <p className="text-sm text-muted-foreground"><Upload className="w-4 h-4 inline mr-1.5" />Upload notes image or PDF</p>
            )}
          </div>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-muted-foreground mb-1 block">Subject</label>
            <Select value={subject} onValueChange={setSubject}>
              <SelectTrigger className="h-10 rounded-xl text-sm"><SelectValue placeholder="Subject" /></SelectTrigger>
              <SelectContent>{subjects.map(s => <SelectItem key={s} value={s} className="capitalize">{s.replace('_', ' ')}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground mb-1 block">Grade</label>
            <Select value={grade} onValueChange={setGrade}>
              <SelectTrigger className="h-10 rounded-xl text-sm"><SelectValue placeholder="Grade" /></SelectTrigger>
              <SelectContent>{grades.map(g => <SelectItem key={g} value={g}>{g} Grade</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        {/* Questions-only options */}
        {activeTab === 'questions' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-muted-foreground mb-1 block">
                # Questions <span className="text-primary">(max {maxQuestions})</span>
              </label>
              <Input
                type="number"
                min={1}
                max={maxQuestions}
                value={numQuestions}
                onChange={e => setNumQuestions(Math.min(Number(e.target.value), maxQuestions))}
                className="h-10 rounded-xl"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground mb-1 block">Difficulty</label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger className="h-10 rounded-xl text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">😊 Easy</SelectItem>
                  <SelectItem value="medium">🤔 Medium</SelectItem>
                  <SelectItem value="hard">🔥 Hard</SelectItem>
                  <SelectItem value="mixed">🎲 Mixed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <Button onClick={handleSubmit} disabled={loading} className="w-full h-12 rounded-xl font-bold text-base gradient-violet border-0 text-white shadow-lg hover:opacity-90">
          {loading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Analyzing...</> :
            activeTab === 'analyze' ? <><Sparkles className="w-5 h-5 mr-2" /> Find Key Points</> :
            activeTab === 'questions' ? <><Brain className="w-5 h-5 mr-2" /> Generate Questions</> :
            <><Layers className="w-5 h-5 mr-2" /> Create Flashcards</>}
        </Button>
      </div>}

      {/* Calendar tab */}
      {activeTab === 'calendar' && (
        <MiniCalendar userEmail={user?.email} />
      )}

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

            {/* Analyze results */}
            {result.type === 'analyze' && (
              <div className="space-y-4">
                {result.data.topic_summary && (
                  <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4">
                    <p className="text-xs font-black text-primary uppercase tracking-wide mb-1">Topic Summary</p>
                    <p className="text-sm text-foreground">{result.data.topic_summary}</p>
                  </div>
                )}
                <div className="space-y-2">
                  {result.data.key_points?.map((kp, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                      className="bg-white rounded-xl border border-border p-4 flex gap-3">
                      <div className="shrink-0">
                        {kp.likely_on_test ? (
                          <span className="w-7 h-7 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-base font-black">⭐</span>
                        ) : (
                          <span className="w-7 h-7 rounded-full bg-secondary text-muted-foreground flex items-center justify-center text-sm font-bold">{i + 1}</span>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">{kp.point}</p>
                        <p className="text-xs text-muted-foreground mt-1">{kp.importance}</p>
                        {kp.likely_on_test && <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full mt-1 inline-block">⚠️ Likely on test</span>}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Questions results */}
            {result.type === 'questions' && (
              <div className="space-y-3">
                <p className="text-xs font-black text-muted-foreground uppercase tracking-wide">{result.data.questions?.length} Practice Questions</p>
                {result.data.questions?.map((q, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                    className="bg-white rounded-xl border border-border p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <span className={`text-xs font-black px-2 py-0.5 rounded-full border shrink-0 capitalize ${diffColors[q.difficulty] || diffColors.medium}`}>
                        {q.difficulty}
                      </span>
                      <p className="text-sm font-semibold text-foreground">{q.question}</p>
                    </div>
                    <button
                      onClick={() => setExpandedHints(h => ({ ...h, [`${i}-hint`]: !h[`${i}-hint`] }))}
                      className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                      💡 Hint {expandedHints[`${i}-hint`] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                    {expandedHints[`${i}-hint`] && (
                      <p className="text-xs text-muted-foreground bg-blue-50 rounded-lg p-2.5 border border-blue-100">{q.hint}</p>
                    )}
                    <button
                      onClick={() => setExpandedHints(h => ({ ...h, [`${i}-ans`]: !h[`${i}-ans`] }))}
                      className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1">
                      ✅ Show Answer {expandedHints[`${i}-ans`] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                    {expandedHints[`${i}-ans`] && (
                      <p className="text-xs text-foreground bg-emerald-50 rounded-lg p-2.5 border border-emerald-100">{q.answer}</p>
                    )}
                  </motion.div>
                ))}
              </div>
            )}

            {/* Flashcards results */}
            {result.type === 'flashcards' && (
              <div className="space-y-3">
                <p className="text-xs font-black text-muted-foreground uppercase tracking-wide">{result.data.deck_name} · {result.data.flashcards?.length} cards saved ✅</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  {result.data.flashcards?.map((fc, i) => (
                    <FlashCard key={i} front={fc.front} back={fc.back} index={i} />
                  ))}
                </div>
              </div>
            )}

            <Button variant="outline" className="w-full rounded-xl font-semibold mt-4" onClick={() => setResult(null)}>
              <RotateCcw className="w-4 h-4 mr-2" /> Generate New
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FlashCard({ front, back, index }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.04 }}
      className="cursor-pointer" onClick={() => setFlipped(f => !f)}>
      <div className={`rounded-xl border-2 p-4 min-h-[100px] flex flex-col justify-center transition-all duration-300
        ${flipped ? 'bg-primary/5 border-primary/30' : 'bg-white border-border'}`}>
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{flipped ? '✅ Answer' : '❓ Question'}</p>
        <p className="text-sm font-semibold text-foreground">{flipped ? back : front}</p>
        <p className="text-[10px] text-muted-foreground mt-2">Tap to flip</p>
      </div>
    </motion.div>
  );
}

function Crown({ className }) {
  return <svg className={className} fill="currentColor" viewBox="0 0 24 24"><path d="M5 16L3 7l5.5 5L12 4l3.5 8L21 7l-2 9H5zm0 2h14v2H5v-2z"/></svg>;
}

function ContactFooter() {
  return (
    <div className="text-center py-4 border-t border-border mt-8">
      <p className="text-sm text-muted-foreground">
        Any questions?{' '}
        <a href="mailto:intellixapp.team@gmail.com" className="text-primary font-semibold hover:underline">
          intellixapp.team@gmail.com
        </a>
      </p>
    </div>
  );
}