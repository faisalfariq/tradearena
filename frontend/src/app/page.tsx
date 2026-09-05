'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { 
  ShieldCheck, 
  Cpu, 
  Award, 
  ArrowRight, 
  BarChart3,
  CheckCircle2,
  Terminal,
  UserCheck
} from 'lucide-react';

export default function HomePage() {
  const { user } = useAuth();

  return (
    <main className="flex-1 flex flex-col relative overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[450px] bg-blue-600/10 blur-[130px] rounded-full pointer-events-none -z-10" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[350px] bg-emerald-600/10 blur-[120px] rounded-full pointer-events-none -z-10" />

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12 flex-1 flex flex-col justify-center">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/80 border border-slate-700/60 text-xs font-medium text-slate-300 mb-6 shadow-sm">
            <Cpu className="w-3.5 h-3.5 text-blue-400" />
            <span>Deterministic • Auditable • 100% Non-LLM Judging</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
            Automated Stock-Picking <br />
            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
              Tournament Evaluation
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-400 mb-8 leading-relaxed max-w-2xl mx-auto">
            TradeArena mengotomatisasi evaluasi harian turnamen saham IDX setelah market close.
            Mengeksekusi rule <strong>Initial CL -3%</strong>, <strong>Trailing Stop -3% dari Peak</strong>,
            dan <strong>Market Close Exit</strong> secara presisi dengan data kanonikal intraday 1 menit.
          </p>

          {user ? (
            <div className="p-5 rounded-2xl glass-panel border border-blue-500/30 max-w-lg mx-auto mb-8 text-left flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-slate-400">Selamat datang kembali,</div>
                  <div className="text-sm font-bold text-white">{user.name}</div>
                  <div className="text-[11px] text-slate-400">{user.email}</div>
                </div>
              </div>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Sesi Aktif
              </span>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
              <Link
                href="/login"
                className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-all shadow-lg shadow-blue-600/25 flex items-center gap-2"
              >
                <span>Masuk Portal Admin</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-4">
            <div className="px-5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-200 text-xs font-medium flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Milestone M1: Authentication Active</span>
            </div>
            <div className="px-5 py-2.5 rounded-xl bg-blue-950/40 border border-blue-800/40 text-blue-300 text-xs font-medium flex items-center gap-2.5">
              <Terminal className="w-4 h-4 text-blue-400" />
              <span>Next: M2 Tournament Core & Rules</span>
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
          <div className="p-6 rounded-2xl glass-panel relative group hover:border-blue-500/30 transition-all">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4 text-blue-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Deterministic Evaluation</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Hasil turnamen murni diproses secara matematis berdasarkan chronological intraday candles dan valid price level IDX. Tidak ada LLM dalam jalur kalkulasi.
            </p>
          </div>

          <div className="p-6 rounded-2xl glass-panel relative group hover:border-emerald-500/30 transition-all">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4 text-emerald-400">
              <BarChart3 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">CL & Trailing Stop -3%</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Membedakan batas theoretical threshold dengan actual exit price level. Mendukung trailing stop static 3% yang hanya boleh naik mengunci profit.
            </p>
          </div>

          <div className="p-6 rounded-2xl glass-panel relative group hover:border-purple-500/30 transition-all">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-4 text-purple-400">
              <Award className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Auditable Leaderboard</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Setiap poin dan return memiliki calculation evidence lengkap. Admin menangani exception sementara sistem mengelola perhitungan rutin.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4">
          TradeArena Platform • Built with Next.js, NestJS, Prisma & PostgreSQL • Monorepo Architecture
        </div>
      </footer>
    </main>
  );
}
