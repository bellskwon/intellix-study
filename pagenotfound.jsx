import React from 'react';
import { Link } from 'react-router-dom';

export default function PageNotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
      <p className="text-7xl font-black text-primary mb-4">404</p>
      <h1 className="text-2xl font-black text-foreground mb-2">Page not found</h1>
      <p className="text-muted-foreground mb-6">The page you're looking for doesn't exist.</p>
      <Link to="/" className="px-5 py-2.5 rounded-xl bg-primary text-white font-bold text-sm hover:opacity-90 transition-opacity">
        Back to Dashboard
      </Link>
    </div>
  );
}
