'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();

  const isLoginPage = pathname === '/login';
  const isLeaderboardBroadcast = pathname.includes('/leaderboard');

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

  // 3. Unauthenticated Visitors (Home / Landing): Show top Navbar with Login button, NO admin sidebar
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
        <Navbar />
        <main className="flex-1 w-full flex flex-col">
          {children}
        </main>
      </div>
    );
  }

  // 4. Authenticated Admin: Full operations environment with Admin Sidebar
  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-100">
      <Sidebar />
      <main className="flex-1 w-full md:pl-64 flex flex-col min-h-screen overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
