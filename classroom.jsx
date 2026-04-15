import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { GraduationCap, Plus, Users, Copy, Trash2, LogOut, BookOpen, Hash, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function Classroom() {
  const queryClient = useQueryClient();
  const [joinCode, setJoinCode] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newGrade, setNewGrade] = useState('');

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });

  const { data: classrooms, isLoading } = useQuery({
    queryKey: ['classrooms'],
    queryFn: () => base44.classroom.list(),
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: () => base44.classroom.create({ name: newName, subject: newSubject, grade_level: newGrade }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classrooms'] });
      toast.success('Classroom created!');
      setShowCreate(false);
      setNewName(''); setNewSubject(''); setNewGrade('');
    },
    onError: (e) => toast.error(e.message),
  });

  const joinMutation = useMutation({
    mutationFn: (code) => base44.classroom.join(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classrooms'] });
      toast.success('Joined classroom!');
      setJoinCode('');
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.classroom.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['classrooms'] }); toast.success('Classroom deleted'); },
    onError: (e) => toast.error(e.message),
  });

  const removeMember = useMutation({
    mutationFn: ({ id, email }) => base44.classroom.removeMember(id, email),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['classrooms'] }); },
    onError: (e) => toast.error(e.message),
  });

  const owned = classrooms?.owned || [];
  const joined = classrooms?.joined || [];

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-8">
      <div>
        <h1 className="text-3xl font-black text-foreground tracking-tight">Classrooms</h1>
        <p className="text-muted-foreground text-sm mt-1.5">
          Create a classroom and share the join code with students, or enter a code to join one.
        </p>
      </div>

      {/* ── Join Classroom ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-border p-5">
        <h2 className="font-black text-sm text-foreground mb-3 flex items-center gap-2">
          <Hash className="w-4 h-4 text-primary" /> Join a Classroom
        </h2>
        <div className="flex gap-2">
          <Input
            placeholder="Enter 6-character join code…"
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            onKeyDown={e => { if (e.key === 'Enter' && joinCode.length === 6) joinMutation.mutate(joinCode); }}
            className="h-11 rounded-xl flex-1 font-mono tracking-widest uppercase"
            maxLength={6}
          />
          <Button
            onClick={() => joinCode.length === 6 && joinMutation.mutate(joinCode)}
            disabled={joinMutation.isPending || joinCode.length !== 6}
            className="rounded-xl font-bold h-11 px-6">
            Join
          </Button>
        </div>
      </div>

      {/* ── My Classrooms (Teacher view) ───────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-black text-sm text-foreground flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-primary" /> My Classrooms ({owned.length})
          </h2>
          <Button size="sm" className="rounded-xl font-bold h-8 px-3 gap-1"
            onClick={() => setShowCreate(s => !s)}>
            <Plus className="w-3.5 h-3.5" /> Create
          </Button>
        </div>

        {/* Inline create form */}
        {showCreate && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="bg-secondary/30 rounded-xl p-4 mb-4 space-y-3">
            <Input
              placeholder="Classroom name *"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="h-10 rounded-xl"
            />
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Subject (e.g. Math)" value={newSubject} onChange={e => setNewSubject(e.target.value)} className="h-10 rounded-xl" />
              <Input placeholder="Grade (e.g. 8th)" value={newGrade} onChange={e => setNewGrade(e.target.value)} className="h-10 rounded-xl" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowCreate(false)} className="flex-1 rounded-xl h-9">Cancel</Button>
              <Button
                onClick={() => newName.trim() && createMutation.mutate()}
                disabled={!newName.trim() || createMutation.isPending}
                className="flex-1 rounded-xl h-9 font-bold">
                {createMutation.isPending ? 'Creating…' : 'Create Classroom'}
              </Button>
            </div>
          </motion.div>
        )}

        {!isLoading && owned.length === 0 && !showCreate ? (
          <div className="text-center py-10">
            <GraduationCap className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="font-bold text-foreground text-sm mb-1">No classrooms yet</p>
            <p className="text-xs text-muted-foreground">Create a classroom and share the join code with your students.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {owned.map((cls, i) => (
              <motion.div key={cls.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="border border-border rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-foreground">{cls.name}</p>
                    {(cls.subject || cls.grade_level) && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {[cls.subject, cls.grade_level].filter(Boolean).join(' · ')}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="text-xs font-mono font-black bg-primary/10 text-primary px-2.5 py-1 rounded-lg tracking-widest">
                        {cls.join_code}
                      </span>
                      <button
                        onClick={() => { navigator.clipboard.writeText(cls.join_code); toast.success('Join code copied!'); }}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        title="Copy join code">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Users className="w-3 h-3" /> {cls.members.length} student{cls.members.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (window.confirm(`Delete "${cls.name}"? This cannot be undone.`))
                        deleteMutation.mutate(cls.id);
                    }}
                    className="text-muted-foreground hover:text-rose-500 transition-colors p-1 shrink-0"
                    title="Delete classroom">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {cls.members.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <p className="text-xs font-bold text-muted-foreground mb-2">Students</p>
                    <div className="space-y-1.5">
                      {cls.members.map(m => (
                        <div key={m.id} className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-black text-primary shrink-0">
                            {m.student_email[0].toUpperCase()}
                          </div>
                          <p className="text-xs text-foreground flex-1 truncate">{m.student_email}</p>
                          <button
                            onClick={() => removeMember.mutate({ id: cls.id, email: m.student_email })}
                            className="text-muted-foreground hover:text-rose-500 transition-colors"
                            title="Remove student">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* ── Enrolled Classrooms (Student view) ─────────────────────────────── */}
      {(joined.length > 0 || isLoading) && (
        <div className="bg-white rounded-2xl border border-border p-5">
          <h2 className="font-black text-sm text-foreground mb-4 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-500" /> Enrolled Classrooms ({joined.length})
          </h2>
          {joined.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Loading…</p>
          ) : (
            <div className="space-y-3">
              {joined.map((cls, i) => (
                <motion.div key={cls.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3 bg-secondary/30 rounded-xl px-4 py-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                    <BookOpen className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-foreground text-sm">{cls.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {cls.teacher_email}{cls.subject ? ` · ${cls.subject}` : ''} · {cls.members.length} student{cls.members.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (window.confirm(`Leave "${cls.name}"?`))
                        removeMember.mutate({ id: cls.id, email: user?.email });
                    }}
                    className="text-muted-foreground hover:text-rose-500 transition-colors p-1 shrink-0"
                    title="Leave classroom">
                    <LogOut className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="text-center py-4 border-t border-border">
        <p className="text-sm text-muted-foreground">
          Questions? <a href="mailto:intellixapp.team@gmail.com" className="text-primary font-semibold hover:underline">intellixapp.team@gmail.com</a>
        </p>
      </div>
    </div>
  );
}
