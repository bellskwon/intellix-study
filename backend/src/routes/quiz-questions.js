const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// ─── GET /api/quiz-questions?submission_id=xxx ────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  const { submission_id } = req.query;
  const where = {};
  if (submission_id) where.submission_id = submission_id;

  const questions = await prisma.quizQuestion.findMany({
    where,
    orderBy: { question_number: 'asc' },
  });
  res.json(questions);
});

// ─── POST /api/quiz-questions/bulk ───────────────────────────────────────────
router.post('/bulk', requireAuth, async (req, res) => {
  const { items } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'items array is required' });
  }

  const data = items.map((q, i) => ({
    submission_id: q.submission_id,
    question_number: q.question_number ?? i + 1,
    question_text: q.question_text,
    question_type: q.question_type,
    options: q.options || [],
    correct_answer: q.correct_answer,
    student_answer: q.student_answer || null,
    is_correct: q.is_correct ?? null,
    hint: q.hint || null,
  }));

  await prisma.quizQuestion.createMany({ data });
  res.status(201).json({ created: data.length });
});

// ─── POST /api/quiz-questions ─────────────────────────────────────────────────
router.post('/', requireAuth, async (req, res) => {
  const { submission_id, question_number, question_text, question_type,
    options, correct_answer, student_answer, is_correct, hint } = req.body;

  const question = await prisma.quizQuestion.create({
    data: {
      submission_id, question_number, question_text, question_type,
      options: options || [],
      correct_answer,
      student_answer: student_answer || null,
      is_correct: is_correct ?? null,
      hint: hint || null,
    },
  });
  res.status(201).json(question);
});

// ─── PUT /api/quiz-questions/:id ──────────────────────────────────────────────
router.put('/:id', requireAuth, async (req, res) => {
  const allowed = ['student_answer', 'is_correct', 'question_text', 'correct_answer', 'hint'];
  const data = {};
  for (const key of allowed) {
    if (key in req.body) data[key] = req.body[key];
  }
  const updated = await prisma.quizQuestion.update({ where: { id: req.params.id }, data });
  res.json(updated);
});

module.exports = router;
