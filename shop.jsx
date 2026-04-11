import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { calcLevelInfo, getLeague } from '@/components/shared/LevelXPBar';
import { motion } from 'framer-motion';
import { Lock, CheckCircle2, ExternalLink, Star, ShoppingBag, BookOpen, Gift, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const FULL_UNLOCK_LEVEL = 400;

const SHOP_SECTIONS = [
  {
    unlockLevel: 50,
    title: 'Level 50 — Food Gift Cards',
    gradient: 'from-emerald-400 to-teal-500',
    items: [
      {
        id: 'coconut_stress_ball',
        name: 'Starbucks Gift Card',
        desc: 'A gift card to buy drinks from Starbucks',
        cost: 600,
        image: 'https://unsplash.com/photos/white-and-green-starbucks-cup-on-brown-wooden-table-L5_C17ltcKo',
        color: 'bg-emerald-50 border-emerald-200',
      },
    ],
  },
  {
    unlockLevel: 100,
    title: 'Level 100 — eCommerce Gift Cards',
    gradient: 'from-violet-500 to-purple-600',
    items: [
      {
        id: 'amazon_gift_card',
        name: 'Amazon Gift Card',
        desc: 'A gift card to buy whatever you want from Amazon',
        cost: 800,
        image: 'https://www.citypng.com/public/uploads/preview/50-dollar-amazon-gift-card-701751695133863avcywx1srq.png',
        color: 'bg-violet-50 border-violet-200',
      },
      {
        id: 'shein_gift_card',
        name: 'Shein Gift Card',
        desc: 'Money to buy cosmetics, clothes, and toys at Shein',
        cost: 700,
        image: 'https://i0.wp.com/giftcard8.com/blog/wp-content/uploads/2023/11/Everything-you-wanted-to-know-about-Shein-gift-card-.jpg?resize=1024%2C394&ssl=1',
        color: 'bg-pink-50 border-pink-200',
      },
    ],
  },
  {
    unlockLevel: 150,
    title: 'Level 150 — Fun Gift Cards',
    gradient: 'from-pink-500 to-rose-500',
    items: [
      {
        id: 'sephora_gift_card',
        name: 'Sephora Gift Card',
        desc: 'A gift card to buy makeup, skincare, and more at Sephora',
        cost: 1000,
        image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT1Wwf9PyHRVh0Yfyt9IN9vRfVoaw9mBfvF1A&s',
        color: 'bg-amber-50 border-amber-200',
      },
      {
        id: 'roblox_gift_card',
        name: 'Roblox Gift Card',
        desc: 'A gift card to buy passes, skins, and other virtual items.',
        cost: 900,
        image: 'https://m.media-amazon.com/images/I/71SCmt-VjYL.jpg',
        color: 'bg-slate-50 border-slate-200',
      },
    ],
  },
  {
    unlockLevel: 200,
    title: 'Level 200 — Cash Gift Cards',
    gradient: 'from-cyan-500 to-blue-600',
    items: [
      {
        id: 'visa_gift_card',
        name: 'Visa Gift Card',
        desc: 'A cash gift card to buy anything, from anywhere.',
        cost: 1400,
        image: 'https://productimages.nimbledeals.com/nimblebuy/visa-gift-card-133-62711-regular.jpg',
        color: 'bg-orange-50 border-orange-200',
      },
      {
        id: 'mastercard_gift_card',
        name: 'Mastercard Gift Card',
        desc: 'A cash gift card to buy anything, from anywhere',
        cost: 1200,
        image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRx_Wo6CniSwdiq4_687AttT_G_xwRDldKR7w&s',
        color: 'bg-yellow-50 border-yellow-200',
      },
    ],
  },
  {
    unlockLevel: 250,
    title: 'Level 250 — More Gift Cards',
    gradient: 'from-amber-400 to-orange-500',
    items: [
      {
        id: 'target_gift_card',
        name: 'Target Gift Card',
        desc: 'Money to buy items from Target.',
        cost: 1600,
        image: 'https://thumbs.dreamstime.com/b/everett-wa-usa-target-gift-card-stack-other-cards-192383422.jpg',
        color: 'bg-green-50 border-green-200',
      },
      {
        id: 'bread_squishy_toy',
        name: 'Bread Squishy Toy',
        desc: 'Soft squishable bread squeeze toy. Slow rebound, perfect for stress relief.',
        cost: 1500,
        link: 'https://us.shein.com/1pc-New-Soft-Squishable-Bread-Squeeze-Toy-Slow-Rebound-Stress-Relief-Fidget-Toy-Perfect-For-Office-Birthday-Christmas-Halloween-Gifts-p-408012231.html',
        image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=300&h=300&fit=crop',
        color: 'bg-amber-50 border-amber-200',
      },
    ],
  },
  {
    unlockLevel: 300,
    title: 'Level 300 — Clothing Gift Cards',
    gradient: 'from-rose-500 to-pink-600',
    items: [
      {
        id: 'pacsun_gift_card',
        name: 'Pacsun Gift Card',
        desc: 'A gift card to buy all sorts of clothes at Pacsun.',
        cost: 2000,
        image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=300&h=300&fit=crop',
        color: 'bg-rose-50 border-rose-200',
      },
      {
        id: 'uniqlo_gift_card',
        name: 'UNIQLO Gift Card',
        desc: 'A gift card to buy clothes at UNIQLO.',
        cost: 1900,
        image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTRi3PALtfboYXfDuAFTQ40qWracf0mKRnqtA&s',
        color: 'bg-pink-50 border-pink-200',
      },
    ],
  },
  {
    unlockLevel: 350,
    title: 'Level 350 — Shoes',
    gradient: 'from-lime-500 to-green-600',
    items: [
      {
        id: 'adidas_gift_card',
        name: 'Adidas Gift Card',
        desc: 'A gift card to buy shoes and atheletic apparel from Adidas.',
        cost: 2500,
        image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT5OS_Fs1K5WvPYKnKsOg0bUR2TrZRBWyh2sQ&s',
        color: 'bg-green-50 border-green-200',
      },
      {
        id: 'nike_gift_card',
        name: 'Nike Gift Card',
        desc: 'A gift card to buy items from Nike.',
        cost: 2200,
        image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTdnBSUatFGWtnndGAB3bidVOuhPCAoB8FMaQ&sp',
        color: 'bg-cyan-50 border-cyan-200',
      },
    ],
  },
  {
    unlockLevel: 400,
    title: 'Level 400 — Food Gift Cards',
    gradient: 'from-amber-500 to-yellow-500',
    items: [
      {
        id: 'raising_canes_gift_card',
        name: 'Raising Canes Gift Card',
        desc: 'A gift card to buy food at Raising Canes.',
        cost: 3500,
        image: 'https://raisingcanesgear.com/cdn/shop/files/Cane_s_Logo_Branded_Gift_Card_1200x1200_crop_center.jpg?v=1750295655',
        color: 'bg-yellow-50 border-yellow-200',
      },
      {
        id: 'chikfila_gift_card',
        name: 'Chik-fil-a Gift Card',
        desc: 'A gift card to buy food at Chik-fil-a.',
        cost: 3000,
        image: 'https://bhn.imgix.net/sites/default/files/2025-07/ChickfilA-GC-0322.webp?fm=webp&ixlib=php-4.1.0',
        color: 'bg-pink-50 border-pink-200',
      },
    ],
  },
];

export default function Shop() {
  const queryClient = useQueryClient();

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
  const totalPoints = submissions.filter(s => s.status === 'approved').reduce((a, s) => a + (s.points_awarded || 0), 0);
  const spentPoints = redemptions.reduce((a, r) => a + (r.points_spent || 0), 0);
  const availablePoints = totalPoints - spentPoints;

  const ownedIds = new Set(redemptions.map(r => r.reward_id));

  const redeemMutation = useMutation({
    mutationFn: async (item) => {
      await base44.entities.Redemption.create({
        reward_id: item.id,
        reward_name: item.name,
        points_spent: item.cost,
        status: 'pending',
      });
    },
    onSuccess: (_, item) => {
      queryClient.invalidateQueries({ queryKey: ['myRedemptions'] });
      toast.success(`Redeemed "${item.name}"! Check back for delivery details.`);
    },
  });

  const handleBuy = (item, section) => {
    if (level < section.unlockLevel) return;
    if (availablePoints < item.cost) { toast.error('Not enough points!'); return; }
    if (ownedIds.has(item.id)) { toast.info('You already own this item!'); return; }
    redeemMutation.mutate(item);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header Banner */}
      <div className="relative rounded-3xl overflow-hidden text-white p-8"
        style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 60%, #f59e0b 100%)' }}>
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-2 right-8 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-10 left-4 w-64 h-64 bg-black/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/3 w-32 h-32 bg-white/5 rounded-full blur-xl" />
        </div>
        <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ShoppingBag className="w-6 h-6 text-white" />
              <h1 className="text-3xl font-black tracking-tight">Intellix Shop</h1>
            </div>
            <p className="text-white/80 text-sm">Study hard. Earn points. Get real rewards shipped to you.</p>
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

      {/* How it works */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { Icon: BookOpen, gradient: 'from-violet-500 to-purple-600', title: 'Study & Earn', desc: 'Complete quizzes to earn points' },
          { Icon: Gift, gradient: 'from-pink-500 to-rose-500', title: 'Redeem', desc: 'Spend points on physical rewards' },
          { Icon: Package, gradient: 'from-amber-400 to-orange-500', title: 'We Ship It', desc: 'We ship your reward directly to you' },
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

      {/* Shop sections */}
      {SHOP_SECTIONS.map((section, si) => {
        const unlocked = level >= section.unlockLevel;
        return (
          <motion.div key={section.unlockLevel}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: si * 0.05 }}>
            {/* Section divider */}
            <div className="flex items-center gap-3 mb-5">
              <div className={`flex-1 h-px ${unlocked ? 'bg-primary/20' : 'bg-border'}`} />
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-black border-2 ${
                unlocked
                  ? `bg-gradient-to-r ${section.gradient} text-white border-transparent shadow-md`
                  : 'bg-muted border-border text-muted-foreground'
              }`}>
                {!unlocked && <Lock className="w-3.5 h-3.5" />}
                {unlocked && <CheckCircle2 className="w-3.5 h-3.5" />}
                {section.title}
              </div>
              <div className={`flex-1 h-px ${unlocked ? 'bg-primary/20' : 'bg-border'}`} />
            </div>

            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 relative ${!unlocked ? 'select-none' : ''}`}>
              {section.items.map(item => {
                const owned = ownedIds.has(item.id);
                return (
                  <ShopItem
                    key={item.id}
                    item={item}
                    section={section}
                    unlocked={unlocked}
                    canAfford={availablePoints >= item.cost}
                    owned={owned}
                    onBuy={() => handleBuy(item, section)}
                    loading={redeemMutation.isPending}
                  />
                );
              })}

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

      <ContactFooter />
    </div>
  );
}

function ShopItem({ item, section, unlocked, canAfford, owned, onBuy, loading }) {
  return (
    <div className={`bg-white rounded-2xl border-2 p-5 flex gap-4 transition-all relative overflow-hidden group
      ${owned ? 'border-emerald-300 bg-emerald-50/50' : unlocked && canAfford ? `${item.color} hover:shadow-lg` : 'border-border'}
      ${!unlocked ? 'opacity-50' : ''}`}>
      <div className="w-24 h-24 rounded-xl overflow-hidden shrink-0 bg-muted">
        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
      </div>
      <div className="flex-1 min-w-0 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[10px] font-black uppercase tracking-wide text-primary bg-primary/10 px-2 py-0.5 rounded-full">{item.badge}</span>
            </div>
            <p className="font-black text-sm text-foreground leading-tight">{item.name}</p>
          </div>
          {owned && <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />}
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
        <div className="mt-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span className="text-sm font-black text-amber-600">{item.cost.toLocaleString()} pts</span>
          </div>
          <div className="flex items-center gap-2">
            {item.link && (
              <a href={item.link} target="_blank" rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 font-semibold">
                <ExternalLink className="w-3 h-3" /> View
              </a>
            )}
            {!owned ? (
              <Button
                size="sm"
                onClick={onBuy}
                disabled={!unlocked || !canAfford || loading}
                className={`rounded-xl text-xs font-bold h-8 ${
                  unlocked && canAfford ? `bg-gradient-to-r ${section.gradient} text-white border-0 hover:opacity-90` : ''
                }`}
              >
                {!unlocked ? 'Locked' : !canAfford ? 'Need more pts' : 'Redeem'}
              </Button>
            ) : (
              <span className="text-xs font-black text-emerald-600 bg-emerald-100 px-2.5 py-1 rounded-full">Owned</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ContactFooter() {
  return (
    <div className="text-center py-6 border-t border-border">
      <p className="text-sm text-muted-foreground">
        Questions about your reward?{' '}
        <a href="mailto:intellixapp.team@gmail.com" className="text-primary font-semibold hover:underline">
          intellixapp.team@gmail.com
        </a>
      </p>
    </div>
  );
}