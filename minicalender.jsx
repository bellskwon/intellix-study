import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ChevronLeft, ChevronRight, Plus, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const EVENT_COLORS = {
  quiz: 'bg-violet-500',
  test: 'bg-rose-500',
  assignment: 'bg-amber-500',
  other: 'bg-cyan-500',
};

export default function MiniCalendar({ userEmail }) {
  const queryClient = useQueryClient();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newType, setNewType] = useState('quiz');

  const { data: events = [] } = useQuery({
    queryKey: ['calendarEvents'],
    queryFn: () => base44.entities.CalendarEvent.filter({ created_by: userEmail }, '-created_date', 100),
    enabled: !!userEmail,
  });

  const addEvent = useMutation({
    mutationFn: (data) => base44.entities.CalendarEvent.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendarEvents'] });
      setShowAddForm(false);
      setNewTitle('');
      setNewDescription('');
      setNewSubject('');
      toast.success('Event added!');
    },
  });

  const handleSaveEvent = () => {
    if (!newTitle.trim()) { toast.error('Please enter a title'); return; }
    addEvent.mutate({
      title: newTitle.trim(),
      date: format(selectedDay, 'yyyy-MM-dd'),
      type: newType,
      notes: [newDescription.trim(), newSubject.trim()].filter(Boolean).join(' | ') || undefined,
      subject: newSubject.trim() || undefined,
    });
  };

  const deleteEvent = useMutation({
    mutationFn: (id) => base44.entities.CalendarEvent.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['calendarEvents'] }); },
  });

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  // Pad to start on Sunday
  const startPad = startOfMonth(currentMonth).getDay();

  const getEventsForDay = (day) => events.filter(e => isSameDay(new Date(e.date + 'T12:00:00'), day));

  const selectedEvents = selectedDay ? getEventsForDay(selectedDay) : [];

  return (
    <div className="bg-white rounded-2xl border border-border p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="font-black text-foreground text-sm">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <button onClick={() => setCurrentMonth(new Date())}
            className="text-[10px] font-bold text-primary bg-primary/10 hover:bg-primary/20 px-2 py-0.5 rounded-full transition-colors">
            Today
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() - 1))}
            className="w-7 h-7 rounded-lg hover:bg-secondary flex items-center justify-center transition-colors">
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <button onClick={() => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() + 1))}
            className="w-7 h-7 rounded-lg hover:bg-secondary flex items-center justify-center transition-colors">
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
          <button
            onClick={() => { setSelectedDay(new Date()); setShowAddForm(true); }}
            className="ml-1 w-7 h-7 rounded-lg bg-primary flex items-center justify-center hover:bg-primary/90 transition-colors shadow-sm">
            <Plus className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 mb-1">
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
          <div key={d} className="text-center text-[10px] font-black text-muted-foreground py-1">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: startPad }).map((_, i) => <div key={`pad-${i}`} />)}
        {days.map(day => {
          const dayEvents = getEventsForDay(day);
          const selected = selectedDay && isSameDay(day, selectedDay);
          const today = isToday(day);
          return (
            <button key={day.toISOString()} onClick={() => setSelectedDay(selected ? null : day)}
              className={`relative aspect-square rounded-lg flex flex-col items-center justify-start pt-1 transition-all text-xs font-bold
                ${today ? 'bg-primary text-white' : selected ? 'bg-primary/10 text-primary' : 'hover:bg-secondary text-foreground'}`}>
              {format(day, 'd')}
              {dayEvents.length > 0 && (
                <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                  {dayEvents.slice(0, 3).map((e, i) => (
                    <div key={i} className={`w-1.5 h-1.5 rounded-full ${today ? 'bg-white' : EVENT_COLORS[e.type] || 'bg-primary'}`} />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected day panel */}
      <AnimatePresence>
        {selectedDay && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mt-3 pt-3 border-t border-border">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-black text-foreground">{format(selectedDay, 'EEEE, MMM d')}</p>
              <button onClick={() => setShowAddForm(f => !f)}
                className="flex items-center gap-1 text-xs font-bold text-primary hover:underline">
                <Plus className="w-3 h-3" /> Add Event
              </button>
            </div>

            {showAddForm && (
              <div className="bg-secondary/50 rounded-xl p-3 mb-2 space-y-2">
                <Input value={newTitle} onChange={e => setNewTitle(e.target.value)}
                  placeholder="Event title (required)..." className="h-8 text-xs rounded-lg"
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveEvent(); }} />
                <Input value={newDescription} onChange={e => setNewDescription(e.target.value)}
                  placeholder="Description (optional)..." className="h-8 text-xs rounded-lg" />
                <Input value={newSubject} onChange={e => setNewSubject(e.target.value)}
                  placeholder="Subject (e.g. Math, Science)..." className="h-8 text-xs rounded-lg" />
                <div className="flex gap-1 flex-wrap">
                  {Object.keys(EVENT_COLORS).map(t => (
                    <button key={t} onClick={() => setNewType(t)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize transition-all ${newType === t ? EVENT_COLORS[t] + ' text-white' : 'bg-white border border-border text-muted-foreground'}`}>
                      {t}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 h-7 rounded-lg text-xs font-bold" disabled={addEvent.isPending}
                    onClick={handleSaveEvent}>
                    <Check className="w-3 h-3 mr-1" /> Save
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 rounded-lg" onClick={() => setShowAddForm(false)}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )}

            {selectedEvents.length === 0 && !showAddForm && (
              <p className="text-xs text-muted-foreground">No events — tap "Add Event" to add one</p>
            )}
            {selectedEvents.map(event => (
              <div key={event.id} className="flex items-start gap-2 py-2 border-b border-border/50 last:border-0">
                <div className={`w-2 h-2 rounded-full shrink-0 mt-1 ${EVENT_COLORS[event.type] || 'bg-primary'}`} />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-semibold text-foreground capitalize">{event.title}</span>
                  {event.subject && <p className="text-[10px] text-muted-foreground">{event.subject}</p>}
                  {event.notes && !event.notes.includes(event.subject) && (
                    <p className="text-[10px] text-muted-foreground">{event.notes.split(' | ')[0]}</p>
                  )}
                </div>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white shrink-0 ${EVENT_COLORS[event.type]}`}>{event.type}</span>
                <button onClick={() => deleteEvent.mutate(event.id)} className="text-muted-foreground hover:text-destructive shrink-0">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}