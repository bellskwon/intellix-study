const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Helper: parse sort string like '-created_date' into Prisma orderBy
function parseSort(sort) {
  if (!sort) return { created_date: 'desc' };
  const desc = sort.startsWith('-');
  const field = desc ? sort.slice(1) : sort;
  return { [field]: desc ? 'desc' : 'asc' };
}

// ─── GET /api/submissions ─────────────────────────────────────────────────────
// Returns submissions filtered by query params.
// ?created_by=email  → only that user's submissions
// (no filter)        → all submissions (used by leaderboard)
router.get('/', requireAuth, async (req, res) => {
  const { created_by, sort, limit } = req.query;
  const where = {};
  if (created_by) where.created_by = created_by;

  const submissions = await prisma.submission.findMany({
    where,
    orderBy: parseSort(sort),
    take: limit ? parseInt(limit) : undefined,
  });
  res.json(submissions);
});

// ─── POST /api/submissions ────────────────────────────────────────────────────
router.post('/', requireAuth, async (req, res) => {
  const {
    title, subject, grade_level, type, file_url, notes_text,
    status, ai_verification_score, ai_difficulty_score,
    quiz_score, quiz_passed, points_awarded, rejection_reason,
    video_hash,
  } = req.body;

  const submission = await prisma.submission.create({
    data: {
      title,
      subject,
      grade_level,
      type: type || 'notes',
      file_url: file_url || null,
      notes_text: notes_text || null,
      status: status || 'pending_review',
      ai_verification_score: ai_verification_score ?? null,
      ai_difficulty_score: ai_difficulty_score ?? null,
      quiz_score: quiz_score ?? null,
      quiz_passed: quiz_passed ?? false,
      points_awarded: points_awarded ?? 0,
      rejection_reason: rejection_reason || null,
      video_hash: video_hash || null,
      created_by: req.user.email,
    },
  });
  res.status(201).json(submission);
});

// ─── PUT /api/submissions/:id ─────────────────────────────────────────────────
router.put('/:id', requireAuth, async (req, res) => {
  const submission = await prisma.submission.findUnique({ where: { id: req.params.id } });
  if (!submission) return res.status(404).json({ message: 'Not found' });
  if (submission.created_by !== req.user.email) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const allowed = [
    'title', 'subject', 'grade_level', 'type', 'file_url', 'notes_text',
    'status', 'ai_verification_score', 'ai_difficulty_score',
    'quiz_score', 'quiz_passed', 'points_awarded', 'rejection_reason',
  ];
  const data = {};
  for (const key of allowed) {
    if (key in req.body) data[key] = req.body[key];
  }

  const updated = await prisma.submission.update({ where: { id: req.params.id }, data });
  res.json(updated);
});

// ─── DELETE /api/submissions/:id ──────────────────────────────────────────────
router.delete('/:id', requireAuth, async (req, res) => {
  const submission = await prisma.submission.findUnique({ where: { id: req.params.id } });
  if (!submission) return res.status(404).json({ message: 'Not found' });
  if (submission.created_by !== req.user.email) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  await prisma.submission.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

module.exports = router;
