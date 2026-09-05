'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { TrendingUp, ArrowUpRight, LogOut, User as UserIcon, Shield } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [healthStatus, setHealthStatus] = useState<{ status: string } | null>(null);

  useEffect(() => {
    const healthUrl =
      process.env.NEXT_PUBLIC_HEALTH_URL || 'http://localhost:3333/api/v1/health';
    fetch(healthUrl)
      .then((res) => res.json())
      .then((data) => setHealthStatus(data))
      .catch(() => setHealthStatus(null));
  }, []);

  return (
    <header className="border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              TradeArena
            </span>
            <span className="ml-2 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
              IDX Tournament
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg glass-panel text-slate-300">
            <span className="relative flex h-2 w-2">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  healthStatus?.status === 'ok' ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              ></span>
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  healthStatus?.status === 'ok' ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              ></span>
            </span>
            <span>API:</span>
            <span
              className={
                healthStatus?.status === 'ok'
                  ? 'text-emerald-400 font-semibold'
                  : 'text-amber-400 font-semibold'
              }
            >
              {healthStatus?.status === 'ok' ? 'Online' : 'Connecting'}
            </span>
          </div>

          <Link
            href="/tournaments"
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-700/80 hover:bg-slate-800 text-slate-200 transition-all flex items-center gap-1.5"
          >
            <span>Turnamen</span>
          </Link>

          <Link
            href="/participants"
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-700/80 hover:bg-slate-800 text-slate-200 transition-all flex items-center gap-1.5"
          >
            <span>Peserta</span>
          </Link>

          <Link
            href="/stocks"
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-700/80 hover:bg-slate-800 text-slate-200 transition-all flex items-center gap-1.5"
          >
            <span>Saham</span>
          </Link>

          <a
            href={process.env.NEXT_PUBLIC_SWAGGER_URL || 'http://localhost:3333/api/docs'}
            target="_blank"
            rel="noreferrer"
            className="hidden md:flex text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-700/80 hover:bg-slate-800 text-slate-300 transition-all items-center gap-1.5"
          >
            <span>Docs</span>
            <ArrowUpRight className="w-3 h-3" />
          </a>

          {user ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg glass-panel border-blue-500/30">
                <Shield className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-xs font-semibold text-slate-200">{user.name}</span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 uppercase">
                  {user.role}
                </span>
              </div>
              <button
                onClick={() => logout()}
                className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-slate-800 transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="text-xs font-semibold px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-md shadow-blue-600/20 flex items-center gap-1.5"
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>Admin Login</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
