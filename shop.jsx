import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { calcLevelInfo, getLeague } from '@/components/shared/LevelXPBar';
import { motion } from 'framer-motion';
import { Lock, CheckCircle2, Star, ShoppingBag, BookOpen, Gift, Mail, ChevronDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// ─────────────────────────────────────────────────────────────────────────────
// SHOP CATALOG
//
// Each section unlocks at a specific level.
// Each item has a `tiers` array — edit the `points` values here to change
// how many points each gift card denomination costs.
//
// Format: { amount: '$X', points: NUMBER }
// ─────────────────────────────────────────────────────────────────────────────
const SHOP_SECTIONS = [
  {
    unlockLevel: 50,
    title: 'Level 50 — Food & Coffee',
    gradient: 'from-emerald-400 to-teal-500',
    items: [
      {
        id: 'starbucks_gc',
        name: 'Starbucks Gift Card',
        desc: 'Your favorite drinks and snacks at Starbucks. Delivered digitally to your email.',
        image: 'https://m.media-amazon.com/images/I/61WkK8hCKLL._AC_UF894,1000_QL80_.jpg',
        color: 'bg-emerald-50 border-emerald-200',
        // ── Edit point costs for each denomination ──────────────────────────
        tiers: [
          { amount: '$5',  points: 500  },
          { amount: '$10', points: 950  },
          { amount: '$15', points: 1350 },
          { amount: '$25', points: 2100 },
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
        name: 'Amazon Gift Card',
        desc: 'Shop anything on Amazon. Works across all categories. Sent to your email instantly.',
        image: 'https://m.media-amazon.com/images/I/71y5TQEQS4L._AC_UF894,1000_QL80_.jpg',
        color: 'bg-violet-50 border-violet-200',
        // ── Edit point costs for each denomination ──────────────────────────
        tiers: [
          { amount: '$10', points: 1000 },
          { amount: '$25', points: 2400 },
          { amount: '$50', points: 4600 },
        ],
      },
      {
        id: 'shein_gc',
        name: 'Shein Gift Card',
        desc: 'Clothing, accessories, and more at Shein. Digital code emailed to you.',
        image: 'https://i0.wp.com/giftcard8.com/blog/wp-content/uploads/2023/11/Everything-you-wanted-to-know-about-Shein-gift-card-.jpg?resize=800%2C394&ssl=1',
        color: 'bg-pink-50 border-pink-200',
        // ── Edit point costs for each denomination ──────────────────────────
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
    title: 'Level 150 — Beauty & Gaming',
    gradient: 'from-pink-500 to-rose-500',
    items: [
      {
        id: 'sephora_gc',
        name: 'Sephora Gift Card',
        desc: 'Makeup, skincare, and fragrance at Sephora. Digital delivery to your email.',
        image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT1Wwf9PyHRVh0Yfyt9IN9vRfVoaw9mBfvF1A&s',
        color: 'bg-rose-50 border-rose-200',
        // ── Edit point costs for each denomination ──────────────────────────
        tiers: [
          { amount: '$10', points: 1100 },
          { amount: '$25', points: 2600 },
          { amount: '$50', points: 4900 },
        ],
      },
      {
        id: 'roblox_gc',
        name: 'Roblox Gift Card',
        desc: 'Robux for passes, skins, and virtual items in Roblox. Emailed as a digital code.',
        image: 'https://m.media-amazon.com/images/I/71SCmt-VjYL.jpg',
        color: 'bg-slate-50 border-slate-200',
        // ── Edit point costs for each denomination ──────────────────────────
        tiers: [
          { amount: '$10', points: 1000 },
          { amount: '$25', points: 2300 },
          { amount: '$50', points: 4300 },
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
        name: 'Visa Gift Card',
        desc: 'Spend anywhere Visa is accepted. Fully digital — no physical card required.',
        image: 'https://productimages.nimbledeals.com/nimblebuy/visa-gift-card-133-62711-regular.jpg',
        color: 'bg-blue-50 border-blue-200',
        // ── Edit point costs for each denomination ──────────────────────────
        tiers: [
          { amount: '$25', points: 2900 },
          { amount: '$50', points: 5500 },
          { amount: '$100', points: 10000 },
        ],
      },
      {
        id: 'mastercard_gc',
        name: 'Mastercard Gift Card',
        desc: 'Use online or in-store anywhere Mastercard is accepted. Delivered digitally.',
        image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRx_Wo6CniSwdiq4_687AttT_G_xwRDldKR7w&s',
        color: 'bg-orange-50 border-orange-200',
        // ── Edit point costs for each denomination ──────────────────────────
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
    title: 'Level 250 — Food Delivery & Shopping',
    gradient: 'from-amber-400 to-orange-500',
    items: [
      {
        id: 'target_gc',
        name: 'Target Gift Card',
        desc: 'Shop groceries, electronics, clothing, and more at Target. Digital delivery.',
        image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRhGeMBjSgqMNpJWGm0mIagD4FkqL9i8HnU5A&s',
        color: 'bg-red-50 border-red-200',
        // ── Edit point costs for each denomination ──────────────────────────
        tiers: [
          { amount: '$25', points: 2600 },
          { amount: '$50', points: 4900 },
          { amount: '$100', points: 9000 },
        ],
      },
      {
        id: 'doordash_gc',
        name: 'DoorDash Gift Card',
        desc: 'Order food from thousands of restaurants near you. Digital code sent to your email.',
        image: 'https://m.media-amazon.com/images/I/71GmJ3oo4sL._AC_UF894,1000_QL80_.jpg',
        color: 'bg-orange-50 border-orange-200',
        // ── Edit point costs for each denomination ──────────────────────────
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
        name: 'PacSun Gift Card',
        desc: 'Trendy streetwear and surf-inspired clothing at PacSun. Emailed to you.',
        image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTmI4tD5X-FVCGZ8zYYEpk8UcfFaePeFkqkzQ&s',
        color: 'bg-rose-50 border-rose-200',
        // ── Edit point costs for each denomination ──────────────────────────
        tiers: [
          { amount: '$25', points: 3100 },
          { amount: '$50', points: 5800 },
          { amount: '$100', points: 10500 },
        ],
      },
      {
        id: 'uniqlo_gc',
        name: 'UNIQLO Gift Card',
        desc: 'Clean, quality everyday clothing at UNIQLO. Digital code delivered by email.',
        image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTRi3PALtfboYXfDuAFTQ40qWracf0mKRnqtA&s',
        color: 'bg-pink-50 border-pink-200',
        // ── Edit point costs for each denomination ──────────────────────────
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
    title: 'Level 350 — Sneakers & Athletic',
    gradient: 'from-lime-500 to-green-600',
    items: [
      {
        id: 'adidas_gc',
        name: 'Adidas Gift Card',
        desc: 'Shoes, athletic gear, and streetwear from Adidas. Delivered as a digital code.',
        image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT5OS_Fs1K5WvPYKnKsOg0bUR2TrZRBWyh2sQ&s',
        color: 'bg-green-50 border-green-200',
        // ── Edit point costs for each denomination ──────────────────────────
        tiers: [
          { amount: '$25', points: 3300 },
          { amount: '$50', points: 6100 },
          { amount: '$100', points: 11000 },
        ],
      },
      {
        id: 'nike_gc',
        name: 'Nike Gift Card',
        desc: 'Sneakers, sports apparel, and gear from Nike. Digital gift card, emailed to you.',
        image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTdnBSUatFGWtnndGAB3bidVOuhPCAoB8FMaQ&s',
        color: 'bg-cyan-50 border-cyan-200',
        // ── Edit point costs for each denomination ──────────────────────────
        tiers: [
          { amount: '$25', points: 3100 },
          { amount: '$50', points: 5800 },
          { amount: '$100', points: 10500 },
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
        name: "Raising Cane's Gift Card",
        desc: 'The best chicken fingers around. Digital code for Raising Cane\'s, sent to your email.',
        image: 'https://raisingcanesgear.com/cdn/shop/files/Cane_s_Logo_Branded_Gift_Card_1200x1200_crop_center.jpg?v=1750295655',
        color: 'bg-yellow-50 border-yellow-200',
        // ── Edit point costs for each denomination ──────────────────────────
        tiers: [
          { amount: '$10', points: 1600 },
          { amount: '$25', points: 3700 },
          { amount: '$50', points: 7000 },
        ],
      },
      {
        id: 'chickfila_gc',
        name: 'Chick-fil-A Gift Card',
        desc: 'Nuggets, sandwiches, and waffle fries at Chick-fil-A. Digital delivery by email.',
        image: 'https://bhn.imgix.net/sites/default/files/2025-07/ChickfilA-GC-0322.webp?fm=webp&ixlib=php-4.1.0',
        color: 'bg-rose-50 border-rose-200',
        // ── Edit point costs for each denomination ──────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────

export default function Shop() {
  const queryClient = useQueryClient();
  const [ordering, setOrdering] = useState(false);

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const { data: submissions = [] } = useQuery({
    queryKey: ['mySubmissions'],
    queryFn: () => base44.entities.Submission.filter({ created_by: user?.email }, '-created_date', 200),
    enabled: !!user?.email,
  });
  const { data: redemptions = [] } = useQuery({
    queryKey: ['myRedemptions'],
    queryFn: () => base44.entities.Redemption.filter({ created_by: user?.email }),
    enabled: !!user?.email,
  });

  const { level } = calcLevelInfo(submissions);
  const league = getLeague(level);
  const totalPoints  = submissions.filter(s => s.status === 'approved').reduce((a, s) => a + (s.points_awarded || 0), 0);
  const spentPoints  = redemptions.reduce((a, r) => a + (r.points_spent || 0), 0);
  const availablePoints = totalPoints - spentPoints;

  const handleOrder = async (item, tier) => {
    if (ordering) return;
    setOrdering(true);
    try {
      await base44.orders.create({
        reward_id:        `${item.id}_${tier.amount.replace('$', '')}`,
        reward_name:      `${item.name} — ${tier.amount}`,
        points_spent:     tier.points,
        gift_card_amount: tier.amount,
      });
      queryClient.invalidateQueries({ queryKey: ['myRedemptions'] });
      toast.success(`Order placed! Your ${item.name} (${tier.amount}) will be emailed to you within 24–48 hours.`);
    } catch (err) {
      toast.error(err.message || 'Order failed — please try again.');
    } finally {
      setOrdering(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">

      {/* ── Header Banner ───────────────────────────────────────────���─────── */}
      <div className="relative rounded-3xl overflow-hidden text-white p-8"
        style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 60%, #f59e0b 100%)' }}>
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-2 right-8 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-10 left-4 w-64 h-64 bg-black/10 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ShoppingBag className="w-6 h-6 text-white" />
              <h1 className="text-3xl font-black tracking-tight font-sora">Intellix Shop</h1>
            </div>
            <p className="text-white/80 text-sm">Study hard. Earn points. Get real rewards emailed to you.</p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl px-5 py-4 text-center border border-white/20">
            <p className="text-xs text-white/70 font-semibold uppercase tracking-wide">Available Points</p>
            <p className="text-4xl font-black">{availablePoints.toLocaleString()}</p>
            <p className="text-xs text-white/60 mt-0.5">{league.emoji} Lv.{level} · {league.name}</p>
          </div>
        </div>
        <div className="relative z-10 mt-5">
          <div className="flex justify-between text-xs text-white/70 mb-1.5">
            <span className="font-semibold">Shop progress</span>
            <span>Lv.{level} / {FULL_UNLOCK_LEVEL} to unlock everything</span>
          </div>
          <div className="h-3 bg-white/20 rounded-full overflow-hidden">
            <motion.div className="h-full bg-white rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((level / FULL_UNLOCK_LEVEL) * 100, 100)}%` }}
              transition={{ duration: 1.2, ease: 'easeOut' }} />
          </div>
        </div>
      </div>

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { Icon: BookOpen, gradient: 'from-violet-500 to-purple-600', title: 'Study & Earn',    desc: 'Complete quizzes to earn points' },
          { Icon: Gift,     gradient: 'from-pink-500 to-rose-500',     title: 'Choose a Reward', desc: 'Pick a gift card and denomination' },
          { Icon: Mail,     gradient: 'from-amber-400 to-orange-500',  title: 'Get it by Email', desc: 'We email your digital code within 48h' },
        ].map(h => (
          <div key={h.title} className="bg-white rounded-2xl border border-border p-4 text-center">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${h.gradient} flex items-center justify-center mx-auto mb-2 shadow-md`}>
              <h.Icon className="w-5 h-5 text-white" />
            </div>
            <p className="font-black text-sm text-foreground">{h.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{h.desc}</p>
          </div>
        ))}
      </div>

      {/* ── Shop Sections ─────────────────────────────────────────────────── */}
      {SHOP_SECTIONS.map((section, si) => {
        const unlocked = level >= section.unlockLevel;
        return (
          <motion.div key={section.unlockLevel}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: si * 0.05 }}>

            {/* Section header pill */}
            <div className="flex items-center gap-3 mb-5">
              <div className={`flex-1 h-px ${unlocked ? 'bg-primary/20' : 'bg-border'}`} />
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-black border-2 ${
                unlocked
                  ? `bg-gradient-to-r ${section.gradient} text-white border-transparent shadow-md`
                  : 'bg-muted border-border text-muted-foreground'
              }`}>
                {unlocked ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                {section.title}
              </div>
              <div className={`flex-1 h-px ${unlocked ? 'bg-primary/20' : 'bg-border'}`} />
            </div>

            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 relative ${!unlocked ? 'select-none' : ''}`}>
              {section.items.map(item => (
                <ShopCard
                  key={item.id}
                  item={item}
                  section={section}
                  unlocked={unlocked}
                  availablePoints={availablePoints}
                  onOrder={handleOrder}
                  ordering={ordering}
                />
              ))}

              {/* Locked overlay */}
              {!unlocked && (
                <div className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center gap-3 backdrop-blur-[3px] bg-background/60 z-10 border-2 border-dashed border-border">
                  <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
                    <Lock className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <div className="text-center">
                    <p className="font-black text-foreground text-base">Locked until Level {section.unlockLevel}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{Math.max(0, section.unlockLevel - level)} more levels to go</p>
                  </div>
                  <div className="w-48 h-2.5 bg-muted rounded-full overflow-hidden">
                    <motion.div className={`h-full bg-gradient-to-r ${section.gradient} rounded-full`}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min((level / section.unlockLevel) * 100, 100)}%` }}
                      transition={{ duration: 1, ease: 'easeOut', delay: si * 0.1 }} />
                  </div>
                  <p className="text-xs text-muted-foreground font-semibold">Lv.{level} / {section.unlockLevel}</p>
                </div>
              )}
            </div>
          </motion.div>
        );
      })}

      {/* ── Footer ────────────────────────────────────────────────���───────── */}
      <div className="text-center py-6 border-t border-border space-y-1">
        <p className="text-sm text-muted-foreground">
          Gift cards are delivered digitally to your account email within 24–48 hours.
        </p>
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

// ─────────────────────────────────────────────────────────────────────────────
// ShopCard — individual gift card with tier dropdown + order button
// ─────────────────────────────────────────────────────────────────────────────
function ShopCard({ item, section, unlocked, availablePoints, onOrder, ordering }) {
  const [tierIdx, setTierIdx] = useState(0);
  const tier = item.tiers[tierIdx];
  const canAfford = availablePoints >= tier.points;

  return (
    <div className={`bg-white rounded-2xl border-2 overflow-hidden flex flex-col transition-all
      ${unlocked && canAfford ? `${item.color} hover:shadow-lg hover:-translate-y-0.5` : 'border-border'}
      ${!unlocked ? 'opacity-50' : ''}`}>

      {/* ── Gift card image ──────────────────────────────────────────────── */}
      <div className="w-full h-44 bg-muted overflow-hidden shrink-0">
        <img
          src={item.image}
          alt={item.name}
          className="w-full h-full object-cover object-center"
          loading="lazy"
        />
      </div>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 p-4 gap-3">
        <div>
          <p className="font-black text-sm text-foreground leading-tight">{item.name}</p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.desc}</p>
        </div>

        {/* ── Tier dropdown ─────────────────────────────────────────────── */}
        <div className="relative">
          <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1">
            Select Amount
          </label>
          <div className="relative">
            <select
              value={tierIdx}
              onChange={e => setTierIdx(Number(e.target.value))}
              disabled={!unlocked}
              className="w-full appearance-none bg-secondary border border-border rounded-xl px-3 py-2 pr-8 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer disabled:cursor-not-allowed"
            >
              {item.tiers.map((t, i) => (
                <option key={i} value={i}>
                  {t.amount} — {t.points.toLocaleString()} pts
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        {/* ── Points badge + Order button ───────────────────────────────── */}
        <div className="mt-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span className={`text-sm font-black ${canAfford ? 'text-amber-600' : 'text-rose-500'}`}>
              {tier.points.toLocaleString()} pts
            </span>
            {!canAfford && unlocked && (
              <span className="text-[10px] text-rose-400 font-semibold ml-1">
                (need {(tier.points - availablePoints).toLocaleString()} more)
              </span>
            )}
          </div>

          <Button
            size="sm"
            onClick={() => onOrder(item, tier)}
            disabled={!unlocked || !canAfford || ordering}
            className={`rounded-xl text-xs font-bold h-8 min-w-[80px] ${
              unlocked && canAfford
                ? `bg-gradient-to-r ${section.gradient} text-white border-0 hover:opacity-90 shadow-sm`
                : ''
            }`}
          >
            {ordering ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : !unlocked ? (
              'Locked'
            ) : !canAfford ? (
              'Not enough'
            ) : (
              'Order'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
