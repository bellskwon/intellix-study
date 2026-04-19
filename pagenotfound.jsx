import React from 'react';
import { Link } from 'react-router-dom';

function NotFoundIllustration() {
  return (
    <svg width="260" height="200" viewBox="0 0 260 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto mb-8">
      {/* Stars */}
      <circle cx="20" cy="30" r="2" fill="#c4b5fd" opacity="0.7" />
      <circle cx="240" cy="20" r="1.5" fill="#c4b5fd" opacity="0.5" />
      <circle cx="200" cy="50" r="2.5" fill="#a78bfa" opacity="0.6" />
      <circle cx="50" cy="60" r="1.5" fill="#ddd6fe" opacity="0.5" />
      <circle cx="230" cy="80" r="2" fill="#c4b5fd" opacity="0.4" />
      <circle cx="15" cy="100" r="1.5" fill="#a78bfa" opacity="0.5" />

      {/* Planet */}
      <ellipse cx="210" cy="155" rx="38" ry="18" fill="#ede9fe" />
      <ellipse cx="210" cy="155" rx="38" ry="6" fill="none" stroke="#c4b5fd" strokeWidth="1.5" strokeDasharray="4 3" />
      <circle cx="210" cy="148" r="22" fill="#7c3aed" />
      <circle cx="210" cy="148" r="22" fill="url(#planetGrad)" />
      <ellipse cx="203" cy="142" rx="6" ry="4" fill="#9f67ff" opacity="0.5" />
      <ellipse cx="217" cy="150" rx="4" ry="2.5" fill="#6d28d9" opacity="0.4" />

      {/* Astronaut body */}
      <g transform="translate(85, 30) rotate(-12, 55, 80)">
        {/* Suit body */}
        <rect x="32" y="62" width="46" height="52" rx="18" fill="#ddd6fe" />
        <rect x="36" y="66" width="38" height="44" rx="14" fill="#ede9fe" />
        {/* Chest panel */}
        <rect x="42" y="78" width="26" height="16" rx="5" fill="#7c3aed" opacity="0.15" />
        <circle cx="48" cy="86" r="2.5" fill="#a78bfa" />
        <circle cx="55" cy="86" r="2.5" fill="#7c3aed" />
        <circle cx="62" cy="86" r="2.5" fill="#c4b5fd" />
        {/* Helmet */}
        <circle cx="55" cy="46" r="26" fill="#ddd6fe" />
        <circle cx="55" cy="46" r="22" fill="#ede9fe" />
        {/* Visor */}
        <path d="M38 40 Q55 28 72 40 Q72 58 55 64 Q38 58 38 40 Z" fill="#7c3aed" opacity="0.25" />
        <path d="M38 40 Q55 28 72 40 Q72 58 55 64 Q38 58 38 40 Z" fill="url(#visorGrad)" />
        {/* Visor shine */}
        <ellipse cx="45" cy="38" rx="5" ry="3" fill="white" opacity="0.5" transform="rotate(-20, 45, 38)" />
        {/* Helmet ring */}
        <circle cx="55" cy="46" r="26" fill="none" stroke="#c4b5fd" strokeWidth="2" />
        {/* Arms */}
        <rect x="8" y="68" width="26" height="14" rx="7" fill="#ddd6fe" transform="rotate(20, 21, 75)" />
        <rect x="76" y="68" width="26" height="14" rx="7" fill="#ddd6fe" transform="rotate(-20, 89, 75)" />
        {/* Gloves */}
        <circle cx="14" cy="82" r="7" fill="#c4b5fd" />
        <circle cx="96" cy="82" r="7" fill="#c4b5fd" />
        {/* Legs */}
        <rect x="34" y="108" width="18" height="28" rx="9" fill="#ddd6fe" />
        <rect x="58" y="108" width="18" height="28" rx="9" fill="#ddd6fe" />
        {/* Boots */}
        <rect x="30" y="130" width="26" height="12" rx="6" fill="#c4b5fd" />
        <rect x="54" y="130" width="26" height="12" rx="6" fill="#c4b5fd" />
        {/* Jetpack */}
        <rect x="60" y="70" width="18" height="30" rx="7" fill="#c4b5fd" />
        <rect x="62" y="74" width="14" height="22" rx="5" fill="#a78bfa" opacity="0.5" />
        {/* Jetpack flame */}
        <ellipse cx="69" cy="103" rx="5" ry="8" fill="#f59e0b" opacity="0.8" />
        <ellipse cx="69" cy="107" rx="3" ry="5" fill="#fde68a" opacity="0.9" />
      </g>

      {/* Question marks floating */}
      <text x="30" y="80" fontSize="22" fill="#a78bfa" opacity="0.4" fontWeight="900">?</text>
      <text x="210" y="45" fontSize="16" fill="#c4b5fd" opacity="0.5" fontWeight="900">?</text>

      {/* 404 text */}
      <text x="130" y="188" fontSize="11" fill="#a78bfa" opacity="0.6" fontWeight="700" textAnchor="middle" letterSpacing="3">4  0  4</text>

      <defs>
        <radialGradient id="planetGrad" cx="40%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#9f67ff" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#4c1d95" stopOpacity="0.4" />
        </radialGradient>
        <linearGradient id="visorGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#ec4899" stopOpacity="0.15" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function PageNotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, #f5f3ff 0%, #faf5ff 40%, #ffffff 100%)' }}>
      <NotFoundIllustration />
      <h1 className="text-3xl font-black text-foreground mb-2 font-sora">Lost in space?</h1>
      <p className="text-muted-foreground mb-8 max-w-xs text-sm leading-relaxed">
        This page drifted off. Head back to the dashboard and continue your mission.
      </p>
      <Link to="/"
        className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm text-white shadow-lg shadow-violet-300/40 hover:opacity-90 transition-opacity"
        style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}>
        Back to Dashboard →
      </Link>
    </div>
  );
}
