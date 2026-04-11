const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const oauthClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/auth/callback`
);

function makeReferralCode(email) {
  return email.split('@')[0].replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 12) +
    Math.floor(Math.random() * 1000);
}

function issueJWT(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '30d' });
}

// ─── GET /api/auth/google ────────────────────────────────────────────────────
// Redirect the browser to Google's consent screen
router.get('/google', (req, res) => {
  const returnUrl = req.query.return_url || process.env.FRONTEND_URL;
  const state = Buffer.from(JSON.stringify({ returnUrl })).toString('base64');

  const url = oauthClient.generateAuthUrl({
    access_type: 'offline',
    scope: ['openid', 'email', 'profile'],
    state,
  });
  res.redirect(url);
});

// ─── GET /api/auth/callback ──────────────────────────────────────────────────
// Google redirects here after the user grants permission
router.get('/callback', async (req, res) => {
  const { code, state } = req.query;
  if (!code) return res.status(400).send('Missing authorization code');

  let returnUrl = process.env.FRONTEND_URL;
  try {
    const parsed = JSON.parse(Buffer.from(state, 'base64').toString());
    returnUrl = parsed.returnUrl || returnUrl;
  } catch {}

  // Exchange code for tokens
  const { tokens } = await oauthClient.getToken(code);
  oauthClient.setCredentials(tokens);

  // Decode the ID token to get the user's profile
  const ticket = await oauthClient.verifyIdToken({
    idToken: tokens.id_token,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const profile = ticket.getPayload();
  const { sub: googleId, email, name, given_name } = profile;

  // Upsert the user in the database
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    // Check if there's a referral code in the return URL
    let referredBy = null;
    try {
      const urlObj = new URL(returnUrl);
      const ref = urlObj.searchParams.get('ref');
      if (ref) referredBy = ref;
    } catch {}

    user = await prisma.user.create({
      data: {
        email,
        full_name: name || given_name || email.split('@')[0],
        google_id: googleId,
        referral_code: makeReferralCode(email),
        referred_by: referredBy,
        premium_plan: 'free',
      },
    });
  } else if (!user.google_id) {
    user = await prisma.user.update({
      where: { email },
      data: { google_id: googleId, full_name: user.full_name || name },
    });
  }

  const token = issueJWT(user.id);

  // Redirect back to the frontend with the token in the URL
  // app-params.js on the frontend will read ?access_token= and store it
  const redirectUrl = new URL(returnUrl);
  redirectUrl.searchParams.set('access_token', token);
  res.redirect(redirectUrl.toString());
});

// ─── GET /api/auth/me ────────────────────────────────────────────────────────
router.get('/me', requireAuth, async (req, res) => {
  // Compute streak: count consecutive days (ending today) that have a submission
  const submissions = await prisma.submission.findMany({
    where: { created_by: req.user.email },
    select: { created_date: true },
    orderBy: { created_date: 'desc' },
  });

  let streak = 0;
  if (submissions.length > 0) {
    // Collect unique calendar days (UTC) with activity
    const days = new Set(
      submissions.map(s => new Date(s.created_date).toISOString().slice(0, 10))
    );

    const today = new Date();
    const pad = (d) => d.toISOString().slice(0, 10);

    // Walk backwards from today; if today has no activity, check yesterday first
    let cursor = new Date(today);
    // Start from today; if today has no activity start counting from yesterday
    if (!days.has(pad(cursor))) {
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }
    while (days.has(pad(cursor))) {
      streak++;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }
  }

  res.json({ ...req.user, streak_count: streak });
});

// ─── PUT /api/auth/me ────────────────────────────────────────────────────────
router.put('/me', requireAuth, async (req, res) => {
  const allowed = [
    'display_name', 'avatar_emoji', 'avatar_color', 'avatar_image_url',
    'premium_plan', 'trial_end_date',
  ];
  const data = {};
  for (const key of allowed) {
    if (key in req.body) data[key] = req.body[key];
  }
  const updated = await prisma.user.update({ where: { id: req.user.id }, data });
  res.json(updated);
});

// ─── GET /api/auth/logout ────────────────────────────────────────────────────
router.get('/logout', (req, res) => {
  const returnUrl = req.query.return_url || process.env.FRONTEND_URL;
  res.redirect(returnUrl);
});

module.exports = router;
