'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
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
} from 'lucide-react';

export default function NewTournamentPage() {
  const router = useRouter();
  const { user, token } = useAuth();

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('2026-10-01T08:00');
  const [endDate, setEndDate] = useState('2026-10-31T17:00');
  const [timezone, setTimezone] = useState('Asia/Jakarta');

  // Rules State (Defaults BSJP -3% CL & -3% TS)
  const [initialStopPct, setInitialStopPct] = useState(3);
  const [trailingStopPct, setTrailingStopPct] = useState(3);
  const [candleAmbiguityPolicy, setCandleAmbiguityPolicy] = useState(
    'CONSERVATIVE_LOSS_FIRST',
  );
  const [gapPolicy, setGapPolicy] = useState('ACTUAL_FIRST_VALID_LEVEL');
  const [priceFractionPolicy, setPriceFractionPolicy] =
    useState('IDX_STANDARD_V1');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Protect route: Admin only
  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      router.push('/tournaments');
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!token || user?.role !== 'ADMIN') {
      setErrorMsg('Akses ditolak: Hanya Administrator yang berhak membuat turnamen.');
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
      const res = await fetch(`${apiBase}/tournaments`, {
        method: 'POST',
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
        throw new Error(data.message || 'Gagal membuat turnamen.');
      }

      router.push('/tournaments');
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan saat menyimpan turnamen.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1">
      <Link
        href="/tournaments"
        className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Kembali ke Daftar Turnamen</span>
      </Link>

      <div className="glass-panel p-8 rounded-2xl border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Buat Turnamen Baru</h1>
            <p className="text-xs text-slate-400">
              Konfigurasi detail periode dan aturan evaluasi trading turnamen
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium flex items-center gap-2.5 mb-6">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Section 1: Informasi Umum */}
          <div>
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-400" />
              <span>1. Informasi Umum</span>
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

          {/* Section 2: Core Trading Rules (BSJP Defaults) */}
          <div className="pt-6 border-t border-slate-800">
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-400" />
              <span>2. Aturan Evaluasi Trading (Tournament Rules)</span>
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Konfigurasi persentase Cut Loss dan Trailing Stop dinamis sesuai setup turnamen Anda (nilai default: 3%).
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <TrendingDown className="w-4 h-4 text-red-400" />
                    <span>Initial Cut Loss (%)</span>
                  </label>
                  <span className="text-xs font-bold text-red-400">
                    -{initialStopPct}%
                  </span>
                </div>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="50"
                  required
                  value={initialStopPct}
                  onChange={(e) => setInitialStopPct(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-blue-500 transition-all"
                />
                <span className="text-[10px] text-slate-500 block mt-1">
                  Threshold penurunan minimum dari harga entry sebelum posisi ditutup.
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-amber-400" />
                    <span>Trailing Stop (%)</span>
                  </label>
                  <span className="text-xs font-bold text-amber-400">
                    -{trailingStopPct}%
                  </span>
                </div>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="50"
                  required
                  value={trailingStopPct}
                  onChange={(e) => setTrailingStopPct(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-blue-500 transition-all"
                />
                <span className="text-[10px] text-slate-500 block mt-1">
                  Drawdown minimum dari puncak tertinggi (peak high watermark) yang mengunci profit.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Candle Ambiguity Policy
                </label>
                <select
                  value={candleAmbiguityPolicy}
                  onChange={(e) => setCandleAmbiguityPolicy(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-blue-500 transition-all"
                >
                  <option value="CONSERVATIVE_LOSS_FIRST">
                    CONSERVATIVE_LOSS_FIRST (Konservatif / Loss didahulukan)
                  </option>
                  <option value="HIGH_FIRST">
                    HIGH_FIRST (Asumsikan High terjadi lebih awal)
                  </option>
                  <option value="LOW_FIRST">
                    LOW_FIRST (Asumsikan Low terjadi lebih awal)
                  </option>
                  <option value="REVIEW_REQUIRED">
                    REVIEW_REQUIRED (Tandai untuk manual review jika ambigu)
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Gap Execution Policy
                </label>
                <select
                  value={gapPolicy}
                  onChange={(e) => setGapPolicy(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-blue-500 transition-all"
                >
                  <option value="ACTUAL_FIRST_VALID_LEVEL">
                    ACTUAL_FIRST_VALID_LEVEL (Gunakan fraksi harga aktual pasar)
                  </option>
                  <option value="THEORETICAL_THRESHOLD">
                    THEORETICAL_THRESHOLD (Paksa batas teoritis persis)
                  </option>
                </select>
              </div>
            </div>

            {/* Note alert */}
            <div className="mt-4 p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs flex items-start gap-2.5">
              <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <span>
                <strong>Prinsip Penentuan Exit:</strong> Persentase Cut Loss dan Trailing Stop yang dikonfigurasi adalah batas minimum stop threshold. Exit aktual menggunakan level harga valid (fraksi tick size IDX) pertama yang tercapai secara kronologis.
              </span>
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-6 border-t border-slate-800 flex items-center justify-end gap-3">
            <Link
              href="/tournaments"
              className="px-4 py-2.5 rounded-xl border border-slate-800 text-slate-300 hover:bg-slate-900 text-sm font-semibold transition-all"
            >
              Batal
            </Link>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-lg shadow-blue-600/25 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menyimpan Turnamen...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Buat Turnamen</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
