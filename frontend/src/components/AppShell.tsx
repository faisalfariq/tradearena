'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading } = useAuth();

  const isLoginPage = pathname === '/login';
  const isLeaderboardBroadcast = pathname.includes('/leaderboard');
  const isPublicLanding = pathname === '/';
  const isPublicRoute = isLoginPage || isLeaderboardBroadcast || isPublicLanding;

  // Protect internal/management routes from unauthenticated direct visits
  useEffect(() => {
    if (!isLoading && !user && !isPublicRoute) {
      router.push('/login');
    }
  }, [isLoading, user, isPublicRoute, router]);

  // 1. Dedicated Login Page: Clean, focused, centered with no sidebar
  if (isLoginPage) {
    return (
      <main className="min-h-screen w-full flex flex-col bg-slate-950 text-slate-100">
        {children}
      </main>
    );
  }

  // 2. Public Broadcast Leaderboard: Full-screen display for projectors / live streams
  if (isLeaderboardBroadcast) {
    return (
      <main className="min-h-screen w-full flex flex-col bg-slate-950 text-slate-100">
        {children}
      </main>
    );
  }

  // 3. Unauthenticated Visitors on Landing Page: Show top Navbar with Login button, NO admin sidebar
  if (!user) {
    if (!isPublicRoute) {
      // While redirecting to login, render a sleek loader
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-medium">Mengarahkan ke halaman login...</span>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
        <Navbar />
        <main className="flex-1 w-full flex flex-col">
          {children}
        </main>
      </div>
    );
  }

  // 4. Authenticated: Full operations environment with Sidebar
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-950 text-slate-100">
      <Sidebar />
      <div className="flex-1 w-full md:pl-64 flex flex-col min-h-screen overflow-x-hidden">
        {children}
      </div>
    </div>
  );
}
