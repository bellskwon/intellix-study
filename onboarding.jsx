import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const TUTORIAL_KEY = 'intellix_tutorial_seen';

const STEPS = [
  { id: 'welcome' },
  { id: 'how-it-works' },
  { id: 'rewards' },
  { id: 'leaderboard' },
  { id: 'action' },
];

// ─── Step content components ──────────────────────────────────────────────────

function StepWelcome() {
  return (
    <div className="flex flex-col items-center text-center px-6 py-8 gap-6">
      <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-lg shadow-violet-200">
        <img src="/logo.png" alt="Intellix" className="w-full h-full object-cover" />
      </div>
      <div>
        <h1 className="font-sora text-3xl font-bold text-slate-900 mb-3">
          Welcome to Intellix
        </h1>
        <p className="text-slate-500 text-lg leading-relaxed max-w-sm">
          The study platform where <span className="text-violet-600 font-semibold">your real notes</span> become quizzes — and your quiz scores become <span className="text-fuchsia-600 font-semibold">real gift cards</span>.
        </p>
      </div>
      <div className="flex gap-3 mt-2 text-sm text-slate-400 flex-wrap justify-center">
        <span className="bg-slate-100 rounded-full px-3 py-1">Online study platform</span>
        <span className="bg-slate-100 rounded-full px-3 py-1">Real rewards</span>
        <span className="bg-slate-100 rounded-full px-3 py-1">Your material</span>
      </div>
    </div>
  );
}

function IconUpload() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="18" height="18" rx="4" fill="#dbeafe" />
      <rect x="6" y="7" width="12" height="2" rx="1" fill="#93c5fd" />
      <rect x="6" y="11" width="8" height="2" rx="1" fill="#bfdbfe" />
      <circle cx="17" cy="16" r="4.5" fill="#3b82f6" />
      <path d="M17 14 L17 18 M15 15.5 L17 13.5 L19 15.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconAI() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="18" height="18" rx="4" fill="#ede9fe" />
      <circle cx="12" cy="11" r="5" fill="#8b5cf6" opacity="0.15" />
      <circle cx="12" cy="11" r="3" fill="#7c3aed" opacity="0.8" />
      <path d="M12 4 L12 6 M12 16 L12 18 M4 11 L6 11 M18 11 L20 11" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M6.3 6.3 L7.7 7.7 M16.3 15.3 L17.7 16.7 M6.3 15.7 L7.7 14.3 M16.3 6.7 L17.7 5.3" stroke="#c4b5fd" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="12" cy="11" r="1.2" fill="white" />
    </svg>
  );
}

function IconTrophy() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="18" height="18" rx="4" fill="#fdf4ff" />
      <path d="M8 7 Q8 14 12 14 Q16 14 16 7 Z" fill="#a855f7" opacity="0.9" />
      <path d="M8 8 Q5 8 5 11 Q5 13 8 13" stroke="#c084fc" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M16 8 Q19 8 19 11 Q19 13 16 13" stroke="#c084fc" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <rect x="10" y="14" width="4" height="3" rx="1" fill="#a855f7" />
      <rect x="8.5" y="17" width="7" height="1.5" rx="0.75" fill="#a855f7" />
      <path d="M12 8.5 L12.7 10.5 L14.8 10.5 L13.1 11.7 L13.8 13.7 L12 12.5 L10.2 13.7 L10.9 11.7 L9.2 10.5 L11.3 10.5 Z" fill="#fde68a" />
    </svg>
  );
}

function StepHowItWorks() {
  const steps = [
    {
      icon: <IconUpload />,
      title: 'Upload Your Notes',
      desc: 'Upload a PDF, image, or paste text from your actual class notes or textbook.',
      color: 'bg-blue-50 border-blue-100',
    },
    {
      icon: <IconAI />,
      title: 'Intellix Builds Your Quiz',
      desc: "We read your exact material and generate questions tailored to what you're learning — not generic practice problems.",
      color: 'bg-violet-50 border-violet-100',
    },
    {
      icon: <IconTrophy />,
      title: 'Earn Points',
      desc: 'Score 80%+ on the quiz to earn points. The harder the material, the more points you earn.',
      color: 'bg-fuchsia-50 border-fuchsia-100',
    },
  ];

  return (
    <div className="flex flex-col gap-4 px-4 py-6">
      <div className="text-center mb-2">
        <h2 className="font-sora text-2xl font-bold text-slate-900">How it Works</h2>
        <p className="text-slate-500 text-sm mt-1">Three steps from notes to rewards</p>
      </div>
      {steps.map((s, i) => (
        <div key={i} className={`flex items-start gap-4 p-4 rounded-2xl border ${s.color}`}>
          <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm">
            {s.icon}
          </div>
          <div>
            <p className="font-semibold text-slate-800 text-sm">{s.title}</p>
            <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">{s.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function StepRewards() {
  const cards = [
    { name: 'Starbucks', img: 'https://assets.onme.com/static/category-imagery/merchants/logos/starbucks.webp', from: '500 pts' },
    { name: 'Amazon', img: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg', from: '500 pts' },
    { name: 'Nike', img: 'https://assets.onme.com/static/category-imagery/merchants/logos/nike.webp', from: '1,500 pts' },
    { name: 'Visa', img: 'https://logodownload.org/wp-content/uploads/2016/10/visa-logo-2.png', from: '3,500 pts' },
  ];

  return (
    <div className="flex flex-col gap-4 px-4 py-6">
      <div className="text-center mb-2">
        <h2 className="font-sora text-2xl font-bold text-slate-900">Real Gift Cards</h2>
        <p className="text-slate-500 text-sm mt-1">Points you earn are redeemable for actual gift cards — emailed directly to you.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {cards.map((c) => (
          <div key={c.name} className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
            <div className="h-20 overflow-hidden bg-slate-50">
              <img src={c.img} alt={c.name} className="w-full h-full object-cover" />
            </div>
            <div className="p-2">
              <p className="text-xs font-semibold text-slate-700">{c.name}</p>
              <p className="text-xs text-slate-400">from {c.from}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-gradient-to-r from-violet-50 to-fuchsia-50 border border-violet-100 rounded-2xl p-4 text-center">
        <p className="text-xs text-slate-500">Premium members earn faster and unlock higher-tier rewards sooner.</p>
      </div>
    </div>
  );
}

function StepLeaderboard() {
  const fakeUsers = [
    { rank: 1, name: 'Alex M.', pts: 4820, color: 'bg-yellow-400' },
    { rank: 2, name: 'Jordan K.', pts: 3950, color: 'bg-slate-300' },
    { rank: 3, name: 'Taylor B.', pts: 3100, color: 'bg-amber-500' },
    { rank: 4, name: 'Casey R.', pts: 2740, color: 'bg-violet-200' },
    { rank: 5, name: 'You', pts: '?', color: 'bg-fuchsia-400' },
  ];

  return (
    <div className="flex flex-col gap-4 px-4 py-6">
      <div className="text-center mb-2">
        <h2 className="font-sora text-2xl font-bold text-slate-900">Compete Every Week</h2>
        <p className="text-slate-500 text-sm mt-1">The top 5 users on the weekly leaderboard earn bonus points. Resets every Sunday.</p>
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm divide-y divide-slate-50">
        {fakeUsers.map((u) => (
          <div key={u.rank} className={`flex items-center gap-3 px-4 py-3 ${u.name === 'You' ? 'bg-violet-50' : ''}`}>
            <span className="text-sm font-bold text-slate-400 w-5">{u.rank}</span>
            <div className={`w-8 h-8 rounded-full ${u.color} flex items-center justify-center text-xs font-bold text-white`}>
              {u.name[0]}
            </div>
            <span className={`flex-1 text-sm font-medium ${u.name === 'You' ? 'text-violet-700' : 'text-slate-700'}`}>{u.name}</span>
            <span className="text-sm text-slate-500 font-mono">{typeof u.pts === 'number' ? u.pts.toLocaleString() : u.pts}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-2xl p-4">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="shrink-0">
          <circle cx="16" cy="16" r="14" fill="#fde68a" />
          <circle cx="16" cy="16" r="11" fill="#f59e0b" />
          <path d="M16 9 L17.5 13.5 L22.5 13.5 L18.5 16.5 L20 21 L16 18 L12 21 L13.5 16.5 L9.5 13.5 L14.5 13.5 Z" fill="#fffbeb" />
          <path d="M11 27 L13 29 M21 27 L19 29" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
          <rect x="13" y="25" width="6" height="3" rx="1.5" fill="#fbbf24" />
        </svg>
        <p className="text-sm text-amber-800">
          <span className="font-semibold">Top 3 winners</span> each week earn 500, 300, and 150 bonus points. Start studying to climb the board.
        </p>
      </div>
    </div>
  );
}

function StepAction({ onCreateAccount, onSkip }) {
  return (
    <div className="flex flex-col items-center text-center px-6 py-8 gap-6">
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-fuchsia-500 to-violet-500 flex items-center justify-center shadow-lg shadow-fuchsia-200">
        <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
          <path d="M22 6 C22 6 30 10 30 22 L22 38 L14 22 C14 10 22 6 22 6Z" fill="white" opacity="0.9" />
          <path d="M22 6 C22 6 30 10 30 22 L22 38 L14 22 C14 10 22 6 22 6Z" fill="url(#rocketBody)" />
          <circle cx="22" cy="20" r="4" fill="white" opacity="0.3" />
          <circle cx="22" cy="20" r="2.5" fill="white" opacity="0.6" />
          <path d="M14 22 L8 28 L14 26 Z" fill="white" opacity="0.6" />
          <path d="M30 22 L36 28 L30 26 Z" fill="white" opacity="0.6" />
          <path d="M19 34 L22 40 L25 34" fill="#fde68a" opacity="0.9" />
          <path d="M20 36 L22 42 L24 36" fill="#f59e0b" opacity="0.7" />
          <defs>
            <linearGradient id="rocketBody" x1="14" y1="6" x2="30" y2="38" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="white" stopOpacity="0.2" />
              <stop offset="100%" stopColor="white" stopOpacity="0.05" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <div>
        <h2 className="font-sora text-2xl font-bold text-slate-900 mb-3">
          Ready to Start?
        </h2>
        <p className="text-slate-500 text-base leading-relaxed max-w-sm">
          Create a free account to upload your first notes and earn your first points. Sign in takes under 30 seconds with Google.
        </p>
      </div>

      <div className="w-full flex flex-col gap-3 mt-2">
        <button
          onClick={onCreateAccount}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-semibold text-sm shadow-md shadow-violet-200 hover:shadow-lg hover:shadow-violet-300 transition-all flex items-center justify-center gap-2"
        >
          {/* Google G mark */}
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="white" fillOpacity="0.9"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="white" fillOpacity="0.9"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="white" fillOpacity="0.9"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="white" fillOpacity="0.9"/>
          </svg>
          Create Free Account with Google
        </button>

        <button
          onClick={onSkip}
          className="text-xs text-slate-400 hover:text-slate-600 transition-colors py-1"
        >
          I already have an account — sign in
        </button>
      </div>
    </div>
  );
}

// ─── Main tutorial modal ──────────────────────────────────────────────────────

export default function Onboarding({ onCreateAccount }) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  const markSeen = () => {
    localStorage.setItem(TUTORIAL_KEY, 'true');
  };

  const handleCreateAccount = () => {
    markSeen();
    onCreateAccount();
  };

  // "Skip" on early steps or "I already have an account" on last step
  const handleSkip = () => {
    markSeen();
    onCreateAccount();
  };

  const next = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
  };

  const back = () => {
    if (step > 0) setStep(step - 1);
  };

  const isLast = step === STEPS.length - 1;
  const isFirst = step === 0;

  const renderStep = () => {
    switch (STEPS[step].id) {
      case 'welcome':      return <StepWelcome />;
      case 'how-it-works': return <StepHowItWorks />;
      case 'rewards':      return <StepRewards />;
      case 'leaderboard':  return <StepLeaderboard />;
      case 'action':       return <StepAction onCreateAccount={handleCreateAccount} onSkip={handleSkip} />;
      default:             return null;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300"
      style={{
        background: 'linear-gradient(135deg, #1e0a3c 0%, #2d1060 50%, #1a0a2e 100%)',
        opacity: visible ? 1 : 0,
      }}
    >
      {/* Subtle background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-violet-600 opacity-20 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-fuchsia-600 opacity-20 rounded-full blur-3xl" />
      </div>

      <div className="relative bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col">

        {/* Top bar */}
        <div className="flex items-center justify-between px-5 pt-5">
          <span className="font-sora text-xs font-semibold text-slate-400 uppercase tracking-widest">
            Intellix
          </span>
          {!isLast && (
            <button
              onClick={handleSkip}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              Skip
            </button>
          )}
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 pt-3 pb-1">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === step ? '20px' : '6px',
                height: '6px',
                background: i === step
                  ? 'linear-gradient(to right, #8b5cf6, #d946ef)'
                  : i < step ? '#c4b5fd' : '#e2e8f0',
              }}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto max-h-[60vh] relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation — hidden on last step which has its own CTAs */}
        {!isLast && (
          <div className="flex items-center gap-3 px-5 pb-6 pt-2">
            {!isFirst && (
              <button
                onClick={back}
                className="flex-1 py-3 rounded-2xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                Back
              </button>
            )}
            <button
              onClick={next}
              className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-sm font-semibold shadow-md shadow-violet-200 hover:shadow-lg hover:shadow-violet-300 transition-all"
            >
              Next
            </button>
          </div>
        )}
        {isLast && <div className="pb-2" />}
      </div>
    </div>
  );
}

// ─── Export: should tutorial be shown? ───────────────────────────────────────
export function shouldShowTutorial() {
  try {
    return !localStorage.getItem(TUTORIAL_KEY);
  } catch {
    return false;
  }
}
