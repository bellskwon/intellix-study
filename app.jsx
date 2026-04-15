import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { useState } from 'react';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import Dashboard from '@/pages/Dashboard';
import Challenge from '@/pages/Challenge';
import Quiz from '@/pages/Quiz';
import Progress from '@/pages/Progress';
import Leaderboard from '@/pages/Leaderboard';
import Profile from '@/pages/Profile';
import Shop from '@/pages/Shop';
import Questions from '@/pages/Questions';
import Premium from '@/pages/Premium';
import Storage from '@/pages/Storage';
import Friends from '@/pages/Friends';
import Classroom from '@/pages/Classroom';
import Terms from '@/pages/Terms';
import Onboarding, { shouldShowTutorial } from '@/pages/Onboarding';
import ParentDashboard from '@/pages/ParentDashboard';
import { base44 } from '@/api/base44Client';

// ── Account paused screen ─────────────────────────────────────────────────────
function AccountPausedScreen({ user }) {
  const [showAppeal, setShowAppeal] = useState(false);
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const sendAppeal = async () => {
    setSending(true);
    try {
      // logId is null here — appeal is account-level, not tied to a specific log entry
      await base44.moderation.appeal({ logId: 'account-paused', message });
      setSent(true);
    } catch {
      // still show sent — don't leave user stranded
      setSent(true);
    }
    setSending(false);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #1e0a3c 0%, #2d1060 50%, #1a0a2e 100%)' }}>
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-8 text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mx-auto text-3xl">🚫</div>
        <div>
          <h2 className="font-sora text-xl font-bold text-slate-900">Account Paused</h2>
          <p className="text-slate-500 text-sm mt-2 leading-relaxed">
            Your account has been paused due to repeated community guideline violations. You cannot submit new content at this time.
          </p>
        </div>

        {!sent ? (
          showAppeal ? (
            <div className="space-y-3 text-left">
              <p className="text-xs font-bold text-slate-600">Tell us why you think this is a mistake</p>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={4}
                placeholder="Explain your situation..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-300"
              />
              <div className="flex gap-2">
                <button onClick={() => setShowAppeal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">
                  Cancel
                </button>
                <button onClick={sendAppeal} disabled={sending}
                  className="flex-1 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-60">
                  {sending ? 'Sending…' : 'Send Appeal'}
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowAppeal(true)}
              className="w-full py-3 rounded-2xl border border-violet-200 text-violet-700 text-sm font-semibold hover:bg-violet-50 transition-colors">
              Appeal This Decision
            </button>
          )
        ) : (
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
            <p className="text-sm font-semibold text-emerald-700">Appeal submitted</p>
            <p className="text-xs text-emerald-600 mt-1">We'll review your case and contact you at {user?.email}.</p>
          </div>
        )}

        <p className="text-xs text-slate-400">Signed in as {user?.email}</p>
      </div>
    </div>
  );
}

const AuthenticatedApp = () => {
  const { isLoadingAuth, isAuthenticated, navigateToLogin, user } = useAuth();
  const [showTutorial, setShowTutorial] = useState(() => shouldShowTutorial());

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  // Show tutorial to first-time visitors before they log in.
  // Both "Create Account" and "I already have an account" trigger Google OAuth.
  if (!isAuthenticated && showTutorial) {
    return (
      <Onboarding
        onCreateAccount={() => {
          setShowTutorial(false);
          navigateToLogin();
        }}
      />
    );
  }

  if (!isAuthenticated) {
    navigateToLogin();
    return null;
  }

  if (user?.account_paused) {
    return <AccountPausedScreen user={user} />;
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/challenge" element={<Challenge />} />
        <Route path="/quiz" element={<Quiz />} />
        <Route path="/progress" element={<Progress />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/questions" element={<Questions />} />
        <Route path="/premium" element={<Premium />} />
        <Route path="/storage" element={<Storage />} />
        <Route path="/friends" element={<Friends />} />
        <Route path="/classroom" element={<Classroom />} />
        <Route path="/terms" element={<Terms />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <Routes>
            {/* Public — no login required */}
            <Route path="/shared/:shareCode" element={<ParentDashboard />} />
            {/* Everything else requires auth */}
            <Route path="/*" element={<AuthenticatedApp />} />
          </Routes>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
