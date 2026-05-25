import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, Folder, Plus, Edit2, Trash2, ChevronDown, ChevronUp, X, Check, FolderOpen, GripVertical, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { format } from 'date-fns';
import { toTitleCase } from '@/lib/utils';

const parseIds = (raw) => { try { return JSON.parse(raw || '[]'); } catch { return []; } };

const SUBJECTS = ['math','science','history','geography','english','foreign_language','computer_science','art','music','other'];
const subjectColors = {
  math: 'from-blue-400 to-blue-600',
  science: 'from-emerald-400 to-teal-600',
  history: 'from-amber-400 to-orange-500',
  geography: 'from-green-400 to-green-600',
  english: 'from-violet-400 to-purple-600',
  foreign_language: 'from-pink-400 to-rose-500',
  computer_science: 'from-cyan-400 to-blue-500',
  art: 'from-pink-400 to-fuchsia-500',
  music: 'from-indigo-400 to-violet-500',
  other: 'from-slate-400 to-slate-600',
};

export default function Storage() {
  const queryClient = useQueryClient();
  const [expandedDecks, setExpandedDecks] = useState({});
  const [editingCard, setEditingCard] = useState(null);
  const [editFront, setEditFront] = useState('');
  const [editBack, setEditBack] = useState('');
  const [newFolder, setNewFolder] = useState('');
  const [showFolderInput, setShowFolderInput] = useState(false);
  const [openFolderId, setOpenFolderId] = useState(null);

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });

  const { data: cards = [] } = useQuery({
    queryKey: ['myStudyCards'],
    queryFn: () => base44.entities.StudyCard.filter({ created_by: user?.email }, '-created_date', 200),
    enabled: !!user?.email,
  });

  const { data: submissions = [] } = useQuery({
    queryKey: ['mySubmissions'],
    queryFn: () => base44.entities.Submission.filter({ created_by: user?.email }, '-created_date', 100).then(r => r.filter(s => s.type !== 'xp_boost')),
    enabled: !!user?.email,
  });

  const updateCard = useMutation({
    mutationFn: ({ id, data }) => base44.entities.StudyCard.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['myStudyCards'] }); setEditingCard(null); toast.success('Card updated!'); },
    onError: () => toast.error('Failed to update card. Please try again.'),
  });

  const deleteCard = useMutation({
    mutationFn: (id) => base44.entities.StudyCard.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['myStudyCards'] }); toast.success('Card deleted'); },
    onError: () => toast.error('Failed to delete card. Please try again.'),
  });

  const decks = cards.reduce((acc, card) => {
    const key = card.deck_name || 'Untitled Deck';
    if (!acc[key]) acc[key] = { subject: card.subject, cards: [] };
    acc[key].cards.push(card);
    return acc;
  }, {});

  const { data: folders = [] } = useQuery({
    queryKey: ['myFolders'],
    queryFn: () => base44.entities.Folder.filter({}, 'created_date', 200),
    enabled: !!user?.email,
  });

  const createFolder = useMutation({
    mutationFn: (name) => base44.entities.Folder.create({ name }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['myFolders'] }); toast.success('Folder created!'); },
  });

  const updateFolder = useMutation({
    mutationFn: ({ id, item_ids }) => base44.entities.Folder.update(id, { item_ids }),
  });

  const deleteFolderMutation = useMutation({
    mutationFn: (id) => base44.entities.Folder.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['myFolders'] }),
  });

  const onDragEnd = (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;
    if (destination.droppableId.startsWith('folder-')) {
      const folderId = destination.droppableId.replace('folder-', '');
      const folder = folders.find(f => f.id === folderId);
      if (!folder) return;
      const existing = parseIds(folder.item_ids);
      if (!existing.includes(draggableId)) {
        const newIds = [...existing, draggableId];
        updateFolder.mutate({ id: folderId, item_ids: newIds });
        queryClient.setQueryData(['myFolders'], (old = []) =>
          old.map(f => f.id === folderId ? { ...f, item_ids: JSON.stringify(newIds) } : f)
        );
        toast.success('Moved to folder!');
      }
    }
  };

  const addFolder = () => {
    if (!newFolder.trim()) return;
    createFolder.mutate(newFolder.trim());
    setNewFolder('');
    setShowFolderInput(false);
  };

  const deleteFolder = (id) => { deleteFolderMutation.mutate(id); };

  const startEdit = (card) => {
    setEditingCard(card.id);
    setEditFront(card.front);
    setEditBack(card.back);
  };

  const quizzed = submissions.filter(s => s.quiz_score != null);

  return (
    <div className="pb-8">

      {/* Dark hero — full width */}
      <div className="-mx-4 -mt-4 lg:-mx-8 lg:-mt-8 mb-6">
        <div className="bg-[#130d25] px-6 pt-7 pb-8">
          <div className="max-w-3xl mx-auto space-y-4">
            {/* Heading */}
            <div className="leading-none">
              <h1 className="font-black text-white" style={{ fontSize: 'clamp(3rem, 12vw, 5rem)', lineHeight: 0.92 }}>
                Your
              </h1>
              <h1 className="font-black text-cyan-400" style={{ fontSize: 'clamp(3rem, 12vw, 5rem)', lineHeight: 0.92 }}>
                Storage
              </h1>
            </div>
            <p className="text-white/50 text-sm">Flashcard sets, past quizzes & folders</p>

            {/* Summary pills */}
            <div className="flex items-center gap-2 flex-wrap pt-1">
              <span className="flex items-center gap-1.5 bg-white/10 text-white/70 text-xs font-bold px-3 py-1.5 rounded-full">
                <Folder className="w-3 h-3" /> {folders.length} folder{folders.length !== 1 ? 's' : ''}
              </span>
              <span className="flex items-center gap-1.5 bg-white/10 text-white/70 text-xs font-bold px-3 py-1.5 rounded-full">
                <Layers className="w-3 h-3" /> {Object.keys(decks).length} deck{Object.keys(decks).length !== 1 ? 's' : ''}
              </span>
              <span className="flex items-center gap-1.5 bg-white/10 text-white/70 text-xs font-bold px-3 py-1.5 rounded-full">
                <ClipboardList className="w-3 h-3" /> {quizzed.length} quiz{quizzed.length !== 1 ? 'zes' : ''}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="max-w-3xl mx-auto space-y-4">

          {/* ── Folders ─────────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-border overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="font-black text-foreground flex items-center gap-2">
                <Folder className="w-4 h-4 text-amber-500" /> Folders
              </h2>
              <button
                onClick={() => setShowFolderInput(true)}
                className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/70 transition-colors">
                <Plus className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <div className="p-5">
              {showFolderInput && (
                <div className="flex gap-2 mb-4">
                  <Input value={newFolder} onChange={e => setNewFolder(e.target.value)}
                    placeholder="Folder name..." className="h-9 rounded-xl"
                    onKeyDown={e => { if (e.key === 'Enter') addFolder(); if (e.key === 'Escape') setShowFolderInput(false); }}
                    autoFocus />
                  <Button size="sm" onClick={addFolder} className="rounded-xl"><Check className="w-3.5 h-3.5" /></Button>
                  <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setShowFolderInput(false)}><X className="w-3.5 h-3.5" /></Button>
                </div>
              )}

              {folders.length === 0 && !showFolderInput ? (
                <div className="py-8 text-center">
                  <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-3 relative">
                    <Folder className="w-8 h-8 text-amber-400" />
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center">
                      <Plus className="w-3 h-3 text-white" />
                    </div>
                  </div>
                  <p className="font-bold text-foreground text-sm">No folders yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Create one to organise your decks & quizzes</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {folders.map(folder => {
                    const contents = parseIds(folder.item_ids);
                    const isOpen = openFolderId === folder.id;
                    return (
                      <Droppable key={folder.id} droppableId={`folder-${folder.id}`}>
                        {(provided, snapshot) => (
                          <div ref={provided.innerRef} {...provided.droppableProps}
                            onClick={() => setOpenFolderId(isOpen ? null : folder.id)}
                            className={`group flex flex-col gap-1 border rounded-xl px-3 py-2.5 transition-all min-h-[56px] cursor-pointer ${
                              isOpen ? 'border-amber-400 bg-amber-100 ring-2 ring-amber-300'
                              : snapshot.isDraggingOver ? 'border-primary bg-primary/5 border-solid'
                              : 'bg-amber-50 border-amber-200 hover:bg-amber-100'}`}>
                            <div className="flex items-center gap-2">
                              <FolderOpen className={`w-4 h-4 shrink-0 ${isOpen || snapshot.isDraggingOver ? 'text-primary' : 'text-amber-500'}`} />
                              <span className="flex-1 text-sm font-semibold text-foreground truncate">{folder.name}</span>
                              <button
                                onClick={(e) => { e.stopPropagation(); toast(`Delete "${folder.name}"?`, { action: { label: 'Delete', onClick: () => deleteFolder(folder.id) }, cancel: { label: 'Cancel' }, duration: 5000 }); }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            {contents.length > 0 && (
                              <p className="text-[10px] text-muted-foreground">{contents.length} item{contents.length !== 1 ? 's' : ''} · click to view</p>
                            )}
                            {contents.length === 0 && !snapshot.isDraggingOver && (
                              <p className="text-[10px] text-muted-foreground">Empty · drag items here</p>
                            )}
                            {snapshot.isDraggingOver && <p className="text-[10px] text-primary font-bold">Drop here</p>}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    );
                  })}
                </div>
              )}

              {/* Open folder contents */}
              {openFolderId && (() => {
                const folder = folders.find(f => f.id === openFolderId);
                if (!folder) return null;
                const ids = parseIds(folder.item_ids);
                const folderDecks = ids.filter(id => id.startsWith('deck-')).map(id => id.replace('deck-', '')).filter(name => decks[name]);
                const folderQuizzes = ids.filter(id => id.startsWith('quiz-')).map(id => id.replace('quiz-', '')).map(qid => submissions.find(s => s.id === qid)).filter(Boolean);
                const hasContent = folderDecks.length > 0 || folderQuizzes.length > 0;
                return (
                  <div className="mt-3 border border-amber-200 rounded-xl bg-white p-4 space-y-3">
                    <p className="text-xs font-black text-amber-700 uppercase tracking-wider">{folder.name}</p>
                    {!hasContent && <p className="text-xs text-muted-foreground">No items yet — drag flashcard decks or quizzes into this folder.</p>}
                    {folderDecks.map(name => {
                      const deck = decks[name];
                      const gradient = subjectColors[deck.subject] || 'from-slate-400 to-slate-600';
                      return (
                        <div key={name} className="flex items-center gap-3 bg-secondary/30 rounded-xl px-4 py-3">
                          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0`}>
                            <Layers className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-foreground">{name}</p>
                            <p className="text-xs text-muted-foreground capitalize">{deck.subject?.replace(/_/g,' ')} · {deck.cards.length} cards</p>
                          </div>
                        </div>
                      );
                    })}
                    {folderQuizzes.map(sub => (
                      <div key={sub.id} className="flex items-center gap-3 bg-secondary/30 rounded-xl px-4 py-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-foreground truncate">{toTitleCase(sub.title)}</p>
                          <p className="text-xs text-muted-foreground capitalize">{sub.subject?.replace(/_/g,' ')} · {format(new Date(sub.created_date), 'MMM d, yyyy')}</p>
                        </div>
                        <span className={`text-xs font-black px-2.5 py-1 rounded-full shrink-0 ${
                          sub.quiz_score >= 80 ? 'bg-emerald-50 text-emerald-600' :
                          sub.quiz_score >= 60 ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'}`}>
                          {sub.quiz_score}%
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* ── Flashcard Sets ──────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-border overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="font-black text-foreground flex items-center gap-2">
                <Layers className="w-4 h-4 text-violet-500" /> Flashcard sets
              </h2>
              <span className="text-sm font-bold text-muted-foreground bg-secondary px-2.5 py-0.5 rounded-full">
                {Object.keys(decks).length}
              </span>
            </div>

            <div className="p-5">
              {Object.keys(decks).length === 0 ? (
                <div className="py-8 text-center">
                  <div className="w-16 h-16 bg-violet-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Layers className="w-8 h-8 text-violet-400" />
                  </div>
                  <p className="font-bold text-foreground text-sm">No flashcard sets yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Generate flashcards in Study Tools to see them here</p>
                </div>
              ) : (
                <Droppable droppableId="decks-list" isDropDisabled={true}>
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-3">
                      {Object.entries(decks).map(([deckName, deck], idx) => {
                        const isOpen = expandedDecks[deckName];
                        const gradient = subjectColors[deck.subject] || 'from-slate-400 to-slate-600';
                        return (
                          <Draggable key={deckName} draggableId={`deck-${deckName}`} index={idx}>
                            {(dragProvided, dragSnapshot) => (
                              <div ref={dragProvided.innerRef} {...dragProvided.draggableProps}
                                className={`bg-secondary/30 rounded-2xl border overflow-hidden transition-shadow ${dragSnapshot.isDragging ? 'shadow-xl border-primary/30' : 'border-border'}`}>
                                <div className="w-full px-4 py-3 flex items-center gap-3 hover:bg-secondary/50 transition-colors cursor-pointer"
                                  onClick={() => setExpandedDecks(e => ({ ...e, [deckName]: !e[deckName] }))}>
                                  <div {...dragProvided.dragHandleProps} onClick={e => e.stopPropagation()}
                                    className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-muted-foreground hover:text-foreground shrink-0">
                                    <GripVertical className="w-4 h-4" />
                                  </div>
                                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0`}>
                                    <Layers className="w-4 h-4 text-white" />
                                  </div>
                                  <div className="flex-1 text-left">
                                    <p className="font-black text-sm text-foreground">{deckName}</p>
                                    <p className="text-xs text-muted-foreground capitalize">{deck.subject?.replace(/_/g,' ')} · {deck.cards.length} cards</p>
                                  </div>
                                  {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                                </div>

                                <AnimatePresence>
                                  {isOpen && (
                                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                                      className="overflow-hidden border-t border-border">
                                      <div className="p-3 space-y-2">
                                        {deck.cards.map(card => (
                                          <div key={card.id} className="bg-white rounded-xl p-3">
                                            {editingCard === card.id ? (
                                              <div className="space-y-2">
                                                <div>
                                                  <p className="text-xs font-bold text-muted-foreground mb-1">Front</p>
                                                  <Input value={editFront} onChange={e => setEditFront(e.target.value)} className="h-9 rounded-lg text-sm" />
                                                </div>
                                                <div>
                                                  <p className="text-xs font-bold text-muted-foreground mb-1">Back</p>
                                                  <Textarea value={editBack} onChange={e => setEditBack(e.target.value)} className="min-h-[60px] rounded-lg text-sm resize-none" />
                                                </div>
                                                <div className="flex gap-2">
                                                  <Button size="sm" className="rounded-lg font-bold flex-1"
                                                    onClick={() => updateCard.mutate({ id: card.id, data: { front: editFront, back: editBack } })}>
                                                    <Check className="w-3.5 h-3.5 mr-1" /> Save
                                                  </Button>
                                                  <Button size="sm" variant="outline" className="rounded-lg" onClick={() => setEditingCard(null)}>
                                                    <X className="w-3.5 h-3.5" />
                                                  </Button>
                                                </div>
                                              </div>
                                            ) : (
                                              <div className="flex items-start gap-2">
                                                <div className="flex-1 min-w-0">
                                                  <p className="text-xs font-black text-primary mb-0.5">Q: {card.front}</p>
                                                  <p className="text-xs text-muted-foreground">A: {card.back}</p>
                                                </div>
                                                <div className="flex gap-1 shrink-0">
                                                  <button onClick={() => startEdit(card)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-primary">
                                                    <Edit2 className="w-3 h-3" />
                                                  </button>
                                                  <button onClick={() => toast('Delete this flashcard?', { action: { label: 'Delete', onClick: () => deleteCard.mutate(card.id) }, cancel: { label: 'Cancel' }, duration: 5000 })} className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-destructive">
                                                    <Trash2 className="w-3 h-3" />
                                                  </button>
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              )}
            </div>
          </div>

          {/* ── Past Quizzes ─────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-border overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="font-black text-foreground flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-teal-500" /> Past quizzes
              </h2>
              <span className="text-sm font-bold text-muted-foreground bg-secondary px-2.5 py-0.5 rounded-full">
                {quizzed.length}
              </span>
            </div>

            <div className="p-5">
              {quizzed.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <ClipboardList className="w-8 h-8 text-teal-400" />
                  </div>
                  <p className="font-bold text-foreground text-sm">No quizzes taken yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Take a quiz to see your results here</p>
                </div>
              ) : (
                <Droppable droppableId="quiz-list" isDropDisabled={true}>
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                      {quizzed.map((sub, idx) => (
                        <Draggable key={sub.id} draggableId={`quiz-${sub.id}`} index={idx}>
                          {(dragProvided, dragSnapshot) => (
                            <div ref={dragProvided.innerRef} {...dragProvided.draggableProps}
                              className={`bg-secondary/30 rounded-xl border px-4 py-3 flex items-center gap-3 transition-shadow ${dragSnapshot.isDragging ? 'shadow-xl border-primary/30' : 'border-border'}`}>
                              <div {...dragProvided.dragHandleProps} className="cursor-grab active:cursor-grabbing text-muted-foreground shrink-0">
                                <GripVertical className="w-4 h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-foreground truncate">{toTitleCase(sub.title)}</p>
                                <p className="text-xs text-muted-foreground capitalize">
                                  {sub.subject?.replace(/_/g,' ')} · {format(new Date(sub.created_date), 'MMM d, yyyy')}
                                </p>
                              </div>
                              <span className={`text-xs font-black px-2.5 py-1 rounded-full shrink-0 ${
                                sub.quiz_score >= 80 ? 'bg-emerald-50 text-emerald-600' :
                                sub.quiz_score >= 60 ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'}`}>
                                {sub.quiz_score}%
                              </span>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              )}
            </div>
          </div>

        </div>
      </DragDropContext>

      <div className="max-w-3xl mx-auto text-center py-4 border-t border-border mt-4">
        <p className="text-sm text-muted-foreground">Any questions? <a href="https://mail.google.com/mail/?view=cm&to=intellix.study.app@gmail.com" target="_blank" rel="noopener noreferrer" className="text-primary font-semibold hover:underline">intellix.study.app@gmail.com</a></p>
      </div>
    </div>
  );
}
