import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [hadExpiredToken, setHadExpiredToken] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('base44_access_token');
    if (!token) {
      setIsLoadingAuth(false);
      return;
    }
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
    } catch {
      // Token is invalid or expired — mark so we skip tutorial and go straight to login
      localStorage.removeItem('base44_access_token');
      localStorage.setItem('intellix_tutorial_seen', 'true');
      setHadExpiredToken(true);
    }
    setIsLoadingAuth(false);
  };

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    if (shouldRedirect) {
      base44.auth.logout(window.location.origin);
    } else {
      localStorage.removeItem('base44_access_token');
    }
  };

  const navigateToLogin = () => {
    // Guard: if API_BASE is still localhost the app is misconfigured in production.
    // Show a clear message instead of a blank screen.
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    if (typeof window !== 'undefined' && !window.location.hostname.includes('localhost') && apiBase.includes('localhost')) {
      document.body.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;text-align:center;padding:24px;"><h2 style="font-size:20px;font-weight:900;color:#1e1b4b;margin-bottom:8px;">Configuration error</h2><p style="color:#6b7280;font-size:14px;max-width:360px;">VITE_API_URL is not set. Add it in Vercel → Settings → Environment Variables, then redeploy.</p></div>';
      return;
    }
    base44.auth.redirectToLogin(window.location.href);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      hadExpiredToken,
      // legacy aliases so existing pages that destructure these don't break
      isLoadingPublicSettings: false,
      authError: null,
      appPublicSettings: null,
      logout,
      navigateToLogin,
      checkAppState: checkAuth,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
