'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useToast } from '@/context/ToastContext';
import {
  Trophy,
  Medal,
  Calendar,
  ArrowLeft,
  RefreshCw,
  TrendingUp,
  Award,
  ChevronRight,
  Eye,
  X,
  FileText,
  Clock,
  CheckCircle2,
  Users,
  Crown,
  Target,
} from 'lucide-react';

interface OverallResultItem {
  rank: number;
  participantId: string;
  participantName: string;
  totalPoints: number;
  picksCount: number;
  winCount: number;
  lossCount: number;
  breakevenCount: number;
  winRate: number;
  averageReturn: number;
  bestPick: {
    symbol: string;
    date: string;
    returnPct: number;
    points: number;
  } | null;
  worstPick: {
    symbol: string;
    date: string;
    returnPct: number;
    points: number;
  } | null;
  dailyHistory: Array<{
    date: string;
    points: number;
    rank: number;
  }>;
}

interface OverallStandingsResponse {
  tournamentId: string;
  tournamentName: string;
  completionType?: 'DATE_PERIOD' | 'TARGET_POINTS';
  targetPoints?: number | null;
  isCompletedByTargetPoints?: boolean;
  winner?: {
    participantId: string;
    participantName: string;
    totalPoints: number;
  } | null;
  totalParticipants: number;
  totalEvaluatedPicks: number;
  standings: OverallResultItem[];
}

interface DailyRankItem {
  rank: number;
  pickId: string;
  participantId: string;
  participantName: string;
  stockSymbol: string;
  entryPrice: number;
  peakPrice: number | null;
  exitPrice: number | null;
  exitTime: string | null;
  exitReason: string | null;
  maxFloatingReturn: number | null;
  realizedReturn: number | null;
  points: number | null;
  evaluationStatus: string;
}

interface DailyResultsResponse {
  tournamentId: string;
  tournamentName: string;
  tradingDate: string;
  dailyMetrics: {
    tradingDate: string;
    totalParticipants: number;
    averageReturn: number;
    gainersCount: number;
    losersCount: number;
    topGainer: {
      participantName: string;
      stockSymbol: string;
      returnPct: number;
    } | null;
    topLoser: {
      participantName: string;
      stockSymbol: string;
      returnPct: number;
    } | null;
  };
  rankings: DailyRankItem[];
}

export default function TournamentLeaderboardPage() {
  const params = useParams();
  const tournamentId = params?.id as string;
  const toast = useToast();

  const [viewMode, setViewMode] = useState<'overall' | 'daily'>('overall');
  const [overallData, setOverallData] = useState<OverallStandingsResponse | null>(null);
  const [dailyData, setDailyData] = useState<DailyResultsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Daily date filter
  const [selectedDate, setSelectedDate] = useState<string>('2026-09-01');

  // Evidence modal state
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | null>(null);
  const [evidenceDetail, setEvidenceDetail] = useState<any | null>(null);
  const [evidenceLoading, setEvidenceLoading] = useState(false);

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333/api/v1';

  const fetchOverallStandings = useCallback(async () => {
    if (!tournamentId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${baseUrl}/tournaments/${tournamentId}/results/overall`);
      if (!res.ok) throw new Error('Gagal memuat klasemen akumulasi');
      const data: OverallStandingsResponse = await res.json();
      setOverallData(data);
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat memuat klasemen');
    } finally {
      setLoading(false);
    }
  }, [baseUrl, tournamentId]);

  const fetchDailyResults = useCallback(async (dateStr: string) => {
    if (!tournamentId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${baseUrl}/tournaments/${tournamentId}/results/daily?tradingDate=${dateStr}`,
      );
      if (!res.ok) throw new Error('Gagal memuat hasil harian');
      const data: DailyResultsResponse = await res.json();
      setDailyData(data);
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat memuat hasil harian');
    } finally {
      setLoading(false);
    }
  }, [baseUrl, tournamentId]);

  const fetchEvidenceDetail = async (evaluationId: string) => {
    setEvidenceLoading(true);
    try {
      const res = await fetch(`${baseUrl}/evaluations/${evaluationId}`);
      if (!res.ok) throw new Error('Gagal mengambil bukti audit evaluasi');
      const data = await res.json();
      setEvidenceDetail(data);
    } catch (err: any) {
      toast.error(err.message || 'Gagal memuat bukti audit');
    } finally {
      setEvidenceLoading(false);
    }
  };

  useEffect(() => {
    if (viewMode === 'overall') {
      fetchOverallStandings();
    } else {
      fetchDailyResults(selectedDate);
    }
  }, [tournamentId, viewMode, selectedDate, fetchOverallStandings, fetchDailyResults]);

  const standings = overallData?.standings || [];

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Broadcast Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link
              href={`/tournaments/${tournamentId}`}
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali ke Detail Turnamen</span>
            </Link>
            <span className="text-slate-600">•</span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase tracking-wider">
              Public Broadcast Leaderboard
            </span>
            {overallData?.completionType === 'TARGET_POINTS' && (
              <>
                <span className="text-slate-600">•</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                  <Target className="w-3 h-3 text-purple-400" />
                  <span>Target: {overallData.targetPoints || 300} Poin</span>
                </span>
              </>
            )}
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <Trophy className="w-7 h-7 sm:w-8 h-8 text-amber-400" />
            <span>{overallData?.tournamentName || 'Klasemen Turnamen Saham IDX'}</span>
          </h1>

          <p className="text-sm text-slate-400 mt-1">
            Papan peringkat resmi berbasis kalkulasi deterministik bursa IDX • 100% Non-LLM Judging
          </p>
        </div>

        {/* View Switcher & Refresh */}
        <div className="flex items-center gap-3">
          <div className="p-1 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-1 shadow-inner">
            <button
              onClick={() => setViewMode('overall')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'overall'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Klasemen Akumulasi
            </button>
            <button
              onClick={() => setViewMode('daily')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'daily'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Hasil Harian
            </button>
          </div>

          <button
            onClick={() => {
              if (viewMode === 'overall') fetchOverallStandings();
              else fetchDailyResults(selectedDate);
            }}
            disabled={loading}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-700/80 hover:bg-slate-800 text-slate-200 transition-colors shadow-sm"
            title="Segarkan Klasemen"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Winner Celebration Banner (Poin 5) */}
      {(overallData?.isCompletedByTargetPoints || overallData?.winner) && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-purple-500/20 to-blue-500/20 border border-amber-500/40 text-amber-200 flex items-center gap-4 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/25 border border-amber-500/40 flex items-center justify-center text-amber-300 shrink-0">
            <Crown className="w-7 h-7 animate-bounce" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider font-extrabold text-amber-400 flex items-center gap-1.5">
              <Trophy className="w-4 h-4" />
              <span>Turnamen Selesai — Juara Resmi Ditetapkan</span>
            </div>
            <div className="text-sm sm:text-base font-bold text-white mt-1">
              Selamat kepada <strong className="text-amber-300 font-extrabold">{overallData?.winner?.participantName || 'Peserta Teratas'}</strong> yang telah berhasil menembus target {overallData?.targetPoints || 300} Poin dengan akumulasi <strong className="text-emerald-400">+{overallData?.winner?.totalPoints.toFixed(2)} Poin</strong> dan dinobatkan sebagai Juara Resmi!
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
          {error}
        </div>
      )}

      {/* OVERALL STANDINGS VIEW */}
      {viewMode === 'overall' && (
        <div className="space-y-8">
          {/* Top 3 Podium Cards */}
          {standings.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
              {/* Silver #2 */}
              <div className="md:order-1 p-6 rounded-2xl glass-panel border border-slate-700/80 bg-gradient-to-b from-slate-800/40 via-slate-900/60 to-slate-950 flex flex-col justify-between relative group hover:border-slate-500/40 transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-400/10 border border-slate-400/20 text-slate-300 flex items-center justify-center font-black text-xl shadow-md">
                    2
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-400/10 text-slate-300 border border-slate-400/20 flex items-center gap-1.5">
                    <Medal className="w-3.5 h-3.5 text-slate-300" />
                    <span>Runner Up</span>
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-white mb-1">
                    {standings[1] ? standings[1].participantName : '—'}
                  </h3>
                  <div className="text-2xl font-black text-slate-200 mb-4 font-mono">
                    {standings[1]
                      ? `${standings[1].totalPoints >= 0 ? '+' : ''}${standings[1].totalPoints.toFixed(4)} pts`
                      : '0.0000 pts'}
                  </div>

                  <div className="space-y-2 pt-3 border-t border-slate-800 text-xs text-slate-400">
                    <div className="flex justify-between">
                      <span>Win Rate:</span>
                      <strong className="text-white">
                        {standings[1] ? `${standings[1].winRate.toFixed(1)}%` : '0%'}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Rekor W / L / B:</span>
                      <span className="font-mono text-slate-300">
                        {standings[1]
                          ? `${standings[1].winCount}W / ${standings[1].lossCount}L / ${standings[1].breakevenCount}B`
                          : '0W / 0L / 0B'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Gold #1 Champion */}
              <div className="md:order-2 p-6 rounded-2xl glass-panel border border-amber-500/50 bg-gradient-to-b from-amber-500/10 via-amber-950/20 to-slate-950 flex flex-col justify-between relative shadow-xl shadow-amber-500/5 scale-105 group hover:border-amber-400 transition-all">
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-xs uppercase tracking-widest shadow-lg flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-slate-950 fill-current" />
                  <span>Juara 1</span>
                </div>

                <div className="flex items-start justify-between mb-4 mt-2">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center font-black text-2xl shadow-lg">
                    1
                  </div>
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Pemimpin Klasemen
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-extrabold text-white mb-1">
                    {standings[0] ? standings[0].participantName : '—'}
                  </h3>
                  <div className="text-3xl font-black text-amber-400 mb-4 font-mono">
                    {standings[0]
                      ? `${standings[0].totalPoints >= 0 ? '+' : ''}${standings[0].totalPoints.toFixed(4)} pts`
                      : '0.0000 pts'}
                  </div>

                  <div className="space-y-2 pt-3 border-t border-amber-500/20 text-xs text-slate-300">
                    <div className="flex justify-between">
                      <span>Win Rate:</span>
                      <strong className="text-emerald-400 font-bold">
                        {standings[0] ? `${standings[0].winRate.toFixed(1)}%` : '0%'}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Trade Terbaik:</span>
                      <span className="font-mono text-emerald-400 font-bold">
                        {standings[0]?.bestPick
                          ? `${standings[0].bestPick.symbol} (+${standings[0].bestPick.returnPct.toFixed(2)}%)`
                          : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Rata-rata Return:</span>
                      <strong className="text-white">
                        {standings[0] ? `${standings[0].averageReturn.toFixed(2)}%` : '0%'}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bronze #3 */}
              <div className="md:order-3 p-6 rounded-2xl glass-panel border border-orange-700/60 bg-gradient-to-b from-orange-950/20 via-slate-900/60 to-slate-950 flex flex-col justify-between relative group hover:border-orange-600/40 transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-orange-600/10 border border-orange-600/20 text-orange-400 flex items-center justify-center font-black text-xl shadow-md">
                    3
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-orange-600/10 text-orange-400 border border-orange-600/20 flex items-center gap-1.5">
                    <Medal className="w-3.5 h-3.5 text-orange-400" />
                    <span>Peringkat 3</span>
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-white mb-1">
                    {standings[2] ? standings[2].participantName : '—'}
                  </h3>
                  <div className="text-2xl font-black text-orange-300 mb-4 font-mono">
                    {standings[2]
                      ? `${standings[2].totalPoints >= 0 ? '+' : ''}${standings[2].totalPoints.toFixed(4)} pts`
                      : '0.0000 pts'}
                  </div>

                  <div className="space-y-2 pt-3 border-t border-slate-800 text-xs text-slate-400">
                    <div className="flex justify-between">
                      <span>Win Rate:</span>
                      <strong className="text-white">
                        {standings[2] ? `${standings[2].winRate.toFixed(1)}%` : '0%'}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Rekor W / L / B:</span>
                      <span className="font-mono text-slate-300">
                        {standings[2]
                          ? `${standings[2].winCount}W / ${standings[2].lossCount}L / ${standings[2].breakevenCount}B`
                          : '0W / 0L / 0B'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Full Standings Table */}
          <div className="p-6 rounded-2xl glass-panel border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                <span>Klasemen Lengkap Peserta ({standings.length} Peserta)</span>
              </h2>
              <span className="text-xs text-slate-400">
                Diurutkan berdasarkan Total Poin & Tie-Breaker
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/90 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Peringkat</th>
                    <th className="py-3 px-4">Peserta</th>
                    <th className="py-3 px-4">Poin Akumulasi</th>
                    <th className="py-3 px-4">Pick Selesai</th>
                    <th className="py-3 px-4">Rekor (W/L/B)</th>
                    <th className="py-3 px-4">Win Rate</th>
                    <th className="py-3 px-4">Rata-rata Return</th>
                    <th className="py-3 px-4">Trade Terbaik</th>
                    <th className="py-3 px-4">Trade Terburuk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {standings.map((item) => (
                    <tr key={item.participantId} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-bold">
                        <span
                          className={`w-7 h-7 rounded-lg inline-flex items-center justify-center text-xs font-extrabold ${
                            item.rank === 1
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : item.rank === 2
                              ? 'bg-slate-400/20 text-slate-200 border border-slate-400/40'
                              : item.rank === 3
                              ? 'bg-orange-600/20 text-orange-300 border border-orange-600/40'
                              : 'bg-slate-900 text-slate-400'
                          }`}
                        >
                          #{item.rank}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-white text-sm">
                        {item.participantName}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-extrabold text-sm">
                        <span
                          className={
                            item.totalPoints > 0
                              ? 'text-emerald-400'
                              : item.totalPoints < 0
                              ? 'text-red-400'
                              : 'text-slate-300'
                          }
                        >
                          {item.totalPoints >= 0 ? '+' : ''}
                          {item.totalPoints.toFixed(4)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">{item.picksCount} trade</td>
                      <td className="py-3.5 px-4 font-mono">
                        <span className="text-emerald-400 font-semibold">{item.winCount}W</span>
                        <span className="text-slate-500 mx-1">/</span>
                        <span className="text-red-400 font-semibold">{item.lossCount}L</span>
                        <span className="text-slate-500 mx-1">/</span>
                        <span className="text-slate-400 font-semibold">{item.breakevenCount}B</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                            item.winRate >= 50
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : item.winRate > 0
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {item.winRate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        <span
                          className={
                            item.averageReturn > 0
                              ? 'text-emerald-400'
                              : item.averageReturn < 0
                              ? 'text-red-400'
                              : 'text-slate-400'
                          }
                        >
                          {item.averageReturn >= 0 ? '+' : ''}
                          {item.averageReturn.toFixed(2)}%
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {item.bestPick ? (
                          <div className="flex items-center gap-1.5 font-mono">
                            <span className="font-bold text-blue-400 px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">
                              {item.bestPick.symbol}
                            </span>
                            <span className="text-emerald-400 text-[11px] font-semibold">
                              (+{item.bestPick.returnPct.toFixed(2)}%)
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {item.worstPick ? (
                          <div className="flex items-center gap-1.5 font-mono">
                            <span className="font-bold text-slate-300 px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700">
                              {item.worstPick.symbol}
                            </span>
                            <span className="text-red-400 text-[11px] font-semibold">
                              ({item.worstPick.returnPct.toFixed(2)}%)
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* DAILY RESULTS VIEW */}
      {viewMode === 'daily' && (
        <div className="space-y-6">
          {/* Daily Date Filter Card */}
          <div className="p-4 rounded-2xl glass-panel border border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-blue-400" />
              <div>
                <div className="text-xs text-slate-400">Pilih Tanggal Perdagangan:</div>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="mt-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
            </div>

            <div className="flex items-center gap-6 text-xs text-slate-400">
              <div>
                Top Gainer Hari Ini:{' '}
                <strong className="text-emerald-400 font-bold">
                  {dailyData?.dailyMetrics.topGainer
                    ? `${dailyData.dailyMetrics.topGainer.participantName} (${dailyData.dailyMetrics.topGainer.stockSymbol} +${dailyData.dailyMetrics.topGainer.returnPct.toFixed(2)}%)`
                    : '—'}
                </strong>
              </div>
              <div>
                Rata-rata Return Sesi:{' '}
                <strong className="text-white">
                  {dailyData?.dailyMetrics.averageReturn !== undefined
                    ? `${dailyData.dailyMetrics.averageReturn.toFixed(2)}%`
                    : '0%'}
                </strong>
              </div>
            </div>
          </div>

          {/* Daily Standings Table */}
          <div className="p-6 rounded-2xl glass-panel border border-slate-800 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span>Hasil Perdagangan Sesi: {selectedDate}</span>
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/90 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Peringkat</th>
                    <th className="py-3 px-4">Peserta</th>
                    <th className="py-3 px-4">Emiten</th>
                    <th className="py-3 px-4">Harga Entry</th>
                    <th className="py-3 px-4">Puncak Tertinggi</th>
                    <th className="py-3 px-4">Harga Exit</th>
                    <th className="py-3 px-4">Alasan Exit</th>
                    <th className="py-3 px-4">Return Sesi</th>
                    <th className="py-3 px-4">Poin Diperoleh</th>
                    <th className="py-3 px-4 text-right">Bukti Audit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {dailyData && dailyData.rankings.length > 0 ? (
                    dailyData.rankings.map((row) => (
                      <tr key={row.pickId} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 font-bold">
                          <span
                            className={`w-6 h-6 rounded inline-flex items-center justify-center text-xs ${
                              row.rank === 1
                                ? 'bg-amber-500/20 text-amber-300 font-extrabold'
                                : row.rank === 2
                                ? 'bg-slate-400/20 text-slate-200'
                                : row.rank === 3
                                ? 'bg-orange-600/20 text-orange-300'
                                : 'text-slate-400'
                            }`}
                          >
                            #{row.rank}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-white">{row.participantName}</td>
                        <td className="py-3 px-4">
                          <span className="font-mono font-bold text-blue-400 px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">
                            {row.stockSymbol}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono">
                          Rp {row.entryPrice.toLocaleString('id-ID')}
                        </td>
                        <td className="py-3 px-4 font-mono text-emerald-400">
                          {row.peakPrice ? `Rp ${row.peakPrice.toLocaleString('id-ID')}` : '—'}
                        </td>
                        <td className="py-3 px-4 font-mono">
                          {row.exitPrice ? `Rp ${row.exitPrice.toLocaleString('id-ID')}` : '—'}
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                            {row.exitReason || row.evaluationStatus}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold">
                          {row.realizedReturn !== null ? (
                            <span
                              className={
                                row.realizedReturn >= 0 ? 'text-emerald-400' : 'text-red-400'
                              }
                            >
                              {row.realizedReturn >= 0 ? '+' : ''}
                              {row.realizedReturn.toFixed(2)}%
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-white">
                          {row.points !== null ? row.points.toFixed(4) : '—'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedEvidenceId(row.pickId);
                              fetchEvidenceDetail(row.pickId);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 text-[11px] font-semibold inline-flex items-center gap-1 transition-colors"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Bukti</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-500 text-xs">
                        Tidak ada trade yang dievaluasi pada tanggal {selectedDate}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL BUKTI AUDIT */}
      {selectedEvidenceId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" />
                <h3 className="text-base font-bold text-white">Bukti Audit Trade Evaluation</h3>
              </div>
              <button
                onClick={() => {
                  setSelectedEvidenceId(null);
                  setEvidenceDetail(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {evidenceLoading ? (
              <div className="py-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
                <span>Memuat rincian bukti audit...</span>
              </div>
            ) : evidenceDetail ? (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[11px] text-slate-400">Harga Entry</span>
                    <div className="text-sm font-bold text-white font-mono mt-0.5">
                      Rp {Number(evidenceDetail.entryPrice).toLocaleString('id-ID')}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[11px] text-slate-400">Puncak (Highest)</span>
                    <div className="text-sm font-bold text-emerald-400 font-mono mt-0.5">
                      Rp {Number(evidenceDetail.highestPrice || 0).toLocaleString('id-ID')}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[11px] text-slate-400">Harga Exit</span>
                    <div className="text-sm font-bold text-white font-mono mt-0.5">
                      Rp {Number(evidenceDetail.exitPrice || 0).toLocaleString('id-ID')}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[11px] text-slate-400">Realized Return</span>
                    <div
                      className={`text-sm font-bold font-mono mt-0.5 ${
                        evidenceDetail.realizedReturn >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {evidenceDetail.realizedReturn >= 0 ? '+' : ''}
                      {Number(evidenceDetail.realizedReturn || 0).toFixed(2)}%
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="font-bold text-slate-200">Keterangan Evaluasi:</div>
                  <div className="flex justify-between text-slate-400">
                    <span>Alasan Exit:</span>
                    <strong className="text-white">{evidenceDetail.exitReason}</strong>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Versi Aturan:</span>
                    <span className="font-mono text-slate-300">
                      {evidenceDetail.calculationVersion}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Status Evaluasi:</span>
                    <span className="font-semibold text-emerald-400">
                      {evidenceDetail.status}
                    </span>
                  </div>
                </div>

                {evidenceDetail.evidence?.detailsJson && (
                  <div className="space-y-2">
                    <div className="font-bold text-slate-200">Timeline Intraday:</div>
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-400 max-h-48 overflow-y-auto">
                      <pre>
                        {JSON.stringify(evidenceDetail.evidence.detailsJson, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-500 text-xs">
                Bukti audit tidak ditemukan.
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
