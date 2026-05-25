import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Zap, Star, Crown, Users, Gift, X, ExternalLink, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    monthlyPrice: 0,
    yearlyPrice: 0,
    badge: null,
    gradient: 'from-slate-100 to-slate-200',
    features: ['10 quiz questions per session','3 uploads per day','Basic flashcard generator','Leaderboard access','Streak tracking'],
    locked: ['Up to 50 questions per session','Unlimited daily uploads','Priority grading','Premium shop items','Referral bonus XP'],
    cta: 'Current Plan',
    ctaDisabled: true,
    trialDays: 0,
  },
  {
    id: 'elite',
    name: 'Elite',
    monthlyPrice: 9.99,
    yearlyPrice: 83.99,
    badge: '1-day free trial',
    gradient: 'from-amber-500 to-orange-600',
    features: ['Unlimited questions & uploads','All Pro features','Full shop unlocked at Level 350','Shop unlocked early at Lv.35','3x XP from all activities','5x Referral XP bonus','Priority support','Early access to new features'],
    cta: 'Start Free Trial',
    ctaDisabled: false,
    highlight: true,
    trialDays: 1,
  },
  {
    id: 'pro',
    name: 'Pro',
    monthlyPrice: 4.99,
    yearlyPrice: 41.99,
    badge: '3-day free trial',
    gradient: 'from-violet-600 to-purple-700',
    features: ['Up to 50 questions per session','20 uploads per day','Advanced key point analysis','Difficulty-filtered questions','Priority grading','Unlock shop early (Lv.35)','2x Referral XP bonus','Streak Shield (monthly)'],
    cta: 'Start Free Trial',
    ctaDisabled: false,
    trialDays: 3,
  },
];

export default function Premium() {
  const queryClient = useQueryClient();
  const [billing, setBilling] = useState('monthly');
  const [trialPopup, setTrialPopup] = useState(null);
  const [expiredPopup, setExpiredPopup] = useState(null);
  const [stripeLoading, setStripeLoading] = useState(null); // 'subscribe'|packId|'gift'|'portal'
  const [giftEmail, setGiftEmail] = useState('');
  const [giftPlan, setGiftPlan] = useState('pro');
  const [giftBilling, setGiftBilling] = useState('monthly');

  const { data: user, refetch } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });

  const activePlan = user?.premium_plan || 'free';
  const trialEndDate = user?.trial_end_date ? new Date(user.trial_end_date) : null;
  const trialExpired = trialEndDate && trialEndDate < new Date();

  // Show success toast after Stripe redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('stripe_status');
    if (status === 'success') {
      toast.success('Payment successful! Your plan has been updated.');
      refetch();
      // Clean the URL
      window.history.replaceState({}, '', '/premium');
    } else if (status === 'cancelled') {
      toast.info('Checkout cancelled — no charge was made.');
      window.history.replaceState({}, '', '/premium');
    }
  }, []);

  const startStripeCheckout = async (type, extra = {}) => {
    const key = extra.packId || type;
    setStripeLoading(key);
    try {
      // extra.billing takes precedence over the main billing toggle (used by gift section)
      const { url } = await base44.stripe.createCheckoutSession({ type, billing, ...extra });
      window.location.href = url;
    } catch (e) {
      toast.error(e.message || 'Could not start checkout');
      setStripeLoading(null);
    }
  };

  const openPortal = async () => {
    setStripeLoading('portal');
    try {
      const { url } = await base44.stripe.createPortalSession();
      window.location.href = url;
    } catch (e) {
      toast.error(e.message || 'Could not open billing portal');
      setStripeLoading(null);
    }
  };

  const handleSubscribe = async (plan) => {
    if (plan.ctaDisabled) return;
    if (activePlan === plan.id && !trialExpired) { toast.info(`You're already on ${plan.name}!`); return; }
    setTrialPopup(plan);
  };

  const confirmTrial = async (plan) => {
    const endDate = addDays(new Date(), plan.trialDays);
    await base44.auth.updateMe({
      premium_plan: plan.id,
      trial_end_date: endDate.toISOString(),
    });
    await refetch();
    queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    setTrialPopup(null);
    toast.success(`${plan.trialDays}-day free trial started! Enjoy ${plan.name} until ${format(endDate, 'MMM d')}.`);
  };

  const getPrice = (plan) => {
    if (plan.monthlyPrice === 0) return { display: '$0', period: 'forever' };
    if (billing === 'yearly') {
      const mo = (plan.yearlyPrice / 12).toFixed(2);
      return { display: `$${mo}`, period: '/mo, billed yearly', yearly: `$${plan.yearlyPrice}/yr` };
    }
    return { display: `$${plan.monthlyPrice}`, period: '/month' };
  };

  const referralLink = `https://intellix.app/join?ref=${user?.referral_code || ''}`;

  return (
    <div className="pb-8">
      {/* Dark hero — full width */}
      <div className="-mx-4 -mt-4 lg:-mx-8 lg:-mt-8 mb-6">
        <div className="bg-[#130d25] px-6 pt-7 pb-8">
          <div className="max-w-4xl mx-auto">
            {/* Top row */}
            <div className="flex items-center justify-end mb-5">
              <div className="flex items-center gap-1.5 bg-amber-500/20 border border-amber-400/30 px-3 py-1.5 rounded-full">
                <span className="text-sm">✨</span>
                <span className="text-xs font-black text-amber-300">Intellix Premium</span>
              </div>
            </div>
            {/* Title */}
            <div className="leading-none mb-3">
              <h1 className="font-black text-white" style={{ fontSize: 'clamp(2.8rem, 10vw, 4.5rem)', lineHeight: 0.95 }}>Unlock your</h1>
              <h1 className="font-black text-amber-400" style={{ fontSize: 'clamp(2.8rem, 10vw, 4.5rem)', lineHeight: 0.95 }}>full potential</h1>
            </div>
            <p className="text-white/50 text-sm mb-6 max-w-sm">Earn faster, unlock bigger rewards,<br />and get priority grading. No card required.</p>
            {/* Billing toggle */}
            <div className="inline-flex gap-1 p-1 bg-white/10 rounded-xl">
              {['monthly', 'yearly'].map(b => (
                <button key={b} onClick={() => setBilling(b)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all capitalize ${billing === b ? 'bg-white text-foreground shadow-sm' : 'text-white/60 hover:text-white'}`}>
                  {b}{b === 'yearly' && <span className="ml-1.5 text-[10px] font-black bg-emerald-500 text-white px-1.5 py-0.5 rounded-full">-30%</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Trial Active Banner */}
        {activePlan !== 'free' && trialEndDate && !trialExpired && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-3 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
            <p className="text-sm font-bold text-emerald-800 flex-1">
              {activePlan.charAt(0).toUpperCase() + activePlan.slice(1)} trial active — expires {format(trialEndDate, 'MMM d, yyyy')}
            </p>
          </div>
        )}

        {/* Trial Expired Banner */}
        {activePlan !== 'free' && trialExpired && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-400 flex items-center justify-center shrink-0">
              <Star className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-black text-amber-900">Your free trial has ended</p>
              <p className="text-xs text-amber-700">Subscribe to keep Premium benefits</p>
            </div>
            <Button size="sm" className="rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold shrink-0"
              onClick={() => setExpiredPopup(PLANS.find(p => p.id === activePlan))}>
              Subscribe
            </Button>
          </div>
        )}

        {/* Plans */}
        <div className="grid md:grid-cols-3 gap-4">
          {PLANS.map((plan, i) => {
            const price = getPrice(plan);
            const isActive = activePlan === plan.id;
            const isFree = plan.id === 'free';
            const isElite = plan.id === 'elite';
            const isPro = plan.id === 'pro';
            return (
              <motion.div key={plan.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                className={`rounded-3xl overflow-hidden flex flex-col ${
                  isElite ? 'ring-2 ring-amber-400 shadow-xl shadow-amber-200/50' :
                  isPro ? 'ring-1 ring-violet-200' : 'border border-border'}`}>

                {/* Top badge */}
                {isElite && (
                  <div className="bg-amber-500 text-white text-center py-2 text-xs font-black tracking-wide">
                    → Most popular
                  </div>
                )}

                {/* Card header */}
                <div className={`p-5 ${isElite ? 'bg-amber-500' : isPro ? 'bg-violet-600' : 'bg-slate-50'}`}>
                  <p className={`text-[11px] font-black uppercase tracking-widest mb-1 ${isFree ? 'text-slate-400' : 'text-white/70'}`}>{plan.name}</p>
                  {plan.badge && (
                    <span className={`inline-block text-[10px] font-black px-2 py-0.5 rounded-full mb-2 ${isElite ? 'bg-white/20 text-white' : 'bg-white/20 text-white'}`}>
                      {plan.badge}
                    </span>
                  )}
                  <div className="flex items-end gap-1">
                    <p className={`font-black tracking-tight ${isFree ? 'text-slate-800' : 'text-white'}`} style={{ fontSize: '3rem', lineHeight: 1 }}>{price.display}</p>
                    <p className={`text-sm mb-1 ${isFree ? 'text-slate-400' : 'text-white/70'}`}>{price.period}</p>
                  </div>
                  {price.yearly && <p className="text-xs text-white/70 mt-1">{price.yearly} total</p>}
                </div>

                {/* Features */}
                <div className="bg-white p-5 flex-1 flex flex-col gap-4">
                  <div className="space-y-2 flex-1">
                    {plan.features.map((f, fi) => (
                      <div key={fi} className="flex items-start gap-2">
                        <span className={`text-sm shrink-0 mt-0.5 ${isElite ? 'text-amber-500' : isPro ? 'text-violet-500' : 'text-emerald-500'}`}>✓</span>
                        <span className="text-xs text-foreground">{f}</span>
                      </div>
                    ))}
                    {plan.locked?.map((f, fi) => (
                      <div key={fi} className="flex items-start gap-2 opacity-35">
                        <span className="text-sm shrink-0 mt-0.5 text-muted-foreground">✕</span>
                        <span className="text-xs text-muted-foreground line-through">{f}</span>
                      </div>
                    ))}
                  </div>
                  <Button
                    onClick={() => handleSubscribe(plan)}
                    disabled={plan.ctaDisabled || isActive}
                    className={`w-full rounded-xl font-bold h-11 ${
                      isActive ? 'bg-emerald-100 text-emerald-700 cursor-default' :
                      isElite ? 'bg-amber-500 text-white hover:bg-amber-600' :
                      isPro ? 'bg-violet-600 text-white hover:bg-violet-700' :
                      'bg-secondary text-foreground hover:bg-secondary/80'}`}>
                    {isActive ? (trialExpired ? 'Trial Ended' : 'Active Plan') : plan.cta}
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Manage subscription */}
        {activePlan !== 'free' && !trialExpired && (
          <div className="bg-white rounded-2xl border border-border p-5 flex items-center gap-4">
            <div className="flex-1">
              <p className="font-black text-sm text-foreground">Manage Subscription</p>
              <p className="text-xs text-muted-foreground mt-0.5">Update payment method, view invoices, or cancel anytime.</p>
            </div>
            <Button size="sm" variant="outline" className="rounded-xl font-bold shrink-0 gap-1.5"
              disabled={stripeLoading === 'portal'} onClick={openPortal}>
              <Settings className="w-3.5 h-3.5" />
              {stripeLoading === 'portal' ? 'Opening…' : 'Billing Portal'}
            </Button>
          </div>
        )}

      {/* ── Gift Premium ──────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-pink-50 to-fuchsia-50 border border-pink-200 rounded-3xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-400 to-fuchsia-500 flex items-center justify-center shadow-lg shrink-0">
            <Gift className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-black text-foreground text-lg">Gift Premium</h3>
            <p className="text-sm text-muted-foreground">Send a Premium subscription to a friend.</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <Input
            placeholder="Friend's Gmail address..."
            value={giftEmail}
            onChange={e => setGiftEmail(e.target.value)}
            type="email"
            className="h-11 rounded-xl bg-white"
          />
          <div className="flex gap-2">
            <select
              value={giftPlan}
              onChange={e => setGiftPlan(e.target.value)}
              className="flex-1 h-11 rounded-xl border border-input bg-white px-3 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option value="pro">Pro</option>
              <option value="elite">Elite</option>
            </select>
            <select
              value={giftBilling}
              onChange={e => setGiftBilling(e.target.value)}
              className="flex-1 h-11 rounded-xl border border-input bg-white px-3 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
        </div>
        <Button
          className="w-full h-11 rounded-xl font-bold bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white hover:opacity-90"
          disabled={!giftEmail.trim() || stripeLoading === 'gift'}
          onClick={() => startStripeCheckout('gift', { plan: giftPlan, billing: giftBilling, giftEmail: giftEmail.trim() })}>
          <Gift className="w-4 h-4 mr-2" />
          {stripeLoading === 'gift' ? 'Loading…' : `Gift ${giftPlan.charAt(0).toUpperCase() + giftPlan.slice(1)} to Friend`}
        </Button>
        <p className="text-xs text-muted-foreground">Their plan activates the moment payment completes. They'll need an Intellix account.</p>
      </div>

      {/* Referral Section */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-3xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shrink-0">
            <Gift className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-black text-foreground text-lg">Referral Rewards</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">Invite friends — earn XP when they join and study!</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { Icon: Users, label: 'Friend Signs Up', xp: '+50 XP', color: 'text-emerald-600' },
                { Icon: Zap, label: 'Friend Takes Quiz', xp: '+100 XP', color: 'text-violet-600' },
              ].map(r => (
                <div key={r.label} className="bg-white rounded-xl border border-emerald-100 p-3 text-center">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center mx-auto mb-1.5">
                    <r.Icon className={`w-4 h-4 ${r.color}`} />
                  </div>
                  <p className="text-xs font-semibold text-foreground">{r.label}</p>
                  <p className={`text-sm font-black mt-0.5 ${r.color}`}>{r.xp}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-5 flex items-center gap-3 bg-white rounded-xl border border-emerald-200 p-3">
          <div className="flex-1 text-xs text-muted-foreground font-mono bg-secondary px-3 py-2 rounded-lg truncate">
            {referralLink}
          </div>
          <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-bold shrink-0"
            onClick={() => { navigator.clipboard.writeText(referralLink); toast.success('Link copied!'); }}>
            Copy
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">You cannot use your own referral link. Each new user can only register once through a referral link.</p>
      </div>

      {/* FAQ */}
      <div className="space-y-3">
        <h3 className="font-black text-foreground text-lg">Common Questions</h3>
        {[
          { q: 'How long is the free trial?', a: 'Pro: 3 days. Elite: 1 day. No card required.' },
          { q: 'What happens when it ends?', a: 'Your data stays. You lose premium features until you subscribe.' },
          { q: 'Can I switch plans?', a: 'Yes — upgrade or downgrade any time from this page.' },
          { q: 'What counts as a passed quiz?', a: 'Any quiz scored 80% or higher.' },
        ].map((faq, i) => (
          <div key={i} className="bg-white rounded-xl border border-border p-4">
            <p className="text-sm font-bold text-foreground">{faq.q}</p>
            <p className="text-xs text-muted-foreground mt-1">{faq.a}</p>
          </div>
        ))}
      </div>

      <div className="text-center py-4 border-t border-border">
        <p className="text-sm text-muted-foreground">
          Questions about Premium?{' '}
          <a href="https://mail.google.com/mail/?view=cm&to=intellix.study.app@gmail.com" target="_blank" rel="noopener noreferrer" className="text-primary font-semibold hover:underline">intellix.study.app@gmail.com</a>
        </p>
      </div>

      {/* Trial Confirmation Popup */}
      <AnimatePresence>
        {trialPopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl">
              <div className="text-center mb-5">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${trialPopup.gradient} flex items-center justify-center mx-auto mb-3 shadow-lg`}>
                  <Crown className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-black text-foreground">Start {trialPopup.name} Trial</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {trialPopup.trialDays} day{trialPopup.trialDays > 1 ? 's' : ''} free — expires {format(addDays(new Date(), trialPopup.trialDays), 'MMM d, yyyy')}
                </p>
              </div>
              <div className="space-y-2 mb-5">
                {trialPopup.features.slice(0, 4).map((f, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="text-xs text-foreground">{f}</span>
                  </div>
                ))}
              </div>
              <Button onClick={() => confirmTrial(trialPopup)} className="w-full h-11 rounded-xl font-bold bg-primary text-white hover:bg-primary/90 mb-2">
                Activate Free Trial
              </Button>
              <Button variant="ghost" onClick={() => setTrialPopup(null)} className="w-full rounded-xl">
                Cancel
              </Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Trial Expired Subscribe Popup */}
      <AnimatePresence>
        {expiredPopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl">
              <div className="flex justify-end mb-2">
                <button onClick={() => setExpiredPopup(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="text-center mb-5">
                <h3 className="text-xl font-black text-foreground">Continue with {expiredPopup.name}?</h3>
                <p className="text-sm text-muted-foreground mt-1">Your trial ended. Subscribe to keep your premium benefits.</p>
                <p className="text-2xl font-black text-primary mt-3">
                  ${billing === 'yearly' ? expiredPopup.yearlyPrice + '/yr' : expiredPopup.monthlyPrice + '/mo'}
                </p>
              </div>
              <Button
                className="w-full h-11 rounded-xl font-bold bg-primary text-white hover:bg-primary/90 mb-2 gap-2"
                disabled={stripeLoading === 'subscribe'}
                onClick={() => {
                  setExpiredPopup(null);
                  startStripeCheckout('subscription', { plan: expiredPopup.id });
                }}>
                <ExternalLink className="w-4 h-4" />
                {stripeLoading === 'subscribe' ? 'Loading…' : 'Subscribe via Stripe'}
              </Button>
              <p className="text-xs text-muted-foreground text-center">Secure payment via Stripe. Cancel any time.</p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  </div>
  );
}