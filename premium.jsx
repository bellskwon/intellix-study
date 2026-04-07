import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Zap, Star, Crown, Users, Gift, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
    features: ['5 quiz questions per session','3 uploads per day','Basic flashcard generator','Leaderboard access','Streak tracking'],
    locked: ['Up to 50 questions per session','Unlimited daily uploads','Priority grading','Premium shop items','Referral bonus XP'],
    cta: 'Current Plan',
    ctaDisabled: true,
    trialDays: 0,
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
    highlight: true,
    trialDays: 3,
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
    trialDays: 1,
  },
];

export default function Premium() {
  const queryClient = useQueryClient();
  const [billing, setBilling] = useState('monthly');
  const [trialPopup, setTrialPopup] = useState(null); // plan object
  const [expiredPopup, setExpiredPopup] = useState(null);

  const { data: user, refetch } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });

  const activePlan = user?.premium_plan || 'free';
  const trialEndDate = user?.trial_end_date ? new Date(user.trial_end_date) : null;
  const trialExpired = trialEndDate && trialEndDate < new Date();

  const handleSubscribe = async (plan) => {
    if (plan.ctaDisabled) return;
    if (activePlan === plan.id) { toast.info(`You're already on ${plan.name}!`); return; }
    setTrialPopup(plan);
  };

  const confirmTrial = async (plan) => {
    const endDate = addDays(new Date(), plan.trialDays);
    await base44.auth.updateMe({
      premium_plan: plan.id,
      trial_end_date: endDate.toISOString(),
      trial_active: true,
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

  const referralCode = user?.email?.split('@')[0]?.replace(/[^a-z0-9]/gi, '') || 'user';
  const referralLink = `https://intellix.app/join?ref=${referralCode}`;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
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
          <Star className="w-5 h-5 text-amber-500 shrink-0" />
          <p className="text-sm font-bold text-amber-800 flex-1">Your free trial has ended. Subscribe to keep Premium benefits.</p>
          <Button size="sm" className="rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold" onClick={() => setExpiredPopup(PLANS.find(p => p.id === activePlan))}>
            Subscribe Now
          </Button>
        </div>
      )}

      {/* Hero */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 px-4 py-2 rounded-full">
          <Crown className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-black text-amber-700">Intellix Premium</span>
        </div>
        <h1 className="text-3xl font-black text-foreground">Upgrade Your Learning</h1>
        <p className="text-muted-foreground max-w-md mx-auto text-sm leading-relaxed">
          Pro trial: 3 days free. Elite trial: 1 day free. No credit card required.
        </p>
        <div className="inline-flex gap-1 p-1 bg-secondary rounded-xl">
          {['monthly', 'yearly'].map(b => (
            <button key={b} onClick={() => setBilling(b)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all capitalize ${billing === b ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground'}`}>
              {b} {b === 'yearly' && <span className="text-emerald-600 font-black text-xs ml-1">Save 30%</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Plans */}
      <div className="grid md:grid-cols-3 gap-5">
        {PLANS.map((plan, i) => {
          const price = getPrice(plan);
          const isActive = activePlan === plan.id;
          return (
            <motion.div key={plan.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              className={`rounded-3xl overflow-hidden ${plan.highlight ? 'ring-2 ring-primary shadow-2xl shadow-primary/20 scale-105' : 'border border-border'}`}>
              {plan.badge && (
                <div className={`text-center py-2 text-xs font-black ${plan.id === 'pro' ? 'bg-primary text-white' : 'bg-amber-500 text-white'}`}>
                  {plan.badge}
                </div>
              )}
              <div className={`bg-gradient-to-br ${plan.gradient} p-6`}>
                <p className={`text-xs font-black uppercase tracking-widest mb-1 ${plan.id === 'free' ? 'text-slate-500' : 'text-white/70'}`}>{plan.name}</p>
                <div className="flex items-end gap-1">
                  <p className={`text-4xl font-black ${plan.id === 'free' ? 'text-slate-800' : 'text-white'}`}>{price.display}</p>
                  <p className={`text-sm mb-1 ${plan.id === 'free' ? 'text-slate-500' : 'text-white/70'}`}>{price.period}</p>
                </div>
                {price.yearly && (
                  <p className="text-xs text-white/80 mt-1">{price.yearly} total</p>
                )}
              </div>
              <div className="bg-white p-5 space-y-4">
                <div className="space-y-2">
                  {plan.features.map((f, fi) => (
                    <div key={fi} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="text-xs text-foreground">{f}</span>
                    </div>
                  ))}
                  {plan.locked?.map((f, fi) => (
                    <div key={fi} className="flex items-start gap-2 opacity-40">
                      <div className="w-4 h-4 rounded-full border-2 border-border shrink-0 mt-0.5" />
                      <span className="text-xs text-muted-foreground">{f}</span>
                    </div>
                  ))}
                </div>
                <Button
                  onClick={() => handleSubscribe(plan)}
                  disabled={plan.ctaDisabled || isActive}
                  className={`w-full rounded-xl font-bold h-11 ${
                    isActive ? 'bg-emerald-100 text-emerald-700 cursor-default' :
                    plan.highlight ? 'bg-primary text-white hover:bg-primary/90' :
                    plan.id === 'elite' ? 'bg-amber-500 text-white hover:bg-amber-600' :
                    'bg-secondary text-foreground hover:bg-secondary/80'
                  }`}>
                  {isActive ? (trialExpired ? 'Trial Ended' : 'Active Plan') : plan.cta}
                </Button>
              </div>
            </motion.div>
          );
        })}
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
            <div className="grid sm:grid-cols-3 gap-3">
              {[
                { Icon: Users, label: 'Friend Signs Up', xp: '+50 XP', color: 'text-emerald-600' },
                { Icon: Zap, label: 'Friend Takes Quiz', xp: '+100 XP', color: 'text-violet-600' },
                { Icon: Crown, label: 'Friend Goes Premium', xp: '+500 XP', color: 'text-amber-600' },
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
          { q: 'How long is the free trial?', a: 'Pro plan: 3-day free trial. Elite plan: 1-day free trial. No credit card required to start.' },
          { q: 'What happens when the trial ends?', a: 'You\'ll see a prompt to subscribe. Your data stays forever — you just lose premium features until you subscribe.' },
          { q: 'Can I switch plans later?', a: 'Yes — upgrade or downgrade any time from this page.' },
          { q: 'How many quiz questions do I get per session?', a: 'Free plan: 5 questions max per session, 3 study tool uses per day. Pro: up to 50 questions, 20 uses/day. Elite: unlimited.' },
          { q: 'When does the shop unlock?', a: 'Free users: Level 50. Pro & Elite subscribers: Level 35. Elite users unlock the FULL shop at Level 350.' },
          { q: 'Can I earn rewards on the free plan?', a: 'Yes! Free users earn 1 pt per daily challenge (80%+) and up to 5 pts per quiz. It takes about 3 weeks of daily studying to earn a $5 gift card on the free plan.' },
          { q: 'How does the weekly leaderboard work?', a: 'The leaderboard resets every week. The top 5 players each week earn bonus points: 1st gets 5 pts, 2nd gets 4, down to 5th getting 1 pt.' },
          { q: 'What counts as a "passed" quiz?', a: 'Any quiz where you score 80% or higher is counted as passed.' },
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
          <a href="mailto:intellixapp.team@gmail.com" className="text-primary font-semibold hover:underline">intellixapp.team@gmail.com</a>
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
              <div className="bg-secondary/50 rounded-2xl p-4 mb-5 space-y-2">
                <p className="text-xs font-black text-muted-foreground uppercase tracking-wide mb-2">Pay with</p>
                {['Google Pay', 'Venmo', 'CashApp', 'PayPal', 'Credit/Debit Card'].map(method => (
                  <button key={method} onClick={() => { toast.success(`Redirecting to ${method}...`); setExpiredPopup(null); }}
                    className="w-full text-left px-4 py-2.5 rounded-xl bg-white border border-border text-sm font-semibold hover:border-primary/30 hover:bg-primary/5 transition-all">
                    {method}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground text-center">Payment processing coming soon. Contact us at intellixapp.team@gmail.com</p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}