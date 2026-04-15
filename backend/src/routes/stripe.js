const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// ─── Guard: only require stripe if configured ─────────────────────────────────
const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw Object.assign(
      new Error('Stripe is not configured. Set STRIPE_SECRET_KEY in .env'),
      { status: 503 }
    );
  }
  return require('stripe')(process.env.STRIPE_SECRET_KEY);
};

// ── Subscription price IDs (set in .env) ──────────────────────────────────────
const getPriceId = (plan, billing) =>
  process.env[`STRIPE_PRICE_${plan.toUpperCase()}_${billing.toUpperCase()}`];

// ── One-time point packs ──────────────────────────────────────────────────────
const POINT_PACKS = {
  pack_100:  { points: 100,  amount: 99,   label: '100 Bonus Points'   },
  pack_350:  { points: 350,  amount: 299,  label: '350 Bonus Points'   },
  pack_1000: { points: 1000, amount: 799,  label: '1,000 Bonus Points' },
  pack_2500: { points: 2500, amount: 1499, label: '2,500 Bonus Points' },
};

// ── Ensure user has a Stripe customer record ──────────────────────────────────
async function getOrCreateCustomer(stripe, user) {
  if (user.stripe_customer_id) return user.stripe_customer_id;
  const customer = await stripe.customers.create({
    email: user.email,
    name: user.full_name || user.display_name || undefined,
    metadata: { userId: user.id },
  });
  await prisma.user.update({
    where: { id: user.id },
    data: { stripe_customer_id: customer.id },
  });
  return customer.id;
}

// ─── POST /api/stripe/checkout-session ───────────────────────────────────────
// type: 'subscription' | 'gift' | 'points_pack'
router.post('/checkout-session', requireAuth, async (req, res) => {
  const stripe = getStripe();
  const { type, plan, billing, packId, giftEmail } = req.body;
  const user = req.user;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  if (type === 'subscription' || type === 'gift') {
    const priceId = getPriceId(plan, billing);
    if (!priceId) {
      return res.status(400).json({
        message: `Stripe price not configured. Add STRIPE_PRICE_${plan.toUpperCase()}_${billing.toUpperCase()} to .env`,
      });
    }

    const customerId = await getOrCreateCustomer(stripe, user);
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${frontendUrl}/premium?stripe_status=success`,
      cancel_url:  `${frontendUrl}/premium?stripe_status=cancelled`,
      metadata: {
        type,
        plan,
        billing,
        userId: user.id,
        userEmail: user.email,
        ...(giftEmail ? { giftEmail } : {}),
      },
      subscription_data: {
        metadata: {
          type,
          plan,
          userId: user.id,
          userEmail: user.email,
          ...(giftEmail ? { giftEmail } : {}),
        },
      },
    });
    return res.json({ url: session.url });
  }

  if (type === 'points_pack') {
    const pack = POINT_PACKS[packId];
    if (!pack) return res.status(400).json({ message: `Unknown pack: ${packId}` });

    const customerId = await getOrCreateCustomer(stripe, user);
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          unit_amount: pack.amount,
          product_data: {
            name: pack.label,
            description: `Adds ${pack.points.toLocaleString()} bonus points to your Intellix account`,
          },
        },
        quantity: 1,
      }],
      success_url: `${frontendUrl}/premium?stripe_status=success`,
      cancel_url:  `${frontendUrl}/premium?stripe_status=cancelled`,
      metadata: {
        type: 'points_pack',
        packId,
        points: String(pack.points),
        userId: user.id,
        userEmail: user.email,
      },
    });
    return res.json({ url: session.url });
  }

  return res.status(400).json({ message: 'Invalid checkout type' });
});

// ─── POST /api/stripe/portal-session ─────────────────────────────────────────
router.post('/portal-session', requireAuth, async (req, res) => {
  const stripe = getStripe();
  const user = req.user;

  // Fetch fresh user to get stripe_customer_id
  const freshUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!freshUser?.stripe_customer_id) {
    return res.status(400).json({ message: 'No active subscription found.' });
  }

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const session = await stripe.billingPortal.sessions.create({
    customer: freshUser.stripe_customer_id,
    return_url: `${frontendUrl}/premium`,
  });
  res.json({ url: session.url });
});

// ─── POST /api/stripe/webhook ─────────────────────────────────────────────────
// NOTE: This route must receive the raw body — it's mounted separately in index.js
// with express.raw({ type: 'application/json' }) before the global express.json().
router.post('/webhook', async (req, res) => {
  const stripe = getStripe();
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = webhookSecret
      ? stripe.webhooks.constructEvent(req.body, sig, webhookSecret)
      : JSON.parse(req.body.toString());
  } catch (err) {
    console.error('[Stripe Webhook] Verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // ── checkout.session.completed ─────────────────────────────────────────────
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { type, plan, userId, userEmail, giftEmail, packId, points } = session.metadata || {};

    if (type === 'subscription') {
      await prisma.user.update({
        where: { id: userId },
        data: { premium_plan: plan, trial_end_date: null },
      });
      console.log(`[Stripe] Subscription activated: ${userEmail} → ${plan}`);
    }

    if (type === 'gift' && giftEmail) {
      const recipient = await prisma.user.findUnique({ where: { email: giftEmail } });
      if (recipient) {
        await prisma.user.update({
          where: { email: giftEmail },
          data: { premium_plan: plan, trial_end_date: null },
        });
        console.log(`[Stripe] Gift activated: ${giftEmail} → ${plan} (from ${userEmail})`);
      } else {
        console.warn(`[Stripe] Gift recipient not found: ${giftEmail}`);
      }
    }

    if (type === 'points_pack') {
      const numPoints = parseInt(points, 10) || 0;
      if (numPoints > 0 && userEmail) {
        await prisma.submission.create({
          data: {
            title:          `Bonus Points Pack — ${numPoints.toLocaleString()} points purchased`,
            subject:        'other',
            grade_level:    'n/a',
            type:           'points_pack',
            status:         'approved',
            points_awarded: numPoints,
            quiz_passed:    false,
            created_by:     userEmail,
          },
        });
        console.log(`[Stripe] Points pack credited: ${userEmail} +${numPoints} pts`);
      }
    }
  }

  // ── customer.subscription.deleted (cancellation) ───────────────────────────
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object;
    const { userEmail } = subscription.metadata || {};
    if (userEmail) {
      await prisma.user.update({
        where: { email: userEmail },
        data: { premium_plan: 'free' },
      });
      console.log(`[Stripe] Subscription cancelled: ${userEmail} → free`);
    }
  }

  res.json({ received: true });
});

module.exports = router;
