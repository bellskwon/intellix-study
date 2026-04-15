const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function makeJoinCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// ─── GET /api/classroom ───────────────────────────────────────────────────────
// Returns { owned: Classroom[], joined: Classroom[] }
router.get('/', requireAuth, async (req, res) => {
  const email = req.user.email;
  const [owned, memberships] = await Promise.all([
    prisma.classroom.findMany({
      where: { teacher_email: email },
      include: { members: true },
      orderBy: { created_date: 'desc' },
    }),
    prisma.classMembership.findMany({
      where: { student_email: email },
      include: {
        classroom: { include: { members: true } },
      },
      orderBy: { joined_date: 'desc' },
    }),
  ]);

  res.json({
    owned,
    joined: memberships.map(m => m.classroom),
  });
});

// ─── POST /api/classroom ──────────────────────────────────────────────────────
router.post('/', requireAuth, async (req, res) => {
  const { name, subject, grade_level } = req.body;
  if (!name?.trim()) return res.status(400).json({ message: 'Classroom name is required.' });

  // Mark user as teacher
  await prisma.user.update({ where: { id: req.user.id }, data: { is_teacher: true } });

  const classroom = await prisma.classroom.create({
    data: {
      name:         name.trim(),
      subject:      subject?.trim() || null,
      grade_level:  grade_level?.trim() || null,
      join_code:    makeJoinCode(),
      teacher_email: req.user.email,
    },
    include: { members: true },
  });

  res.json(classroom);
});

// ─── POST /api/classroom/join ─────────────────────────────────────────────────
router.post('/join', requireAuth, async (req, res) => {
  const { join_code } = req.body;
  if (!join_code) return res.status(400).json({ message: 'Join code is required.' });

  const classroom = await prisma.classroom.findUnique({
    where: { join_code: join_code.trim().toUpperCase() },
  });
  if (!classroom) return res.status(404).json({ message: 'Classroom not found. Check the join code and try again.' });
  if (classroom.teacher_email === req.user.email) {
    return res.status(400).json({ message: "You can't join your own classroom as a student." });
  }

  const existing = await prisma.classMembership.findUnique({
    where: {
      classroom_id_student_email: { classroom_id: classroom.id, student_email: req.user.email },
    },
  });
  if (existing) return res.status(400).json({ message: 'You are already in this classroom.' });

  await prisma.classMembership.create({
    data: { classroom_id: classroom.id, student_email: req.user.email },
  });

  const updated = await prisma.classroom.findUnique({
    where: { id: classroom.id },
    include: { members: true },
  });
  res.json(updated);
});

// ─── GET /api/classroom/:id ───────────────────────────────────────────────────
router.get('/:id', requireAuth, async (req, res) => {
  const classroom = await prisma.classroom.findUnique({
    where: { id: req.params.id },
    include: { members: true },
  });
  if (!classroom) return res.status(404).json({ message: 'Classroom not found.' });

  const isMember =
    classroom.teacher_email === req.user.email ||
    classroom.members.some(m => m.student_email === req.user.email);
  if (!isMember) return res.status(403).json({ message: 'Access denied.' });

  res.json(classroom);
});

// ─── DELETE /api/classroom/:id ────────────────────────────────────────────────
router.delete('/:id', requireAuth, async (req, res) => {
  const classroom = await prisma.classroom.findUnique({ where: { id: req.params.id } });
  if (!classroom) return res.status(404).json({ message: 'Not found.' });
  if (classroom.teacher_email !== req.user.email) {
    return res.status(403).json({ message: 'Only the teacher can delete this classroom.' });
  }
  await prisma.classroom.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

// ─── DELETE /api/classroom/:id/members/:email ─────────────────────────────────
// Teacher can remove any student; students can remove themselves (leave)
router.delete('/:id/members/:email', requireAuth, async (req, res) => {
  const { id, email: targetEmail } = req.params;
  const classroom = await prisma.classroom.findUnique({ where: { id } });
  if (!classroom) return res.status(404).json({ message: 'Not found.' });

  const isTeacher = classroom.teacher_email === req.user.email;
  const isSelf = req.user.email === decodeURIComponent(targetEmail);
  if (!isTeacher && !isSelf) return res.status(403).json({ message: 'Access denied.' });

  await prisma.classMembership.deleteMany({
    where: { classroom_id: id, student_email: decodeURIComponent(targetEmail) },
  });
  res.json({ success: true });
});

module.exports = router;
