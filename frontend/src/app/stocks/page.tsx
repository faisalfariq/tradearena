'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import {
  TrendingUp,
  Search,
  Plus,
  Building2,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Filter,
  ShieldAlert,
  ShieldCheck,
  Percent,
  SlidersHorizontal,
  Layers,
  ArrowUpDown,
  Power,
} from 'lucide-react';

interface Stock {
  id: string;
  symbol: string;
  name: string;
  exchange: string;
  board?: string;
  isActive: boolean;
  isSuspended?: boolean;
  _count?: {
    picks: number;
  };
}

type BoardFilterType = 'ALL' | 'REGULER' | 'AKSELERASI' | 'FCA' | 'SUSPEND';
type ActiveFilterType = 'ALL' | 'ACTIVE' | 'INACTIVE';
type SortField = 'symbol' | 'name' | 'board' | 'isActive';

export default function StocksPage() {
  const router = useRouter();
  const { user, token } = useAuth();

  // Guard: Admin only
  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      router.push('/');
    }
  }, [user, router]);

  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Filters state
  const [search, setSearch] = useState('');
  const [boardFilter, setBoardFilter] = useState<BoardFilterType>('ALL');
  const [activeFilter, setActiveFilter] = useState<ActiveFilterType>('ALL');
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);

  // Sorting state
  const [sortField, setSortField] = useState<SortField>('symbol');
  const [sortAsc, setSortAsc] = useState(true);

  // Sync state
  const [syncingIdx, setSyncingIdx] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal create stock state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [symbol, setSymbol] = useState('');
  const [name, setName] = useState('');
  const [exchange, setExchange] = useState('IDX');
  const [board, setBoard] = useState('Utama');
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333/api/v1';

  // Fetch stocks list
  const fetchStocks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/stocks`);
      if (res.ok) {
        const data = await res.json();
        setStocks(data);
      }
    } catch {
      // ignore offline
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

  useEffect(() => {
    fetchStocks();
  }, [fetchStocks]);

  // Sync with IDX official database
  const handleSyncIdx = async () => {
    if (!token) return;
    setSyncingIdx(true);
    setSyncMessage(null);
    try {
      const res = await fetch(`${API_BASE}/stocks/sync-idx`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Gagal menyinkronkan data emiten IDX');
      }
      setSyncMessage({
        type: 'success',
        text: data.message || `Berhasil menyinkronkan ${data.total || 951} emiten saham IDX!`,
      });
      fetchStocks();
    } catch (err: any) {
      setSyncMessage({
        type: 'error',
        text: err.message || 'Terjadi kesalahan saat menyinkronkan emiten',
      });
    } finally {
      setSyncingIdx(false);
    }
  };

  // Toggle active/inactive
  const handleToggleActive = async (stock: Stock) => {
    if (!token) return;
    setTogglingId(stock.id);
    const updatedStatus = !stock.isActive;

    // Optimistic UI update
    setStocks((prev) =>
      prev.map((s) => (s.id === stock.id ? { ...s, isActive: updatedStatus } : s)),
    );

    try {
      const res = await fetch(`${API_BASE}/stocks/${stock.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isActive: updatedStatus,
        }),
      });

      if (!res.ok) {
        // Revert on error
        setStocks((prev) =>
          prev.map((s) => (s.id === stock.id ? { ...s, isActive: stock.isActive } : s)),
        );
      }
    } catch {
      // Revert on network error
      setStocks((prev) =>
        prev.map((s) => (s.id === stock.id ? { ...s, isActive: stock.isActive } : s)),
      );
    } finally {
      setTogglingId(null);
    }
  };

  // Create new stock
  const handleCreateStock = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    setFormLoading(true);

    try {
      const res = await fetch(`${API_BASE}/stocks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          symbol: symbol.trim().toUpperCase(),
          name: name.trim(),
          exchange: exchange.trim().toUpperCase(),
          board: board.trim(),
          isActive: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Gagal menambahkan saham');
      }

      setFormSuccess(`Saham ${data.symbol} berhasil ditambahkan!`);
      setSymbol('');
      setName('');
      fetchStocks();
      setTimeout(() => {
        setIsModalOpen(false);
        setFormSuccess('');
      }, 1500);
    } catch (err: any) {
      setFormError(err.message || 'Terjadi kesalahan saat menambahkan saham');
    } finally {
      setFormLoading(false);
    }
  };

  // Helper info calculations
  const getStockAttributes = (stock: Stock) => {
    const boardLower = (stock.board || '').toLowerCase().trim();
    const isSuspended = Boolean(stock.isSuspended);
    const isFca = boardLower.includes('pemantauan khusus') || boardLower.includes('fca');
    const isAkselerasi = boardLower.includes('akselerasi');
    const isEkonomiBaru = boardLower.includes('ekonomi baru');
    const isPengembangan = boardLower.includes('pengembangan');

    let boardLabel = stock.board || 'Utama';
    let boardBadgeColor = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    let araText = '+20% ~ +35%';
    let arbText = '-15%';
    let araColor = 'text-emerald-400';
    let arbColor = 'text-rose-400';
    let eligibility = 'Boleh Dipilih';
    let eligibilityBadge = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';

    if (isAkselerasi) {
      boardLabel = 'Akselerasi';
      boardBadgeColor = 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30';
      araText = '+10%';
      arbText = '-10%';
      araColor = 'text-indigo-400';
      arbColor = 'text-rose-400';
    } else if (isPengembangan) {
      boardLabel = 'Pengembangan';
      boardBadgeColor = 'bg-blue-500/15 text-blue-300 border-blue-500/30';
    } else if (isEkonomiBaru) {
      boardLabel = 'Ekonomi Baru';
      boardBadgeColor = 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30';
    }

    if (isFca) {
      boardLabel = 'Pemantauan Khusus';
      boardBadgeColor = 'bg-rose-500/15 text-rose-300 border-rose-500/30';
      araText = '+10%';
      arbText = '-10%';
      eligibility = 'Dilarang (FCA)';
      eligibilityBadge = 'bg-rose-500/20 text-rose-400 border-rose-500/30';
    }

    if (isSuspended) {
      araText = '0% (Suspend)';
      arbText = '0% (Suspend)';
      araColor = 'text-slate-500';
      arbColor = 'text-slate-500';
      eligibility = 'Dilarang (Suspend)';
      eligibilityBadge = 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    } else if (!stock.isActive) {
      eligibility = 'Non-aktif';
      eligibilityBadge = 'bg-slate-800 text-slate-400 border-slate-700';
    }

    return {
      boardLabel,
      boardBadgeColor,
      isFca,
      isAkselerasi,
      isSuspended,
      araText,
      arbText,
      araColor,
      arbColor,
      eligibility,
      eligibilityBadge,
    };
  };

  // Metrics overview
  const metrics = useMemo(() => {
    let reguler = 0;
    let akselerasi = 0;
    let fca = 0;
    let suspended = 0;

    stocks.forEach((s) => {
      const { isFca, isAkselerasi, isSuspended } = getStockAttributes(s);
      if (isSuspended) suspended++;
      if (isFca) fca++;
      else if (isAkselerasi) akselerasi++;
      else reguler++;
    });

    return {
      total: stocks.length,
      reguler,
      akselerasi,
      fca,
      suspended,
    };
  }, [stocks]);

  // Filtering & Sorting
  const filteredStocks = useMemo(() => {
    return stocks.filter((stock) => {
      // 1. Search Query
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchSymbol = stock.symbol.toLowerCase().includes(q);
        const matchName = stock.name.toLowerCase().includes(q);
        if (!matchSymbol && !matchName) return false;
      }

      // 2. Active filter
      if (activeFilter === 'ACTIVE' && !stock.isActive) return false;
      if (activeFilter === 'INACTIVE' && stock.isActive) return false;

      // 3. Board / Status filter
      const { isFca, isAkselerasi, isSuspended } = getStockAttributes(stock);
      if (boardFilter === 'SUSPEND') return isSuspended;
      if (boardFilter === 'FCA') return isFca;
      if (boardFilter === 'AKSELERASI') return isAkselerasi;
      if (boardFilter === 'REGULER') return !isFca && !isAkselerasi && !isSuspended;

      return true;
    });
  }, [stocks, search, activeFilter, boardFilter]);

  // Sorted list
  const sortedStocks = useMemo(() => {
    return [...filteredStocks].sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';

      if (sortField === 'symbol') {
        valA = a.symbol;
        valB = b.symbol;
      } else if (sortField === 'name') {
        valA = a.name;
        valB = b.name;
      } else if (sortField === 'board') {
        valA = a.board || '';
        valB = b.board || '';
      } else if (sortField === 'isActive') {
        valA = a.isActive ? 1 : 0;
        valB = b.isActive ? 1 : 0;
      }

      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [filteredStocks, sortField, sortAsc]);

  // Pagination
  const totalPages = Math.ceil(sortedStocks.length / pageSize) || 1;
  const paginatedStocks = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedStocks.slice(start, start + pageSize);
  }, [sortedStocks, currentPage, pageSize]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Reset to page 1 on search or filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, boardFilter, activeFilter, pageSize]);

  // Auth Guard Screen
  if (user && user.role !== 'ADMIN') {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-4">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Akses Terbatas</h2>
        <p className="text-sm text-slate-400 max-w-md">
          Katalog master emiten saham hanya dapat diakses dan dikelola oleh Administrator. Mengalihkan Anda...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold mb-2">
            <Building2 className="w-3.5 h-3.5" />
            <span>Katalog Saham Master — IDX Stock Universe</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Katalog Emiten Saham IDX
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Database master emiten bursa, status regulasi papan, persentase batas ARA & ARB, serta ketentuan pemilihan turnamen.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSyncIdx}
            disabled={syncingIdx}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-400 hover:text-cyan-300 text-xs sm:text-sm font-semibold transition-all shadow-md disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${syncingIdx ? 'animate-spin' : ''}`} />
            <span>{syncingIdx ? 'Menyinkronkan...' : 'Sync Emiten IDX Otomatis'}</span>
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs sm:text-sm font-semibold transition-all shadow-lg shadow-blue-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Emiten Baru</span>
          </button>
        </div>
      </div>

      {/* Sync Alert Message */}
      {syncMessage && (
        <div
          className={`p-4 rounded-2xl text-xs flex items-center justify-between shadow-lg ${
            syncMessage.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
              : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {syncMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span className="font-semibold">{syncMessage.text}</span>
          </div>
          <button onClick={() => setSyncMessage(null)} className="opacity-70 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Overview Summary Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Total Emiten */}
        <div className="p-4 rounded-2xl glass-panel border border-slate-800 bg-slate-900/60 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Total Emiten
            </span>
            <Layers className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-extrabold text-white font-mono">{metrics.total}</div>
            <p className="text-[10px] text-slate-500 mt-0.5">Universe Saham IDX</p>
          </div>
        </div>

        {/* Papan Reguler */}
        <div
          onClick={() => setBoardFilter('REGULER')}
          className={`p-4 rounded-2xl glass-panel border cursor-pointer transition-all flex flex-col justify-between ${
            boardFilter === 'REGULER'
              ? 'border-blue-500/50 bg-blue-950/20 shadow-md shadow-blue-500/10'
              : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider">
              Reguler
            </span>
            <ShieldCheck className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-extrabold text-white font-mono">{metrics.reguler}</div>
            <p className="text-[10px] text-blue-300/70 mt-0.5">ARA +20~35% | ARB -15%</p>
          </div>
        </div>

        {/* Papan Akselerasi */}
        <div
          onClick={() => setBoardFilter('AKSELERASI')}
          className={`p-4 rounded-2xl glass-panel border cursor-pointer transition-all flex flex-col justify-between ${
            boardFilter === 'AKSELERASI'
              ? 'border-indigo-500/50 bg-indigo-950/20 shadow-md shadow-indigo-500/10'
              : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider">
              Akselerasi
            </span>
            <Percent className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-extrabold text-white font-mono">{metrics.akselerasi}</div>
            <p className="text-[10px] text-indigo-300/70 mt-0.5">Batas ARA: +10% Mentok</p>
          </div>
        </div>

        {/* Papan FCA */}
        <div
          onClick={() => setBoardFilter('FCA')}
          className={`p-4 rounded-2xl glass-panel border cursor-pointer transition-all flex flex-col justify-between ${
            boardFilter === 'FCA'
              ? 'border-rose-500/50 bg-rose-950/20 shadow-md shadow-rose-500/10'
              : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider">
              FCA / PPK
            </span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-extrabold text-white font-mono">{metrics.fca}</div>
            <p className="text-[10px] text-rose-400/70 mt-0.5">Dilarang di Turnamen</p>
          </div>
        </div>

        {/* Disuspensi */}
        <div
          onClick={() => setBoardFilter('SUSPEND')}
          className={`p-4 rounded-2xl glass-panel border cursor-pointer transition-all flex flex-col justify-between col-span-2 sm:col-span-1 ${
            boardFilter === 'SUSPEND'
              ? 'border-amber-500/50 bg-amber-950/20 shadow-md shadow-amber-500/10'
              : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">
              Suspend
            </span>
            <AlertCircle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-extrabold text-white font-mono">{metrics.suspended}</div>
            <p className="text-[10px] text-amber-300/70 mt-0.5">Perdagangan Dihentikan</p>
          </div>
        </div>
      </div>

      {/* Filter, Search & Controls Bar */}
      <div className="p-4 rounded-2xl glass-panel border border-slate-800 bg-slate-900/70 space-y-3.5">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari emiten berdasarkan kode saham (BBCA, KOTA, IDEA) atau nama perusahaan..."
              className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs sm:text-sm placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-sans"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Filter Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Papan Dropdown / Select */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <Filter className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="text-slate-400 font-semibold text-[11px]">Papan:</span>
              <select
                value={boardFilter}
                onChange={(e) => setBoardFilter(e.target.value as BoardFilterType)}
                className="bg-transparent text-slate-200 font-medium text-xs focus:outline-none cursor-pointer pr-1"
              >
                <option value="ALL" className="bg-slate-900">Semua Papan & Status</option>
                <option value="REGULER" className="bg-slate-900">Papan Reguler (Utama & Pengembangan)</option>
                <option value="AKSELERASI" className="bg-slate-900">Papan Akselerasi (ARA 10%)</option>
                <option value="FCA" className="bg-slate-900">Pemantauan Khusus (FCA Dilarang)</option>
                <option value="SUSPEND" className="bg-slate-900">Sedang Disuspensi (Suspend)</option>
              </select>
            </div>

            {/* Keaktifan Select */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span className="text-slate-400 font-semibold text-[11px]">Aktif:</span>
              <select
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value as ActiveFilterType)}
                className="bg-transparent text-slate-200 font-medium text-xs focus:outline-none cursor-pointer pr-1"
              >
                <option value="ALL" className="bg-slate-900">Semua</option>
                <option value="ACTIVE" className="bg-slate-900">Aktif (Bisa Dipilih)</option>
                <option value="INACTIVE" className="bg-slate-900">Non-aktif</option>
              </select>
            </div>

            {/* Page Size Select */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <span className="text-slate-400 font-semibold text-[11px]">Tampilkan:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="bg-transparent text-slate-200 font-medium text-xs focus:outline-none cursor-pointer font-mono"
              >
                <option value={25} className="bg-slate-900">25</option>
                <option value={50} className="bg-slate-900">50</option>
                <option value={100} className="bg-slate-900">100</option>
                <option value={200} className="bg-slate-900">200</option>
              </select>
            </div>
          </div>
        </div>

        {/* Filter stats subtitle */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 pt-1 border-t border-slate-800/60">
          <span>
            Menampilkan <strong className="text-cyan-400 font-mono">{filteredStocks.length}</strong> emiten yang cocok dengan kriteria filter.
          </span>
          {(search || boardFilter !== 'ALL' || activeFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearch('');
                setBoardFilter('ALL');
                setActiveFilter('ALL');
              }}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              <span>Reset Filter</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Stock Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mb-3" />
            <p className="text-sm text-slate-400">Memuat database emiten saham...</p>
          </div>
        ) : filteredStocks.length === 0 ? (
          <div className="p-16 text-center">
            <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-200">Emiten Tidak Ditemukan</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
              Tidak ada emiten saham yang sesuai dengan filter atau kata kunci pencarian Anda.
            </p>
            <button
              onClick={() => {
                setSearch('');
                setBoardFilter('ALL');
                setActiveFilter('ALL');
              }}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors"
            >
              Reset Semua Filter
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[10px] font-bold">
                  <th className="py-3.5 px-3 text-center w-12">No</th>
                  <th
                    className="py-3.5 px-4 cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort('symbol')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Kode Saham</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th
                    className="py-3.5 px-4 cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Nama Perusahaan</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th
                    className="py-3.5 px-4 cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort('board')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Papan Bursa</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th className="py-3.5 px-4 text-center">Batas ARA (%)</th>
                  <th className="py-3.5 px-4 text-center">Batas ARB (%)</th>
                  <th className="py-3.5 px-4 text-center">Status Turnamen</th>
                  <th
                    className="py-3.5 px-4 text-center cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort('isActive')}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>Keaktifan</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th className="py-3.5 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {paginatedStocks.map((stock, idx) => {
                  const itemIndex = (currentPage - 1) * pageSize + idx + 1;
                  const {
                    boardLabel,
                    boardBadgeColor,
                    isFca,
                    isSuspended,
                    isAkselerasi,
                    araText,
                    arbText,
                    araColor,
                    arbColor,
                    eligibility,
                    eligibilityBadge,
                  } = getStockAttributes(stock);

                  const isToggling = togglingId === stock.id;

                  return (
                    <tr
                      key={stock.id}
                      className="hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* No */}
                      <td className="py-3.5 px-3 text-center text-slate-500 font-mono text-[11px]">
                        {itemIndex}
                      </td>

                      {/* Kode Saham */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-extrabold text-sm text-cyan-300 tracking-wide px-2 py-0.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                            {stock.symbol}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 px-1.5 py-0.5 rounded bg-slate-800/80 border border-slate-700/60 font-mono">
                            {stock.exchange}
                          </span>
                        </div>
                      </td>

                      {/* Nama Perusahaan */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-200 group-hover:text-cyan-300 transition-colors line-clamp-1 max-w-xs sm:max-w-md">
                          {stock.name}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          ID: {stock.id.substring(0, 8)}...
                        </div>
                      </td>

                      {/* Papan Bursa */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-md text-[11px] font-semibold border ${boardBadgeColor}`}
                        >
                          {boardLabel}
                        </span>
                      </td>

                      {/* Batas ARA */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`font-mono font-bold text-xs ${araColor}`}>
                          {araText}
                        </span>
                        {isAkselerasi && (
                          <div className="text-[9px] text-indigo-400 font-mono">Fraksi Rp 1</div>
                        )}
                        {!isAkselerasi && !isFca && !isSuspended && (
                          <div className="text-[9px] text-slate-500">Tiered (Harga)</div>
                        )}
                      </td>

                      {/* Batas ARB */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`font-mono font-bold text-xs ${arbColor}`}>
                          {arbText}
                        </span>
                        {isAkselerasi && (
                          <div className="text-[9px] text-indigo-400 font-mono">Fraksi Rp 1</div>
                        )}
                        {!isAkselerasi && !isFca && !isSuspended && (
                          <div className="text-[9px] text-slate-500">BEI Asimetris</div>
                        )}
                      </td>

                      {/* Status Turnamen */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold border ${eligibilityBadge}`}
                        >
                          {eligibility}
                        </span>
                      </td>

                      {/* Keaktifan */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            stock.isActive
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              stock.isActive ? 'bg-emerald-400' : 'bg-slate-500'
                            }`}
                          />
                          <span>{stock.isActive ? 'Aktif' : 'Non-aktif'}</span>
                        </span>
                      </td>

                      {/* Aksi */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(stock)}
                          disabled={isToggling}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all disabled:opacity-50 ${
                            stock.isActive
                              ? 'bg-rose-500/10 text-rose-300 border-rose-500/25 hover:bg-rose-500/20'
                              : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25 hover:bg-emerald-500/20'
                          }`}
                          title={stock.isActive ? 'Klik untuk non-aktifkan emiten' : 'Klik untuk aktifkan emiten'}
                        >
                          {isToggling ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Power className="w-3 h-3" />
                          )}
                          <span>{stock.isActive ? 'Nonaktifkan' : 'Aktifkan'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {sortedStocks.length > 0 && (
          <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <p className="text-slate-400 text-center sm:text-left">
              Menampilkan{' '}
              <span className="font-semibold text-slate-200">
                {(currentPage - 1) * pageSize + 1}
              </span>{' '}
              –{' '}
              <span className="font-semibold text-slate-200">
                {Math.min(currentPage * pageSize, sortedStocks.length)}
              </span>{' '}
              dari{' '}
              <span className="font-semibold text-cyan-400 font-mono">
                {sortedStocks.length}
              </span>{' '}
              emiten
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Sebelumnya</span>
              </button>

              <span className="text-xs text-slate-400 px-2 font-mono">
                Halaman {currentPage} / {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <span>Berikutnya</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Tambah Saham Baru */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl border border-slate-700 shadow-2xl relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-cyan-600/15 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Tambah Emiten Saham</h3>
                <p className="text-xs text-slate-400">Masukkan ticker dan klasifikasi papan bursa baru</p>
              </div>
            </div>

            {formError && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium flex items-center gap-2 mb-4">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium flex items-center gap-2 mb-4">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreateStock} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Ticker Saham (4-6 Karakter) *
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  placeholder="Contoh: BBCA"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm uppercase font-mono font-bold focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nama Resmi Perusahaan *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Bank Central Asia Tbk"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Bursa Efek
                  </label>
                  <input
                    type="text"
                    value={exchange}
                    onChange={(e) => setExchange(e.target.value.toUpperCase())}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Papan Perdagangan *
                  </label>
                  <select
                    value={board}
                    onChange={(e) => setBoard(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-cyan-500"
                  >
                    <option value="Utama">Papan Utama</option>
                    <option value="Pengembangan">Papan Pengembangan</option>
                    <option value="Akselerasi">Papan Akselerasi</option>
                    <option value="Pemantauan Khusus">Papan Pemantauan Khusus</option>
                    <option value="Ekonomi Baru">Papan Ekonomi Baru</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-semibold transition-all shadow-md shadow-blue-600/20 flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {formLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>Simpan Saham</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
