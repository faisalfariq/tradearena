'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import {
  TrendingUp,
  Clock,
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle,
  Shield,
  HelpCircle,
  Calendar,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Trophy,
  Loader2,
  Search,
  X,
  Eye,
  CheckSquare,
  AlertTriangle,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface Stock {
  id: string;
  symbol: string;
  name: string;
  exchange: string;
  isActive: boolean;
}

interface EvaluationItem {
  id: string;
  status: 'PENDING_DATA' | 'COMPLETED' | 'REVIEW_REQUIRED';
  entryPrice: number | string;
  exitPrice: number | string;
  exitTimestamp: string;
  exitReason: string;
  highestPrice: number | string;
  maxFloatingReturn: number | string;
  realizedReturn: number | string;
}

interface StockPick {
  id: string;
  tournamentId: string;
  participantId: string;
  stockId: string;
  tradingDate: string;
  entryPrice: number | string;
  entrySource: string;
  status: string;
  createdAt: string;
  stock: Stock;
  evaluations?: EvaluationItem[];
}

interface TournamentOverviewItem {
  tournamentId: string;
  tournamentName: string;
  tournamentStatus: string;
  startDate: string;
  endDate: string;
  rules: {
    initialStopPct: number | string;
    trailingStopPct: number | string;
    priceFractionPolicy?: string;
    calculationRuleVersion?: string;
  } | null;
  joinedAt: string;
  todayPick: StockPick | null;
  todayWib: string;
  timeWib: string;
  isLocked: boolean;
}

export default function MyPicksPage() {
  const router = useRouter();
  const { user, token } = useAuth();
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333/api/v1';

  // State
  const [tournaments, setTournaments] = useState<TournamentOverviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>('');
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loadingStocks, setLoadingStocks] = useState(false);

  // Pick detail for selected tournament
  const [pickStatus, setPickStatus] = useState<any | null>(null);
  const [loadingPickStatus, setLoadingPickStatus] = useState(false);

  // Form states
  const [stockSearchQuery, setStockSearchQuery] = useState('');
  const [selectedStockId, setSelectedStockId] = useState('');
  const [entryPrice, setEntryPrice] = useState<number | string>(1000);
  const [submittingPick, setSubmittingPick] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Real-time WIB Clock
  const [currentWibTime, setCurrentWibTime] = useState<string>('');
  const [currentWibDate, setCurrentWibDate] = useState<string>('');

  // Modals
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [cancellingPick, setCancellingPick] = useState(false);
  const [evidenceModalOpen, setEvidenceModalOpen] = useState(false);
  const [selectedEvidenceEval, setSelectedEvidenceEval] = useState<any | null>(null);

  // Live WIB clock update
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const timeStr = new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(now);

      const dateStr = new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        weekday: 'long',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(now);

      setCurrentWibTime(`${timeStr} WIB`);
      setCurrentWibDate(dateStr);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch stocks list
  const fetchStocks = useCallback(async () => {
    setLoadingStocks(true);
    try {
      const res = await fetch(`${API_BASE}/stocks`);
      if (res.ok) {
        const data = await res.json();
        setStocks(data.filter((s: Stock) => s.isActive));
        if (data.length > 0 && !selectedStockId) {
          setSelectedStockId(data[0].id);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoadingStocks(false);
    }
  }, [API_BASE, selectedStockId]);

  // Fetch user's enrolled tournaments overview
  const fetchTournamentsOverview = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/my-tournaments/picks-overview`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTournaments(data);
        if (data.length > 0 && !selectedTournamentId) {
          setSelectedTournamentId(data[0].tournamentId);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [API_BASE, token, selectedTournamentId]);

  // Fetch pick status for selected tournament
  const fetchPickStatus = useCallback(async (tourneyId: string) => {
    if (!token || !tourneyId) return;
    setLoadingPickStatus(true);
    setErrorMessage('');
    try {
      const res = await fetch(`${API_BASE}/tournaments/${tourneyId}/my-pick`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPickStatus(data);
        if (data.pick) {
          setSelectedStockId(data.pick.stockId);
          setEntryPrice(data.pick.entryPrice);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoadingPickStatus(false);
    }
  }, [API_BASE, token]);

  // Initial load & redirect if not logged in
  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    fetchTournamentsOverview();
    fetchStocks();
  }, [user, router, fetchTournamentsOverview, fetchStocks]);

  // When selected tournament changes, fetch pick status
  useEffect(() => {
    if (selectedTournamentId) {
      fetchPickStatus(selectedTournamentId);
    }
  }, [selectedTournamentId, fetchPickStatus]);

  // Filter stocks by query
  const filteredStocks = useMemo(() => {
    if (!stockSearchQuery.trim()) return stocks;
    const q = stockSearchQuery.toLowerCase();
    return stocks.filter(
      (s) => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
    );
  }, [stocks, stockSearchQuery]);

  // Selected tournament item
  const activeTournament = useMemo(() => {
    return tournaments.find((t) => t.tournamentId === selectedTournamentId) || null;
  }, [tournaments, selectedTournamentId]);

  // Selected stock object
  const chosenStock = useMemo(() => {
    return stocks.find((s) => s.id === selectedStockId) || null;
  }, [stocks, selectedStockId]);

  // Calculated Stop Loss level
  const stopLossPct = Number(activeTournament?.rules?.initialStopPct ?? 0.03);
  const trailingStopPct = Number(activeTournament?.rules?.trailingStopPct ?? 0.03);
  const calcStopLossPrice = useMemo(() => {
    const p = Number(entryPrice) || 0;
    if (p <= 0) return 0;
    return Math.round(p * (1 - stopLossPct));
  }, [entryPrice, stopLossPct]);

  // Determine current market phase
  const marketPhase = useMemo(() => {
    if (!currentWibTime) return { label: 'Memuat...', type: 'neutral', icon: Clock };
    const timeMatch = currentWibTime.match(/(\d{2}):(\d{2})/);
    if (!timeMatch) return { label: 'Memuat...', type: 'neutral', icon: Clock };
    const h = parseInt(timeMatch[1], 10);
    const m = parseInt(timeMatch[2], 10);
    const totalMinutes = h * 60 + m;

    const lockMinutes = 8 * 60 + 45; // 08:45
    const closeMinutes = 16 * 60; // 16:00

    if (totalMinutes < lockMinutes) {
      return {
        label: 'Fase Prapasar (Pengiriman Pick Dibuka)',
        description: 'Tentukan 1 saham terbaik Anda hari ini sebelum batas akhir 08:45 WIB.',
        type: 'open',
        icon: Unlock,
      };
    } else if (totalMinutes < closeMinutes) {
      return {
        label: 'Fase Sesi Bursa (Pick Terkunci)',
        description: 'Pasar IDX sedang aktif. Evaluasi trade otomatis dilakukan saat market close (16:00 WIB).',
        type: 'locked',
        icon: Lock,
      };
    } else {
      return {
        label: 'Fase Pascapasar (Evaluasi & Hasil Selesai)',
        description: 'Bursa telah tutup. Seluruh trade dievaluasi dan peringkat leaderboard diperbarui.',
        type: 'post',
        icon: Trophy,
      };
    }
  }, [currentWibTime]);

  // Handle submit pick
  const handleSubmitPick = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTournamentId || !selectedStockId) return;

    setSubmittingPick(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch(`${API_BASE}/tournaments/${selectedTournamentId}/my-pick`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          stockId: selectedStockId,
          entryPrice: Number(entryPrice) || 1000,
          entrySource: 'MARKET_OPEN',
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMessage('Pick saham harian Anda berhasil disimpan dan dikonfirmasi!');
        await fetchPickStatus(selectedTournamentId);
        await fetchTournamentsOverview();
      } else {
        setErrorMessage(data.message || 'Gagal menyimpan pick saham.');
      }
    } catch {
      setErrorMessage('Terjadi gangguan koneksi ke server API.');
    } finally {
      setSubmittingPick(false);
    }
  };

  // Handle cancel pick
  const handleCancelPick = async () => {
    if (!selectedTournamentId || !pickStatus?.pick?.id) return;

    setCancellingPick(true);
    try {
      const res = await fetch(
        `${API_BASE}/tournaments/${selectedTournamentId}/my-pick/${pickStatus.pick.id}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.ok) {
        setSuccessMessage('Pick saham harian Anda berhasil dibatalkan.');
        setConfirmCancelOpen(false);
        await fetchPickStatus(selectedTournamentId);
        await fetchTournamentsOverview();
      } else {
        const data = await res.json();
        setErrorMessage(data.message || 'Gagal membatalkan pick.');
      }
    } catch {
      setErrorMessage('Terjadi kesalahan menghubungi server.');
    } finally {
      setCancellingPick(false);
    }
  };

  // Show evidence modal
  const handleShowEvidence = (ev: any) => {
    setSelectedEvidenceEval(ev);
    setEvidenceModalOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 pb-16 flex-1 w-full">
      {/* Top Header & WIB Digital Clock */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-400">
              <CheckSquare className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              Pick Saham Harian Saya
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              Portal Peserta
            </span>
          </div>
          <p className="text-xs text-slate-400 max-w-2xl">
            Pilih 1 emiten saham terbaik Anda setiap pagi. Evaluasi Stop Loss (-3%) &amp; Trailing Stop dihitung otomatis saat pasar tutup.
          </p>
        </div>

        {/* Live WIB Clock Pill */}
        <div className="flex items-center gap-3 bg-slate-900/80 border border-slate-800 p-2.5 rounded-2xl shadow-lg shrink-0">
          <div className="w-9 h-9 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Clock className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
              Waktu Pasar (WIB)
            </div>
            <div className="text-sm font-bold font-mono text-white flex items-center gap-1.5">
              <span>{currentWibTime || '00:00:00 WIB'}</span>
              <span className="text-[10px] font-normal text-slate-400 font-sans">
                • {currentWibDate}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Market Phase Banner */}
      <div
        className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg ${
          marketPhase.type === 'open'
            ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
            : marketPhase.type === 'locked'
            ? 'bg-amber-950/20 border-amber-500/30 text-amber-300'
            : 'bg-blue-950/20 border-blue-500/30 text-blue-300'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
              marketPhase.type === 'open'
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                : marketPhase.type === 'locked'
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                : 'bg-blue-500/15 border-blue-500/30 text-blue-400'
            }`}
          >
            <marketPhase.icon className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-xs sm:text-sm text-white flex items-center gap-2">
              <span>{marketPhase.label}</span>
              {marketPhase.type === 'open' && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              )}
            </div>
            <div className="text-[11px] opacity-80 mt-0.5">{marketPhase.description}</div>
          </div>
        </div>

        <div className="text-right shrink-0">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-slate-900/60 border border-slate-700/60 text-slate-200">
            <Lock className="w-3 h-3 text-amber-400" />
            <span>Kunci Harian: 08:45 WIB</span>
          </span>
        </div>
      </div>

      {/* Global Alerts */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span className="font-semibold">{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage('')}
            className="text-emerald-400 hover:text-emerald-300"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage('')}
            className="text-rose-400 hover:text-rose-300"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 glass-panel rounded-2xl border border-slate-800">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-3" />
          <p className="text-xs text-slate-400">Memuat data turnamen kepesertaan Anda...</p>
        </div>
      ) : tournaments.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-2xl border border-slate-800 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-4 text-blue-400">
            <Trophy className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Anda Belum Mengikuti Turnamen Apapun</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mb-6">
            Daftarkan diri Anda ke turnamen aktif untuk dapat mulai mengirimkan pilihan saham harian Anda dan bertanding di papan peringkat.
          </p>
          <Link
            href="/tournaments"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/25 transition-all"
          >
            <Trophy className="w-4 h-4" />
            <span>Lihat Daftar Turnamen Tersedia</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Tournament Selector Tabs */}
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Pilih Turnamen yang Anda Ikuti ({tournaments.length})
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {tournaments.map((t) => (
                <button
                  key={t.tournamentId}
                  onClick={() => setSelectedTournamentId(t.tournamentId)}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all shrink-0 border ${
                    selectedTournamentId === t.tournamentId
                      ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/25'
                      : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Trophy className="w-3.5 h-3.5" />
                  <span>{t.tournamentName}</span>
                  {t.todayPick ? (
                    <span className="w-2 h-2 rounded-full bg-emerald-400" title="Sudah submit pick" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" title="Belum submit pick" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Grid Layout: Active Pick Hero + Rule Summary */}
          {loadingPickStatus ? (
            <div className="flex flex-col items-center justify-center py-20 glass-panel rounded-2xl border border-slate-800">
              <Loader2 className="w-6 h-6 text-blue-500 animate-spin mb-2" />
              <p className="text-xs text-slate-400">Memuat status pick turnamen...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column (2 Cols): Pick Submission / Confirmed Card */}
              <div className="lg:col-span-2 space-y-6">
                {pickStatus?.pick ? (
                  /* STATE A: PICK SUDAH DIKIRIM (CONFIRMED) */
                  <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-700/80 bg-gradient-to-br from-slate-900/90 via-slate-950/80 to-blue-950/20 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
                      <div>
                        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 mb-1">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Pilihan Saham Anda Hari Ini Telah Terkonfirmasi</span>
                        </div>
                        <h2 className="text-xl font-bold text-white">
                          Status Pick Hari Ini ({pickStatus.tradingDate})
                        </h2>
                      </div>

                      <div className="flex items-center gap-2">
                        {pickStatus.isLocked ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-sm">
                            <Lock className="w-3.5 h-3.5" />
                            <span>Terkunci (08:45 WIB)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm">
                            <Unlock className="w-3.5 h-3.5" />
                            <span>Dapat Diubah Sebelum 08:45 WIB</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Stock Hero Display */}
                    <div className="py-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center font-mono font-extrabold text-2xl text-white shadow-xl shadow-blue-500/20 shrink-0">
                          {pickStatus.pick.stock.symbol}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold text-white font-mono">
                              {pickStatus.pick.stock.symbol}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-semibold border border-slate-700">
                              IDX
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 font-medium mt-0.5">
                            {pickStatus.pick.stock.name}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs font-mono">
                        <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                          <div className="text-[10px] text-slate-500 font-sans font-semibold uppercase mb-1">
                            Harga Entry
                          </div>
                          <div className="text-sm font-bold text-white">
                            Rp {Number(pickStatus.pick.entryPrice).toLocaleString('id-ID')}
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/30">
                          <div className="text-[10px] text-rose-400 font-sans font-semibold uppercase mb-1">
                            Stop Loss (-{(stopLossPct * 100).toFixed(0)}%)
                          </div>
                          <div className="text-sm font-bold text-rose-400">
                            Rp {calcStopLossPrice.toLocaleString('id-ID')}
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 col-span-2 sm:col-span-1">
                          <div className="text-[10px] text-slate-500 font-sans font-semibold uppercase mb-1">
                            Trailing Stop
                          </div>
                          <div className="text-sm font-bold text-amber-400">
                            -{(trailingStopPct * 100).toFixed(0)}% Peak
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="text-slate-400 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>
                          Dikirim pada:{' '}
                          <strong className="text-slate-200">
                            {new Date(pickStatus.pick.createdAt).toLocaleTimeString('id-ID', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}{' '}
                            WIB
                          </strong>
                        </span>
                      </div>

                      {!pickStatus.isLocked && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setConfirmCancelOpen(true)}
                            className="px-3.5 py-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold transition-all"
                          >
                            Batalkan Pick
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* STATE B: BELUM MEMILIH SAHAM (FORMULIR INPUT PICK) */
                  <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-700/80 bg-slate-900/70 shadow-2xl relative">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-400 mb-1">
                          <Sparkles className="w-4 h-4" />
                          <span>Pilih 1 Saham Terbaik Anda Hari Ini</span>
                        </div>
                        <h2 className="text-lg font-bold text-white">
                          Formulir Pengiriman Pick ({pickStatus?.tradingDate || 'Hari Ini'})
                        </h2>
                      </div>

                      <div className="text-right">
                        <span className="text-[11px] font-mono text-slate-400">
                          Batas: <strong className="text-amber-400 font-bold">08:45 WIB</strong>
                        </span>
                      </div>
                    </div>

                    <form onSubmit={handleSubmitPick} className="space-y-6">
                      {/* Search & Stock Dropdown */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-2">
                          Pilih Kode Emiten Saham IDX *
                        </label>
                        <div className="relative mb-2">
                          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder="Ketik kode ticker atau nama (misal: BBCA, BBRI, ASII)..."
                            value={stockSearchQuery}
                            onChange={(e) => setStockSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                          />
                        </div>

                        <select
                          required
                          value={selectedStockId}
                          onChange={(e) => setSelectedStockId(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-blue-500 font-mono"
                        >
                          {filteredStocks.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.symbol} — {s.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Entry Price & Stop Loss Preview */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-2">
                            Estimasi Harga Entry (Rp) *
                          </label>
                          <input
                            type="number"
                            required
                            min={1}
                            value={entryPrice}
                            onChange={(e) => setEntryPrice(e.target.value)}
                            placeholder="Contoh: 9200"
                            className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm font-mono focus:outline-none focus:border-blue-500"
                          />
                          <p className="text-[10px] text-slate-500 mt-1">
                            Harga pembukaan pasar (Market Open 09:00 WIB).
                          </p>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-2">
                            Level Stop Loss Otomatis (-{(stopLossPct * 100).toFixed(0)}%)
                          </label>
                          <div className="w-full px-4 py-2.5 rounded-xl bg-rose-950/20 border border-rose-500/30 text-rose-300 text-sm font-mono font-bold flex items-center justify-between">
                            <span>Rp {calcStopLossPrice.toLocaleString('id-ID')}</span>
                            <span className="text-[10px] font-sans font-normal text-rose-400">
                              Cut Loss Level
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-1">
                            Jika harga turun ke level ini, posisi otomatis di-cut loss.
                          </p>
                        </div>
                      </div>

                      {/* Rule Reminder Pill */}
                      <div className="p-3.5 rounded-xl bg-blue-950/20 border border-blue-500/20 text-blue-300 text-xs flex items-center gap-2.5">
                        <HelpCircle className="w-4 h-4 shrink-0 text-blue-400" />
                        <span>
                          Trailing Stop aktif jika floating return positif melampaui ambang batas. Evaluasi dilakukan secara akurat dari bar 1-menit setelah bursa tutup.
                        </span>
                      </div>

                      {/* Submit Button */}
                      <button
                        type="submit"
                        disabled={submittingPick || pickStatus?.isLocked}
                        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-sm font-bold shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {submittingPick ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Mengonfirmasi Pilihan Saham...</span>
                          </>
                        ) : pickStatus?.isLocked ? (
                          <>
                            <Lock className="w-4 h-4" />
                            <span>Pengiriman Pick Ditutup (Sudah Lewat 08:45 WIB)</span>
                          </>
                        ) : (
                          <>
                            <CheckSquare className="w-4 h-4" />
                            <span>
                              Konfirmasi &amp; Kirim Pick {chosenStock ? chosenStock.symbol : ''} Hari Ini
                            </span>
                          </>
                        )}
                      </button>
                    </form>
                  </div>
                )}
              </div>

              {/* Right Column (1 Col): Tournament & Rules Summary Card */}
              <div className="space-y-6">
                <div className="glass-panel p-6 rounded-3xl border border-slate-800 bg-slate-900/60 shadow-xl space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
                    <Shield className="w-4 h-4 text-blue-400" />
                    <h3 className="text-sm font-bold text-white">Aturan Trading Turnamen</h3>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between py-1.5 border-b border-slate-800/60">
                      <span className="text-slate-400">Nama Turnamen</span>
                      <span className="font-semibold text-white text-right">
                        {activeTournament?.tournamentName}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1.5 border-b border-slate-800/60">
                      <span className="text-slate-400">Kapasitas Pick</span>
                      <span className="font-semibold text-emerald-400">1 Saham / Hari</span>
                    </div>

                    <div className="flex items-center justify-between py-1.5 border-b border-slate-800/60">
                      <span className="text-slate-400">Initial Stop Loss</span>
                      <span className="font-semibold text-rose-400 font-mono">
                        -{(stopLossPct * 100).toFixed(0)}%
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1.5 border-b border-slate-800/60">
                      <span className="text-slate-400">Trailing Stop</span>
                      <span className="font-semibold text-amber-400 font-mono">
                        -{(trailingStopPct * 100).toFixed(0)}% dari Peak
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1.5 border-b border-slate-800/60">
                      <span className="text-slate-400">Batas Waktu Penguncian</span>
                      <span className="font-semibold text-white font-mono">08:45 WIB</span>
                    </div>

                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-slate-400">Waktu Evaluasi</span>
                      <span className="font-semibold text-cyan-400 font-mono">16:00 WIB</span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Link
                      href={`/tournaments/${selectedTournamentId}`}
                      className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 border border-slate-700"
                    >
                      <Trophy className="w-3.5 h-3.5 text-blue-400" />
                      <span>Lihat Papan Klasemen Turnamen</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Past Picks & Results History Table */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 bg-slate-900/60 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-400" />
                  <span>Riwayat Pick &amp; Hasil Trade Saya</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Daftar seluruh saham yang pernah Anda pilih pada turnamen ini beserta hasil evaluasi pascapasar
                </p>
              </div>

              <button
                onClick={() => fetchPickStatus(selectedTournamentId)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-slate-200 text-xs"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Segarkan</span>
              </button>
            </div>

            {!pickStatus?.pastPicks || pickStatus.pastPicks.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-2xl">
                Belum ada riwayat pick tersimpan pada turnamen ini.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/80 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-4">Tanggal Trading</th>
                      <th className="py-3 px-4">Emiten Saham</th>
                      <th className="py-3 px-4 text-right">Harga Entry</th>
                      <th className="py-3 px-4 text-right">Harga Exit</th>
                      <th className="py-3 px-4 text-center">Realized Return</th>
                      <th className="py-3 px-4 text-center">Status / Outcome</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {pickStatus.pastPicks.map((p: any) => {
                      const ev = p.evaluations && p.evaluations[0];
                      const realized = ev ? Number(ev.realizedReturn) : 0;
                      const isUp = realized >= 0;

                      return (
                        <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-3.5 px-4 font-mono text-slate-400">
                            {new Date(p.tradingDate).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white font-mono">{p.stock.symbol}</span>
                              <span className="text-[11px] text-slate-500 truncate max-w-[180px]">
                                {p.stock.name}
                              </span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-right font-mono">
                            Rp {Number(p.entryPrice).toLocaleString('id-ID')}
                          </td>

                          <td className="py-3.5 px-4 text-right font-mono">
                            {ev ? `Rp ${Number(ev.exitPrice).toLocaleString('id-ID')}` : '-'}
                          </td>

                          <td className="py-3.5 px-4 text-center font-mono">
                            {ev ? (
                              <span
                                className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-xs font-bold ${
                                  isUp
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                }`}
                              >
                                {isUp ? (
                                  <ArrowUpRight className="w-3 h-3" />
                                ) : (
                                  <ArrowDownRight className="w-3 h-3" />
                                )}
                                <span>{isUp ? `+${realized.toFixed(2)}%` : `${realized.toFixed(2)}%`}</span>
                              </span>
                            ) : (
                              <span className="text-slate-500 text-[11px]">Menunggu Pasar</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            {ev ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                                {ev.exitReason}
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                CONFIRMED
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            {ev ? (
                              <button
                                onClick={() => handleShowEvidence(ev)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-all"
                              >
                                <Eye className="w-3 h-3 text-blue-400" />
                                <span>Bukti</span>
                              </button>
                            ) : (
                              <span className="text-slate-600 text-xs">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CUSTOM CONFIRMATION MODAL: BATALKAN PICK */}
      {confirmCancelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-md p-6 rounded-3xl border border-rose-500/30 bg-slate-950 shadow-2xl relative">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-white mb-1">Batalkan Pick Saham Hari Ini?</h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              Anda akan membatalkan pilihan saham <strong>{pickStatus?.pick?.stock?.symbol}</strong>. Anda dapat memilih kembali emiten lain sebelum pukul 08:45 WIB.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmCancelOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs font-semibold hover:bg-slate-800"
              >
                Kembali
              </button>
              <button
                type="button"
                disabled={cancellingPick}
                onClick={handleCancelPick}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-600/30 transition-all disabled:opacity-50"
              >
                {cancellingPick ? 'Membatalkan...' : 'Ya, Batalkan Pick'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM MODAL: EVIDENCE INSPECTOR */}
      {evidenceModalOpen && selectedEvidenceEval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-lg p-6 rounded-3xl border border-slate-700 bg-slate-950 shadow-2xl relative">
            <button
              onClick={() => setEvidenceModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-1">
              <Eye className="w-5 h-5 text-blue-400" />
              <h3 className="text-base font-bold text-white">Bukti Evaluasi Trading</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Rincian hasil perhitungan evaluasi trade kronologis 1-menit
            </p>

            <div className="space-y-3 text-xs font-mono p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-sans">Alasan Exit</span>
                <span className="text-white font-bold">{selectedEvidenceEval.exitReason}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-sans">Harga Entry</span>
                <span className="text-white">
                  Rp {Number(selectedEvidenceEval.entryPrice).toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-sans">Harga Exit</span>
                <span className="text-white font-bold">
                  Rp {Number(selectedEvidenceEval.exitPrice).toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-sans">Harga Tertinggi (Peak)</span>
                <span className="text-emerald-400">
                  Rp {Number(selectedEvidenceEval.highestPrice).toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-sans">Waktu Exit</span>
                <span className="text-slate-300">
                  {new Date(selectedEvidenceEval.exitTimestamp).toLocaleTimeString('id-ID')} WIB
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <span className="text-slate-400 font-sans">Realized Return</span>
                <span
                  className={`font-bold ${
                    Number(selectedEvidenceEval.realizedReturn) >= 0
                      ? 'text-emerald-400'
                      : 'text-rose-400'
                  }`}
                >
                  {Number(selectedEvidenceEval.realizedReturn) >= 0 ? '+' : ''}
                  {Number(selectedEvidenceEval.realizedReturn).toFixed(2)}%
                </span>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setEvidenceModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
