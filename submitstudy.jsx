import React, { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Upload, Video, FileText, BookOpen, Loader2, CheckCircle2, Camera, ClipboardPaste, X, FileImage } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const subjects = [
  { value: 'math', label: '🔢 Mathematics' },
  { value: 'science', label: '🔬 Science' },
  { value: 'history', label: '📜 History' },
  { value: 'geography', label: '🌍 Geography' },
  { value: 'english', label: '📖 English' },
  { value: 'foreign_language', label: '🗣️ Foreign Language' },
  { value: 'computer_science', label: '💻 Computer Science' },
  { value: 'art', label: '🎨 Art' },
  { value: 'music', label: '🎵 Music' },
  { value: 'other', label: '📌 Other' },
];

const grades = ['6th','7th','8th','9th','10th','11th','12th','college'];

const inputModes = [
  { id: 'file', icon: Upload, label: 'Upload File', desc: 'PDF, image, or video', color: 'text-violet-500', bg: 'bg-violet-50 border-violet-200' },
  { id: 'text', icon: ClipboardPaste, label: 'Paste Notes', desc: 'Type or paste text', color: 'text-cyan-500', bg: 'bg-cyan-50 border-cyan-200' },
  { id: 'camera', icon: Camera, label: 'Scan Notes', desc: 'Use your camera', color: 'text-pink-500', bg: 'bg-pink-50 border-pink-200' },
];

export default function SubmitStudy() {
  const [form, setForm] = useState({ title: '', subject: '', grade_level: '', type: 'notes', notes_text: '' });
  const [inputMode, setInputMode] = useState('file');
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef();
  const cameraInputRef = useRef();
  const queryClient = useQueryClient();

  const handleFile = (f) => {
    if (!f) return;
    setFile(f);
    if (f.type.startsWith('image/')) {
      const url = URL.createObjectURL(f);
      setFilePreview(url);
    } else {
      setFilePreview(null);
    }
  };

  const createMutation = useMutation({
    mutationFn: async (data) => {
      setUploading(true);
      let file_url = '';
      if (file) {
        const result = await base44.integrations.Core.UploadFile({ file });
        file_url = result.file_url;
      }
      return base44.entities.Submission.create({ ...data, file_url, status: 'pending_review' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mySubmissions'] });
      setSubmitted(true);
      setUploading(false);
    },
    onError: () => {
      setUploading(false);
      toast.error('Upload failed. Please try again.');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title || !form.subject || !form.grade_level) {
      toast.error('Please fill in the title, subject, and grade level');
      return;
    }
    if (inputMode === 'file' && !file) {
      toast.error('Please upload a file');
      return;
    }
    if (inputMode === 'text' && !form.notes_text?.trim()) {
      toast.error('Please enter your notes text');
      return;
    }
    createMutation.mutate(form);
  };

  const reset = () => {
    setSubmitted(false);
    setForm({ title: '', subject: '', grade_level: '', type: 'notes', notes_text: '' });
    setFile(null);
    setFilePreview(null);
  };

  if (submitted) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="max-w-lg mx-auto text-center py-16 px-6">
        <div className="w-20 h-20 rounded-3xl bg-emerald-100 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-emerald-500" />
        </div>
        <h2 className="text-2xl font-black text-foreground">Notes Submitted! 🎉</h2>
        <p className="text-muted-foreground mt-3 text-sm max-w-xs mx-auto">
          Your study session is being processed. Your quiz will be ready shortly — keep your streak alive!
        </p>
        <div className="flex gap-3 justify-center mt-8">
          <Button onClick={reset} className="rounded-xl font-bold">Submit More</Button>
          <Button variant="outline" onClick={() => window.location.href = '/'} className="rounded-xl font-bold">Dashboard</Button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="relative rounded-3xl overflow-hidden p-7 text-white"
        style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)' }}>
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-10 translate-x-10" />
        <p className="text-purple-200 text-xs font-bold uppercase tracking-widest mb-1">⚡ Goal: &lt;10 seconds to start</p>
        <h1 className="text-2xl font-black mb-1">Upload Your Notes</h1>
        <p className="text-purple-200 text-sm">Upload, paste, or scan — we'll generate your quiz instantly.</p>
      </div>

      {/* Input Mode Selector */}
      <div>
        <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-3">How do you want to add notes?</p>
        <div className="grid grid-cols-3 gap-3">
          {inputModes.map(mode => (
            <button key={mode.id} onClick={() => setInputMode(mode.id)}
              className={`p-4 rounded-2xl border-2 text-center transition-all duration-200 ${
                inputMode === mode.id ? `${mode.bg} border-current shadow-sm` : 'border-border hover:border-muted-foreground/30 bg-white'
              }`}>
              <mode.icon className={`w-6 h-6 mx-auto mb-2 ${inputMode === mode.id ? mode.color : 'text-muted-foreground'}`} />
              <p className={`text-xs font-black ${inputMode === mode.id ? 'text-foreground' : 'text-muted-foreground'}`}>{mode.label}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{mode.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Quick Fields */}
        <div className="bg-white rounded-2xl border border-border p-5 space-y-4">
          <div>
            <Label className="text-xs font-black uppercase tracking-wide text-muted-foreground">Session Title *</Label>
            <Input
              className="mt-1.5 rounded-xl h-11"
              placeholder="e.g. Chapter 5 – Quadratic Equations"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-black uppercase tracking-wide text-muted-foreground">Subject *</Label>
              <Select value={form.subject} onValueChange={v => setForm(f => ({ ...f, subject: v }))}>
                <SelectTrigger className="mt-1.5 rounded-xl h-11"><SelectValue placeholder="Pick subject" /></SelectTrigger>
                <SelectContent>
                  {subjects.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-black uppercase tracking-wide text-muted-foreground">Grade *</Label>
              <Select value={form.grade_level} onValueChange={v => setForm(f => ({ ...f, grade_level: v }))}>
                <SelectTrigger className="mt-1.5 rounded-xl h-11"><SelectValue placeholder="Grade" /></SelectTrigger>
                <SelectContent>
                  {grades.map(g => <SelectItem key={g} value={g}>{g} Grade</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Dynamic input area */}
        <AnimatePresence mode="wait">
          {inputMode === 'file' && (
            <motion.div key="file" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="bg-white rounded-2xl border border-border p-5">
              <Label className="text-xs font-black uppercase tracking-wide text-muted-foreground mb-3 block">Upload File</Label>
              {file ? (
                <div className="rounded-xl border-2 border-violet-200 bg-violet-50 p-4 flex items-center gap-3">
                  {filePreview ? (
                    <img src={filePreview} alt="preview" className="w-14 h-14 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
                      <FileImage className="w-6 h-6 text-violet-500" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB · Ready to upload</p>
                  </div>
                  <button onClick={() => { setFile(null); setFilePreview(null); }} className="p-1 hover:bg-violet-100 rounded-lg">
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              ) : (
                <label className="block border-2 border-dashed border-border rounded-xl p-10 text-center hover:border-violet-400 hover:bg-violet-50/50 transition-all cursor-pointer">
                  <Upload className="w-8 h-8 text-violet-400 mx-auto mb-2" />
                  <p className="text-sm font-bold text-foreground">Click to upload</p>
                  <p className="text-xs text-muted-foreground mt-1">PDF, images, or video</p>
                  <input ref={fileInputRef} type="file" accept="image/*,.pdf,video/*"
                    onChange={e => handleFile(e.target.files[0])} className="hidden" />
                </label>
              )}
            </motion.div>
          )}

          {inputMode === 'text' && (
            <motion.div key="text" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="bg-white rounded-2xl border border-border p-5">
              <Label className="text-xs font-black uppercase tracking-wide text-muted-foreground mb-3 block">Paste / Type Notes</Label>
              <Textarea
                className="rounded-xl min-h-[180px] text-sm resize-none"
                placeholder="Paste your notes here... e.g. Newton's laws state that an object at rest stays at rest unless acted upon by a force..."
                value={form.notes_text}
                onChange={e => setForm(f => ({ ...f, notes_text: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground mt-2">{form.notes_text.length} characters · aim for 100+ for best results</p>
            </motion.div>
          )}

          {inputMode === 'camera' && (
            <motion.div key="camera" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="bg-white rounded-2xl border border-border p-5">
              <Label className="text-xs font-black uppercase tracking-wide text-muted-foreground mb-3 block">Scan with Camera</Label>
              {file ? (
                <div className="rounded-xl border-2 border-pink-200 bg-pink-50 p-4 flex items-center gap-3">
                  {filePreview && <img src={filePreview} alt="preview" className="w-14 h-14 rounded-lg object-cover shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">Photo ready ✓</p>
                  </div>
                  <button onClick={() => { setFile(null); setFilePreview(null); }} className="p-1 hover:bg-pink-100 rounded-lg">
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              ) : (
                <label className="block border-2 border-dashed border-pink-200 rounded-xl p-10 text-center hover:border-pink-400 hover:bg-pink-50 transition-all cursor-pointer">
                  <Camera className="w-8 h-8 text-pink-400 mx-auto mb-2" />
                  <p className="text-sm font-bold text-foreground">Open camera</p>
                  <p className="text-xs text-muted-foreground mt-1">Take a photo of your handwritten or printed notes</p>
                  <input ref={cameraInputRef} type="file" accept="image/*" capture="environment"
                    onChange={e => handleFile(e.target.files[0])} className="hidden" />
                </label>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tip */}
        <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <span className="text-base mt-0.5">💡</span>
          <p className="text-xs text-amber-700">
            <strong>Tip:</strong> The clearer your notes, the better your quiz questions.
            {inputMode === 'text' && ' Include key terms, definitions, and formulas for best results.'}
            {inputMode === 'camera' && ' Hold your phone steady in good lighting for sharper scans.'}
            {inputMode === 'file' && ' PDF or image files work best — keep file size under 10MB.'}
          </p>
        </div>

        <Button type="submit" className="w-full h-13 text-base font-black rounded-xl shadow-lg shadow-purple-500/20 bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800" disabled={uploading}>
          {uploading
            ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Processing...</>
            : '⚡ Submit & Generate Quiz'}
        </Button>
      </form>
    </div>
  );
}