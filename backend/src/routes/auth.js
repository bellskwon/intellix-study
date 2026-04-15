const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// ─── EDIT THIS to change how many points a user earns when someone signs up ──
// using their referral link. Set to 0 to disable referral bonuses entirely.
const REFERRAL_BONUS_POINTS = 200;
// ─────────────────────────────────────────────────────────────────────────────

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

    // Award bonus points to the referrer if a valid referral code was used
    if (referredBy && REFERRAL_BONUS_POINTS > 0) {
      const referrer = await prisma.user.findUnique({
        where: { referral_code: referredBy },
      });
      if (referrer && referrer.email !== email) {
        await prisma.submission.create({
          data: {
            title:          `Referral Bonus — ${email} joined with your link`,
            subject:        'other',
            grade_level:    'n/a',
            type:           'referral',
            status:         'approved',
            points_awarded: REFERRAL_BONUS_POINTS,
            quiz_passed:    false,
            created_by:     referrer.email,
          },
        });
      }
    }
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
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  let returnUrl = frontendUrl;

  // Validate return_url to prevent open-redirect attacks — only allow same origin
  try {
    const allowed = new URL(frontendUrl);
    const requested = new URL(req.query.return_url || frontendUrl);
    if (requested.origin === allowed.origin) returnUrl = requested.toString();
  } catch { /* bad URL — fall back to frontendUrl */ }

  res.redirect(returnUrl);
});

// ─── GET /api/auth/shared/:shareCode ─────────────────────────────────────────
// Public — no auth required. Returns limited read-only stats for a user.
// shareCode = the user's referral_code (already unique + random).
router.get('/shared/:shareCode', async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { referral_code: req.params.shareCode },
    select: {
      display_name: true, full_name: true,
      avatar_emoji: true, avatar_color: true,
      created_date: true,
      submissions: {
        select: { quiz_score: true, quiz_passed: true, points_awarded: true, subject: true, created_date: true, status: true },
      },
    },
  });

  if (!user) return res.status(404).json({ message: 'Profile not found' });

  const subs = user.submissions;
  const graded = subs.filter(s => s.quiz_score != null);
  const passed = subs.filter(s => s.quiz_passed);
  const totalPoints = subs.filter(s => s.status === 'approved').reduce((a, s) => a + (s.points_awarded || 0), 0);
  const avgScore = graded.length ? Math.round(graded.reduce((a, s) => a + s.quiz_score, 0) / graded.length) : null;

  res.json({
    display_name: user.display_name || user.full_name || 'Student',
    avatar_emoji: user.avatar_emoji || '🎓',
    avatar_color: user.avatar_color || '#7c3aed',
    member_since: user.created_date,
    total_quizzes: graded.length,
    passed_quizzes: passed.length,
    avg_score: avgScore,
    total_points: totalPoints,
    subjects_studied: [...new Set(subs.map(s => s.subject).filter(Boolean))],
    recent_activity: graded.slice(-5).reverse().map(s => ({
      subject: s.subject, score: s.quiz_score, passed: s.quiz_passed, date: s.created_date,
    })),
  });
});

module.exports = router;
