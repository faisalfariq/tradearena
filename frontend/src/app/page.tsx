'use client';

import React, { useEffect, useState, useCallback } from 'react';
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
  UserCheck,
  Trophy,
  Users,
  Activity,
  AlertTriangle,
  PlusCircle,
  Clock,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  RefreshCw
} from 'lucide-react';

interface DashboardMetrics {
  activeTournamentsCount: number;
  totalTournamentsCount: number;
  totalParticipantsCount: number;
  totalPicksCount: number;
  completedEvaluationsCount: number;
  pendingReviewsCount: number;
  totalStocksCount: number;
}

interface TournamentSummaryItem {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  participantsCount: number;
  picksCount: number;
}

interface RecentEvaluationItem {
  id: string;
  tournamentId: string;
  tournamentName: string;
  participantName: string;
  stockSymbol: string;
  tradingDate: string;
  entryPrice: number;
  exitPrice: number | null;
  realizedReturn: number | null;
  exitReason: string | null;
  status: string;
}

interface DashboardStatsResponse {
  metrics: DashboardMetrics;
  activeTournaments: TournamentSummaryItem[];
  recentEvaluations: RecentEvaluationItem[];
}

export default function HomePage() {
  const { user, token } = useAuth();
  const [stats, setStats] = useState<DashboardStatsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333/api/v1';
      const res = await fetch(`${baseUrl}/dashboard/stats`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error('Gagal memuat statistik dashboard');
      const data = await res.json();
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat memuat dashboard');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (user && token) {
      fetchStats();
    }
  }, [user, token, fetchStats]);

  // Authenticated Admin Dashboard View
  if (user) {
    return (
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 uppercase tracking-wider mb-1">
              <Activity className="w-3.5 h-3.5" />
              <span>Admin Operations Center • Milestone M7</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Dashboard Operasional TradeArena
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Pantau performa turnamen, status evaluasi deterministik, dan klasemen secara real-time.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchStats}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700/80 hover:bg-slate-800 text-xs font-semibold text-slate-200 flex items-center gap-2 transition-all shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-400' : ''}`} />
              <span>Segarkan Data</span>
            </button>
            <Link
              href="/tournaments/new"
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-blue-600/25 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Buat Turnamen</span>
            </Link>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
            {error}
          </div>
        )}

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Turnamen Aktif */}
          <div className="p-5 rounded-2xl glass-panel border border-slate-800 relative overflow-hidden group hover:border-blue-500/30 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Turnamen Aktif
              </span>
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <Trophy className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">
                {stats ? stats.metrics.activeTournamentsCount : '—'}
              </span>
              <span className="text-xs text-slate-400">
                / {stats ? stats.metrics.totalTournamentsCount : '—'} total
              </span>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Turnamen Berjalan</span>
            </div>
          </div>

          {/* Card 2: Total Peserta */}
          <div className="p-5 rounded-2xl glass-panel border border-slate-800 relative overflow-hidden group hover:border-emerald-500/30 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Peserta Terdaftar
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">
                {stats ? stats.metrics.totalParticipantsCount : '—'}
              </span>
              <span className="text-xs text-slate-400">peserta</span>
            </div>
            <div className="mt-3 text-[11px] text-slate-400">
              Tersebar di turnamen aktif
            </div>
          </div>

          {/* Card 3: Evaluasi Trade */}
          <div className="p-5 rounded-2xl glass-panel border border-slate-800 relative overflow-hidden group hover:border-purple-500/30 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Evaluasi Trade
              </span>
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <Award className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">
                {stats ? stats.metrics.completedEvaluationsCount : '—'}
              </span>
              <span className="text-xs text-slate-400">
                / {stats ? stats.metrics.totalPicksCount : '—'} pick
              </span>
            </div>
            <div className="mt-3 text-[11px] text-purple-300 font-medium">
              100% Deterministik Non-LLM
            </div>
          </div>

          {/* Card 4: Status Review / Exceptions */}
          <div className="p-5 rounded-2xl glass-panel border border-slate-800 relative overflow-hidden group hover:border-amber-500/30 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Perlu Review / Audit
              </span>
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">
                {stats ? stats.metrics.pendingReviewsCount : '0'}
              </span>
              <span className="text-xs text-slate-400">exception</span>
            </div>
            <div className="mt-3 text-[11px] text-amber-400 font-medium">
              {stats && stats.metrics.pendingReviewsCount > 0
                ? 'Perlu tindakan manual'
                : 'Kondisi sistem optimal'}
            </div>
          </div>
        </div>

        {/* Active Tournaments Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-blue-400" />
              <h2 className="text-base font-bold text-white">Turnamen Aktif & Mendatang</h2>
            </div>
            <Link
              href="/tournaments"
              className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 transition-colors"
            >
              <span>Lihat Semua Turnamen</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {stats && stats.activeTournaments.length > 0 ? (
              stats.activeTournaments.map((t) => (
                <div
                  key={t.id}
                  className="p-5 rounded-2xl glass-panel border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-all"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {t.status}
                      </span>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {t.startDate} — {t.endDate}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white line-clamp-1 mb-2">
                      {t.name}
                    </h3>
                    <div className="flex items-center gap-4 text-xs text-slate-400 mb-6">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-blue-400" />
                        <strong>{t.participantsCount}</strong> Peserta
                      </span>
                      <span className="flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                        <strong>{t.picksCount}</strong> Stock Picks
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-4 border-t border-slate-800/80">
                    <Link
                      href={`/tournaments/${t.id}`}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold text-center transition-colors"
                    >
                      Detail & Aturan
                    </Link>
                    <Link
                      href={`/tournaments/${t.id}/leaderboard`}
                      className="px-3 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 text-xs font-semibold text-center transition-colors flex items-center justify-center gap-1"
                    >
                      <Trophy className="w-3.5 h-3.5" />
                      <span>Klasemen</span>
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full p-8 rounded-2xl glass-panel border border-slate-800 text-center text-xs text-slate-400">
                Belum ada turnamen aktif. Silakan buat turnamen baru untuk memulai.
              </div>
            )}
          </div>
        </div>

        {/* Quick Operations & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Operations Shortcuts */}
          <div className="lg:col-span-1 p-5 rounded-2xl glass-panel border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <span>Aksi Cepat Operasional</span>
            </h3>
            <div className="space-y-2.5">
              <Link
                href="/tournaments/new"
                className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-medium flex items-center justify-between group transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                    <PlusCircle className="w-4 h-4" />
                  </div>
                  <span>Buat Turnamen Baru</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
              </Link>

              <Link
                href="/stocks"
                className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-medium flex items-center justify-between group transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <span>Kelola Master Emiten Saham</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
              </Link>

              <Link
                href="/participants"
                className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-medium flex items-center justify-between group transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                  <span>Daftar Peserta Turnamen</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
              </Link>

              <a
                href={process.env.NEXT_PUBLIC_SWAGGER_URL || 'http://localhost:3333/api/docs'}
                target="_blank"
                rel="noreferrer"
                className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-medium flex items-center justify-between group transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                    <ExternalLink className="w-4 h-4" />
                  </div>
                  <span>Dokumentasi API Swagger</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
              </a>
            </div>
          </div>

          {/* Recent Evaluations Feed */}
          <div className="lg:col-span-2 p-5 rounded-2xl glass-panel border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-400" />
                <span>Evaluasi Trade Terkini</span>
              </h3>
              <span className="text-[11px] text-slate-400">100% Deterministik IDX</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Peserta</th>
                    <th className="py-2.5 px-3">Emiten</th>
                    <th className="py-2.5 px-3">Entry</th>
                    <th className="py-2.5 px-3">Exit</th>
                    <th className="py-2.5 px-3">Return</th>
                    <th className="py-2.5 px-3">Alasan Exit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {stats && stats.recentEvaluations.length > 0 ? (
                    stats.recentEvaluations.map((ev) => (
                      <tr key={ev.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-white">
                          {ev.participantName}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-mono font-bold text-blue-400 px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">
                            {ev.stockSymbol}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono">
                          Rp {ev.entryPrice.toLocaleString('id-ID')}
                        </td>
                        <td className="py-2.5 px-3 font-mono">
                          {ev.exitPrice ? `Rp ${ev.exitPrice.toLocaleString('id-ID')}` : '—'}
                        </td>
                        <td className="py-2.5 px-3">
                          {ev.realizedReturn !== null ? (
                            <span
                              className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                                ev.realizedReturn >= 0
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
                              }`}
                            >
                              {ev.realizedReturn >= 0 ? '+' : ''}
                              {ev.realizedReturn.toFixed(2)}%
                            </span>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                            {ev.exitReason || ev.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-500 text-xs">
                        Belum ada data evaluasi trade terbaru.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Public Guest Hero View
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
            Mengeksekusi rule <strong>Initial Cut Loss</strong>, <strong>Dynamic Trailing Stop (dari Peak)</strong>,
            dan <strong>Market Close Exit</strong> secara presisi dan dinamis sesuai parameter konfigurasi turnamen dengan data kanonikal intraday 1 menit.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
            <Link
              href="/login"
              className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-all shadow-lg shadow-blue-600/25 flex items-center gap-2"
            >
              <span>Masuk Portal Admin</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <div className="px-4 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-300 text-xs font-medium flex items-center gap-2 shadow-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>IDX Price Fraction Tick Size (V1)</span>
            </div>
            <div className="px-4 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-300 text-xs font-medium flex items-center gap-2 shadow-sm">
              <Terminal className="w-4 h-4 text-blue-400" />
              <span>Post-Market Automation (16:15 WIB)</span>
            </div>
            <div className="px-4 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-300 text-xs font-medium flex items-center gap-2 shadow-sm">
              <Activity className="w-4 h-4 text-purple-400" />
              <span>Deterministic Standings & Evidence</span>
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
            <h3 className="text-lg font-bold text-white mb-2">Dynamic Cut Loss & Trailing Stop</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Persentase Cut Loss dan Trailing Stop dapat disesuaikan dinamis per turnamen (misal 2%, 3%, 5%, dsb). Menghitung level stop yang bergerak mengunci profit dari peak dan membedakan batas theoretical threshold dengan actual exit price level IDX.
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
          TradeArena Platform
        </div>
      </footer>
    </main>
  );
}
