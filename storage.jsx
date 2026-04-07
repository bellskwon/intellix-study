import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, Folder, Plus, Edit2, Trash2, ChevronDown, ChevronUp, X, Check, FolderOpen, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

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
  const [editingCard, setEditingCard] = useState(null); // {id, front, back}
  const [editFront, setEditFront] = useState('');
  const [editBack, setEditBack] = useState('');
  const [newFolder, setNewFolder] = useState('');
  const [showFolderInput, setShowFolderInput] = useState(false);
  const [folders, setFolders] = useState(() => {
    try { return JSON.parse(localStorage.getItem('intellix_folders') || '[]'); } catch { return []; }
  });

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });

  const { data: cards = [] } = useQuery({
    queryKey: ['myStudyCards'],
    queryFn: () => base44.entities.StudyCard.filter({ created_by: user?.email }, '-created_date', 200),
    enabled: !!user?.email,
  });

  const { data: submissions = [] } = useQuery({
    queryKey: ['mySubmissions'],
    queryFn: () => base44.entities.Submission.filter({ created_by: user?.email }, '-created_date', 20),
    enabled: !!user?.email,
  });

  const updateCard = useMutation({
    mutationFn: ({ id, data }) => base44.entities.StudyCard.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['myStudyCards'] }); setEditingCard(null); toast.success('Card updated!'); },
  });

  const deleteCard = useMutation({
    mutationFn: (id) => base44.entities.StudyCard.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['myStudyCards'] }); toast.success('Card deleted'); },
  });

  // Group cards by deck
  const decks = cards.reduce((acc, card) => {
    const key = card.deck_name || 'Untitled Deck';
    if (!acc[key]) acc[key] = { subject: card.subject, cards: [] };
    acc[key].cards.push(card);
    return acc;
  }, {});

  const [folderContents, setFolderContents] = useState(() => {
    try { return JSON.parse(localStorage.getItem('intellix_folder_contents') || '{}'); } catch { return {}; }
  });

  const saveFolderContents = (updated) => {
    setFolderContents(updated);
    localStorage.setItem('intellix_folder_contents', JSON.stringify(updated));
  };

  const onDragEnd = (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return; // dropped outside — stays in place
    if (destination.droppableId === source.droppableId) return; // no change
    if (destination.droppableId.startsWith('folder-')) {
      const folderId = destination.droppableId.replace('folder-', '');
      const existing = folderContents[folderId] || [];
      if (!existing.includes(draggableId)) {
        saveFolderContents({ ...folderContents, [folderId]: [...existing, draggableId] });
        toast.success('Moved to folder!');
      }
    }
  };

  const saveFolders = (updated) => {
    setFolders(updated);
    localStorage.setItem('intellix_folders', JSON.stringify(updated));
  };

  const addFolder = () => {
    if (!newFolder.trim()) return;
    saveFolders([...folders, { id: Date.now().toString(), name: newFolder.trim() }]);
    setNewFolder('');
    setShowFolderInput(false);
    toast.success('Folder created!');
  };

  const deleteFolder = (id) => {
    saveFolders(folders.filter(f => f.id !== id));
  };

  const startEdit = (card) => {
    setEditingCard(card.id);
    setEditFront(card.front);
    setEditBack(card.back);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-foreground tracking-tight">Storage</h1>
        <p className="text-muted-foreground text-sm mt-1.5">Your saved flashcard sets, past quizzes, and organized folders.</p>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>

      {/* Folders */}
      <div className="bg-white rounded-2xl border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-black text-foreground flex items-center gap-2">
            <Folder className="w-4 h-4 text-amber-500" /> Folders
          </h2>
          <Button size="sm" variant="outline" className="rounded-xl font-bold" onClick={() => setShowFolderInput(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" /> New Folder
          </Button>
        </div>

        {showFolderInput && (
          <div className="flex gap-2 mb-3">
            <Input value={newFolder} onChange={e => setNewFolder(e.target.value)}
              placeholder="Folder name..." className="h-9 rounded-xl"
              onKeyDown={e => { if (e.key === 'Enter') addFolder(); if (e.key === 'Escape') setShowFolderInput(false); }}
              autoFocus />
            <Button size="sm" onClick={addFolder} className="rounded-xl"><Check className="w-3.5 h-3.5" /></Button>
            <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setShowFolderInput(false)}><X className="w-3.5 h-3.5" /></Button>
          </div>
        )}

        {folders.length === 0 && !showFolderInput ? (
          <p className="text-sm text-muted-foreground text-center py-4">No folders yet — create one, then drag a deck or quiz into it</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {folders.map(folder => {
              const contents = folderContents[folder.id] || [];
              return (
                <Droppable key={folder.id} droppableId={`folder-${folder.id}`}>
                  {(provided, snapshot) => (
                    <div ref={provided.innerRef} {...provided.droppableProps}
                      className={`group flex flex-col gap-1 border rounded-xl px-3 py-2.5 transition-all min-h-[56px] ${snapshot.isDraggingOver ? 'border-primary bg-primary/5 border-solid' : 'bg-amber-50 border-amber-200 hover:bg-amber-100'}`}>
                      <div className="flex items-center gap-2">
                        <FolderOpen className={`w-4 h-4 shrink-0 ${snapshot.isDraggingOver ? 'text-primary' : 'text-amber-500'}`} />
                        <span className="flex-1 text-sm font-semibold text-foreground truncate">{folder.name}</span>
                        <button onClick={() => deleteFolder(folder.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {contents.length > 0 && (
                        <p className="text-[10px] text-muted-foreground">{contents.length} item{contents.length !== 1 ? 's' : ''}</p>
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
      </div>

      {/* Flashcard Decks */}
      <div>
        <h2 className="font-black text-foreground flex items-center gap-2 mb-3">
          <Layers className="w-4 h-4 text-violet-500" /> Saved Flashcard Sets
          <span className="text-xs font-normal text-muted-foreground">({Object.keys(decks).length} decks, {cards.length} cards)</span>
        </h2>

        {Object.keys(decks).length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-border p-8 text-center">
            <Layers className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
            <p className="font-bold text-foreground">No flashcard sets yet</p>
            <p className="text-sm text-muted-foreground mt-1">Generate flashcards in Study Tools to see them here</p>
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
                  className={`bg-white rounded-2xl border overflow-hidden transition-shadow ${dragSnapshot.isDragging ? 'shadow-xl border-primary/30' : 'border-border'}`}>
                  <div className="w-full px-5 py-4 flex items-center gap-3 hover:bg-secondary/30 transition-colors cursor-pointer"
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
                            <div key={card.id} className="bg-secondary/30 rounded-xl p-3">
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
                                    <button onClick={() => startEdit(card)} className="p-1.5 rounded-lg hover:bg-white transition-colors text-muted-foreground hover:text-primary">
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                    <button onClick={() => deleteCard.mutate(card.id)} className="p-1.5 rounded-lg hover:bg-white transition-colors text-muted-foreground hover:text-destructive">
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

      {/* Past Quizzes */}
      <div>
        <h2 className="font-black text-foreground flex items-center gap-2 mb-3">
          Past Quizzes
          <span className="text-xs font-normal text-muted-foreground">({submissions.length} recent)</span>
        </h2>
        {submissions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">No quizzes taken yet</p>
          </div>
        ) : (
          <Droppable droppableId="quiz-list" isDropDisabled={true}>
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                {submissions.map((sub, idx) => (
                  <Draggable key={sub.id} draggableId={`quiz-${sub.id}`} index={idx}>
                    {(dragProvided, dragSnapshot) => (
                      <div ref={dragProvided.innerRef} {...dragProvided.draggableProps}
                        className={`bg-white rounded-xl border px-4 py-3 flex items-center gap-3 transition-shadow ${dragSnapshot.isDragging ? 'shadow-xl border-primary/30' : 'border-border'}`}>
                        <div {...dragProvided.dragHandleProps} className="cursor-grab active:cursor-grabbing text-muted-foreground shrink-0">
                          <GripVertical className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{sub.title}</p>
                          <p className="text-xs text-muted-foreground capitalize">{sub.subject?.replace(/_/g,' ')} · {sub.grade_level}</p>
                        </div>
                        {sub.quiz_score != null ? (
                          <span className={`text-xs font-black px-2.5 py-1 rounded-full shrink-0 ${
                            sub.quiz_score >= 80 ? 'bg-emerald-50 text-emerald-600' :
                            sub.quiz_score >= 60 ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'}`}>
                            {sub.quiz_score}%
                          </span>
                        ) : <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full shrink-0">Pending</span>}
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

      </DragDropContext>

      <div className="text-center py-4 border-t border-border">
        <p className="text-sm text-muted-foreground">Any questions? <a href="mailto:intellixapp.team@gmail.com" className="text-primary font-semibold hover:underline">intellixapp.team@gmail.com</a></p>
      </div>
    </div>
  );
}