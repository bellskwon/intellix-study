import React from "react"
import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
} 


export const isIframe = window.self !== window.top;

const MINOR_WORDS = new Set(['a','an','the','and','but','or','for','nor','on','at','to','by','in','of','up','as','is']);
export function toTitleCase(str) {
  if (!str) return str;
  return str.replace(/\w\S*/g, (word, offset) => {
    const lower = word.toLowerCase();
    return (offset === 0 || !MINOR_WORDS.has(lower))
      ? lower.charAt(0).toUpperCase() + lower.slice(1)
      : lower;
  });
}

export function renderWithSubscripts(text) {
  if (!text) return text;
  const regex = /([A-Za-z)])(\d+)/g;
  const parts = [];
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    parts.push(match[1]);
    parts.push(React.createElement('sub', { key: match.index }, match[2]));
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts.length > 0 ? parts : text;
}
