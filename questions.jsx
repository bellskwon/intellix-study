import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Layers, Loader2, RotateCcw, Upload, Calendar, AlertTriangle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import MiniCalendar from '@/components/dashboard/MiniCalendar';
import SaveToFolderModal from '@/pages/SaveToFolder';

const TABS = [
  { id: 'flashcards', label: 'Flashcards', icon: Layers },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
];

const grades = ['6th','7th','8th','9th','10th','11th','12th','college'];

export default function Questions() {
  const [activeTab, setActiveTab] = useState('flashcards');
  const [notes, setNotes] = useState('');
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(null); // label string while generating
  const [generatingError, setGeneratingError] = useState(null);
  const [result, setResult] = useState(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const uploadAndGetContext = async () => {
    let context = notes;
    if (file) {
      const res = await base44.integrations.Core.UploadFile({ file });
      return { file_url: res.file_url, context };
    }
    return { file_url: null, context };
  };

  const handleGenerateFlashcards = async () => {
    if (!notes.trim() && !file) { toast.error('Paste your notes or upload a file first!'); return; }
    setLoading(true); setResult(null); setGeneratingError(null); setGenerating('Flashcards');
    try {
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
        setGenerating(null);
        return;
      }
      if (subject) {
        await base44.entities.StudyCard.bulkCreate(
          res.flashcards.map(fc => ({
            deck_name: res.deck_name || 'My Flashcards',
            subject: subject || 'other',
            front: fc.front,
            back: fc.back,
          }))
        );
        toast.success(`✅ ${res.flashcards.length} flashcards saved!`);
      }
      setResult({ type: 'flashcards', data: res });
      setGenerating(null);
    } catch (err) {
      setGeneratingError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    handleGenerateFlashcards();
  };

  if (generating) return (
    <GeneratingStep
      label={generating}
      error={generatingError}
      onRetry={() => { setGenerating(null); setGeneratingError(null); }}
    />
  );

  return (
    <div className="pb-8">
      {/* Dark hero */}
      <div className="-mx-4 -mt-4 lg:-mx-8 lg:-mt-8 mb-6">
        <div className="bg-[#130d25] px-6 pt-7 pb-8">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-end gap-2 mb-5">
              <span className="flex items-center gap-1.5 bg-white/10 text-white/70 text-xs font-bold px-3 py-1.5 rounded-full">
                <Layers className="w-3 h-3 text-blue-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-white/50">AI POWERED</span>
                <span className="text-white/80 font-black">Instant</span>
              </span>
            </div>
            <div className="leading-none mb-3">
              <h1 className="font-black text-white" style={{ fontSize: 'clamp(3rem, 12vw, 5rem)', lineHeight: 0.92 }}>Flash</h1>
              <h1 className="font-black text-blue-400" style={{ fontSize: 'clamp(3rem, 12vw, 5rem)', lineHeight: 0.92 }}>cards</h1>
            </div>
            <p className="text-white/50 text-sm">Paste your notes — get instant flashcards, key points &amp; practice questions.</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto space-y-5">

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-secondary rounded-xl">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => { setActiveTab(tab.id); setResult(null); }}
            className={`flex-1 text-xs font-semibold py-2 px-2 rounded-lg transition-all ${activeTab === tab.id ? 'bg-[#261e42] shadow-sm text-white' : 'text-muted-foreground hover:text-foreground'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Input area */}
      {activeTab !== 'calendar' && (
        <div className="space-y-4">
          {/* Notes textarea */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">Your Notes</label>
            <Textarea
              placeholder="Paste notes, textbook excerpts, or a study guide..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="min-h-[130px] rounded-2xl resize-none text-sm bg-[#1a1035] border-[#2d1b69] text-white placeholder:text-white/30 focus:border-violet-500"
            />
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground font-semibold">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Upload zone */}
          <label className="block">
            <input type="file" accept="image/*,.pdf" onChange={e => setFile(e.target.files[0])} className="hidden" id="q-upload" />
            <div
              onClick={() => document.getElementById('q-upload').click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all
                ${file ? 'border-violet-500 bg-violet-50' : 'border-violet-300 bg-violet-50/40 hover:bg-violet-50 hover:border-violet-400'}`}>
              {file ? (
                <>
                  <div className="w-14 h-14 rounded-2xl bg-violet-500 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-violet-200">
                    <Upload className="w-7 h-7 text-white" />
                  </div>
                  <p className="text-sm font-bold text-violet-700">📎 {file.name}</p>
                  <p className="text-xs text-violet-500 mt-1">Click to change file</p>
                </>
              ) : (
                <>
                  <div className="w-14 h-14 rounded-2xl bg-violet-500 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-violet-200">
                    <Upload className="w-7 h-7 text-white" />
                  </div>
                  <p className="text-base font-black text-violet-700 mb-1">Upload your notes</p>
                  <p className="text-xs text-violet-500 mb-3">Drop an image or PDF and we'll read it for you instantly</p>
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    {['PDF','PNG','JPG','JPEG'].map(f => (
                      <span key={f} className="text-[10px] font-black text-violet-600 border border-violet-300 px-2.5 py-1 rounded-full bg-white">{f}</span>
                    ))}
                  </div>
                </>
              )}
            </div>
          </label>

          {/* Subject pills */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">Subject</label>
            <div className="flex flex-wrap gap-2">
              {['math','science','history','english','computer_science','geography','foreign_language','other'].map(s => (
                <button key={s} onClick={() => setSubject(subject === s ? '' : s)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all capitalize border ${
                    subject === s
                      ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                      : 'bg-white text-foreground border-border hover:border-violet-300'}`}>
                  {s === 'computer_science' ? 'CS' : s === 'foreign_language' ? 'Language' : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Grade */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">Grade</label>
            <Select value={grade} onValueChange={setGrade}>
              <SelectTrigger className="h-10 rounded-xl text-sm"><SelectValue placeholder="Select grade" /></SelectTrigger>
              <SelectContent>{grades.map(g => <SelectItem key={g} value={g}>{g} Grade</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <Button onClick={handleSubmit} disabled={loading} className="w-full h-12 rounded-2xl font-bold text-base bg-violet-600 border-0 text-white shadow-lg hover:bg-violet-700">
            {loading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Analyzing...</> :
              <><Layers className="w-5 h-5 mr-2" /> Create Flashcards</>}
          </Button>
        </div>
      )}

      {/* Calendar tab */}
      {activeTab === 'calendar' && (
        <MiniCalendar userEmail={user?.email} />
      )}

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

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

            <div className="flex gap-3 mt-4">
              <Button variant="outline" className="flex-1 rounded-xl font-semibold" onClick={() => setShowSaveModal(true)}>
                Save Result
              </Button>
              <Button variant="outline" className="flex-1 rounded-xl font-semibold" onClick={() => setResult(null)}>
                <RotateCcw className="w-4 h-4 mr-2" /> Generate New
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <SaveToFolderModal
        open={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        type={result?.type === 'flashcards' ? 'flashcards' : 'tools'}
        title={result?.type === 'flashcards' ? result.data.deck_name : result?.type === 'analyze' ? 'Key Points' : 'Practice Questions'}
        subject={subject}
        grade={grade}
        data={result?.data}
      />
    </div>
  </div>
  );
}

function GeneratingStep({ label, error, onRetry }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (error) return;
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 85) { clearInterval(interval); return p; }
        return p + Math.random() * 4 + 1;
      });
    }, 300);
    return () => clearInterval(interval);
  }, [error]);

  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 max-w-sm mx-auto text-center">
      <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center">
        <AlertTriangle className="w-8 h-8 text-rose-500" />
      </div>
      <div>
        <h2 className="text-lg font-black text-foreground">Generation Failed</h2>
        <p className="text-sm text-muted-foreground mt-1">{error}</p>
      </div>
      <Button onClick={onRetry} className="rounded-xl font-bold gradient-violet border-0 text-white px-6">
        <RotateCcw className="w-4 h-4 mr-2" /> Try Again
      </Button>
    </div>
  );

  const messages = {
    'Key Points': ['Reading your notes...', 'Finding key concepts...', 'Almost ready...'],
    'Practice Questions': ['Analyzing your notes...', 'Crafting questions...', 'Almost ready...'],
    'Flashcards': ['Reading your notes...', 'Building flashcards...', 'Almost ready...'],
  };
  const steps = messages[label] || messages['Key Points'];
  const msgIndex = progress < 33 ? 0 : progress < 70 ? 1 : 2;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 max-w-sm mx-auto text-center">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        className="w-16 h-16 rounded-full gradient-violet flex items-center justify-center shadow-xl shadow-purple-300/50"
      >
        <Sparkles className="w-7 h-7 text-white" />
      </motion.div>
      <div>
        <h2 className="text-lg font-black text-foreground">Generating {label}...</h2>
        <p className="text-sm text-muted-foreground mt-1">{steps[msgIndex]}</p>
      </div>
      <div className="w-full bg-secondary rounded-full h-2.5 overflow-hidden">
        <motion.div
          className="h-full rounded-full gradient-violet"
          animate={{ width: `${Math.min(progress, 85)}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>
      <div className="flex gap-1">
        {[0, 1, 2].map(i => (
          <motion.div key={i} className="w-2 h-2 rounded-full bg-primary"
            animate={{ y: [0, -8, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.2 }} />
        ))}
      </div>
    </div>
  );
}

function FlashCard({ front, back, index }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.04 }}
      className="cursor-pointer select-none"
      onClick={() => setFlipped(f => !f)}
      style={{ perspective: 1000 }}>
      <motion.div
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.45, ease: 'easeInOut' }}
        style={{ transformStyle: 'preserve-3d', position: 'relative', minHeight: 200 }}>

        {/* Front — hotel key card style */}
        <div className="absolute inset-0 rounded-2xl bg-[#1a1035] border border-gray-100 shadow-lg flex flex-col px-6 py-5"
          style={{ backfaceVisibility: 'hidden' }}>
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-md bg-[#130d25] flex items-center justify-center">
                <Layers className="w-3 h-3 text-violet-400" />
              </div>
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">INTELLIX</span>
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest text-gray-300">#{index + 1}</span>
          </div>
          <div className="w-full h-px bg-gray-100 mb-4" />
          {/* Main term */}
          <div className="flex-1 flex items-center justify-center">
            <p className="text-center text-base font-semibold text-gray-800 leading-snug">{front}</p>
          </div>
          <div className="w-full h-px bg-gray-100 mt-4 mb-2" />
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-300 text-center">TERM · TAP TO FLIP</p>
        </div>

        {/* Back — flipped */}
        <div className="absolute inset-0 rounded-2xl bg-[#130d25] border border-violet-900/40 shadow-lg flex flex-col px-6 py-5"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-md bg-violet-600 flex items-center justify-center">
                <Layers className="w-3 h-3 text-white" />
              </div>
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-violet-400">INTELLIX</span>
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest text-violet-800">#{index + 1}</span>
          </div>
          <div className="w-full h-px bg-violet-900/40 mb-4" />
          <div className="flex-1 flex items-center justify-center">
            <p className="text-center text-base font-semibold text-white leading-snug">{back}</p>
          </div>
          <div className="w-full h-px bg-violet-900/40 mt-4 mb-2" />
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-violet-500 text-center">ANSWER · TAP TO FLIP</p>
        </div>
      </motion.div>
    </motion.div>
  );
}


