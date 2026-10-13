'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  AlertTriangle,
  FileSpreadsheet,
  Download,
  Upload,
  Plus,
  Trash2,
  Clipboard,
  HelpCircle,
  FileText,
  UserCheck,
} from 'lucide-react';

interface StandingRow {
  id: string;
  name: string;
  email: string;
  totalPoints: number;
  winCount: number;
  lossCount: number;
  breakevenCount: number;
  picksCount: number;
  penaltiesCount: number;
  penaltyPoints: number;
  error?: string;
}

export default function ImportTournamentPage() {
  const router = useRouter();
  const { user, token } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State - Tournament Settings
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [timezone, setTimezone] = useState('Asia/Jakarta');
  const [status, setStatus] = useState<string>('ACTIVE'); // Default ACTIVE for ongoing tournaments

  // Completion Criteria
  const [completionType, setCompletionType] = useState<'DATE_PERIOD' | 'TARGET_POINTS'>('DATE_PERIOD');
  const [targetPoints, setTargetPoints] = useState<number>(300);

  // Daily Multi-Pick Settings
  const [minPicksPerDay, setMinPicksPerDay] = useState<number>(2);
  const [maxPicksPerDay, setMaxPicksPerDay] = useState<number>(3);
  const [pickWindowStart, setPickWindowStart] = useState<string>('17:00');
  const [pickWindowEnd, setPickWindowEnd] = useState<string>('21:00');

  // Rules State
  const [initialStopPct, setInitialStopPct] = useState(3);
  const [trailingStopPct, setTrailingStopPct] = useState(3);
  const [noPickPenalty, setNoPickPenalty] = useState(10);
  const [candleAmbiguityPolicy, setCandleAmbiguityPolicy] = useState(
    'CONSERVATIVE_LOSS_FIRST',
  );
  const [gapPolicy, setGapPolicy] = useState('ACTUAL_FIRST_VALID_LEVEL');
  const [priceFractionPolicy, setPriceFractionPolicy] =
    useState('IDX_STANDARD_V1');

  // Import State
  const [inputMethod, setInputMethod] = useState<'UPLOAD' | 'PASTE'>('UPLOAD');
  const [pasteText, setPasteText] = useState('');
  const [standings, setStandings] = useState<StandingRow[]>([]);
  const [parseError, setParseError] = useState('');

  // Status & Notifications
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Protect route: Admin only
  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      router.push('/tournaments');
    }
  }, [user, router]);

  // Set default start & end dates
  useEffect(() => {
    const now = new Date();
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const pad = (n: number) => n.toString().padStart(2, '0');
    const formatDateTime = (d: Date) => {
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T08:00`;
    };

    setStartDate(formatDateTime(now));
    setEndDate(formatDateTime(nextMonth));
  }, []);

  // Download Template Handler
  const handleDownloadTemplate = () => {
    const csvContent = [
      'nama_peserta,email,total_poin,win_count,loss_count,breakeven_count,total_trade,penalti_count,penalti_poin',
      'Budi Santoso,budi@example.com,25.40,8,2,1,11,0,0',
      'Siti Rahma,siti@example.com,18.75,6,3,0,9,1,-10',
      'Agus Trader,agus@example.com,12.20,5,4,2,11,0,0',
      'Dewi Lestari,,8.50,4,3,1,8,0,0',
      'Reza Pratama,reza@example.com,-3.50,2,5,1,8,1,-10',
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'template_import_klasemen_turnamen.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Smart Parser for CSV, TSV or Semicolon Delimited Content
  const parseDelimitedText = (text: string) => {
    setParseError('');
    if (!text || !text.trim()) {
      setStandings([]);
      return;
    }

    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) {
      setStandings([]);
      return;
    }

    // Detect delimiter from first line (, ; or \t)
    const firstLine = lines[0];
    let delimiter = ',';
    if (firstLine.includes('\t')) {
      delimiter = '\t';
    } else if (firstLine.includes(';') && !firstLine.includes(',')) {
      delimiter = ';';
    }

    const parseLine = (line: string): string[] => {
      if (delimiter === '\t') {
        return line.split('\t').map((c) => c.trim().replace(/^["']|["']$/g, ''));
      }
      // Simple regex parser for comma/semicolon respecting quotes
      const regex = new RegExp(
        `(?:^|${delimiter})(?:"([^"]*(?:""[^"]*)*)"|([^"${delimiter}]*))`,
        'g',
      );
      const matches: string[] = [];
      let match;
      while ((match = regex.exec(line)) !== null) {
        let val = match[1] !== undefined ? match[1].replace(/""/g, '"') : match[2];
        matches.push((val || '').trim());
      }
      return matches;
    };

    const headerParts = parseLine(firstLine).map((h) =>
      h.toLowerCase().replace(/[^a-z0-9_]/g, ''),
    );

    // Identify column indices
    let nameIdx = -1;
    let emailIdx = -1;
    let pointsIdx = -1;
    let winIdx = -1;
    let lossIdx = -1;
    let bepIdx = -1;
    let tradesIdx = -1;
    let penCountIdx = -1;
    let penPtsIdx = -1;

    headerParts.forEach((h, idx) => {
      if (['nama_peserta', 'nama', 'name', 'peserta', 'participant'].includes(h)) {
        nameIdx = idx;
      } else if (['email', 'surel'].includes(h)) {
        emailIdx = idx;
      } else if (['total_poin', 'poin', 'points', 'total_points', 'score'].includes(h)) {
        pointsIdx = idx;
      } else if (['win_count', 'win', 'w', 'menang'].includes(h)) {
        winIdx = idx;
      } else if (['loss_count', 'loss', 'l', 'kalah'].includes(h)) {
        lossIdx = idx;
      } else if (['breakeven_count', 'bep', 'b', 'seri', 'breakeven'].includes(h)) {
        bepIdx = idx;
      } else if (['total_trade', 'total_pick', 'picks_count', 'trades', 'transaksi'].includes(h)) {
        tradesIdx = idx;
      } else if (['penalti_count', 'penalties_count', 'penalti', 'pelanggaran'].includes(h)) {
        penCountIdx = idx;
      } else if (['penalti_poin', 'poin_penalti', 'penalty_points'].includes(h)) {
        penPtsIdx = idx;
      }
    });

    let startIndex = 1;
    // If header wasn't recognized, assume positional:
    // 0: Nama, 1: Email, 2: Poin, 3: Win, 4: Loss, 5: BEP, 6: Trade, 7: PenaltiCount, 8: PenaltiPoin
    if (nameIdx === -1 && pointsIdx === -1) {
      // Check if line 0 looks like numbers or text header
      const parts0 = parseLine(firstLine);
      const isHeader = isNaN(Number(parts0[2] || parts0[1]));
      if (isHeader) {
        startIndex = 1;
      } else {
        startIndex = 0;
      }
      nameIdx = 0;
      emailIdx = 1;
      pointsIdx = 2;
      winIdx = 3;
      lossIdx = 4;
      bepIdx = 5;
      tradesIdx = 6;
      penCountIdx = 7;
      penPtsIdx = 8;
    }

    const parsed: StandingRow[] = [];

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      const parts = parseLine(line);
      if (parts.length === 0 || (parts.length === 1 && !parts[0])) continue;

      const rawName = parts[nameIdx] || parts[0] || '';
      const rawEmail = emailIdx !== -1 ? parts[emailIdx] || '' : '';
      const rawPoints = pointsIdx !== -1 ? parts[pointsIdx] : parts[1];
      const numPoints = parseFloat((rawPoints || '0').replace(',', '.'));

      const rawWin = winIdx !== -1 ? parseInt(parts[winIdx] || '0', 10) : 0;
      const rawLoss = lossIdx !== -1 ? parseInt(parts[lossIdx] || '0', 10) : 0;
      const rawBep = bepIdx !== -1 ? parseInt(parts[bepIdx] || '0', 10) : 0;
      const winCount = isNaN(rawWin) ? 0 : rawWin;
      const lossCount = isNaN(rawLoss) ? 0 : rawLoss;
      const breakevenCount = isNaN(rawBep) ? 0 : rawBep;

      let picksCount = tradesIdx !== -1 ? parseInt(parts[tradesIdx] || '0', 10) : 0;
      if (isNaN(picksCount) || picksCount === 0) {
        picksCount = winCount + lossCount + breakevenCount;
      }

      const penCount = penCountIdx !== -1 ? parseInt(parts[penCountIdx] || '0', 10) : 0;
      const penPts = penPtsIdx !== -1 ? parseFloat((parts[penPtsIdx] || '0').replace(',', '.')) : 0;

      let error = '';
      if (!rawName.trim()) {
        error = 'Nama peserta tidak boleh kosong';
      } else if (isNaN(numPoints)) {
        error = 'Total poin tidak valid';
      }

      parsed.push({
        id: `row-${i}-${Date.now()}`,
        name: rawName.trim(),
        email: rawEmail.trim(),
        totalPoints: isNaN(numPoints) ? 0 : numPoints,
        winCount,
        lossCount,
        breakevenCount,
        picksCount,
        penaltiesCount: isNaN(penCount) ? 0 : penCount,
        penaltyPoints: isNaN(penPts) ? 0 : penPts,
        error,
      });
    }

    if (parsed.length === 0) {
      setParseError('Tidak ditemukan baris data peserta yang valid dalam teks/file.');
    }

    setStandings(parsed);
  };

  // Handle File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        parseDelimitedText(content);
      }
    };
    reader.readAsText(file);
  };

  // Handle Paste
  const handleApplyPaste = () => {
    parseDelimitedText(pasteText);
  };

  // Add Empty Row
  const handleAddRow = () => {
    setStandings((prev) => [
      ...prev,
      {
        id: `manual-${Date.now()}`,
        name: '',
        email: '',
        totalPoints: 0,
        winCount: 0,
        lossCount: 0,
        breakevenCount: 0,
        picksCount: 0,
        penaltiesCount: 0,
        penaltyPoints: 0,
        error: 'Nama peserta wajib diisi',
      },
    ]);
  };

  // Update Individual Row
  const handleUpdateRow = (
    id: string,
    field: keyof StandingRow,
    value: string | number,
  ) => {
    setStandings((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const updated = { ...row, [field]: value };
        let err = '';
        if (!updated.name.trim()) {
          err = 'Nama peserta wajib diisi';
        } else if (isNaN(Number(updated.totalPoints))) {
          err = 'Poin tidak valid';
        }
        updated.error = err;
        return updated;
      }),
    );
  };

  // Delete Row
  const handleDeleteRow = (id: string) => {
    setStandings((prev) => prev.filter((r) => r.id !== id));
  };

  // Load Sample Data
  const handleLoadSample = () => {
    const sample: StandingRow[] = [
      {
        id: 's-1',
        name: 'Budi Santoso',
        email: 'budi@example.com',
        totalPoints: 25.4,
        winCount: 8,
        lossCount: 2,
        breakevenCount: 1,
        picksCount: 11,
        penaltiesCount: 0,
        penaltyPoints: 0,
      },
      {
        id: 's-2',
        name: 'Siti Rahma',
        email: 'siti@example.com',
        totalPoints: 18.75,
        winCount: 6,
        lossCount: 3,
        breakevenCount: 0,
        picksCount: 9,
        penaltiesCount: 1,
        penaltyPoints: -10,
      },
      {
        id: 's-3',
        name: 'Agus Trader',
        email: 'agus@example.com',
        totalPoints: 12.2,
        winCount: 5,
        lossCount: 4,
        breakevenCount: 2,
        picksCount: 11,
        penaltiesCount: 0,
        penaltyPoints: 0,
      },
      {
        id: 's-4',
        name: 'Dewi Lestari',
        email: '',
        totalPoints: 8.5,
        winCount: 4,
        lossCount: 3,
        breakevenCount: 1,
        picksCount: 8,
        penaltiesCount: 0,
        penaltyPoints: 0,
      },
      {
        id: 's-5',
        name: 'Reza Pratama',
        email: 'reza@example.com',
        totalPoints: -3.5,
        winCount: 2,
        lossCount: 5,
        breakevenCount: 1,
        picksCount: 8,
        penaltiesCount: 1,
        penaltyPoints: -10,
      },
    ];
    setStandings(sample);
  };

  // Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!token || user?.role !== 'ADMIN') {
      setErrorMsg('Akses ditolak: Hanya Administrator yang berhak membuat turnamen.');
      return;
    }

    if (standings.length === 0) {
      setErrorMsg(
        'Harap masukkan atau import data klasemen peserta terlebih dahulu (minimal 1 peserta).',
      );
      return;
    }

    const invalidRows = standings.filter((r) => !r.name.trim() || isNaN(r.totalPoints));
    if (invalidRows.length > 0) {
      setErrorMsg(
        `Terdapat ${invalidRows.length} baris dengan nama kosong atau format poin tidak valid. Perbaiki sebelum menyimpan.`,
      );
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

      const payload = {
        name,
        description,
        startDate: startISO,
        endDate: endISO,
        timezone,
        status,
        completionType,
        targetPoints: completionType === 'TARGET_POINTS' ? Number(targetPoints) : null,
        minPicksPerDay: Number(minPicksPerDay),
        maxPicksPerDay: Number(maxPicksPerDay),
        pickWindowStart,
        pickWindowEnd,
        rules: {
          initialStopPct: Number(initialStopPct) / 100,
          trailingStopPct: Number(trailingStopPct) / 100,
          noPickPenalty: Number(noPickPenalty),
          candleAmbiguityPolicy,
          gapPolicy,
          priceFractionPolicy,
        },
        standings: standings.map((s) => ({
          name: s.name.trim(),
          email: s.email ? s.email.trim() : undefined,
          totalPoints: Number(s.totalPoints),
          winCount: Number(s.winCount || 0),
          lossCount: Number(s.lossCount || 0),
          breakevenCount: Number(s.breakevenCount || 0),
          picksCount: Number(s.picksCount || 0),
          penaltiesCount: Number(s.penaltiesCount || 0),
          penaltyPoints: Number(s.penaltyPoints || 0),
        })),
      };

      const res = await fetch(`${apiBase}/tournaments/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Gagal membuat turnamen via import.');
      }

      setSuccessMsg(
        `Turnamen "${name}" berhasil dibuat dengan ${standings.length} peserta terimport!`,
      );
      setTimeout(() => {
        router.push(`/tournaments/${data.id}`);
      }, 1200);
    } catch (err: any) {
      setErrorMsg(
        err.message || 'Terjadi kesalahan saat memproses import turnamen.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const totalPointsSum = standings.reduce((sum, r) => sum + (Number(r.totalPoints) || 0), 0);
  const totalPenaltiesSum = standings.reduce((sum, r) => sum + (r.penaltiesCount || 0), 0);

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1">
      {/* Back Button */}
      <div className="mb-6">
        <Link
          href="/tournaments"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Daftar Turnamen</span>
        </Link>
      </div>

      <div className="glass-panel p-8 rounded-2xl border border-slate-800 shadow-xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-800">
          <div className="w-11 h-11 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30 mb-1">
              <span>FITUR IMPORT TURNAMEN</span>
            </div>
            <h1 className="text-xl font-bold text-white">
              Buat Turnamen via Import Klasemen Terakhir
            </h1>
            <p className="text-xs text-slate-400">
              Memfasilitasi migrasi turnamen manual ke TradeArena. Masukkan parameter turnamen dan import data akumulasi klasemen terakhir peserta agar dapat langsung dilanjutkan.
            </p>
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
          {/* SECTION 1: IMPORT DATA KLASEMEN (HIGHLIGHTED AT TOP) */}
          <div className="p-6 rounded-2xl bg-purple-950/20 border border-purple-500/30 relative">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-purple-500/20">
              <div>
                <h2 className="text-sm font-bold text-purple-200 uppercase tracking-wider flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-purple-400" />
                  <span>1. Import Data Klasemen Terakhir Peserta *</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Upload file CSV atau salin-tempel dari Excel/Google Sheets. Data ini akan menjadi saldo awal peserta.
                </p>
              </div>

              {/* Template Download & Sample */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 border border-purple-500/40 text-purple-300 hover:bg-purple-900/40 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                  title="Unduh file format CSV untuk diisi"
                >
                  <Download className="w-3.5 h-3.5 text-purple-400" />
                  <span>Unduh Template CSV</span>
                </button>
                <button
                  type="button"
                  onClick={handleLoadSample}
                  className="px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-medium flex items-center gap-1.5 transition-all"
                  title="Muat 5 data contoh untuk preview"
                >
                  <Clipboard className="w-3.5 h-3.5 text-slate-400" />
                  <span>Contoh Data</span>
                </button>
              </div>
            </div>

            {/* Input Method Toggle */}
            <div className="flex items-center gap-2 mb-4">
              <button
                type="button"
                onClick={() => setInputMethod('UPLOAD')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  inputMethod === 'UPLOAD'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload File CSV</span>
              </button>
              <button
                type="button"
                onClick={() => setInputMethod('PASTE')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  inputMethod === 'PASTE'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Salin & Tempel (Paste) Spreadsheet</span>
              </button>
            </div>

            {/* Upload Area */}
            {inputMethod === 'UPLOAD' && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-6 rounded-xl border-2 border-dashed border-purple-500/30 hover:border-purple-500/60 bg-slate-900/40 text-center cursor-pointer transition-all mb-4 group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Upload className="w-8 h-8 text-purple-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                <p className="text-xs font-semibold text-slate-200">
                  Klik untuk memilih file CSV atau drag and drop ke sini
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Format yang didukung: .csv (koma atau titik koma), .txt (tab delimited)
                </p>
              </div>
            )}

            {/* Paste Area */}
            {inputMethod === 'PASTE' && (
              <div className="mb-4">
                <textarea
                  rows={4}
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder={`Salin (copy) baris tabel dari Excel atau Google Sheets lalu tempel di sini...\nContoh:\nBudi Santoso\tbudi@example.com\t25.4\t8\t2\t1\t11\t0\t0`}
                  className="w-full p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-100 text-xs font-mono focus:outline-none focus:border-purple-500 transition-all resize-y"
                />
                <div className="flex justify-end mt-2">
                  <button
                    type="button"
                    onClick={handleApplyPaste}
                    className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md shadow-purple-600/20 transition-all"
                  >
                    Proses Teks &rarr;
                  </button>
                </div>
              </div>
            )}

            {parseError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium flex items-center gap-2 mb-4">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{parseError}</span>
              </div>
            )}

            {/* Live Statistics & Table Preview */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-300">
                    Preview Data Klasemen ({standings.length} Peserta)
                  </span>
                  {standings.length > 0 && (
                    <span className="text-[11px] px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 font-mono font-bold">
                      Total Poin: {totalPointsSum.toFixed(2)} pts
                    </span>
                  )}
                  {totalPenaltiesSum > 0 && (
                    <span className="text-[11px] px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 font-mono font-bold">
                      {totalPenaltiesSum}x Penalti
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAddRow}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 hover:border-slate-600 text-slate-300 text-xs font-medium flex items-center gap-1 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5 text-blue-400" />
                    <span>Tambah Baris</span>
                  </button>
                  {standings.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setStandings([])}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 border border-rose-900/50 hover:bg-rose-950/30 text-rose-400 text-xs font-medium flex items-center gap-1 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus Semua</span>
                    </button>
                  )}
                </div>
              </div>

              {standings.length === 0 ? (
                <div className="p-8 rounded-xl bg-slate-900/50 border border-slate-800 text-center text-slate-500 text-xs">
                  Belum ada data peserta yang dimuat. Silakan unduh template, upload file CSV, atau klik <strong>Contoh Data</strong>.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60 max-h-72 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900/90 text-slate-400 sticky top-0 border-b border-slate-800 z-10">
                      <tr>
                        <th className="py-2.5 px-3 w-10 text-center">#</th>
                        <th className="py-2.5 px-3">Nama Peserta *</th>
                        <th className="py-2.5 px-3">Email (Opsional)</th>
                        <th className="py-2.5 px-3 text-right">Total Poin *</th>
                        <th className="py-2.5 px-3 text-center">Win / Loss / BEP</th>
                        <th className="py-2.5 px-3 text-center">Total Trade</th>
                        <th className="py-2.5 px-3 text-center">Penalti (Count / Poin)</th>
                        <th className="py-2.5 px-3 w-10 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {standings.map((row, idx) => (
                        <tr
                          key={row.id}
                          className={
                            row.error
                              ? 'bg-rose-950/20'
                              : 'hover:bg-slate-900/40 transition-colors'
                          }
                        >
                          <td className="py-2 px-3 text-center text-slate-500">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-3 font-sans">
                            <input
                              type="text"
                              value={row.name}
                              onChange={(e) =>
                                handleUpdateRow(row.id, 'name', e.target.value)
                              }
                              placeholder="Nama peserta"
                              className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-purple-500"
                            />
                            {row.error && (
                              <span className="text-[10px] text-rose-400 font-sans block mt-0.5">
                                {row.error}
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 font-sans">
                            <input
                              type="email"
                              value={row.email}
                              onChange={(e) =>
                                handleUpdateRow(row.id, 'email', e.target.value)
                              }
                              placeholder="user@example.com"
                              className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-purple-500 font-mono"
                            />
                          </td>
                          <td className="py-2 px-3 text-right">
                            <input
                              type="number"
                              step="0.01"
                              value={row.totalPoints}
                              onChange={(e) =>
                                handleUpdateRow(
                                  row.id,
                                  'totalPoints',
                                  parseFloat(e.target.value) || 0,
                                )
                              }
                              className={`w-24 px-2 py-1 rounded bg-slate-900 border border-slate-800 text-right text-xs font-bold focus:outline-none focus:border-purple-500 ${
                                row.totalPoints >= 0
                                  ? 'text-emerald-400'
                                  : 'text-rose-400'
                              }`}
                            />
                          </td>
                          <td className="py-2 px-3 text-center">
                            <div className="flex items-center justify-center gap-1 text-[11px]">
                              <input
                                type="number"
                                min="0"
                                value={row.winCount}
                                onChange={(e) =>
                                  handleUpdateRow(
                                    row.id,
                                    'winCount',
                                    parseInt(e.target.value, 10) || 0,
                                  )
                                }
                                className="w-12 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-center text-emerald-400 font-semibold focus:outline-none"
                                title="Win count"
                              />
                              <span className="text-slate-600">/</span>
                              <input
                                type="number"
                                min="0"
                                value={row.lossCount}
                                onChange={(e) =>
                                  handleUpdateRow(
                                    row.id,
                                    'lossCount',
                                    parseInt(e.target.value, 10) || 0,
                                  )
                                }
                                className="w-12 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-center text-rose-400 font-semibold focus:outline-none"
                                title="Loss count"
                              />
                              <span className="text-slate-600">/</span>
                              <input
                                type="number"
                                min="0"
                                value={row.breakevenCount}
                                onChange={(e) =>
                                  handleUpdateRow(
                                    row.id,
                                    'breakevenCount',
                                    parseInt(e.target.value, 10) || 0,
                                  )
                                }
                                className="w-12 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-center text-slate-400 font-semibold focus:outline-none"
                                title="Breakeven count"
                              />
                            </div>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <input
                              type="number"
                              min="0"
                              value={row.picksCount}
                              onChange={(e) =>
                                handleUpdateRow(
                                  row.id,
                                  'picksCount',
                                  parseInt(e.target.value, 10) || 0,
                                )
                              }
                              className="w-16 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-center text-slate-300 font-semibold focus:outline-none"
                            />
                          </td>
                          <td className="py-2 px-3 text-center">
                            <div className="flex items-center justify-center gap-1 text-[11px]">
                              <input
                                type="number"
                                min="0"
                                value={row.penaltiesCount}
                                onChange={(e) =>
                                  handleUpdateRow(
                                    row.id,
                                    'penaltiesCount',
                                    parseInt(e.target.value, 10) || 0,
                                  )
                                }
                                className="w-12 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-center text-amber-400 font-semibold focus:outline-none"
                                title="Jumlah penalti"
                              />
                              <span className="text-slate-600">x</span>
                              <input
                                type="number"
                                step="0.5"
                                value={row.penaltyPoints}
                                onChange={(e) =>
                                  handleUpdateRow(
                                    row.id,
                                    'penaltyPoints',
                                    parseFloat(e.target.value) || 0,
                                  )
                                }
                                className="w-16 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-center text-rose-400 font-semibold focus:outline-none"
                                title="Poin penalti"
                              />
                            </div>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteRow(row.id)}
                              className="p-1 rounded text-slate-500 hover:text-rose-400 transition-colors"
                              title="Hapus baris ini"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="mt-4 p-3 rounded-xl bg-purple-950/40 border border-purple-500/20 text-purple-300 text-xs flex items-start gap-2.5">
              <Info className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
              <span>
                <strong>Mekanisme Kelanjutan Turnamen:</strong> Saldo poin yang diimport akan dicatat sebagai <em>Saldo Awal</em>. Begitu turnamen aktif di TradeArena, setiap hari perdagangan peserta tetap memilih emiten seperti biasa, dan poin trading harian maupun penalti baru akan secara otomatis diakumulasikan ke klasemen ini.
              </span>
            </div>
          </div>

          {/* SECTION 2: INFORMASI UMUM TURNAMEN */}
          <div className="pt-6 border-t border-slate-800">
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-400" />
              <span>2. Informasi Umum Turnamen</span>
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
                  placeholder="Contoh: Turnamen Saham Komunitas Musim Lanjutan"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-blue-500 transition-all"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Deskripsi Turnamen (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Deskripsi atau catatan khusus mengenai turnamen lanjutan ini..."
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

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Zona Waktu
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-blue-500 transition-all"
                >
                  <option value="Asia/Jakarta">Asia/Jakarta (WIB)</option>
                  <option value="Asia/Makassar">Asia/Makassar (WITA)</option>
                  <option value="Asia/Jayapura">Asia/Jayapura (WIT)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Status Turnamen
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-blue-500 transition-all"
                >
                  <option value="ACTIVE">ACTIVE (Langsung Berjalan / Sedang Aktif)</option>
                  <option value="UPCOMING">UPCOMING (Mendatang / Belum Dimulai)</option>
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 3: KRITERIA PENYELESAIAN */}
          <div className="pt-6 border-t border-slate-800">
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Target className="w-4 h-4 text-purple-400" />
              <span>3. Kriteria Penyelesaian Turnamen</span>
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Pilih apakah turnamen selesai berdasarkan rentang waktu atau peserta pertama yang mencapai target poin tertentu.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                onClick={() => setCompletionType('DATE_PERIOD')}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  completionType === 'DATE_PERIOD'
                    ? 'bg-blue-600/10 border-blue-500 shadow-md shadow-blue-500/10'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-200">
                    Berdasarkan Periode Tanggal
                  </span>
                  <input
                    type="radio"
                    name="completionType"
                    checked={completionType === 'DATE_PERIOD'}
                    onChange={() => setCompletionType('DATE_PERIOD')}
                    className="text-blue-500 focus:ring-0"
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Turnamen berlangsung penuh hingga batas Tanggal & Waktu Selesai. Peringkat 1 di akhir periode menjadi pemenang.
                </p>
              </div>

              <div
                onClick={() => setCompletionType('TARGET_POINTS')}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  completionType === 'TARGET_POINTS'
                    ? 'bg-purple-600/10 border-purple-500 shadow-md shadow-purple-500/10'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-200">
                    Berdasarkan Target Poin
                  </span>
                  <input
                    type="radio"
                    name="completionType"
                    checked={completionType === 'TARGET_POINTS'}
                    onChange={() => setCompletionType('TARGET_POINTS')}
                    className="text-purple-500 focus:ring-0"
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Turnamen otomatis selesai begitu ada peserta yang akumulasi poinnya mencapai target (misal: 300 poin).
                </p>
              </div>
            </div>

            {completionType === 'TARGET_POINTS' && (
              <div className="mt-4 p-4 rounded-xl bg-purple-950/30 border border-purple-500/30">
                <label className="block text-xs font-semibold text-purple-200 mb-1.5">
                  Target Poin Penyelesaian Turnamen *
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={targetPoints}
                    onChange={(e) => setTargetPoints(Number(e.target.value))}
                    placeholder="300"
                    className="w-48 px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 text-sm font-mono font-bold focus:outline-none focus:border-purple-500"
                  />
                  <span className="text-xs text-purple-300">
                    Peserta pertama yang mencapai {targetPoints || 0} poin akan dinyatakan sebagai pemenang mutlak.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 4: PICK HARIAN & JAM PICK */}
          <div className="pt-6 border-t border-slate-800">
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span>4. Batas Pick Harian & Jam Pemilihan Emiten</span>
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Aturan jumlah emiten yang wajib dipilih per hari serta rentang waktu input pick harian peserta (WIB).
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Jumlah Pick Emiten per Hari (Batas Min & Max) *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] text-slate-500 block mb-1">
                      Minimum Pick / Hari
                    </span>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      required
                      value={minPicksPerDay}
                      onChange={(e) => setMinPicksPerDay(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 text-sm font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block mb-1">
                      Maksimum Pick / Hari
                    </span>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      required
                      value={maxPicksPerDay}
                      onChange={(e) => setMaxPicksPerDay(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 text-sm font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 mt-2">
                  Peserta wajib memilih antara {minPicksPerDay} hingga {maxPicksPerDay} emiten per hari.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Jam Buka & Tutup Pick Saham Harian (WIB) *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] text-slate-500 block mb-1">
                      Jam Buka Input (Start)
                    </span>
                    <input
                      type="time"
                      required
                      value={pickWindowStart}
                      onChange={(e) => setPickWindowStart(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 text-sm font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block mb-1">
                      Jam Kunci Input (Lock)
                    </span>
                    <input
                      type="time"
                      required
                      value={pickWindowEnd}
                      onChange={(e) => setPickWindowEnd(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 text-sm font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 mt-2">
                  Pemilihan emiten hanya dapat dilakukan antara pukul {pickWindowStart} s/d {pickWindowEnd} WIB.
                </p>
              </div>
            </div>
          </div>

          {/* SECTION 5: ATURAN EVALUASI & RISIKO */}
          <div className="pt-6 border-t border-slate-800">
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span>5. Parameter Evaluasi & Manajemen Risiko</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    <span>Cut Loss Threshold (%) *</span>
                  </label>
                  <span className="text-xs font-bold text-rose-400 font-mono">
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
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-blue-500 font-mono"
                />
                <span className="text-[10px] text-slate-500 block mt-1">
                  Batas toleransi penurunan harga dari entry sebelum cut loss terpicu.
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <TrendingDown className="w-4 h-4 text-amber-400" />
                    <span>Trailing Stop Threshold (%) *</span>
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
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-blue-500 font-mono"
                />
                <span className="text-[10px] text-slate-500 block mt-1">
                  Batas penurunan persentase dari harga tertinggi (Peak) selama sesi.
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    <span>Penalti Tidak Pick Emiten (Poin) *</span>
                  </label>
                  <span className="text-xs font-bold text-rose-400 font-mono">
                    -{noPickPenalty} pts
                  </span>
                </div>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  required
                  value={noPickPenalty}
                  onChange={(e) => setNoPickPenalty(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-blue-500 font-mono"
                />
                <span className="text-[10px] text-slate-500 block mt-1">
                  Pengurangan poin per hari bagi peserta yang tidak memilih emiten.
                </span>
              </div>
            </div>
          </div>

          {/* SUBMIT ACTION BUTTON */}
          <div className="pt-6 border-t border-slate-800 flex items-center justify-between gap-4">
            <div className="text-xs text-slate-400">
              Total peserta yang akan diimport:{' '}
              <strong className="text-purple-300 font-bold">
                {standings.length} Peserta
              </strong>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/tournaments"
                className="px-4 py-2.5 rounded-xl border border-slate-800 text-slate-300 hover:bg-slate-900 text-sm font-semibold transition-all"
              >
                Batal
              </Link>
              <button
                type="submit"
                disabled={isLoading || standings.length === 0}
                className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold shadow-lg shadow-purple-600/25 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menyimpan & Mengimport Data...</span>
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Buat & Import Turnamen ({standings.length} Peserta)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
