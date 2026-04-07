import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, BookOpen, RotateCw, Loader2, Plus, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

const subjects = [
  { value: 'math', label: 'Mathematics' },
  { value: 'science', label: 'Science' },
  { value: 'history', label: 'History' },
  { value: 'geography', label: 'Geography' },
  { value: 'english', label: 'English' },
  { value: 'foreign_language', label: 'Foreign Language' },
  { value: 'computer_science', label: 'Computer Science' },
  { value: 'other', label: 'Other' },
];

export default function StudyTools() {
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: cards = [] } = useQuery({
    queryKey: ['myCards'],
    queryFn: () => base44.entities.StudyCard.filter({ created_by: user?.email }),
    enabled: !!user?.email,
  });

  const decks = [...new Set(cards.map(c => c.deck_name))];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Study Tools</h1>
        <p className="text-muted-foreground mt-1 text-sm">Upload notes to generate flashcards and practice questions.</p>
      </div>

      <Tabs defaultValue="generate">
        <TabsList>
          <TabsTrigger value="generate">Generate from Notes</TabsTrigger>
          <TabsTrigger value="flashcards">My Flashcards ({cards.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="mt-4">
          <GenerateFromNotes onGenerated={() => queryClient.invalidateQueries({ queryKey: ['myCards'] })} />
        </TabsContent>

        <TabsContent value="flashcards" className="mt-4">
          {decks.length === 0 ? (
            <div className="text-center py-16 bg-card rounded-2xl border border-border">
              <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No flashcards yet. Generate some from your notes!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {decks.map(deck => (
                <FlashcardDeck key={deck} name={deck} cards={cards.filter(c => c.deck_name === deck)} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function GenerateFromNotes({ onGenerated }) {
  const [file, setFile] = useState(null);
  const [subject, setSubject] = useState('');
  const [deckName, setDeckName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!file || !subject || !deckName) {
      toast.error('Please fill in all fields and upload your notes');
      return;
    }

    setLoading(true);

    const { file_url } = await base44.integrations.Core.UploadFile({ file });

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Analyze these study notes and generate 15 flashcards. Subject: ${subject}. 
      Create a mix of term/definition pairs and question/answer pairs. 
      Make them helpful for studying and memorization.`,
      file_urls: [file_url],
      response_json_schema: {
        type: "object",
        properties: {
          cards: {
            type: "array",
            items: {
              type: "object",
              properties: {
                front: { type: "string" },
                back: { type: "string" },
              }
            }
          }
        }
      }
    });

    await base44.entities.StudyCard.bulkCreate(
      result.cards.map(c => ({
        deck_name: deckName,
        subject,
        front: c.front,
        back: c.back,
      }))
    );

    toast.success(`Generated ${result.cards.length} flashcards!`);
    setLoading(false);
    setFile(null);
    setDeckName('');
    onGenerated();
  };

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div>
          <Label>Deck Name</Label>
          <Input placeholder="e.g. Biology Chapter 3" value={deckName} onChange={e => setDeckName(e.target.value)} />
        </div>
        <div>
          <Label>Subject</Label>
          <Select value={subject} onValueChange={setSubject}>
            <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
            <SelectContent>
              {subjects.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Upload Notes (image or PDF)</Label>
          <div className="mt-1 border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/30 transition-colors relative">
            <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">{file ? file.name : 'Click to upload'}</p>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={e => setFile(e.target.files[0])}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </div>
        </div>
        <Button className="w-full" onClick={handleGenerate} disabled={loading}>
          {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</> : <><Sparkles className="w-4 h-4 mr-2" /> Generate Flashcards</>}
        </Button>
      </CardContent>
    </Card>
  );
}

function FlashcardDeck({ name, cards }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const card = cards[currentIndex];
  if (!card) return null;

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-semibold text-sm">{name}</p>
            <p className="text-xs text-muted-foreground">{cards.length} cards · {card.subject?.replace('_', ' ')}</p>
          </div>
          <span className="text-xs text-muted-foreground">{currentIndex + 1} / {cards.length}</span>
        </div>

        <button
          onClick={() => setFlipped(!flipped)}
          className="w-full min-h-[160px] bg-secondary/50 rounded-xl p-6 text-center hover:bg-secondary transition-colors flex items-center justify-center"
        >
          <div>
            <p className="text-xs text-muted-foreground mb-2">{flipped ? 'Answer' : 'Question'}</p>
            <p className="text-base font-medium">{flipped ? card.back : card.front}</p>
          </div>
        </button>

        <div className="flex items-center justify-between mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setCurrentIndex(Math.max(0, currentIndex - 1)); setFlipped(false); }}
            disabled={currentIndex === 0}
          >
            Previous
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setFlipped(!flipped)}
          >
            <RotateCw className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setCurrentIndex(Math.min(cards.length - 1, currentIndex + 1)); setFlipped(false); }}
            disabled={currentIndex === cards.length - 1}
          >
            Next
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}