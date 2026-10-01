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
  Target,
  Clock,
  Layers,
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

  // Completion Criteria (Poin 4 & 5)
  const [completionType, setCompletionType] = useState<'DATE_PERIOD' | 'TARGET_POINTS'>('TARGET_POINTS');
  const [targetPoints, setTargetPoints] = useState<number>(300);

  // Daily Multi-Pick Settings (Poin 6, 7 & 10)
  const [minPicksPerDay, setMinPicksPerDay] = useState<number>(2);
  const [maxPicksPerDay, setMaxPicksPerDay] = useState<number>(3);
  const [pickWindowStart, setPickWindowStart] = useState<string>('17:00');
  const [pickWindowEnd, setPickWindowEnd] = useState<string>('21:00');

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

    if (completionType === 'TARGET_POINTS' && (!targetPoints || targetPoints <= 0)) {
      setErrorMsg('Target poin harus diisi dengan angka positif (misal: 300).');
      return;
    }

    if (minPicksPerDay > maxPicksPerDay) {
      setErrorMsg('Jumlah minimum pick per hari tidak boleh lebih besar dari maksimum.');
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
          completionType,
          targetPoints: completionType === 'TARGET_POINTS' ? Number(targetPoints) : null,
          minPicksPerDay: Number(minPicksPerDay),
          maxPicksPerDay: Number(maxPicksPerDay),
          pickWindowStart,
          pickWindowEnd,
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

          {/* Section 2: Kriteria Penyelesaian Turnamen (Poin 4 & 5) */}
          <div className="pt-6 border-t border-slate-800">
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Target className="w-4 h-4 text-purple-400" />
              <span>2. Kriteria Penyelesaian Turnamen</span>
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Tentukan bagaimana turnamen dinyatakan selesai: berdasarkan tanggal berakhir atau saat ada peserta yang mencapai akumulasi target poin tertentu (misal: 300 poin).
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                onClick={() => setCompletionType('TARGET_POINTS')}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  completionType === 'TARGET_POINTS'
                    ? 'bg-purple-950/20 border-purple-500/50 shadow-md shadow-purple-500/10'
                    : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="completionType"
                      checked={completionType === 'TARGET_POINTS'}
                      onChange={() => setCompletionType('TARGET_POINTS')}
                      className="text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm font-bold text-white">Berdasarkan Target Poin / Persentase</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">
                    Rekomendasi
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-3">
                  Turnamen otomatis selesai begitu ada peserta yang mencapai akumulasi target poin (misal: 300 Pts), dan juara langsung ditetapkan secara otomatis.
                </p>

                {completionType === 'TARGET_POINTS' && (
                  <div className="mt-3 pt-3 border-t border-purple-500/20">
                    <label className="block text-xs font-semibold text-purple-200 mb-1.5">
                      Target Poin Juara (Pts) *
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="10"
                        step="10"
                        required
                        value={targetPoints}
                        onChange={(e) => setTargetPoints(Number(e.target.value))}
                        className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-purple-500/40 text-purple-200 text-sm font-bold font-mono focus:outline-none focus:border-purple-400 transition-all"
                        placeholder="300"
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-purple-400 font-bold">
                        POIN
                      </span>
                    </div>
                    <span className="text-[10px] text-purple-300/70 block mt-1">
                      Contoh: 300 berarti peserta yang mencapai total return akumulasi +300% (300 poin) langsung dinobatkan sebagai Juara.
                    </span>
                  </div>
                )}
              </div>

              <div
                onClick={() => setCompletionType('DATE_PERIOD')}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  completionType === 'DATE_PERIOD'
                    ? 'bg-blue-950/20 border-blue-500/50 shadow-md shadow-blue-500/10'
                    : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="completionType"
                      checked={completionType === 'DATE_PERIOD'}
                      onChange={() => setCompletionType('DATE_PERIOD')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-bold text-white">Berdasarkan Periode Waktu</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">
                    Standar
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Turnamen berjalan sesuai rentang Tanggal Mulai s/d Tanggal Selesai. Juara ditentukan dari peserta dengan total poin tertinggi pada akhir periode.
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Ketentuan Pick Harian & Waktu Window (Poin 6, 7 & 10) */}
          <div className="pt-6 border-t border-slate-800">
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>3. Ketentuan Pick Saham Harian & Jam Window</span>
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Konfigurasi jumlah slot pick harian peserta (default 2-3 emiten) dan jam buka/tutup pick sore hari WIB.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-cyan-400" />
                    <span>Slot Minimum Pick Per Hari</span>
                  </label>
                  <span className="text-xs font-bold text-cyan-400 font-mono">
                    {minPicksPerDay} Emiten
                  </span>
                </div>
                <input
                  type="number"
                  min="1"
                  max="5"
                  required
                  value={minPicksPerDay}
                  onChange={(e) => setMinPicksPerDay(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-cyan-500"
                />
                <span className="text-[10px] text-slate-500 block mt-1.5">
                  Jumlah minimal emiten yang wajib dipilih peserta per sesi perdagangan (default: 2 emiten).
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-cyan-400" />
                    <span>Slot Maksimum Pick Per Hari</span>
                  </label>
                  <span className="text-xs font-bold text-cyan-400 font-mono">
                    {maxPicksPerDay} Emiten
                  </span>
                </div>
                <input
                  type="number"
                  min="1"
                  max="10"
                  required
                  value={maxPicksPerDay}
                  onChange={(e) => setMaxPicksPerDay(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-cyan-500"
                />
                <span className="text-[10px] text-slate-500 block mt-1.5">
                  Batas atas kuota emiten yang boleh dipilih peserta per hari (default: 3 emiten).
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span>Jam Buka Pick (WIB)</span>
                  </label>
                  <span className="text-xs font-bold text-amber-400 font-mono">
                    {pickWindowStart} WIB
                  </span>
                </div>
                <input
                  type="text"
                  required
                  placeholder="17:00"
                  value={pickWindowStart}
                  onChange={(e) => setPickWindowStart(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 text-sm font-mono focus:outline-none focus:border-amber-500"
                />
                <span className="text-[10px] text-slate-500 block mt-1.5">
                  Waktu pembukaan window pick sore hari (default: 17:00 WIB setelah market close IDX).
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-rose-400" />
                    <span>Jam Batas Akhir / Cut-off Pick (WIB)</span>
                  </label>
                  <span className="text-xs font-bold text-rose-400 font-mono">
                    {pickWindowEnd} WIB
                  </span>
                </div>
                <input
                  type="text"
                  required
                  placeholder="21:00"
                  value={pickWindowEnd}
                  onChange={(e) => setPickWindowEnd(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 text-sm font-mono focus:outline-none focus:border-rose-500"
                />
                <span className="text-[10px] text-slate-500 block mt-1.5">
                  Batas akhir submit & perubahan picklist peserta untuk sesi besok (default: 21:00 WIB).
                </span>
              </div>
            </div>

            <div className="mt-3 p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs flex items-start gap-2.5">
              <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <span>
                <strong>Sistem Otomatisasi Harga Closing:</strong> Saat peserta submit di rentang {pickWindowStart} – {pickWindowEnd} WIB, sistem secara otomatis mengunci harga Penutupan Hari Ini (Closing Price) sebagai harga Entry resmi untuk sesi perdagangan hari bursa berikutnya (D+1). Peserta bebas mengganti picklist sebelum jam cut-off.
              </span>
            </div>
          </div>

          {/* Section 4: Core Trading Rules (BSJP Defaults) */}
          <div className="pt-6 border-t border-slate-800">
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-400" />
              <span>4. Aturan Evaluasi Trading (Tournament Rules)</span>
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
