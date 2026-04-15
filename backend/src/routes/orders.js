const express = require('express');
const nodemailer = require('nodemailer');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// ─── FILL IN YOUR ADMIN EMAIL HERE ───────────────────────────────────────────
// This is the address that receives every new gift card order notification.
// You can either set ADMIN_ORDER_EMAIL in your .env file, or hard-code it below.
const ADMIN_ORDER_EMAIL = process.env.ADMIN_ORDER_EMAIL || '';
// ─────────────────────────────────────────────────────────────────────────────

// ─── SMTP Configuration ───────────────────────────────────────────────────────
// For Gmail: set SMTP_USER to your Gmail address and SMTP_PASS to an App Password.
//   Google Account → Security → 2-Step Verification → App passwords → create one
// For other providers: update SMTP_HOST and SMTP_PORT accordingly.
const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST || 'smtp.gmail.com',
  port:   Number(process.env.SMTP_PORT) || 587,
  secure: false, // use true for port 465
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
});

// ─── POST /api/orders ─────────────────────────────────────────────────────────
// Creates a redemption record and emails the admin with the order details.
router.post('/', requireAuth, async (req, res) => {
  const { reward_id, reward_name, points_spent, gift_card_amount } = req.body;

  if (!reward_id || !reward_name || !points_spent) {
    return res.status(400).json({ message: 'Missing required order fields.' });
  }

  // ── Verify the user has enough available points ───────────────────────────
  const [submissions, redemptions] = await Promise.all([
    prisma.submission.findMany({ where: { created_by: req.user.email } }),
    prisma.redemption.findMany({ where: { created_by: req.user.email } }),
  ]);

  const earned   = submissions.filter(s => s.status === 'approved').reduce((a, s) => a + (s.points_awarded || 0), 0);
  const spent    = redemptions.reduce((a, r) => a + r.points_spent, 0);
  const available = earned - spent;

  if (available < points_spent) {
    return res.status(400).json({ message: 'Not enough points to place this order.' });
  }

  // ── Create the redemption record ──────────────────────────────────────────
  const redemption = await prisma.redemption.create({
    data: {
      reward_id,
      reward_name,
      points_spent,
      status: 'pending',
      created_by: req.user.email,
    },
  });

  // ── Send order notification email ─────────────────────────────────────────
  const emailConfigured = ADMIN_ORDER_EMAIL && process.env.SMTP_USER && process.env.SMTP_PASS;

  if (emailConfigured) {
    try {
      const orderDate = new Date().toLocaleString('en-US', {
        timeZone: 'America/New_York',
        dateStyle: 'medium',
        timeStyle: 'short',
      });

      await transporter.sendMail({
        from: `"Intellix Orders" <${process.env.SMTP_USER}>`,
        to: ADMIN_ORDER_EMAIL,
        subject: `New Order — ${req.user.full_name || req.user.email} ordered ${reward_name}`,
        html: `
          <div style="font-family: -apple-system, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px;">
            <h2 style="color: #7c3aed; margin-top: 0;">🎁 New Gift Card Order</h2>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr style="border-bottom: 1px solid #f3f4f6;">
                <td style="padding: 10px 0; color: #6b7280; width: 130px;">Student Name</td>
                <td style="padding: 10px 0; font-weight: 600;">${req.user.full_name || req.user.display_name || 'Unknown'}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f3f4f6;">
                <td style="padding: 10px 0; color: #6b7280;">Student Email</td>
                <td style="padding: 10px 0; font-weight: 600;">${req.user.email}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f3f4f6;">
                <td style="padding: 10px 0; color: #6b7280;">Gift Card</td>
                <td style="padding: 10px 0; font-weight: 600;">${reward_name}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f3f4f6;">
                <td style="padding: 10px 0; color: #6b7280;">Card Amount</td>
                <td style="padding: 10px 0; font-weight: 600; color: #059669;">${gift_card_amount}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f3f4f6;">
                <td style="padding: 10px 0; color: #6b7280;">Points Spent</td>
                <td style="padding: 10px 0; font-weight: 600;">${Number(points_spent).toLocaleString()} pts</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #6b7280;">Order Time</td>
                <td style="padding: 10px 0;">${orderDate} ET</td>
              </tr>
            </table>
            <div style="margin-top: 20px; padding: 16px; background: #f5f3ff; border-radius: 8px; border-left: 4px solid #7c3aed;">
              <p style="margin: 0; font-weight: 700; color: #7c3aed;">Action Required</p>
              <p style="margin: 6px 0 0; color: #374151; font-size: 14px;">
                Please email the digital gift card code to the student at<br>
                <strong>${req.user.email}</strong>
              </p>
            </div>
          </div>
        `,
      });
    } catch (emailErr) {
      // Log the error but don't fail the order — the redemption record was created successfully
      console.error('[Orders] Email send failed:', emailErr.message);
    }
  } else {
    // Email not configured — log the order to the console so you can still see it
    console.log('[Orders] New order (email not configured):', {
      student: req.user.email,
      card: reward_name,
      amount: gift_card_amount,
      points: points_spent,
    });
  }

  res.json({ success: true, redemption });
});

module.exports = router;
