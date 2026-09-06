'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import {
  Trophy,
  Users,
  TrendingUp,
  ArrowLeft,
  Calendar,
  ShieldAlert,
  Sliders,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  Trash2,
  ExternalLink,
  ChevronRight,
  Clock,
  Coins,
  Database,
  RefreshCw,
  BarChart3,
  Eye,
  Play,
} from 'lucide-react';

interface TournamentRule {
  id: string;
  initialStopPct: number | string;
  trailingStopPct: number | string;
  candleAmbiguityPolicy: string;
  gapPolicy: string;
  priceFractionPolicy: string;
  pointsRule: string;
  calculationRuleVersion: string;
}

interface TournamentDetail {
  id: string;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string;
  timezone: string;
  status: 'UPCOMING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  rules: TournamentRule | null;
}

interface EnrolledParticipant {
  membershipId: string;
  tournamentId: string;
  joinedAt: string;
  participant: {
    id: string;
    name: string;
    email: string | null;
    phoneNumber: string | null;
  };
  picksCount: number;
}

interface Stock {
  id: string;
  symbol: string;
  name: string;
  exchange: string;
  isActive: boolean;
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
  participant: {
    id: string;
    name: string;
  };
  stock: {
    id: string;
    symbol: string;
    name: string;
  };
}

interface MarketSyncItem {
  id: string;
  symbol: string;
  candleCount?: number;
  candlesCount?: number;
  status: 'SUCCESS' | 'FAILED';
  errorMessage: string | null;
  createdAt: string;
}

interface MarketSyncRun {
  id: string;
  tournamentId: string;
  tradingDate: string;
  provider: string;
  status: 'RUNNING' | 'SUCCESS' | 'PARTIAL' | 'FAILED';
  totalSymbols: number;
  syncedSymbols?: number;
  syncedCount?: number;
  startedAt: string;
  completedAt: string | null;
  errorMessage: string | null;
  items?: MarketSyncItem[];
}

interface CandleData {
  id: string;
  symbol: string;
  tradingDate: string;
  timestamp: string;
  open: number | string;
  high: number | string;
  low: number | string;
  close: number | string;
  volume: number;
}

export default function TournamentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, token } = useAuth();
  const tournamentId = params?.id as string;

  const [tournament, setTournament] = useState<TournamentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'PARTICIPANTS' | 'PICKS' | 'SYNC'>('PICKS');

  // Enrolled Participants state
  const [enrolled, setEnrolled] = useState<EnrolledParticipant[]>([]);
  const [loadingEnrolled, setLoadingEnrolled] = useState(false);

  // Available participants for enrollment
  const [allParticipants, setAllParticipants] = useState<{ id: string; name: string }[]>([]);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [selectedParticipantToEnroll, setSelectedParticipantToEnroll] = useState('');
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [enrollError, setEnrollError] = useState('');

  // Stock Picks state
  const [picks, setPicks] = useState<StockPick[]>([]);
  const [loadingPicks, setLoadingPicks] = useState(false);
  const [pickDateFilter, setPickDateFilter] = useState('');
  const [isPickModalOpen, setIsPickModalOpen] = useState(false);

  // Available stocks for pick creation
  const [stocksList, setStocksList] = useState<Stock[]>([]);
  const [stockSearchQuery, setStockSearchQuery] = useState('');

  // New Pick Form states
  const [pickParticipantId, setPickParticipantId] = useState('');
  const [pickStockId, setPickStockId] = useState('');
  const [pickDate, setPickDate] = useState('');
  const [pickPrice, setPickPrice] = useState<number | string>('');
  const [pickSource, setPickSource] = useState('MARKET_OPEN');
  const [pickLoading, setPickLoading] = useState(false);
  const [pickError, setPickError] = useState('');
  const [pickSuccess, setPickSuccess] = useState('');

  // Market Data Sync states
  const [syncRuns, setSyncRuns] = useState<MarketSyncRun[]>([]);
  const [loadingSyncRuns, setLoadingSyncRuns] = useState(false);
  const [syncDate, setSyncDate] = useState('');
  const [syncProvider, setSyncProvider] = useState<'mock' | 'http'>('mock');
  const [triggeringSync, setTriggeringSync] = useState(false);
  const [syncError, setSyncError] = useState('');
  const [syncSuccess, setSyncSuccess] = useState('');

  // Selected Sync Run for details modal
  const [selectedSyncRun, setSelectedSyncRun] = useState<MarketSyncRun | null>(null);
  const [loadingSyncDetail, setLoadingSyncDetail] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Candle preview state
  const [previewSymbol, setPreviewSymbol] = useState<string | null>(null);
  const [previewDate, setPreviewDate] = useState<string>('');
  const [previewCandles, setPreviewCandles] = useState<CandleData[]>([]);
  const [loadingCandles, setLoadingCandles] = useState(false);
  const [isCandleModalOpen, setIsCandleModalOpen] = useState(false);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333/api/v1';

  // Fetch tournament details
  const fetchTournament = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/tournaments/${tournamentId}`);
      if (res.ok) {
        const data = await res.json();
        setTournament(data);
        if (!pickDate) {
          const today = new Date().toISOString().substring(0, 10);
          const start = data.startDate.substring(0, 10);
          const end = data.endDate.substring(0, 10);
          if (today >= start && today <= end) {
            setPickDate(today);
          } else {
            setPickDate(start);
          }
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [API_BASE, tournamentId, pickDate]);

  // Fetch enrolled participants
  const fetchEnrolled = useCallback(async () => {
    setLoadingEnrolled(true);
    try {
      const res = await fetch(`${API_BASE}/tournaments/${tournamentId}/participants`);
      if (res.ok) {
        const data = await res.json();
        setEnrolled(data);
      }
    } catch {
      // ignore
    } finally {
      setLoadingEnrolled(false);
    }
  }, [API_BASE, tournamentId]);

  // Fetch all registered participants
  const fetchAllParticipants = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/participants`);
      if (res.ok) {
        const data = await res.json();
        setAllParticipants(data);
      }
    } catch {
      // ignore
    }
  }, [API_BASE]);

  // Fetch stocks catalog
  const fetchStocks = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/stocks?isActive=true`);
      if (res.ok) {
        const data = await res.json();
        setStocksList(data);
      }
    } catch {
      // ignore
    }
  }, [API_BASE]);

  // Fetch picks for tournament
  const fetchPicks = useCallback(async () => {
    setLoadingPicks(true);
    try {
      const url = pickDateFilter
        ? `${API_BASE}/tournaments/${tournamentId}/picks?tradingDate=${pickDateFilter}`
        : `${API_BASE}/tournaments/${tournamentId}/picks`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setPicks(data);
      }
    } catch {
      // ignore
    } finally {
      setLoadingPicks(false);
    }
  }, [API_BASE, tournamentId, pickDateFilter]);

  // Fetch sync runs for tournament
  const fetchSyncRuns = useCallback(async () => {
    setLoadingSyncRuns(true);
    try {
      const res = await fetch(`${API_BASE}/tournaments/${tournamentId}/market-sync`);
      if (res.ok) {
        const data = await res.json();
        setSyncRuns(data);
      }
    } catch {
      // ignore
    } finally {
      setLoadingSyncRuns(false);
    }
  }, [API_BASE, tournamentId]);

  useEffect(() => {
    fetchTournament();
    fetchEnrolled();
    fetchAllParticipants();
    fetchStocks();
    fetchPicks();
    fetchSyncRuns();
  }, [fetchTournament, fetchEnrolled, fetchAllParticipants, fetchStocks, fetchPicks, fetchSyncRuns]);

  // Trigger sync run handler
  const handleTriggerSync = async (e: React.FormEvent) => {
    e.preventDefault();
    setSyncError('');
    setSyncSuccess('');
    setTriggeringSync(true);

    try {
      const targetDate = syncDate || tournament?.startDate.substring(0, 10);
      const res = await fetch(`${API_BASE}/tournaments/${tournamentId}/market-sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          tradingDate: targetDate,
          provider: syncProvider,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Gagal memulai penarikan market data');
      }

      setSyncSuccess(
        `Sinkronisasi berhasil! ${data.syncedSymbols}/${data.totalSymbols} emiten berhasil diproses (${data.status}).`,
      );
      fetchSyncRuns();
    } catch (err) {
      setSyncError((err as Error).message);
    } finally {
      setTriggeringSync(false);
    }
  };

  // View detail of a sync run
  const handleViewRunDetails = async (runId: string) => {
    setLoadingSyncDetail(true);
    setIsDetailModalOpen(true);
    try {
      const res = await fetch(`${API_BASE}/tournaments/${tournamentId}/market-sync/${runId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedSyncRun(data);
      }
    } catch {
      // ignore
    } finally {
      setLoadingSyncDetail(false);
    }
  };

  // Preview candle data
  const handlePreviewCandles = async (symbol: string, tradingDate: string) => {
    setPreviewSymbol(symbol);
    setPreviewDate(tradingDate);
    setIsCandleModalOpen(true);
    setLoadingCandles(true);
    try {
      const res = await fetch(
        `${API_BASE}/market-data/candles?symbol=${symbol}&tradingDate=${tradingDate}&limit=100`,
      );
      if (res.ok) {
        const data = await res.json();
        setPreviewCandles(data);
      }
    } catch {
      // ignore
    } finally {
      setLoadingCandles(false);
    }
  };

  // Enroll participant handler
  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnrollError('');
    setEnrollLoading(true);

    try {
      const res = await fetch(`${API_BASE}/tournaments/${tournamentId}/participants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ participantId: selectedParticipantToEnroll }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Gagal mendaftarkan peserta');
      }

      setIsEnrollModalOpen(false);
      setSelectedParticipantToEnroll('');
      fetchEnrolled();
    } catch (err: any) {
      setEnrollError(err.message || 'Terjadi kesalahan saat mendaftarkan');
    } finally {
      setEnrollLoading(false);
    }
  };

  // Submit pick handler
  const handleCreatePick = async (e: React.FormEvent) => {
    e.preventDefault();
    setPickError('');
    setPickSuccess('');
    setPickLoading(true);

    try {
      const res = await fetch(`${API_BASE}/tournaments/${tournamentId}/picks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          participantId: pickParticipantId,
          stockId: pickStockId,
          tradingDate: pickDate,
          entryPrice: Number(pickPrice),
          entrySource: pickSource,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Gagal menyimpan stock pick');
      }

      setPickSuccess('Stock pick berhasil disimpan!');
      setPickPrice('');
      fetchPicks();
      fetchEnrolled();
      setTimeout(() => {
        setIsPickModalOpen(false);
        setPickSuccess('');
      }, 1200);
    } catch (err: any) {
      setPickError(err.message || 'Terjadi kesalahan saat submit pick');
    } finally {
      setPickLoading(false);
    }
  };

  // Delete pick handler
  const handleDeletePick = async (pickId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus stock pick ini?')) return;

    try {
      const res = await fetch(`${API_BASE}/picks/${pickId}`, {
        method: 'DELETE',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      if (res.ok) {
        fetchPicks();
        fetchEnrolled();
      }
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-3" />
        <p className="text-sm text-slate-400">Memuat detail turnamen...</p>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-white">Turnamen Tidak Ditemukan</h2>
        <p className="text-xs text-slate-400 mt-1 mb-6">ID turnamen tidak valid atau telah dihapus.</p>
        <Link
          href="/tournaments"
          className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold"
        >
          Kembali ke Daftar Turnamen
        </Link>
      </div>
    );
  }

  const unenrolledParticipants = allParticipants.filter(
    (ap) => !enrolled.some((ep) => ep.participant.id === ap.id),
  );

  const filteredStocks = stocksList.filter(
    (s) =>
      s.symbol.toLowerCase().includes(stockSearchQuery.toLowerCase()) ||
      s.name.toLowerCase().includes(stockSearchQuery.toLowerCase()),
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Back Button */}
      <Link
        href="/tournaments"
        className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Kembali ke Daftar Turnamen</span>
      </Link>

      {/* Header Banner */}
      <div className="glass-panel p-8 rounded-3xl border border-slate-800 shadow-xl mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 blur-[100px] pointer-events-none rounded-full" />

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                  tournament.status === 'ACTIVE'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : tournament.status === 'UPCOMING'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                }`}
              >
                {tournament.status}
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                {tournament.timezone}
              </span>
            </div>

            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              {tournament.name}
            </h1>
            <p className="text-sm text-slate-400 mt-2 max-w-2xl">
              {tournament.description || 'Tidak ada deskripsi turnamen.'}
            </p>

            <div className="flex items-center gap-4 text-xs text-slate-400 mt-4">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>
                  {new Date(tournament.startDate).toLocaleDateString('id-ID')} s/d{' '}
                  {new Date(tournament.endDate).toLocaleDateString('id-ID')}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-blue-400" />
                <span>{enrolled.length} Peserta</span>
              </div>
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                <span>{picks.length} Total Picks</span>
              </div>
            </div>
          </div>

          {/* Rules highlight card */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center gap-5 shrink-0">
            <div className="text-center">
              <span className="text-[10px] font-medium text-slate-400 block uppercase">
                Initial CL
              </span>
              <span className="text-xl font-extrabold text-rose-400 font-mono">
                -{(Number(tournament.rules?.initialStopPct || 0.03) * 100).toFixed(0)}%
              </span>
            </div>
            <div className="w-[1px] h-8 bg-slate-800" />
            <div className="text-center">
              <span className="text-[10px] font-medium text-slate-400 block uppercase">
                Trailing Stop
              </span>
              <span className="text-xl font-extrabold text-amber-400 font-mono">
                -{(Number(tournament.rules?.trailingStopPct || 0.03) * 100).toFixed(0)}%
              </span>
              <span className="text-[9px] text-slate-500 block">dari peak</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-8 overflow-x-auto">
        <button
          onClick={() => setActiveTab('PICKS')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            activeTab === 'PICKS'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Stock Picks Harian ({picks.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('PARTICIPANTS')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            activeTab === 'PARTICIPANTS'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Peserta Terdaftar ({enrolled.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('SYNC')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            activeTab === 'SYNC'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>Data Pasar & Sync ({syncRuns.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('OVERVIEW')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            activeTab === 'OVERVIEW'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Aturan Trading & Konfigurasi</span>
        </button>
      </div>

      {/* TAB 1: STOCK PICKS */}
      {activeTab === 'PICKS' && (
        <div>
          {/* Pick actions toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Filter Tanggal:</span>
              </div>
              <input
                type="date"
                value={pickDateFilter}
                onChange={(e) => setPickDateFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
              />
              {pickDateFilter && (
                <button
                  onClick={() => setPickDateFilter('')}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Reset
                </button>
              )}
            </div>

            {user && (
              <button
                onClick={() => {
                  if (enrolled.length === 0) {
                    alert('Daftarkan minimal satu peserta terlebih dahulu di tab Peserta Terdaftar.');
                    return;
                  }
                  if (!pickParticipantId && enrolled[0]) {
                    setPickParticipantId(enrolled[0].participant.id);
                  }
                  if (!pickStockId && stocksList[0]) {
                    setPickStockId(stocksList[0].id);
                  }
                  setIsPickModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-semibold shadow-md shadow-blue-600/20"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Submit Stock Pick</span>
              </button>
            )}
          </div>

          {/* Picks Table */}
          {loadingPicks ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-3" />
              <p className="text-sm text-slate-400">Memuat daftar picks...</p>
            </div>
          ) : picks.length === 0 ? (
            <div className="glass-panel p-12 text-center rounded-2xl border border-slate-800">
              <TrendingUp className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <h3 className="text-base font-semibold text-slate-200">Belum Ada Stock Pick</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-6">
                {pickDateFilter
                  ? `Tidak ada stock pick pada tanggal ${pickDateFilter}.`
                  : 'Peserta belum memasukkan pilihan saham untuk turnamen ini.'}
              </p>
              {user && (
                <button
                  onClick={() => {
                    if (enrolled.length === 0) {
                      alert('Daftarkan peserta terlebih dahulu!');
                      return;
                    }
                    setIsPickModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Submit Pick Pertama</span>
                </button>
              )}
            </div>
          ) : (
            <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800/80 bg-slate-900/40 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      <th className="py-4 px-6">Peserta</th>
                      <th className="py-4 px-6">Saham (Ticker)</th>
                      <th className="py-4 px-6">Tanggal Trading</th>
                      <th className="py-4 px-6 text-right">Harga Entry</th>
                      <th className="py-4 px-6 text-center">Sumber Entry</th>
                      <th className="py-4 px-6 text-center">Status</th>
                      {user && <th className="py-4 px-6 text-center">Aksi</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-sm">
                    {picks.map((pick) => (
                      <tr key={pick.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-4 px-6">
                          <span className="font-semibold text-slate-200">
                            {pick.participant.name}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 font-mono font-bold text-xs">
                              {pick.stock.symbol}
                            </span>
                            <span className="text-xs text-slate-400 hidden sm:inline">
                              {pick.stock.name}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-xs text-slate-300 font-mono">
                          {new Date(pick.tradingDate).toISOString().substring(0, 10)}
                        </td>
                        <td className="py-4 px-6 text-right font-mono font-bold text-slate-100">
                          Rp {Number(pick.entryPrice).toLocaleString('id-ID')}
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                            {pick.entrySource}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                            {pick.status}
                          </span>
                        </td>
                        {user && (
                          <td className="py-4 px-6 text-center">
                            <button
                              onClick={() => handleDeletePick(pick.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                              title="Hapus Pick"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PARTICIPANTS */}
      {activeTab === 'PARTICIPANTS' && (
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h3 className="text-lg font-bold text-white">Peserta Terdaftar</h3>
              <p className="text-xs text-slate-400">
                Peserta yang memiliki hak submit pick dalam turnamen ini
              </p>
            </div>

            {user && (
              <button
                onClick={() => {
                  if (unenrolledParticipants.length > 0) {
                    setSelectedParticipantToEnroll(unenrolledParticipants[0].id);
                  }
                  setIsEnrollModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/20 self-start"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Daftarkan Peserta</span>
              </button>
            )}
          </div>

          {loadingEnrolled ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-3" />
              <p className="text-sm text-slate-400">Memuat peserta turnamen...</p>
            </div>
          ) : enrolled.length === 0 ? (
            <div className="glass-panel p-12 text-center rounded-2xl border border-slate-800">
              <Users className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <h3 className="text-base font-semibold text-slate-200">Belum Ada Peserta Terdaftar</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-6">
                Turnamen ini belum memiliki peserta terdaftar. Daftarkan trader dari daftar peserta.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {enrolled.map((ep) => (
                <div
                  key={ep.membershipId}
                  className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-400 font-bold text-sm flex items-center justify-center uppercase">
                      {ep.participant.name.substring(0, 2)}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white">
                        {ep.participant.name}
                      </h4>
                      <p className="text-xs text-slate-400">
                        {ep.participant.email || ep.participant.phoneNumber || 'ID Peserta'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Picks Turnamen</span>
                    <span className="text-sm font-bold text-emerald-400 font-mono">
                      {ep.picksCount}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: OVERVIEW & RULES */}
      {activeTab === 'OVERVIEW' && tournament.rules && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-panel p-6 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2 mb-4">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
              <h3 className="text-base font-bold text-white">Aturan Stop Loss & Exit</h3>
            </div>
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-slate-400 block mb-1">Initial Cut Loss Policy</span>
                <span className="text-sm font-bold text-rose-400 font-mono">
                  -{(Number(tournament.rules.initialStopPct) * 100).toFixed(1)}% dari Harga Entry
                </span>
                <p className="text-[11px] text-slate-500 mt-1">
                  Threshold minimal -3% wajib dipatuhi. Simualted exit dieksekusi pada harga actual tick IDX.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-slate-400 block mb-1">Trailing Stop Policy</span>
                <span className="text-sm font-bold text-amber-400 font-mono">
                  -{(Number(tournament.rules.trailingStopPct) * 100).toFixed(1)}% dari Highest Peak
                </span>
                <p className="text-[11px] text-slate-500 mt-1">
                  Trailing stop mengikuti puncak harga tertinggi (highest valid price) selama intraday.
                </p>
              </div>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2 mb-4">
              <Sliders className="w-5 h-5 text-cyan-400" />
              <h3 className="text-base font-bold text-white">Kebijakan Eksekusi & Data</h3>
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Candle Ambiguity:</span>
                <span className="font-semibold text-slate-200">
                  {tournament.rules.candleAmbiguityPolicy}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Gap Execution Policy:</span>
                <span className="font-semibold text-slate-200">
                  {tournament.rules.gapPolicy}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Price Fraction (Fraksi Harga):</span>
                <span className="font-semibold text-slate-200">
                  {tournament.rules.priceFractionPolicy}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Points Calculation Rule:</span>
                <span className="font-semibold text-slate-200">
                  {tournament.rules.pointsRule}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-slate-400">Rule Engine Version:</span>
                <span className="font-mono text-cyan-400">
                  {tournament.rules.calculationRuleVersion}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: MARKET DATA & SYNC */}
      {activeTab === 'SYNC' && (
        <div className="space-y-6">
          {/* Sync Trigger Card */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Database className="w-5 h-5 text-blue-400" />
                  <h3 className="text-base font-bold text-white">
                    Sinkronisasi Data Pasar Intraday 1-Menit
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-600/20 text-blue-400 border border-blue-500/20">
                    IDX Canonical
                  </span>
                </div>
                <p className="text-xs text-slate-400 max-w-2xl">
                  Tarik bar candle 1-menit kanonikal untuk seluruh emiten unik yang dipilih peserta turnamen pada tanggal yang ditentukan. Menghindari duplikasi emiten dan memvalidasi geometri OHLC serta jam bursa WIB.
                </p>
              </div>

              {/* Action Form */}
              <form
                onSubmit={handleTriggerSync}
                className="flex flex-wrap items-center gap-3 bg-slate-900/90 p-3 rounded-2xl border border-slate-800"
              >
                <div>
                  <label className="block text-[10px] font-medium text-slate-400 mb-1">
                    Tanggal Perdagangan
                  </label>
                  <input
                    type="date"
                    required
                    value={syncDate || (tournament ? tournament.startDate.substring(0, 10) : '')}
                    onChange={(e) => setSyncDate(e.target.value)}
                    min={tournament?.startDate.substring(0, 10)}
                    max={tournament?.endDate.substring(0, 10)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-slate-400 mb-1">
                    Provider
                  </label>
                  <select
                    value={syncProvider}
                    onChange={(e) => setSyncProvider(e.target.value as 'mock' | 'http')}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-blue-500"
                  >
                    <option value="mock">Mock IDX (Deterministik 330 Bar)</option>
                    <option value="http">HTTP Provider (API Eksternal)</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={triggeringSync}
                    className="inline-flex items-center gap-2 px-4 py-2 mt-4 md:mt-0 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-blue-600/20 transition-all disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${triggeringSync ? 'animate-spin' : ''}`} />
                    <span>{triggeringSync ? 'Sinkronisasi...' : 'Tarik Data (Sync)'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Notification messages */}
            {syncSuccess && (
              <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{syncSuccess}</span>
                </div>
                <button
                  onClick={() => setSyncSuccess('')}
                  className="text-emerald-400 hover:text-emerald-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {syncError && (
              <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{syncError}</span>
                </div>
                <button
                  onClick={() => setSyncError('')}
                  className="text-red-400 hover:text-red-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Sync Runs History */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-bold text-white">Riwayat Eksekusi Sinkronisasi</h4>
                <p className="text-xs text-slate-400">
                  Daftar run market data yang pernah dijalankan untuk turnamen ini
                </p>
              </div>
              <button
                onClick={fetchSyncRuns}
                disabled={loadingSyncRuns}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-slate-200 text-xs"
              >
                <RefreshCw className={`w-3 h-3 ${loadingSyncRuns ? 'animate-spin' : ''}`} />
                <span>Segarkan</span>
              </button>
            </div>

            {loadingSyncRuns ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-6 h-6 text-blue-500 animate-spin mb-2" />
                <p className="text-xs text-slate-400">Memuat riwayat sync...</p>
              </div>
            ) : syncRuns.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl">
                <Database className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-300">Belum Ada Data Pasar yang Di-sync</p>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Pilih tanggal trading dan klik tombol &quot;Tarik Data (Sync)&quot; di atas untuk menarik data candle intraday 1-menit.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-[11px] text-slate-400 uppercase bg-slate-900/60 border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Tanggal Trading</th>
                      <th className="py-3 px-4 font-semibold">Provider</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold">Emiten Ter-sync</th>
                      <th className="py-3 px-4 font-semibold">Waktu Eksekusi</th>
                      <th className="py-3 px-4 font-semibold text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {syncRuns.map((run) => (
                      <tr key={run.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-medium text-slate-200">
                          {run.tradingDate.substring(0, 10)}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-400 uppercase">
                            {run.provider}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              run.status === 'SUCCESS'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : run.status === 'PARTIAL'
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                : run.status === 'RUNNING'
                                ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                run.status === 'SUCCESS'
                                  ? 'bg-emerald-400'
                                  : run.status === 'PARTIAL'
                                  ? 'bg-amber-400'
                                  : run.status === 'RUNNING'
                                  ? 'bg-blue-400 animate-pulse'
                                  : 'bg-rose-400'
                              }`}
                            />
                            {run.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono">
                          <span className="text-white font-bold">
                            {run.syncedCount ?? run.syncedSymbols ?? 0}
                          </span>
                          <span className="text-slate-500"> / {run.totalSymbols} Emiten</span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                          {new Date(run.startedAt).toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}{' '}
                          WIB
                          {run.completedAt && (
                            <span className="text-slate-500 ml-1">
                              (
                              {Math.max(
                                0,
                                Math.round(
                                  (new Date(run.completedAt).getTime() -
                                    new Date(run.startedAt).getTime()) /
                                    1000,
                                ),
                              )}
                              s)
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleViewRunDetails(run.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all border border-slate-700"
                          >
                            <Eye className="w-3.5 h-3.5 text-blue-400" />
                            <span>Lihat Rincian</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL ENROLL PARTICIPANT */}
      {isEnrollModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl border border-slate-700 shadow-2xl relative">
            <button
              onClick={() => setIsEnrollModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-1">Daftarkan Peserta ke Turnamen</h3>
            <p className="text-xs text-slate-400 mb-6">
              Pilih peserta dari master data untuk didaftarkan ke turnamen ini
            </p>

            {enrollError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs mb-4 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{enrollError}</span>
              </div>
            )}

            {unenrolledParticipants.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-xs text-slate-400 mb-4">
                  Semua peserta yang terdaftar di master sudah mengikuti turnamen ini.
                </p>
                <Link
                  href="/participants"
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold"
                >
                  Tambah Peserta Baru di Master
                </Link>
              </div>
            ) : (
              <form onSubmit={handleEnroll} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Pilih Peserta
                  </label>
                  <select
                    value={selectedParticipantToEnroll}
                    onChange={(e) => setSelectedParticipantToEnroll(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                  >
                    {unenrolledParticipants.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsEnrollModalOpen(false)}
                    className="flex-1 py-2 rounded-xl border border-slate-700 text-slate-300 text-xs font-semibold"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={enrollLoading}
                    className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold disabled:opacity-50"
                  >
                    {enrollLoading ? 'Mendaftarkan...' : 'Daftarkan'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL SUBMIT STOCK PICK */}
      {isPickModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-lg p-6 rounded-2xl border border-slate-700 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsPickModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-1">Submit Stock Pick Peserta</h3>
            <p className="text-xs text-slate-400 mb-6">
              Pilihan emiten harian untuk dievaluasi otomatis saat market close
            </p>

            {pickError && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs mb-4 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{pickError}</span>
              </div>
            )}

            {pickSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{pickSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreatePick} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Peserta Turnamen *
                </label>
                <select
                  required
                  value={pickParticipantId}
                  onChange={(e) => setPickParticipantId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                >
                  {enrolled.map((ep) => (
                    <option key={ep.participant.id} value={ep.participant.id}>
                      {ep.participant.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Pilih Emiten Saham IDX *
                </label>
                <div className="mb-2">
                  <input
                    type="text"
                    placeholder="Filter ticker atau nama (misal: BBCA)..."
                    value={stockSearchQuery}
                    onChange={(e) => setStockSearchQuery(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 text-xs placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <select
                  required
                  value={pickStockId}
                  onChange={(e) => setPickStockId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-blue-500 font-mono"
                >
                  {filteredStocks.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.symbol} — {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Tanggal Perdagangan *
                  </label>
                  <input
                    type="date"
                    required
                    value={pickDate}
                    onChange={(e) => setPickDate(e.target.value)}
                    min={tournament.startDate.substring(0, 10)}
                    max={tournament.endDate.substring(0, 10)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Harga Entry (Rp) *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={pickPrice}
                    onChange={(e) => setPickPrice(e.target.value)}
                    placeholder="Contoh: 9200"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Sumber Harga Entry
                </label>
                <select
                  value={pickSource}
                  onChange={(e) => setPickSource(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="MARKET_OPEN">Market Open (Pembukaan Jam 09:00 WIB)</option>
                  <option value="MANUAL_PRICE">Manual Price (Harga Manual)</option>
                  <option value="CUSTOM_TIMESTAMP">Custom Timestamp</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPickModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={pickLoading}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all shadow-md shadow-blue-600/20 disabled:opacity-50"
                >
                  {pickLoading ? 'Menyimpan Pick...' : 'Simpan Stock Pick'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL SYNC RUN INGESTION DETAILS */}
      {isDetailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-3xl p-6 rounded-2xl border border-slate-700 shadow-2xl relative max-h-[90vh] flex flex-col">
            <button
              onClick={() => setIsDetailModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-4">
              <div className="flex items-center gap-2 mb-1">
                <Database className="w-5 h-5 text-blue-400" />
                <h3 className="text-lg font-bold text-white">
                  Rincian Ingestion Market Data
                </h3>
              </div>
              {selectedSyncRun && (
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
                  <span>
                    Tanggal:{' '}
                    <strong className="text-white font-mono">{selectedSyncRun.tradingDate}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Provider:{' '}
                    <strong className="text-cyan-400 font-mono uppercase">
                      {selectedSyncRun.provider}
                    </strong>
                  </span>
                  <span>•</span>
                  <span>
                    Status:{' '}
                    <strong
                      className={
                        selectedSyncRun.status === 'SUCCESS' ? 'text-emerald-400' : 'text-amber-400'
                      }
                    >
                      {selectedSyncRun.status}
                    </strong>
                  </span>
                  <span>•</span>
                  <span>
                    Total:{' '}
                    <strong className="text-white">
                      {selectedSyncRun.syncedCount ?? selectedSyncRun.syncedSymbols ?? 0}/
                      {selectedSyncRun.totalSymbols} Emiten
                    </strong>
                  </span>
                </div>
              )}
            </div>

            {loadingSyncDetail ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-3" />
                <p className="text-xs text-slate-400">Memuat rincian emiten...</p>
              </div>
            ) : !selectedSyncRun?.items || selectedSyncRun.items.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs border border-dashed border-slate-800 rounded-xl">
                Tidak ada item emiten dalam run ini.
              </div>
            ) : (
              <div className="overflow-y-auto flex-1 border border-slate-800 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="text-[11px] text-slate-400 uppercase bg-slate-900/80 sticky top-0 border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Simbol Emiten</th>
                      <th className="py-3 px-4 font-semibold">Status Sync</th>
                      <th className="py-3 px-4 font-semibold">Bar 1-Menit</th>
                      <th className="py-3 px-4 font-semibold">Keterangan</th>
                      <th className="py-3 px-4 font-semibold text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {selectedSyncRun.items.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-800/30">
                        <td className="py-3 px-4 font-mono font-bold text-white text-sm">
                          {item.symbol}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              item.status === 'SUCCESS'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-300">
                          {item.candlesCount ?? item.candleCount ?? 0} bar
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-[11px]">
                          {item.errorMessage || 'Data tersinkronisasi dan lolos validasi'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() =>
                              handlePreviewCandles(item.symbol, selectedSyncRun.tradingDate)
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-xs font-semibold border border-blue-500/30 transition-all"
                          >
                            <BarChart3 className="w-3.5 h-3.5" />
                            <span>Preview Candle</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="pt-4 mt-4 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1-MINUTE CANDLE INSPECTOR */}
      {isCandleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-4xl p-6 rounded-2xl border border-slate-700 shadow-2xl relative max-h-[90vh] flex flex-col">
            <button
              onClick={() => setIsCandleModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-4">
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-lg font-bold text-white">
                  Inspeksi Candle Intraday 1-Menit ({previewSymbol})
                </h3>
              </div>
              <p className="text-xs text-slate-400">
                Tanggal: <span className="text-white font-mono">{previewDate}</span> • Total Dimuat:{' '}
                <span className="text-white font-mono">{previewCandles.length} bar</span> (Kanonikal
                IDX)
              </p>
            </div>

            {loadingCandles ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-3" />
                <p className="text-xs text-slate-400">Memuat bar candle 1-menit...</p>
              </div>
            ) : previewCandles.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs border border-dashed border-slate-800 rounded-xl">
                Tidak ada data candle tersimpan untuk emiten dan tanggal ini.
              </div>
            ) : (
              <div className="overflow-y-auto flex-1 border border-slate-800 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="text-[11px] text-slate-400 uppercase bg-slate-900/90 sticky top-0 border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">Waktu (WIB)</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Open</th>
                      <th className="py-2.5 px-3 font-semibold text-right">High</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Low</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Close</th>
                      <th className="py-2.5 px-3 font-semibold text-center">Return</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Volume</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {previewCandles.map((c) => {
                      const o = Number(c.open);
                      const cl = Number(c.close);
                      const ret = ((cl - o) / o) * 100;
                      const isUp = cl >= o;

                      return (
                        <tr key={c.id} className="hover:bg-slate-800/30">
                          <td className="py-2 px-3 text-slate-300">
                            {new Date(c.timestamp).toLocaleTimeString('id-ID', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </td>
                          <td className="py-2 px-3 text-right text-slate-200">
                            Rp {Number(c.open).toLocaleString('id-ID')}
                          </td>
                          <td className="py-2 px-3 text-right text-emerald-400">
                            Rp {Number(c.high).toLocaleString('id-ID')}
                          </td>
                          <td className="py-2 px-3 text-right text-rose-400">
                            Rp {Number(c.low).toLocaleString('id-ID')}
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-white">
                            Rp {Number(c.close).toLocaleString('id-ID')}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                isUp
                                  ? 'bg-emerald-500/10 text-emerald-400'
                                  : 'bg-rose-500/10 text-rose-400'
                              }`}
                            >
                              {ret > 0 ? `+${ret.toFixed(2)}%` : `${ret.toFixed(2)}%`}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right text-slate-400">
                            {Number(c.volume).toLocaleString('id-ID')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="pt-4 mt-4 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setIsCandleModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
              >
                Tutup Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
