const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// ─── GET /api/redemptions ─────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  const { created_by } = req.query;
  const where = {};
  if (created_by) where.created_by = created_by;

  const redemptions = await prisma.redemption.findMany({
    where,
    orderBy: { created_date: 'desc' },
  });
  res.json(redemptions);
});

// ─── POST /api/redemptions ────────────────────────────────────────────────────
router.post('/', requireAuth, async (req, res) => {
  const { reward_id, reward_name, points_spent, status, shipping_address } = req.body;

  const redemption = await prisma.redemption.create({
    data: {
      reward_id,
      reward_name,
      points_spent,
      status: status || 'pending',
      shipping_address: shipping_address || null,
      created_by: req.user.email,
    },
  });
  res.status(201).json(redemption);
});

// ─── PUT /api/redemptions/:id ─────────────────────────────────────────────────
router.put('/:id', requireAuth, async (req, res) => {
  const redemption = await prisma.redemption.findUnique({ where: { id: req.params.id } });
  if (!redemption) return res.status(404).json({ message: 'Not found' });
  if (redemption.created_by !== req.user.email) return res.status(403).json({ message: 'Forbidden' });

  const allowed = ['status', 'shipping_address'];
  const data = {};
  for (const key of allowed) {
    if (key in req.body) data[key] = req.body[key];
  }
  const updated = await prisma.redemption.update({ where: { id: req.params.id }, data });
  res.json(updated);
});

module.exports = router;
