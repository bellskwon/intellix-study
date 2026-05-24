import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { calcLevelInfo, getLeague } from '@/components/shared/LevelXPBar';
import { motion } from 'framer-motion';
import { Star, BookOpen, Gift, Mail, ChevronDown, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

const SHOP_SECTIONS = [
  {
    unlockLevel: 50,
    title: 'Level 50 — Food & Coffee',
    gradient: 'from-emerald-400 to-teal-500',
    items: [
      {
        id: 'starbucks_gc',
        name: 'Starbucks',
        fullName: 'Starbucks Gift Card',
        desc: 'Your favorite drinks and snacks at Starbucks. Delivered digitally to your email.',
        image: 'https://assets.onme.com/static/category-imagery/merchants/logos/starbucks.webp',
        color: 'bg-emerald-50 border-emerald-200',
        glow: 'rgba(34, 197, 94, 0.45)',
        tiers: [
          { amount: '$5',  points: 500  },
          { amount: '$10', points: 950  },
          { amount: '$15', points: 1350 },
          { amount: '$25', points: 2100 },
        ],
      },
      {
        id: '7eleven_gc',
        name: '7-Eleven',
        fullName: '7-Eleven Gift Card',
        desc: 'Slurpees, snacks, fuel, and everyday essentials at 7-Eleven. Digital code emailed to you.',
        image: 'https://assets.onme.com/static/category-imagery/merchants/logos/7eleven.webp',
        color: 'bg-green-50 border-green-200',
        glow: 'rgba(22, 163, 74, 0.45)',
        tiers: [
          { amount: '$5',  points: 450  },
          { amount: '$10', points: 850  },
          { amount: '$25', points: 1950 },
        ],
      },
    ],
  },
  {
    unlockLevel: 100,
    title: 'Level 100 — eCommerce',
    gradient: 'from-violet-500 to-purple-600',
    items: [
      {
        id: 'amazon_gc',
        name: 'Amazon',
        fullName: 'Amazon Gift Card',
        desc: 'Shop anything on Amazon. Works across all categories. Sent to your email instantly.',
        image: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg',
        color: 'bg-violet-50 border-violet-200',
        glow: 'rgba(249, 115, 22, 0.45)',
        tiers: [
          { amount: '$10', points: 1000 },
          { amount: '$25', points: 2400 },
          { amount: '$50', points: 4600 },
        ],
      },
      {
        id: 'shein_gc',
        name: 'Shein',
        fullName: 'Shein Gift Card',
        desc: 'Clothing, accessories, and more at Shein. Digital code emailed to you.',
        image: 'https://i0.wp.com/giftcard8.com/blog/wp-content/uploads/2023/11/Everything-you-wanted-to-know-about-Shein-gift-card-.jpg?resize=800%2C394&ssl=1',
        color: 'bg-pink-50 border-pink-200',
        glow: 'rgba(236, 72, 153, 0.45)',
        tiers: [
          { amount: '$10', points: 900  },
          { amount: '$25', points: 2100 },
          { amount: '$50', points: 3900 },
        ],
      },
    ],
  },
  {
    unlockLevel: 150,
    title: 'Level 150 — Beauty',
    gradient: 'from-pink-500 to-rose-500',
    items: [
      {
        id: 'sephora_gc',
        name: 'Sephora',
        fullName: 'Sephora Gift Card',
        desc: 'Makeup, skincare, and fragrance at Sephora. Digital delivery to your email.',
        image: 'https://assets.onme.com/static/category-imagery/merchants/logos/sephora.webp',
        color: 'bg-rose-50 border-rose-200',
        glow: 'rgba(244, 63, 94, 0.45)',
        tiers: [
          { amount: '$10', points: 1100 },
          { amount: '$25', points: 2600 },
          { amount: '$50', points: 4900 },
        ],
      },
      {
        id: 'ulta_gc',
        name: 'Ulta Beauty',
        fullName: 'Ulta Beauty Gift Card',
        desc: 'Makeup, skincare, hair care, and more at Ulta Beauty. Digital delivery to your email.',
        image: 'https://media.ultainc.com/i/ulta/GS_GiftCard_WK4825_Hero_XL?w=600&fmt=auto',
        color: 'bg-fuchsia-50 border-fuchsia-200',
        glow: 'rgba(217, 70, 239, 0.45)',
        tiers: [
          { amount: '$10', points: 1050 },
          { amount: '$25', points: 2500 },
          { amount: '$50', points: 4700 },
        ],
      },
    ],
  },
  {
    unlockLevel: 200,
    title: 'Level 200 — Cash Gift Cards',
    gradient: 'from-cyan-500 to-blue-600',
    items: [
      {
        id: 'visa_gc',
        name: 'Visa Gift',
        fullName: 'Visa Gift Card',
        desc: 'Spend anywhere Visa is accepted. Fully digital — no physical card required.',
        image: 'https://logodownload.org/wp-content/uploads/2016/10/visa-logo-2.png',
        color: 'bg-blue-50 border-blue-200',
        glow: 'rgba(59, 130, 246, 0.45)',
        tiers: [
          { amount: '$25', points: 2900 },
          { amount: '$50', points: 5500 },
          { amount: '$100', points: 10000 },
        ],
      },
      {
        id: 'mastercard_gc',
        name: 'Mastercard',
        fullName: 'Mastercard Gift Card',
        desc: 'Use online or in-store anywhere Mastercard is accepted. Delivered digitally.',
        image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Mastercard-logo.svg/1280px-Mastercard-logo.svg.png',
        color: 'bg-orange-50 border-orange-200',
        glow: 'rgba(249, 115, 22, 0.45)',
        tiers: [
          { amount: '$25', points: 2700 },
          { amount: '$50', points: 5100 },
          { amount: '$100', points: 9400 },
        ],
      },
    ],
  },
  {
    unlockLevel: 250,
    title: 'Level 250 — Food Delivery',
    gradient: 'from-amber-400 to-orange-500',
    items: [
      {
        id: 'ubereats_gc',
        name: 'Uber Eats',
        fullName: 'Uber Eats Gift Card',
        desc: 'Order food from thousands of restaurants near you on Uber Eats. Digital code emailed to you.',
        image: 'https://assets.onme.com/static/category-imagery/merchants/logos/ubereats.webp',
        color: 'bg-gray-50 border-gray-200',
        glow: 'rgba(30, 30, 30, 0.35)',
        tiers: [
          { amount: '$10', points: 1050 },
          { amount: '$25', points: 2500 },
          { amount: '$50', points: 4700 },
        ],
      },
      {
        id: 'doordash_gc',
        name: 'DoorDash',
        fullName: 'DoorDash Gift Card',
        desc: 'Order food from thousands of restaurants near you. Digital code sent to your email.',
        image: 'https://assets.onme.com/static/category-imagery/merchants/logos/doordash.webp',
        color: 'bg-orange-50 border-orange-200',
        glow: 'rgba(239, 68, 68, 0.45)',
        tiers: [
          { amount: '$10', points: 1050 },
          { amount: '$25', points: 2500 },
          { amount: '$50', points: 4700 },
        ],
      },
    ],
  },
  {
    unlockLevel: 300,
    title: 'Level 300 — Clothing',
    gradient: 'from-rose-500 to-pink-600',
    items: [
      {
        id: 'pacsun_gc',
        name: 'PacSun',
        fullName: 'PacSun Gift Card',
        desc: 'Trendy streetwear and surf-inspired clothing at PacSun. Emailed to you.',
        image: 'https://assets.onme.com/static/category-imagery/merchants/logos/pacsun.webp',
        color: 'bg-rose-50 border-rose-200',
        glow: 'rgba(244, 63, 94, 0.45)',
        tiers: [
          { amount: '$25', points: 3100 },
          { amount: '$50', points: 5800 },
          { amount: '$100', points: 10500 },
        ],
      },
      {
        id: 'uniqlo_gc',
        name: 'UNIQLO',
        fullName: 'UNIQLO Gift Card',
        desc: 'Clean, quality everyday clothing at UNIQLO. Digital code delivered by email.',
        image: 'https://assets.onme.com/static/category-imagery/merchants/logos/uniqlo.webp',
        color: 'bg-pink-50 border-pink-200',
        glow: 'rgba(239, 68, 68, 0.45)',
        tiers: [
          { amount: '$25', points: 2900 },
          { amount: '$50', points: 5400 },
          { amount: '$100', points: 9800 },
        ],
      },
    ],
  },
  {
    unlockLevel: 350,
    title: 'Level 350 — Retail & Gaming',
    gradient: 'from-lime-500 to-green-600',
    items: [
      {
        id: 'target_gc',
        name: 'Target',
        fullName: 'Target Gift Card',
        desc: 'Shop groceries, electronics, clothing, and more at Target. Digital delivery.',
        image: 'https://assets.onme.com/static/category-imagery/merchants/logos/target.webp',
        color: 'bg-red-50 border-red-200',
        glow: 'rgba(239, 68, 68, 0.45)',
        tiers: [
          { amount: '$25', points: 3300 },
          { amount: '$50', points: 6100 },
          { amount: '$100', points: 11000 },
        ],
      },
      {
        id: 'roblox_gc',
        name: 'Roblox',
        fullName: 'Roblox Gift Card',
        desc: 'Robux for passes, skins, and virtual items in Roblox. Emailed as a digital code.',
        image: 'https://assets.onme.com/static/category-imagery/merchants/logos/roblox.webp',
        color: 'bg-slate-50 border-slate-200',
        glow: 'rgba(30, 30, 30, 0.35)',
        tiers: [
          { amount: '$10', points: 1000 },
          { amount: '$25', points: 2300 },
          { amount: '$50', points: 4300 },
        ],
      },
    ],
  },
  {
    unlockLevel: 400,
    title: 'Level 400 — Fan Favorites',
    gradient: 'from-amber-500 to-yellow-500',
    items: [
      {
        id: 'raising_canes_gc',
        name: "Raising Cane's",
        fullName: "Raising Cane's Gift Card",
        desc: "The best chicken fingers around. Digital code for Raising Cane's, sent to your email.",
        image: 'https://raisingcanesgear.com/cdn/shop/files/Cane_s_Logo_Branded_Gift_Card_1200x1200_crop_center.jpg?v=1750295655',
        color: 'bg-yellow-50 border-yellow-200',
        glow: 'rgba(234, 179, 8, 0.45)',
        tiers: [
          { amount: '$10', points: 1600 },
          { amount: '$25', points: 3700 },
          { amount: '$50', points: 7000 },
        ],
      },
      {
        id: 'chickfila_gc',
        name: 'Chick-fil-A',
        fullName: 'Chick-fil-A Gift Card',
        desc: 'Nuggets, sandwiches, and waffle fries at Chick-fil-A. Digital delivery by email.',
        image: 'https://assets.onme.com/static/category-imagery/merchants/logos/chickfila.webp',
        color: 'bg-rose-50 border-rose-200',
        glow: 'rgba(239, 68, 68, 0.45)',
        tiers: [
          { amount: '$10', points: 1500 },
          { amount: '$25', points: 3400 },
          { amount: '$50', points: 6400 },
        ],
      },
    ],
  },
];

const FULL_UNLOCK_LEVEL = 400;

export default function Shop() {
  const queryClient = useQueryClient();
  const [ordering, setOrdering] = useState(false);

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const { data: submissions = [] } = useQuery({
    queryKey: ['mySubmissions'],
    queryFn: () => base44.entities.Submission.filter({ created_by: user?.email }, '-created_date', 2000),
    enabled: !!user?.email,
  });
  const { data: redemptions = [] } = useQuery({
    queryKey: ['myRedemptions'],
    queryFn: () => base44.entities.Redemption.filter({ created_by: user?.email }),
    enabled: !!user?.email,
  });

  const { level } = calcLevelInfo(submissions, user?.xp_bonus || 0);
  const league = getLeague(level);
  const totalPoints = submissions.filter(s => s.status === 'approved').reduce((a, s) => a + (s.points_awarded || 0), 0);
  const spentPoints = redemptions.reduce((a, r) => a + (r.points_spent || 0), 0);
  const availablePoints = totalPoints - spentPoints;

  const firstLockedSection = SHOP_SECTIONS.find(s => level < s.unlockLevel);
  const levelsToFirstUnlock = firstLockedSection ? Math.max(0, firstLockedSection.unlockLevel - level) : 0;
  const shopFullyUnlocked = level >= FULL_UNLOCK_LEVEL;

  const handleOrder = async (item, tier) => {
    if (ordering) return;
    setOrdering(true);
    try {
      await base44.orders.create({
        reward_id:        `${item.id}_${tier.amount.replace('$', '')}`,
        reward_name:      `${item.fullName} — ${tier.amount}`,
        points_spent:     tier.points,
        gift_card_amount: tier.amount,
      });
      queryClient.invalidateQueries({ queryKey: ['myRedemptions'] });
      toast.success(`Order placed! Your ${item.fullName} (${tier.amount}) will be emailed within 24–48 hours.`);
    } catch (err) {
      toast.error(err.message || 'Order failed — please try again.');
    } finally {
      setOrdering(false);
    }
  };

  return (
    <div className="pb-8">

      {/* Dark hero — full width across main content area */}
      <div className="-mx-4 -mt-4 lg:-mx-8 lg:-mt-8 mb-6">
        <div className="bg-[#130d25] px-6 pt-7 pb-8">
          <div className="max-w-2xl mx-auto space-y-5">
          {/* Top row: label + points card */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-2">Rewards Store</p>
              <div className="leading-none mb-3">
                <h1 className="font-black text-white" style={{ fontSize: 'clamp(2.8rem, 11vw, 4.5rem)', lineHeight: 0.95 }}>
                  Intellix
                </h1>
                <h1 className="font-black text-violet-400" style={{ fontSize: 'clamp(2.8rem, 11vw, 4.5rem)', lineHeight: 0.95 }}>
                  Shop
                </h1>
              </div>
              <p className="text-white/50 text-sm leading-relaxed">Study hard. Earn points. Get real rewards.</p>
            </div>
            {/* Points card */}
            <div className="bg-white/10 rounded-2xl px-4 py-3 text-center shrink-0 min-w-[90px]">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-1">Available</p>
              <p className="text-4xl font-black text-white leading-none">{availablePoints.toLocaleString()}</p>
              <div className="flex items-center justify-center gap-1 mt-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <p className="text-[10px] text-white/50">Lv. {level} · {league.name}</p>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div>
            <div className="flex justify-between text-[10px] text-white/40 mb-1.5 font-semibold">
              <span>Shop progress</span>
              <span>Lv.{level} / {FULL_UNLOCK_LEVEL} to unlock everything</span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <motion.div className="h-full bg-violet-400 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((level / FULL_UNLOCK_LEVEL) * 100, 100)}%` }}
                transition={{ duration: 1.2, ease: 'easeOut' }} />
            </div>
          </div>
          </div>{/* end max-w-2xl */}
        </div>{/* end bg */}
      </div>{/* end -mx-4 */}

      {/* Content */}
      <div className="max-w-2xl mx-auto space-y-5">

        {/* How it works */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { Icon: BookOpen, bg: 'bg-violet-100', iconColor: 'text-violet-500', title: 'Study & Earn',   desc: 'Complete quizzes to earn points' },
            { Icon: Gift,     bg: 'bg-rose-100',   iconColor: 'text-rose-500',   title: 'Choose Reward',  desc: 'Pick a gift card & denomination' },
            { Icon: Mail,     bg: 'bg-amber-100',  iconColor: 'text-amber-600',  title: 'Get by Email',   desc: 'Digital code within 48h' },
          ].map(h => (
            <div key={h.title} className="bg-white rounded-2xl border border-border p-4 text-center">
              <div className={`w-12 h-12 rounded-full ${h.bg} flex items-center justify-center mx-auto mb-2`}>
                <h.Icon className={`w-5 h-5 ${h.iconColor}`} />
              </div>
              <p className="font-black text-sm text-foreground">{h.title}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{h.desc}</p>
            </div>
          ))}
        </div>

        {/* Shop sections */}
        {SHOP_SECTIONS.map((section, si) => {
          const unlocked = level >= section.unlockLevel;
          return (
            <motion.div key={section.unlockLevel}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: si * 0.04 }}>

              {/* Section header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded border-2 border-border flex items-center justify-center shrink-0">
                    {unlocked && <div className="w-2.5 h-2.5 rounded-sm bg-primary" />}
                  </div>
                  <p className={`text-sm font-bold ${unlocked ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {section.title}
                  </p>
                </div>
                {!unlocked && (
                  <p className="text-xs text-muted-foreground font-semibold">
                    {section.unlockLevel - level} levels away
                  </p>
                )}
              </div>

              {unlocked ? (
                /* Unlocked: full ShopCards */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {section.items.map(item => (
                    <ShopCard
                      key={item.id}
                      item={item}
                      section={section}
                      availablePoints={availablePoints}
                      onOrder={handleOrder}
                      ordering={ordering}
                    />
                  ))}
                </div>
              ) : (
                /* Locked: compact glow-icon grid */
                <div className="bg-white border border-border rounded-2xl overflow-hidden">
                  <div className="grid grid-cols-2 divide-x divide-y divide-border">
                    {section.items.map(item => (
                      <div key={item.id} className="flex flex-col items-center justify-center py-6 px-4 gap-2">
                        <div className="relative w-16 h-16 flex items-center justify-center">
                          <div className="absolute inset-0 rounded-full"
                            style={{ background: `radial-gradient(circle, ${item.glow} 0%, transparent 70%)` }} />
                          <div className="relative w-8 h-8 bg-white rounded-xl shadow-sm border border-white/80 flex items-center justify-center">
                            <div className="w-4 h-4 rounded-sm border-2 border-slate-300" />
                          </div>
                        </div>
                        <p className="text-xs font-semibold text-muted-foreground">{item.name}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}

        {/* CTA banner (shown if shop not fully unlocked) */}
        {!shopFullyUnlocked && (
          <div className="bg-[#2d1f6e] rounded-2xl px-5 py-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <div className="w-5 h-5 rounded border-2 border-white/40 flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-sm bg-white/40" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-white text-sm">Level up to unlock rewards</p>
              <p className="text-white/50 text-xs mt-0.5">
                {levelsToFirstUnlock > 0
                  ? `${levelsToFirstUnlock} more levels until the shop opens`
                  : `${FULL_UNLOCK_LEVEL - level} more levels to unlock everything`}
              </p>
            </div>
            <Link to="/quiz">
              <Button size="sm" className="bg-white text-[#2d1f6e] hover:bg-white/90 rounded-xl font-bold shrink-0 whitespace-nowrap">
                Study now <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Gift cards are delivered digitally within 24–48 hours.{' '}
            <a href="https://mail.google.com/mail/?view=cm&to=intellix.study.app@gmail.com" target="_blank" rel="noopener noreferrer" className="text-primary font-semibold hover:underline">
              Contact us
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

function ShopCard({ item, section, availablePoints, onOrder, ordering }) {
  const [tierIdx, setTierIdx] = useState(0);
  const tier = item.tiers[tierIdx];
  const canAfford = availablePoints >= tier.points;

  return (
    <div className={`bg-white rounded-2xl border-2 overflow-hidden flex flex-col transition-all
      ${canAfford ? `${item.color} hover:shadow-lg hover:-translate-y-0.5` : 'border-border'}`}>

      <div className="w-full h-40 bg-muted overflow-hidden shrink-0 flex items-center justify-center p-6">
        <img
          src={item.image}
          alt={item.fullName}
          className="w-full h-full object-contain"
          loading="lazy"
          onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }}
        />
        <div style={{ display: 'none' }} className="w-full h-full items-center justify-center bg-gradient-to-br from-violet-100 to-purple-200">
          <span className="text-4xl font-black text-violet-400">{item.fullName[0]}</span>
        </div>
      </div>

      <div className="flex flex-col flex-1 p-4 gap-3">
        <div>
          <p className="font-black text-sm text-foreground leading-tight">{item.fullName}</p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.desc}</p>
        </div>

        <div className="relative">
          <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1">
            Select Amount
          </label>
          <div className="relative">
            <select
              value={tierIdx}
              onChange={e => setTierIdx(Number(e.target.value))}
              className="w-full appearance-none bg-secondary border border-border rounded-xl px-3 py-2 pr-8 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
            >
              {item.tiers.map((t, i) => (
                <option key={i} value={i}>{t.amount} — {t.points.toLocaleString()} pts</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span className={`text-sm font-black ${canAfford ? 'text-amber-600' : 'text-rose-500'}`}>
              {tier.points.toLocaleString()} pts
            </span>
            {!canAfford && (
              <span className="text-[10px] text-rose-400 font-semibold ml-1">
                (need {(tier.points - availablePoints).toLocaleString()} more)
              </span>
            )}
          </div>
          <Button
            size="sm"
            onClick={() => onOrder(item, tier)}
            disabled={!canAfford || ordering}
            className={`rounded-xl text-xs font-bold h-8 min-w-[80px] ${
              canAfford ? `bg-gradient-to-r ${section.gradient} text-white border-0 hover:opacity-90 shadow-sm` : ''
            }`}
          >
            {ordering ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : !canAfford ? 'Not enough' : 'Order'}
          </Button>
        </div>
      </div>
    </div>
  );
}
