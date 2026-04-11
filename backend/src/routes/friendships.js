const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// ─── GET /api/friendships ─────────────────────────────────────────────────────
// Returns all friendships where the current user is requester or recipient
router.get('/', requireAuth, async (req, res) => {
  const email = req.user.email;
  const friendships = await prisma.friendship.findMany({
    where: {
      OR: [{ requester_email: email }, { recipient_email: email }],
    },
    orderBy: { created_date: 'desc' },
    take: req.query.limit ? parseInt(req.query.limit) : 100,
  });
  res.json(friendships);
});

// ─── POST /api/friendships ────────────────────────────────────────────────────
router.post('/', requireAuth, async (req, res) => {
  const { requester_email, recipient_email } = req.body;

  // Verify the requester is the authenticated user
  if (requester_email !== req.user.email) {
    return res.status(403).json({ message: 'Cannot send requests as another user' });
  }
  if (requester_email === recipient_email) {
    return res.status(400).json({ message: "You can't add yourself!" });
  }

  // Check if the recipient exists
  const recipient = await prisma.user.findUnique({ where: { email: recipient_email } });
  if (!recipient) {
    return res.status(404).json({ message: 'No Intellix account found with that email' });
  }

  // Check for existing friendship
  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requester_email, recipient_email },
        { requester_email: recipient_email, recipient_email: requester_email },
      ],
    },
  });
  if (existing) {
    return res.status(409).json({ message: 'Friend request already exists' });
  }

  const friendship = await prisma.friendship.create({
    data: { requester_email, recipient_email, status: 'pending' },
  });
  res.status(201).json(friendship);
});

// ─── PUT /api/friendships/:id ─────────────────────────────────────────────────
router.put('/:id', requireAuth, async (req, res) => {
  const friendship = await prisma.friendship.findUnique({ where: { id: req.params.id } });
  if (!friendship) return res.status(404).json({ message: 'Not found' });

  // Only the recipient can accept/decline
  if (friendship.recipient_email !== req.user.email) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const { status } = req.body;
  if (!['accepted', 'declined'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }

  const updated = await prisma.friendship.update({
    where: { id: req.params.id },
    data: { status },
  });
  res.json(updated);
});

module.exports = router;
