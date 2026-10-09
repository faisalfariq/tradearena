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
  Layers,
  Plus,
  Trash2,
  Info,
  ChevronDown,
  Check,
} from 'lucide-react';

interface Stock {
  id: string;
  symbol: string;
  name: string;
  exchange: string;
  board?: string;
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
  completionType?: string;
  targetPoints?: number;
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
  const [isStockDropdownOpen, setIsStockDropdownOpen] = useState(false);
  const stockDropdownRef = React.useRef<HTMLDivElement>(null);
  const stockSearchInputRef = React.useRef<HTMLInputElement>(null);
  const [submittingPick, setSubmittingPick] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Close combobox on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        stockDropdownRef.current &&
        !stockDropdownRef.current.contains(event.target as Node)
      ) {
        setIsStockDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-focus search input inside combobox when opened
  useEffect(() => {
    if (isStockDropdownOpen && stockSearchInputRef.current) {
      setTimeout(() => {
        stockSearchInputRef.current?.focus();
      }, 50);
    }
  }, [isStockDropdownOpen]);

  // Real-time WIB Clock
  const [currentWibTime, setCurrentWibTime] = useState<string>('');
  const [currentWibDate, setCurrentWibDate] = useState<string>('');

  // Modals
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [pickToCancel, setPickToCancel] = useState<{ id: string; symbol: string } | null>(null);
  const [cancellingPick, setCancellingPick] = useState(false);
  const [evidenceModalOpen, setEvidenceModalOpen] = useState(false);
  const [selectedEvidenceEval, setSelectedEvidenceEval] = useState<any | null>(null);

  // Live WIB clock update
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const timeStr = new Intl.DateTimeFormat('en-GB', {
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
        const active = data.filter((s: Stock) => s.isActive);
        setStocks(active);
        if (active.length > 0 && !selectedStockId) {
          setSelectedStockId(active[0].id);
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

  // Filter stocks by query (exclude stocks already picked in today's active picks)
  const currentPickedStockIds = useMemo(() => {
    if (!pickStatus?.picks) return new Set<string>();
    return new Set<string>(pickStatus.picks.map((p: any) => p.stockId));
  }, [pickStatus?.picks]);

  const filteredStocks = useMemo(() => {
    const available = stocks.filter((s) => !currentPickedStockIds.has(s.id));
    if (!stockSearchQuery.trim()) return available.slice(0, 150);
    const q = stockSearchQuery.toLowerCase().trim();
    return available.filter(
      (s) => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
    );
  }, [stocks, currentPickedStockIds, stockSearchQuery]);

  // Ensure selectedStockId defaults to first available stock once stocks are loaded
  useEffect(() => {
    const available = stocks.filter((s) => !currentPickedStockIds.has(s.id));
    if (available.length > 0) {
      if (!selectedStockId || !available.some((s) => s.id === selectedStockId)) {
        setSelectedStockId(available[0].id);
      }
    }
  }, [stocks, currentPickedStockIds, selectedStockId]);

  // Selected tournament item
  const activeTournament = useMemo(() => {
    return tournaments.find((t) => t.tournamentId === selectedTournamentId) || null;
  }, [tournaments, selectedTournamentId]);

  // Selected stock object in dropdown
  const chosenStock = useMemo(() => {
    return stocks.find((s) => s.id === selectedStockId) || null;
  }, [stocks, selectedStockId]);

  // Limits & Rules
  const minPicks = pickStatus?.pickLimits?.minPicks ?? 2;
  const maxPicks = pickStatus?.pickLimits?.maxPicks ?? 3;
  const activePicks: StockPick[] = pickStatus?.picks || (pickStatus?.pick ? [pickStatus.pick] : []);
  const currentCount = activePicks.length;
  const remainingSlots = Math.max(0, maxPicks - currentCount);

  const stopLossPct = Number(activeTournament?.rules?.initialStopPct ?? 0.03);
  const trailingStopPct = Number(activeTournament?.rules?.trailingStopPct ?? 0.03);

  const pickWindowStart = pickStatus?.pickWindow?.start || '17:00';
  const pickWindowEnd = pickStatus?.pickWindow?.end || '21:00';

  // Determine current market phase for Evening Pick Window (17:00 - 21:00 WIB)
  const marketPhase = useMemo(() => {
    if (!currentWibTime) return { label: 'Memuat...', type: 'neutral', icon: Clock, description: '' };
    const timeMatch = currentWibTime.match(/(\d{2})[:.](\d{2})/);
    if (!timeMatch) return { label: 'Memuat...', type: 'neutral', icon: Clock, description: '' };
    const h = parseInt(timeMatch[1], 10);
    const m = parseInt(timeMatch[2], 10);
    const totalMinutes = h * 60 + m;

    const [startH, startM] = pickWindowStart.split(':').map((v: string) => parseInt(v, 10));
    const [endH, endM] = pickWindowEnd.split(':').map((v: string) => parseInt(v, 10));
    const startMin = startH * 60 + startM;
    const endMin = endH * 60 + endM;

    if (pickStatus?.pickWindow?.isForceOpen) {
      return {
        label: 'Jendela Pick Dibuka Manual oleh Admin (Akses Terbuka)',
        description: 'Admin turnamen mengaktifkan override jendela pick. Anda dapat memilih emiten sekarang di luar jam reguler!',
        type: 'open',
        icon: Unlock,
      };
    }

    if (totalMinutes >= startMin && totalMinutes <= endMin) {
      return {
        label: `Window Pick Dibuka (${pickWindowStart} – ${pickWindowEnd} WIB)`,
        description: `Pilih 2–3 emiten untuk sesi besok. Harga Closing hari ini otomatis dikunci sebagai harga Entry resmi.`,
        type: 'open',
        icon: Unlock,
      };
    } else if (totalMinutes < startMin && totalMinutes >= 16 * 60) {
      return {
        label: 'Pascapasar IDX (Persiapan Window Pick)',
        description: `Market IDX telah tutup. Window pemilihan pick dibuka pukul ${pickWindowStart} WIB.`,
        type: 'post',
        icon: Clock,
      };
    } else if (totalMinutes >= 9 * 60 && totalMinutes < 16 * 60) {
      return {
        label: 'Sesi Bursa IDX Berlangsung (Pick Terkunci)',
        description: 'Sesi trading aktif. Stop Loss (-3%) & Trailing Stop dievaluasi otomatis.',
        type: 'locked',
        icon: Lock,
      };
    } else {
      return {
        label: `Window Pick Ditutup (Batas ${pickWindowEnd} WIB)`,
        description: `Pilihan saham untuk sesi berikutnya telah dikunci. Window pick dibuka kembali pukul ${pickWindowStart} WIB.`,
        type: 'closed',
        icon: Lock,
      };
    }
  }, [currentWibTime, pickWindowStart, pickWindowEnd, pickStatus?.pickWindow?.isForceOpen]);

  // Handle submit pick (adding 1 stock to the picklist, locks closing price automatically)
  const handleAddStockPick = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTournamentId || !selectedStockId) return;

    if (currentCount >= maxPicks) {
      setErrorMessage(`Batas maksimum ${maxPicks} emiten per hari telah tercapai.`);
      return;
    }

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
          entrySource: 'CLOSING_PRICE',
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMessage(`Emiten ${chosenStock?.symbol || 'saham'} berhasil ditambahkan ke picklist harian!`);
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

  // Open modal to cancel specific pick
  const promptCancelPick = (p: StockPick) => {
    setPickToCancel({ id: p.id, symbol: p.stock?.symbol || 'saham' });
    setConfirmCancelOpen(true);
  };

  // Handle cancel pick
  const handleConfirmCancelPick = async () => {
    if (!selectedTournamentId || !pickToCancel) return;

    setCancellingPick(true);
    try {
      const res = await fetch(
        `${API_BASE}/tournaments/${selectedTournamentId}/my-pick/${pickToCancel.id}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.ok) {
        setSuccessMessage(`Pilihan emiten ${pickToCancel.symbol} berhasil dibatalkan.`);
        setConfirmCancelOpen(false);
        setPickToCancel(null);
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

  // Group past picks by tradingDate with daily accumulated return / points
  const groupedPastPicks = useMemo(() => {
    if (!pickStatus?.pastPicks) return [];
    const map = new Map<string, any[]>();
    for (const p of pickStatus.pastPicks) {
      const d = p.tradingDate ? p.tradingDate.split('T')[0] : 'Unknown';
      if (!map.has(d)) {
        map.set(d, []);
      }
      map.get(d)!.push(p);
    }

    return Array.from(map.entries()).map(([dateStr, picksList]) => {
      let totalReturn = 0;
      let evaluatedCount = 0;
      for (const p of picksList) {
        if (p.evaluations && p.evaluations.length > 0) {
          totalReturn += Number(p.evaluations[0].realizedReturn || 0);
          evaluatedCount++;
        }
      }
      return {
        dateStr,
        picks: picksList,
        totalReturn,
        evaluatedCount,
      };
    });
  }, [pickStatus?.pastPicks]);

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
              Multi-Pick (2–3 Emiten)
            </span>
          </div>
          <p className="text-xs text-slate-400 max-w-2xl">
            Pilih 2 sampai 3 emiten terbaik Anda pada window sore (17:00 – 21:00 WIB). Harga Closing pasar hari ini otomatis dikunci sebagai harga Entry sesi besok. Poin harian adalah akumulasi hasil seluruh emiten.
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
            : marketPhase.type === 'locked' || marketPhase.type === 'closed'
            ? 'bg-amber-950/20 border-amber-500/30 text-amber-300'
            : 'bg-blue-950/20 border-blue-500/30 text-blue-300'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
              marketPhase.type === 'open'
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                : marketPhase.type === 'locked' || marketPhase.type === 'closed'
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

        <div className="text-right shrink-0 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900/80 border border-slate-700/60 text-slate-200">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>Sesi Target: {pickStatus?.tradingDate ? new Date(pickStatus.tradingDate).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' }) : 'D+1'}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900/80 border border-slate-700/60 text-amber-300">
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>Cut-off: {pickWindowEnd} WIB</span>
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
            Daftarkan diri Anda ke turnamen aktif untuk dapat mulai mengirimkan 2–3 pilihan saham harian Anda dan bertanding di papan peringkat.
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
                    <span className="w-2 h-2 rounded-full bg-emerald-400" title="Sudah ada pick tersimpan" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" title="Belum ada pick" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Grid Layout: Active Multi-Pick Slots + Rules & Quota Summary */}
          {loadingPickStatus ? (
            <div className="flex flex-col items-center justify-center py-20 glass-panel rounded-2xl border border-slate-800">
              <Loader2 className="w-6 h-6 text-blue-500 animate-spin mb-2" />
              <p className="text-xs text-slate-400">Memuat status pick turnamen...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-30">
              {/* Left Column (2 Cols): Multi-Pick Slots & Add Stock Form */}
              <div className="lg:col-span-2 space-y-6 relative z-30">
                {/* Status Header & Quota Progress */}
                <div className="glass-panel p-6 rounded-3xl border border-slate-800 bg-slate-900/70 shadow-xl space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 mb-1">
                        <Layers className="w-4 h-4" />
                        <span>Tanggal Evaluasi: {pickStatus?.tradingDate || 'Sesi Berikutnya'}</span>
                      </div>
                      <h2 className="text-xl font-bold text-white">
                        Daftar Pilihan Saham Harian ({currentCount}/{maxPicks} Emiten)
                      </h2>
                    </div>

                    <div className="flex items-center gap-2">
                      {currentCount < minPicks ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                          <span>Kurang {minPicks - currentCount} Emiten (Wajib Min. {minPicks})</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Kuota Terpenuhi ({currentCount} Emiten)</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Info notice about Closing Price locking */}
                  <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>Sistem Otomatisasi Harga Closing:</strong> Setiap emiten yang Anda submit otomatis mengunci harga Closing bursa hari ini sebagai harga Entry sesi evaluasi berikutnya (hari bursa aktif). Picklist dapat diubah atau dibatalkan bebas sebelum pukul {pickWindowEnd} WIB.
                    </span>
                  </div>

                  {/* Slots Cards List */}
                  <div className="space-y-3 pt-2">
                    {Array.from({ length: maxPicks }).map((_, idx) => {
                      const pick = activePicks[idx];
                      const slotNum = idx + 1;

                      if (pick) {
                        const entry = Number(pick.entryPrice) || 0;
                        const slPrice = Math.round(entry * (1 - stopLossPct));

                        return (
                          <div
                            key={pick.id}
                            className="p-4 rounded-2xl border border-slate-700/80 bg-slate-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-slate-600"
                          >
                            <div className="flex items-center gap-3.5">
                              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center font-mono font-bold text-lg text-white shadow-md shadow-blue-500/20 shrink-0">
                                {pick.stock?.symbol}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 uppercase">
                                    Slot {slotNum}
                                  </span>
                                  <span className="text-base font-bold text-white font-mono">
                                    {pick.stock?.symbol}
                                  </span>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-semibold">
                                    IDX
                                  </span>
                                </div>
                                <div className="text-xs text-slate-400 mt-0.5 max-w-xs truncate">
                                  {pick.stock?.name}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-4 sm:gap-6 justify-between sm:justify-end">
                              <div className="text-right font-mono text-xs">
                                <div className="text-[10px] text-slate-400 font-sans">Harga Closing (Entry)</div>
                                <div className="text-sm font-bold text-white">
                                  Rp {entry.toLocaleString('id-ID')}
                                </div>
                              </div>

                              <div className="text-right font-mono text-xs">
                                <div className="text-[10px] text-rose-400 font-sans">Cut Loss (-{(stopLossPct * 100).toFixed(0)}%)</div>
                                <div className="text-sm font-bold text-rose-400">
                                  Rp {slPrice.toLocaleString('id-ID')}
                                </div>
                              </div>

                              {!pickStatus?.isLocked && (
                                <button
                                  type="button"
                                  onClick={() => promptCancelPick(pick)}
                                  className="p-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all"
                                  title="Batalkan slot emiten ini"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      }

                      // Empty Slot
                      return (
                        <div
                          key={`empty-slot-${idx}`}
                          className="p-4 rounded-2xl border border-dashed border-slate-800 bg-slate-950/20 flex items-center justify-between text-xs text-slate-500"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="w-6 h-6 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center font-bold text-[11px] text-slate-400">
                              {slotNum}
                            </span>
                            <span>Slot Kosong {slotNum <= minPicks ? '(Wajib Diisi)' : '(Opsional)'}</span>
                          </div>
                          <span className="text-[11px] text-slate-600">
                            {pickStatus?.isLocked ? 'Terkunci' : 'Menunggu Pilihan'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Add Stock to Picklist Form (Only visible if remaining slots > 0 and pick window not locked) */}
                {remainingSlots > 0 && !pickStatus?.isLocked && (
                  <div className="glass-panel relative z-40 p-6 sm:p-8 rounded-3xl border border-blue-500/30 bg-slate-900/80 shadow-2xl space-y-5">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
                          <Plus className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-white">
                            Tambah Emiten ke Slot {currentCount + 1}
                          </h3>
                          <p className="text-[11px] text-slate-400">
                            Tersedia sisa {remainingSlots} slot pick emiten untuk sesi besok
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-mono text-cyan-400 font-bold">
                        Batas {pickWindowEnd} WIB
                      </span>
                    </div>

                    <form onSubmit={handleAddStockPick} className="space-y-4">
                      <div className="relative z-50" ref={stockDropdownRef}>
                        <label className="block text-xs font-semibold text-slate-300 mb-2">
                          Pilih Kode Saham IDX (950+ Emiten) *
                        </label>

                        {/* Combobox Trigger Button */}
                        <button
                          type="button"
                          onClick={() => setIsStockDropdownOpen((prev) => !prev)}
                          className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-blue-500/50 text-left flex items-center justify-between transition-all focus:outline-none focus:ring-1 focus:ring-blue-500 group shadow-inner"
                        >
                          {chosenStock ? (
                            <div className="flex items-center gap-2 min-w-0 pr-2">
                              <span className="px-2.5 py-1 rounded-lg bg-blue-500/20 text-cyan-400 font-mono font-bold text-xs shrink-0 border border-blue-500/30">
                                {chosenStock.symbol}
                              </span>
                              {chosenStock.board?.toLowerCase().includes('akselerasi') && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
                                  Akselerasi (ARA 10%)
                                </span>
                              )}
                              <span className="text-sm font-medium text-slate-200 truncate">
                                {chosenStock.name}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-slate-500">
                              -- Pilih emiten saham IDX --
                            </span>
                          )}
                          <ChevronDown
                            className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                              isStockDropdownOpen ? 'rotate-180 text-blue-400' : 'group-hover:text-slate-300'
                            }`}
                          />
                        </button>

                        {/* Floating Searchable Dropdown Popover */}
                        {isStockDropdownOpen && (
                          <div className="absolute left-0 right-0 top-full mt-2 z-50 rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl backdrop-blur-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                            {/* Embedded Search Header */}
                            <div className="p-3 border-b border-slate-800 bg-slate-950/90 sticky top-0 z-10 space-y-2">
                              <div className="relative">
                                <Search className="w-4 h-4 text-blue-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <input
                                  ref={stockSearchInputRef}
                                  type="text"
                                  value={stockSearchQuery}
                                  onChange={(e) => setStockSearchQuery(e.target.value)}
                                  placeholder="Ketik ticker atau nama (misal: BBCA, ASII, GOTO)..."
                                  className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                />
                                {stockSearchQuery && (
                                  <button
                                    type="button"
                                    onClick={() => setStockSearchQuery('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                              <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                                <span>
                                  {filteredStocks.length} emiten tersedia
                                </span>
                                {stockSearchQuery && (
                                  <span className="text-[10px] text-cyan-400 font-mono">
                                    Hasil filter: &quot;{stockSearchQuery}&quot;
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Scrollable Stock List */}
                            <div className="max-h-60 sm:max-h-72 overflow-y-auto divide-y divide-slate-800/40 p-1.5 custom-scrollbar">
                              {filteredStocks.length === 0 ? (
                                <div className="py-8 text-center text-xs text-slate-500 px-4">
                                  Tidak ada emiten yang cocok dengan pencarian &quot;{stockSearchQuery}&quot;.
                                </div>
                              ) : (
                                filteredStocks.map((stock) => {
                                  const isSelected = stock.id === selectedStockId;
                                  const boardLower = (stock.board || '').toLowerCase();
                                  const isFca = boardLower.includes('pemantauan khusus') || boardLower.includes('fca');
                                  const isAkselerasi = boardLower.includes('akselerasi');
                                  return (
                                    <button
                                      key={stock.id}
                                      type="button"
                                      disabled={isFca}
                                      onClick={() => {
                                        if (isFca) return;
                                        setSelectedStockId(stock.id);
                                        setIsStockDropdownOpen(false);
                                      }}
                                      className={`w-full px-3 py-2.5 rounded-xl flex items-center justify-between text-left transition-all ${
                                        isFca
                                          ? 'opacity-40 bg-rose-950/20 text-slate-500 cursor-not-allowed border border-rose-900/30'
                                          : isSelected
                                          ? 'bg-blue-600/25 border border-blue-500/40 text-white'
                                          : 'hover:bg-slate-800/70 text-slate-300'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2 min-w-0 pr-2">
                                        <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-cyan-300 font-mono font-bold text-xs shrink-0 border border-blue-500/30">
                                          {stock.symbol}
                                        </span>
                                        {isAkselerasi && (
                                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
                                            Akselerasi (ARA 10%)
                                          </span>
                                        )}
                                        {isFca && (
                                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 shrink-0">
                                            FCA (Dilarang)
                                          </span>
                                        )}
                                        <span className="text-xs truncate font-medium text-slate-200">
                                          {stock.name}
                                        </span>
                                      </div>
                                      {isSelected && (
                                        <Check className="w-4 h-4 text-cyan-400 shrink-0 ml-2" />
                                      )}
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Stock Rules & Preview */}
                      <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                            Metode Entry
                          </span>
                          <span className="text-cyan-400 font-bold">
                            Closing Price Hari Ini
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                            Aturan Stop Loss
                          </span>
                          <span className="text-rose-400 font-bold">
                            -{(stopLossPct * 100).toFixed(0)}% Initial / -{(trailingStopPct * 100).toFixed(0)}% Trailing
                          </span>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={submittingPick || !selectedStockId || filteredStocks.length === 0}
                        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-sm font-bold shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {submittingPick ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Mengunci Emiten...</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4" />
                            <span>
                              Tambahkan {chosenStock ? chosenStock.symbol : ''} ke Picklist Saya
                            </span>
                          </>
                        )}
                      </button>
                    </form>
                  </div>
                )}
              </div>

              {/* Right Column (1 Col): Rules Summary & Target Points Info */}
              <div className="space-y-6">
                <div className="glass-panel p-6 rounded-3xl border border-slate-800 bg-slate-900/60 shadow-xl space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
                    <Shield className="w-4 h-4 text-blue-400" />
                    <h3 className="text-sm font-bold text-white">Ketentuan Turnamen</h3>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between py-1.5 border-b border-slate-800/60">
                      <span className="text-slate-400">Turnamen</span>
                      <span className="font-semibold text-white text-right max-w-[170px] truncate">
                        {activeTournament?.tournamentName}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1.5 border-b border-slate-800/60">
                      <span className="text-slate-400">Kriteria Selesai</span>
                      <span className="font-semibold text-purple-400 font-mono">
                        {activeTournament?.completionType === 'TARGET_POINTS'
                          ? `Target ${activeTournament.targetPoints || 300} Poin`
                          : 'Periode Waktu'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1.5 border-b border-slate-800/60">
                      <span className="text-slate-400">Kuota Pick Harian</span>
                      <span className="font-semibold text-cyan-400 font-mono">
                        {minPicks} – {maxPicks} Emiten / Hari
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1.5 border-b border-slate-800/60">
                      <span className="text-slate-400">Window Pick Sore</span>
                      <span className="font-semibold text-white font-mono">
                        {pickWindowStart} – {pickWindowEnd} WIB
                      </span>
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
                        -{(trailingStopPct * 100).toFixed(0)}% Peak
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-slate-400">Akumulasi Poin</span>
                      <span className="font-semibold text-emerald-400">
                        Sum Realized Semua Pick
                      </span>
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

          {/* Past Picks & Results History Table (Grouped by Trading Date with Daily Accumulation) */}
          <div className="glass-panel relative z-10 p-6 rounded-3xl border border-slate-800 bg-slate-900/60 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-400" />
                  <span>Riwayat Pick &amp; Akumulasi Hasil Trade Harian</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Daftar seluruh pilihan emiten Anda per sesi perdagangan beserta total akumulasi poin harian (+3% + 3% - 3% = +3 poin)
                </p>
              </div>

              <button
                onClick={() => fetchPickStatus(selectedTournamentId)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-slate-200 text-xs self-start sm:self-auto"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Segarkan Data</span>
              </button>
            </div>

            {groupedPastPicks.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-2xl">
                Belum ada riwayat pick tersimpan pada turnamen ini.
              </div>
            ) : (
              <div className="space-y-6">
                {groupedPastPicks.map((group) => {
                  const isDayPositive = group.totalReturn >= 0;

                  return (
                    <div
                      key={group.dateStr}
                      className="rounded-2xl border border-slate-800 bg-slate-950/40 overflow-hidden shadow-lg"
                    >
                      {/* Daily Header Summary */}
                      <div className="px-4 py-3 bg-slate-900/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-xs text-white">
                            Sesi Evaluasi: {new Date(group.dateStr).toLocaleDateString('id-ID', {
                              weekday: 'long',
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })}
                          </span>
                          <span className="text-[10px] text-slate-400 px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700">
                            {group.picks.length} Emiten
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400 font-sans">
                            Total Akumulasi Poin Sesi:
                          </span>
                          <span
                            className={`px-3 py-1 rounded-xl text-xs font-bold font-mono border ${
                              isDayPositive
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            }`}
                          >
                            {isDayPositive ? `+${group.totalReturn.toFixed(2)}` : group.totalReturn.toFixed(2)} Poin ({isDayPositive ? '+' : ''}{group.totalReturn.toFixed(2)}%)
                          </span>
                        </div>
                      </div>

                      {/* Picks Table for This Date */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-slate-800/80 bg-slate-900/40 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                              <th className="py-2.5 px-4">Emiten</th>
                              <th className="py-2.5 px-4 text-right">Harga Entry</th>
                              <th className="py-2.5 px-4 text-right">Harga Exit</th>
                              <th className="py-2.5 px-4 text-center">Realized Return</th>
                              <th className="py-2.5 px-4 text-center">Outcome / Alasan</th>
                              <th className="py-2.5 px-4 text-right">Detail</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/50 text-slate-300">
                            {group.picks.map((p: any) => {
                              const ev = p.evaluations && p.evaluations[0];
                              const realized = ev ? Number(ev.realizedReturn) : 0;
                              const isUp = realized >= 0;

                              return (
                                <tr key={p.id} className="hover:bg-slate-800/20 transition-colors">
                                  <td className="py-3 px-4">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-white font-mono">{p.stock?.symbol}</span>
                                      <span className="text-[11px] text-slate-500 truncate max-w-[180px]">
                                        {p.stock?.name}
                                      </span>
                                    </div>
                                  </td>

                                  <td className="py-3 px-4 text-right font-mono">
                                    Rp {Number(p.entryPrice).toLocaleString('id-ID')}
                                  </td>

                                  <td className="py-3 px-4 text-right font-mono">
                                    {ev ? `Rp ${Number(ev.exitPrice).toLocaleString('id-ID')}` : '-'}
                                  </td>

                                  <td className="py-3 px-4 text-center font-mono">
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

                                  <td className="py-3 px-4 text-center">
                                    {ev ? (
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                                        {ev.exitReason}
                                      </span>
                                    ) : (
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                        TERKONFIRMASI
                                      </span>
                                    )}
                                  </td>

                                  <td className="py-3 px-4 text-right">
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
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CUSTOM CONFIRMATION MODAL: BATALKAN PICK INDIVIDUAL */}
      {confirmCancelOpen && pickToCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-md p-6 rounded-3xl border border-rose-500/30 bg-slate-950 shadow-2xl relative">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-white mb-1">Batalkan Pick Emiten {pickToCancel.symbol}?</h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              Pilihan emiten <strong className="text-white">{pickToCancel.symbol}</strong> akan dihapus dari picklist harian Anda. Anda dapat memilih kembali emiten pengganti sebelum batas akhir pukul {pickWindowEnd} WIB.
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
                onClick={handleConfirmCancelPick}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-600/30 transition-all disabled:opacity-50"
              >
                {cancellingPick ? 'Membatalkan...' : 'Ya, Batalkan Emiten'}
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
