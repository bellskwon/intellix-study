import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Zap, BarChart3, Users, User, X, Sparkles, FlaskConical, ShoppingBag, Brain, Crown, Archive, UserPlus, Moon, Sun, GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import LevelXPBar, { calcLevelInfo } from '@/components/shared/LevelXPBar';

function useDarkMode() {
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem('intellix_dark') === 'true'; } catch { return false; }
  });
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    try { localStorage.setItem('intellix_dark', String(dark)); } catch {}
  }, [dark]);
  return [dark, () => setDark(d => !d)];
}

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard, color: 'text-violet-500' },
  { path: '/challenge', label: 'Quick Challenge', icon: Zap, color: 'text-amber-500' },
  { path: '/quiz', label: 'Study Quiz', icon: FlaskConical, color: 'text-pink-500' },
  { path: '/questions', label: 'Study Tools', icon: Brain, color: 'text-indigo-500' },
  { path: '/storage', label: 'Storage', icon: Archive, color: 'text-teal-500' },
  { path: '/progress', label: 'My Progress', icon: BarChart3, color: 'text-cyan-500' },
  { path: '/leaderboard', label: 'Leaderboard', icon: Users, color: 'text-emerald-500' },
  { path: '/friends', label: 'Friends', icon: UserPlus, color: 'text-blue-500' },
  { path: '/classroom', label: 'Classroom', icon: GraduationCap, color: 'text-violet-500' },
  { path: '/shop', label: 'Shop', icon: ShoppingBag, color: 'text-orange-500' },
  { path: '/premium', label: 'Go Premium', icon: Crown, color: 'text-amber-500' },
  { path: '/profile', label: 'Profile', icon: User, color: 'text-rose-500' },
];

export default function Sidebar({ open, onClose }) {
  const location = useLocation();
  const [dark, toggleDark] = useDarkMode();

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const { data: submissions = [] } = useQuery({
    queryKey: ['mySubmissions'],
    queryFn: () => base44.entities.Submission.filter({ created_by: user?.email }, '-created_date', 100),
    enabled: !!user?.email,
  });

  const { level } = calcLevelInfo(submissions);
  const STORE_UNLOCK_LEVEL = 50; // first shop tier opens at level 50
  const storeUnlocked = level >= STORE_UNLOCK_LEVEL;

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm" onClick={onClose} />
      )}
      <aside className={cn(
        "fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-border flex flex-col transition-transform duration-300 lg:translate-x-0 shadow-xl lg:shadow-none",
        open ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Logo */}
        <div className="p-5 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5" onClick={onClose}>
            <div className="w-9 h-9 rounded-xl gradient-violet flex items-center justify-center shadow-lg shadow-purple-500/30">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-base font-black font-sora text-foreground tracking-tight">Intellix</span>
              <span className="block text-[10px] text-muted-foreground -mt-0.5 font-medium">Online Study Platform</span>
            </div>
          </Link>
          <button onClick={onClose} className="lg:hidden text-muted-foreground hover:text-foreground p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
          {navItems.map(item => {
            const isActive = location.pathname === item.path;
            const isShop = item.path === '/shop';
            const isPremiumNav = item.path === '/premium';
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 group",
                  isActive
                    ? "bg-primary text-white shadow-lg shadow-primary/30"
                    : isPremiumNav
                    ? "text-amber-600 hover:bg-amber-50"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                  isActive ? "bg-white/20" : isPremiumNav ? "bg-amber-100 group-hover:bg-amber-200" : "bg-secondary group-hover:bg-white group-hover:shadow-sm"
                )}>
                  <item.icon className={cn("w-4 h-4", isActive ? "text-white" : item.color)} />
                </div>
                <span className="flex-1">{item.label}</span>
                {isShop && !storeUnlocked && (
                  <span className="text-[10px] font-black bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">Lv.{STORE_UNLOCK_LEVEL}</span>
                )}
                {isShop && storeUnlocked && (
                  <span className="text-[10px] font-black bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-full">Open!</span>
                )}
                {isPremiumNav && !isActive && (
                  <span className="text-[10px] font-black bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full">✨</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* XP Progress + Dark Mode Toggle */}
        <div className="p-4 border-t border-border space-y-3">
          <LevelXPBar submissions={submissions} />
          <button
            onClick={toggleDark}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
          >
            {dark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
            {dark ? 'Light Mode' : 'Dark Mode'}
          </button>
        </div>
      </aside>
    </>
  );
}