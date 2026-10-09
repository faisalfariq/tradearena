'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  ExternalLink,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface Stock {
  id: string;
  symbol: string;
  name: string;
  exchange: string;
  isActive: boolean;
  _count?: {
    picks: number;
  };
}

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
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Sync state
  const [syncingIdx, setSyncingIdx] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 24;

  // Form states
  const [symbol, setSymbol] = useState('');
  const [name, setName] = useState('');
  const [exchange, setExchange] = useState('IDX');
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333/api/v1';

  const fetchStocks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (activeFilter === 'ACTIVE') params.append('isActive', 'true');
      if (activeFilter === 'INACTIVE') params.append('isActive', 'false');

      const res = await fetch(`${API_BASE}/stocks?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setStocks(data);
      }
    } catch {
      // offline fallback
    } finally {
      setLoading(false);
    }
  }, [API_BASE, search, activeFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStocks();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchStocks]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, activeFilter]);

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

  const totalPages = Math.ceil(stocks.length / pageSize) || 1;
  const paginatedStocks = stocks.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold mb-3">
            <Building2 className="w-3.5 h-3.5" />
            <span>Katalog Saham Master — IDX Stock Universe</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Katalog Emiten Saham IDX
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Daftar resmi emiten Bursa Efek Indonesia yang dapat dipilih oleh peserta turnamen
          </p>
        </div>

        <div className="flex items-center gap-3">
          {user?.role === 'ADMIN' && (
            <button
              onClick={handleSyncIdx}
              disabled={syncingIdx}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-400 hover:text-cyan-300 text-sm font-semibold transition-all shadow-md disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${syncingIdx ? 'animate-spin' : ''}`} />
              <span>{syncingIdx ? 'Menyinkronkan IDX...' : 'Sync Emiten IDX Otomatis'}</span>
            </button>
          )}

          {user && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-sm font-semibold transition-all shadow-lg shadow-blue-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Emiten Baru</span>
            </button>
          )}
        </div>
      </div>

      {/* Sync Message Alert */}
      {syncMessage && (
        <div
          className={`p-4 rounded-2xl mb-6 text-xs flex items-center justify-between shadow-lg ${
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

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari berdasarkan ticker (misal: BBCA, ASII) atau nama perusahaan..."
            className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-100 text-sm placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 self-start sm:self-auto">
          {(['ACTIVE', 'ALL', 'INACTIVE'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveFilter(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeFilter === tab
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab === 'ACTIVE' ? 'Aktif' : tab === 'ALL' ? 'Semua' : 'Non-aktif'}
            </button>
          ))}
        </div>
      </div>

      {/* Stock count header */}
      <div className="flex items-center justify-between text-xs text-slate-400 mb-4 px-1">
        <span>
          Total: <strong className="text-white font-mono">{stocks.length}</strong> emiten IDX terdaftar
        </span>
        {totalPages > 1 && (
          <span>
            Halaman {currentPage} dari {totalPages}
          </span>
        )}
      </div>

      {/* Stocks Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-3" />
          <p className="text-sm text-slate-400">Memuat katalog saham...</p>
        </div>
      ) : stocks.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-2xl border border-slate-800">
          <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-base font-semibold text-slate-200">Emiten Tidak Ditemukan</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-6">
            {search
              ? 'Tidak ada emiten yang sesuai dengan kata kunci pencarian Anda.'
              : 'Belum ada emiten yang terdaftar dalam katalog.'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {paginatedStocks.map((stock) => (
              <div
                key={stock.id}
                className="glass-panel p-5 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all hover:translate-y-[-2px] group"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600/20 to-cyan-500/20 border border-blue-500/30 flex items-center justify-center">
                      <span className="font-extrabold text-sm text-cyan-400 font-mono">
                        {stock.symbol}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {stock.exchange}
                      </span>
                      <span
                        className={`ml-1.5 inline-block w-1.5 h-1.5 rounded-full ${
                          stock.isActive ? 'bg-emerald-400' : 'bg-rose-400'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                <h4 className="text-sm font-semibold text-slate-100 group-hover:text-blue-400 transition-colors line-clamp-1" title={stock.name}>
                  {stock.name}
                </h4>
                <p className="text-[11px] text-slate-500 font-mono mt-1">
                  ID: {stock.id.substring(0, 8)}...
                </p>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <span>Status:</span>
                  <span
                    className={`text-[11px] font-semibold ${
                      stock.isActive ? 'text-emerald-400' : 'text-slate-500'
                    }`}
                  >
                    {stock.isActive ? 'Siap Dipilih' : 'Non-aktif'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-800 pt-6">
              <p className="text-xs text-slate-400">
                Menampilkan{' '}
                <span className="font-semibold text-slate-200">
                  {(currentPage - 1) * pageSize + 1}
                </span>{' '}
                –{' '}
                <span className="font-semibold text-slate-200">
                  {Math.min(currentPage * pageSize, stocks.length)}
                </span>{' '}
                dari{' '}
                <span className="font-semibold text-slate-200">{stocks.length}</span> emiten
              </p>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Sebelumnya</span>
                </button>

                <span className="text-xs text-slate-400 px-2 font-mono">
                  {currentPage} / {totalPages}
                </span>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <span>Berikutnya</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal Tambah Saham */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
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
                <p className="text-xs text-slate-400">Tambahkan ticker saham baru ke katalog master</p>
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
                  Ticker Saham *
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

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Bursa Efek
                </label>
                <input
                  type="text"
                  value={exchange}
                  onChange={(e) => setExchange(e.target.value.toUpperCase())}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                />
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
