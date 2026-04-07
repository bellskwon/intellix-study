import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

/**
 * Shows a streak-at-risk ping if user hasn't completed a challenge today.
 * In a real app this would use push notifications; here it's an in-app banner.
 */
export default function StreakNotification({ streak = 0, lastActivity }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const today = new Date().toDateString();
    const lastDate = lastActivity ? new Date(lastActivity).toDateString() : null;
    if (lastDate !== today && streak > 0) {
      const timer = setTimeout(() => setVisible(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [streak, lastActivity]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] w-[calc(100vw-2rem)] max-w-md">
          <div className="bg-orange-500 text-white rounded-2xl shadow-2xl shadow-orange-500/40 px-5 py-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
              <Flame className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-sm">⚠️ Streak Alert!</p>
              <p className="text-orange-100 text-xs mt-0.5">Your {streak}-day streak ends tonight — complete a challenge to keep it alive!</p>
            </div>
            <Link to="/challenge" onClick={() => setVisible(false)}>
              <Button size="sm" className="bg-white text-orange-600 hover:bg-orange-50 font-black rounded-xl shrink-0 h-8">
                Go!
              </Button>
            </Link>
            <button onClick={() => setVisible(false)} className="text-white/70 hover:text-white shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}