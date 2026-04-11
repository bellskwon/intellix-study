const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function parseSort(sort) {
  if (!sort) return { created_date: 'desc' };
  const desc = sort.startsWith('-');
  const field = desc ? sort.slice(1) : sort;
  return { [field]: desc ? 'desc' : 'asc' };
}

// ─── GET /api/study-cards ─────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  const { created_by, sort, limit } = req.query;
  const where = {};
  if (created_by) where.created_by = created_by;

  const cards = await prisma.studyCard.findMany({
    where,
    orderBy: parseSort(sort),
    take: limit ? parseInt(limit) : undefined,
  });
  res.json(cards);
});

// ─── POST /api/study-cards/bulk ───────────────────────────────────────────────
router.post('/bulk', requireAuth, async (req, res) => {
  const { items } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'items array is required' });
  }

  const data = items.map(({ deck_name, subject, front, back, is_language_card, mastery_level }) => ({
    deck_name,
    subject,
    front,
    back,
    is_language_card: is_language_card ?? false,
    mastery_level: mastery_level ?? 0,
    created_by: req.user.email,
  }));

  await prisma.studyCard.createMany({ data });
  res.status(201).json({ created: data.length });
});

// ─── POST /api/study-cards ────────────────────────────────────────────────────
router.post('/', requireAuth, async (req, res) => {
  const { deck_name, subject, front, back, is_language_card, mastery_level } = req.body;
  const card = await prisma.studyCard.create({
    data: {
      deck_name, subject, front, back,
      is_language_card: is_language_card ?? false,
      mastery_level: mastery_level ?? 0,
      created_by: req.user.email,
    },
  });
  res.status(201).json(card);
});

// ─── PUT /api/study-cards/:id ─────────────────────────────────────────────────
router.put('/:id', requireAuth, async (req, res) => {
  const card = await prisma.studyCard.findUnique({ where: { id: req.params.id } });
  if (!card) return res.status(404).json({ message: 'Not found' });
  if (card.created_by !== req.user.email) return res.status(403).json({ message: 'Forbidden' });

  const allowed = ['deck_name', 'subject', 'front', 'back', 'is_language_card', 'mastery_level'];
  const data = {};
  for (const key of allowed) {
    if (key in req.body) data[key] = req.body[key];
  }

  const updated = await prisma.studyCard.update({ where: { id: req.params.id }, data });
  res.json(updated);
});

// ─── DELETE /api/study-cards/:id ─────────────────────────────────────────────
router.delete('/:id', requireAuth, async (req, res) => {
  const card = await prisma.studyCard.findUnique({ where: { id: req.params.id } });
  if (!card) return res.status(404).json({ message: 'Not found' });
  if (card.created_by !== req.user.email) return res.status(403).json({ message: 'Forbidden' });
  await prisma.studyCard.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

module.exports = router;
