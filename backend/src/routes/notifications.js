const express = require('express');
const nodemailer = require('nodemailer');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// ─── SMTP (reuse same config as orders/moderation) ────────────────────────────
const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST || 'smtp.gmail.com',
  port:   Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: { user: process.env.SMTP_USER || '', pass: process.env.SMTP_PASS || '' },
});

const emailConfigured = () => !!(process.env.SMTP_USER && process.env.SMTP_PASS);

// ─── GET /api/notifications/comeback-check ────────────────────────────────────
// Called when the dashboard loads. If the user has been away for 3+ days and
// hasn't received a comeback bonus in the last 7 days, award 15 bonus points.
router.get('/comeback-check', requireAuth, async (req, res) => {
  const email = req.user.email;

  const now = new Date();
  const threeDaysAgo = new Date(now); threeDaysAgo.setDate(now.getDate() - 3);
  const sevenDaysAgo = new Date(now); sevenDaysAgo.setDate(now.getDate() - 7);

  // Check for a recent comeback bonus (avoid double-awarding)
  const recentBonus = await prisma.submission.findFirst({
    where: { created_by: email, type: 'comeback_bonus', created_date: { gte: sevenDaysAgo } },
  });
  if (recentBonus) return res.json({ bonus: false });

  // Get the user's last real study submission
  const lastReal = await prisma.submission.findFirst({
    where: {
      created_by: email,
      // Exclude system-generated records — only real study activity counts
      type: { notIn: ['comeback_bonus', 'referral', 'points_pack'] },
    },
    orderBy: { created_date: 'desc' },
  });
  if (!lastReal) return res.json({ bonus: false });

  const lastDate = new Date(lastReal.created_date);
  if (lastDate >= threeDaysAgo) return res.json({ bonus: false });

  // Award the bonus
  await prisma.submission.create({
    data: {
      title:          'Welcome Back! Comeback Bonus',
      subject:        'other',
      grade_level:    'n/a',
      type:           'comeback_bonus',
      status:         'approved',
      points_awarded: 15,
      quiz_passed:    false,
      created_by:     email,
    },
  });

  res.json({ bonus: true, points: 15 });
});

// ─── POST /api/notifications/weekly-digest ────────────────────────────────────
// Admin-only endpoint (requires X-Admin-Secret header or ?secret= query param).
// Sends each active user a personalised weekly progress summary email.
// Trigger manually or via a Vercel cron: https://vercel.com/docs/cron-jobs
router.post('/weekly-digest', async (req, res) => {
  const secret = req.headers['x-admin-secret'] || req.query.secret;
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  if (!emailConfigured()) {
    return res.status(503).json({ message: 'SMTP not configured — set SMTP_USER and SMTP_PASS in .env' });
  }

  const frontendUrl = process.env.FRONTEND_URL || 'https://intellix.app';
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);

  // Load all non-paused users with their last 7 days of submissions
  const users = await prisma.user.findMany({
    where: { account_paused: false },
    include: {
      submissions: {
        where: { created_date: { gte: weekAgo } },
        orderBy: { created_date: 'desc' },
      },
    },
  });

  let sent = 0;
  const errors = [];

  for (const user of users) {
    const weeklySubs = user.submissions;
    if (weeklySubs.length === 0) continue; // only email active users

    const graded   = weeklySubs.filter(s => s.quiz_score != null);
    const passed   = weeklySubs.filter(s => s.quiz_passed).length;
    const pts      = weeklySubs.filter(s => s.status === 'approved').reduce((a, s) => a + (s.points_awarded || 0), 0);
    const avgScore = graded.length ? Math.round(graded.reduce((a, s) => a + s.quiz_score, 0) / graded.length) : null;
    const name     = user.display_name || user.full_name || 'Student';

    const subjectsSet = [...new Set(weeklySubs.map(s => s.subject).filter(Boolean))];

    try {
      await transporter.sendMail({
        from: `"Intellix" <${process.env.SMTP_USER}>`,
        to: user.email,
        subject: `Your week on Intellix — ${weeklySubs.length} quiz${weeklySubs.length !== 1 ? 'zes' : ''} completed!`,
        html: `
          <div style="font-family:-apple-system,sans-serif;max-width:520px;margin:0 auto;padding:24px;background:#fafafa;border-radius:16px;">
            <div style="background:linear-gradient(135deg,#7c3aed,#ec4899);border-radius:12px;padding:28px;text-align:center;color:white;margin-bottom:24px;">
              <p style="margin:0 0 4px;font-size:12px;opacity:.8;text-transform:uppercase;letter-spacing:2px;">Weekly Summary</p>
              <h1 style="margin:0;font-size:24px;font-weight:900;">Hey, ${name}! 🎓</h1>
              <p style="margin:8px 0 0;opacity:.85;font-size:14px;">Here's what you accomplished this week.</p>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:24px;">
              ${[
                { label: 'Quizzes', value: weeklySubs.length, color: '#7c3aed' },
                { label: 'Passed', value: passed, color: '#10b981' },
                { label: 'Points Earned', value: `+${pts}`, color: '#f59e0b' },
              ].map(s => `
                <div style="background:white;border-radius:12px;padding:16px;text-align:center;border:1px solid #e5e7eb;">
                  <p style="margin:0;font-size:22px;font-weight:900;color:${s.color};">${s.value}</p>
                  <p style="margin:4px 0 0;font-size:11px;color:#6b7280;">${s.label}</p>
                </div>`).join('')}
            </div>

            ${avgScore != null ? `
            <div style="background:white;border-radius:12px;padding:16px;border:1px solid #e5e7eb;margin-bottom:16px;">
              <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">Average Score</p>
              <p style="margin:0;font-size:28px;font-weight:900;color:${avgScore >= 80 ? '#10b981' : avgScore >= 60 ? '#f59e0b' : '#ef4444'};">${avgScore}%</p>
              <p style="margin:4px 0 0;font-size:12px;color:#9ca3af;">${avgScore >= 80 ? '🔥 Great week! You\'re crushing it.' : avgScore >= 60 ? '📈 Solid effort — keep pushing!' : '💪 Keep going — consistency is the key.'}</p>
            </div>` : ''}

            ${subjectsSet.length > 0 ? `
            <div style="background:white;border-radius:12px;padding:16px;border:1px solid #e5e7eb;margin-bottom:24px;">
              <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">Subjects Studied</p>
              <div style="display:flex;gap:8px;flex-wrap:wrap;">
                ${subjectsSet.map(s => `<span style="background:#f3f4f6;border-radius:99px;padding:4px 12px;font-size:12px;font-weight:600;color:#374151;text-transform:capitalize;">${s.replace(/_/g,' ')}</span>`).join('')}
              </div>
            </div>` : ''}

            <a href="${frontendUrl}" style="display:block;background:linear-gradient(135deg,#7c3aed,#a855f7);color:white;text-align:center;padding:16px;border-radius:12px;font-weight:900;font-size:15px;text-decoration:none;margin-bottom:16px;">
              Keep Studying →
            </a>
            <p style="text-align:center;font-size:11px;color:#9ca3af;margin:0;">
              You're receiving this because you have an Intellix account.<br>
              Questions? <a href="mailto:intellixapp.team@gmail.com" style="color:#7c3aed;">intellixapp.team@gmail.com</a>
            </p>
          </div>
        `,
      });
      sent++;
    } catch (err) {
      errors.push({ email: user.email, error: err.message });
    }
  }

  res.json({ sent, skipped: users.length - sent, errors: errors.length ? errors : undefined });
});

module.exports = router;
