'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import {
  TrendingUp,
  LayoutDashboard,
  Trophy,
  CandlestickChart,
  FileCode2,
  ArrowUpRight,
  LogOut,
  LogIn,
  Shield,
  Menu,
  X,
  Activity,
  UserCog,
  CheckSquare,
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [healthStatus, setHealthStatus] = useState<{ status: string } | null>(null);

  useEffect(() => {
    const healthUrl =
      process.env.NEXT_PUBLIC_HEALTH_URL || 'http://localhost:3333/api/v1/health';
    fetch(healthUrl)
      .then((res) => res.json())
      .then((data) => setHealthStatus(data))
      .catch(() => setHealthStatus(null));
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const navItems = [
    {
      label: 'Dashboard',
      href: '/',
      icon: LayoutDashboard,
      active: pathname === '/',
    },
    {
      label: 'Turnamen',
      href: '/tournaments',
      icon: Trophy,
      active: pathname.startsWith('/tournaments'),
    },
    ...(user
      ? [
          {
            label: 'Pick Saham Saya',
            href: '/my-picks',
            icon: CheckSquare,
            active: pathname.startsWith('/my-picks'),
          },
        ]
      : []),
    ...(user?.role === 'ADMIN'
      ? [
          {
            label: 'Kelola Pengguna',
            href: '/users',
            icon: UserCog,
            active: pathname.startsWith('/users'),
          },
          {
            label: 'Katalog Saham',
            href: '/stocks',
            icon: CandlestickChart,
            active: pathname.startsWith('/stocks'),
          },
        ]
      : []),
  ];

  return (
    <>
      {/* Mobile Topbar with Hamburger */}
      <div className="md:hidden sticky top-0 z-40 w-full flex items-center justify-between px-4 py-3 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 shrink-0">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center shadow-md shadow-blue-500/25">
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="font-bold text-base bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              TradeArena
            </span>
          </div>
        </Link>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800 transition-colors"
          aria-label="Toggle menu"
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="md:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-sm transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-950/95 md:bg-slate-950/80 backdrop-blur-xl border-r border-slate-800/80 flex flex-col justify-between transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Top Header & Brand */}
        <div>
          <div className="p-6 border-b border-slate-800/80">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-3 group">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:scale-105 transition-transform">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="font-extrabold text-base tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                    TradeArena
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    IDX Tournament
                  </span>
                </div>
              </Link>

              <button
                onClick={() => setIsOpen(false)}
                className="md:hidden text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="px-4 py-6 space-y-1.5">
            <div className="px-3 mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Menu Utama
            </div>

            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    item.active
                      ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-sm shadow-blue-500/10'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/60 border border-transparent'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      item.active ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}

            {user?.role === 'ADMIN' && (
              <>
                <div className="px-3 pt-5 mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Developer & API
                </div>

                <a
                  href={process.env.NEXT_PUBLIC_SWAGGER_URL || 'http://localhost:3333/api/docs'}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-100 hover:bg-slate-900/60 border border-transparent transition-all"
                >
                  <div className="flex items-center gap-3">
                    <FileCode2 className="w-4 h-4 text-slate-400" />
                    <span>Swagger Docs</span>
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-500" />
                </a>
              </>
            )}
          </div>
        </div>

        {/* Bottom Section: API Status & User Profile */}
        <div className="p-4 border-t border-slate-800/80 space-y-3">
          {/* Health Status indicator */}
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    healthStatus?.status === 'ok' ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    healthStatus?.status === 'ok' ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
              </span>
              <span className="text-[11px] text-slate-400">Backend API</span>
            </div>
            <span
              className={`text-[10px] font-bold uppercase tracking-wider ${
                healthStatus?.status === 'ok' ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {healthStatus?.status === 'ok' ? 'Online' : 'Connecting'}
            </span>
          </div>

          {/* User Account / Profile */}
          {user ? (
            <div className="p-2.5 rounded-xl glass-panel border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
                  {user.name.substring(0, 2).toUpperCase()}
                </div>
                <div className="overflow-hidden">
                  <div className="text-xs font-semibold text-slate-200 truncate">
                    {user.name}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Shield className="w-2.5 h-2.5 text-blue-400" />
                    <span className="text-[9px] font-bold text-blue-400 uppercase tracking-wider">
                      {user.role}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => logout()}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-colors shrink-0 ml-2"
                title="Keluar / Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all shadow-md shadow-blue-600/20"
            >
              <LogIn className="w-4 h-4" />
              <span>Login</span>
            </Link>
          )}
        </div>
      </aside>
    </>
  );
}
