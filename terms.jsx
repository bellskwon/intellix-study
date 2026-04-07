import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

const SECTIONS = [
  {
    title: '1. Acceptance of Terms',
    body: 'By accessing or using Intellix ("the App"), you agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use the App.',
  },
  {
    title: '2. Eligibility',
    body: 'Intellix is designed for students aged 11 and older. If you are under 13, please ensure a parent or guardian reviews and consents to these terms before you use the App.',
  },
  {
    title: '3. User Conduct',
    body: 'You agree to use Intellix only for lawful, educational purposes. You must not upload, share, or create content that is NSFW, offensive, hateful, or contains personal information (doxxing). Violations will result in immediate account suspension.',
  },
  {
    title: '4. Profile Pictures & Avatars',
    body: 'Profile images must be appropriate for all ages. You may not upload images containing: nudity or sexually explicit content, personally identifiable information, hate symbols, violence, or other inappropriate content. Intellix reserves the right to remove violations without notice.',
  },
  {
    title: '5. Points, Rewards & Plans',
    body: 'Points are earned by completing quizzes and daily challenges. Free plan users earn up to 5 pts/quiz (100% score) and 1 pt/daily challenge (≥80%). Points may be redeemed in the Shop for physical rewards, subject to availability and level requirements. Intellix reserves the right to modify point values at any time.',
  },
  {
    title: '6. Premium Subscriptions & Free Trials',
    body: 'Pro plan includes a 3-day free trial; Elite includes a 1-day free trial. No credit card is required to start a trial. After the trial ends, premium features are paused until you subscribe. Subscription pricing is as displayed on the Premium page. Intellix does not currently process payments automatically — contact us to subscribe.',
  },
  {
    title: '7. Referral Program',
    body: 'You may share your referral link to invite new users to Intellix. You may not use your own referral link to earn rewards. Each new user may only register once through a referral link. Abuse of the referral system will result in removal of earned rewards and possible account suspension.',
  },
  {
    title: '8. Intellectual Property',
    body: 'All content, branding, and features of Intellix are the property of Intellix and its creators. You may not copy, reproduce, or redistribute any part of the App without written permission.',
  },
  {
    title: '9. Disclaimers',
    body: 'Intellix uses AI to generate quiz questions and study materials. While we strive for accuracy (especially in math), AI-generated content may occasionally contain errors. Always verify important information with a trusted educational source.',
  },
  {
    title: '10. Changes to Terms',
    body: 'We may update these Terms from time to time. Continued use of the App after changes constitutes acceptance of the updated Terms. We will notify users of significant changes via email or in-app notice.',
  },
  {
    title: '11. Contact',
    body: 'For any questions about these Terms, please contact us at intellixapp.team@gmail.com.',
  },
];

export default function Terms() {
  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </Link>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl overflow-hidden text-white p-8"
        style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 60%, #ec4899 100%)' }}>
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-8 h-8 text-white/80" />
          <h1 className="text-2xl font-black">Terms &amp; Conditions</h1>
        </div>
        <p className="text-purple-200 text-sm">Last updated: March 2026 · Please read carefully before using Intellix.</p>
      </motion.div>

      <div className="space-y-4">
        {SECTIONS.map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            className="bg-white rounded-2xl border border-border p-5">
            <h2 className="font-black text-foreground mb-2 text-base">{s.title}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
          </motion.div>
        ))}
      </div>

      <div className="text-center py-4 border-t border-border">
        <p className="text-sm text-muted-foreground">
          Questions?{' '}
          <a href="mailto:intellixapp.team@gmail.com" className="text-primary font-semibold hover:underline">
            intellixapp.team@gmail.com
          </a>
        </p>
      </div>
    </div>
  );
}