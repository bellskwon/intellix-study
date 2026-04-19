import React from 'react';

// Subject-specific SVG icons with themed colors
const icons = {
  math: ({ cls }) => (
    <svg viewBox="0 0 24 24" fill="none" className={cls} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 7H6" /><path d="M18 17H6" /><path d="M8 12h8" />
      <path d="m15 9 3 3-3 3" /><path d="m9 9-3 3 3 3" />
    </svg>
  ),
  science: ({ cls }) => (
    <svg viewBox="0 0 24 24" fill="none" className={cls} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3h6v8l3.5 6a2 2 0 0 1-1.7 3H7.2a2 2 0 0 1-1.7-3L9 11V3z" />
      <path d="M7.3 14h9.4" />
    </svg>
  ),
  history: ({ cls }) => (
    <svg viewBox="0 0 24 24" fill="none" className={cls} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 8v4l2 2" />
      <circle cx="12" cy="12" r="9" />
      <path d="M3.05 11A9 9 0 0 1 12 3c2.39 0 4.57.93 6.19 2.44" />
    </svg>
  ),
  geography: ({ cls }) => (
    <svg viewBox="0 0 24 24" fill="none" className={cls} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M3.6 9h16.8" /><path d="M3.6 15h16.8" />
      <path d="M12 3a14.5 14.5 0 0 0 0 18" /><path d="M12 3a14.5 14.5 0 0 1 0 18" />
    </svg>
  ),
  english: ({ cls }) => (
    <svg viewBox="0 0 24 24" fill="none" className={cls} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 6h20M2 12h14M2 18h8" />
    </svg>
  ),
  foreign_language: ({ cls }) => (
    <svg viewBox="0 0 24 24" fill="none" className={cls} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <path d="m9.5 8.5 1.5 3 1.5-3" /><path d="M9 11h4" />
    </svg>
  ),
  computer_science: ({ cls }) => (
    <svg viewBox="0 0 24 24" fill="none" className={cls} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m8 17.5-4-4 4-4" /><path d="m16 9.5 4 4-4 4" /><path d="m14 7-4 10" />
    </svg>
  ),
  art: ({ cls }) => (
    <svg viewBox="0 0 24 24" fill="none" className={cls} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="13.5" cy="6.5" r="2.5" /><circle cx="17.5" cy="10.5" r="2.5" />
      <circle cx="8.5" cy="7.5" r="2.5" /><circle cx="6.5" cy="12.5" r="2.5" />
      <path d="M12 22a7 7 0 0 1-7-7c0-1.9.7-3.7 2-5" />
    </svg>
  ),
  music: ({ cls }) => (
    <svg viewBox="0 0 24 24" fill="none" className={cls} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
    </svg>
  ),
  other: ({ cls }) => (
    <svg viewBox="0 0 24 24" fill="none" className={cls} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><path d="M12 17h.01" />
    </svg>
  ),
};

const colors = {
  math:             { bg: 'bg-blue-100',   icon: 'text-blue-600'   },
  science:          { bg: 'bg-emerald-100', icon: 'text-emerald-600' },
  history:          { bg: 'bg-amber-100',  icon: 'text-amber-600'  },
  geography:        { bg: 'bg-teal-100',   icon: 'text-teal-600'   },
  english:          { bg: 'bg-violet-100', icon: 'text-violet-600' },
  foreign_language: { bg: 'bg-pink-100',   icon: 'text-pink-600'   },
  computer_science: { bg: 'bg-indigo-100', icon: 'text-indigo-600' },
  art:              { bg: 'bg-rose-100',   icon: 'text-rose-600'   },
  music:            { bg: 'bg-purple-100', icon: 'text-purple-600' },
  other:            { bg: 'bg-slate-100',  icon: 'text-slate-500'  },
};

const sizes = {
  xs: { wrap: 'w-6 h-6 rounded-md',  icon: 'w-3.5 h-3.5' },
  sm: { wrap: 'w-8 h-8 rounded-lg',  icon: 'w-4 h-4'     },
  md: { wrap: 'w-10 h-10 rounded-xl', icon: 'w-5 h-5'    },
  lg: { wrap: 'w-14 h-14 rounded-2xl', icon: 'w-7 h-7'   },
};

export default function SubjectIcon({ subject, size = 'sm', className = '' }) {
  const key = subject?.toLowerCase() || 'other';
  const { bg, icon } = colors[key] || colors.other;
  const { wrap, icon: iconSz } = sizes[size] || sizes.sm;
  const SvgIcon = icons[key] || icons.other;

  return (
    <div className={`${wrap} ${bg} flex items-center justify-center shrink-0 ${className}`}>
      <SvgIcon cls={`${iconSz} ${icon}`} />
    </div>
  );
}
