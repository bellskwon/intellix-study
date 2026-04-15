import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu, Flame, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Sidebar from '@/components/layout/Sidebar';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
// Redemption entity used by PointsBadge


function PointsBadge({ userEmail }) {
  const { data: submissions = [] } = useQuery({
    queryKey: ['mySubmissions'],
    queryFn: () => base44.entities.Submission.filter({ created_by: userEmail }, '-created_date', 200),
    enabled: !!userEmail,
  });
  const { data: redemptions = [] } = useQuery({
    queryKey: ['myRedemptions'],
    queryFn: () => base44.entities.Redemption.filter({ created_by: userEmail }),
    enabled: !!userEmail,
  });
  const earned = submissions.filter(s => s.status === 'approved').reduce((a, s) => a + (s.points_awarded || 0), 0);
  const spent = redemptions.reduce((a, r) => a + (r.points_spent || 0), 0);
  const available = earned - spent;
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-100">
      <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
      <span className="text-sm font-bold text-amber-600">{available.toLocaleString()}</span>
      <span className="text-xs text-amber-400 font-medium hidden sm:block">pts</span>
    </div>
  );
}

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  return (
    <div className="min-h-screen bg-background font-jakarta">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 bg-white/70 backdrop-blur-xl border-b border-border/50 px-4 lg:px-8 h-16 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden rounded-xl"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>

          <div className="flex-1 lg:flex-none">
            <p className="text-sm font-bold text-foreground hidden lg:block">
              Hey, {user?.display_name?.split(' ')[0] || user?.full_name?.split(' ')[0] || 'Student'} 👋
            </p>
          </div>

          <div className="flex items-center gap-2">
            <PointsBadge userEmail={user?.email} />
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-50 border border-orange-100">
              <Flame className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-bold text-orange-600">{user?.streak_count ?? 0}</span>
              <span className="text-xs text-orange-400 font-medium hidden sm:block">streak</span>
            </div>
            <div className="w-8 h-8 rounded-full gradient-violet flex items-center justify-center text-sm font-bold text-white shadow-md shadow-purple-500/25">
              {user?.avatar_emoji || (user?.display_name?.[0] || user?.full_name?.[0] || '?')}
            </div>
          </div>
        </header>

        <main className="p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}