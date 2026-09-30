'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../../context/AuthContext';
import {
  Trophy,
  ArrowLeft,
  Calendar,
  Sliders,
  ShieldAlert,
  TrendingDown,
  Info,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Save,
  Trash2,
  Clock,
  Activity,
} from 'lucide-react';

export default function EditTournamentPage() {
  const params = useParams();
  const router = useRouter();
  const { user, token } = useAuth();
  const tournamentId = params?.id as string;

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [timezone, setTimezone] = useState('Asia/Jakarta');
  const [status, setStatus] = useState<string>('UPCOMING');

  // Rules State
  const [initialStopPct, setInitialStopPct] = useState(3);
  const [trailingStopPct, setTrailingStopPct] = useState(3);
  const [candleAmbiguityPolicy, setCandleAmbiguityPolicy] = useState(
    'CONSERVATIVE_LOSS_FIRST',
  );
  const [gapPolicy, setGapPolicy] = useState('ACTUAL_FIRST_VALID_LEVEL');
  const [priceFractionPolicy, setPriceFractionPolicy] =
    useState('IDX_STANDARD_V1');

  const [isFetching, setIsFetching] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Protect route: Admin only
  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      router.push('/tournaments');
    }
  }, [user, router]);

  // Format ISO Date to "YYYY-MM-DDTHH:mm" for <input type="datetime-local" />
  const formatForDateTimeInput = (isoDateStr: string) => {
    try {
      const d = new Date(isoDateStr);
      if (isNaN(d.getTime())) return '';
      const pad = (n: number) => n.toString().padStart(2, '0');
      const year = d.getFullYear();
      const month = pad(d.getMonth() + 1);
      const day = pad(d.getDate());
      const hours = pad(d.getHours());
      const minutes = pad(d.getMinutes());
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch {
      return '';
    }
  };

  const fetchTournament = useCallback(async () => {
    if (!tournamentId) return;
    setIsFetching(true);
    setErrorMsg('');
    try {
      const apiBase =
        process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333/api/v1';
      const res = await fetch(`${apiBase}/tournaments/${tournamentId}`);
      if (!res.ok) {
        throw new Error('Gagal mengambil detail data turnamen');
      }
      const data = await res.json();

      setName(data.name || '');
      setDescription(data.description || '');
      setStartDate(formatForDateTimeInput(data.startDate));
      setEndDate(formatForDateTimeInput(data.endDate));
      setTimezone(data.timezone || 'Asia/Jakarta');
      setStatus(data.status || 'UPCOMING');

      if (data.rules) {
        setInitialStopPct(
          data.rules.initialStopPct
            ? Number(data.rules.initialStopPct) * 100
            : 3,
        );
        setTrailingStopPct(
          data.rules.trailingStopPct
            ? Number(data.rules.trailingStopPct) * 100
            : 3,
        );
        setCandleAmbiguityPolicy(
          data.rules.candleAmbiguityPolicy || 'CONSERVATIVE_LOSS_FIRST',
        );
        setGapPolicy(
          data.rules.gapPolicy || 'ACTUAL_FIRST_VALID_LEVEL',
        );
        setPriceFractionPolicy(
          data.rules.priceFractionPolicy || 'IDX_STANDARD_V1',
        );
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal memuat data turnamen');
    } finally {
      setIsFetching(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    fetchTournament();
  }, [fetchTournament]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!token || user?.role !== 'ADMIN') {
      setErrorMsg('Akses ditolak: Hanya Administrator yang berhak mengedit turnamen.');
      return;
    }

    const startISO = new Date(startDate).toISOString();
    const endISO = new Date(endDate).toISOString();

    if (new Date(endISO) <= new Date(startISO)) {
      setErrorMsg('Tanggal selesai harus setelah tanggal mulai.');
      return;
    }

    setIsLoading(true);

    try {
      const apiBase =
        process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333/api/v1';
      const res = await fetch(`${apiBase}/tournaments/${tournamentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          description,
          startDate: startISO,
          endDate: endISO,
          timezone,
          status,
          rules: {
            initialStopPct: Number(initialStopPct) / 100,
            trailingStopPct: Number(trailingStopPct) / 100,
            candleAmbiguityPolicy,
            gapPolicy,
            priceFractionPolicy,
          },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Gagal memperbarui turnamen.');
      }

      setSuccessMsg('Turnamen berhasil diperbarui!');
      setTimeout(() => {
        router.push(`/tournaments/${tournamentId}`);
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan saat menyimpan perubahan turnamen.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!token || user?.role !== 'ADMIN') return;
    if (status === 'ACTIVE') {
      setErrorMsg('Turnamen yang sedang aktif tidak dapat dihapus. Ubah statusnya terlebih dahulu.');
      setShowDeleteModal(false);
      return;
    }

    setIsDeleting(true);
    try {
      const apiBase =
        process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333/api/v1';
      const res = await fetch(`${apiBase}/tournaments/${tournamentId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Gagal menghapus turnamen.');
      }

      router.push('/tournaments');
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menghapus turnamen.');
      setShowDeleteModal(false);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isFetching) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="text-sm font-medium">Memuat data turnamen...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1">
      <Link
        href={`/tournaments/${tournamentId}`}
        className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Kembali ke Detail Turnamen</span>
      </Link>

      <div className="glass-panel p-8 rounded-2xl border border-slate-800 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Edit Turnamen</h1>
              <p className="text-xs text-slate-400">
                Ubah informasi umum, status siklus, dan parameter evaluasi aturan turnamen
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider border ${
                status === 'ACTIVE'
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : status === 'UPCOMING'
                  ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                  : status === 'COMPLETED'
                  ? 'bg-slate-500/15 text-slate-400 border-slate-700'
                  : status === 'CANCELLED'
                  ? 'bg-red-500/15 text-red-400 border-red-500/30'
                  : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
              }`}
            >
              Status: {status}
            </span>
          </div>
        </div>

        {errorMsg && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium flex items-center gap-2.5 mb-6">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium flex items-center gap-2.5 mb-6">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Section 1: Informasi Umum */}
          <div>
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-400" />
              <span>1. Informasi Umum & Status</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Nama Turnamen *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: BSJP IDX Community Tournament Season 1"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-blue-500 transition-all"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Deskripsi (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Deskripsi singkat mengenai aturan komunitas atau ketentuan khusus turnamen..."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Status Turnamen *
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-blue-500 transition-all"
                >
                  <option value="DRAFT">DRAFT (Persiapan / Belum Dibuka)</option>
                  <option value="UPCOMING">UPCOMING (Pendaftaran Dibuka / Belum Mulai)</option>
                  <option value="ACTIVE">ACTIVE (Turnamen Sedang Berlangsung)</option>
                  <option value="COMPLETED">COMPLETED (Turnamen Selesai)</option>
                  <option value="CANCELLED">CANCELLED (Turnamen Dibatalkan)</option>
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Ubah status turnamen sesuai siklus periode kompetisi.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Timezone *
                </label>
                <input
                  type="text"
                  required
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-blue-500 transition-all font-mono"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Wajib Asia/Jakarta untuk pasar saham Indonesia (IDX).
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Tanggal & Waktu Mulai *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Tanggal & Waktu Selesai *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-blue-500 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Aturan Evaluasi Trading */}
          <div>
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-400" />
              <span>2. Parameter Evaluasi Trading</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <TrendingDown className="w-4 h-4 text-red-400" />
                    <span>Initial Cut Loss (%) *</span>
                  </label>
                  <span className="text-xs font-bold text-red-400 font-mono">
                    -{initialStopPct}%
                  </span>
                </div>
                <input
                  type="number"
                  step="0.1"
                  min="0.5"
                  max="35"
                  required
                  value={initialStopPct}
                  onChange={(e) => setInitialStopPct(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                />
                <p className="text-[11px] text-slate-500 mt-2">
                  Batas toleransi penurunan harga dari harga entry sebelum stop loss terpicu.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-amber-400" />
                    <span>Dynamic Trailing Stop (%) *</span>
                  </label>
                  <span className="text-xs font-bold text-amber-400 font-mono">
                    -{trailingStopPct}%
                  </span>
                </div>
                <input
                  type="number"
                  step="0.1"
                  min="0.5"
                  max="35"
                  required
                  value={trailingStopPct}
                  onChange={(e) => setTrailingStopPct(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                />
                <p className="text-[11px] text-slate-500 mt-2">
                  Batas penurunan persentase dari harga tertinggi (Peak) selama sesi perdagangan.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Kebijakan Ambiguitas Candle *
                </label>
                <select
                  value={candleAmbiguityPolicy}
                  onChange={(e) => setCandleAmbiguityPolicy(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-blue-500 transition-all"
                >
                  <option value="CONSERVATIVE_LOSS_FIRST">
                    CONSERVATIVE_LOSS_FIRST (Konservatif: Utamakan Stop)
                  </option>
                  <option value="HIGH_FIRST">
                    HIGH_FIRST (Optimis: Peak Terjadi Dahulu)
                  </option>
                  <option value="LOW_FIRST">
                    LOW_FIRST (Pesimis: Low Terjadi Dahulu)
                  </option>
                  <option value="REVIEW_REQUIRED">
                    REVIEW_REQUIRED (Tandai Perlu Review Admin)
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Kebijakan Gap Pembukaan *
                </label>
                <select
                  value={gapPolicy}
                  onChange={(e) => setGapPolicy(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-blue-500 transition-all"
                >
                  <option value="ACTUAL_FIRST_VALID_LEVEL">
                    ACTUAL_FIRST_VALID_LEVEL (Harga Valid Pertama di Market)
                  </option>
                  <option value="THEORETICAL_THRESHOLD">
                    THEORETICAL_THRESHOLD (Batas Threshold Teoretis)
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Fraksi Harga IDX *
                </label>
                <input
                  type="text"
                  disabled
                  value={priceFractionPolicy}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-500 text-sm font-mono cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Formula Perhitungan Poin *
                </label>
                <input
                  type="text"
                  disabled
                  value="PERCENTAGE_RETURN_V1"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-500 text-sm font-mono cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              {status !== 'ACTIVE' ? (
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Hapus Turnamen</span>
                </button>
              ) : (
                <span className="text-[11px] text-slate-500 italic">
                  Turnamen berstatus ACTIVE tidak dapat dihapus demi integritas data peserta.
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Link
                href={`/tournaments/${tournamentId}`}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-all border border-slate-800"
              >
                Batal
              </Link>

              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-blue-600/25 transition-all"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Simpan Perubahan</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="glass-panel p-6 rounded-2xl border border-rose-500/30 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4 text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Konfirmasi Hapus Turnamen</h3>
                <p className="text-xs text-slate-400">Tindakan ini permanen dan tidak dapat dibatalkan</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-6">
              Apakah Anda yakin ingin menghapus turnamen <strong className="text-white font-semibold">&quot;{name}&quot;</strong>? Seluruh aturan evaluasi dan relasi data turnamen ini akan dihapus dari sistem.
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition-all"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-rose-600/25 transition-all disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Ya, Hapus Turnamen</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
