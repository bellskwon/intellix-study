const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// ─── GET /api/calendar-events ─────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  const events = await prisma.calendarEvent.findMany({
    where: { created_by: req.user.email },
    orderBy: { date: 'asc' },
  });
  res.json(events);
});

// ─── POST /api/calendar-events ────────────────────────────────────────────────
router.post('/', requireAuth, async (req, res) => {
  const { title, date, type, subject, notes } = req.body;
  const event = await prisma.calendarEvent.create({
    data: {
      title,
      date,
      type: type || 'other',
      subject: subject || null,
      notes: notes || null,
      created_by: req.user.email,
    },
  });
  res.status(201).json(event);
});

// ─── PUT /api/calendar-events/:id ────────────────────────────────────────────
router.put('/:id', requireAuth, async (req, res) => {
  const event = await prisma.calendarEvent.findUnique({ where: { id: req.params.id } });
  if (!event) return res.status(404).json({ message: 'Not found' });
  if (event.created_by !== req.user.email) return res.status(403).json({ message: 'Forbidden' });

  const allowed = ['title', 'date', 'type', 'subject', 'notes'];
  const data = {};
  for (const key of allowed) {
    if (key in req.body) data[key] = req.body[key];
  }
  const updated = await prisma.calendarEvent.update({ where: { id: req.params.id }, data });
  res.json(updated);
});

// ─── DELETE /api/calendar-events/:id ─────────────────────────────────────────
router.delete('/:id', requireAuth, async (req, res) => {
  const event = await prisma.calendarEvent.findUnique({ where: { id: req.params.id } });
  if (!event) return res.status(404).json({ message: 'Not found' });
  if (event.created_by !== req.user.email) return res.status(403).json({ message: 'Forbidden' });
  await prisma.calendarEvent.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

module.exports = router;
