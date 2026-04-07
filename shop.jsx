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
    title: 'Level 50 — Starter Squishies',
    gradient: 'from-emerald-400 to-teal-500',
    items: [
      {
        id: 'coconut_stress_ball',
        name: 'Coconut Oil Stress Ball',
        desc: 'Slow-rebound malt-filled squeeze ball, 6cm round. Perfect stress relief.',
        cost: 500,
        link: 'https://us.shein.com/1pc-Moldable-Slow-Rebound-Blue-Coconut-Oil-Handmade-Squeezing-Ball-6cm-Round-Malt-Stress-Relief-Squeeze-Toy-Suitable-For-Ideal-Holiday-Gifts-Fun-Cute-Gifts-Birthday-Gifts-Easter-Gifts-Halloween-Gifts-Christmas-Gifts-Party-Favor-Filler-p-417227431.html',
        image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=300&h=300&fit=crop',
        color: 'bg-emerald-50 border-emerald-200',
        badge: 'Stress Relief',
      },
    ],
  },
  {
    unlockLevel: 100,
    title: 'Level 100 — Desk Toys',
    gradient: 'from-violet-500 to-purple-600',
    items: [
      {
        id: 'keyboard_fidget',
        name: 'Keyboard Fidget Keychain',
        desc: 'PVC & acrylic keyboard cap keychain with beads. Stylish desk accessory.',
        cost: 800,
        link: 'https://us.shein.com/1pc-Stress-Relief-Keychain-Fashionable-Keyboard-Cap-Keychain-Novelty-Desktop-Accessory-Stress-Relief-Made-Of-PVC-Acrylic-Metal-With-Beads-And-Faux-Pearl-Trim-Lobster-Clasp-Suitable-For-Hanging-On-Handbags-And-Backpacks-p-62692259.html',
        image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=300&h=300&fit=crop',
        color: 'bg-violet-50 border-violet-200',
        badge: 'Keychain',
      },
      {
        id: 'dumpling_squish',
        name: 'Dumpling Squeeze Ball',
        desc: 'Colorful dumpling sensory fidget toy with steamer. Elastic & stress-relieving.',
        cost: 700,
        link: 'https://us.shein.com/1pc-Daily-Stress-Relief-Toy-Colorful-Dumpling-Squeeze-Ball-Sensory-Fidget-Toy-Squeeze-Dough-Ball-Stress-Relief-Hand-Toy-Elastic-Tabletop-Toy-With-Steamer-Game-And-Party-Favor-Suitable-As-Gift-Or-Party-Favor-p-422706828.html',
        image: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=300&h=300&fit=crop',
        color: 'bg-pink-50 border-pink-200',
        badge: 'Fan Favorite',
      },
    ],
  },
  {
    unlockLevel: 150,
    title: 'Level 150 — Squishy Collection',
    gradient: 'from-pink-500 to-rose-500',
    items: [
      {
        id: 'bear_squishy',
        name: 'Teddy Bear Candy Squishy',
        desc: 'Slow-rebound malt-filled teddy bear squishy. Ultra soft sensory toy.',
        cost: 1000,
        link: 'https://us.shein.com/1-4pcs-Teddy-Bear-Candy-Ball-Squeeze-Toy-Anxiety-Relief-Concentration-Aid-Malt-Filling-Sensory-Game-Squeezy-Toy-Sensory-Stress-Relief-Toy-Slow-Rebound-Squeeze-Toy-Birthday-Party-Small-Gift-Gift-Bag-Filler-p-356971339.html',
        image: 'https://images.unsplash.com/photo-1559454403-b8fb88521f11?w=300&h=300&fit=crop',
        color: 'bg-amber-50 border-amber-200',
        badge: 'Top Pick',
      },
      {
        id: 'oreo_squishy',
        name: 'Oreo Taba Squishy',
        desc: 'Ultra-soft taba squishy for adult anxiety relief. Desk relaxation toy.',
        cost: 900,
        link: 'https://us.shein.com/1PC-Ultra-Soft-Taba-Squishy-For-Adult-Anxiety-Relief-And-Decompression-Office-Desk-Relaxation-Toys-Sensory-Stress-Relief-For-Focus-And-CalmMen-And-Women-p-415545971.html',
        image: 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=300&h=300&fit=crop',
        color: 'bg-slate-50 border-slate-200',
        badge: 'Office Friendly',
      },
    ],
  },
  {
    unlockLevel: 200,
    title: 'Level 200 — Cat & Animal Squishies',
    gradient: 'from-cyan-500 to-blue-600',
    items: [
      {
        id: 'cat_paw_squishy',
        name: 'Cat Paw Taba Squishy',
        desc: 'Jumbo soft cat/bear paw squishy. Portable fidget toy, adorable design.',
        cost: 1400,
        link: 'https://us.shein.com/1-6-12PCS-Jumbo-Tabas-Squishy-Cute-Stress-Relief-Cat-Bear-Paws-Squishy-Toy-Fidget-Toy-Soft-And-Cute-Portable-Fidget-Squeeze-Toys-Office-Stress-Relief-Toys-Children-s-Gifts-Children-s-Toys-Girls-Toys-Boy-Toys-Sensory-Toys-Girls-Gifts-Party-Favors-For-Kids-Girls-Games-Boy-s-Games-Children-s-Games-Ideal-Holiday-Gifts-Party-Favors-Gift-Bag-Fillers-Classroom-Prizes-Party-Bag-Fillers-Party-Bag-Fillers-Toys-Birthday-Party-Favors-Easter-Gift-Easter-Toy-Easter-Basket-Gifts-Funny-Gifts-p-51642303.html',
        image: 'https://images.unsplash.com/photo-1513245543132-31f507417b26?w=300&h=300&fit=crop',
        color: 'bg-orange-50 border-orange-200',
        badge: 'Best Seller',
      },
      {
        id: 'chicken_squishy',
        name: 'Chicken Taba Squishy',
        desc: 'Cute simulated chicken slow-rising squeeze toy. Fun for kids and adults.',
        cost: 1200,
        link: 'https://us.shein.com/1-2-3-5PCS-Cute-Stress-Reducing-Simulated-Chicken-Soft-Rising-Squeeze-Toy-For-Stress-Relief-Anxiety-Sticky-Fidget-Toy-For-Kids-Adults-Anti-Stress-Hand-Toy-Cute-Stuff-Taba-Squishy-Fun-Cute-Gift-Festival-Gifts-Birthday-Gifts-Easter-Gifts-Halloween-Gifts-p-62281878.html',
        image: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=300&h=300&fit=crop',
        color: 'bg-yellow-50 border-yellow-200',
        badge: 'Super Cute',
      },
    ],
  },
  {
    unlockLevel: 250,
    title: 'Level 250 — Mini Sensory Pack',
    gradient: 'from-amber-400 to-orange-500',
    items: [
      {
        id: 'textured_stress_balls',
        name: 'Textured Mini Stress Balls',
        desc: 'High-density solid squishy mini balls. Pack of sensory fidgets for classroom.',
        cost: 1600,
        link: 'https://us.shein.com/1-6Inch-Textured-Mini-Stress-Balls-1-2-3-6-9Pack-High-Density-Solid-Squishy-Toys-1-6-Small-Sensory-Fidget-For-Kids-Adults-Quiet-Anxiety-Relief-Item-For-Classroom-Malt-Sugar-Filled-Prizes-For-Students-p-76698168.html',
        image: 'https://images.unsplash.com/photo-1585399000684-d2f72660f092?w=300&h=300&fit=crop',
        color: 'bg-green-50 border-green-200',
        badge: 'Multi-Pack',
      },
      {
        id: 'bread_squishy_1',
        name: 'Bread Squishy Toy',
        desc: 'Soft squishable bread squeeze toy. Slow rebound, perfect for stress relief.',
        cost: 1500,
        link: 'https://us.shein.com/1pc-New-Soft-Squishable-Bread-Squeeze-Toy-Slow-Rebound-Stress-Relief-Fidget-Toy-Perfect-For-Office-Birthday-Christmas-Halloween-Gifts-p-408012231.html',
        image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=300&h=300&fit=crop',
        color: 'bg-amber-50 border-amber-200',
        badge: 'Slow Rebound',
      },
    ],
  },
  {
    unlockLevel: 300,
    title: 'Level 300 — Premium Squishies',
    gradient: 'from-rose-500 to-pink-600',
    items: [
      {
        id: 'bread_squishy_2',
        name: 'Realistic Bread Squishy',
        desc: 'Soft realistic bread squishy, travel-friendly fidget toy with slow rebound.',
        cost: 2000,
        link: 'https://us.shein.com/1pc-Soft-Realistic-Bread-Squishy-Toy-Slow-Rebound-Squeeze-Stress-Relief-Toy-Fidget-Toy-Soft-Toy-Squishy-Toy-Fidget-Toy-Stitch-Toys-Travel-Toys-Classroom-Fidget-Toys-Mini-Bath-Toys-Christmas-Stationery-Stress-Ball-Birthday-Gift-Perfect-Gift-Gift-Toys-Games-Easter-Gift-Christmas-Gift-Halloween-Gift-Christmas-Eve-Gift-p-408018234.html',
        image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=300&h=300&fit=crop',
        color: 'bg-rose-50 border-rose-200',
        badge: 'Realistic',
      },
      {
        id: 'pig_bread_squishy',
        name: 'Pig Bread Squishy',
        desc: 'Cute pig bread squeeze toy. Soft slow-rebound stress relief fidget.',
        cost: 1900,
        link: 'https://us.shein.com/1pc-New-Soft-Squishy-Pig-Bread-Squeeze-Toy-Stress-Relief-Slow-Rebound-Fidget-Toy-Perfect-Gift-For-Birthday-Christmas-Halloween-p-408392966.html',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&h=300&fit=crop',
        color: 'bg-pink-50 border-pink-200',
        badge: 'Adorable',
      },
    ],
  },
  {
    unlockLevel: 350,
    title: 'Level 350 — Food Squishies',
    gradient: 'from-lime-500 to-green-600',
    items: [
      {
        id: 'watermelon_squishy',
        name: 'Watermelon Squishy (2pc)',
        desc: 'Realistic watermelon design soft-touch slow rebound squishy. Stretchable sensory toy.',
        cost: 2500,
        link: 'https://us.shein.com/2pcs-Watermelon-Squeeze-Toy-Realistic-Watermelon-Design-Soft-Touch-Slow-Rebound-Soft-Stress-Relief-Toy-Fun-And-Stress-Relieving-Squishy-Toy-For-Easter-Christmas-Halloween-Gifts-Squeeze-Food-Stress-Relief-Toy-Slow-Rebound-Anti-Pressure-Artifact-Realistic-Simulation-Squeeze-Stretchable-Sensory-Desktop-Toy-Relieve-Anxiety-Office-Relaxation-Home-Decor-Best-Gift-For-Family-And-Friends-p-411404012.html',
        image: 'https://images.unsplash.com/photo-1571680322279-a226e6a4cc2a?w=300&h=300&fit=crop',
        color: 'bg-green-50 border-green-200',
        badge: '2-Pack',
      },
      {
        id: 'snowflake_cube',
        name: 'Snowflake Ice Cube Stress Ball',
        desc: 'Snowflake design silent square squishy ball. Soothes anxiety, soft-touch.',
        cost: 2200,
        link: 'https://us.shein.com/1pc-Snowflake-Ice-Cube-Stress-Relief-Ball-Helps-You-Relax-Snowflake-Design-Silent-Square-Shape-Can-Soothe-Anxiety-Soft-Touch-Slow-Rebound-Suitable-For-Classroom-Rewards-Comforting-Children-And-Adults-Slow-Rebound-Rubber-Sensory-Toy-Halloween-Christmas-Gift-Taba-Squisy-Party-Favor-Bag-Filler-Toy-Sensory-Toy-p-159533931.html',
        image: 'https://images.unsplash.com/photo-1546074177-ffdda98d214f?w=300&h=300&fit=crop',
        color: 'bg-cyan-50 border-cyan-200',
        badge: 'Silent',
      },
    ],
  },
  {
    unlockLevel: 400,
    title: 'Level 400 — Elite Collection',
    gradient: 'from-amber-500 to-yellow-500',
    items: [
      {
        id: 'cheese_stress',
        name: 'Giant Cheese Stress Toy (3pc)',
        desc: 'Extra large soft squishy cheese blocks. 4.25" giant stress ball for adults.',
        cost: 3500,
        link: 'https://us.shein.com/POKOJA-LAND-3pcs-Squeeze-Cheese-Extra-Large-Soft-Squishy-Cheese-Blocks-Gag-Gift-Adult-Novelty-Toys-4-25-Giant-Stress-Ball-Adult-Sensory-Fidget-Toys-Sunshine-Entertainment-p-419120974.html',
        image: 'https://images.unsplash.com/photo-1452195100486-9cc805987862?w=300&h=300&fit=crop',
        color: 'bg-yellow-50 border-yellow-200',
        badge: 'Giant Size',
      },
      {
        id: 'pink_cake_squishy',
        name: 'Pink Cake Squishy',
        desc: 'Cute slow-rebound pink cake squeeze toy. Adorable birthday/party favor.',
        cost: 3000,
        link: 'https://us.shein.com/1pc-Pink-Slow-Rebound-Cute-Food-Squeeze-Toy-Stress-Relief-Toy-Adorable-Cake-Squeezy-Toy-Birthday-Gift-Party-Favor-p-115112622.html',
        image: 'https://images.unsplash.com/photo-1557308536-ee471ef2c390?w=300&h=300&fit=crop',
        color: 'bg-pink-50 border-pink-200',
        badge: 'Elite',
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