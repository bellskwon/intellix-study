const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// ─── GET /api/users ───────────────────────────────────────────────────────────
// Returns all users (used by leaderboard and friends pages)
// Strips sensitive fields before returning
router.get('/', requireAuth, async (req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { created_date: 'asc' },
    select: {
      id: true,
      email: true,
      full_name: true,
      display_name: true,
      avatar_emoji: true,
      avatar_color: true,
      avatar_image_url: true,
      premium_plan: true,
      created_date: true,
    },
  });
  res.json(users);
});

module.exports = router;
