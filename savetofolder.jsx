import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Folder, FolderOpen, Plus, X, Check, FlaskConical, Zap, Brain, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

// System folders that always exist — one per study method
const SYSTEM_FOLDERS = [
  { id: 'sys_quizzes',    name: 'Past Study Quizzes',    Icon: FlaskConical, color: 'text-pink-500',   bg: 'bg-pink-50',   border: 'border-pink-200'   },
  { id: 'sys_challenges', name: 'Past Quick Challenges',  Icon: Zap,          color: 'text-amber-500',  bg: 'bg-amber-50',  border: 'border-amber-200'  },
  { id: 'sys_tools',      name: 'Past Study Tools',       Icon: Brain,        color: 'text-indigo-500', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  { id: 'sys_flashcards', name: 'Saved Flashcard Sets',   Icon: BookOpen,     color: 'text-violet-500', bg: 'bg-violet-50', border: 'border-violet-200' },
];

function getFolders() {
  try { return JSON.parse(localStorage.getItem('intellix_folders') || '[]'); } catch { return []; }
}
function saveFolders(folders) {
  localStorage.setItem('intellix_folders', JSON.stringify(folders));
}
function getFolderContents() {
  try { return JSON.parse(localStorage.getItem('intellix_folder_contents') || '{}'); } catch { return {}; }
}
function saveFolderContents(contents) {
  localStorage.setItem('intellix_folder_contents', JSON.stringify(contents));
}
function getSavedItems() {
  try { return JSON.parse(localStorage.getItem('intellix_saved_items') || '[]'); } catch { return []; }
}
function setSavedItems(items) {
  localStorage.setItem('intellix_saved_items', JSON.stringify(items));
}

/**
 * Call this to save an item to a folder.
 * Returns the saved item id.
 */
export function saveItemToFolder({ folderId, type, title, subject, grade, data }) {
  const id = `${type}_${Date.now()}`;
  const items = getSavedItems();
  items.unshift({ id, type, title, subject, grade, folderId, date: new Date().toISOString(), data });
  setSavedItems(items);

  const contents = getFolderContents();
  contents[folderId] = [id, ...(contents[folderId] || [])];
  saveFolderContents(contents);
  return id;
}

export function getSavedItemsForFolder(folderId) {
  const contents = getFolderContents();
  const ids = new Set(contents[folderId] || []);
  return getSavedItems().filter(item => ids.has(item.id));
}

/**
 * Modal props:
 *   open        — boolean
 *   onClose     — () => void
 *   type        — 'quiz' | 'challenge' | 'tools' | 'flashcards'
 *   title       — string
 *   subject     — string
 *   grade       — string (optional)
 *   data        — any (the result payload to save)
 */
export default function SaveToFolderModal({ open, onClose, type, title, subject, grade, data }) {
  const [selectedId, setSelectedId] = useState(null);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [customFolders, setCustomFolders] = useState(getFolders);

  if (!open) return null;

  const defaultFolderId =
    type === 'quiz'       ? 'sys_quizzes'
    : type === 'challenge' ? 'sys_challenges'
    : type === 'flashcards' ? 'sys_flashcards'
    : 'sys_tools';

  const handleSave = () => {
    const folderId = selectedId || defaultFolderId;
    saveItemToFolder({ folderId, type, title, subject, grade, data });
    toast.success('Saved to folder!');
    onClose();
  };

  const handleAddFolder = () => {
    if (!newFolderName.trim()) return;
    const newF = { id: Date.now().toString(), name: newFolderName.trim() };
    const updated = [newF, ...customFolders];
    setCustomFolders(updated);
    saveFolders(updated);
    setSelectedId(newF.id);
    setNewFolderName('');
    setShowNewFolder(false);
  };

  const allFolders = [...SYSTEM_FOLDERS, ...customFolders.map(f => ({
    ...f,
    Icon: Folder,
    color: 'text-teal-500',
    bg: 'bg-teal-50',
    border: 'border-teal-200',
  }))];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
        style={{ background: 'rgba(10,8,30,0.65)', backdropFilter: 'blur(4px)' }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ scale: 0.96, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 20 }}
          className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 pt-6 pb-4 flex items-center justify-between">
            <div>
              <h3 className="font-black text-foreground font-sora text-lg">Save to folder</h3>
              <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[200px]">{title}</p>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-secondary rounded-xl transition-colors">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Folder grid */}
          <div className="px-6 pb-2 max-h-64 overflow-y-auto">
            <div className="grid grid-cols-2 gap-2">
              {allFolders.map(f => {
                const isSelected = selectedId === f.id || (!selectedId && f.id === defaultFolderId);
                return (
                  <button key={f.id} onClick={() => setSelectedId(f.id)}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border-2 text-left transition-all ${
                      isSelected
                        ? `${f.bg} ${f.border} shadow-sm`
                        : 'border-border hover:border-muted-foreground/30 bg-white'
                    }`}>
                    {isSelected
                      ? <FolderOpen className={`w-4 h-4 shrink-0 ${f.color}`} />
                      : <f.Icon className={`w-4 h-4 shrink-0 ${isSelected ? f.color : 'text-muted-foreground'}`} />
                    }
                    <span className="text-xs font-bold text-foreground leading-tight line-clamp-2">{f.name}</span>
                  </button>
                );
              })}

              {/* Add new folder */}
              {showNewFolder ? (
                <div className="col-span-2 flex gap-2 pt-1">
                  <Input
                    autoFocus
                    value={newFolderName}
                    onChange={e => setNewFolderName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleAddFolder(); if (e.key === 'Escape') setShowNewFolder(false); }}
                    placeholder="Folder name..."
                    className="h-9 rounded-xl text-sm flex-1"
                  />
                  <button onClick={handleAddFolder} className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0">
                    <Check className="w-4 h-4 text-white" />
                  </button>
                  <button onClick={() => setShowNewFolder(false)} className="w-9 h-9 rounded-xl border border-border flex items-center justify-center shrink-0">
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              ) : (
                <button onClick={() => setShowNewFolder(true)}
                  className="flex items-center gap-2 p-3 rounded-xl border-2 border-dashed border-border hover:border-primary/40 hover:bg-primary/5 transition-all">
                  <Plus className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs font-bold text-muted-foreground">New folder</span>
                </button>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="px-6 pt-3 pb-6 flex gap-2">
            <button onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-secondary transition-colors">
              Skip
            </button>
            <button onClick={handleSave}
              className="flex-1 py-3 rounded-xl bg-primary text-white text-sm font-bold shadow-lg shadow-primary/25 hover:opacity-90 transition-opacity">
              Save
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
