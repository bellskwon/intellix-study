const express = require('express');
const nodemailer = require('nodemailer');
const prisma = require('../lib/prisma');
const { invokeLLM } = require('../lib/claude');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// ─── EDIT THIS to set where moderation/appeal emails are sent ────────────────
const ADMIN_MODERATION_EMAIL = '';
// ─────────────────────────────────────────────────────────────────────────────

// Pause account after this many violations (1-indexed)
// e.g. 4 = three warnings, final ultimatum, then paused on 4th
const PAUSE_AFTER_WARNINGS = 4;

// ─── Nodemailer transport (shared with orders.js) ─────────────────────────────
function makeTransport() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

async function sendEmail({ to, subject, html }) {
  if (!to) { console.log('[moderation] No admin email set — skipping email send.'); return; }
  const transport = makeTransport();
  if (!transport) { console.log('[moderation] SMTP not configured — skipping email send.'); return; }
  await transport.sendMail({ from: process.env.SMTP_USER, to, subject, html });
}

// ─── POST /api/moderation/check ───────────────────────────────────────────────
// Call this before saving a submission.
// Body: { title, text, file_url, subject }
// Returns: { flagged, reason, warnings, isFinal, accountPaused, logId }
router.post('/check', requireAuth, async (req, res) => {
  const { title = '', text = '', file_url, subject = '' } = req.body;

  // Build the content string for analysis
  const contentPreview = [title, text].filter(Boolean).join('\n').slice(0, 4000);

  const result = await invokeLLM({
    prompt: `You are a content moderator for Intellix, an educational platform for students (grades 6–college).

Review the following student-submitted study material.

Title: "${title}"
Subject: ${subject}
Content:
${contentPreview || '(no text — image/file upload)'}

BLOCK this content (flagged = true) if it:
- Contains hate speech, slurs, or derogatory language targeting any demographic group (race, gender, sexuality, religion, nationality, disability, etc.)
- Promotes, glorifies, defends, or justifies discrimination, homophobia, racism, sexism, antisemitism, or any form of bigotry
- Argues that historical or ongoing discrimination against any group was justified or beneficial
- Contains graphic violence, explicit sexual content, or material clearly inappropriate for a school setting

DO NOT BLOCK (flagged = false) if it:
- Describes historical discrimination, atrocities, or injustice in a neutral or academic context (e.g., the Holocaust, slavery, Jim Crow, apartheid, colonialism)
- Analyzes or critiques discriminatory ideologies from an educational perspective
- Covers sensitive historical topics that are standard curriculum content
- Is completely unrelated to any of the above — normal academic notes

Return ONLY valid JSON: { "flagged": boolean, "reason": string }
If flagged=true, reason should be a brief, student-facing explanation (no slurs). If flagged=false, reason = "".`,
    fileUrls: file_url ? [file_url] : [],
    responseJsonSchema: {
      type: 'object',
      properties: {
        flagged: { type: 'boolean' },
        reason: { type: 'string' },
      },
    },
  });

  // Content is clean
  if (!result.flagged) {
    return res.json({ flagged: false });
  }

  // ── Content is flagged — record it and escalate ──────────────────────────
  const newWarningCount = req.user.moderation_warnings + 1;
  const willPause = newWarningCount >= PAUSE_AFTER_WARNINGS;
  const isFinal = newWarningCount === PAUSE_AFTER_WARNINGS - 1; // 3rd offense = final warning

  // Save the log entry
  const log = await prisma.moderationLog.create({
    data: {
      user_email:    req.user.email,
      content_title: title || null,
      content_text:  text ? text.slice(0, 2000) : null,
      file_url:      file_url || null,
      subject:       subject || null,
      reason:        result.reason || 'Inappropriate content',
      warning_number: newWarningCount,
    },
  });

  // Update warning count (and pause if threshold reached)
  await prisma.user.update({
    where: { id: req.user.id },
    data: {
      moderation_warnings: newWarningCount,
      ...(willPause ? { account_paused: true } : {}),
    },
  });

  // If pausing — send admin email with full history
  if (willPause) {
    const allLogs = await prisma.moderationLog.findMany({
      where: { user_email: req.user.email },
      orderBy: { created_date: 'asc' },
    });

    const logRows = allLogs.map(l => `
      <tr>
        <td style="padding:6px 10px;border-bottom:1px solid #eee">${new Date(l.created_date).toLocaleDateString()}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee">${l.content_title || '—'}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee">${l.subject || '—'}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee">${l.reason}</td>
        ${l.file_url ? `<td style="padding:6px 10px;border-bottom:1px solid #eee"><a href="${l.file_url}">View file</a></td>` : '<td style="padding:6px 10px;border-bottom:1px solid #eee">—</td>'}
      </tr>`).join('');

    const reinstateUrl = `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/moderation/reinstate?token=${process.env.ADMIN_SECRET || ''}&email=${encodeURIComponent(req.user.email)}`;

    await sendEmail({
      to: ADMIN_MODERATION_EMAIL,
      subject: `[Intellix] Account Paused — ${req.user.full_name || req.user.email}`,
      html: `
        <h2 style="color:#7c3aed">Intellix — Account Paused</h2>
        <p>The following account has been automatically paused after ${PAUSE_AFTER_WARNINGS} content violations.</p>
        <table style="border-collapse:collapse;width:100%;margin-bottom:16px">
          <tr><td style="padding:4px 10px;font-weight:bold">User</td><td style="padding:4px 10px">${req.user.full_name || 'N/A'}</td></tr>
          <tr><td style="padding:4px 10px;font-weight:bold">Email</td><td style="padding:4px 10px">${req.user.email}</td></tr>
          <tr><td style="padding:4px 10px;font-weight:bold">Joined</td><td style="padding:4px 10px">${new Date(req.user.created_date).toLocaleDateString()}</td></tr>
        </table>
        <h3 style="color:#374151">Violation History</h3>
        <table style="border-collapse:collapse;width:100%;font-size:13px">
          <thead><tr style="background:#f3f4f6">
            <th style="padding:6px 10px;text-align:left">Date</th>
            <th style="padding:6px 10px;text-align:left">Title</th>
            <th style="padding:6px 10px;text-align:left">Subject</th>
            <th style="padding:6px 10px;text-align:left">Reason</th>
            <th style="padding:6px 10px;text-align:left">File</th>
          </tr></thead>
          <tbody>${logRows}</tbody>
        </table>
        <p style="margin-top:24px">
          <a href="${reinstateUrl}" style="background:#7c3aed;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:bold">
            Reinstate This Account
          </a>
        </p>
        <p style="font-size:12px;color:#9ca3af;margin-top:8px">Clicking reinstate will immediately restore full access.</p>
      `,
    });
  }

  return res.json({
    flagged: true,
    reason: result.reason || 'Your content contains material that violates our community guidelines.',
    warnings: newWarningCount,
    isFinal,
    accountPaused: willPause,
    logId: log.id,
  });
});

// ─── POST /api/moderation/appeal ─────────────────────────────────────────────
// Body: { logId, message }
// Sends an appeal email to admin even if account is paused.
router.post('/appeal', async (req, res) => {
  // Allow paused accounts — verify token manually here
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ message: 'Authentication required' });
  const jwt = require('jsonwebtoken');
  let payload;
  try { payload = jwt.verify(header.slice(7), process.env.JWT_SECRET); } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) return res.status(401).json({ message: 'User not found' });

  const { logId, message = '' } = req.body;
  if (!logId) return res.status(400).json({ message: 'logId is required' });

  const log = await prisma.moderationLog.findUnique({ where: { id: logId } });
  if (!log || log.user_email !== user.email) {
    return res.status(404).json({ message: 'Log entry not found' });
  }

  await prisma.moderationLog.update({ where: { id: logId }, data: { appealed: true } });

  await sendEmail({
    to: ADMIN_MODERATION_EMAIL,
    subject: `[Intellix] Content Moderation Appeal — ${user.full_name || user.email}`,
    html: `
      <h2 style="color:#7c3aed">Intellix — Moderation Appeal</h2>
      <p>A user is contesting a moderation decision.</p>
      <table style="border-collapse:collapse;width:100%;margin-bottom:16px">
        <tr><td style="padding:4px 10px;font-weight:bold">User</td><td style="padding:4px 10px">${user.full_name || 'N/A'}</td></tr>
        <tr><td style="padding:4px 10px;font-weight:bold">Email</td><td style="padding:4px 10px">${user.email}</td></tr>
        <tr><td style="padding:4px 10px;font-weight:bold">Account paused?</td><td style="padding:4px 10px">${user.account_paused ? 'Yes' : 'No'}</td></tr>
        <tr><td style="padding:4px 10px;font-weight:bold">Warning #</td><td style="padding:4px 10px">${log.warning_number}</td></tr>
      </table>
      <h3 style="color:#374151">Flagged Content</h3>
      <table style="border-collapse:collapse;width:100%;font-size:13px;margin-bottom:16px">
        <tr><td style="padding:4px 10px;font-weight:bold">Title</td><td style="padding:4px 10px">${log.content_title || '—'}</td></tr>
        <tr><td style="padding:4px 10px;font-weight:bold">Subject</td><td style="padding:4px 10px">${log.subject || '—'}</td></tr>
        <tr><td style="padding:4px 10px;font-weight:bold">Reason flagged</td><td style="padding:4px 10px">${log.reason}</td></tr>
        ${log.file_url ? `<tr><td style="padding:4px 10px;font-weight:bold">File</td><td style="padding:4px 10px"><a href="${log.file_url}">View uploaded file</a></td></tr>` : ''}
        ${log.content_text ? `<tr><td style="padding:4px 10px;font-weight:bold;vertical-align:top">Content</td><td style="padding:4px 10px;white-space:pre-wrap;font-family:monospace;font-size:12px">${log.content_text.slice(0, 1000)}</td></tr>` : ''}
      </table>
      <h3 style="color:#374151">User's Message</h3>
      <p style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px;font-family:monospace;font-size:13px;white-space:pre-wrap">${message || '(No message provided)'}</p>
      ${user.account_paused ? `
      <p style="margin-top:24px">
        <a href="${process.env.BACKEND_URL || 'http://localhost:3001'}/api/moderation/reinstate?token=${process.env.ADMIN_SECRET || ''}&email=${encodeURIComponent(user.email)}"
           style="background:#7c3aed;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:bold">
          Reinstate Account
        </a>
      </p>` : ''}
    `,
  });

  res.json({ ok: true });
});

// ─── GET /api/moderation/reinstate ───────────────────────────────────────────
// Admin-only one-click reinstate link sent in the paused-account email.
// Query: ?token=ADMIN_SECRET&email=user@example.com
router.get('/reinstate', async (req, res) => {
  const { token, email } = req.query;
  const adminSecret = process.env.ADMIN_SECRET;

  if (!adminSecret || token !== adminSecret) {
    return res.status(403).send('Invalid reinstate token.');
  }
  if (!email) return res.status(400).send('Missing email.');

  await prisma.user.update({
    where: { email },
    data: { account_paused: false, moderation_warnings: 0 },
  });

  res.send(`
    <html><body style="font-family:sans-serif;text-align:center;padding:60px">
      <h2 style="color:#7c3aed">Account Reinstated</h2>
      <p>${email} has been reinstated with warnings reset to 0.</p>
    </body></html>
  `);
});

// ─── POST /api/moderation/report-question ────────────────────────────────────
// Body: { questionText, correctAnswer, submissionTitle }
router.post('/report-question', requireAuth, async (req, res) => {
  const { questionText = '', correctAnswer = '', submissionTitle = '' } = req.body;

  await sendEmail({
    to: ADMIN_MODERATION_EMAIL,
    subject: `[Intellix] Inaccurate Question Reported — ${req.user.email}`,
    html: `
      <h2 style="color:#7c3aed">Intellix — Question Accuracy Report</h2>
      <p>A user flagged an AI-generated question as potentially inaccurate.</p>
      <table style="border-collapse:collapse;width:100%;margin-bottom:16px">
        <tr><td style="padding:4px 10px;font-weight:bold">Reported by</td><td style="padding:4px 10px">${req.user.full_name || req.user.email}</td></tr>
        <tr><td style="padding:4px 10px;font-weight:bold">Submission</td><td style="padding:4px 10px">${submissionTitle || '—'}</td></tr>
        <tr><td style="padding:4px 10px;font-weight:bold">Question</td><td style="padding:4px 10px">${questionText}</td></tr>
        <tr><td style="padding:4px 10px;font-weight:bold">Given Answer</td><td style="padding:4px 10px">${correctAnswer}</td></tr>
      </table>
      <p style="font-size:12px;color:#9ca3af">Review whether this answer is accurate. If it is a systemic issue, consider updating the quiz generation prompt.</p>
    `,
  });

  res.json({ ok: true });
});

module.exports = router;
